import { describe, it, expect } from 'vitest';
import {
  classify,
  findOptimalCuts,
  quadraticWeightedKappa,
  type LabelledScore,
} from '@/lib/statistics/agreement';

describe('quadraticWeightedKappa', () => {
  it('is 1 for perfect agreement', () => {
    const labels = [0, 1, 2, 0, 1, 2, 1, 1, 0, 2];
    expect(quadraticWeightedKappa(labels, labels, 3)).toBeCloseTo(1, 10);
  });

  it('punishes a far disagreement more than a near one', () => {
    const truth = [0, 0, 0, 0, 1, 1, 2, 2, 2, 2];
    const nearMiss = [0, 0, 0, 1, 1, 1, 2, 2, 2, 1]; // off by one
    const farMiss = [0, 0, 0, 2, 1, 1, 2, 2, 2, 0]; // off by two
    expect(quadraticWeightedKappa(truth, nearMiss, 3)).toBeGreaterThan(
      quadraticWeightedKappa(truth, farMiss, 3)
    );
  });

  it('is around zero when one rater is unrelated noise', () => {
    // Seeded LCG rather than an arithmetic pattern: `(i * 7) % 3` equals `i % 3`,
    // which looks shuffled and is in fact the identity.
    let state = 20260730;
    const nextLabel = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state % 3;
    };
    const truth = Array.from({ length: 300 }, (_, i) => i % 3);
    const noise = Array.from({ length: 300 }, nextLabel);
    expect(Math.abs(quadraticWeightedKappa(truth, noise, 3))).toBeLessThan(0.15);
  });

  it('rejects mismatched series instead of silently truncating', () => {
    expect(() => quadraticWeightedKappa([0, 1], [0], 3)).toThrow();
  });
});

describe('classify', () => {
  it('maps a hardness onto the three levels', () => {
    expect(classify(-2, -0.65, 0.65)).toBe(0);
    expect(classify(0, -0.65, 0.65)).toBe(1);
    expect(classify(2, -0.65, 0.65)).toBe(2);
  });
});

describe('findOptimalCuts', () => {
  /** Labels generated from known cuts, so the search has a right answer to find. */
  function syntheticGoldSet(lowerCut: number, upperCut: number, count = 300): LabelledScore[] {
    return Array.from({ length: count }, (_, i) => {
      const score = -3 + (6 * i) / (count - 1);
      return { score, label: classify(score, lowerCut, upperCut) };
    });
  }

  it('recovers the cuts the labels were generated from', () => {
    const result = findOptimalCuts(syntheticGoldSet(-0.8, 0.7));
    expect(result).not.toBeNull();
    expect(result!.lowerCut).toBeCloseTo(-0.8, 1);
    expect(result!.upperCut).toBeCloseTo(0.7, 1);
    expect(result!.kappa).toBeGreaterThan(0.95);
  });

  it('returns null below the minimum labelled sample', () => {
    expect(findOptimalCuts(syntheticGoldSet(-0.8, 0.7, 20))).toBeNull();
  });

  /**
   * The dangerous input: `Question.difficulty` defaults to MEDIUM, so a bank of
   * untouched defaults looks like a confident human vote for "media". The band
   * width floor is what stops the fit from collapsing the two cuts together and
   * wiping out a whole level.
   */
  it('keeps the two cuts apart on a degenerate all-medium gold set', () => {
    const allMedium: LabelledScore[] = Array.from({ length: 200 }, (_, i) => ({
      score: -3 + (6 * i) / 199,
      label: 1,
    }));
    const result = findOptimalCuts(allMedium, { minBandWidth: 0.8 });
    expect(result).not.toBeNull();
    expect(result!.upperCut - result!.lowerCut).toBeGreaterThanOrEqual(0.8);
  });

  it('reports a poor kappa when the labels carry no signal', () => {
    const noise: LabelledScore[] = Array.from({ length: 200 }, (_, i) => ({
      score: -3 + (6 * i) / 199,
      label: (i * 7) % 3,
    }));
    const result = findOptimalCuts(noise);
    expect(result!.kappa).toBeLessThan(0.3);
  });
});
