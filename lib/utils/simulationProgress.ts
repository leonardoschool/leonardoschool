// Shared serialization/merge logic for an in-progress simulation attempt.
// Kept pure so both the local draft (localStorage) and the server autosave
// speak the exact same shape, and so the tricky merge rules are unit-testable.

export interface SimulationAnswerItem {
  questionId: string;
  answerId: string | null;
  answerText: string | null;
  timeSpent: number;
  flagged: boolean;
}

/** One point-in-time snapshot of an attempt, as stored locally and on the server. */
export interface SimulationProgressSnapshot {
  /** Monotonic counter: orders snapshots without relying on clocks. */
  rev: number;
  /** Epoch ms, tie-breaker only — device clocks are not trustworthy. */
  updatedAt: number;
  /** Echo of `SimulationResult.resetAt`, to detect a snapshot predating a staff reset. */
  resetToken: number | null;
  items: SimulationAnswerItem[];
  timeSpent: number;
  sectionTimes: Record<number, number>;
  currentSectionIndex: number;
  currentQuestionIndex: number;
}

/**
 * Coerce answer items coming from the server or from stored JSON into the shape
 * the client works with. Entries without a question id are dropped: they can't be
 * matched to anything and would break lookups downstream.
 */
export function normalizeAnswerItems(
  raw: ReadonlyArray<{
    questionId?: string | null;
    answerId?: string | null;
    answerText?: string | null;
    timeSpent?: number | null;
    flagged?: boolean | null;
  }> | null | undefined
): SimulationAnswerItem[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item) => typeof item?.questionId === 'string' && item.questionId.length > 0)
    .map((item) => ({
      questionId: item.questionId as string,
      answerId: item.answerId ?? null,
      answerText: item.answerText ?? null,
      timeSpent: item.timeSpent ?? 0,
      flagged: item.flagged ?? false,
    }));
}

/**
 * An answer is worth persisting only once the student has actually touched it.
 * Untouched questions are reconstructed on the fly by `upsertCurrentAnswer`, so
 * dropping them here costs nothing and keeps the stored JSON proportional to the
 * work done rather than to the size of the simulation.
 */
export function isMeaningfulAnswer(answer: SimulationAnswerItem): boolean {
  return (
    answer.answerId !== null
    || (answer.answerText !== null && answer.answerText.trim().length > 0)
    || answer.flagged
    || answer.timeSpent > 0
  );
}

/**
 * Per-question time accounting. The implementation lives in `shared/` because the
 * Expo app under `mobile/` submits the same field and the calibration reads both as
 * one signal — see `shared/simulationTime.ts` for why the unit matters.
 */
export {
  accumulateQuestionMs,
  questionMsToSeconds,
  questionSecondsToMs,
} from '@/shared/simulationTime';

/**
 * Resolve each answer's authoritative time from the live per-question tracker,
 * then keep only the answers the student has actually engaged with.
 */
export function buildProgressItems(
  answers: readonly SimulationAnswerItem[],
  questionTimes: Readonly<Record<string, number>>
): SimulationAnswerItem[] {
  return answers
    .map((answer) => ({
      ...answer,
      timeSpent: questionTimes[answer.questionId] || answer.timeSpent || 0,
    }))
    .filter(isMeaningfulAnswer);
}

/**
 * Stable signature of everything the student can *change*. Deliberately excludes
 * elapsed times: those tick every second and would make the signature differ on
 * every comparison, defeating the point of skipping unchanged writes.
 * Items are sorted because the answers array grows by append, not by position.
 */
export function progressFingerprint(
  items: readonly SimulationAnswerItem[],
  currentQuestionIndex: number,
  currentSectionIndex: number
): string {
  const answerPart = [...items]
    .sort((a, b) => a.questionId.localeCompare(b.questionId))
    .map((item) => `${item.questionId}:${item.answerId ?? ''}:${item.answerText ?? ''}:${item.flagged ? 1 : 0}`)
    .join('|');

  return `${currentSectionIndex}/${currentQuestionIndex}#${answerPart}`;
}

/**
 * Pick the snapshot to resume from. The local draft is the only one that
 * survives a connection loss, so it wins whenever it is genuinely ahead.
 *
 * Exception: a draft carrying a different `resetToken` predates a staff reset of
 * this attempt. It may hold state the reset deliberately cleared (timers, section
 * position), so the server always wins there — same rule the write path enforces.
 */
export function mergeProgress(
  server: SimulationProgressSnapshot | null,
  local: SimulationProgressSnapshot | null
): SimulationProgressSnapshot | null {
  if (!local) return server;
  if (!server) return local;

  if (local.resetToken !== server.resetToken) return server;

  if (local.rev !== server.rev) {
    return local.rev > server.rev ? local : server;
  }

  return local.updatedAt > server.updatedAt ? local : server;
}

/** Next revision to write, so a resumed attempt never reuses a number already stored. */
export function nextRev(...snapshots: ReadonlyArray<SimulationProgressSnapshot | null>): number {
  const revs = snapshots.filter((snapshot) => snapshot !== null).map((snapshot) => snapshot.rev);
  return revs.length > 0 ? Math.max(...revs) + 1 : 1;
}
