/**
 * Questions router helper tests
 *
 * Covers the answer reconciliation that keeps an option's row (and therefore its id)
 * alive across an edit, and the answer-key comparison that decides whether the
 * attempts already scored need re-grading.
 */

import { describe, it, expect } from 'vitest';
import {
  correctAnswerKeyChanged,
  reconcileAnswers,
  shouldRegradeAttempts,
} from '@/server/trpc/routers/questions.helpers';

describe('reconcileAnswers', () => {
  const existing = [
    { id: 'row-a', order: 0 },
    { id: 'row-b', order: 1 },
    { id: 'row-c', order: 2 },
  ];

  it('reuses every row when the editor sends the ids back', () => {
    const plan = reconcileAnswers(existing, [
      { id: 'row-a', order: 0 },
      { id: 'row-b', order: 1 },
      { id: 'row-c', order: 2 },
    ]);

    expect(plan.updates.map(u => u.id)).toEqual(['row-a', 'row-b', 'row-c']);
    expect(plan.creates).toEqual([]);
    expect(plan.deletedIds).toEqual([]);
  });

  it('reuses rows by position when the editor drops the ids', () => {
    const plan = reconcileAnswers(existing, [{ order: 0 }, { order: 1 }, { order: 2 }]);

    expect(plan.updates.map(u => u.id)).toEqual(['row-a', 'row-b', 'row-c']);
    expect(plan.creates).toEqual([]);
    expect(plan.deletedIds).toEqual([]);
  });

  it('keeps the ids of the surviving options when one is removed', () => {
    const plan = reconcileAnswers(existing, [{ id: 'row-a' }, { id: 'row-c' }]);

    expect(plan.updates.map(u => u.id)).toEqual(['row-a', 'row-c']);
    expect(plan.deletedIds).toEqual(['row-b']);
    expect(plan.creates).toEqual([]);
  });

  it('creates only the options with no row left to reuse', () => {
    const plan = reconcileAnswers(existing, [
      { id: 'row-a' },
      { id: 'row-b' },
      { id: 'row-c' },
      { order: 3 },
    ]);

    expect(plan.updates).toHaveLength(3);
    expect(plan.creates.map(c => c.index)).toEqual([3]);
    expect(plan.deletedIds).toEqual([]);
  });

  it('follows the id, not the position, when the options are reordered', () => {
    const plan = reconcileAnswers(existing, [
      { id: 'row-c', order: 0 },
      { id: 'row-a', order: 1 },
      { id: 'row-b', order: 2 },
    ]);

    expect(plan.updates.map(u => ({ id: u.id, index: u.index }))).toEqual([
      { id: 'row-c', index: 0 },
      { id: 'row-a', index: 1 },
      { id: 'row-b', index: 2 },
    ]);
    expect(plan.deletedIds).toEqual([]);
  });

  it('ignores an id that no longer exists and falls back to a spare row', () => {
    const plan = reconcileAnswers(existing, [{ id: 'gone' }, { id: 'row-b' }, { id: 'row-c' }]);

    expect(plan.updates.map(u => u.id)).toEqual(['row-a', 'row-b', 'row-c']);
    expect(plan.creates).toEqual([]);
  });

  it('drops every row when the question becomes open text', () => {
    const plan = reconcileAnswers(existing, []);

    expect(plan.updates).toEqual([]);
    expect(plan.creates).toEqual([]);
    expect(plan.deletedIds).toEqual(['row-a', 'row-b', 'row-c']);
  });
});

describe('correctAnswerKeyChanged', () => {
  const before = [
    { text: 'Legami idrogeno', isCorrect: true },
    { text: 'Legami covalenti', isCorrect: false },
  ];

  it('detects the correct option moving to another answer', () => {
    const after = [
      { text: 'Legami idrogeno', isCorrect: false },
      { text: 'Legami covalenti', isCorrect: true },
    ];

    expect(correctAnswerKeyChanged(before, after)).toBe(true);
  });

  it('ignores an edit that only touches the wrong options or the markup', () => {
    const after = [
      { text: '<p>Legami  idrogeno</p>', isCorrect: true },
      { text: 'Interazioni idrofobiche', isCorrect: false },
    ];

    expect(correctAnswerKeyChanged(before, after)).toBe(false);
  });

  it('ignores a reorder that keeps the same correct option', () => {
    const after = [
      { text: 'Legami covalenti', isCorrect: false },
      { text: 'Legami idrogeno', isCorrect: true },
    ];

    expect(correctAnswerKeyChanged(before, after)).toBe(false);
  });

  it('detects a second correct option being added', () => {
    const after = [
      { text: 'Legami idrogeno', isCorrect: true },
      { text: 'Legami covalenti', isCorrect: true },
    ];

    expect(correctAnswerKeyChanged(before, after)).toBe(true);
  });
});

describe('shouldRegradeAttempts', () => {
  const question = {
    points: 1.5,
    negativePoints: -0.4,
    answers: [
      { text: 'Legami idrogeno', isCorrect: true },
      { text: 'Legami covalenti', isCorrect: false },
    ],
  };

  it('fires when the correct option moves', () => {
    const after = {
      ...question,
      answers: [
        { text: 'Legami idrogeno', isCorrect: false },
        { text: 'Legami covalenti', isCorrect: true },
      ],
    };

    expect(shouldRegradeAttempts(question, after)).toBe(true);
  });

  it('fires when what a right answer is worth changes', () => {
    expect(shouldRegradeAttempts(question, { ...question, points: 2 })).toBe(true);
  });

  it('fires when the penalty changes', () => {
    expect(shouldRegradeAttempts(question, { ...question, negativePoints: -0.5 })).toBe(true);
  });

  it('stays quiet for an edit that changes nothing about the score', () => {
    const after = {
      ...question,
      answers: [
        { text: '<p>Legami  idrogeno</p>', isCorrect: true },
        { text: 'Interazioni idrofobiche', isCorrect: false },
      ],
    };

    expect(shouldRegradeAttempts(question, after)).toBe(false);
  });
});
