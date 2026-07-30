import { describe, it, expect } from 'vitest';
import { estimateRasch, type RaschResponses } from '@/lib/statistics/rasch';
import { invLogit, logit } from '@/lib/statistics/intervals';

/** Deterministic LCG: seeded so a recovery test can assert numeric tolerances. */
function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** Abilities spread evenly over ±2.5 logits — no randomness, so runs are stable. */
function spreadAbilities(count: number): number[] {
  return Array.from({ length: count }, (_, i) => -2.5 + (5 * i) / (count - 1));
}

interface Scene {
  responses: RaschResponses;
  trueDifficulty: number[];
}

/** Everyone answers every item, drawing each response from the Rasch model. */
function fullDesign(abilities: number[], difficulties: number[], seed: number): Scene {
  const rng = makeRng(seed);
  const personIndex: number[] = [];
  const itemIndex: number[] = [];
  const correct: number[] = [];
  for (let s = 0; s < abilities.length; s++) {
    for (let i = 0; i < difficulties.length; i++) {
      personIndex.push(s);
      itemIndex.push(i);
      correct.push(rng() < invLogit(abilities[s] - difficulties[i]) ? 1 : 0);
    }
  }
  return {
    responses: {
      personCount: abilities.length,
      itemCount: difficulties.length,
      personIndex,
      itemIndex,
      correct,
    },
    trueDifficulty: difficulties,
  };
}

function pearson(a: readonly number[], b: readonly number[]): number {
  const n = a.length;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    cov += (a[i] - meanA) * (b[i] - meanB);
    varA += (a[i] - meanA) ** 2;
    varB += (b[i] - meanB) ** 2;
  }
  return cov / Math.sqrt(varA * varB);
}

describe('estimateRasch', () => {
  it('recovers known difficulties from a synthetic bank', () => {
    const difficulties = Array.from({ length: 30 }, (_, i) => -2 + (4 * i) / 29);
    const { responses } = fullDesign(spreadAbilities(500), difficulties, 12345);

    const estimate = estimateRasch(responses);
    const recovered = [...estimate.itemDifficulty];

    expect(pearson(recovered, difficulties)).toBeGreaterThan(0.95);
    expect(estimate.converged).toBe(true);
    expect(recovered.every(Number.isFinite)).toBe(true);
  });

  it('centres the scale on zero so the free constant is fixed', () => {
    const difficulties = [1, 2, 3, 4, 5]; // deliberately off-centre
    const { responses } = fullDesign(spreadAbilities(300), difficulties, 777);

    const mean =
      [...estimateRasch(responses).itemDifficulty].reduce((s, v) => s + v, 0) / 5;
    expect(Math.abs(mean)).toBeLessThan(1e-6);
  });

  /**
   * The reason this estimator exists. An average question that only ever appeared
   * in a test sat by the weakest students must NOT come out as hard.
   */
  it('is not fooled by a question answered only by the weakest students', () => {
    const abilities = spreadAbilities(800);
    const sharedDifficulties = Array.from({ length: 20 }, (_, i) => -2 + (4 * i) / 19);
    const biasedItem = 20;
    const trueBiasedDifficulty = 0; // perfectly average

    const scene = fullDesign(abilities, [...sharedDifficulties, trueBiasedDifficulty], 4242);
    // Strip the biased item's responses down to the bottom quartile of ability.
    const weakestCutoff = Math.floor(abilities.length / 4);
    const personIndex: number[] = [];
    const itemIndex: number[] = [];
    const correct: number[] = [];
    for (let k = 0; k < scene.responses.correct.length; k++) {
      const person = (scene.responses.personIndex as number[])[k];
      const item = (scene.responses.itemIndex as number[])[k];
      if (item === biasedItem && person >= weakestCutoff) continue;
      personIndex.push(person);
      itemIndex.push(item);
      correct.push((scene.responses.correct as number[])[k]);
    }

    const estimate = estimateRasch({
      personCount: abilities.length,
      itemCount: sharedDifficulties.length + 1,
      personIndex,
      itemIndex,
      correct,
    });

    const raschError = Math.abs(estimate.itemDifficulty[biasedItem] - trueBiasedDifficulty);

    // What a raw correct rate would have concluded from the very same responses.
    const observed = estimate.itemCorrect[biasedItem] / estimate.itemResponses[biasedItem];
    const rawError = Math.abs(logit(1 - observed) - trueBiasedDifficulty);

    // Stated against the item's own standard error rather than a hand-picked
    // number: a restricted sample is genuinely less precise, and the claim here is
    // that the estimate is unbiased, not that it is magically sharp.
    expect(raschError).toBeLessThan(2 * estimate.itemStandardError[biasedItem]);
    expect(rawError).toBeGreaterThan(1.5);
    expect(raschError).toBeLessThan(rawError / 4);
  });

  it('keeps every estimate finite when an item is answered by everyone correctly', () => {
    const responses: RaschResponses = {
      personCount: 40,
      itemCount: 2,
      personIndex: Array.from({ length: 80 }, (_, k) => k % 40),
      itemIndex: Array.from({ length: 80 }, (_, k) => (k < 40 ? 0 : 1)),
      // Item 0 always right, item 1 alternating.
      correct: Array.from({ length: 80 }, (_, k) => (k < 40 ? 1 : k % 2)),
    };

    const estimate = estimateRasch(responses);
    expect([...estimate.itemDifficulty].every(Number.isFinite)).toBe(true);
    expect(estimate.itemDifficulty[0]).toBeLessThan(estimate.itemDifficulty[1]);
  });

  it('flags items whose respondents never overlap the rest of the data', () => {
    // Group A: persons 0-9 on items 0-2. Group B: persons 10-19 on item 3 only.
    const personIndex: number[] = [];
    const itemIndex: number[] = [];
    const correct: number[] = [];
    for (let s = 0; s < 10; s++) {
      for (let i = 0; i < 3; i++) {
        personIndex.push(s);
        itemIndex.push(i);
        correct.push((s + i) % 2);
      }
    }
    for (let s = 10; s < 20; s++) {
      personIndex.push(s);
      itemIndex.push(3);
      correct.push(s % 2);
    }

    const estimate = estimateRasch({
      personCount: 20,
      itemCount: 4,
      personIndex,
      itemIndex,
      correct,
    });

    expect(estimate.itemConnected.slice(0, 3)).toEqual([true, true, true]);
    expect(estimate.itemConnected[3]).toBe(false);
  });

  it('reports an infinite standard error for an item nobody answered', () => {
    const estimate = estimateRasch({
      personCount: 2,
      itemCount: 2,
      personIndex: [0, 1],
      itemIndex: [0, 0],
      correct: [1, 0],
    });
    expect(estimate.itemResponses[1]).toBe(0);
    expect(estimate.itemStandardError[1]).toBe(Infinity);
  });
});
