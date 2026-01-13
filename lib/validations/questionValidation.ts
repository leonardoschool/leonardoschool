// Question Validations
import { z } from 'zod';

// ==================== ENUMS ====================

export const QuestionTypeEnum = z.enum(['MULTIPLE_CHOICE', 'SINGLE_CHOICE', 'OPEN_TEXT']);
export type QuestionType = z.infer<typeof QuestionTypeEnum>;

export const QuestionStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export type QuestionStatus = z.infer<typeof QuestionStatusEnum>;

export const DifficultyLevelEnum = z.enum(['EASY', 'MEDIUM', 'HARD']);
export type DifficultyLevel = z.infer<typeof DifficultyLevelEnum>;

export const OpenAnswerValidationTypeEnum = z.enum(['MANUAL', 'KEYWORDS', 'BOTH']);
export type OpenAnswerValidationType = z.infer<typeof OpenAnswerValidationTypeEnum>;

export const QuestionFeedbackTypeEnum = z.enum([
  'ERROR_IN_QUESTION',
  'ERROR_IN_ANSWER',
  'UNCLEAR',
  'SUGGESTION',
  'OTHER',
]);
export type QuestionFeedbackType = z.infer<typeof QuestionFeedbackTypeEnum>;

export const QuestionFeedbackStatusEnum = z.enum(['PENDING', 'REVIEWED', 'FIXED', 'REJECTED']);
export type QuestionFeedbackStatus = z.infer<typeof QuestionFeedbackStatusEnum>;

// ==================== ANSWER SCHEMAS ====================

export const questionAnswerSchema = z.object({
  id: z.string().optional(), // Optional for new answers
  text: z.string().min(1, 'Il testo della risposta è obbligatorio'),
  textLatex: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  imageAlt: z.string().optional().nullable(),
  isCorrect: z.boolean().default(false),
  explanation: z.string().optional().nullable(),
  order: z.number().min(0).default(0),
  label: z.string().optional().nullable(),
});

export type QuestionAnswerInput = z.infer<typeof questionAnswerSchema>;

// ==================== KEYWORD SCHEMAS ====================

export const questionKeywordSchema = z.object({
  id: z.string().optional(),
  keyword: z.string().min(1, 'La keyword è obbligatoria'),
  weight: z.number().min(0).max(10).default(1.0),
  isRequired: z.boolean().default(false),
  isSuggested: z.boolean().default(false),
  caseSensitive: z.boolean().default(false),
  exactMatch: z.boolean().default(false),
  synonyms: z.array(z.string()).default([]),
});

export type QuestionKeywordInput = z.infer<typeof questionKeywordSchema>;

// ==================== QUESTION SCHEMAS ====================

// Base schema for question content
const questionBaseSchema = z.object({
  // Type & Status
  type: QuestionTypeEnum.default('SINGLE_CHOICE'),
  status: QuestionStatusEnum.default('DRAFT'),
  
  // Content
  text: z.string().min(1, 'Il testo della domanda è obbligatorio'),
  textLatex: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  imageAlt: z.string().optional().nullable(),
  
  // Categorization
  subjectId: z.string().optional().nullable(),
  topicId: z.string().optional().nullable(),
  subTopicId: z.string().optional().nullable(),
  difficulty: DifficultyLevelEnum.default('MEDIUM'),
  
  // Scoring
  points: z.number().min(0).default(1.0),
  negativePoints: z.number().max(0).default(0),
  blankPoints: z.number().default(0),
  
  // Timing
  timeLimitSeconds: z.number().min(0).optional().nullable(),
  
  // Explanations
  correctExplanation: z.string().optional().nullable(),
  wrongExplanation: z.string().optional().nullable(),
  generalExplanation: z.string().optional().nullable(),
  explanationVideoUrl: z.string().url().optional().nullable(),
  explanationPdfUrl: z.string().url().optional().nullable(),
  
  // Open Answer Validation
  openValidationType: OpenAnswerValidationTypeEnum.optional().nullable(),
  openMinLength: z.number().min(0).optional().nullable(),
  openMaxLength: z.number().min(0).optional().nullable(),
  openCaseSensitive: z.boolean().default(false),
  openPartialMatch: z.boolean().default(true),
  
  // Display Options
  shuffleAnswers: z.boolean().default(false),
  showExplanation: z.boolean().default(true),
  
  // Metadata
  tags: z.array(z.string()).default([]),
  year: z.number().min(1900).max(2100).optional().nullable(),
  source: z.string().optional().nullable(),
  externalId: z.string().optional().nullable(),
});

// Schema for creating a new question
export const createQuestionSchema = questionBaseSchema.extend({
  answers: z.array(questionAnswerSchema).optional().default([]),
  keywords: z.array(questionKeywordSchema).optional().default([]),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

// Schema for updating an existing question
export const updateQuestionSchema = questionBaseSchema.partial().extend({
  id: z.string(),
  answers: z.array(questionAnswerSchema).optional(),
  keywords: z.array(questionKeywordSchema).optional(),
  changeReason: z.string().optional(), // For versioning
});

export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;

// ==================== FILTER SCHEMAS ====================

export const questionFilterSchema = z.object({
  // Pagination
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  
  // Filters
  search: z.string().optional(),
  subjectId: z.string().optional(),
  topicId: z.string().optional(),
  subTopicId: z.string().optional(),
  type: QuestionTypeEnum.optional(),
  status: QuestionStatusEnum.optional(),
  difficulty: DifficultyLevelEnum.optional(),
  tags: z.array(z.string()).optional(), // Legacy tags filter
  tagIds: z.array(z.string()).optional(), // New QuestionTag IDs filter
  year: z.number().optional(),
  source: z.string().optional(),
  createdById: z.string().optional(),
  
  // Sorting
  sortBy: z.enum([
    'createdAt',
    'updatedAt',
    'text',
    'difficulty',
    'timesUsed',
    'avgCorrectRate',
  ]).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
  // Include options
  includeAnswers: z.boolean().default(false),
  includeDrafts: z.boolean().default(true),
  includeArchived: z.boolean().default(false),
});

export type QuestionFilterInput = z.infer<typeof questionFilterSchema>;

// ==================== FEEDBACK SCHEMAS ====================

export const createQuestionFeedbackSchema = z.object({
  questionId: z.string(),
  type: QuestionFeedbackTypeEnum,
  message: z.string().min(10, 'Descrivi il problema in almeno 10 caratteri'),
});

export type CreateQuestionFeedbackInput = z.infer<typeof createQuestionFeedbackSchema>;

export const updateQuestionFeedbackSchema = z.object({
  id: z.string(),
  status: QuestionFeedbackStatusEnum,
  adminResponse: z.string().optional().nullable(),
});

export type UpdateQuestionFeedbackInput = z.infer<typeof updateQuestionFeedbackSchema>;

// ==================== IMPORT/EXPORT SCHEMAS ====================

export const importQuestionRowSchema = z.object({
  // Required
  text: z.string().min(1),
  type: QuestionTypeEnum.default('SINGLE_CHOICE'),
  
  // Optional categorization
  subjectCode: z.string().optional(), // Will be matched to CustomSubject.code
  topicName: z.string().optional(),
  difficulty: DifficultyLevelEnum.optional(),
  
  // Answers (for multiple choice)
  answerA: z.string().optional(),
  answerB: z.string().optional(),
  answerC: z.string().optional(),
  answerD: z.string().optional(),
  answerE: z.string().optional(),
  correctAnswers: z.string().optional(), // "A" or "A,B,C" for multiple
  
  // Explanations
  correctExplanation: z.string().optional(),
  wrongExplanation: z.string().optional(),
  
  // Metadata
  points: z.number().optional(),
  negativePoints: z.number().optional(),
  tags: z.string().optional(), // Comma-separated
  year: z.number().optional(),
  source: z.string().optional(),
  externalId: z.string().optional(),
  
  // Keywords (for open text)
  keywords: z.string().optional(), // Comma-separated
});

export type ImportQuestionRow = z.infer<typeof importQuestionRowSchema>;

// ==================== VALIDATION HELPERS ====================

/**
 * Validates that a question has at least one correct answer if it's a choice type
 */
export function validateQuestionAnswers(
  type: QuestionType,
  answers: QuestionAnswerInput[]
): { valid: boolean; error?: string } {
  if (type === 'OPEN_TEXT') {
    return { valid: true };
  }
  
  if (answers.length < 2) {
    return { 
      valid: false, 
      error: 'Una domanda a risposta multipla deve avere almeno 2 risposte.' 
    };
  }
  
  const correctAnswers = answers.filter(a => a.isCorrect);
  
  if (correctAnswers.length === 0) {
    return { 
      valid: false, 
      error: 'Devi indicare almeno una risposta corretta.' 
    };
  }
  
  if (type === 'SINGLE_CHOICE' && correctAnswers.length > 1) {
    return { 
      valid: false, 
      error: 'Una domanda a risposta singola può avere solo una risposta corretta.' 
    };
  }
  
  return { valid: true };
}

/**
 * Validates keywords for open text questions
 */
export function validateQuestionKeywords(
  type: QuestionType,
  validationType: OpenAnswerValidationType | null | undefined,
  keywords: QuestionKeywordInput[]
): { valid: boolean; error?: string } {
  if (type !== 'OPEN_TEXT') {
    return { valid: true };
  }
  
  if (validationType === 'KEYWORDS' || validationType === 'BOTH') {
    if (keywords.length === 0) {
      return { 
        valid: false, 
        error: 'Devi inserire almeno una keyword per la validazione automatica.' 
      };
    }
    
    const requiredKeywords = keywords.filter(k => k.isRequired);
    if (requiredKeywords.length === 0) {
      return { 
        valid: false, 
        error: 'Devi avere almeno una keyword obbligatoria.' 
      };
    }
  }
  
  return { valid: true };
}

// ==================== UI LABELS ====================

export const questionTypeLabels: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'Risposta Multipla',
  SINGLE_CHOICE: 'Risposta Singola',
  OPEN_TEXT: 'Risposta Aperta',
};

export const questionStatusLabels: Record<QuestionStatus, string> = {
  DRAFT: 'Bozza',
  PUBLISHED: 'Pubblicata',
  ARCHIVED: 'Archiviata',
};

export const difficultyLabels: Record<DifficultyLevel, string> = {
  EASY: 'Facile',
  MEDIUM: 'Media',
  HARD: 'Difficile',
};

export const openValidationTypeLabels: Record<OpenAnswerValidationType, string> = {
  MANUAL: 'Valutazione Manuale',
  KEYWORDS: 'Valutazione Automatica (Keywords)',
  BOTH: 'Automatica + Conferma Manuale',
};

export const feedbackTypeLabels: Record<QuestionFeedbackType, string> = {
  ERROR_IN_QUESTION: 'Errore nella domanda',
  ERROR_IN_ANSWER: 'Errore nelle risposte',
  UNCLEAR: 'Domanda poco chiara',
  SUGGESTION: 'Suggerimento',
  OTHER: 'Altro',
};

export const feedbackStatusLabels: Record<QuestionFeedbackStatus, string> = {
  PENDING: 'In attesa',
  REVIEWED: 'Revisionata',
  FIXED: 'Corretta',
  REJECTED: 'Rifiutata',
};
