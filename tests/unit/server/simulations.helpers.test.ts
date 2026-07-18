import { describe, it, expect } from 'vitest';
import { sanitizeSectionsForQuestionUpdate } from '@/server/trpc/routers/simulations.helpers';

describe('sanitizeSectionsForQuestionUpdate', () => {
  const validIds = new Set(['q1', 'q2']);

  it('keeps the generation filters when questions are edited (language regression)', () => {
    const [section] = sanitizeSectionsForQuestionUpdate(
      [
        {
          id: 's1',
          name: 'Biologia',
          durationMinutes: 30,
          questionIds: ['q1'],
          language: 'IT',
          subjectIds: ['sub1'],
          topicIds: ['top1'],
          questionTypes: ['SINGLE'],
          difficultyLevels: ['EASY'],
          tagIds: ['tag1'],
        },
      ],
      validIds
    )!;

    // Losing any of these silently disables that filter on the next regeneration:
    // an IT-only section would start serving EN questions to students.
    expect(section.language).toBe('IT');
    expect(section.subjectIds).toEqual(['sub1']);
    expect(section.topicIds).toEqual(['top1']);
    expect(section.questionTypes).toEqual(['SINGLE']);
    expect(section.difficultyLevels).toEqual(['EASY']);
    expect(section.tagIds).toEqual(['tag1']);
  });

  it('drops question ids that no longer exist and recounts', () => {
    const [section] = sanitizeSectionsForQuestionUpdate(
      [{ id: 's1', name: 'S', durationMinutes: 10, questionIds: ['q1', 'ghost', 'q2'] }],
      validIds
    )!;

    expect(section.questionIds).toEqual(['q1', 'q2']);
    expect(section.questionCount).toBe(2);
  });

  it('defaults a missing language to null rather than dropping the key', () => {
    const [section] = sanitizeSectionsForQuestionUpdate(
      [{ id: 's1', name: 'S', durationMinutes: 10 }],
      validIds
    )!;

    expect(section).toHaveProperty('language', null);
    expect(section.order).toBe(0);
  });

  it('returns undefined when there are no sections', () => {
    expect(sanitizeSectionsForQuestionUpdate(undefined, validIds)).toBeUndefined();
  });
});
