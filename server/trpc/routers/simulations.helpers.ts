// Shared helpers for simulation attempts, used by both the simulations and
// virtualRoom routers (kept out of simulations.ts so virtualRoom.ts can import
// them without pulling in the whole router).
import { Prisma, PrismaClient } from '@prisma/client';

// Types for saved answer parsing
export interface SavedAnswerItem {
  questionId: string;
  answerId: string | null;
  answerText: string | null;
  timeSpent: number;
  flagged: boolean;
}

export interface ParsedSavedProgress {
  savedAnswers: SavedAnswerItem[];
  savedSectionTimes: Record<number, number>;
  savedCurrentSectionIndex: number;
  savedCurrentQuestionIndex: number;
}

/**
 * Parse saved answers from simulation result - handles both old and new format
 */
export function parseSavedProgress(savedData: unknown): ParsedSavedProgress {
  let savedAnswers: SavedAnswerItem[] = [];
  let savedSectionTimes: Record<number, number> = {};
  let savedCurrentSectionIndex = 0;
  let savedCurrentQuestionIndex = 0;

  if (Array.isArray(savedData)) {
    // Old format: just an array of answers
    savedAnswers = savedData as SavedAnswerItem[];
  } else if (savedData && typeof savedData === 'object' && 'items' in savedData) {
    // New format: object with items, sectionTimes, currentSectionIndex
    const meta = savedData as {
      items: SavedAnswerItem[];
      sectionTimes?: Record<string, number>;
      currentSectionIndex?: number;
      currentQuestionIndex?: number;
    };
    savedAnswers = meta.items || [];
    // Convert string keys to number keys for sectionTimes
    if (meta.sectionTimes) {
      savedSectionTimes = Object.fromEntries(
        Object.entries(meta.sectionTimes).map(([k, v]) => [Number(k), v])
      );
    }
    savedCurrentSectionIndex = meta.currentSectionIndex ?? 0;
    savedCurrentQuestionIndex = meta.currentQuestionIndex ?? 0;
  }

  return { savedAnswers, savedSectionTimes, savedCurrentSectionIndex, savedCurrentQuestionIndex };
}

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

export type ResettableResult = {
  id: string;
  answers: Prisma.JsonValue;
  durationSeconds: number | null;
};

// When keeping the elapsed time, always leave the student at least this much
// so the resumed attempt doesn't instantly auto-submit at "time expired"
const MIN_REMAINING_SECONDS_ON_RESET = 60;

/**
 * Reset a simulation attempt so the student can resume it, keeping the saved
 * answers. Works for both in-progress (stuck) and completed attempts: scoring
 * is cleared and the answers are re-wrapped in the in-progress envelope that
 * `startAttempt` returns on resume. `resetAt` marks the attempt as staff-blessed
 * so it is protected from auto-invalidation by a newer Virtual Room session.
 */
export async function resetSimulationResultForResume(
  prisma: PrismaClientOrTx,
  result: ResettableResult,
  opts: { resetTimer: boolean; byUserId: string; maxDurationSeconds?: number | null }
): Promise<void> {
  const saved = parseSavedProgress(result.answers);

  // Completed attempts store evaluated answers (isCorrect, earnedPoints):
  // strip the scoring metadata so the resumed attempt looks like a normal save
  const items = saved.savedAnswers.map((a) => ({
    questionId: a.questionId,
    answerId: a.answerId ?? null,
    answerText: a.answerText ?? null,
    timeSpent: a.timeSpent ?? 0,
    flagged: a.flagged ?? false,
  }));

  const answersWithMeta = {
    items,
    sectionTimes: opts.resetTimer ? {} : saved.savedSectionTimes,
    currentSectionIndex: opts.resetTimer ? 0 : saved.savedCurrentSectionIndex,
    currentQuestionIndex: opts.resetTimer ? 0 : saved.savedCurrentQuestionIndex,
  };

  let keptDurationSeconds = result.durationSeconds ?? 0;
  if (opts.maxDurationSeconds != null) {
    keptDurationSeconds = Math.min(
      keptDurationSeconds,
      Math.max(0, opts.maxDurationSeconds - MIN_REMAINING_SECONDS_ON_RESET)
    );
  }

  await prisma.simulationResult.update({
    where: { id: result.id },
    data: {
      completedAt: null,
      // Also makes the attempt newer than any existing session, so the
      // "stale attempt from an old session" invalidation never matches it
      startedAt: new Date(),
      durationSeconds: opts.resetTimer ? 0 : keptDurationSeconds,
      totalScore: 0,
      percentageScore: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      blankAnswers: 0,
      pendingOpenAnswers: 0,
      reviewedAt: null,
      reviewedById: null,
      rankPosition: null,
      totalParticipants: null,
      subjectScores: Prisma.DbNull,
      answers: answersWithMeta as unknown as Prisma.InputJsonValue,
      resetAt: new Date(),
      resetById: opts.byUserId,
    },
  });

  // Open-answer submissions belong to the submitted attempt: they will be
  // recreated on the next submit
  await prisma.openAnswerSubmission.deleteMany({ where: { simulationResultId: result.id } });
}

/**
 * Reset a Virtual Room participant so the student can re-enter the room:
 * clears completion, ready state and any kick.
 */
export async function resetParticipantForResume(
  prisma: PrismaClientOrTx,
  participantId: string
): Promise<void> {
  await prisma.simulationSessionParticipant.update({
    where: { id: participantId },
    data: {
      completedAt: null,
      readyAt: null,
      isKicked: false,
      kickedAt: null,
      kickedReason: null,
    },
  });
}

export interface AttemptResetTarget {
  /** The attempt to reset (absent when only re-admitting a participant with no linked result) */
  result?: ResettableResult | null;
  /** Virtual Room participant linked to the attempt, if any */
  participantId?: string | null;
  /** The attempt's assignment, used to re-open a closed access window (direct assignments only) */
  assignment?: {
    id: string;
    studentId: string | null;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
  } | null;
  /** Simulation-level end date, fallback when the assignment has none */
  simulationEndDate?: Date | null;
  /** Simulation time limit in seconds, used to clamp the kept elapsed time */
  maxDurationSeconds?: number | null;
}

export interface AttemptResetOutcome {
  /** The direct assignment's window was closed and has been re-opened for 24h */
  assignmentExtended: boolean;
  /** The window is closed but belongs to a group assignment: staff must re-open it manually */
  assignmentWindowClosed: boolean;
}

// How long a re-opened direct assignment stays accessible after a reset
const RESET_ACCESS_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Shared orchestration for the staff "reset attempt" action: resets the result
 * (keeping answers), the linked room participant, and — for direct assignments
 * only — re-opens a closed access window so the student can actually resume.
 * Group assignment windows are never touched (it would re-open access for the
 * whole group); the outcome flags let the caller warn the staff instead.
 */
export async function performAttemptReset(
  prisma: PrismaClient,
  target: AttemptResetTarget,
  opts: { resetTimer: boolean; byUserId: string }
): Promise<AttemptResetOutcome> {
  const now = new Date();
  const { assignment } = target;

  const effectiveEndDate = assignment ? (assignment.endDate ?? target.simulationEndDate ?? null) : null;
  const isWindowClosed =
    !!assignment &&
    (assignment.status !== 'ACTIVE' ||
      (effectiveEndDate !== null && effectiveEndDate <= now) ||
      (assignment.startDate !== null && assignment.startDate > now));
  const canExtend = isWindowClosed && !!assignment?.studentId;

  await prisma.$transaction(async (tx) => {
    if (target.result) {
      await resetSimulationResultForResume(tx, target.result, {
        resetTimer: opts.resetTimer,
        byUserId: opts.byUserId,
        maxDurationSeconds: target.maxDurationSeconds,
      });
    }
    if (target.participantId) {
      await resetParticipantForResume(tx, target.participantId);
    }
    if (canExtend && assignment) {
      await tx.simulationAssignment.update({
        where: { id: assignment.id },
        data: {
          status: 'ACTIVE',
          startDate: assignment.startDate && assignment.startDate > now ? now : assignment.startDate,
          endDate: new Date(now.getTime() + RESET_ACCESS_WINDOW_MS),
        },
      });
    }
  });

  return {
    assignmentExtended: canExtend,
    assignmentWindowClosed: isWindowClosed && !canExtend,
  };
}
