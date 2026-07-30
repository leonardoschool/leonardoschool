/**
 * Per-question time accounting, shared by the web app and the Expo app.
 *
 * It lives here because both clients submit the same `timeSpent` field and the
 * difficulty calibration reads it as a single signal: a question left blank with no
 * time recorded is treated as one the student never reached. Two implementations of
 * this arithmetic would mean two different meanings for the same number, and the
 * statistics downstream have no way to tell them apart.
 *
 * The unit is the point. Rounding down to whole seconds at every navigation throws
 * the remainder away for good: ten separate half-second visits to the same question
 * are recorded as zero seconds instead of five, and a question answered quickly
 * becomes indistinguishable from one that was never opened. Accumulate in
 * milliseconds, floor once, on read.
 */

/** Adds one visit to the accumulator. */
export function accumulateQuestionMs(
  accumulated: Readonly<Record<string, number>>,
  questionId: string | null,
  elapsedMs: number
): Record<string, number> {
  // A clock that jumps backwards — sleep/wake, a manual time change — must never
  // subtract time the student has already earned.
  if (!questionId || !Number.isFinite(elapsedMs) || elapsedMs <= 0) return { ...accumulated };
  return { ...accumulated, [questionId]: (accumulated[questionId] ?? 0) + elapsedMs };
}

/** Reading side of the accumulator: whole seconds, floored once and only here. */
export function questionMsToSeconds(
  accumulated: Readonly<Record<string, number>>
): Record<string, number> {
  const seconds: Record<string, number> = {};
  for (const [questionId, ms] of Object.entries(accumulated)) {
    seconds[questionId] = Math.max(0, Math.floor(ms / 1000));
  }
  return seconds;
}

/** Seeds the accumulator from a restored attempt, which is stored in seconds. */
export function questionSecondsToMs(
  seconds: Readonly<Record<string, number>>
): Record<string, number> {
  const ms: Record<string, number> = {};
  for (const [questionId, value] of Object.entries(seconds)) {
    if (Number.isFinite(value) && value > 0) ms[questionId] = value * 1000;
  }
  return ms;
}
