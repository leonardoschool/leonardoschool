import { describe, it, expect } from 'vitest';
import {
  keyCheck,
  pointBiserialRestScore,
  type DiscriminationResponse,
} from '@/lib/statistics/discrimination';

/**
 * Builds responses where the chance of getting the item right rises with the
 * attempt score — i.e. a well-behaved item — or falls, i.e. a broken one.
 */
function scene(count: number, direction: 'good' | 'reversed' | 'flat'): DiscriminationResponse[] {
  return Array.from({ length: count }, (_, i) => {
    const attemptScore = i; // ability proxy, evenly spread
    const strong = i >= count / 2;
    const correct =
      direction === 'good' ? strong : direction === 'reversed' ? !strong : i % 2 === 0;
    return { correct, attemptScore, itemScore: correct ? 1 : 0 };
  });
}

describe('pointBiserialRestScore', () => {
  it('is strongly positive for an item the better students get right', () => {
    const r = pointBiserialRestScore(scene(60, 'good'));
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThan(0.7);
  });

  it('is negative when the stronger students get it wrong', () => {
    const r = pointBiserialRestScore(scene(60, 'reversed'));
    expect(r!).toBeLessThan(0);
  });

  it('refuses to conclude anything below the minimum sample', () => {
    expect(pointBiserialRestScore(scene(20, 'good'))).toBeNull();
    expect(pointBiserialRestScore(scene(20, 'good'), 10)).not.toBeNull();
  });

  it('refuses to conclude anything when everybody answered the same way', () => {
    const allRight = Array.from({ length: 40 }, (_, i) => ({
      correct: true,
      attemptScore: i,
      itemScore: 1,
    }));
    expect(pointBiserialRestScore(allRight)).toBeNull();
  });

  /**
   * A genuinely hard item is not a broken one: few get it right, but those who do
   * are the strongest. It must keep a healthy discrimination so the calibration is
   * still allowed to relabel it.
   */
  it('stays healthy for a hard but sound item', () => {
    // Only the top 15% get it right.
    const responses: DiscriminationResponse[] = Array.from({ length: 100 }, (_, i) => {
      const correct = i >= 85;
      return { correct, attemptScore: i, itemScore: correct ? 1 : 0 };
    });
    const r = pointBiserialRestScore(responses);
    expect(r!).toBeGreaterThan(0.3);
  });
});

describe('keyCheck', () => {
  it('spots an answer key sitting on the wrong option and names the right one', () => {
    const result = keyCheck([
      // The key is picked by the weakest students…
      { optionId: 'a', isKey: true, restScores: [1, 2, 3, 2, 1, 2, 3, 1, 2, 1] },
      // …while a distractor is picked by the strongest.
      { optionId: 'b', isKey: false, restScores: [18, 19, 20, 19, 18, 20, 19, 18, 20, 19] },
      { optionId: 'c', isKey: false, restScores: [9, 10, 11, 10, 9, 10, 11, 9, 10, 11] },
    ]);

    expect(result.suspect).toBe(true);
    expect(result.strongestOptionId).toBe('b');
    expect(result.marginInSd!).toBeGreaterThan(0.5);
  });

  it('stays quiet when the key is the option the strongest students pick', () => {
    const result = keyCheck([
      { optionId: 'a', isKey: true, restScores: [18, 19, 20, 19, 18, 20, 19, 18, 20, 19] },
      { optionId: 'b', isKey: false, restScores: [1, 2, 3, 2, 1, 2, 3, 1, 2, 1] },
    ]);
    expect(result.suspect).toBe(false);
    expect(result.strongestOptionId).toBe('a');
  });

  it('ignores options with too few picks to mean anything', () => {
    const result = keyCheck([
      { optionId: 'a', isKey: true, restScores: [5, 6, 7, 6, 5, 6, 7, 5, 6, 5] },
      { optionId: 'b', isKey: false, restScores: [30, 31] }, // two picks: noise
    ]);
    expect(result.suspect).toBe(false);
    expect(result.strongestOptionId).toBeNull();
  });

  /**
   * The margin is an effect size, measured in the spread of the rest scores
   * themselves. Two options whose students overlap heavily are not evidence of a
   * misplaced key even when one mean edges ahead.
   */
  it('stays quiet when the two groups of students overlap heavily', () => {
    const result = keyCheck([
      { optionId: 'a', isKey: true, restScores: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17] },
      { optionId: 'b', isKey: false, restScores: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18] },
    ]);
    expect(result.strongestOptionId).toBe('b');
    expect(result.marginInSd!).toBeLessThan(0.5);
    expect(result.suspect).toBe(false);
  });
});
