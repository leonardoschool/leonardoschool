/**
 * The anchored measuring stick.
 *
 * A Rasch difficulty is only identified up to an additive constant: the estimator
 * re-centres the bank on zero every run, so a cohort that simply performs better
 * shifts the whole scale and, with it, every label. That is precisely the drift this
 * feature was asked not to have.
 *
 * The fix is to stop letting the scale float. Once per subject we freeze a set of
 * well-measured questions together with the difficulty they had at that moment. Every
 * later run measures those same questions again and slides its whole scale until they
 * line up with their frozen values (mean-mean equating). The zero point is then a
 * property of those questions, not of whoever happened to sit the test this month.
 *
 * Everything here is pure: the service does the reading and writing.
 */

import { findOptimalCuts, type LabelledScore } from '@/lib/statistics/agreement';
import { CALIBRATION } from './questionCalibration.helpers';
import type { DifficultyLevel } from '@prisma/client';

/** One frozen anchor: a question and the difficulty it had when the scale was fixed. */
export interface AnchorPoint {
  id: string;
  b: number;
}

export interface ScaleCuts {
  easyMedium: number;
  mediumHard: number;
}

export const DEFAULT_CUTS: ScaleCuts = {
  easyMedium: CALIBRATION.defaultCutEasyMedium,
  mediumHard: CALIBRATION.defaultCutMediumHard,
};

/** A question measured in the current run, as the scale code needs to see it. */
export interface MeasuredItem {
  id: string;
  subjectId: string | null;
  /** Raw Rasch difficulty, on this run's floating scale. */
  score: number;
  sampleSize: number;
  connected: boolean;
  /** Human label, only when it is a real decision rather than the column default. */
  humanLabel: DifficultyLevel | null;
}

const LEVEL_INDEX: Record<DifficultyLevel, number> = { EASY: 0, MEDIUM: 1, HARD: 2 };
const INDEX_LEVEL: DifficultyLevel[] = ['EASY', 'MEDIUM', 'HARD'];

/** Reads back what was stored in `DifficultyScale.anchorQuestionIds`. */
export function parseAnchors(value: unknown): AnchorPoint[] {
  if (!Array.isArray(value)) return [];
  const anchors: AnchorPoint[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const id = (entry as { id?: unknown }).id;
    const b = (entry as { b?: unknown }).b;
    if (typeof id === 'string' && typeof b === 'number' && Number.isFinite(b)) {
      anchors.push({ id, b });
    }
  }
  return anchors;
}

/**
 * Picks the anchor set: the best-measured questions of the subject.
 *
 * Sample size is the only criterion on purpose. An anchor's job is to be measured
 * precisely; choosing by difficulty (say, a spread across the range) would bake this
 * run's estimate of that spread into the definition of the scale.
 *
 * The floor on each anchor's own sample matters as much as the count. A subject with
 * fifty questions answered twice each has fifty candidates and no information: freeze
 * on those and the permanent reference for that subject is noise — the exact drift
 * the anchoring exists to prevent, made permanent instead of transient.
 */
export function selectAnchors(items: readonly MeasuredItem[], limit: number): AnchorPoint[] {
  return items
    .filter(
      (item) =>
        item.connected &&
        Number.isFinite(item.score) &&
        item.sampleSize >= CALIBRATION.minSampleForScore
    )
    .slice()
    .sort((a, b) => b.sampleSize - a.sampleSize || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((item) => ({ id: item.id, b: item.score }));
}

export interface EquatingResult {
  /** Add this to every raw score of the subject to land on the anchored scale. */
  shift: number;
  /** Root-mean-square residual on the anchors after shifting. */
  rmsd: number;
  /** How many anchors were re-measured this run. */
  matched: number;
}

/**
 * Mean-mean equating: one number, the difference between where the anchors sit now
 * and where they were frozen.
 *
 * A single shift is the whole point — anything richer (per-item corrections, a slope)
 * would let the scale absorb the very movement it exists to detect. When the anchors
 * genuinely disagree with each other, `rmsd` grows and the scale asks for a human
 * instead of quietly stretching.
 */
export function equateToAnchors(
  anchors: readonly AnchorPoint[],
  currentScores: ReadonlyMap<string, number>
): EquatingResult | null {
  const pairs: { frozen: number; current: number }[] = [];
  for (const anchor of anchors) {
    const current = currentScores.get(anchor.id);
    if (current === undefined || !Number.isFinite(current)) continue;
    pairs.push({ frozen: anchor.b, current });
  }
  if (pairs.length < CALIBRATION.anchorsMinimum) return null;

  let sumFrozen = 0;
  let sumCurrent = 0;
  for (const pair of pairs) {
    sumFrozen += pair.frozen;
    sumCurrent += pair.current;
  }
  const shift = sumFrozen / pairs.length - sumCurrent / pairs.length;

  let squaredResidual = 0;
  for (const pair of pairs) {
    const residual = pair.current + shift - pair.frozen;
    squaredResidual += residual * residual;
  }

  return {
    shift,
    rmsd: Math.sqrt(squaredResidual / pairs.length),
    matched: pairs.length,
  };
}

export interface CutFit {
  cuts: ScaleCuts;
  kappa: number;
  sampleSize: number;
}

/**
 * Fits the two cut points against the labels the teachers actually chose.
 *
 * The caller must have already stripped the untouched `@default(MEDIUM)` rows: a bank
 * of defaults looks like a confident human vote for "media", and fitting on it yields
 * cuts that are plausible, wrong, and silent.
 */
export function fitCutsFromLabels(
  items: readonly MeasuredItem[],
  shift: number
): CutFit | null {
  const samples: LabelledScore[] = [];
  for (const item of items) {
    if (!item.humanLabel || !item.connected || !Number.isFinite(item.score)) continue;
    if (item.sampleSize < CALIBRATION.minSampleForScore) continue;
    samples.push({ score: item.score + shift, label: LEVEL_INDEX[item.humanLabel] });
  }

  const fit = findOptimalCuts(samples, {
    minSamples: CALIBRATION.minGoldSetForCuts,
    minBandWidth: CALIBRATION.minBandWidth,
  });
  if (!fit) return null;

  return {
    cuts: { easyMedium: fit.lowerCut, mediumHard: fit.upperCut },
    kappa: fit.kappa,
    sampleSize: fit.sampleSize,
  };
}

/**
 * How much the scale can be trusted, in the three words the UI shows.
 *
 * LOW is not a failure state: it is the honest answer while a subject is still
 * accumulating data, and it is what a reviewer needs to see before treating a
 * proposal as authoritative.
 */
export function scaleConfidence(anchorCount: number, fitSampleSize: number): string {
  if (anchorCount >= CALIBRATION.anchorsPerSubject && fitSampleSize >= 150) return 'HIGH';
  if (anchorCount >= CALIBRATION.anchorsMinimum && fitSampleSize >= CALIBRATION.minGoldSetForCuts) {
    return 'MEDIUM';
  }
  return 'LOW';
}

export interface ScaleRefit {
  cuts: ScaleCuts;
  kappa: number;
  sampleSize: number;
  confidence: string;
}

/**
 * Replaces the fallback cuts a subject was bootstrapped on — once, and only from LOW.
 *
 * Freezing is what makes "media" mean the same thing in June as it did in January, and
 * that has to keep being true: a scale fitted on real labels is never re-fitted here.
 *
 * But a subject whose first proposal run happened before it had `minGoldSetForCuts`
 * labelled questions was frozen on `DEFAULT_CUTS` — generic numbers, never measured
 * against this bank — and froze them permanently, because nothing else in the system
 * ever writes cuts again. Every question in that subject is then judged against a stick
 * nobody calibrated, which is precisely how an entire batch ends up leaning one way and
 * tripping the run-level guard. A placeholder is not a scale, so it may be replaced the
 * first time the subject can support a real fit.
 *
 * The anchors are deliberately left alone: this moves where the boundaries sit, not
 * where the zero point is, so past measurements stay comparable.
 */
export function refitPlaceholderCuts(
  currentConfidence: string,
  anchorCount: number,
  items: readonly MeasuredItem[],
  shift: number
): ScaleRefit | null {
  if (currentConfidence !== 'LOW') return null;

  const fit = fitCutsFromLabels(items, shift);
  if (!fit) return null;

  // Only a fit that clears the placeholder's own confidence is an improvement; swapping
  // one under-evidenced set of cuts for another would just move the labels for nothing.
  const confidence = scaleConfidence(anchorCount, fit.sampleSize);
  if (confidence === 'LOW') return null;

  return { cuts: fit.cuts, kappa: fit.kappa, sampleSize: fit.sampleSize, confidence };
}

/** Maps a 0/1/2 category index back to the enum, for tests and diagnostics. */
export function levelFromIndex(index: number): DifficultyLevel {
  return INDEX_LEVEL[Math.max(0, Math.min(2, index))];
}
