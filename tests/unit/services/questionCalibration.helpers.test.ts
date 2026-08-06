import { describe, it, expect } from 'vitest';
import {
  CALIBRATION,
  CALIBRATION_RESULT_WHERE,
  buildDistribution,
  checkBucketFloors,
  createCalibrationAccumulator,
  decideDifficulty,
  deriveQualityFlag,
  detectNotReached,
  detectRunAnomaly,
  statsChanged,
  type CalibrationAnswer,
  type CalibrationAttempt,
  type DifficultyDecisionInput,
  type QuestionStatsSnapshot,
} from '@/server/services/questionCalibration.helpers';

function answer(over: Partial<CalibrationAnswer> & { questionId: string }): CalibrationAnswer {
  return {
    answerId: 'ans-1',
    answerText: null,
    isCorrect: true,
    timeSpent: 30,
    order: 0,
    sectionIndex: null,
    ...over,
  };
}

/** Shorthand for the four outcomes, so fixtures read like the thing they describe. */
const correct = (questionId: string, over: Partial<CalibrationAnswer> = {}) =>
  answer({ questionId, answerId: 'a', isCorrect: true, ...over });
const wrong = (questionId: string, over: Partial<CalibrationAnswer> = {}) =>
  answer({ questionId, answerId: 'a', isCorrect: false, ...over });
const blank = (questionId: string, over: Partial<CalibrationAnswer> = {}) =>
  answer({ questionId, answerId: null, answerText: null, isCorrect: false, timeSpent: 0, ...over });
const pendingOpen = (questionId: string, over: Partial<CalibrationAnswer> = {}) =>
  answer({ questionId, answerId: null, answerText: 'una risposta', isCorrect: null, ...over });

function attempt(over: Partial<CalibrationAttempt> & { studentId: string; answers: CalibrationAnswer[] }): CalibrationAttempt {
  return { isPaperBased: false, ranOutOfTime: false, ...over };
}

describe('CALIBRATION_RESULT_WHERE', () => {
  it('excludes student self-practice at the root', () => {
    expect(CALIBRATION_RESULT_WHERE.simulation.creatorRole).toEqual({ not: 'STUDENT' });
    expect(CALIBRATION_RESULT_WHERE.simulation.type).toEqual({ not: 'QUICK_QUIZ' });
    expect(CALIBRATION_RESULT_WHERE.completedAt).toEqual({ not: null });
  });
});

describe('detectNotReached', () => {
  const tail = (count: number, startOrder: number): CalibrationAnswer[] =>
    Array.from({ length: count }, (_, i) => blank(`q${startOrder + i}`, { order: startOrder + i }));

  it('keeps the first blank of the run and drops the rest', () => {
    const answers = [
      correct('q0', { order: 0 }),
      wrong('q1', { order: 1 }),
      ...tail(5, 2),
    ];
    const unreached = detectNotReached(answers, { isPaperBased: false, ranOutOfTime: true });
    // Five trailing blanks: the earliest is a genuine omission, four were never seen.
    expect(unreached.size).toBe(4);
    expect(unreached.has('q2')).toBe(false);
    expect([...unreached].sort()).toEqual(['q3', 'q4', 'q5', 'q6']);
  });

  it('drops nothing when the student handed in with time left', () => {
    const answers = [correct('q0', { order: 0 }), ...tail(5, 1)];
    expect(detectNotReached(answers, { isPaperBased: false, ranOutOfTime: false }).size).toBe(0);
  });

  it('drops nothing for a paper result, where timings do not exist', () => {
    const answers = [correct('q0', { order: 0 }), ...tail(5, 1)];
    expect(detectNotReached(answers, { isPaperBased: true, ranOutOfTime: true }).size).toBe(0);
  });

  it('stops at a blank the student actually spent time on', () => {
    const answers = [
      correct('q0', { order: 0 }),
      blank('q1', { order: 1, timeSpent: 45 }), // read it, gave up
      ...tail(3, 2),
    ];
    const unreached = detectNotReached(answers, { isPaperBased: false, ranOutOfTime: true });
    expect(unreached.has('q1')).toBe(false);
    expect(unreached.size).toBe(2);
  });

  it('measures the tail per section, because each section has its own clock', () => {
    const answers = [
      correct('a0', { order: 0, sectionIndex: 0 }),
      blank('a1', { order: 1, sectionIndex: 0 }),
      blank('a2', { order: 2, sectionIndex: 0 }),
      blank('a3', { order: 3, sectionIndex: 0 }),
      correct('b0', { order: 0, sectionIndex: 1 }),
      blank('b1', { order: 1, sectionIndex: 1 }),
      blank('b2', { order: 2, sectionIndex: 1 }),
    ];
    const unreached = detectNotReached(answers, { isPaperBased: false, ranOutOfTime: true });
    expect([...unreached].sort()).toEqual(['a2', 'a3', 'b2']);
  });

  it('drops nothing when a single trailing blank is the whole tail', () => {
    const answers = [correct('q0', { order: 0 }), blank('q1', { order: 1 })];
    expect(detectNotReached(answers, { isPaperBased: false, ranOutOfTime: true }).size).toBe(0);
  });
});

describe('createCalibrationAccumulator', () => {
  const known = new Set(['q1', 'q2', 'q3']);

  it('counts correct, wrong and blank, and keeps pending out of the denominator', () => {
    const accumulator = createCalibrationAccumulator(known);
    accumulator.addAttempt(attempt({ studentId: 's1', answers: [correct('q1'), wrong('q2'), blank('q3')] }));
    accumulator.addAttempt(attempt({ studentId: 's2', answers: [correct('q1'), pendingOpen('q2'), correct('q3')] }));
    const { stats } = accumulator.finish();

    expect(stats.get('q1')).toMatchObject({
      timesAnswered: 2,
      timesCorrect: 2,
      timesGraded: 2,
      avgCorrectRate: 100,
    });
    // q2: one wrong, one still awaiting correction — the pending one must not count
    // as an error, or every open question would look catastrophic.
    expect(stats.get('q2')).toMatchObject({
      timesAnswered: 2,
      timesCorrect: 0,
      timesWrong: 1,
      timesGraded: 1,
      avgCorrectRate: 0,
    });
    // q3: a blank is a question the student could not answer, so it is in the
    // denominator as an error.
    expect(stats.get('q3')).toMatchObject({ timesSkipped: 1, timesGraded: 2, avgCorrectRate: 50 });
  });

  it('reports null rather than zero when nothing has been graded', () => {
    const accumulator = createCalibrationAccumulator(known);
    accumulator.addAttempt(attempt({ studentId: 's1', answers: [pendingOpen('q1')] }));
    const { stats } = accumulator.finish();
    expect(stats.get('q1')?.avgCorrectRate).toBeNull();
    expect(stats.get('q1')?.timesGraded).toBe(0);
  });

  /**
   * The drift nobody would complain about: on a second sitting a student may simply
   * remember the answer, which would drag every reused question towards EASY.
   */
  it('counts only the first time a student meets a question', () => {
    const accumulator = createCalibrationAccumulator(known);
    accumulator.addAttempt(attempt({ studentId: 's1', answers: [wrong('q1')] }));
    accumulator.addAttempt(attempt({ studentId: 's1', answers: [correct('q1')] }));
    accumulator.addAttempt(attempt({ studentId: 's1', answers: [correct('q1')] }));

    const aggregate = accumulator.finish();
    expect(aggregate.stats.get('q1')).toMatchObject({
      timesAnswered: 1,
      timesCorrect: 0,
      timesWrong: 1,
      avgCorrectRate: 0,
    });
    expect(aggregate.repeatExposuresExcluded).toBe(2);
    expect(aggregate.answersCounted).toBe(1);
  });

  /**
   * An open answer nobody has corrected yet teaches nothing, so it must not consume the
   * student's first encounter with the question. Marking it as seen meant the graded
   * answer they gave at the next sitting was thrown away as a repeat, and the only
   * usable evidence about that question vanished with no counter recording the loss.
   */
  it('keeps the graded retry after an answer that was still awaiting correction', () => {
    const accumulator = createCalibrationAccumulator(known);
    accumulator.addAttempt(attempt({ studentId: 's1', answers: [pendingOpen('q1')] }));
    accumulator.addAttempt(attempt({ studentId: 's1', answers: [correct('q1')] }));
    const aggregate = accumulator.finish();

    expect(aggregate.stats.get('q1')).toMatchObject({ timesCorrect: 1, timesGraded: 1 });
    expect(aggregate.repeatExposuresExcluded).toBe(0);
  });

  it('still counts the same question for a different student', () => {
    const accumulator = createCalibrationAccumulator(known);
    accumulator.addAttempt(attempt({ studentId: 's1', answers: [correct('q1')] }));
    accumulator.addAttempt(attempt({ studentId: 's2', answers: [correct('q1')] }));
    expect(accumulator.finish().stats.get('q1')?.timesAnswered).toBe(2);
  });

  it('ignores answers pointing at questions outside the bank', () => {
    const accumulator = createCalibrationAccumulator(known);
    accumulator.addAttempt(attempt({ studentId: 's1', answers: [correct('q1'), correct('deleted')] }));
    const { stats } = accumulator.finish();
    expect(stats.has('deleted')).toBe(false);
    expect(stats.size).toBe(1);
  });

  it('averages time only over answers that recorded any', () => {
    const accumulator = createCalibrationAccumulator(known);
    accumulator.addAttempt(attempt({ studentId: 's1', answers: [correct('q1', { timeSpent: 40 })] }));
    accumulator.addAttempt(attempt({ studentId: 's2', answers: [correct('q1', { timeSpent: 0 })] }));
    expect(accumulator.finish().stats.get('q1')?.avgTimeSeconds).toBe(40);
  });

  it('builds a response matrix the estimator can consume', () => {
    const accumulator = createCalibrationAccumulator(known);
    accumulator.addAttempt(attempt({ studentId: 's1', answers: [correct('q1'), wrong('q2')] }));
    accumulator.addAttempt(attempt({ studentId: 's2', answers: [wrong('q1'), correct('q2')] }));
    const { responses, questionIds } = accumulator.finish();

    expect(responses.personCount).toBe(2);
    expect(responses.itemCount).toBe(2);
    expect(responses.correct.length).toBe(4);
    expect(questionIds).toEqual(['q1', 'q2']);
  });

  it('leaves the not-reached detector off by default', () => {
    const answers = [correct('q1', { order: 0 }), blank('q2', { order: 1 }), blank('q3', { order: 2 })];
    const accumulator = createCalibrationAccumulator(known);
    accumulator.addAttempt(attempt({ studentId: 's1', answers, ranOutOfTime: true }));
    expect(accumulator.finish().notReachedExcluded).toBe(0);
    expect(CALIBRATION.notReachedDetection).toBe(false);
  });

  it('honours the not-reached detector when switched on', () => {
    const answers = [correct('q1', { order: 0 }), blank('q2', { order: 1 }), blank('q3', { order: 2 })];
    const accumulator = createCalibrationAccumulator(known, { notReachedDetection: true });
    accumulator.addAttempt(attempt({ studentId: 's1', answers, ranOutOfTime: true }));
    const aggregate = accumulator.finish();
    expect(aggregate.notReachedExcluded).toBe(1);
    expect(aggregate.stats.has('q3')).toBe(false);
  });
});

describe('statsChanged', () => {
  const base: QuestionStatsSnapshot = {
    timesAnswered: 10,
    timesCorrect: 4,
    timesWrong: 5,
    timesSkipped: 1,
    timesGraded: 10,
    avgCorrectRate: 40,
    avgTimeSeconds: 32.5,
  };

  it('is false for identical numbers, so a quiet night writes nothing', () => {
    expect(statsChanged(base, { ...base })).toBe(false);
  });

  it('notices every counter', () => {
    expect(statsChanged(base, { ...base, timesCorrect: 5 })).toBe(true);
    expect(statsChanged(base, { ...base, timesGraded: 11 })).toBe(true);
    expect(statsChanged(base, { ...base, avgCorrectRate: 41 })).toBe(true);
    expect(statsChanged(base, { ...base, avgTimeSeconds: 33 })).toBe(true);
  });

  it('treats null and a number as different', () => {
    expect(statsChanged(base, { ...base, avgCorrectRate: null })).toBe(true);
    expect(statsChanged({ ...base, avgTimeSeconds: null }, { ...base, avgTimeSeconds: null })).toBe(false);
  });
});

describe('decideDifficulty', () => {
  const cuts = { easyMedium: -0.65, mediumHard: 0.65 };

  function input(over: Partial<DifficultyDecisionInput> = {}): DifficultyDecisionInput {
    return {
      currentLevel: 'MEDIUM',
      source: 'LEGACY',
      score: 0,
      standardError: 0.15,
      sampleSize: 200,
      cuts,
      connected: true,
      qualityFlagCode: null,
      lastApplied: null,
      now: new Date('2026-07-30T00:00:00Z'),
      ...over,
    };
  }

  it('proposes the harder level when the evidence clears the cut', () => {
    const decision = decideDifficulty(input({ score: 2 }));
    expect(decision.kind).toBe('proposal');
    if (decision.kind !== 'proposal') return;
    expect(decision.toLevel).toBe('HARD');
    expect(decision.reasonCode).toBe('TOO_HARD_FOR_LEVEL');
    expect(decision.confidence).toBeGreaterThan(0.99);
  });

  /** The direction the committente asked about explicitly. */
  it('proposes the easier level when a question is guessed far more than expected', () => {
    const decision = decideDifficulty(input({ currentLevel: 'HARD', score: -2 }));
    expect(decision.kind).toBe('proposal');
    if (decision.kind !== 'proposal') return;
    expect(decision.toLevel).toBe('MEDIUM');
    expect(decision.reasonCode).toBe('TOO_EASY_FOR_LEVEL');
  });

  it('walks one level at a time in both directions', () => {
    const up = decideDifficulty(input({ currentLevel: 'EASY', score: 5 }));
    const down = decideDifficulty(input({ currentLevel: 'HARD', score: -5 }));
    expect(up.kind === 'proposal' && up.toLevel).toBe('MEDIUM'); // not HARD
    expect(down.kind === 'proposal' && down.toLevel).toBe('MEDIUM'); // not EASY
  });

  it('is silent when the current level already matches the measurement', () => {
    expect(decideDifficulty(input({ score: 0 }))).toEqual({
      kind: 'skipped',
      reason: 'ALREADY_CORRECT',
    });
  });

  it('is silent for a question sitting just past the cut', () => {
    // Just over the boundary, but nowhere near clearing hysteresis + 1.96 SE.
    const decision = decideDifficulty(input({ score: 0.7, standardError: 0.3 }));
    expect(decision).toEqual({ kind: 'skipped', reason: 'LOW_EVIDENCE' });
  });

  it('needs less data the further past the cut a question sits', () => {
    // Same borderline score: precise measurement moves it, imprecise does not.
    const precise = decideDifficulty(input({ score: 1.1, standardError: 0.1 }));
    const noisy = decideDifficulty(input({ score: 1.1, standardError: 0.4 }));
    expect(precise.kind).toBe('proposal');
    expect(noisy).toEqual({ kind: 'skipped', reason: 'LOW_EVIDENCE' });
  });

  it('refuses to measure a question with too few responses', () => {
    const decision = decideDifficulty(input({ score: 3, sampleSize: CALIBRATION.minSampleForScore - 1 }));
    expect(decision).toEqual({ kind: 'skipped', reason: 'LOW_EVIDENCE' });
  });

  it('refuses a question whose scale is not comparable with its subject', () => {
    expect(decideDifficulty(input({ score: 3, connected: false }))).toEqual({
      kind: 'skipped',
      reason: 'UNCONNECTED',
    });
  });

  it('never relabels a question that looks broken', () => {
    expect(decideDifficulty(input({ score: 3, qualityFlagCode: 'KEY_SUSPECT' }))).toEqual({
      kind: 'skipped',
      reason: 'QUALITY_FLAG',
    });
  });

  it('holds a question back until both cooldown conditions are met', () => {
    const now = new Date('2026-07-30T00:00:00Z');
    const recently = new Date('2026-07-20T00:00:00Z'); // 10 days ago
    const longAgo = new Date('2026-05-30T00:00:00Z'); // 61 days ago

    expect(
      decideDifficulty(input({ score: 3, now, lastApplied: { at: recently, sampleSize: 10 } }))
    ).toEqual({ kind: 'skipped', reason: 'COOLDOWN' });

    // Enough time, but no new evidence since the last change.
    expect(
      decideDifficulty(input({ score: 3, now, sampleSize: 200, lastApplied: { at: longAgo, sampleSize: 190 } }))
    ).toEqual({ kind: 'skipped', reason: 'COOLDOWN' });

    // Enough of both.
    expect(
      decideDifficulty(input({ score: 3, now, sampleSize: 200, lastApplied: { at: longAgo, sampleSize: 150 } })).kind
    ).toBe('proposal');
  });

  it('still proposes on a manually set difficulty, but flags the contradiction', () => {
    const decision = decideDifficulty(input({ score: 3, source: 'MANUAL' }));
    expect(decision.kind).toBe('proposal');
    if (decision.kind !== 'proposal') return;
    expect(decision.contradictsHuman).toBe(true);
  });

  it('does not flag a contradiction when nobody ever decided', () => {
    const decision = decideDifficulty(input({ score: 3, source: 'LEGACY' }));
    expect(decision.kind === 'proposal' && decision.contradictsHuman).toBe(false);
  });

  it('rejects a non-finite measurement instead of acting on it', () => {
    expect(decideDifficulty(input({ score: Infinity })).kind).toBe('skipped');
    expect(decideDifficulty(input({ score: 3, standardError: Infinity })).kind).toBe('skipped');
  });
});

/**
 * The committente's requirement, as an executable specification: the labels must
 * not drift when the population changes, only when a question does.
 */
describe('anti-drift specification', () => {
  const cuts = { easyMedium: -0.65, mediumHard: 0.65 };

  const decide = (
    currentLevel: 'EASY' | 'MEDIUM' | 'HARD',
    score: number,
    over: Partial<DifficultyDecisionInput> = {}
  ) =>
    decideDifficulty({
      currentLevel,
      source: 'LEGACY',
      score,
      standardError: 0.12,
      sampleSize: 250,
      cuts,
      connected: true,
      qualityFlagCode: null,
      lastApplied: null,
      now: new Date('2026-07-30T00:00:00Z'),
      ...over,
    });

  /**
   * The property the anchored scale relies on. A cohort that got better shifts every
   * measured score by the same amount; re-anchoring shifts the cuts with them. This
   * asserts that such a joint shift changes nothing — which is why pinning the scale
   * to frozen anchors is sufficient to keep labels stable, and why the drift the
   * committente feared cannot happen through the population.
   */
  it('depends only on the distance from the cut, never on the absolute level', () => {
    const bank = Array.from({ length: 60 }, (_, i) => ({
      score: -1.5 + (3 * i) / 59,
      currentLevel: (i < 20 ? 'EASY' : i < 40 ? 'MEDIUM' : 'HARD') as 'EASY' | 'MEDIUM' | 'HARD',
    }));

    const shiftedBy = (offset: number) =>
      bank.map((item) =>
        decide(item.currentLevel, item.score + offset, {
          cuts: { easyMedium: cuts.easyMedium + offset, mediumHard: cuts.mediumHard + offset },
        })
      );

    const baseline = shiftedBy(0);
    // The whole population improving by a full logit, and by two.
    expect(shiftedBy(1)).toEqual(baseline);
    expect(shiftedBy(2)).toEqual(baseline);
    // …and getting worse.
    expect(shiftedBy(-1.5)).toEqual(baseline);
  });

  /** Without the joint shift, the same movement would relabel a large slice. */
  it('would have relabelled the bank had the scale not been anchored', () => {
    const bank = Array.from({ length: 60 }, (_, i) => ({
      score: -1.5 + (3 * i) / 59,
      currentLevel: (i < 20 ? 'EASY' : i < 40 ? 'MEDIUM' : 'HARD') as 'EASY' | 'MEDIUM' | 'HARD',
    }));
    const unanchored = bank.map((item) => decide(item.currentLevel, item.score + 1.5));
    expect(unanchored.filter((d) => d.kind === 'proposal').length).toBeGreaterThan(15);
  });

  it('moves nothing when every question sits inside its band', () => {
    const settled = [
      { currentLevel: 'EASY' as const, score: -1.2 },
      { currentLevel: 'MEDIUM' as const, score: 0 },
      { currentLevel: 'HARD' as const, score: 1.2 },
    ];
    for (const item of settled) {
      const decision = decideDifficulty({
        currentLevel: item.currentLevel,
        source: 'LEGACY',
        score: item.score,
        standardError: 0.12,
        sampleSize: 250,
        cuts,
        connected: true,
        qualityFlagCode: null,
        lastApplied: null,
        now: new Date('2026-07-30T00:00:00Z'),
      });
      expect(decision).toEqual({ kind: 'skipped', reason: 'ALREADY_CORRECT' });
    }
  });

  it('is exactly symmetric on a mirrored dataset', () => {
    const mirrored = (level: 'EASY' | 'MEDIUM' | 'HARD', score: number) =>
      decideDifficulty({
        currentLevel: level,
        source: 'LEGACY',
        score,
        standardError: 0.12,
        sampleSize: 250,
        cuts,
        connected: true,
        qualityFlagCode: null,
        lastApplied: null,
        now: new Date('2026-07-30T00:00:00Z'),
      });

    const harder = mirrored('EASY', 1.5);
    const easier = mirrored('HARD', -1.5);
    expect(harder.kind).toBe('proposal');
    expect(easier.kind).toBe('proposal');
    if (harder.kind !== 'proposal' || easier.kind !== 'proposal') return;
    expect(harder.toLevel).toBe('MEDIUM');
    expect(easier.toLevel).toBe('MEDIUM');
    // Mirrored distance from the mirrored cut ⇒ identical confidence.
    expect(harder.confidence).toBeCloseTo(easier.confidence, 10);
    expect(harder.metadata.observedMargin).toBeCloseTo(easier.metadata.observedMargin, 10);
  });

  it('proposes nothing at all when the data carries no signal', () => {
    // Every question measured right at the middle of the medium band.
    const decisions = Array.from({ length: 40 }, () =>
      decideDifficulty({
        currentLevel: 'MEDIUM',
        source: 'LEGACY',
        score: 0,
        standardError: 0.5,
        sampleSize: 40,
        cuts,
        connected: true,
        qualityFlagCode: null,
        lastApplied: null,
        now: new Date('2026-07-30T00:00:00Z'),
      })
    );
    expect(decisions.every((d) => d.kind === 'skipped')).toBe(true);
  });
});

describe('deriveQualityFlag', () => {
  const stats = (over: Partial<QuestionStatsSnapshot> = {}): QuestionStatsSnapshot => ({
    timesAnswered: 100,
    timesCorrect: 50,
    timesWrong: 50,
    timesSkipped: 0,
    timesGraded: 100,
    avgCorrectRate: 50,
    avgTimeSeconds: 30,
    ...over,
  });

  it('calls a negative correlation a suspect key, before anything else', () => {
    expect(deriveQualityFlag(-0.3, stats({ timesSkipped: 90 }))).toBe('KEY_SUSPECT');
  });

  /**
   * These papers penalise a wrong answer and not a blank, so omitting is a tactic. The
   * model counts every blank as an error, which measures a question most of the room
   * skips as brutally hard whether it is hard or merely long and off-putting.
   */
  it('flags a question the room avoids rather than reading it as difficulty', () => {
    expect(deriveQualityFlag(0.4, stats({ timesSkipped: 45 }))).toBe('HIGH_OMISSION');
  });

  it('leaves an ordinary omission rate alone', () => {
    expect(deriveQualityFlag(0.4, stats({ timesSkipped: 20 }))).toBeNull();
  });

  it('needs a real denominator before calling anything avoidance', () => {
    expect(deriveQualityFlag(0.4, stats({ timesGraded: 5, timesSkipped: 5 }))).toBeNull();
  });

  /** Avoidance leaves little variance to correlate, so it must be the reported cause. */
  it('reports the avoidance rather than the low discrimination it causes', () => {
    expect(deriveQualityFlag(0.01, stats({ timesSkipped: 60 }))).toBe('HIGH_OMISSION');
  });

  it('still reports low discrimination on its own', () => {
    expect(deriveQualityFlag(0.01, stats())).toBe('LOW_DISCRIMINATION');
  });

  it('says nothing when the correlation could not be measured', () => {
    expect(deriveQualityFlag(null, stats())).toBeNull();
  });
});

describe('detectRunAnomaly', () => {
  const harder = { reasonCode: 'TOO_HARD_FOR_LEVEL' as const };
  const easier = { reasonCode: 'TOO_EASY_FOR_LEVEL' as const };
  const mixed = (count: number) =>
    Array.from({ length: count }, (_, i) => (i % 2 === 0 ? harder : easier));

  it('accepts an ordinary balanced batch', () => {
    expect(detectRunAnomaly(mixed(12), 10)).toEqual({ anomalous: false });
  });

  it('accepts an empty batch', () => {
    expect(detectRunAnomaly([], 10)).toEqual({ anomalous: false });
  });

  it('refuses a batch far larger than any before it', () => {
    const result = detectRunAnomaly(mixed(40), 5);
    expect(result.anomalous).toBe(true);
    expect(result.reason).toMatch(/VOLUME_SPIKE/);
  });

  it('refuses an implausibly large batch even with no history to compare', () => {
    const result = detectRunAnomaly(mixed(CALIBRATION.anomalyAbsoluteCount + 1), null);
    expect(result.anomalous).toBe(true);
    expect(result.reason).toMatch(/VOLUME_ABSOLUTE/);
  });

  it('refuses a batch that moves almost everything the same way', () => {
    const result = detectRunAnomaly(new Array(30).fill(harder), 30);
    expect(result.anomalous).toBe(true);
    expect(result.reason).toMatch(/ONE_DIRECTION/);
  });

  it('tolerates a one-sided batch too small to mean anything', () => {
    const count = CALIBRATION.anomalyMinCountForShare - 1;
    expect(detectRunAnomaly(new Array(count).fill(harder), 20).anomalous).toBe(false);
  });
});

describe('checkBucketFloors', () => {
  const published = [
    ...Array.from({ length: 22 }, () => ({ subjectId: 'bio', level: 'EASY' as const })),
    ...Array.from({ length: 50 }, () => ({ subjectId: 'bio', level: 'MEDIUM' as const })),
  ];

  it('passes when a bucket keeps enough questions', () => {
    const proposals = [{ subjectId: 'bio', fromLevel: 'EASY' as const }];
    expect(checkBucketFloors(published, proposals)).toEqual([]);
  });

  it('flags a bucket that would be drained below the floor', () => {
    const proposals = Array.from({ length: 5 }, () => ({
      subjectId: 'bio',
      fromLevel: 'EASY' as const,
    }));
    const violations = checkBucketFloors(published, proposals);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toEqual({ subjectId: 'bio', level: 'EASY', remaining: 17 });
  });

  it('ignores questions with no subject', () => {
    expect(checkBucketFloors(published, [{ subjectId: null, fromLevel: 'EASY' }])).toEqual([]);
  });
});

describe('buildDistribution', () => {
  it('counts each level', () => {
    expect(buildDistribution(['EASY', 'EASY', 'MEDIUM', 'HARD'])).toEqual({
      EASY: 2,
      MEDIUM: 1,
      HARD: 1,
    });
  });

  it('returns zeros for an empty bank', () => {
    expect(buildDistribution([])).toEqual({ EASY: 0, MEDIUM: 0, HARD: 0 });
  });
});
