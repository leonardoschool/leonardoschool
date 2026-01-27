// Questions Router - Manage quiz questions
import { router, adminProcedure, staffProcedure, protectedProcedure, studentProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { secureShuffleArray } from '@/lib/utils';
import {
  createQuestionSchema,
  updateQuestionSchema,
  questionFilterSchema,
  createQuestionFeedbackSchema,
  updateQuestionFeedbackSchema,
  validateQuestionAnswers,
  validateQuestionKeywords,
  importQuestionRowSchema,
  QuestionFilterInput,
} from '@/lib/validations/questionValidation';
import {
  smartRandomGenerationSchema,
  getDifficultyRatios,
} from '@/lib/validations/simulationValidation';
import * as notificationService from '@/server/services/notificationService';

// ============ Helper Functions ============

/**
 * Build search conditions for question text search
 */
function buildSearchConditions(search: string | undefined): Record<string, unknown>[] {
  if (!search) return [];
  return [{
    OR: [
      { text: { contains: search, mode: 'insensitive' } },
      { legacyTags: { has: search } },
      { source: { contains: search, mode: 'insensitive' } },
    ],
  }];
}

/**
 * Build tag filter conditions
 */
function buildTagFilterConditions(tagIds: string[] | undefined): Record<string, unknown>[] {
  if (!tagIds || tagIds.length === 0) return [];
  return [{
    questionTags: {
      some: {
        tagId: { in: tagIds },
      },
    },
  }];
}

/**
 * Build basic filters for question where clause
 */
function buildQuestionBasicFilters(input: QuestionFilterInput): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  
  if (input.subjectId) where.subjectId = input.subjectId;
  if (input.topicId) where.topicId = input.topicId;
  if (input.subTopicId) where.subTopicId = input.subTopicId;
  if (input.type) where.type = input.type;
  if (input.difficulty) where.difficulty = input.difficulty;
  if (input.year) where.year = input.year;
  if (input.source) where.source = { contains: input.source, mode: 'insensitive' };
  if (input.createdById) where.createdById = input.createdById;
  if (input.tags && input.tags.length > 0) where.legacyTags = { hasEvery: input.tags };
  
  return where;
}

/**
 * Build status filter for questions
 */
function buildQuestionStatusFilter(
  status: string | undefined,
  includeDrafts: boolean | undefined,
  includeArchived: boolean | undefined
): { in: string[] } | string {
  if (status) return status;
  
  const statusIn: string[] = ['PUBLISHED'];
  if (includeDrafts) statusIn.push('DRAFT');
  if (includeArchived) statusIn.push('ARCHIVED');
  return { in: statusIn };
}

/**
 * Build optional relation update object (connect/disconnect)
 */
function buildRelationUpdate(
  value: string | null | undefined
): { connect: { id: string } } | { disconnect: true } | undefined {
  if (value === undefined) return undefined;
  if (value === null) return { disconnect: true };
  return { connect: { id: value } };
}

// Types for import helpers
type ImportAnswerData = { text: string; isCorrect: boolean; order: number; label: string };
type ImportKeywordData = {
  keyword: string;
  weight: number;
  isRequired: boolean;
  isSuggested: boolean;
  caseSensitive: boolean;
  exactMatch: boolean;
  synonyms: string[];
};

/**
 * Build answers array from import row
 */
function buildImportAnswers(
  answerA: string | undefined | null,
  answerB: string | undefined | null,
  answerC: string | undefined | null,
  answerD: string | undefined | null,
  answerE: string | undefined | null,
  correctAnswers: string | undefined | null
): ImportAnswerData[] {
  const answers: ImportAnswerData[] = [];
  const correctSet = new Set(
    (correctAnswers ?? '').toUpperCase().split(',').map(s => s.trim())
  );
  
  const answerTexts = [answerA, answerB, answerC, answerD, answerE];
  answerTexts.forEach((text, idx) => {
    if (text) {
      const label = String.fromCodePoint(65 + idx);
      answers.push({
        text,
        isCorrect: correctSet.has(label),
        order: idx,
        label,
      });
    }
  });
  
  return answers;
}

/**
 * Build keywords array from comma-separated string
 */
function buildImportKeywords(keywordsString: string | undefined | null): ImportKeywordData[] {
  if (!keywordsString) return [];
  
  return keywordsString.split(',').map(k => k.trim()).filter(Boolean).map(keyword => ({
    keyword,
    weight: 1,
    isRequired: false,
    isSuggested: false,
    caseSensitive: false,
    exactMatch: false,
    synonyms: [],
  }));
}

/**
 * Match subject ID from code
 */
function matchSubjectId(
  subjectCode: string | undefined | null,
  defaultSubjectId: string | undefined,
  subjectByCode: Map<string, string>
): string | undefined {
  if (!subjectCode) return defaultSubjectId;
  return subjectByCode.get(subjectCode.toUpperCase()) ?? defaultSubjectId;
}

/**
 * Match topic ID from name and subject
 */
function matchTopicId(
  topicName: string | undefined | null,
  subjectId: string | undefined,
  topics: Array<{ id: string; name: string; subjectId: string }>
): string | null {
  if (!topicName || !subjectId) return null;
  const matchedTopic = topics.find(
    t => t.subjectId === subjectId && t.name.toLowerCase() === topicName.toLowerCase()
  );
  return matchedTopic?.id ?? null;
}

/**
 * Build nested write for answers in Prisma create
 */
function buildAnswersNestedCreate(
  answers: ImportAnswerData[]
): { create: Array<{ text: string; isCorrect: boolean; order: number; label: string }> } | undefined {
  if (answers.length === 0) return undefined;
  return {
    create: answers.map(a => ({
      text: a.text,
      isCorrect: a.isCorrect,
      order: a.order,
      label: a.label,
    })),
  };
}

/**
 * Build nested write for keywords in Prisma create
 */
function buildKeywordsNestedCreate(
  keywords: ImportKeywordData[],
  createdById: string
): { create: Array<{
  keyword: string;
  weight: number;
  isRequired: boolean;
  isSuggested: boolean;
  caseSensitive: boolean;
  exactMatch: boolean;
  synonyms: string[];
  createdById: string;
}> } | undefined {
  if (keywords.length === 0) return undefined;
  return {
    create: keywords.map(k => ({
      keyword: k.keyword,
      weight: k.weight,
      isRequired: k.isRequired,
      isSuggested: k.isSuggested,
      caseSensitive: k.caseSensitive,
      exactMatch: k.exactMatch,
      synonyms: k.synonyms,
      createdById,
    })),
  };
}

/**
 * Parse comma-separated tags string
 */
function parseLegacyTags(tags: string | undefined | null): string[] {
  if (!tags) return [];
  return tags.split(',').map(t => t.trim());
}

// Type for subject with question count
type SubjectWithCount = {
  id: string;
  _count: { questions: number };
};

/**
 * Calculate proportional distribution based on available questions
 */
function calculateProportionalDistribution(
  subjects: SubjectWithCount[],
  totalQuestions: number
): Map<string, number> {
  const distribution = new Map<string, number>();
  const activeSubjects = subjects.filter(s => s._count.questions > 0);
  const totalAvailable = activeSubjects.reduce((sum, s) => sum + s._count.questions, 0);
  
  if (totalAvailable === 0) return distribution;
  
  let distributed = 0;
  activeSubjects.forEach((s, idx) => {
    const proportion = s._count.questions / totalAvailable;
    const count = idx === activeSubjects.length - 1
      ? totalQuestions - distributed // Last subject gets remainder
      : Math.round(proportion * totalQuestions);
    distribution.set(s.id, count);
    distributed += count;
  });
  
  return distribution;
}

/**
 * Calculate balanced distribution (equal per subject)
 */
function calculateBalancedDistribution(
  subjects: SubjectWithCount[],
  totalQuestions: number
): Map<string, number> {
  const distribution = new Map<string, number>();
  const activeSubjects = subjects.filter(s => s._count.questions > 0);
  
  if (activeSubjects.length === 0) return distribution;
  
  const perSubject = Math.floor(totalQuestions / activeSubjects.length);
  const remainder = totalQuestions % activeSubjects.length;
  activeSubjects.forEach((s, idx) => {
    distribution.set(s.id, perSubject + (idx < remainder ? 1 : 0));
  });
  
  return distribution;
}

/**
 * Calculate target distribution based on preset
 */
function calculateTargetDistribution(
  preset: string,
  subjects: SubjectWithCount[],
  totalQuestions: number,
  focusSubjectId?: string,
  customDistribution?: Record<string, number>
): Map<string, number> {
  switch (preset) {
    case 'PROPORTIONAL':
      return calculateProportionalDistribution(subjects, totalQuestions);
    case 'BALANCED':
      return calculateBalancedDistribution(subjects, totalQuestions);
    case 'SINGLE_SUBJECT':
      if (focusSubjectId) {
        return new Map([[focusSubjectId, totalQuestions]]);
      }
      return calculateProportionalDistribution(subjects, totalQuestions);
    case 'CUSTOM':
      if (customDistribution) {
        const dist = new Map<string, number>();
        for (const [subjectId, count] of Object.entries(customDistribution)) {
          if (count > 0) {
            dist.set(subjectId, count);
          }
        }
        return dist;
      }
      return calculateProportionalDistribution(subjects, totalQuestions);
    default:
      return calculateProportionalDistribution(subjects, totalQuestions);
  }
}

/**
 * Ensure distribution total matches requested total
 */
function normalizeDistributionTotal(
  distribution: Map<string, number>,
  targetTotal: number
): void {
  const currentTotal = Array.from(distribution.values()).reduce((a, b) => a + b, 0);
  if (currentTotal < targetTotal && distribution.size > 0) {
    const firstKey = Array.from(distribution.keys())[0];
    distribution.set(firstKey, (distribution.get(firstKey) || 0) + (targetTotal - currentTotal));
  }
}

/**
 * Build base where clause for question queries
 */
function buildSmartRandomBaseWhere(
  excludeQuestionIds?: string[],
  tagIds?: string[]
): Record<string, unknown> {
  const baseWhere: Record<string, unknown> = {
    status: 'PUBLISHED',
  };

  if (excludeQuestionIds && excludeQuestionIds.length > 0) {
    baseWhere.id = { notIn: excludeQuestionIds };
  }

  if (tagIds && tagIds.length > 0) {
    baseWhere.questionTags = {
      some: {
        tagId: { in: tagIds },
      },
    };
  }

  return baseWhere;
}

/**
 * Calculate difficulty targets for a given count
 */
function calculateDifficultyTargets(
  targetCount: number,
  ratios: { EASY: number; MEDIUM: number; HARD: number }
): { EASY: number; MEDIUM: number; HARD: number } {
  const targets = {
    EASY: Math.round(targetCount * ratios.EASY),
    MEDIUM: Math.round(targetCount * ratios.MEDIUM),
    HARD: Math.round(targetCount * ratios.HARD),
  };

  // Ensure we get exactly targetCount
  const diffTotal = targets.EASY + targets.MEDIUM + targets.HARD;
  if (diffTotal < targetCount) {
    targets.MEDIUM += targetCount - diffTotal;
  } else if (diffTotal > targetCount) {
    // Reduce from hard first, then medium
    const excess = diffTotal - targetCount;
    if (targets.HARD >= excess) {
      targets.HARD -= excess;
    } else {
      targets.MEDIUM -= (excess - targets.HARD);
      targets.HARD = 0;
    }
  }

  return targets;
}

/**
 * Build order by clause for smart question selection
 */
function buildSmartOrderBy(
  avoidRecentlyUsed: boolean,
  preferRecentQuestions: boolean,
  maximizeTopicCoverage: boolean
): Array<{ [key: string]: 'asc' | 'desc' }> {
  const orderBy: Array<{ [key: string]: 'asc' | 'desc' }> = [];
  
  if (avoidRecentlyUsed) {
    orderBy.push({ timesUsed: 'asc' });
  }
  if (preferRecentQuestions) {
    orderBy.push({ createdAt: 'desc' });
  }
  if (maximizeTopicCoverage) {
    orderBy.push({ topicId: 'asc' });
  }
  orderBy.push({ id: 'asc' }); // Stable fallback
  
  return orderBy;
}

// Type for question with topic for topic coverage
type QuestionWithTopic = {
  id: string;
  topicId: string | null;
  [key: string]: unknown;
};

/**
 * Apply topic coverage maximization - round robin pick from topics
 */
function applyTopicCoverage<T extends QuestionWithTopic>(
  questions: T[],
  targetCount: number
): T[] {
  if (questions.length <= targetCount) return questions;
  
  // Group by topic
  const byTopic = new Map<string | null, T[]>();
  for (const q of questions) {
    const topicId = q.topicId;
    if (!byTopic.has(topicId)) {
      byTopic.set(topicId, []);
    }
    byTopic.get(topicId)?.push(q);
  }

  // Round-robin pick from topics
  const result: T[] = [];
  const topicIterators = Array.from(byTopic.values()).map(arr => ({ arr, idx: 0 }));
  let topicIdx = 0;
  
  while (result.length < targetCount && topicIterators.some(t => t.idx < t.arr.length)) {
    const iterator = topicIterators[topicIdx % topicIterators.length];
    if (iterator.idx < iterator.arr.length) {
      result.push(iterator.arr[iterator.idx]);
      iterator.idx++;
    }
    topicIdx++;
  }
  
  return result;
}

// Selected question type for smart generation
type SmartSelectedQuestion = {
  questionId: string;
  order: number;
  question: {
    id: string;
    text: string;
    type: string;
    difficulty: string;
    subject?: { id: string; name: string; color: string | null };
    topic?: { id: string; name: string };
  };
};

// Type for question data from Prisma query
type QuestionQueryResult = {
  id: string;
  text: string;
  type: string;
  difficulty: string;
  topicId: string | null;
  timesUsed?: number;
  createdAt?: Date;
  subject: { id: string; name: string; color: string | null } | null;
  topic: { id: string; name: string } | null;
};

/**
 * Transform question query result to selected question format
 */
function transformToSelectedQuestion(
  q: QuestionQueryResult,
  order: number
): SmartSelectedQuestion {
  return {
    questionId: q.id,
    order,
    question: {
      id: q.id,
      text: q.text,
      type: q.type,
      difficulty: q.difficulty,
      subject: q.subject ?? undefined,
      topic: q.topic ?? undefined,
    },
  };
}

// Configuration for question selection
type SelectionConfig = {
  baseWhere: Record<string, unknown>;
  difficultyRatios: { EASY: number; MEDIUM: number; HARD: number };
  avoidRecentlyUsed: boolean;
  preferRecentQuestions: boolean;
  maximizeTopicCoverage: boolean;
};

// Common select clause for question queries
const questionSelectClause = {
  id: true,
  text: true,
  type: true,
  difficulty: true,
  topicId: true,
  timesUsed: true,
  createdAt: true,
  subject: {
    select: { id: true, name: true, color: true },
  },
  topic: {
    select: { id: true, name: true },
  },
};

/**
 * Select questions for a specific difficulty level
 */
async function selectQuestionsForDifficulty(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any,
  subjectId: string,
  difficulty: string,
  count: number,
  excludeIds: string[],
  config: SelectionConfig
): Promise<{ questions: SmartSelectedQuestion[]; selectedIds: string[]; orderStart: number }> {
  const orderByClause = buildSmartOrderBy(
    config.avoidRecentlyUsed,
    config.preferRecentQuestions,
    config.maximizeTopicCoverage
  );

  const questions = await prisma.question.findMany({
    where: {
      ...config.baseWhere,
      subjectId,
      difficulty: difficulty as 'EASY' | 'MEDIUM' | 'HARD',
      id: { notIn: excludeIds },
    },
    take: count * 3, // Get more than needed for shuffling
    orderBy: orderByClause,
    select: questionSelectClause,
  });

  // Apply topic coverage maximization using helper
  const finalQuestions = config.maximizeTopicCoverage
    ? applyTopicCoverage(questions, count)
    : questions;

  // Shuffle and take only what we need
  const shuffled = secureShuffleArray(finalQuestions);
  const picked = shuffled.slice(0, count);

  const selectedIds = picked.map((q: QuestionQueryResult) => q.id);
  const selectedQuestions = picked.map((q: QuestionQueryResult, idx: number) => transformToSelectedQuestion(q, idx));

  return { questions: selectedQuestions, selectedIds, orderStart: picked.length };
}

/**
 * Fill remaining questions when target not met
 */
async function fillRemainingQuestions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any,
  subjectId: string,
  remainingNeeded: number,
  excludeIds: string[],
  config: SelectionConfig,
  startOrder: number
): Promise<{ questions: SmartSelectedQuestion[]; selectedIds: string[] }> {
  const remainingTargets = calculateRemainingDifficultyTargets(remainingNeeded, config.difficultyRatios);
  const allQuestions: SmartSelectedQuestion[] = [];
  const allIds: string[] = [];
  let orderCounter = startOrder;

  const difficultyEntries = Object.entries(remainingTargets).filter(([, count]) => count > 0);

  for (const [difficulty, count] of difficultyEntries) {
    const extraQuestions = await prisma.question.findMany({
      where: {
        ...config.baseWhere,
        subjectId,
        difficulty: difficulty as 'EASY' | 'MEDIUM' | 'HARD',
        id: { notIn: [...excludeIds, ...allIds] },
      },
      take: count,
      orderBy: config.avoidRecentlyUsed ? { timesUsed: 'asc' } : { createdAt: 'desc' },
      select: questionSelectClause,
    });

    for (const q of extraQuestions) {
      allIds.push(q.id);
      allQuestions.push(transformToSelectedQuestion(q, orderCounter++));
    }
  }

  return { questions: allQuestions, selectedIds: allIds };
}

/**
 * Calculate remaining difficulty targets for fill-gap logic
 */
function calculateRemainingDifficultyTargets(
  remainingNeeded: number,
  ratios: { EASY: number; MEDIUM: number; HARD: number }
): { EASY: number; MEDIUM: number; HARD: number } {
  const targets = {
    EASY: Math.round(remainingNeeded * ratios.EASY),
    MEDIUM: Math.round(remainingNeeded * ratios.MEDIUM),
    HARD: Math.round(remainingNeeded * ratios.HARD),
  };

  // Ensure total matches
  const diffTotal = targets.EASY + targets.MEDIUM + targets.HARD;
  if (diffTotal < remainingNeeded) {
    targets.MEDIUM += remainingNeeded - diffTotal;
  }

  return targets;
}

/**
 * Calculate statistics for generated questions
 */
function calculateGenerationStats(questions: SmartSelectedQuestion[]): {
  total: number;
  bySubject: Record<string, { name: string; count: number; color: string | null }>;
  byDifficulty: Record<string, number>;
  topicsCovered: number;
} {
  const bySubject: Record<string, { name: string; count: number; color: string | null }> = {};
  const byDifficulty: Record<string, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
  const topicsSet = new Set<string>();

  for (const q of questions) {
    // Subject stats
    const subjectName = q.question.subject?.name || 'Sconosciuta';
    if (!bySubject[subjectName]) {
      bySubject[subjectName] = { 
        name: subjectName, 
        count: 0, 
        color: q.question.subject?.color || null 
      };
    }
    bySubject[subjectName].count++;

    // Difficulty stats
    byDifficulty[q.question.difficulty]++;

    // Topic coverage
    if (q.question.topic) {
      topicsSet.add(q.question.topic.id);
    }
  }

  return {
    total: questions.length,
    bySubject,
    byDifficulty,
    topicsCovered: topicsSet.size,
  };
}

export const questionsRouter = router({
  // ==================== QUESTION CRUD ====================

  // Get paginated questions list
  getQuestions: staffProcedure
    .input(questionFilterSchema)
    .query(async ({ ctx, input }) => {
      const { page, pageSize, sortBy, sortOrder, includeAnswers } = input;

      // Build where clause using helpers
      const where = buildQuestionBasicFilters(input);
      const andConditions: Record<string, unknown>[] = [
        ...buildSearchConditions(input.search),
        ...buildTagFilterConditions(input.tagIds),
      ];

      // Status filter
      where.status = buildQuestionStatusFilter(input.status, input.includeDrafts, input.includeArchived);

      // Combine AND conditions if any
      if (andConditions.length > 0) {
        where.AND = andConditions;
      }

      // Count total
      const total = await ctx.prisma.question.count({ where });

      // Get questions
      const questions = await ctx.prisma.question.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          subject: {
            select: { id: true, name: true, code: true, color: true, icon: true },
          },
          topic: {
            select: { id: true, name: true },
          },
          subTopic: {
            select: { id: true, name: true },
          },
          createdBy: {
            select: { id: true, name: true, role: true },
          },
          answers: includeAnswers ? {
            orderBy: { order: 'asc' },
          } : false,
          questionTags: {
            include: {
              tag: {
                select: { id: true, name: true, color: true, category: { select: { id: true, name: true, color: true } } },
              },
            },
          },
          _count: {
            select: {
              answers: true,
              feedbacks: true,
              favorites: true,
              simulationQuestions: true,
            },
          },
        },
      });

      return {
        questions,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Get single question with all details
  getQuestion: staffProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const question = await ctx.prisma.question.findUnique({
        where: { id: input.id },
        include: {
          subject: true,
          topic: {
            include: { subTopics: { where: { isActive: true }, orderBy: { order: 'asc' } } },
          },
          subTopic: true,
          answers: { orderBy: { order: 'asc' } },
          keywords: { orderBy: { weight: 'desc' } },
          questionTags: {
            include: {
              tag: {
                include: {
                  category: { select: { id: true, name: true, color: true } },
                },
              },
            },
            orderBy: { assignedAt: 'asc' },
          },
          feedbacks: {
            include: { student: { include: { user: { select: { name: true, email: true } } } } },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          versions: {
            orderBy: { version: 'desc' },
            take: 5,
          },
          _count: {
            select: {
              favorites: true,
              simulationQuestions: true,
              openAnswerSubmissions: true,
            },
          },
        },
      });

      if (!question) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Domanda non trovata.',
        });
      }

      // Collaborator can only see their own questions or published ones
      if (ctx.user.role === 'COLLABORATOR' && 
          question.createdById !== ctx.user.id && 
          question.status !== 'PUBLISHED') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non hai i permessi per visualizzare questa domanda.',
        });
      }

      return question;
    }),

  // Get multiple questions with answers (for PDF generation)
  getQuestionsWithAnswers: staffProcedure
    .input(z.object({
      questionIds: z.array(z.string()).min(1).max(100),
    }))
    .query(async ({ ctx, input }) => {
      const questions = await ctx.prisma.question.findMany({
        where: {
          id: { in: input.questionIds },
        },
        include: {
          answers: {
            orderBy: { order: 'asc' },
          },
          subject: true,
          topic: true,
          subTopic: true,
        },
      });

      // Maintain the order of questionIds
      const orderedQuestions = input.questionIds
        .map(id => questions.find(q => q.id === id))
        .filter((q): q is NonNullable<typeof q> => q !== undefined);

      return orderedQuestions;
    }),

  // Create a new question
  createQuestion: staffProcedure
    .input(createQuestionSchema)
    .mutation(async ({ ctx, input }) => {
      const { answers, keywords, ...questionData } = input;

      // Validate answers
      const answersValidation = validateQuestionAnswers(questionData.type, answers);
      if (!answersValidation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: answersValidation.error,
        });
      }

      // Validate keywords for open text
      const keywordsValidation = validateQuestionKeywords(
        questionData.type,
        questionData.openValidationType,
        keywords
      );
      if (!keywordsValidation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: keywordsValidation.error,
        });
      }

      // Create question with answers and keywords using nested writes
      const question = await ctx.prisma.question.create({
        data: {
          type: questionData.type,
          status: questionData.status,
          text: questionData.text,
          textLatex: questionData.textLatex,
          description: questionData.description,
          imageUrl: questionData.imageUrl,
          imageAlt: questionData.imageAlt,
          subjectId: questionData.subjectId,
          topicId: questionData.topicId,
          subTopicId: questionData.subTopicId,
          difficulty: questionData.difficulty,
          points: questionData.points,
          negativePoints: questionData.negativePoints,
          blankPoints: questionData.blankPoints,
          timeLimitSeconds: questionData.timeLimitSeconds,
          correctExplanation: questionData.correctExplanation,
          wrongExplanation: questionData.wrongExplanation,
          generalExplanation: questionData.generalExplanation,
          explanationVideoUrl: questionData.explanationVideoUrl,
          explanationPdfUrl: questionData.explanationPdfUrl,
          openValidationType: questionData.openValidationType,
          openMinLength: questionData.openMinLength,
          openMaxLength: questionData.openMaxLength,
          openCaseSensitive: questionData.openCaseSensitive,
          openPartialMatch: questionData.openPartialMatch,
          shuffleAnswers: questionData.shuffleAnswers,
          showExplanation: questionData.showExplanation,
          legacyTags: questionData.tags,
          year: questionData.year,
          source: questionData.source,
          externalId: questionData.externalId,
          createdById: ctx.user.id,
          updatedById: ctx.user.id,
          publishedAt: questionData.status === 'PUBLISHED' ? new Date() : null,
          // Create answers with nested write
          ...(answers && answers.length > 0 ? {
            answers: {
              create: answers.map((answer, index) => ({
                text: answer.text,
                textLatex: answer.textLatex ?? null,
                imageUrl: answer.imageUrl ?? null,
                imageAlt: answer.imageAlt ?? null,
                isCorrect: answer.isCorrect ?? false,
                explanation: answer.explanation ?? null,
                order: answer.order ?? index,
                label: answer.label ?? String.fromCodePoint(65 + index),
              })),
            }
          } : {}),
          // Create keywords with nested write
          ...(keywords && keywords.length > 0 ? {
            keywords: {
              create: keywords.map((keyword) => ({
                keyword: keyword.keyword,
                weight: keyword.weight ?? 1,
                isRequired: keyword.isRequired ?? false,
                isSuggested: keyword.isSuggested ?? false,
                caseSensitive: keyword.caseSensitive ?? false,
                exactMatch: keyword.exactMatch ?? false,
                synonyms: keyword.synonyms ?? [],
                createdById: ctx.user.id,
              })),
            }
          } : {}),
        },
      });

      return ctx.prisma.question.findUnique({
        where: { id: question.id },
        include: {
          subject: true,
          topic: true,
          subTopic: true,
          answers: { orderBy: { order: 'asc' } },
          keywords: true,
        },
      });
    }),

  // Update an existing question
  updateQuestion: staffProcedure
    .input(updateQuestionSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, answers, keywords, changeReason, ...questionData } = input;

      // Get current question
      const currentQuestion = await ctx.prisma.question.findUnique({
        where: { id },
        include: { answers: true, keywords: true },
      });

      if (!currentQuestion) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Domanda non trovata.',
        });
      }

      // Check permission for collaborators
      if (ctx.user.role === 'COLLABORATOR' && currentQuestion.createdById !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Puoi modificare solo le domande che hai creato.',
        });
      }

      // Validate answers if provided
      if (answers) {
        const type = questionData.type ?? currentQuestion.type;
        const answersValidation = validateQuestionAnswers(type, answers);
        if (!answersValidation.valid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: answersValidation.error,
          });
        }
      }

      // Validate keywords if provided
      if (keywords) {
        const type = questionData.type ?? currentQuestion.type;
        const validationType = questionData.openValidationType ?? currentQuestion.openValidationType;
        const keywordsValidation = validateQuestionKeywords(type, validationType, keywords);
        if (!keywordsValidation.valid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: keywordsValidation.error,
          });
        }
      }

      // Update using sequential operations with callback transaction (using ctx.prisma inside)
      const updatedQuestion = await ctx.prisma.$transaction(async () => {
        // Create version snapshot before update
        const snapshotData = structuredClone({
          ...currentQuestion,
          answers: currentQuestion.answers,
          keywords: currentQuestion.keywords,
        });
        
        await ctx.prisma.questionVersion.create({
          data: {
            questionId: id,
            version: currentQuestion.version,
            snapshot: snapshotData,
            changeReason: changeReason ?? null,
            changedById: ctx.user.id,
          },
        });

        // Delete answers if provided (before update to avoid foreign key issues)
        if (answers) {
          await ctx.prisma.questionAnswer.deleteMany({ where: { questionId: id } });
        }

        // Delete keywords if provided
        if (keywords) {
          await ctx.prisma.questionKeyword.deleteMany({ where: { questionId: id } });
        }

        // Extract relation IDs and legacy tags from questionData
        const { subjectId, topicId, subTopicId, tags, ...restData } = questionData;

        // Update question with nested creates for answers and keywords
        const updated = await ctx.prisma.question.update({
          where: { id },
          data: {
            ...restData,
            // Handle subject/topic/subTopic relations using helper
            subject: buildRelationUpdate(subjectId),
            topic: buildRelationUpdate(topicId),
            subTopic: buildRelationUpdate(subTopicId),
            // Handle legacy tags
            legacyTags: tags,
            updatedById: ctx.user.id,
            version: { increment: 1 },
            publishedAt: restData.status === 'PUBLISHED' && !currentQuestion.publishedAt
              ? new Date()
              : currentQuestion.publishedAt,
            archivedAt: restData.status === 'ARCHIVED' ? new Date() : null,
            // Create new answers with nested write
            ...(answers ? {
              answers: {
                create: answers.map((answer, index) => ({
                  text: answer.text,
                  textLatex: answer.textLatex ?? null,
                  imageUrl: answer.imageUrl ?? null,
                  imageAlt: answer.imageAlt ?? null,
                  isCorrect: answer.isCorrect ?? false,
                  explanation: answer.explanation ?? null,
                  order: answer.order ?? index,
                  label: answer.label ?? String.fromCodePoint(65 + index),
                })),
              }
            } : {}),
            // Create new keywords with nested write
            ...(keywords ? {
              keywords: {
                create: keywords.map((keyword) => ({
                  keyword: keyword.keyword,
                  weight: keyword.weight ?? 1,
                  isRequired: keyword.isRequired ?? false,
                  isSuggested: keyword.isSuggested ?? false,
                  caseSensitive: keyword.caseSensitive ?? false,
                  exactMatch: keyword.exactMatch ?? false,
                  synonyms: keyword.synonyms ?? [],
                  createdById: ctx.user.id,
                })),
              }
            } : {}),
          },
        });

        return updated;
      });

      return ctx.prisma.question.findUnique({
        where: { id: updatedQuestion.id },
        include: {
          subject: true,
          topic: true,
          subTopic: true,
          answers: { orderBy: { order: 'asc' } },
          keywords: true,
        },
      });
    }),

  // Delete a question
  deleteQuestion: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const question = await ctx.prisma.question.findUnique({
        where: { id: input.id },
        include: {
          _count: { select: { simulationQuestions: true } },
        },
      });

      if (!question) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Domanda non trovata.',
        });
      }

      // Check permission for collaborators
      if (ctx.user.role === 'COLLABORATOR' && question.createdById !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Puoi eliminare solo le domande che hai creato.',
        });
      }

      // Check if question is used in simulations
      if (question._count.simulationQuestions > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Questa domanda è usata in ${question._count.simulationQuestions} simulazioni. Archiviala invece di eliminarla.`,
        });
      }

      await ctx.prisma.question.delete({ where: { id: input.id } });

      return { success: true };
    }),

  // Archive/Unarchive a question
  archiveQuestion: staffProcedure
    .input(z.object({
      id: z.string(),
      archive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const question = await ctx.prisma.question.findUnique({
        where: { id: input.id },
      });

      if (!question) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Domanda non trovata.',
        });
      }

      if (ctx.user.role === 'COLLABORATOR' && question.createdById !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Puoi archiviare solo le domande che hai creato.',
        });
      }

      return ctx.prisma.question.update({
        where: { id: input.id },
        data: {
          status: input.archive ? 'ARCHIVED' : 'DRAFT',
          archivedAt: input.archive ? new Date() : null,
          updatedById: ctx.user.id,
        },
      });
    }),

  // Publish/Unpublish a question
  publishQuestion: staffProcedure
    .input(z.object({
      id: z.string(),
      publish: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const question = await ctx.prisma.question.findUnique({
        where: { id: input.id },
        include: { answers: true, keywords: true },
      });

      if (!question) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Domanda non trovata.',
        });
      }

      // Only admin can publish/unpublish
      if (ctx.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Solo gli amministratori possono pubblicare domande.',
        });
      }

      // Validate before publishing
      if (input.publish) {
        const answersValidation = validateQuestionAnswers(question.type, question.answers);
        if (!answersValidation.valid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: answersValidation.error,
          });
        }

        const keywordsValidation = validateQuestionKeywords(
          question.type,
          question.openValidationType,
          question.keywords
        );
        if (!keywordsValidation.valid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: keywordsValidation.error,
          });
        }
      }

      return ctx.prisma.question.update({
        where: { id: input.id },
        data: {
          status: input.publish ? 'PUBLISHED' : 'DRAFT',
          publishedAt: input.publish ? (question.publishedAt ?? new Date()) : question.publishedAt,
          updatedById: ctx.user.id,
        },
      });
    }),

  // Duplicate a question
  duplicateQuestion: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const original = await ctx.prisma.question.findUnique({
        where: { id: input.id },
        include: { answers: true, keywords: true },
      });

      if (!original) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Domanda non trovata.',
        });
      }

      // Create duplicate using nested writes - destructure to exclude fields that shouldn't be copied
      /* eslint-disable sonarjs/no-unused-vars -- Destructuring to exclude fields */
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, publishedAt: _publishedAt, archivedAt: _archivedAt, version: _version, 
              timesUsed: _timesUsed, timesAnswered: _timesAnswered, timesCorrect: _timesCorrect, timesWrong: _timesWrong, timesSkipped: _timesSkipped,
              avgTimeSeconds: _avgTimeSeconds, avgCorrectRate: _avgCorrectRate, answers, keywords, ...questionData } = original;
      /* eslint-enable sonarjs/no-unused-vars */

      const duplicate = await ctx.prisma.question.create({
        data: {
          ...questionData,
          text: `${original.text} (copia)`,
          status: 'DRAFT',
          createdById: ctx.user.id,
          updatedById: ctx.user.id,
          // Duplicate answers with nested write
          ...(answers.length > 0 ? {
            answers: {
              create: answers.map((a) => ({
                text: a.text,
                textLatex: a.textLatex,
                imageUrl: a.imageUrl,
                imageAlt: a.imageAlt,
                isCorrect: a.isCorrect,
                explanation: a.explanation,
                order: a.order,
                label: a.label,
              })),
            }
          } : {}),
          // Duplicate keywords with nested write
          ...(keywords.length > 0 ? {
            keywords: {
              create: keywords.map((k) => ({
                keyword: k.keyword,
                weight: k.weight,
                isRequired: k.isRequired,
                isSuggested: k.isSuggested,
                caseSensitive: k.caseSensitive,
                exactMatch: k.exactMatch,
                synonyms: k.synonyms,
                createdById: ctx.user.id,
              })),
            }
          } : {}),
        },
      });

      return ctx.prisma.question.findUnique({
        where: { id: duplicate.id },
        include: {
          subject: true,
          topic: true,
          subTopic: true,
          answers: { orderBy: { order: 'asc' } },
          keywords: true,
        },
      });
    }),

  // ==================== BULK OPERATIONS ====================

  // Bulk update status
  bulkUpdateStatus: adminProcedure
    .input(z.object({
      ids: z.array(z.string()),
      status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
    }))
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {
        status: input.status,
        updatedById: ctx.user.id,
      };

      if (input.status === 'PUBLISHED') {
        updateData.publishedAt = new Date();
      } else if (input.status === 'ARCHIVED') {
        updateData.archivedAt = new Date();
      }

      const result = await ctx.prisma.question.updateMany({
        where: { id: { in: input.ids } },
        data: updateData,
      });

      return { updated: result.count };
    }),

  // Bulk add tags to questions
  bulkAddTags: adminProcedure
    .input(z.object({
      ids: z.array(z.string()),
      tagIds: z.array(z.string()),
      mode: z.enum(['add', 'remove']).default('add'),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify tags exist
      const tags = await ctx.prisma.questionTag.findMany({
        where: { id: { in: input.tagIds } },
        select: { id: true, name: true },
      });

      if (tags.length !== input.tagIds.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Uno o più tag non trovati.',
        });
      }

      if (input.mode === 'remove') {
        // Remove selected tags from selected questions
        await ctx.prisma.questionTagAssignment.deleteMany({
          where: { 
            questionId: { in: input.ids },
            tagId: { in: input.tagIds },
          },
        });
      } else {
        // Add mode: Create new associations (skip duplicates)
        const associations = input.ids.flatMap(questionId =>
          input.tagIds.map(tagId => ({
            questionId,
            tagId,
          }))
        );

        await ctx.prisma.questionTagAssignment.createMany({
          data: associations,
          skipDuplicates: true,
        });
      }

      // Update questions' updatedById
      await ctx.prisma.question.updateMany({
        where: { id: { in: input.ids } },
        data: { updatedById: ctx.user.id },
      });

      return { 
        updated: input.ids.length,
        tags: tags.map(t => t.name).join(', '),
        mode: input.mode,
      };
    }),

  // Bulk update subject
  bulkUpdateSubject: adminProcedure
    .input(z.object({
      ids: z.array(z.string()),
      subjectId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify subject exists
      const subject = await ctx.prisma.customSubject.findUnique({
        where: { id: input.subjectId },
      });

      if (!subject) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Materia non trovata.',
        });
      }

      // When changing subject, we need to clear topicId and subTopicId
      // since topics are subject-specific
      const result = await ctx.prisma.question.updateMany({
        where: { id: { in: input.ids } },
        data: {
          subjectId: input.subjectId,
          topicId: null,
          subTopicId: null,
          updatedById: ctx.user.id,
        },
      });

      return { updated: result.count, subjectName: subject.name };
    }),

  // Bulk delete
  bulkDelete: adminProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      // Check if any question is used in simulations
      const questionsInUse = await ctx.prisma.simulationQuestion.findMany({
        where: { questionId: { in: input.ids } },
        select: { questionId: true },
      });

      const inUseIds = new Set(questionsInUse.map(q => q.questionId));
      const deletableIds = input.ids.filter(id => !inUseIds.has(id));

      if (deletableIds.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Tutte le domande selezionate sono in uso in simulazioni.',
        });
      }

      const result = await ctx.prisma.question.deleteMany({
        where: { id: { in: deletableIds } },
      });

      return {
        deleted: result.count,
        skipped: input.ids.length - deletableIds.length,
      };
    }),

  // ==================== IMPORT/EXPORT ====================

  // Export questions to JSON
  exportQuestions: adminProcedure
    .input(z.object({
      ids: z.array(z.string()).optional(),
      subjectId: z.string().optional(),
      format: z.enum(['json', 'csv']).default('json'),
    }))
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      
      if (input.ids && input.ids.length > 0) {
        where.id = { in: input.ids };
      }
      if (input.subjectId) {
        where.subjectId = input.subjectId;
      }

      const questions = await ctx.prisma.question.findMany({
        where,
        include: {
          subject: { select: { code: true, name: true } },
          topic: { select: { name: true } },
          subTopic: { select: { name: true } },
          answers: { orderBy: { order: 'asc' } },
          keywords: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (input.format === 'csv') {
        // Transform to CSV-friendly format
        return questions.map(q => ({
          id: q.id,
          text: q.text,
          type: q.type,
          status: q.status,
          difficulty: q.difficulty,
          subjectCode: q.subject?.code ?? '',
          topicName: q.topic?.name ?? '',
          subTopicName: q.subTopic?.name ?? '',
          answerA: q.answers[0]?.text ?? '',
          answerB: q.answers[1]?.text ?? '',
          answerC: q.answers[2]?.text ?? '',
          answerD: q.answers[3]?.text ?? '',
          answerE: q.answers[4]?.text ?? '',
          correctAnswers: q.answers.filter(a => a.isCorrect).map(a => a.label).join(','),
          correctExplanation: q.correctExplanation ?? '',
          wrongExplanation: q.wrongExplanation ?? '',
          points: q.points,
          negativePoints: q.negativePoints,
          tags: q.legacyTags.join(','),
          year: q.year ?? '',
          source: q.source ?? '',
          keywords: q.keywords.map(k => k.keyword).join(','),
        }));
      }

      return questions;
    }),

  // Export questions to CSV (compatible with import format)
  exportQuestionsCSV: staffProcedure
    .input(z.object({
      ids: z.array(z.string()).optional(),
      subjectId: z.string().optional(),
      status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
      type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'OPEN_TEXT']).optional(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      
      if (input.ids && input.ids.length > 0) {
        where.id = { in: input.ids };
      }
      if (input.subjectId) {
        where.subjectId = input.subjectId;
      }
      if (input.status) {
        where.status = input.status;
      }
      if (input.type) {
        where.type = input.type;
      }
      if (input.difficulty) {
        where.difficulty = input.difficulty;
      }

      const questions = await ctx.prisma.question.findMany({
        where,
        include: {
          subject: { select: { code: true } },
          answers: { orderBy: { order: 'asc' } },
          questionTags: { include: { tag: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // CSV headers matching import format
      const headers = [
        'text',
        'type',
        'difficulty',
        'points',
        'negativePoints',
        'subject',
        'answer1',
        'answer1Correct',
        'answer2',
        'answer2Correct',
        'answer3',
        'answer3Correct',
        'answer4',
        'answer4Correct',
        'answer5',
        'answer5Correct',
        'correctExplanation',
        'wrongExplanation',
        'tags',
        'year',
        'source',
      ];

      // Helper to escape CSV values
      const escapeCSV = (value: string | number | null | undefined): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        // If contains comma, semicolon, newline or quotes, wrap in quotes
        if (str.includes(',') || str.includes(';') || str.includes('\n') || str.includes('"')) {
          return `"${str.replaceAll('"', '""')}"`;
        }
        return str;
      };

      // Build CSV rows
      const rows = questions.map(q => {
        const answers = q.answers || [];
        const tagNames = q.questionTags?.map(qt => qt.tag.name).join(',') || q.legacyTags.join(',');
        
        return [
          escapeCSV(q.text),
          q.type,
          q.difficulty,
          q.points,
          q.negativePoints,
          q.subject?.code || '',
          escapeCSV(answers[0]?.text || ''),
          answers[0]?.isCorrect ? 'true' : 'false',
          escapeCSV(answers[1]?.text || ''),
          answers[1]?.isCorrect ? 'true' : 'false',
          escapeCSV(answers[2]?.text || ''),
          answers[2]?.isCorrect ? 'true' : 'false',
          escapeCSV(answers[3]?.text || ''),
          answers[3]?.isCorrect ? 'true' : 'false',
          escapeCSV(answers[4]?.text || ''),
          answers[4]?.isCorrect ? 'true' : 'false',
          escapeCSV(q.correctExplanation || ''),
          escapeCSV(q.wrongExplanation || ''),
          escapeCSV(tagNames),
          q.year || '',
          escapeCSV(q.source || ''),
        ].join(',');
      });

      // Combine headers and rows
      const csvContent = [headers.join(','), ...rows].join('\n');
      
      return {
        csv: csvContent,
        count: questions.length,
        filename: `domande_export_${new Date().toISOString().split('T')[0]}.csv`,
      };
    }),

  // Import questions from data
  importQuestions: adminProcedure
    .input(z.object({
      questions: z.array(importQuestionRowSchema),
      defaultSubjectId: z.string().optional(),
      skipDuplicates: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as { row: number; error: string }[],
      };

      // Get all subjects for matching
      const subjects = await ctx.prisma.customSubject.findMany({
        select: { id: true, code: true, name: true },
      });
      const subjectByCode = new Map(subjects.map(s => [s.code.toUpperCase(), s.id]));

      // Get all topics for matching
      const topics = await ctx.prisma.topic.findMany({
        select: { id: true, name: true, subjectId: true },
      });

      for (let i = 0; i < input.questions.length; i++) {
        const row = input.questions[i];
        
        try {
          // Skip duplicates by externalId
          if (input.skipDuplicates && row.externalId) {
            const exists = await ctx.prisma.question.findFirst({
              where: { externalId: row.externalId },
            });
            if (exists) {
              results.skipped++;
              continue;
            }
          }

          // Match subject and topic using helpers
          const subjectId = matchSubjectId(row.subjectCode, input.defaultSubjectId, subjectByCode);
          const topicId = matchTopicId(row.topicName, subjectId, topics);

          // Build answers and keywords using helpers
          const answers = buildImportAnswers(
            row.answerA, row.answerB, row.answerC, row.answerD, row.answerE,
            row.correctAnswers
          );
          const keywords = buildImportKeywords(row.keywords);

          // Create question with nested writes using helpers
          await ctx.prisma.question.create({
            data: {
              text: row.text,
              type: row.type ?? 'SINGLE_CHOICE',
              status: 'DRAFT',
              difficulty: row.difficulty ?? 'MEDIUM',
              subjectId,
              topicId,
              points: row.points ?? 1,
              negativePoints: row.negativePoints ?? 0,
              correctExplanation: row.correctExplanation ?? null,
              wrongExplanation: row.wrongExplanation ?? null,
              legacyTags: parseLegacyTags(row.tags),
              year: row.year ?? null,
              source: row.source ?? null,
              externalId: row.externalId ?? null,
              createdById: ctx.user.id,
              updatedById: ctx.user.id,
              answers: buildAnswersNestedCreate(answers),
              keywords: buildKeywordsNestedCreate(keywords, ctx.user.id),
            },
          });

          results.imported++;
        } catch (error) {
          results.errors.push({
            row: i + 1,
            error: error instanceof Error ? error.message : 'Errore sconosciuto',
          });
        }
      }

      return results;
    }),

  // ==================== KEYWORD SUGGESTIONS ====================

  // Get AI-suggested keywords based on question text
  suggestKeywords: staffProcedure
    .input(z.object({
      questionText: z.string().min(10),
      currentKeywords: z.array(z.string()).optional(),
    }))
    .query(async ({ input }) => {
      const { questionText, currentKeywords = [] } = input;
      
      // Simple keyword extraction logic
      // In production, this could call an AI service
      const suggestions: { keyword: string; confidence: number; reason: string }[] = [];
      
      // Extract important words (nouns, technical terms, numbers)
      const text = questionText.toLowerCase();
      
      // Remove common Italian stop words
      const stopWords = new Set([
        'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una',
        'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',
        'e', 'o', 'ma', 'se', 'che', 'quale', 'quanto', 'come',
        'essere', 'avere', 'fare', 'dire', 'andare', 'venire',
        'è', 'sono', 'ha', 'hanno', 'fa', 'fanno',
        'questo', 'questa', 'questi', 'queste', 'quello', 'quella',
        'suo', 'sua', 'suoi', 'sue', 'loro',
        'non', 'più', 'molto', 'poco', 'tutto', 'tutti',
        'può', 'deve', 'vuole', 'nel', 'nella', 'dello', 'della',
        'quale', 'quali', 'seguenti', 'seguente', 'corretta', 'corrette',
        'risposta', 'domanda', 'opzione', 'opzioni',
      ]);

      // Split into words and filter
      const words = text
        .replaceAll(/[^\w\sàèéìòù]/g, ' ')
        .split(/\s+/)
        .filter(word => 
          word.length > 3 && 
          !stopWords.has(word) &&
          !currentKeywords.includes(word)
        );

      // Count word frequency
      const wordCount = new Map<string, number>();
      words.forEach(word => {
        wordCount.set(word, (wordCount.get(word) ?? 0) + 1);
      });

      // Sort by frequency and get top keywords
      const sortedWords = [...wordCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      // Scientific/technical terms patterns
      /* eslint-disable sonarjs/slow-regex -- Intentional patterns for scientific term extraction, input is sanitized */
      const scientificPatterns = [
        { pattern: /\b(cellul\w+|protein\w+|enzim\w+|molecol\w+|atom\w+)\b/gi, reason: 'Termine scientifico' },
        { pattern: /\b(reazion\w+|process\w+|sistem\w+|struttur\w+)\b/gi, reason: 'Concetto chiave' },
        { pattern: /\b(membran\w+|nucle\w+|mitocondri\w+|ribosomi)\b/gi, reason: 'Termine biologico' },
        { pattern: /\b(acido|base|sale|ione|legame)\b/gi, reason: 'Termine chimico' },
        { pattern: /\b(\d+[.,]?\d*)\s*(kg|g|mg|l|ml|m|cm|mm|mol)\b/gi, reason: 'Valore numerico' },
      ];
      /* eslint-enable sonarjs/slow-regex */

      // Check for scientific patterns
      scientificPatterns.forEach(({ pattern, reason }) => {
        const matches = pattern.exec(text);
        if (matches) {
          matches.forEach((match: string) => {
            if (!currentKeywords.includes(match.toLowerCase())) {
              suggestions.push({
                keyword: match.toLowerCase(),
                confidence: 0.9,
                reason,
              });
            }
          });
        }
      });

      // Add frequent words as suggestions
      sortedWords.forEach(([word, count]) => {
        if (!suggestions.some(s => s.keyword === word)) {
          suggestions.push({
            keyword: word,
            confidence: Math.min(0.8, 0.4 + (count * 0.1)),
            reason: count > 1 ? 'Parola frequente nel testo' : 'Parola significativa',
          });
        }
      });

      // Sort by confidence and limit
      const sortedSuggestions = suggestions.toSorted((a, b) => b.confidence - a.confidence);
      return sortedSuggestions.slice(0, 15);
    }),

  // ==================== STUDENT FEATURES ====================

  // Get question for student (published only)
  getQuestionForStudent: studentProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const question = await ctx.prisma.question.findFirst({
        where: {
          id: input.id,
          status: 'PUBLISHED',
        },
        include: {
          subject: { select: { id: true, name: true, color: true } },
          topic: { select: { id: true, name: true } },
          answers: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              text: true,
              textLatex: true,
              imageUrl: true,
              imageAlt: true,
              order: true,
              label: true,
              // NOT including isCorrect or explanation
            },
          },
        },
      });

      if (!question) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Domanda non trovata.',
        });
      }

      return question;
    }),

  // Toggle favorite
  toggleFavorite: studentProcedure
    .input(z.object({
      questionId: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const student = await ctx.prisma.student.findFirst({
        where: { userId: ctx.user.id },
      });

      if (!student) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Studente non trovato.',
        });
      }

      const existing = await ctx.prisma.questionFavorite.findUnique({
        where: {
          questionId_studentId: {
            questionId: input.questionId,
            studentId: student.id,
          },
        },
      });

      if (existing) {
        await ctx.prisma.questionFavorite.delete({
          where: { id: existing.id },
        });
        return { isFavorite: false };
      } else {
        await ctx.prisma.questionFavorite.create({
          data: {
            questionId: input.questionId,
            studentId: student.id,
            notes: input.notes,
          },
        });
        return { isFavorite: true };
      }
    }),

  // Get student favorites
  getMyFavorites: studentProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const student = await ctx.prisma.student.findFirst({
        where: { userId: ctx.user.id },
      });

      if (!student) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Studente non trovato.',
        });
      }

      const total = await ctx.prisma.questionFavorite.count({
        where: { studentId: student.id },
      });

      const favorites = await ctx.prisma.questionFavorite.findMany({
        where: { studentId: student.id },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          question: {
            include: {
              subject: { select: { id: true, name: true, color: true } },
              topic: { select: { name: true } },
            },
          },
        },
      });

      return {
        favorites,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total,
          totalPages: Math.ceil(total / input.pageSize),
        },
      };
    }),

  // Submit feedback
  submitFeedback: studentProcedure
    .input(createQuestionFeedbackSchema)
    .mutation(async ({ ctx, input }) => {
      const student = await ctx.prisma.student.findFirst({
        where: { userId: ctx.user.id },
      });

      if (!student) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Studente non trovato.',
        });
      }

      // Get question title and creator for notification
      const question = await ctx.prisma.question.findUnique({
        where: { id: input.questionId },
        select: { 
          text: true,
          createdById: true,
        },
      });

      const feedback = await ctx.prisma.questionFeedback.create({
        data: {
          questionId: input.questionId,
          studentId: student.id,
          type: input.type,
          message: input.message,
        },
      });

      // Notify staff about the feedback (background, don't block response)
      const questionTitle = question?.text?.substring(0, 50) || 'Domanda';
      notificationService.notifyQuestionFeedback(ctx.prisma, {
        questionId: input.questionId,
        questionTitle: questionTitle + (question?.text && question.text.length > 50 ? '...' : ''),
        feedbackType: input.type,
        reporterName: ctx.user.name,
        creatorUserId: question?.createdById || undefined,
      }).catch(err => {
        console.error('[Questions] Failed to send feedback notification:', err);
      });

      return feedback;
    }),

  // ==================== FEEDBACK MANAGEMENT (Admin) ====================

  // Get pending feedbacks
  getPendingFeedbacks: adminProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(50).default(20),
      status: z.enum(['PENDING', 'REVIEWED', 'FIXED', 'REJECTED']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.status) {
        where.status = input.status;
      }

      const total = await ctx.prisma.questionFeedback.count({ where });

      const feedbacks = await ctx.prisma.questionFeedback.findMany({
        where,
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          question: {
            select: { id: true, text: true, type: true },
          },
          student: {
            include: {
              user: { select: { name: true, email: true } },
            },
          },
        },
      });

      return {
        feedbacks,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total,
          totalPages: Math.ceil(total / input.pageSize),
        },
      };
    }),

  // Update feedback status
  updateFeedback: adminProcedure
    .input(updateQuestionFeedbackSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.questionFeedback.update({
        where: { id: input.id },
        data: {
          status: input.status,
          adminResponse: input.adminResponse,
          reviewedById: ctx.user.id,
          reviewedAt: new Date(),
        },
      });
    }),

  // ==================== STATISTICS ====================

  // Get question statistics
  getQuestionStats: staffProcedure.query(async ({ ctx }) => {
    const [
      totalQuestions,
      publishedQuestions,
      draftQuestions,
      archivedQuestions,
      myQuestions,
      bySubject,
      byDifficulty,
      byType,
      pendingFeedbacks,
    ] = await Promise.all([
      ctx.prisma.question.count(),
      ctx.prisma.question.count({ where: { status: 'PUBLISHED' } }),
      ctx.prisma.question.count({ where: { status: 'DRAFT' } }),
      ctx.prisma.question.count({ where: { status: 'ARCHIVED' } }),
      ctx.prisma.question.count({ where: { createdById: ctx.user.id } }),
      ctx.prisma.question.groupBy({
        by: ['subjectId'],
        _count: true,
      }),
      ctx.prisma.question.groupBy({
        by: ['difficulty'],
        _count: true,
      }),
      ctx.prisma.question.groupBy({
        by: ['type'],
        _count: true,
      }),
      ctx.prisma.questionFeedback.count({ where: { status: 'PENDING' } }),
    ]);

    // Get subject names (filter returns string[] since Boolean removes nulls)
    const subjectIds = bySubject.map(s => s.subjectId).filter((id): id is string => id !== null);
    const subjects = await ctx.prisma.customSubject.findMany({
      where: { id: { in: subjectIds } },
      select: { id: true, name: true, color: true },
    });
    const subjectMap = new Map(subjects.map(s => [s.id, s]));

    return {
      total: totalQuestions,
      published: publishedQuestions,
      draft: draftQuestions,
      archived: archivedQuestions,
      myQuestions,
      pendingFeedbacks,
      bySubject: bySubject.map(s => ({
        subjectId: s.subjectId,
        subject: s.subjectId ? subjectMap.get(s.subjectId) : null,
        count: s._count,
      })),
      byDifficulty: Object.fromEntries(
        byDifficulty.map(d => [d.difficulty, d._count])
      ),
      byType: Object.fromEntries(
        byType.map(t => [t.type, t._count])
      ),
    };
  }),

  // Get available tags (legacy - returns tags from legacyTags field)
  getAvailableTags: staffProcedure.query(async ({ ctx }) => {
    const questions = await ctx.prisma.question.findMany({
      where: { legacyTags: { isEmpty: false } },
      select: { legacyTags: true },
    });

    const tagCounts = new Map<string, number>();
    questions.forEach(q => {
      q.legacyTags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      });
    });

    return [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }),

  // Get subjects with topics for simulation creation
  getSubjects: protectedProcedure.query(async ({ ctx }) => {
    const subjects = await ctx.prisma.customSubject.findMany({
      select: {
        id: true,
        name: true,
        color: true,
        _count: {
          select: {
            questions: {
              where: { status: 'PUBLISHED' },
            },
          },
        },
        topics: {
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                questions: {
                  where: { status: 'PUBLISHED' },
                },
              },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return subjects.map(s => ({
      id: s.id,
      name: s.name,
      color: s.color,
      _count: { questions: s._count.questions },
      topics: s.topics.map(t => ({
        id: t.id,
        name: t.name,
        _count: { questions: t._count.questions },
      })),
    }));
  }),

  // Get questions by IDs for study mode
  getByIds: protectedProcedure
    .input(z.object({
      ids: z.array(z.string()).min(1).max(100),
    }))
    .query(async ({ ctx, input }) => {
      const questions = await ctx.prisma.question.findMany({
        where: {
          id: { in: input.ids },
          status: 'PUBLISHED',
        },
        select: {
          id: true,
          text: true,
          textLatex: true,
          difficulty: true,
          generalExplanation: true,
          type: true,
          subject: {
            select: { id: true, name: true, color: true },
          },
          topic: {
            select: { id: true, name: true },
          },
          answers: {
            select: {
              id: true,
              text: true,
              isCorrect: true,
              order: true,
            },
            orderBy: { order: 'asc' },
          },
        },
      });

      // Sort by the order of input IDs
      const idOrder = new Map(input.ids.map((id, index) => [id, index]));
      questions.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));

      return questions;
    }),

  // ==================== SMART RANDOM GENERATION ====================
  
  /**
   * Generate smart random questions for simulation creation.
   * Uses intelligent algorithms to create balanced simulations based on:
   * - Subject distribution (TOLC-MED, balanced, or custom)
   * - Difficulty mix (easy/medium/hard ratios)
   * - Topic coverage (maximize variety)
   * - Question freshness (prefer less used questions)
   */
  generateSmartRandomQuestions: protectedProcedure
    .input(smartRandomGenerationSchema)
    .mutation(async ({ ctx, input }) => {
      const {
        totalQuestions,
        preset,
        focusSubjectId,
        customSubjectDistribution,
        difficultyMix,
        avoidRecentlyUsed,
        maximizeTopicCoverage,
        preferRecentQuestions,
        tagIds,
        excludeQuestionIds,
      } = input;

      // Step 1: Get all subjects with their question counts
      const subjects = await ctx.prisma.customSubject.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: {
              questions: {
                where: { status: 'PUBLISHED' },
              },
            },
          },
        },
      });

      // Map subjects by id
      const subjectsById = new Map(subjects.map(s => [s.id, s]));

      // Step 2: Calculate target distribution per subject using helper
      const targetDistribution = calculateTargetDistribution(
        preset,
        subjects,
        totalQuestions,
        focusSubjectId,
        customSubjectDistribution
      );

      // Ensure total matches requested
      normalizeDistributionTotal(targetDistribution, totalQuestions);

      // Step 3: Get difficulty ratios
      const difficultyRatios = getDifficultyRatios(difficultyMix);

      // Step 4: Build base query for available questions using helper
      const baseWhere = buildSmartRandomBaseWhere(excludeQuestionIds, tagIds);

      // Build selection config
      const selectionConfig: SelectionConfig = {
        baseWhere,
        difficultyRatios,
        avoidRecentlyUsed,
        preferRecentQuestions,
        maximizeTopicCoverage,
      };

      // Step 5: Select questions per subject with smart ordering
      const selectedQuestions: SmartSelectedQuestion[] = [];
      let orderCounter = 0;

      // Process each subject in distribution
      const subjectEntries = Array.from(targetDistribution.entries()).filter(
        ([subjectId, targetCount]) => targetCount > 0 && subjectsById.has(subjectId)
      );

      for (const [subjectId, targetCount] of subjectEntries) {
        // Calculate difficulty counts for this subject using helper
        const difficultyTargets = calculateDifficultyTargets(targetCount, difficultyRatios);
        const selectedForSubject: string[] = [];

        // Get questions for each difficulty level
        const difficultyEntries = Object.entries(difficultyTargets).filter(
          ([, count]) => count > 0
        );

        for (const [difficulty, count] of difficultyEntries) {
          const result = await selectQuestionsForDifficulty(
            ctx.prisma,
            subjectId,
            difficulty,
            count,
            selectedForSubject,
            selectionConfig
          );

          // Update order and add to results
          for (const q of result.questions) {
            selectedForSubject.push(q.questionId);
            selectedQuestions.push({ ...q, order: orderCounter++ });
          }
        }

        // Fill remaining if needed
        const remainingNeeded = targetCount - selectedForSubject.length;
        if (remainingNeeded > 0) {
          const fillResult = await fillRemainingQuestions(
            ctx.prisma,
            subjectId,
            remainingNeeded,
            selectedForSubject,
            selectionConfig,
            orderCounter
          );

          for (const q of fillResult.questions) {
            selectedQuestions.push({ ...q, order: orderCounter++ });
          }
        }
      }

      // Final shuffle to mix subjects together
      const finalQuestions = secureShuffleArray(selectedQuestions)
        .map((q, idx) => ({ ...q, order: idx }));

      // Calculate statistics using helper
      const stats = calculateGenerationStats(finalQuestions);

      return {
        questions: finalQuestions,
        stats,
        requestedTotal: totalQuestions,
        achievedTotal: finalQuestions.length,
        warning: finalQuestions.length < totalQuestions 
          ? `Sono state trovate solo ${finalQuestions.length} domande corrispondenti ai criteri (richieste: ${totalQuestions}).`
          : undefined,
      };
    }),
});