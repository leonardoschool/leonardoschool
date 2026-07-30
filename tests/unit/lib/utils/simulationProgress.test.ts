/**
 * Serialization and merge rules for an in-progress simulation attempt.
 *
 * These decide what survives a connection loss: which answers get stored, when
 * a write can be skipped, and whether the device copy or the server copy wins
 * when a student resumes.
 */

import { describe, it, expect } from 'vitest';
import {
  accumulateQuestionMs,
  buildProgressItems,
  isMeaningfulAnswer,
  questionMsToSeconds,
  questionSecondsToMs,
  mergeProgress,
  nextRev,
  normalizeAnswerItems,
  progressFingerprint,
  type SimulationAnswerItem,
  type SimulationProgressSnapshot,
} from '@/lib/utils/simulationProgress';

function answer(overrides: Partial<SimulationAnswerItem> = {}): SimulationAnswerItem {
  return {
    questionId: 'q1',
    answerId: null,
    answerText: null,
    timeSpent: 0,
    flagged: false,
    ...overrides,
  };
}

function snapshot(overrides: Partial<SimulationProgressSnapshot> = {}): SimulationProgressSnapshot {
  return {
    rev: 1,
    updatedAt: 1000,
    resetToken: null,
    items: [],
    timeSpent: 0,
    sectionTimes: {},
    currentSectionIndex: 0,
    currentQuestionIndex: 0,
    ...overrides,
  };
}

describe('isMeaningfulAnswer', () => {
  it('ignores a question the student never touched', () => {
    expect(isMeaningfulAnswer(answer())).toBe(false);
  });

  it('keeps a selected choice', () => {
    expect(isMeaningfulAnswer(answer({ answerId: 'a1' }))).toBe(true);
  });

  it('keeps a written open answer', () => {
    expect(isMeaningfulAnswer(answer({ answerText: 'una risposta' }))).toBe(true);
  });

  it('ignores an open answer containing only whitespace', () => {
    expect(isMeaningfulAnswer(answer({ answerText: '   ' }))).toBe(false);
  });

  it('keeps a flagged question even with no answer', () => {
    expect(isMeaningfulAnswer(answer({ flagged: true }))).toBe(true);
  });

  it('keeps a question the student spent time on', () => {
    expect(isMeaningfulAnswer(answer({ timeSpent: 12 }))).toBe(true);
  });
});

describe('buildProgressItems', () => {
  it('drops untouched questions so the stored JSON tracks the work done', () => {
    const answers = [
      answer({ questionId: 'q1', answerId: 'a1' }),
      answer({ questionId: 'q2' }),
      answer({ questionId: 'q3' }),
    ];

    const items = buildProgressItems(answers, {});

    expect(items).toHaveLength(1);
    expect(items[0].questionId).toBe('q1');
  });

  it('prefers the live per-question timer over the value carried on the answer', () => {
    const items = buildProgressItems([answer({ questionId: 'q1', answerId: 'a1', timeSpent: 5 })], { q1: 42 });

    expect(items[0].timeSpent).toBe(42);
  });

  it('falls back to the answer time when the tracker has no entry', () => {
    const items = buildProgressItems([answer({ questionId: 'q1', answerId: 'a1', timeSpent: 5 })], {});

    expect(items[0].timeSpent).toBe(5);
  });

  it('returns an empty list when nothing has been answered', () => {
    expect(buildProgressItems([answer({ questionId: 'q1' })], {})).toEqual([]);
  });
});

describe('progressFingerprint', () => {
  it('is stable when only elapsed time changes, so redundant writes are skipped', () => {
    const before = progressFingerprint([answer({ answerId: 'a1', timeSpent: 3 })], 0, 0);
    const after = progressFingerprint([answer({ answerId: 'a1', timeSpent: 99 })], 0, 0);

    expect(after).toBe(before);
  });

  it('ignores the order answers were added in', () => {
    const one = answer({ questionId: 'q1', answerId: 'a1' });
    const two = answer({ questionId: 'q2', answerId: 'a2' });

    expect(progressFingerprint([one, two], 0, 0)).toBe(progressFingerprint([two, one], 0, 0));
  });

  it('changes when the student picks a different option', () => {
    const before = progressFingerprint([answer({ answerId: 'a1' })], 0, 0);
    const after = progressFingerprint([answer({ answerId: 'a2' })], 0, 0);

    expect(after).not.toBe(before);
  });

  it('changes when an open answer is edited', () => {
    const before = progressFingerprint([answer({ answerText: 'prima' })], 0, 0);
    const after = progressFingerprint([answer({ answerText: 'dopo' })], 0, 0);

    expect(after).not.toBe(before);
  });

  it('changes when a question is flagged', () => {
    const before = progressFingerprint([answer({ answerId: 'a1' })], 0, 0);
    const after = progressFingerprint([answer({ answerId: 'a1', flagged: true })], 0, 0);

    expect(after).not.toBe(before);
  });

  it('changes when the student navigates to another question', () => {
    expect(progressFingerprint([], 1, 0)).not.toBe(progressFingerprint([], 0, 0));
  });

  it('changes when the student moves to another section', () => {
    expect(progressFingerprint([], 0, 1)).not.toBe(progressFingerprint([], 0, 0));
  });
});

describe('mergeProgress', () => {
  it('restores the device copy when it is ahead of the server', () => {
    const server = snapshot({ rev: 3 });
    const local = snapshot({ rev: 7 });

    expect(mergeProgress(server, local)).toBe(local);
  });

  it('restores the server copy when the device is behind', () => {
    const server = snapshot({ rev: 9 });
    const local = snapshot({ rev: 2 });

    expect(mergeProgress(server, local)).toBe(server);
  });

  it('breaks a revision tie with the newer timestamp', () => {
    const server = snapshot({ rev: 4, updatedAt: 1000 });
    const local = snapshot({ rev: 4, updatedAt: 2000 });

    expect(mergeProgress(server, local)).toBe(local);
  });

  it('keeps the server copy when the tie-break is level', () => {
    const server = snapshot({ rev: 4, updatedAt: 1000 });
    const local = snapshot({ rev: 4, updatedAt: 1000 });

    expect(mergeProgress(server, local)).toBe(server);
  });

  it('discards a device copy predating a staff reset, even when ahead', () => {
    const server = snapshot({ rev: 1, resetToken: 555 });
    const local = snapshot({ rev: 99, resetToken: null });

    expect(mergeProgress(server, local)).toBe(server);
  });

  it('uses the device copy when the server has no attempt to resume', () => {
    const local = snapshot({ rev: 2 });

    expect(mergeProgress(null, local)).toBe(local);
  });

  it('uses the server copy when the device holds no draft', () => {
    const server = snapshot({ rev: 2 });

    expect(mergeProgress(server, null)).toBe(server);
  });

  it('returns nothing when neither side has state', () => {
    expect(mergeProgress(null, null)).toBeNull();
  });
});

describe('nextRev', () => {
  it('continues above every known revision so stored ones are never reused', () => {
    expect(nextRev(snapshot({ rev: 3 }), snapshot({ rev: 8 }))).toBe(9);
  });

  it('ignores missing snapshots', () => {
    expect(nextRev(snapshot({ rev: 5 }), null)).toBe(6);
  });

  it('starts at 1 for a brand new attempt', () => {
    expect(nextRev(null, null)).toBe(1);
  });
});

describe('normalizeAnswerItems', () => {
  it('fills in the defaults missing from stored or transported data', () => {
    const items = normalizeAnswerItems([{ questionId: 'q1' }]);

    expect(items).toEqual([
      { questionId: 'q1', answerId: null, answerText: null, timeSpent: 0, flagged: false },
    ]);
  });

  it('drops entries that cannot be matched to a question', () => {
    const items = normalizeAnswerItems([{ questionId: 'q1' }, { questionId: null }, { answerId: 'a1' }]);

    expect(items).toHaveLength(1);
  });

  it('tolerates a missing list', () => {
    expect(normalizeAnswerItems(null)).toEqual([]);
    expect(normalizeAnswerItems(undefined)).toEqual([]);
  });
});

/**
 * Per-question time.
 *
 * The calibration reads `timeSpent === 0` on a blank answer as "the student never
 * reached this question". That inference is only sound if a question the student
 * *did* look at can never end up at zero, which is what these tests pin down.
 */
describe('per-question time accounting', () => {
  it('accumulates repeated visits to the same question', () => {
    let acc = accumulateQuestionMs({}, 'q1', 4000);
    acc = accumulateQuestionMs(acc, 'q2', 1000);
    acc = accumulateQuestionMs(acc, 'q1', 6000);
    expect(questionMsToSeconds(acc)).toEqual({ q1: 10, q2: 1 });
  });

  /**
   * The regression this whole change exists for. Flooring at every navigation
   * discarded the remainder, so a student who kept coming back to the same question
   * for a fraction of a second at a time accrued nothing at all.
   */
  it('keeps sub-second visits instead of throwing them away', () => {
    let acc: Record<string, number> = {};
    for (let visit = 0; visit < 10; visit++) {
      acc = accumulateQuestionMs(acc, 'q1', 900);
    }
    expect(questionMsToSeconds(acc)).toEqual({ q1: 9 });
  });

  it('ignores a clock that jumps backwards rather than subtracting earned time', () => {
    const acc = accumulateQuestionMs({ q1: 5000 }, 'q1', -30_000);
    expect(questionMsToSeconds(acc)).toEqual({ q1: 5 });
  });

  it('ignores a visit with no question in focus', () => {
    expect(accumulateQuestionMs({ q1: 1000 }, null, 5000)).toEqual({ q1: 1000 });
  });

  it('does not mutate the accumulator it is given', () => {
    const original = { q1: 1000 };
    accumulateQuestionMs(original, 'q1', 2000);
    expect(original).toEqual({ q1: 1000 });
  });

  /** A resumed attempt has to carry on from the stored totals, not restart. */
  it('round-trips through the stored second-based representation', () => {
    const stored = { q1: 42, q2: 7 };
    const resumed = accumulateQuestionMs(questionSecondsToMs(stored), 'q1', 3000);
    expect(questionMsToSeconds(resumed)).toEqual({ q1: 45, q2: 7 });
  });

  it('drops zero and negative values when seeding, so they cannot become time', () => {
    expect(questionSecondsToMs({ q1: 0, q2: -5, q3: 3 })).toEqual({ q3: 3000 });
  });
});
