/**
 * Submit replay tests — these call the real procedure, not a re-implementation
 * of it, because the behaviour under test is precisely what the procedure
 * decides to do before it scores anything.
 *
 * The scenario is the one the production logs showed: a submit reaches the
 * database and is scored, but its response never gets back to the student. The
 * client then retries. Before this was handled, the retry ran into
 * "Hai già completato questa simulazione" — an error shown to a student whose
 * test was in fact safely stored.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@/lib/prisma/client', () => ({ prisma: {}, default: {} }));
vi.mock('@/server/services/notificationService', () => ({
  notifySimulationCompletedByStudent: vi.fn().mockResolvedValue(undefined),
  notifyOpenAnswerCorrectionRequest: vi.fn().mockResolvedValue(undefined),
}));

import { simulationsRouter } from '@/server/trpc/routers/simulations';

const STUDENT_ID = 'student-1';
const SIMULATION_ID = 'sim-1';
const RESULT_ID = 'result-1';

function buildSimulation() {
  return {
    id: SIMULATION_ID,
    totalQuestions: 2,
    isRepeatable: false,
    showResults: true,
    showCorrectAnswers: false,
    maxScore: 3,
    passingScore: null,
    useQuestionPoints: false,
    correctPoints: 1.5,
    wrongPoints: -0.4,
    blankPoints: 0,
    openAnswerReviewerId: null,
    title: 'Prova ufficiale',
    questions: [],
  };
}

function buildScoredResult() {
  return {
    id: RESULT_ID,
    simulationId: SIMULATION_ID,
    studentId: STUDENT_ID,
    totalScore: 42,
    correctAnswers: 30,
    wrongAnswers: 10,
    blankAnswers: 20,
    answers: [],
    completedAt: new Date('2026-08-03T11:20:00Z'),
    resetAt: null,
  };
}

function createContext(overrides: { simulationResultFindFirst: Mock }) {
  const prisma = {
    student: { findUnique: vi.fn().mockResolvedValue({ id: STUDENT_ID, userId: 'user-1' }) },
    simulation: { findUnique: vi.fn().mockResolvedValue(buildSimulation()) },
    simulationResult: {
      findFirst: overrides.simulationResultFindFirst,
      update: vi.fn(),
      create: vi.fn(),
    },
    openAnswerSubmission: { deleteMany: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
  };

  return {
    prisma,
    ctx: {
      prisma,
      user: { id: 'user-1', role: 'STUDENT' as const, name: 'Mario Rossi', email: 'm@r.it' },
      capabilities: new Set(['student.takeSimulations']),
      sessionInvalidated: false,
    },
  };
}

const submitInput = {
  simulationId: SIMULATION_ID,
  resultId: RESULT_ID,
  answers: [],
  totalTimeSpent: 3600,
  resetToken: null,
};

describe('simulations.submit — replay of an already scored attempt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the stored result instead of refusing the retry', async () => {
    const findFirst = vi.fn().mockResolvedValue(buildScoredResult());
    const { ctx } = createContext({ simulationResultFindFirst: findFirst });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = simulationsRouter.createCaller(ctx as any);
    const result = await caller.submit(submitInput);

    expect(result.resultId).toBe(RESULT_ID);
    // The stored score is handed back, not a freshly computed one
    expect('score' in result && result.score).toBe(42);
  });

  it('does not rescore or rewrite the attempt on a replay', async () => {
    const findFirst = vi.fn().mockResolvedValue(buildScoredResult());
    const { prisma, ctx } = createContext({ simulationResultFindFirst: findFirst });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await simulationsRouter.createCaller(ctx as any).submit(submitInput);

    expect(prisma.simulationResult.update).not.toHaveBeenCalled();
    expect(prisma.openAnswerSubmission.createMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('looks the attempt up by the id the client submitted against', async () => {
    const findFirst = vi.fn().mockResolvedValue(buildScoredResult());
    const { ctx } = createContext({ simulationResultFindFirst: findFirst });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await simulationsRouter.createCaller(ctx as any).submit(submitInput);

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: RESULT_ID,
        simulationId: SIMULATION_ID,
        studentId: STUDENT_ID,
        completedAt: { not: null },
      },
    });
  });

  it('still scores normally when the attempt is genuinely in progress', async () => {
    // First call is the replay probe (nothing completed), the rest is the
    // ordinary in-progress lookup
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ id: RESULT_ID, resetAt: null, completedAt: null });
    const { prisma, ctx } = createContext({ simulationResultFindFirst: findFirst });
    prisma.simulationResult.update.mockResolvedValue({
      ...buildScoredResult(),
      totalScore: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      blankAnswers: 0,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await simulationsRouter.createCaller(ctx as any).submit(submitInput);

    expect(prisma.simulationResult.update).toHaveBeenCalled();
  });
});
