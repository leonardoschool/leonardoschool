/**
 * Logit helpers and confidence intervals shared by the difficulty calibration.
 *
 * Pure and dependency-free: the project forbids adding npm packages, and keeping
 * these out of any Prisma/pdfjs import path is what makes them unit-testable.
 */

/** Natural logit. Callers must clamp `p` away from 0 and 1 first. */
export function logit(p: number): number {
  return Math.log(p / (1 - p));
}

export function invLogit(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Pulls a proportion away from 0 and 1 by half an observation, so a question
 * answered correctly by everyone (or by nobody) yields a finite logit instead of
 * ±Infinity. Standard practice in Rasch estimation; the pull shrinks as the
 * sample grows, so it never distorts a well-observed item.
 */
export function clampProportion(p: number, total: number): number {
  if (total <= 0) return 0.5;
  const margin = 1 / (2 * total);
  return Math.min(1 - margin, Math.max(margin, p));
}

/**
 * Standard normal CDF, via the Abramowitz & Stegun 7.1.26 error-function
 * approximation (absolute error < 1.5e-7). Used to turn "how far past the cut, in
 * standard errors" into a plain probability the UI can show as a percentage.
 */
export function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
}

/**
 * Wilson score interval for a proportion. Preferred over the normal
 * approximation because it stays inside [0, 1] and behaves sanely on the small
 * samples this system spends most of its time looking at.
 */
export function wilsonInterval(
  successes: number,
  total: number,
  z = 1.96
): ConfidenceInterval {
  if (total <= 0) return { lower: 0, upper: 1 };
  const p = successes / total;
  const z2 = z * z;
  const denominator = 1 + z2 / total;
  const centre = p + z2 / (2 * total);
  const spread = z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total));
  return {
    lower: Math.max(0, (centre - spread) / denominator),
    upper: Math.min(1, (centre + spread) / denominator),
  };
}

/**
 * Standard error of a Rasch difficulty, from the Fisher information of the
 * people who actually answered it: `1 / sqrt(Σ P(1−P))`.
 *
 * Computing it from the real response pattern rather than from a `k/√n` rule of
 * thumb matters here, because information collapses when an item is answered
 * only by people far from its difficulty — exactly the case where a naive
 * formula would claim precision the data doesn't have.
 *
 * `designEffect` inflates the result to acknowledge that local independence is
 * violated in these papers (shared reading passages, shared figures): the
 * nominal interval is optimistic, so we widen it deliberately.
 */
export function standardErrorOfDifficulty(
  abilities: readonly number[],
  difficulty: number,
  designEffect = 1
): number {
  let information = 0;
  for (const ability of abilities) {
    const p = invLogit(ability - difficulty);
    information += p * (1 - p);
  }
  if (information <= 0) return Infinity;
  return (designEffect * 1) / Math.sqrt(information);
}

/**
 * Fallback standard error when per-person abilities aren't available (tests,
 * back-of-envelope sizing). Assumes a moderately informative sample.
 */
export function approximateStandardErrorOfDifficulty(
  sampleSize: number,
  designEffect = 1
): number {
  if (sampleSize <= 0) return Infinity;
  return (designEffect * 2.4) / Math.sqrt(sampleSize);
}
