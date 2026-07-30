import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CUTS,
  equateToAnchors,
  fitCutsFromLabels,
  parseAnchors,
  scaleConfidence,
  selectAnchors,
  type MeasuredItem,
} from '@/server/services/difficultyScale.helpers';
import { estimateRasch, type RaschResponses } from '@/lib/statistics/rasch';
import { decideDifficulty } from '@/server/services/questionCalibration.helpers';
import { classify } from '@/lib/statistics/agreement';
import type { DifficultyLevel } from '@prisma/client';

/** Deterministic pseudo-randomness: a flaky psychometrics test is a useless one. */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/** Simulates a complete Rasch design: every person answers every item. */
function simulate(trueB: readonly number[], abilities: readonly number[], seed: number): RaschResponses {
  const rand = lcg(seed);
  const personIndex: number[] = [];
  const itemIndex: number[] = [];
  const correct: number[] = [];

  for (let p = 0; p < abilities.length; p++) {
    for (let i = 0; i < trueB.length; i++) {
      const probability = 1 / (1 + Math.exp(trueB[i] - abilities[p]));
      personIndex.push(p);
      itemIndex.push(i);
      correct.push(rand() < probability ? 1 : 0);
    }
  }

  return {
    personCount: abilities.length,
    itemCount: trueB.length,
    personIndex,
    itemIndex,
    correct,
  };
}

function item(over: Partial<MeasuredItem> = {}): MeasuredItem {
  return {
    id: 'q',
    subjectId: 's',
    score: 0,
    sampleSize: 100,
    connected: true,
    humanLabel: null,
    ...over,
  };
}

describe('parseAnchors', () => {
  it('reads back what was stored', () => {
    expect(parseAnchors([{ id: 'a', b: -1.2 }, { id: 'b', b: 0.4 }])).toEqual([
      { id: 'a', b: -1.2 },
      { id: 'b', b: 0.4 },
    ]);
  });

  /** The column is Json: anything can end up in it, and a crash here kills the job. */
  it('drops malformed entries instead of throwing', () => {
    expect(parseAnchors([{ id: 'a', b: 1 }, { id: 'b' }, null, 'x', { b: 2 }, { id: 'c', b: NaN }]))
      .toEqual([{ id: 'a', b: 1 }]);
    expect(parseAnchors(null)).toEqual([]);
    expect(parseAnchors({ id: 'a' })).toEqual([]);
  });
});

describe('selectAnchors', () => {
  it('takes the best-measured questions first', () => {
    const anchors = selectAnchors(
      [
        item({ id: 'thin', sampleSize: 25, score: 0.1 }),
        item({ id: 'fat', sampleSize: 400, score: -0.3 }),
        item({ id: 'medium', sampleSize: 90, score: 1.1 }),
      ],
      2
    );
    expect(anchors).toEqual([
      { id: 'fat', b: -0.3 },
      { id: 'medium', b: 1.1 },
    ]);
  });

  /** An item on its own scale would define a zero point nothing else shares. */
  it('never anchors on a disconnected item', () => {
    const anchors = selectAnchors(
      [item({ id: 'alone', sampleSize: 999, connected: false }), item({ id: 'ok', sampleSize: 60 })],
      5
    );
    expect(anchors.map((a) => a.id)).toEqual(['ok']);
  });

  /**
   * A young bank has plenty of candidates and no information. Anchoring on those
   * would freeze noise as the subject's permanent reference — worse than having no
   * scale at all, because the damage never expires.
   */
  it('refuses thinly measured questions however many there are', () => {
    const barelyAnswered = Array.from({ length: 80 }, (_, i) =>
      item({ id: `q${i}`, sampleSize: 2, score: i / 40 })
    );
    expect(selectAnchors(barelyAnswered, 50)).toEqual([]);
  });
});

describe('equateToAnchors', () => {
  const anchors = Array.from({ length: 25 }, (_, i) => ({ id: `q${i}`, b: (i - 12) / 6 }));

  it('recovers a known shift exactly', () => {
    const current = new Map(anchors.map((a) => [a.id, a.b - 0.8]));
    const result = equateToAnchors(anchors, current);
    expect(result?.shift).toBeCloseTo(0.8, 10);
    expect(result?.rmsd).toBeCloseTo(0, 10);
    expect(result?.matched).toBe(25);
  });

  /**
   * The residual is the alarm: when the anchors stop agreeing with each other the
   * scale itself has moved, and a single shift can no longer describe it.
   */
  it('reports a large residual when the anchors disagree among themselves', () => {
    const current = new Map(anchors.map((a, i) => [a.id, a.b + (i % 2 === 0 ? 1 : -1)]));
    const result = equateToAnchors(anchors, current);
    // The disagreement cancels out in the mean — which is exactly the failure mode:
    // the shift looks innocent while every anchor is a logit away from where it was.
    expect(Math.abs(result!.shift)).toBeLessThan(0.1);
    expect(result?.rmsd).toBeGreaterThan(0.9);
  });

  /** Refusing to equate is a smaller error than equating on three questions. */
  it('refuses to equate on too few re-measured anchors', () => {
    const current = new Map(anchors.slice(0, 5).map((a) => [a.id, a.b]));
    expect(equateToAnchors(anchors, current)).toBeNull();
  });
});

describe('fitCutsFromLabels', () => {
  const labelled = (count: number): MeasuredItem[] =>
    Array.from({ length: count }, (_, i) => {
      const score = -2 + (4 * i) / (count - 1);
      const humanLabel: DifficultyLevel = score < -0.7 ? 'EASY' : score > 0.7 ? 'HARD' : 'MEDIUM';
      return item({ id: `q${i}`, score, humanLabel });
    });

  it('recovers the thresholds the humans were actually using', () => {
    const fit = fitCutsFromLabels(labelled(120), 0);
    expect(fit).not.toBeNull();
    expect(fit!.cuts.easyMedium).toBeCloseTo(-0.7, 0);
    expect(fit!.cuts.mediumHard).toBeCloseTo(0.7, 0);
    expect(fit!.kappa).toBeGreaterThan(0.9);
  });

  it('applies the shift before fitting, so the cuts live on the anchored scale', () => {
    const unshifted = fitCutsFromLabels(labelled(120), 0)!;
    const shifted = fitCutsFromLabels(labelled(120), 1.5)!;
    expect(shifted.cuts.easyMedium - unshifted.cuts.easyMedium).toBeCloseTo(1.5, 1);
    expect(shifted.cuts.mediumHard - unshifted.cuts.mediumHard).toBeCloseTo(1.5, 1);
  });

  /**
   * The most dangerous input in the feature. Questions with no human decision must
   * never reach the fit — but the gate for that is `humanLabel: null`, and this test
   * proves an unlabelled bank produces no cuts rather than plausible wrong ones.
   */
  it('returns nothing when no question carries a human decision', () => {
    const unlabelled = labelled(120).map((entry) => ({ ...entry, humanLabel: null }));
    expect(fitCutsFromLabels(unlabelled, 0)).toBeNull();
  });

  it('returns nothing when the labelled set is too small to fit on', () => {
    expect(fitCutsFromLabels(labelled(20), 0)).toBeNull();
  });

  it('ignores labelled questions that are too thinly measured', () => {
    const thin = labelled(120).map((entry) => ({ ...entry, sampleSize: 3 }));
    expect(fitCutsFromLabels(thin, 0)).toBeNull();
  });
});

describe('scaleConfidence', () => {
  it('does not claim confidence a subject has not earned', () => {
    expect(scaleConfidence(5, 0)).toBe('LOW');
    expect(scaleConfidence(25, 60)).toBe('MEDIUM');
    expect(scaleConfidence(50, 200)).toBe('HIGH');
  });
});

/**
 * The executable form of the promise made to the client: the bank must not drift.
 *
 * The dangerous case is not "students got better" — the estimator re-centres on zero,
 * so a uniform ability change leaves item difficulties untouched. It is a change in
 * the *composition of the bank*: publish thirty hard questions and every existing
 * question becomes relatively easier, purely as an artefact of that re-centring.
 * Without anchoring the labels follow. With anchoring they do not move at all.
 */
describe('anti-drift: adding hard content must not relabel the existing bank', () => {
  const ORIGINAL_ITEMS = 60;
  const ADDED_ITEMS = 30;
  const PEOPLE = 300;

  const originalB = Array.from(
    { length: ORIGINAL_ITEMS },
    (_, i) => -2 + (4 * i) / (ORIGINAL_ITEMS - 1)
  );
  const addedB = Array.from({ length: ADDED_ITEMS }, (_, i) => 1.5 + (1.5 * i) / (ADDED_ITEMS - 1));
  const abilities = Array.from({ length: PEOPLE }, (_, i) => -2 + (4 * i) / (PEOPLE - 1));

  const first = estimateRasch(simulate(originalB, abilities, 12345));
  const second = estimateRasch(simulate([...originalB, ...addedB], abilities, 6789));

  const cuts = DEFAULT_CUTS;
  const labelsAfterFirstRun: DifficultyLevel[] = Array.from({ length: ORIGINAL_ITEMS }, (_, i) => {
    const index = classify(first.itemDifficulty[i], cuts.easyMedium, cuts.mediumHard);
    return (['EASY', 'MEDIUM', 'HARD'] as DifficultyLevel[])[index];
  });

  const anchors = selectAnchors(
    Array.from({ length: ORIGINAL_ITEMS }, (_, i) =>
      item({ id: `q${i}`, score: first.itemDifficulty[i], sampleSize: PEOPLE })
    ),
    50
  );

  const currentScores = new Map(
    Array.from({ length: ORIGINAL_ITEMS }, (_, i) => [`q${i}`, second.itemDifficulty[i]] as const)
  );
  const equating = equateToAnchors(anchors, currentScores);

  const proposalsWithShift = (shift: number) =>
    Array.from({ length: ORIGINAL_ITEMS }, (_, i) =>
      decideDifficulty({
        currentLevel: labelsAfterFirstRun[i],
        source: 'LEGACY',
        score: second.itemDifficulty[i] + shift,
        standardError: second.itemStandardError[i],
        sampleSize: PEOPLE,
        cuts,
        connected: second.itemConnected[i],
        qualityFlagCode: null,
        lastApplied: null,
        now: new Date('2026-07-30T00:00:00Z'),
      })
    ).filter((decision) => decision.kind === 'proposal');

  it('measures a real shift caused only by the new content', () => {
    // The bank's centre of gravity moved; the questions themselves did not change.
    expect(equating).not.toBeNull();
    expect(equating!.shift).toBeGreaterThan(0.4);
    expect(equating!.rmsd).toBeLessThan(0.35);
  });

  it('would relabel a large slice of the bank without the anchors', () => {
    expect(proposalsWithShift(0).length).toBeGreaterThanOrEqual(5);
  });

  it('proposes nothing once the scale is equated back onto its anchors', () => {
    expect(proposalsWithShift(equating!.shift)).toEqual([]);
  });
});
