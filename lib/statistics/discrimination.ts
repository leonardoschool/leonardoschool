/**
 * Item quality signals: telling a *hard* question apart from a *broken* one.
 *
 * A low correct rate has two very different causes. Either the question is
 * genuinely demanding — in which case the strongest students still do better on
 * it than the weakest — or something is wrong with it (answer key marked on the
 * wrong option, ambiguous wording), in which case knowing the subject stops
 * helping and can even hurt. The two look identical in the correct rate and
 * separate cleanly in the *discrimination*.
 *
 * These questions must never be relabelled: they must be sent to a human. And the
 * wording of that alert matters, because a low discrimination can also mean "this
 * item covers a topic unlike the rest of the subject" — worth a look, not proof
 * of a defect.
 */

export interface DiscriminationResponse {
  correct: boolean;
  /** Total score of the attempt this response belongs to. */
  attemptScore: number;
  /** What this item contributed to that total; removed to avoid self-correlation. */
  itemScore: number;
}

/**
 * Running sums for one item's point-biserial, so a whole bank can be measured in a
 * single streaming pass instead of first grouping hundreds of thousands of
 * responses by question.
 */
export interface PointBiserialAccumulator {
  count: number;
  sumFlag: number;
  sumRest: number;
  sumFlagRest: number;
  sumRestSquared: number;
}

export function createPointBiserialAccumulator(): PointBiserialAccumulator {
  return { count: 0, sumFlag: 0, sumRest: 0, sumFlagRest: 0, sumRestSquared: 0 };
}

export function accumulatePointBiserial(
  accumulator: PointBiserialAccumulator,
  correct: boolean,
  restScore: number
): void {
  const flag = correct ? 1 : 0;
  accumulator.count += 1;
  accumulator.sumFlag += flag;
  accumulator.sumRest += restScore;
  accumulator.sumFlagRest += flag * restScore;
  accumulator.sumRestSquared += restScore * restScore;
}

/**
 * Pearson correlation from the running sums. Returns null when there isn't enough
 * signal to conclude anything: too few responses, everyone right, everyone wrong,
 * or no spread in the rest scores. Refusing to answer is the correct output here,
 * not zero — zero would read as "no relationship measured", which is a claim.
 */
export function finalizePointBiserial(
  accumulator: PointBiserialAccumulator,
  minSample = 30
): number | null {
  const { count, sumFlag, sumRest, sumFlagRest, sumRestSquared } = accumulator;
  if (count < minSample) return null;
  if (sumFlag === 0 || sumFlag === count) return null;

  const covariance = sumFlagRest - (sumFlag * sumRest) / count;
  // Var of a 0/1 indicator, written from its sums.
  const varianceFlag = sumFlag - (sumFlag * sumFlag) / count;
  const varianceRest = sumRestSquared - (sumRest * sumRest) / count;
  if (varianceFlag <= 0 || varianceRest <= 0) return null;

  return covariance / Math.sqrt(varianceFlag * varianceRest);
}

/**
 * Point-biserial correlation between getting the item right and the *rest* of the
 * attempt score. Subtracting the item's own contribution is what makes it a
 * measure of agreement with the test rather than partly with itself — without it
 * every item looks positively discriminating.
 *
 * Convenience wrapper over the streaming form above, sharing the same arithmetic.
 */
export function pointBiserialRestScore(
  responses: readonly DiscriminationResponse[],
  minSample = 30
): number | null {
  const accumulator = createPointBiserialAccumulator();
  for (const response of responses) {
    accumulatePointBiserial(accumulator, response.correct, response.attemptScore - response.itemScore);
  }
  return finalizePointBiserial(accumulator, minSample);
}

export interface OptionPicks {
  optionId: string;
  /** Whether this option is the one currently marked correct. */
  isKey: boolean;
  /** Rest scores of the students who picked it. */
  restScores: readonly number[];
}

export interface KeyCheckResult {
  /** True when a distractor outperforms the key by a wide enough margin. */
  suspect: boolean;
  /** Option picked by the strongest students, when measurable. */
  strongestOptionId: string | null;
  keyMeanRest: number | null;
  strongestMeanRest: number | null;
  /** How many standard deviations the strongest option beats the key by. */
  marginInSd: number | null;
}

/**
 * Compares the average ability of the students choosing each option. If a
 * distractor is systematically chosen by the *better* students, the key is
 * probably on the wrong option — and the result names the option that looks
 * right, which is what makes the alert actionable.
 *
 * Deliberately usable with far less data than the point-biserial: it needs a
 * handful of picks per option, not a whole cohort, so it is the signal that still
 * works while the bank is young.
 */
export function keyCheck(
  options: readonly OptionPicks[],
  minPicksPerOption = 8,
  marginInSdThreshold = 0.5
): KeyCheckResult {
  const empty: KeyCheckResult = {
    suspect: false,
    strongestOptionId: null,
    keyMeanRest: null,
    strongestMeanRest: null,
    marginInSd: null,
  };

  const usable = options.filter((o) => o.restScores.length >= minPicksPerOption);
  const key = usable.find((o) => o.isKey);
  if (!key || usable.length < 2) return empty;

  const mean = (values: readonly number[]) =>
    values.reduce((sum, v) => sum + v, 0) / values.length;

  const strongest = usable.reduce((best, option) =>
    mean(option.restScores) > mean(best.restScores) ? option : best
  );
  const keyMeanRest = mean(key.restScores);
  const strongestMeanRest = mean(strongest.restScores);

  // Pooled spread across every usable option, so the margin is expressed in the
  // natural units of this question rather than in raw points.
  const allScores = usable.flatMap((o) => [...o.restScores]);
  const overallMean = mean(allScores);
  const variance =
    allScores.reduce((sum, v) => sum + (v - overallMean) ** 2, 0) / allScores.length;
  const sd = Math.sqrt(variance);

  if (sd <= 0) return { ...empty, keyMeanRest, strongestMeanRest };

  const marginInSd = (strongestMeanRest - keyMeanRest) / sd;
  return {
    suspect: !strongest.isKey && marginInSd >= marginInSdThreshold,
    strongestOptionId: strongest.optionId,
    keyMeanRest,
    strongestMeanRest,
    marginInSd,
  };
}
