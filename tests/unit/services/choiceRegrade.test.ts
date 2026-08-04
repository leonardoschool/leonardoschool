/**
 * Choice re-grade tests
 *
 * Covers the pure part of re-applying a corrected answer key to attempts that were
 * already scored: grading one stored answer, the counter movements it causes, the
 * per-subject breakdown, and recovering the answer ids that older edits destroyed.
 */

import { describe, it, expect } from 'vitest';
import {
  applySubjectScoreDeltas,
  buildAnswerIdRemap,
  categoryDeltas,
  categoryOfStoredAnswer,
  gradeChoiceAnswer,
  normalizeAnswerText,
  summarizeOutcomes,
} from '@/server/services/choiceRegrade';

const config = { points: 1.5, negativePoints: -0.4, blankPoints: 0 };

describe('gradeChoiceAnswer', () => {
  it('awards the full points when the answer is now the correct one', () => {
    expect(gradeChoiceAnswer('b', new Set(['b']), config)).toEqual({
      isCorrect: true,
      earnedPoints: 1.5,
      category: 'correct',
    });
  });

  it('applies the penalty when the answer is not in the key', () => {
    expect(gradeChoiceAnswer('a', new Set(['b']), config)).toEqual({
      isCorrect: false,
      earnedPoints: -0.4,
      category: 'wrong',
    });
  });

  it('treats a missing answer as blank, keeping isCorrect false like the submit path', () => {
    expect(gradeChoiceAnswer(null, new Set(['b']), config)).toEqual({
      isCorrect: false,
      earnedPoints: 0,
      category: 'blank',
    });
  });
});

describe('categoryOfStoredAnswer', () => {
  it('reads a stored wrong answer as wrong, not blank', () => {
    expect(categoryOfStoredAnswer({ answerId: 'a', isCorrect: false })).toBe('wrong');
  });

  it('reads an unanswered question as blank even though isCorrect is false', () => {
    expect(categoryOfStoredAnswer({ answerId: null, isCorrect: false })).toBe('blank');
  });

  it('reads a stored correct answer as correct', () => {
    expect(categoryOfStoredAnswer({ answerId: 'b', isCorrect: true })).toBe('correct');
  });
});

describe('categoryDeltas', () => {
  it('moves one answer from wrong to correct', () => {
    expect(categoryDeltas('wrong', 'correct')).toEqual({
      correctDelta: 1,
      wrongDelta: -1,
      blankDelta: 0,
    });
  });

  it('reports no movement when the category is unchanged', () => {
    expect(categoryDeltas('correct', 'correct')).toEqual({
      correctDelta: 0,
      wrongDelta: 0,
      blankDelta: 0,
    });
  });

  it('moves one answer from blank to wrong', () => {
    expect(categoryDeltas('blank', 'wrong')).toEqual({
      correctDelta: 0,
      wrongDelta: 1,
      blankDelta: -1,
    });
  });
});

describe('applySubjectScoreDeltas', () => {
  const deltas = { correctDelta: 1, wrongDelta: -1, blankDelta: 0 };

  it('updates only the question’s subject bucket', () => {
    const scores = {
      Biologia: { correct: 4, wrong: 3, blank: 1 },
      Chimica: { correct: 2, wrong: 0, blank: 0 },
    };

    expect(applySubjectScoreDeltas(scores, 'Biologia', deltas)).toEqual({
      Biologia: { correct: 5, wrong: 2, blank: 1 },
      Chimica: { correct: 2, wrong: 0, blank: 0 },
    });
  });

  it('never lets a counter go negative', () => {
    const scores = { Biologia: { correct: 0, wrong: 0, blank: 0 } };

    expect(applySubjectScoreDeltas(scores, 'Biologia', { correctDelta: -1, wrongDelta: 0, blankDelta: 0 }))
      .toEqual({ Biologia: { correct: 0, wrong: 0, blank: 0 } });
  });

  it('leaves the breakdown alone when the subject has no bucket', () => {
    expect(applySubjectScoreDeltas({ Chimica: { correct: 1, wrong: 0, blank: 0 } }, 'Biologia', deltas)).toBeNull();
    expect(applySubjectScoreDeltas(null, 'Biologia', deltas)).toBeNull();
    expect(applySubjectScoreDeltas({}, null, deltas)).toBeNull();
  });
});

describe('normalizeAnswerText', () => {
  it('ignores markup and spacing differences', () => {
    expect(normalizeAnswerText('<p>Legami  covalenti</p>')).toBe('legami covalenti');
    expect(normalizeAnswerText('Legami&nbsp;covalenti')).toBe('legami covalenti');
  });
});

describe('buildAnswerIdRemap', () => {
  const currentAnswers = [
    { id: 'new-a', text: 'Legami idrogeno', order: 0 },
    { id: 'new-b', text: 'Legami covalenti', order: 1 },
  ];

  it('maps an id destroyed by an edit onto the row with the same text', () => {
    const snapshots = [
      { answers: [
        { id: 'old-a', text: 'Legami idrogeno', order: 0 },
        { id: 'old-b', text: 'Legami covalenti', order: 1 },
      ] },
    ];

    const remap = buildAnswerIdRemap(currentAnswers, snapshots);
    expect(remap.get('old-a')).toBe('new-a');
    expect(remap.get('old-b')).toBe('new-b');
  });

  it('falls back to the position when the text was rewritten', () => {
    const snapshots = [{ answers: [{ id: 'old-b', text: 'Legami covalenti (peptidici)', order: 1 }] }];

    expect(buildAnswerIdRemap(currentAnswers, snapshots).get('old-b')).toBe('new-b');
  });

  it('matches by text when the options were reordered', () => {
    const snapshots = [{ answers: [{ id: 'old-b', text: 'Legami covalenti', order: 0 }] }];

    expect(buildAnswerIdRemap(currentAnswers, snapshots).get('old-b')).toBe('new-b');
  });

  it('never remaps an id that still exists', () => {
    const snapshots = [{ answers: [{ id: 'new-a', text: 'Legami covalenti', order: 1 }] }];

    expect(buildAnswerIdRemap(currentAnswers, snapshots).has('new-a')).toBe(false);
  });

  it('lets the newest snapshot win and ignores malformed entries', () => {
    const snapshots = [
      { answers: [{ id: 'old-x', text: 'Legami covalenti', order: 1 }] },
      { answers: [{ id: 'old-x', text: 'Legami idrogeno', order: 0 }] },
      { answers: 'not-an-array' },
      null,
    ];

    const remap = buildAnswerIdRemap(currentAnswers, snapshots);
    expect(remap.get('old-x')).toBe('new-b');
    expect(remap.size).toBe(1);
  });
});

describe('summarizeOutcomes', () => {
  it('keeps link repairs out of the score changes', () => {
    const summary = summarizeOutcomes([
      { pointDelta: 1.9, linkOnly: false },
      { pointDelta: 0, linkOnly: true },
      { pointDelta: 0, linkOnly: true },
    ]);

    expect(summary.updatedResults).toBe(3);
    expect(summary.scoreChanges).toBe(1);
    expect(summary.linkRepairs).toBe(2);
  });

  it('separates the attempts that gain from the ones that lose', () => {
    const summary = summarizeOutcomes([
      { pointDelta: 1.9, linkOnly: false },
      { pointDelta: 1.9, linkOnly: false },
      { pointDelta: -1.9, linkOnly: false },
    ]);

    expect(summary.gained).toBe(2);
    expect(summary.lost).toBe(1);
  });

  it('sums the net movement without float drift', () => {
    const summary = summarizeOutcomes([
      { pointDelta: 1.9, linkOnly: false },
      { pointDelta: -0.4, linkOnly: false },
      { pointDelta: -0.4, linkOnly: false },
    ]);

    expect(summary.netPoints).toBe(1.1);
  });

  it('reports nothing for an empty run', () => {
    expect(summarizeOutcomes([])).toEqual({
      updatedResults: 0,
      scoreChanges: 0,
      linkRepairs: 0,
      gained: 0,
      lost: 0,
      netPoints: 0,
    });
  });
});
