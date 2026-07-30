// Shared helpers for simulation attempts, used by both the simulations and
// virtualRoom routers (kept out of simulations.ts so virtualRoom.ts can import
// them without pulling in the whole router).
import { Prisma, PrismaClient } from '@prisma/client';
import { sanitizeStudentAnswerText, sanitizeStudentOpenAnswerInput } from '@/lib/utils/studentOpenAnswer';

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
  /** Monotonic revision of the stored snapshot; 0 for legacy saves written before it existed */
  savedRev: number;
}

/**
 * A graded answer as stored in `SimulationResult.answers` after submission.
 *
 * `isCorrect` is deliberately tri-state: `null` means an open answer still
 * awaiting correction, which is NOT the same as wrong. And `isCorrect === false`
 * does not imply the student answered — the scorer writes `false` for blanks on
 * multiple-choice questions too, so `classifyAnswerOutcome` is the only safe way
 * to read the outcome.
 */
export interface StoredAnswer {
  questionId: string;
  answerId: string | null;
  answerText: string | null;
  isCorrect: boolean | null;
  earnedPoints: number;
  timeSpent: number;
  /**
   * Difficulty the question carried when the attempt was graded. Frozen here so a
   * later recalibration cannot move a student's historical statistics; absent on
   * results written before this was recorded, hence optional.
   */
  difficulty?: string;
}

/**
 * Reads the graded answers out of a stored result, tolerating both shapes the
 * column has held: a bare array (post-submission) and the `{ items }` envelope
 * used by autosave. Shared with the calibration service — duplicating a defensive
 * parser is the surest way to have two of them disagree.
 */
export function parseResultAnswers(value: Prisma.JsonValue): StoredAnswer[] {
  const rawAnswers = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && 'items' in value && Array.isArray((value as { items?: unknown }).items)
      ? (value as { items: unknown[] }).items
      : [];

  return rawAnswers.flatMap((rawAnswer) => {
    if (!rawAnswer || typeof rawAnswer !== 'object' || Array.isArray(rawAnswer)) return [];
    const answer = rawAnswer as Record<string, unknown>;
    if (typeof answer.questionId !== 'string') return [];

    return [{
      questionId: answer.questionId,
      answerId: typeof answer.answerId === 'string' ? answer.answerId : null,
      answerText: typeof answer.answerText === 'string' ? answer.answerText : null,
      isCorrect: typeof answer.isCorrect === 'boolean' ? answer.isCorrect : null,
      earnedPoints: typeof answer.earnedPoints === 'number' ? answer.earnedPoints : 0,
      timeSpent: typeof answer.timeSpent === 'number' ? answer.timeSpent : 0,
      ...(typeof answer.difficulty === 'string' ? { difficulty: answer.difficulty } : {}),
    }];
  });
}

/**
 * Parse saved answers from simulation result - handles both old and new format
 */
export function parseSavedProgress(savedData: unknown): ParsedSavedProgress {
  let savedAnswers: SavedAnswerItem[] = [];
  let savedSectionTimes: Record<number, number> = {};
  let savedCurrentSectionIndex = 0;
  let savedCurrentQuestionIndex = 0;
  let savedRev = 0;

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
      rev?: number;
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
    savedRev = typeof meta.rev === 'number' && Number.isFinite(meta.rev) ? meta.rev : 0;
  }

  return {
    savedAnswers,
    savedSectionTimes,
    savedCurrentSectionIndex,
    savedCurrentQuestionIndex,
    savedRev,
  };
}

/**
 * True for Prisma's "unique constraint failed" (P2002). Used to turn a lost
 * create-race into a resume instead of an error the user has to recover from.
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return (error as { code?: string })?.code === 'P2002';
}

export interface ResumableAttempt {
  id: string;
  resetAt: Date | null;
  durationSeconds: number | null;
  answers: Prisma.JsonValue;
}

/**
 * The payload `startAttempt` returns when a student picks an attempt back up.
 * Shared by the normal resume path and by the create-race fallback so the two
 * can never hand the client a different shape.
 */
export function buildResumeAttemptPayload(attempt: ResumableAttempt) {
  const savedProgress = parseSavedProgress(attempt.answers);

  return {
    resultId: attempt.id,
    resumed: true,
    // Echoed back by saveProgress/submit: writes from a tab opened before
    // a staff reset carry a stale token and are rejected
    resetToken: attempt.resetAt?.getTime() ?? null,
    savedTimeSpent: attempt.durationSeconds || 0,
    // Lets the client tell its local draft apart from what is already stored
    savedRev: savedProgress.savedRev,
    savedAnswers: savedProgress.savedAnswers,
    savedSectionTimes: savedProgress.savedSectionTimes,
    savedCurrentSectionIndex: savedProgress.savedCurrentSectionIndex,
    savedCurrentQuestionIndex: savedProgress.savedCurrentQuestionIndex,
  };
}

export interface PersistProgressInput {
  resultId: string;
  studentId: string;
  // questionId is optional here because the beacon route receives an unvalidated
  // JSON body; entries without one are dropped before writing
  answers: Array<{
    questionId?: string;
    answerId?: string | null;
    answerText?: string | null;
    timeSpent?: number | null;
    flagged?: boolean | null;
  }>;
  timeSpent: number;
  sectionTimes?: Record<string | number, number> | null;
  currentSectionIndex?: number | null;
  currentQuestionIndex?: number | null;
  /** Echoed from startAttempt; guards against a tab opened before a staff reset */
  resetToken?: number | null;
  /** Monotonic counter from the client; writes older than what is stored are dropped */
  rev?: number | null;
}

/**
 * Flat status rather than a discriminated union: this project compiles with
 * `strict: false`, so narrowing on a boolean discriminant is unreliable.
 */
export type PersistProgressStatus =
  | 'saved'
  | 'skipped'
  | 'not_found'
  | 'forbidden'
  | 'completed'
  | 'reset';

export type PersistProgressFailure = Exclude<PersistProgressStatus, 'saved' | 'skipped'>;

/**
 * Single write path for in-progress autosaves, shared by the tRPC `saveProgress`
 * mutation and the `sendBeacon` REST route so their guards can't drift apart.
 * Returns a result instead of throwing: each caller maps it onto its own error
 * surface (TRPCError vs HTTP status).
 */
export async function persistProgress(
  prisma: PrismaClientOrTx,
  input: PersistProgressInput
): Promise<PersistProgressStatus> {
  const result = await prisma.simulationResult.findUnique({
    where: { id: input.resultId },
    select: { studentId: true, completedAt: true, resetAt: true, answers: true },
  });

  if (!result) return 'not_found';
  if (result.studentId !== input.studentId) return 'forbidden';
  if (result.completedAt) return 'completed';

  // A tab opened before a staff reset carries a stale (or missing) token:
  // reject its writes so they can't overwrite the reset state
  if (result.resetAt && input.resetToken !== result.resetAt.getTime()) {
    return 'reset';
  }

  // Beacons can arrive out of order, and a second tab left open lags behind:
  // an older snapshot must never overwrite a newer one. Reported as success
  // because nothing is wrong — the write was simply redundant.
  const incomingRev = typeof input.rev === 'number' && Number.isFinite(input.rev) ? input.rev : null;
  const { savedRev } = parseSavedProgress(result.answers);
  if (incomingRev !== null && incomingRev < savedRev) return 'skipped';

  // A client that does not number its writes — the Expo app never sends `rev` — must
  // not erase the ordering guard for the ones that do. Carrying the stored revision
  // forward keeps a lagging beacon from another tab recognisable as older; dropping it
  // reset the counter to zero and let that beacon overwrite newer answers.
  const nextRev = incomingRev ?? savedRev;

  const answersWithMeta = {
    items: input.answers
      .filter((answer) => typeof answer.questionId === 'string' && answer.questionId.length > 0)
      .map((answer) => ({
        questionId: answer.questionId,
        answerId: answer.answerId ?? null,
        answerText: sanitizeStudentAnswerText(answer.answerText),
        timeSpent: answer.timeSpent ?? 0,
        flagged: answer.flagged ?? false,
      })),
    sectionTimes: input.sectionTimes || {},
    currentSectionIndex: input.currentSectionIndex ?? 0,
    currentQuestionIndex: input.currentQuestionIndex ?? 0,
    ...(nextRev > 0 && { rev: nextRev }),
  };

  await prisma.simulationResult.update({
    where: { id: input.resultId },
    data: {
      answers: answersWithMeta as unknown as Prisma.InputJsonValue,
      durationSeconds: input.timeSpent,
    },
  });

  return 'saved';
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

// ==================== Assignment ↔ calendar-event date sync ====================
// A simulation assignment and its calendar event are linked via
// SimulationAssignment.calendarEventId. Moving one must move the other so every
// invitee sees the new date. These helpers keep the two records in date-sync and
// are shared by the simulations router (assignment → event) and the calendar
// router (event → assignments).

export interface AssignmentEventSchedule {
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  description: string | null;
}

export interface AssignmentTargetIdentity {
  studentId?: string | null;
  groupId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

/**
 * Identity of an assignment target: same recipient + same availability window.
 * Used to make "Assegna" idempotent — a re-sent request (double click, client retry,
 * duplicated targets in one payload) must not produce a second assignment and, with
 * it, a second calendar event. The overlap check can't cover this on its own: it
 * skips windows longer than 24h and assignments without dates.
 */
export function assignmentTargetKey(target: AssignmentTargetIdentity): string {
  const recipient = target.studentId ? `s:${target.studentId}` : `g:${target.groupId ?? ''}`;
  return `${recipient}|${target.startDate ?? ''}|${target.endDate ?? ''}`;
}

/**
 * Drop targets that repeat the same recipient + window inside a single request,
 * keeping the first occurrence.
 */
export function dedupeAssignmentTargets<T extends AssignmentTargetIdentity>(targets: T[]): T[] {
  const seen = new Set<string>();
  return targets.filter((target) => {
    const key = assignmentTargetKey(target);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Description shown on the calendar event when the availability window spans more
 * than one day (single-day windows carry no generated description).
 */
export function buildSimulationEventDescription(
  startDate: Date,
  endDate: Date,
  isMultiDay: boolean
): string | null {
  if (!isMultiDay) {
    return null;
  }
  const fmt = (d: Date) =>
    d.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  return `Disponibile dal ${fmt(startDate)} al ${fmt(endDate)}`;
}

/**
 * Derive the calendar-event schedule fields from an assignment's dates, applying
 * the same defaults used when the event is first created (missing start → now,
 * missing end → start + simulation duration). A window that crosses midnight
 * becomes an all-day event with a "Disponibile dal … al …" description.
 */
export function computeAssignmentEventSchedule(
  startDate: Date | null,
  endDate: Date | null,
  durationMinutes: number,
  now: Date = new Date()
): AssignmentEventSchedule {
  const start = startDate ?? now;
  const end = endDate ?? new Date(start.getTime() + durationMinutes * 60 * 1000);
  const isMultiDay =
    new Date(start).setHours(0, 0, 0, 0) !== new Date(end).setHours(0, 0, 0, 0);
  return {
    startDate: start,
    endDate: end,
    isAllDay: isMultiDay,
    description: buildSimulationEventDescription(start, end, isMultiDay),
  };
}

/**
 * Push each assignment's schedule onto its linked calendar event. Assignments
 * without a linked event are skipped. isAllDay is recomputed so a window that
 * grows to span midnight becomes an all-day event (and shrinks back). The event
 * `description` is deliberately left untouched — it isn't a date field, so
 * overwriting it here would wipe any note staff added to the event.
 * Returns how many events were updated.
 */
export async function syncCalendarEventsForAssignments(
  prisma: PrismaClient,
  assignmentIds: string[]
): Promise<number> {
  if (assignmentIds.length === 0) {
    return 0;
  }

  const assignments = await prisma.simulationAssignment.findMany({
    where: { id: { in: assignmentIds }, calendarEventId: { not: null } },
    select: {
      calendarEventId: true,
      startDate: true,
      endDate: true,
      simulation: { select: { durationMinutes: true } },
    },
  });

  let updated = 0;
  await Promise.all(
    assignments.map(async (a) => {
      if (!a.calendarEventId) {
        return;
      }
      const schedule = computeAssignmentEventSchedule(
        a.startDate,
        a.endDate,
        a.simulation.durationMinutes
      );
      await prisma.calendarEvent.update({
        where: { id: a.calendarEventId },
        data: {
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          isAllDay: schedule.isAllDay,
        },
      });
      updated++;
    })
  );

  return updated;
}

/**
 * Push a calendar event's new dates onto every assignment linked to it — used
 * when staff move a SIMULATION event directly from the calendar. Returns how
 * many assignments were updated.
 */
export async function syncAssignmentsForCalendarEvent(
  prisma: PrismaClient,
  eventId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const result = await prisma.simulationAssignment.updateMany({
    where: { calendarEventId: eventId },
    data: { startDate, endDate },
  });
  return result.count;
}

/**
 * A section as accepted by `simulations.updateQuestions`. Every field is optional because
 * the router's zod-inferred input type marks them so; the helper only passes them through.
 */
export interface UpdatableSection {
  id?: string;
  name?: string;
  durationMinutes?: number;
  questionIds?: string[];
  subjectId?: string | null;
  subjectIds?: string[];
  subjectQuestionCounts?: Record<string, number>;
  topicIds?: string[];
  questionTypes?: string[];
  questionTypeCounts?: Record<string, number>;
  difficultyLevels?: string[];
  tagIds?: string[];
  language?: string | null;
  order?: number;
}

/**
 * Rebuilds the sections JSON when a simulation's questions are edited, dropping question
 * ids that no longer exist.
 *
 * The generation filters (language, subjects, topics, types, difficulty, tags) are carried
 * over deliberately: a later regeneration reads them back from this JSON, so omitting one
 * silently disables that filter — this is how IT-only sections started serving EN questions.
 */
export function sanitizeSectionsForQuestionUpdate(
  sections: UpdatableSection[] | undefined,
  validQuestionIds: Set<string>
) {
  return sections?.map((section, index) => {
    const sectionQuestionIds = (section.questionIds ?? []).filter((questionId) =>
      validQuestionIds.has(questionId)
    );
    return {
      id: section.id,
      name: section.name,
      durationMinutes: section.durationMinutes,
      questionIds: sectionQuestionIds,
      questionCount: sectionQuestionIds.length,
      subjectId: section.subjectId ?? null,
      subjectIds: section.subjectIds ?? [],
      subjectQuestionCounts: section.subjectQuestionCounts ?? {},
      topicIds: section.topicIds ?? [],
      questionTypes: section.questionTypes ?? [],
      questionTypeCounts: section.questionTypeCounts ?? {},
      difficultyLevels: section.difficultyLevels ?? [],
      tagIds: section.tagIds ?? [],
      language: section.language ?? null,
      order: section.order ?? index,
    };
  });
}

// ==================== ANSWER OUTCOMES & OPEN ANSWER STATS ====================

export type AnswerOutcome = 'correct' | 'wrong' | 'pending' | 'blank';

/**
 * Classify a stored answer for statistics.
 *
 * An open answer carries no `answerId`, so keying off that alone counts every
 * open answer as blank — which zeroed the correct rate of every OPEN_TEXT
 * question and flagged them all as critical.
 */
export function classifyAnswerOutcome(answer: {
  answerId?: string | null;
  answerText?: string | null;
  isCorrect?: boolean | null;
}): AnswerOutcome {
  const hasAnswer = Boolean(answer.answerId) || Boolean(answer.answerText?.trim());
  if (!hasAnswer) return 'blank';
  if (answer.isCorrect === true) return 'correct';
  if (answer.isCorrect === false) return 'wrong';
  return 'pending';
}

/**
 * Match an open answer against keywords, case-insensitively.
 *
 * Single source of truth for "does this text satisfy the question": the scorer
 * and the statistics must not drift apart. Keywords are alternatives (OR).
 */
export function matchOpenAnswerKeywords(
  answerText: string,
  keywords: string[]
): { matched: string[]; missed: string[] } {
  const answerLower = answerText.toLowerCase();
  const matched: string[] = [];
  const missed: string[] = [];

  for (const keyword of keywords) {
    if (answerLower.includes(keyword.toLowerCase())) {
      matched.push(keyword);
    } else {
      missed.push(keyword);
    }
  }

  return { matched, missed };
}

export type TextAnswerDistributionItem = {
  text: string;
  count: number;
  matchesKeyword: boolean;
};

export type TextAnswerDistribution = {
  items: TextAnswerDistributionItem[];
  otherCount: number;
  otherDistinct: number;
};

/**
 * Group the open answers actually submitted, most frequent first.
 *
 * Grouping is case- and whitespace-insensitive, but the displayed text keeps the
 * first spelling encountered. `otherCount`/`otherDistinct` report what the limit
 * left out, so a truncated list never reads as the whole picture.
 */
export function buildTextAnswerDistribution(
  answerTexts: Array<string | null | undefined>,
  keywords: string[],
  limit = 15
): TextAnswerDistribution {
  const groups = new Map<string, { text: string; count: number }>();

  for (const rawText of answerTexts) {
    const text = sanitizeStudentOpenAnswerInput(rawText).trim().replace(/\s+/g, ' ');
    if (!text) continue;

    const key = text.toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, { text, count: 1 });
    }
  }

  const sorted = Array.from(groups.values()).sort(
    (a, b) => b.count - a.count || a.text.localeCompare(b.text, 'it')
  );

  const items = sorted.slice(0, limit).map((group) => ({
    text: group.text,
    count: group.count,
    matchesKeyword: matchOpenAnswerKeywords(group.text, keywords).matched.length > 0,
  }));

  const rest = sorted.slice(limit);

  return {
    items,
    otherCount: rest.reduce((total, group) => total + group.count, 0),
    otherDistinct: rest.length,
  };
}
