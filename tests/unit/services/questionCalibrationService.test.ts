/**
 * Calibration service tests.
 *
 * The assertion that matters most is negative: whatever the mode, whatever the data,
 * the job must never write `Question.difficulty`. Every other guard is a threshold
 * that could be mis-tuned; this one is the safety property of the feature.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { runQuestionCalibration } from '@/server/services/questionCalibrationService';
import { CALIBRATION_RESULT_WHERE } from '@/server/services/questionCalibration.helpers';

interface MockPrisma {
  question: { findMany: Mock; update: Mock; updateMany: Mock };
  simulationResult: { findMany: Mock };
  questionCalibrationRun: { create: Mock; findFirst: Mock; findMany: Mock };
  questionDifficultyAudit: { findMany: Mock; deleteMany: Mock; createMany: Mock };
  difficultyScale: { findMany: Mock; create: Mock; update: Mock };
  $transaction: Mock;
}

function createMockPrisma(): MockPrisma {
  return {
    question: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    simulationResult: { findMany: vi.fn().mockResolvedValue([]) },
    questionCalibrationRun: {
      create: vi.fn().mockResolvedValue({ id: 'run-1' }),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    questionDifficultyAudit: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    difficultyScale: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
    // The service builds arrays of update promises; running them is enough here.
    $transaction: vi.fn().mockImplementation((operations: unknown) =>
      Array.isArray(operations) ? Promise.all(operations) : Promise.resolve([])
    ),
  };
}

function questionRow(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'q1',
    subjectId: 'bio',
    difficulty: 'MEDIUM',
    difficultySource: 'LEGACY',
    status: 'PUBLISHED',
    qualityFlagCode: null,
    timesAnswered: 0,
    timesCorrect: 0,
    timesWrong: 0,
    timesSkipped: 0,
    timesGraded: 0,
    avgCorrectRate: null,
    avgTimeSeconds: null,
    ...over,
  };
}

function resultRow(
  id: string,
  studentId: string,
  answers: { questionId: string; isCorrect: boolean | null; answerId?: string | null }[]
) {
  return {
    id,
    studentId,
    simulationId: 'sim-1',
    durationSeconds: 600,
    completedAt: new Date('2026-06-01T10:00:00Z'),
    answers: answers.map((a) => ({
      questionId: a.questionId,
      answerId: a.answerId === undefined ? 'ans' : a.answerId,
      answerText: null,
      isCorrect: a.isCorrect,
      earnedPoints: a.isCorrect ? 1 : 0,
      timeSpent: 25,
    })),
    simulation: {
      id: 'sim-1',
      durationMinutes: 60,
      isPaperBased: false,
      hasSections: false,
      sections: null,
    },
  };
}

/** Deterministic pseudo-randomness: a flaky psychometrics fixture is a useless one. */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/**
 * The shape that trips the run-level guard: every question the run can measure is
 * mislabelled the same way.
 *
 * Twenty-five questions marked EASY that almost nobody gets right, plus twenty-five
 * genuinely easy ones. The second half earns its place twice over — it gives the
 * estimator a spread to centre on, and it keeps the EASY bucket above its floor, so
 * the only thing left for the guard to react to is the one-sidedness itself.
 */
function oneSidedBank() {
  const rand = lcg(7);
  // Far enough past the cut to clear the confidence margin, close enough that stronger
  // students still get some right: an item nobody at all can answer carries no
  // information about ability, so it earns a quality flag and is skipped rather than
  // proposed — which is correct behaviour, and would leave this fixture measuring it.
  const items = [
    ...Array.from({ length: 25 }, (_, i) => ({ id: `hard${i}`, b: 1.8 })),
    ...Array.from({ length: 25 }, (_, i) => ({ id: `easy${i}`, b: -1.8 })),
  ];

  const questions = items.map((entry) => questionRow({ id: entry.id, difficulty: 'EASY' }));
  const results = Array.from({ length: 80 }, (_, person) => {
    const ability = -2 + (4 * person) / 79;
    return resultRow(
      `r${person}`,
      `s${person}`,
      items.map((entry) => ({
        questionId: entry.id,
        isCorrect: rand() < 1 / (1 + Math.exp(entry.b - ability)),
      }))
    );
  });

  return { questions, results };
}

/**
 * A subject whose questions carry real human decisions, spread across the range.
 *
 * This is the input the whole scale machinery was built for and that the production
 * bank has never had: every difficulty there is a `LEGACY` import, so `humanLabel` is
 * null everywhere and no subject can ever fit its own cuts.
 */
function labelledBank() {
  const rand = lcg(11);
  const items = Array.from({ length: 60 }, (_, i) => {
    const b = -2 + (4 * i) / 59;
    return { id: `q${i}`, b, level: b < -0.7 ? 'EASY' : b > 0.7 ? 'HARD' : 'MEDIUM' };
  });

  const questions = items.map((entry) =>
    questionRow({ id: entry.id, difficulty: entry.level, difficultySource: 'MANUAL' })
  );
  const results = Array.from({ length: 80 }, (_, person) => {
    const ability = -2 + (4 * person) / 79;
    return resultRow(
      `r${person}`,
      `s${person}`,
      items.map((entry) => ({
        questionId: entry.id,
        isCorrect: rand() < 1 / (1 + Math.exp(entry.b - ability)),
      }))
    );
  });

  return { questions, results };
}

/** Feeds the cursor loop one page then stops. */
function singlePage(prisma: MockPrisma, rows: unknown[]) {
  prisma.simulationResult.findMany.mockResolvedValueOnce(rows).mockResolvedValue([]);
}

describe('runQuestionCalibration', () => {
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  const run = (options = {}) =>
    runQuestionCalibration(prisma as unknown as PrismaClient, {
      now: new Date('2026-07-30T00:00:00Z'),
      ...options,
    });

  it('scans results with the self-practice exclusion, never a looser filter', async () => {
    await run();
    expect(prisma.simulationResult.findMany).toHaveBeenCalled();
    const where = prisma.simulationResult.findMany.mock.calls[0][0].where;
    expect(where).toEqual(CALIBRATION_RESULT_WHERE);
  });

  it('pages with a cursor and stops on a short page', async () => {
    prisma.question.findMany.mockResolvedValue([questionRow()]);
    const fullPage = Array.from({ length: 200 }, (_, i) =>
      resultRow(`r${i}`, `s${i}`, [{ questionId: 'q1', isCorrect: true }])
    );
    prisma.simulationResult.findMany
      .mockResolvedValueOnce(fullPage)
      .mockResolvedValueOnce([resultRow('r200', 's200', [{ questionId: 'q1', isCorrect: false }])]);

    const summary = await run();

    expect(summary.resultsScanned).toBe(201);
    expect(prisma.simulationResult.findMany).toHaveBeenCalledTimes(2);
    // Second page continues after the last id of the first, without an offset scan.
    expect(prisma.simulationResult.findMany.mock.calls[1][0].cursor).toEqual({ id: 'r199' });
    expect(prisma.simulationResult.findMany.mock.calls[1][0].skip).toBe(1);
  });

  it('writes nothing at all in DRY_RUN', async () => {
    prisma.question.findMany.mockResolvedValue([questionRow()]);
    singlePage(prisma, [resultRow('r1', 's1', [{ questionId: 'q1', isCorrect: true }])]);

    const summary = await run({ mode: 'DRY_RUN' });

    expect(summary.questionsWithStats).toBe(1);
    expect(prisma.question.update).not.toHaveBeenCalled();
    expect(prisma.questionCalibrationRun.create).not.toHaveBeenCalled();
    expect(prisma.questionDifficultyAudit.createMany).not.toHaveBeenCalled();
  });

  it('persists statistics but never the difficulty', async () => {
    prisma.question.findMany.mockResolvedValue([questionRow()]);
    singlePage(prisma, [
      resultRow('r1', 's1', [{ questionId: 'q1', isCorrect: true }]),
      resultRow('r2', 's2', [{ questionId: 'q1', isCorrect: false }]),
    ]);

    const summary = await run({ mode: 'STATS_ONLY' });

    expect(summary.statsUpdated).toBe(1);
    expect(prisma.question.update).toHaveBeenCalledTimes(1);
    const data = prisma.question.update.mock.calls[0][0].data;
    expect(data).toMatchObject({
      timesAnswered: 2,
      timesCorrect: 1,
      timesWrong: 1,
      timesGraded: 2,
      avgCorrectRate: 50,
    });
    // The assertion is on the argument, not the call count: a difficulty must never
    // appear in the payload.
    expect(data).not.toHaveProperty('difficulty');
    expect(data).not.toHaveProperty('difficultySource');
  });

  /**
   * The worklist is state, not an append-only log. A proposal that stops qualifying —
   * evidence shifted, cooldown started, quality flag raised — has to disappear, or the
   * queue and the header badge keep advertising a change the data no longer supports.
   * Scoping the delete to the questions being re-proposed left those behind for the
   * ninety days it took the cleanup job to notice.
   */
  it('clears the standing worklist even when it has nothing to propose', async () => {
    prisma.question.findMany.mockResolvedValue([questionRow()]);
    singlePage(prisma, [resultRow('r1', 's1', [{ questionId: 'q1', isCorrect: true }])]);

    const summary = await run({ mode: 'PROPOSE' });

    expect(summary.proposalsCreated).toBe(0);
    expect(prisma.questionDifficultyAudit.deleteMany).toHaveBeenCalledWith({
      where: { status: 'PROPOSED' },
    });
    // The mirror on the question is what the lists read, so it has to be cleared too.
    expect(prisma.question.updateMany).toHaveBeenCalledWith({
      where: { suggestedDifficulty: { not: null } },
      data: { suggestedDifficulty: null, suggestionConfidence: null, suggestedAt: null },
    });
  });

  it('skips the write when the numbers have not moved', async () => {
    prisma.question.findMany.mockResolvedValue([
      questionRow({
        timesAnswered: 1,
        timesCorrect: 1,
        timesWrong: 0,
        timesSkipped: 0,
        timesGraded: 1,
        avgCorrectRate: 100,
        avgTimeSeconds: 25,
      }),
    ]);
    singlePage(prisma, [resultRow('r1', 's1', [{ questionId: 'q1', isCorrect: true }])]);

    const summary = await run({ mode: 'STATS_ONLY' });

    expect(summary.statsUpdated).toBe(0);
    expect(prisma.question.update).not.toHaveBeenCalled();
  });

  it('never writes a difficulty in PROPOSE mode either', async () => {
    // A blatantly hard question with plenty of data: the strongest case for a change.
    prisma.question.findMany.mockResolvedValue([
      questionRow({ id: 'hard' }),
      questionRow({ id: 'normal' }),
    ]);
    const rows = Array.from({ length: 60 }, (_, i) =>
      resultRow(`r${i}`, `s${i}`, [
        { questionId: 'hard', isCorrect: false },
        { questionId: 'normal', isCorrect: i % 2 === 0 },
      ])
    );
    singlePage(prisma, rows);

    await run({ mode: 'PROPOSE', forceProposals: true });

    for (const call of prisma.question.update.mock.calls) {
      expect(call[0].data).not.toHaveProperty('difficulty');
      expect(call[0].data).not.toHaveProperty('difficultySource');
    }
  });

  it('records a run summary with the counters', async () => {
    prisma.question.findMany.mockResolvedValue([questionRow()]);
    singlePage(prisma, [resultRow('r1', 's1', [{ questionId: 'q1', isCorrect: true }])]);

    const summary = await run({ mode: 'STATS_ONLY', trigger: 'MANUAL' });

    expect(summary.runId).toBe('run-1');
    const data = prisma.questionCalibrationRun.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ mode: 'STATS_ONLY', trigger: 'MANUAL', resultsScanned: 1 });
    expect(data.distributionBefore).toEqual({ EASY: 0, MEDIUM: 1, HARD: 0 });
  });

  it('counts only a student first encounter with a question', async () => {
    prisma.question.findMany.mockResolvedValue([questionRow()]);
    singlePage(prisma, [
      resultRow('r1', 's1', [{ questionId: 'q1', isCorrect: false }]),
      resultRow('r2', 's1', [{ questionId: 'q1', isCorrect: true }]),
      resultRow('r3', 's1', [{ questionId: 'q1', isCorrect: true }]),
    ]);

    const summary = await run({ mode: 'STATS_ONLY' });

    expect(summary.repeatExposuresExcluded).toBe(2);
    expect(prisma.question.update.mock.calls[0][0].data).toMatchObject({
      timesAnswered: 1,
      timesCorrect: 0,
      avgCorrectRate: 0,
    });
  });

  /**
   * The loop the feature depends on and that has never closed in production: humans
   * decide some difficulties, and those decisions become the subject's own thresholds.
   * With a bank that is entirely `LEGACY` there is nothing to fit, the generic cuts
   * stay forever, and every question is judged against a stick nobody measured.
   */
  it('fits a subject its own cuts from the levels humans decided', async () => {
    const { questions, results } = labelledBank();
    prisma.question.findMany.mockResolvedValue(questions);
    singlePage(prisma, results);

    await run({ mode: 'PROPOSE' });

    expect(prisma.difficultyScale.create).toHaveBeenCalledTimes(1);
    const scale = prisma.difficultyScale.create.mock.calls[0][0].data;
    expect(scale.confidence).not.toBe('LOW');
    expect(scale.fitSampleSize).toBeGreaterThanOrEqual(40);
    // Fitted, not the fallback pair the bank has been stuck on.
    expect(scale.cutEasyMedium).not.toBeCloseTo(-0.65, 2);
    expect(scale.cutMediumHard).not.toBeCloseTo(0.65, 2);
    expect(scale.cutEasyMedium).toBeLessThan(scale.cutMediumHard);
  });

  /**
   * A refused run used to record `proposalsCreated: 0` and a `distributionAfter`
   * identical to `distributionBefore`, so the first question anyone asks in front of
   * the warning — how many were there, and which way did they point — had no answer
   * anywhere. The batch is still discarded; the evidence of it is not.
   */
  it('records the batch an anomalous run refused, instead of a silent zero', async () => {
    const { questions, results } = oneSidedBank();
    prisma.question.findMany.mockResolvedValue(questions);
    singlePage(prisma, results);

    const summary = await run({ mode: 'PROPOSE' });

    expect(summary.isAnomalous).toBe(true);
    expect(summary.anomalyReason).toMatch(/ONE_DIRECTION/);

    // The guard still refuses: nothing published, and the standing worklist untouched.
    expect(summary.proposalsCreated).toBe(0);
    expect(prisma.questionDifficultyAudit.createMany).not.toHaveBeenCalled();
    expect(prisma.questionDifficultyAudit.deleteMany).not.toHaveBeenCalled();

    expect(summary.proposalsComputed).toBeGreaterThanOrEqual(20);
    expect(summary.proposalsHarder).toBe(summary.proposalsComputed);
    expect(summary.proposalsEasier).toBe(0);
    expect(summary.distributionAfter).not.toEqual(summary.distributionBefore);

    const recorded = prisma.questionCalibrationRun.create.mock.calls[0][0].data;
    expect(recorded.proposalsCreated).toBe(0);
    expect(recorded.proposalsComputed).toBe(summary.proposalsComputed);
    expect(recorded.proposalsHarder).toBe(summary.proposalsHarder);
  });

  /**
   * The gate keyed on `proposalsCreated > 0`, which an anomalous run never satisfies:
   * the cron recomputed the same refused batch every night and logged the same warning
   * about a state that by definition had not changed.
   */
  it('lets a refused run close the weekly window instead of retrying every night', async () => {
    prisma.question.findMany.mockResolvedValue([questionRow()]);
    singlePage(prisma, [resultRow('r1', 's1', [{ questionId: 'q1', isCorrect: false }])]);

    await run({ mode: 'PROPOSE' });

    const where = prisma.questionCalibrationRun.findFirst.mock.calls[0][0].where;
    expect(where.OR).toContainEqual({ isAnomalous: true });
    expect(where.OR).toContainEqual({ proposalsCreated: { gt: 0 } });
  });

  it('holds proposals back until the weekly window reopens', async () => {
    prisma.question.findMany.mockResolvedValue([questionRow()]);
    prisma.questionCalibrationRun.findFirst.mockResolvedValue({
      startedAt: new Date('2026-07-28T00:00:00Z'), // two days ago
    });
    singlePage(prisma, [resultRow('r1', 's1', [{ questionId: 'q1', isCorrect: false }])]);

    const summary = await run({ mode: 'PROPOSE' });

    expect(summary.proposalsCreated).toBe(0);
    expect(prisma.questionDifficultyAudit.createMany).not.toHaveBeenCalled();
  });

  it('survives a failure mid-scan and reports it instead of throwing', async () => {
    prisma.question.findMany.mockResolvedValue([questionRow()]);
    prisma.simulationResult.findMany.mockRejectedValue(new Error('connessione persa'));

    const summary = await run({ mode: 'STATS_ONLY' });

    expect(summary.errors.join(' ')).toMatch(/connessione persa/);
    expect(summary.resultsScanned).toBe(0);
  });

  it('ignores answers to questions outside the requested scope', async () => {
    prisma.question.findMany.mockResolvedValue([questionRow({ id: 'q1' })]);
    singlePage(prisma, [
      resultRow('r1', 's1', [
        { questionId: 'q1', isCorrect: true },
        { questionId: 'q-archived', isCorrect: true },
      ]),
    ]);

    const summary = await run({ mode: 'STATS_ONLY', questionIds: ['q1'] });

    expect(summary.questionsWithStats).toBe(1);
    expect(prisma.question.findMany.mock.calls[0][0].where.id).toEqual({ in: ['q1'] });
  });
});
