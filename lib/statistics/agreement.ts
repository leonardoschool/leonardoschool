/**
 * Agreement with human labels, and the cut points derived from it.
 *
 * The two thresholds that split the continuous difficulty scale into
 * facile/media/difficile are not picked by hand: they are chosen so the automatic
 * classification agrees as closely as possible with the labels the teachers have
 * already assigned. The system therefore *starts* aligned with their judgement
 * instead of overturning it, and any later disagreement is a real measurement,
 * not an artefact of an arbitrary threshold.
 *
 * Quadratic-weighted kappa is the right agreement measure for ordered labels: it
 * penalises facile↔difficile far more than facile↔media, which is exactly how a
 * human reads the severity of a mistake.
 */

/**
 * Quadratic-weighted kappa between two sets of ordinal labels (0-based category
 * indices). Returns 1 for perfect agreement, 0 for chance-level, negative for
 * systematically worse than chance.
 */
export function quadraticWeightedKappa(
  a: readonly number[],
  b: readonly number[],
  categories: number
): number {
  if (a.length !== b.length) {
    throw new Error('quadraticWeightedKappa: le due serie devono avere la stessa lunghezza');
  }
  const n = a.length;
  if (n === 0 || categories < 2) return 0;

  const observed = Array.from({ length: categories }, () => new Array(categories).fill(0));
  const marginalA = new Array(categories).fill(0);
  const marginalB = new Array(categories).fill(0);
  for (let k = 0; k < n; k++) {
    observed[a[k]][b[k]] += 1;
    marginalA[a[k]] += 1;
    marginalB[b[k]] += 1;
  }

  const maxDistance = (categories - 1) ** 2;
  let weightedObserved = 0;
  let weightedExpected = 0;
  for (let i = 0; i < categories; i++) {
    for (let j = 0; j < categories; j++) {
      const weight = (i - j) ** 2 / maxDistance;
      weightedObserved += weight * observed[i][j];
      weightedExpected += (weight * marginalA[i] * marginalB[j]) / n;
    }
  }

  // Both raters agreeing on a single category leaves nothing to explain.
  if (weightedExpected === 0) return weightedObserved === 0 ? 1 : 0;
  return 1 - weightedObserved / weightedExpected;
}

export interface LabelledScore {
  /** Continuous hardness, higher = harder. */
  score: number;
  /** Human label as a category index: 0 = facile, 1 = media, 2 = difficile. */
  label: number;
}

export interface OptimalCuts {
  lowerCut: number;
  upperCut: number;
  kappa: number;
  /** Number of samples the fit was based on. */
  sampleSize: number;
}

interface FindCutsOptions {
  /**
   * Minimum distance between the two cuts, so a degenerate gold set (e.g. every
   * question left at the default "media") can't collapse them onto each other and
   * wipe out an entire level.
   */
  minBandWidth?: number;
  /** Candidate cut values tried per side. */
  gridSize?: number;
  /** Minimum labelled samples before a fit is attempted at all. */
  minSamples?: number;
}

/**
 * Grid-searches the pair of cut points that maximises agreement with the human
 * labels.
 *
 * The caller is responsible for handing over a *clean* gold set. This is the
 * single most dangerous input in the whole calibration: `Question.difficulty`
 * defaults to `MEDIUM`, so a bank full of untouched defaults looks like a
 * confident human vote for "media". Fitting on it produces plausible, wrong cuts
 * and no error message. Only questions carrying evidence of a real decision
 * belong here.
 */
export function findOptimalCuts(
  samples: readonly LabelledScore[],
  options: FindCutsOptions = {}
): OptimalCuts | null {
  const minBandWidth = options.minBandWidth ?? 0.4;
  const gridSize = options.gridSize ?? 60;
  const minSamples = options.minSamples ?? 40;
  if (samples.length < minSamples) return null;

  const scores = samples.map((s) => s.score).sort((x, y) => x - y);
  const low = quantile(scores, 0.05);
  const high = quantile(scores, 0.95);
  // Written out rather than as `high > low`: a NaN slipping in must return null too,
  // and a plain comparison would quietly let it through.
  if (!Number.isFinite(high - low) || high <= low) return null;

  const candidates: number[] = [];
  for (let g = 0; g < gridSize; g++) {
    candidates.push(low + ((high - low) * g) / (gridSize - 1));
  }

  const humanLabels = samples.map((s) => s.label);
  let best: OptimalCuts | null = null;

  for (const lowerCut of candidates) {
    for (const upperCut of candidates) {
      if (upperCut - lowerCut < minBandWidth) continue;
      const predicted = samples.map((s) => classify(s.score, lowerCut, upperCut));
      const kappa = quadraticWeightedKappa(humanLabels, predicted, 3);
      if (!best || kappa > best.kappa) {
        best = { lowerCut, upperCut, kappa, sampleSize: samples.length };
      }
    }
  }

  return best;
}

/** Maps a continuous hardness onto 0 = facile, 1 = media, 2 = difficile. */
export function classify(score: number, lowerCut: number, upperCut: number): number {
  if (score < lowerCut) return 0;
  if (score > upperCut) return 2;
  return 1;
}

function quantile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const position = (sorted.length - 1) * fraction;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  if (lowerIndex === upperIndex) return sorted[lowerIndex];
  const weight = position - lowerIndex;
  return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;
}
