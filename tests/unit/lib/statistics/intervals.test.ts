import { describe, it, expect } from 'vitest';
import {
  approximateStandardErrorOfDifficulty,
  clampProportion,
  invLogit,
  logit,
  standardErrorOfDifficulty,
  wilsonInterval,
} from '@/lib/statistics/intervals';

describe('logit / invLogit', () => {
  it('round-trips', () => {
    for (const p of [0.05, 0.25, 0.5, 0.75, 0.95]) {
      expect(invLogit(logit(p))).toBeCloseTo(p, 10);
    }
  });
});

describe('clampProportion', () => {
  it('keeps 0 and 1 finite on the logit scale', () => {
    expect(Number.isFinite(logit(clampProportion(0, 40)))).toBe(true);
    expect(Number.isFinite(logit(clampProportion(1, 40)))).toBe(true);
  });

  it('pulls in less as the sample grows', () => {
    const small = clampProportion(1, 10);
    const large = clampProportion(1, 1000);
    expect(large).toBeGreaterThan(small);
  });

  it('leaves an interior proportion untouched', () => {
    expect(clampProportion(0.4, 100)).toBe(0.4);
  });

  it('falls back to a coin flip with no observations', () => {
    expect(clampProportion(0.4, 0)).toBe(0.5);
  });
});

describe('wilsonInterval', () => {
  it('brackets the observed proportion', () => {
    const { lower, upper } = wilsonInterval(30, 100);
    expect(lower).toBeLessThan(0.3);
    expect(upper).toBeGreaterThan(0.3);
  });

  it('narrows as the sample grows', () => {
    const small = wilsonInterval(3, 10);
    const large = wilsonInterval(300, 1000);
    expect(upperMinusLower(large)).toBeLessThan(upperMinusLower(small));
  });

  it('stays inside [0, 1] at the extremes', () => {
    const none = wilsonInterval(0, 12);
    const all = wilsonInterval(12, 12);
    // At p = 0 and p = 1 the bound is exactly 0 / 1 analytically (numerator and
    // denominator coincide), so only floating point separates them from the edge.
    expect(none.lower).toBeCloseTo(0, 12);
    expect(all.upper).toBeCloseTo(1, 12);
    // The other end still admits genuine uncertainty — 12 out of 12 is not proof.
    expect(none.upper).toBeLessThan(1);
    expect(none.upper).toBeGreaterThan(0.1);
    expect(all.lower).toBeGreaterThan(0);
    expect(all.lower).toBeLessThan(0.9);
  });

  it('claims nothing without observations', () => {
    expect(wilsonInterval(0, 0)).toEqual({ lower: 0, upper: 1 });
  });
});

function upperMinusLower({ lower, upper }: { lower: number; upper: number }): number {
  return upper - lower;
}

describe('standardErrorOfDifficulty', () => {
  it('shrinks as more people answer', () => {
    const few = standardErrorOfDifficulty(new Array(20).fill(0), 0);
    const many = standardErrorOfDifficulty(new Array(200).fill(0), 0);
    expect(many).toBeLessThan(few);
  });

  /**
   * The reason it is computed from the response pattern and not from k/√n: a
   * sample far from the item's difficulty carries almost no information, however
   * many people it contains.
   */
  it('is much larger when everyone is far from the item difficulty', () => {
    const onTarget = standardErrorOfDifficulty(new Array(100).fill(0), 0);
    const mismatched = standardErrorOfDifficulty(new Array(100).fill(-5), 0);
    expect(mismatched).toBeGreaterThan(onTarget * 3);
  });

  it('is infinite with nobody answering', () => {
    expect(standardErrorOfDifficulty([], 0)).toBe(Infinity);
  });

  it('widens by the design effect', () => {
    const plain = standardErrorOfDifficulty(new Array(50).fill(0), 0);
    const widened = standardErrorOfDifficulty(new Array(50).fill(0), 0, 1.2);
    expect(widened).toBeCloseTo(plain * 1.2, 10);
  });
});

describe('approximateStandardErrorOfDifficulty', () => {
  it('follows the inverse square root of the sample', () => {
    const at40 = approximateStandardErrorOfDifficulty(40);
    const at160 = approximateStandardErrorOfDifficulty(160);
    expect(at40 / at160).toBeCloseTo(2, 5);
  });

  it('is infinite with no sample', () => {
    expect(approximateStandardErrorOfDifficulty(0)).toBe(Infinity);
  });
});
