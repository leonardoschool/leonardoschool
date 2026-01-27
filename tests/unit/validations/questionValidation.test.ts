/**
 * Question Validation Tests
 *
 * Tests for Zod schemas and validation helpers for questions.
 */

import { describe, it, expect } from 'vitest';
import {
  QuestionTypeEnum,
  QuestionStatusEnum,
  DifficultyLevelEnum,
  OpenAnswerValidationTypeEnum,
  QuestionFeedbackTypeEnum,
  QuestionFeedbackStatusEnum,
  questionAnswerSchema,
  questionKeywordSchema,
  createQuestionSchema,
  updateQuestionSchema,
  questionFilterSchema,
  createQuestionFeedbackSchema,
  updateQuestionFeedbackSchema,
  importQuestionRowSchema,
  validateQuestionAnswers,
  validateQuestionKeywords,
  questionTypeLabels,
  questionStatusLabels,
  difficultyLabels,
  openValidationTypeLabels,
  feedbackTypeLabels,
  feedbackStatusLabels,
} from '@/lib/validations/questionValidation';

// ==================== ENUM TESTS ====================

describe('QuestionTypeEnum', () => {
  it('should accept valid question types', () => {
    expect(QuestionTypeEnum.parse('MULTIPLE_CHOICE')).toBe('MULTIPLE_CHOICE');
    expect(QuestionTypeEnum.parse('SINGLE_CHOICE')).toBe('SINGLE_CHOICE');
    expect(QuestionTypeEnum.parse('OPEN_TEXT')).toBe('OPEN_TEXT');
  });

  it('should reject invalid question types', () => {
    expect(() => QuestionTypeEnum.parse('TRUE_FALSE')).toThrow();
    expect(() => QuestionTypeEnum.parse('')).toThrow();
    expect(() => QuestionTypeEnum.parse('multiple_choice')).toThrow();
  });
});

describe('QuestionStatusEnum', () => {
  it('should accept valid statuses', () => {
    expect(QuestionStatusEnum.parse('DRAFT')).toBe('DRAFT');
    expect(QuestionStatusEnum.parse('PUBLISHED')).toBe('PUBLISHED');
    expect(QuestionStatusEnum.parse('ARCHIVED')).toBe('ARCHIVED');
  });

  it('should reject invalid statuses', () => {
    expect(() => QuestionStatusEnum.parse('ACTIVE')).toThrow();
    expect(() => QuestionStatusEnum.parse('deleted')).toThrow();
  });
});

describe('DifficultyLevelEnum', () => {
  it('should accept valid difficulty levels', () => {
    expect(DifficultyLevelEnum.parse('EASY')).toBe('EASY');
    expect(DifficultyLevelEnum.parse('MEDIUM')).toBe('MEDIUM');
    expect(DifficultyLevelEnum.parse('HARD')).toBe('HARD');
  });

  it('should reject invalid difficulty levels', () => {
    expect(() => DifficultyLevelEnum.parse('VERY_HARD')).toThrow();
    expect(() => DifficultyLevelEnum.parse('easy')).toThrow();
  });
});

describe('OpenAnswerValidationTypeEnum', () => {
  it('should accept valid validation types', () => {
    expect(OpenAnswerValidationTypeEnum.parse('MANUAL')).toBe('MANUAL');
    expect(OpenAnswerValidationTypeEnum.parse('KEYWORDS')).toBe('KEYWORDS');
    expect(OpenAnswerValidationTypeEnum.parse('BOTH')).toBe('BOTH');
  });

  it('should reject invalid validation types', () => {
    expect(() => OpenAnswerValidationTypeEnum.parse('AUTO')).toThrow();
  });
});

describe('QuestionFeedbackTypeEnum', () => {
  it('should accept all feedback types', () => {
    const types = ['ERROR_IN_QUESTION', 'ERROR_IN_ANSWER', 'UNCLEAR', 'SUGGESTION', 'OTHER'];
    types.forEach(type => {
      expect(QuestionFeedbackTypeEnum.parse(type)).toBe(type);
    });
  });
});

describe('QuestionFeedbackStatusEnum', () => {
  it('should accept all feedback statuses', () => {
    const statuses = ['PENDING', 'REVIEWED', 'FIXED', 'REJECTED'];
    statuses.forEach(status => {
      expect(QuestionFeedbackStatusEnum.parse(status)).toBe(status);
    });
  });
});

// ==================== ANSWER SCHEMA TESTS ====================

describe('questionAnswerSchema', () => {
  it('should accept valid answer', () => {
    const answer = {
      text: 'Roma',
      isCorrect: true,
    };
    const result = questionAnswerSchema.parse(answer);
    expect(result.text).toBe('Roma');
    expect(result.isCorrect).toBe(true);
  });

  it('should apply defaults', () => {
    const answer = { text: 'Test answer' };
    const result = questionAnswerSchema.parse(answer);
    expect(result.isCorrect).toBe(false);
    expect(result.order).toBe(0);
  });

  it('should accept full answer with all fields', () => {
    const answer = {
      id: 'ans-123',
      text: 'La capitale è Roma',
      textLatex: '\\text{Roma}',
      imageUrl: 'https://example.com/image.jpg',
      imageAlt: 'Map of Italy',
      isCorrect: true,
      explanation: 'Roma è stata la capitale dal 1871',
      order: 0,
      label: 'A',
    };
    const result = questionAnswerSchema.parse(answer);
    expect(result.label).toBe('A');
    expect(result.explanation).toBe('Roma è stata la capitale dal 1871');
  });

  it('should reject empty text', () => {
    expect(() => questionAnswerSchema.parse({ text: '' })).toThrow();
  });

  it('should reject invalid image URL', () => {
    expect(() => questionAnswerSchema.parse({ 
      text: 'Valid text', 
      imageUrl: 'not-a-url' 
    })).toThrow();
  });

  it('should accept null for optional fields', () => {
    const answer = {
      text: 'Answer text',
      textLatex: null,
      imageUrl: null,
      explanation: null,
    };
    const result = questionAnswerSchema.parse(answer);
    expect(result.textLatex).toBeNull();
  });
});

// ==================== KEYWORD SCHEMA TESTS ====================

describe('questionKeywordSchema', () => {
  it('should accept valid keyword', () => {
    const keyword = { keyword: 'democrazia' };
    const result = questionKeywordSchema.parse(keyword);
    expect(result.keyword).toBe('democrazia');
  });

  it('should apply defaults', () => {
    const keyword = { keyword: 'test' };
    const result = questionKeywordSchema.parse(keyword);
    expect(result.weight).toBe(1.0);
    expect(result.isRequired).toBe(false);
    expect(result.isSuggested).toBe(false);
    expect(result.caseSensitive).toBe(false);
    expect(result.exactMatch).toBe(false);
    expect(result.synonyms).toEqual([]);
  });

  it('should accept full keyword with all options', () => {
    const keyword = {
      id: 'kw-123',
      keyword: 'Repubblica',
      weight: 5.0,
      isRequired: true,
      isSuggested: false,
      caseSensitive: true,
      exactMatch: true,
      synonyms: ['Stato', 'Nazione'],
    };
    const result = questionKeywordSchema.parse(keyword);
    expect(result.weight).toBe(5.0);
    expect(result.isRequired).toBe(true);
    expect(result.synonyms).toEqual(['Stato', 'Nazione']);
  });

  it('should reject empty keyword', () => {
    expect(() => questionKeywordSchema.parse({ keyword: '' })).toThrow();
  });

  it('should reject weight out of range', () => {
    expect(() => questionKeywordSchema.parse({ keyword: 'test', weight: -1 })).toThrow();
    expect(() => questionKeywordSchema.parse({ keyword: 'test', weight: 11 })).toThrow();
  });

  it('should accept weight at boundaries', () => {
    expect(questionKeywordSchema.parse({ keyword: 'test', weight: 0 }).weight).toBe(0);
    expect(questionKeywordSchema.parse({ keyword: 'test', weight: 10 }).weight).toBe(10);
  });
});

// ==================== CREATE QUESTION SCHEMA TESTS ====================

describe('createQuestionSchema', () => {
  it('should accept minimal valid question', () => {
    const question = { text: 'Qual è la capitale dell\'Italia?' };
    const result = createQuestionSchema.parse(question);
    expect(result.text).toBe('Qual è la capitale dell\'Italia?');
    expect(result.type).toBe('SINGLE_CHOICE');
    expect(result.status).toBe('DRAFT');
    expect(result.difficulty).toBe('MEDIUM');
  });

  it('should apply all defaults', () => {
    const question = { text: 'Test question' };
    const result = createQuestionSchema.parse(question);
    
    expect(result.points).toBe(1.0);
    expect(result.negativePoints).toBe(0);
    expect(result.blankPoints).toBe(0);
    expect(result.openCaseSensitive).toBe(false);
    expect(result.openPartialMatch).toBe(true);
    expect(result.shuffleAnswers).toBe(false);
    expect(result.showExplanation).toBe(true);
    expect(result.tags).toEqual([]);
    expect(result.answers).toEqual([]);
    expect(result.keywords).toEqual([]);
  });

  it('should accept full question with all fields', () => {
    const question = {
      type: 'MULTIPLE_CHOICE' as const,
      status: 'PUBLISHED' as const,
      text: 'Quali sono i colori della bandiera italiana?',
      textLatex: null,
      description: 'Domanda sulla bandiera',
      imageUrl: 'https://example.com/flag.jpg',
      imageAlt: 'Bandiera italiana',
      subjectId: 'subj-1',
      topicId: 'topic-1',
      subTopicId: 'subtopic-1',
      difficulty: 'EASY' as const,
      points: 2.0,
      negativePoints: -0.5,
      blankPoints: 0,
      timeLimitSeconds: 60,
      correctExplanation: 'I colori sono verde, bianco e rosso',
      wrongExplanation: 'Ricontrolla i colori della bandiera',
      generalExplanation: 'La bandiera italiana...',
      explanationVideoUrl: 'https://youtube.com/video',
      explanationPdfUrl: 'https://example.com/doc.pdf',
      openValidationType: null,
      shuffleAnswers: true,
      showExplanation: true,
      tags: ['bandiera', 'italia'],
      year: 2024,
      source: 'Test ufficiale',
      externalId: 'EXT-001',
      answers: [
        { text: 'Verde', isCorrect: true },
        { text: 'Bianco', isCorrect: true },
        { text: 'Rosso', isCorrect: true },
        { text: 'Blu', isCorrect: false },
      ],
    };
    const result = createQuestionSchema.parse(question);
    expect(result.answers).toHaveLength(4);
    expect(result.shuffleAnswers).toBe(true);
  });

  it('should reject empty question text', () => {
    expect(() => createQuestionSchema.parse({ text: '' })).toThrow();
  });

  it('should reject invalid URLs', () => {
    expect(() => createQuestionSchema.parse({ 
      text: 'Valid question',
      imageUrl: 'not-a-url'
    })).toThrow();
  });

  it('should reject negative points that are positive', () => {
    expect(() => createQuestionSchema.parse({
      text: 'Valid question',
      negativePoints: 1 // Should be 0 or negative
    })).toThrow();
  });

  it('should reject invalid year', () => {
    expect(() => createQuestionSchema.parse({
      text: 'Valid question',
      year: 1800 // Min is 1900
    })).toThrow();
    expect(() => createQuestionSchema.parse({
      text: 'Valid question',
      year: 2200 // Max is 2100
    })).toThrow();
  });

  it('should accept year at boundaries', () => {
    expect(createQuestionSchema.parse({ text: 'Q', year: 1900 }).year).toBe(1900);
    expect(createQuestionSchema.parse({ text: 'Q', year: 2100 }).year).toBe(2100);
  });

  it('should reject negative time limit', () => {
    expect(() => createQuestionSchema.parse({
      text: 'Valid question',
      timeLimitSeconds: -1
    })).toThrow();
  });
});

// ==================== UPDATE QUESTION SCHEMA TESTS ====================

describe('updateQuestionSchema', () => {
  it('should require id', () => {
    expect(() => updateQuestionSchema.parse({ text: 'Updated text' })).toThrow();
  });

  it('should accept partial update with id', () => {
    const update = {
      id: 'q-123',
      text: 'Updated question text',
    };
    const result = updateQuestionSchema.parse(update);
    expect(result.id).toBe('q-123');
    expect(result.text).toBe('Updated question text');
    expect(result.type).toBeUndefined();
  });

  it('should accept change reason for versioning', () => {
    const update = {
      id: 'q-123',
      text: 'Corrected question',
      changeReason: 'Fixed typo in original question',
    };
    const result = updateQuestionSchema.parse(update);
    expect(result.changeReason).toBe('Fixed typo in original question');
  });

  it('should allow updating answers', () => {
    const update = {
      id: 'q-123',
      answers: [
        { text: 'New answer A', isCorrect: true },
        { text: 'New answer B', isCorrect: false },
      ],
    };
    const result = updateQuestionSchema.parse(update);
    expect(result.answers).toHaveLength(2);
  });
});

// ==================== FILTER SCHEMA TESTS ====================

describe('questionFilterSchema', () => {
  it('should apply pagination defaults', () => {
    const filter = {};
    const result = questionFilterSchema.parse(filter);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.sortBy).toBe('createdAt');
    expect(result.sortOrder).toBe('desc');
  });

  it('should accept all filter options', () => {
    const filter = {
      page: 2,
      pageSize: 50,
      search: 'capitale',
      subjectId: 'subj-1',
      topicId: 'topic-1',
      type: 'SINGLE_CHOICE' as const,
      status: 'PUBLISHED' as const,
      difficulty: 'EASY' as const,
      tags: ['storia'],
      tagIds: ['tag-1', 'tag-2'],
      year: 2024,
      sortBy: 'difficulty' as const,
      sortOrder: 'asc' as const,
      includeAnswers: true,
      includeDrafts: false,
      includeArchived: false,
    };
    const result = questionFilterSchema.parse(filter);
    expect(result.page).toBe(2);
    expect(result.search).toBe('capitale');
    expect(result.tagIds).toEqual(['tag-1', 'tag-2']);
  });

  it('should reject invalid page', () => {
    expect(() => questionFilterSchema.parse({ page: 0 })).toThrow();
    expect(() => questionFilterSchema.parse({ page: -1 })).toThrow();
  });

  it('should reject pageSize out of range', () => {
    expect(() => questionFilterSchema.parse({ pageSize: 0 })).toThrow();
    expect(() => questionFilterSchema.parse({ pageSize: 101 })).toThrow();
  });

  it('should accept valid sortBy values', () => {
    const sortByValues = ['createdAt', 'updatedAt', 'text', 'difficulty', 'timesUsed', 'avgCorrectRate'];
    sortByValues.forEach(sortBy => {
      const result = questionFilterSchema.parse({ sortBy });
      expect(result.sortBy).toBe(sortBy);
    });
  });

  it('should reject invalid sortBy', () => {
    expect(() => questionFilterSchema.parse({ sortBy: 'invalid' })).toThrow();
  });
});

// ==================== FEEDBACK SCHEMA TESTS ====================

describe('createQuestionFeedbackSchema', () => {
  it('should accept valid feedback', () => {
    const feedback = {
      questionId: 'q-123',
      type: 'ERROR_IN_ANSWER' as const,
      message: 'La risposta corretta indicata è sbagliata perché...',
    };
    const result = createQuestionFeedbackSchema.parse(feedback);
    expect(result.questionId).toBe('q-123');
    expect(result.type).toBe('ERROR_IN_ANSWER');
  });

  it('should reject short message', () => {
    expect(() => createQuestionFeedbackSchema.parse({
      questionId: 'q-123',
      type: 'ERROR_IN_QUESTION',
      message: 'Errore', // Less than 10 chars
    })).toThrow();
  });

  it('should accept message at minimum length', () => {
    const feedback = {
      questionId: 'q-123',
      type: 'OTHER' as const,
      message: 'Errore qui', // Exactly 10 chars
    };
    expect(createQuestionFeedbackSchema.parse(feedback).message).toBe('Errore qui');
  });

  it('should require all fields', () => {
    expect(() => createQuestionFeedbackSchema.parse({
      questionId: 'q-123',
      type: 'ERROR_IN_QUESTION',
      // missing message
    })).toThrow();
  });
});

describe('updateQuestionFeedbackSchema', () => {
  it('should accept valid update', () => {
    const update = {
      id: 'fb-123',
      status: 'FIXED' as const,
      adminResponse: 'Grazie, abbiamo corretto la domanda.',
    };
    const result = updateQuestionFeedbackSchema.parse(update);
    expect(result.status).toBe('FIXED');
    expect(result.adminResponse).toBe('Grazie, abbiamo corretto la domanda.');
  });

  it('should allow null adminResponse', () => {
    const update = {
      id: 'fb-123',
      status: 'REJECTED' as const,
      adminResponse: null,
    };
    const result = updateQuestionFeedbackSchema.parse(update);
    expect(result.adminResponse).toBeNull();
  });
});

// ==================== IMPORT SCHEMA TESTS ====================

describe('importQuestionRowSchema', () => {
  it('should accept minimal import row', () => {
    const row = { text: 'Qual è la capitale?' };
    const result = importQuestionRowSchema.parse(row);
    expect(result.text).toBe('Qual è la capitale?');
    expect(result.type).toBe('SINGLE_CHOICE');
  });

  it('should accept full import row', () => {
    const row = {
      text: 'Qual è la capitale dell\'Italia?',
      type: 'SINGLE_CHOICE' as const,
      subjectCode: 'GEO',
      topicName: 'Capitali europee',
      difficulty: 'EASY' as const,
      answerA: 'Roma',
      answerB: 'Milano',
      answerC: 'Napoli',
      answerD: 'Firenze',
      answerE: 'Venezia',
      correctAnswers: 'A',
      correctExplanation: 'Roma è la capitale dal 1871',
      points: 1.0,
      negativePoints: -0.25,
      tags: 'italia,capitali',
      year: 2024,
      source: 'Test ufficiale',
      externalId: 'IMP-001',
    };
    const result = importQuestionRowSchema.parse(row);
    expect(result.correctAnswers).toBe('A');
    expect(result.tags).toBe('italia,capitali');
  });

  it('should accept multiple correct answers', () => {
    const row = {
      text: 'Quali sono città italiane?',
      type: 'MULTIPLE_CHOICE' as const,
      answerA: 'Roma',
      answerB: 'Milano',
      answerC: 'Parigi',
      correctAnswers: 'A,B',
    };
    const result = importQuestionRowSchema.parse(row);
    expect(result.correctAnswers).toBe('A,B');
  });

  it('should accept keywords for open text', () => {
    const row = {
      text: 'Descrivi il sistema democratico italiano',
      type: 'OPEN_TEXT' as const,
      keywords: 'repubblica,parlamento,costituzione',
    };
    const result = importQuestionRowSchema.parse(row);
    expect(result.keywords).toBe('repubblica,parlamento,costituzione');
  });

  it('should reject empty text', () => {
    expect(() => importQuestionRowSchema.parse({ text: '' })).toThrow();
  });
});

// ==================== VALIDATION HELPER TESTS ====================

describe('validateQuestionAnswers', () => {
  describe('with OPEN_TEXT type', () => {
    it('should always be valid', () => {
      const result = validateQuestionAnswers('OPEN_TEXT', []);
      expect(result.valid).toBe(true);
    });

    it('should be valid even with answers', () => {
      const result = validateQuestionAnswers('OPEN_TEXT', [
        { text: 'Some answer', isCorrect: false, order: 0 },
      ]);
      expect(result.valid).toBe(true);
    });
  });

  describe('with SINGLE_CHOICE type', () => {
    it('should reject fewer than 2 answers', () => {
      const result = validateQuestionAnswers('SINGLE_CHOICE', [
        { text: 'Only one', isCorrect: true, order: 0 },
      ]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('almeno 2 risposte');
    });

    it('should reject zero correct answers', () => {
      const result = validateQuestionAnswers('SINGLE_CHOICE', [
        { text: 'Answer A', isCorrect: false, order: 0 },
        { text: 'Answer B', isCorrect: false, order: 1 },
      ]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('almeno una risposta corretta');
    });

    it('should reject multiple correct answers', () => {
      const result = validateQuestionAnswers('SINGLE_CHOICE', [
        { text: 'Answer A', isCorrect: true, order: 0 },
        { text: 'Answer B', isCorrect: true, order: 1 },
      ]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('solo una risposta corretta');
    });

    it('should accept exactly one correct answer', () => {
      const result = validateQuestionAnswers('SINGLE_CHOICE', [
        { text: 'Answer A', isCorrect: true, order: 0 },
        { text: 'Answer B', isCorrect: false, order: 1 },
      ]);
      expect(result.valid).toBe(true);
    });
  });

  describe('with MULTIPLE_CHOICE type', () => {
    it('should accept multiple correct answers', () => {
      const result = validateQuestionAnswers('MULTIPLE_CHOICE', [
        { text: 'Answer A', isCorrect: true, order: 0 },
        { text: 'Answer B', isCorrect: true, order: 1 },
        { text: 'Answer C', isCorrect: false, order: 2 },
      ]);
      expect(result.valid).toBe(true);
    });

    it('should reject fewer than 2 answers', () => {
      const result = validateQuestionAnswers('MULTIPLE_CHOICE', [
        { text: 'Only one', isCorrect: true, order: 0 },
      ]);
      expect(result.valid).toBe(false);
    });

    it('should reject zero correct answers', () => {
      const result = validateQuestionAnswers('MULTIPLE_CHOICE', [
        { text: 'A', isCorrect: false, order: 0 },
        { text: 'B', isCorrect: false, order: 1 },
      ]);
      expect(result.valid).toBe(false);
    });
  });
});

describe('validateQuestionKeywords', () => {
  describe('with non-OPEN_TEXT types', () => {
    it('should always be valid for SINGLE_CHOICE', () => {
      const result = validateQuestionKeywords('SINGLE_CHOICE', 'KEYWORDS', []);
      expect(result.valid).toBe(true);
    });

    it('should always be valid for MULTIPLE_CHOICE', () => {
      const result = validateQuestionKeywords('MULTIPLE_CHOICE', 'BOTH', []);
      expect(result.valid).toBe(true);
    });
  });

  describe('with OPEN_TEXT and MANUAL validation', () => {
    it('should be valid without keywords', () => {
      const result = validateQuestionKeywords('OPEN_TEXT', 'MANUAL', []);
      expect(result.valid).toBe(true);
    });
  });

  describe('with OPEN_TEXT and KEYWORDS validation', () => {
    it('should reject empty keywords', () => {
      const result = validateQuestionKeywords('OPEN_TEXT', 'KEYWORDS', []);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('almeno una keyword');
    });

    it('should reject keywords without any required', () => {
      const keywords = [
        { keyword: 'test', isRequired: false, weight: 1.0, isSuggested: false, caseSensitive: false, exactMatch: false, synonyms: [] },
      ];
      const result = validateQuestionKeywords('OPEN_TEXT', 'KEYWORDS', keywords);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('keyword obbligatoria');
    });

    it('should accept valid keywords with required', () => {
      const keywords = [
        { keyword: 'democrazia', isRequired: true, weight: 1.0, isSuggested: false, caseSensitive: false, exactMatch: false, synonyms: [] },
        { keyword: 'repubblica', isRequired: false, weight: 0.5, isSuggested: true, caseSensitive: false, exactMatch: false, synonyms: [] },
      ];
      const result = validateQuestionKeywords('OPEN_TEXT', 'KEYWORDS', keywords);
      expect(result.valid).toBe(true);
    });
  });

  describe('with OPEN_TEXT and BOTH validation', () => {
    it('should require keywords just like KEYWORDS mode', () => {
      const result = validateQuestionKeywords('OPEN_TEXT', 'BOTH', []);
      expect(result.valid).toBe(false);
    });

    it('should accept valid keywords', () => {
      const keywords = [
        { keyword: 'costituzione', isRequired: true, weight: 2.0, isSuggested: false, caseSensitive: false, exactMatch: false, synonyms: [] },
      ];
      const result = validateQuestionKeywords('OPEN_TEXT', 'BOTH', keywords);
      expect(result.valid).toBe(true);
    });
  });

  describe('with null/undefined validation type', () => {
    it('should be valid with null', () => {
      const result = validateQuestionKeywords('OPEN_TEXT', null, []);
      expect(result.valid).toBe(true);
    });

    it('should be valid with undefined', () => {
      const result = validateQuestionKeywords('OPEN_TEXT', undefined, []);
      expect(result.valid).toBe(true);
    });
  });
});

// ==================== LABEL TESTS ====================

describe('questionTypeLabels', () => {
  it('should have Italian labels for all types', () => {
    expect(questionTypeLabels.MULTIPLE_CHOICE).toBe('Risposta Multipla');
    expect(questionTypeLabels.SINGLE_CHOICE).toBe('Risposta Singola');
    expect(questionTypeLabels.OPEN_TEXT).toBe('Risposta Aperta');
  });

  it('should cover all enum values', () => {
    const enumValues = ['MULTIPLE_CHOICE', 'SINGLE_CHOICE', 'OPEN_TEXT'] as const;
    enumValues.forEach(value => {
      expect(questionTypeLabels[value]).toBeDefined();
      expect(typeof questionTypeLabels[value]).toBe('string');
    });
  });
});

describe('questionStatusLabels', () => {
  it('should have Italian labels for all statuses', () => {
    expect(questionStatusLabels.DRAFT).toBe('Bozza');
    expect(questionStatusLabels.PUBLISHED).toBe('Pubblicata');
    expect(questionStatusLabels.ARCHIVED).toBe('Archiviata');
  });
});

describe('difficultyLabels', () => {
  it('should have Italian labels for all difficulties', () => {
    expect(difficultyLabels.EASY).toBe('Facile');
    expect(difficultyLabels.MEDIUM).toBe('Media');
    expect(difficultyLabels.HARD).toBe('Difficile');
  });
});

describe('openValidationTypeLabels', () => {
  it('should have Italian labels', () => {
    expect(openValidationTypeLabels.MANUAL).toBe('Valutazione Manuale');
    expect(openValidationTypeLabels.KEYWORDS).toBe('Valutazione Automatica (Keywords)');
    expect(openValidationTypeLabels.BOTH).toBe('Automatica + Conferma Manuale');
  });
});

describe('feedbackTypeLabels', () => {
  it('should have Italian labels for all feedback types', () => {
    expect(feedbackTypeLabels.ERROR_IN_QUESTION).toBe('Errore nella domanda');
    expect(feedbackTypeLabels.ERROR_IN_ANSWER).toBe('Errore nelle risposte');
    expect(feedbackTypeLabels.UNCLEAR).toBe('Domanda poco chiara');
    expect(feedbackTypeLabels.SUGGESTION).toBe('Suggerimento');
    expect(feedbackTypeLabels.OTHER).toBe('Altro');
  });
});

describe('feedbackStatusLabels', () => {
  it('should have Italian labels for all feedback statuses', () => {
    expect(feedbackStatusLabels.PENDING).toBe('In attesa');
    expect(feedbackStatusLabels.REVIEWED).toBe('Revisionata');
    expect(feedbackStatusLabels.FIXED).toBe('Corretta');
    expect(feedbackStatusLabels.REJECTED).toBe('Rifiutata');
  });
});
