/**
 * Validation of a proposed alternative answer.
 *
 * A proposal IS the keyword, so it needs no written explanation — but every other
 * kind of report is only actionable if the student describes the problem, so the
 * 10-character rule must stay in place for those.
 */

import { describe, it, expect } from 'vitest';
import { createQuestionFeedbackSchema } from '@/lib/validations/questionValidation';

describe('createQuestionFeedbackSchema — ALTERNATIVE_ANSWER', () => {
  it('accepts a proposal with no explanation', () => {
    const result = createQuestionFeedbackSchema.safeParse({
      questionId: 'q1',
      type: 'ALTERNATIVE_ANSWER',
      message: '',
      proposedKeyword: '0.83',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a proposal without the proposed answer', () => {
    const result = createQuestionFeedbackSchema.safeParse({
      questionId: 'q1',
      type: 'ALTERNATIVE_ANSWER',
      message: '',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['proposedKeyword']);
  });

  it('rejects a proposal whose answer is only whitespace', () => {
    const result = createQuestionFeedbackSchema.safeParse({
      questionId: 'q1',
      type: 'ALTERNATIVE_ANSWER',
      message: '',
      proposedKeyword: '   ',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a multi-line proposal', () => {
    const result = createQuestionFeedbackSchema.safeParse({
      questionId: 'q1',
      type: 'ALTERNATIVE_ANSWER',
      message: '',
      proposedKeyword: '0.83\n0,83',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a proposal longer than the keyword limit', () => {
    const result = createQuestionFeedbackSchema.safeParse({
      questionId: 'q1',
      type: 'ALTERNATIVE_ANSWER',
      message: '',
      proposedKeyword: 'a'.repeat(101),
    });

    expect(result.success).toBe(false);
  });

  it('keeps the attempt reference when provided', () => {
    const result = createQuestionFeedbackSchema.parse({
      questionId: 'q1',
      type: 'ALTERNATIVE_ANSWER',
      message: 'è lo stesso valore arrotondato',
      proposedKeyword: '0.83',
      simulationResultId: 'r1',
    });

    expect(result.simulationResultId).toBe('r1');
  });
});

describe('createQuestionFeedbackSchema — other report types', () => {
  it('still requires a description of at least 10 characters', () => {
    const result = createQuestionFeedbackSchema.safeParse({
      questionId: 'q1',
      type: 'ERROR_IN_ANSWER',
      message: 'breve',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['message']);
  });

  it('accepts a described problem', () => {
    const result = createQuestionFeedbackSchema.safeParse({
      questionId: 'q1',
      type: 'ERROR_IN_ANSWER',
      message: 'La risposta B è identica alla C',
    });

    expect(result.success).toBe(true);
  });
});
