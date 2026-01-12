// Questions Router - Manage quiz questions
import { router, adminProcedure, staffProcedure, protectedProcedure, studentProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  createQuestionSchema,
  updateQuestionSchema,
  questionFilterSchema,
  createQuestionFeedbackSchema,
  updateQuestionFeedbackSchema,
  validateQuestionAnswers,
  validateQuestionKeywords,
  importQuestionRowSchema,
} from '@/lib/validations/questionValidation';
import {
  smartRandomGenerationSchema,
  getDifficultyRatios,
} from '@/lib/validations/simulationValidation';
import * as notificationService from '@/server/services/notificationService';

export const questionsRouter = router({
  // ==================== QUESTION CRUD ====================

  // Get paginated questions list
  getQuestions: staffProcedure
    .input(questionFilterSchema)
    .query(async ({ ctx, input }) => {
      const {
        page,
        pageSize,
        search,
        subjectId,
        topicId,
        subTopicId,
        type,
        status,
        difficulty,
        tags,
        tagIds,
        year,
        source,
        createdById,
        sortBy,
        sortOrder,
        includeAnswers,
        includeDrafts,
        includeArchived,
      } = input;

      // Build where clause
      const where: Record<string, unknown> = {};
      const andConditions: Record<string, unknown>[] = [];

      // Search in text
      if (search) {
        andConditions.push({
          OR: [
            { text: { contains: search, mode: 'insensitive' } },
            { legacyTags: { has: search } },
            { source: { contains: search, mode: 'insensitive' } },
          ],
        });
      }

      // Filters
      if (subjectId) where.subjectId = subjectId;
      if (topicId) where.topicId = topicId;
      if (subTopicId) where.subTopicId = subTopicId;
      if (type) where.type = type;
      if (difficulty) where.difficulty = difficulty;
      if (year) where.year = year;
      if (source) where.source = { contains: source, mode: 'insensitive' };
      if (createdById) where.createdById = createdById;
      if (tags && tags.length > 0) where.legacyTags = { hasEvery: tags };
      
      // Filter by new QuestionTag IDs
      if (tagIds && tagIds.length > 0) {
        andConditions.push({
          questionTags: {
            some: {
              tagId: { in: tagIds },
            },
          },
        });
      }

      // Status filter
      if (status) {
        where.status = status;
      } else {
        const statusIn: string[] = ['PUBLISHED'];
        if (includeDrafts) statusIn.push('DRAFT');
        if (includeArchived) statusIn.push('ARCHIVED');
        where.status = { in: statusIn };
      }

      // Collaborators can see all questions but can only edit/delete their own
      // This is enforced in the update/delete mutations, not here in the list query

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

      // Create question with answers and keywords in a transaction
      const question = await ctx.prisma.$transaction(async (tx) => {
        // Create the question
        const newQuestion = await tx.question.create({
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
          },
        });

        // Create answers
        if (answers && answers.length > 0) {
          await tx.questionAnswer.createMany({
            data: answers.map((answer, index) => ({
              questionId: newQuestion.id,
              text: answer.text,
              textLatex: answer.textLatex ?? null,
              imageUrl: answer.imageUrl ?? null,
              imageAlt: answer.imageAlt ?? null,
              isCorrect: answer.isCorrect ?? false,
              explanation: answer.explanation ?? null,
              order: answer.order ?? index,
              label: answer.label ?? String.fromCharCode(65 + index),
            })),
          });
        }

        // Create keywords
        if (keywords && keywords.length > 0) {
          await tx.questionKeyword.createMany({
            data: keywords.map((keyword) => ({
              questionId: newQuestion.id,
              keyword: keyword.keyword,
              weight: keyword.weight ?? 1.0,
              isRequired: keyword.isRequired ?? false,
              isSuggested: keyword.isSuggested ?? false,
              caseSensitive: keyword.caseSensitive ?? false,
              exactMatch: keyword.exactMatch ?? false,
              synonyms: keyword.synonyms ?? [],
              createdById: ctx.user.id,
            })),
          });
        }

        return newQuestion;
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

      // Update in transaction
      const updatedQuestion = await ctx.prisma.$transaction(async (tx) => {
        // Create version snapshot before update
        await tx.questionVersion.create({
          data: {
            questionId: id,
            version: currentQuestion.version,
            snapshot: JSON.parse(JSON.stringify({
              ...currentQuestion,
              answers: currentQuestion.answers,
              keywords: currentQuestion.keywords,
            })),
            changeReason: changeReason ?? null,
            changedById: ctx.user.id,
          },
        });

        // Extract relation IDs and legacy tags from questionData
        const { subjectId, topicId, subTopicId, tags, ...restData } = questionData;

        // Update question
        const updated = await tx.question.update({
          where: { id },
          data: {
            ...restData,
            // Handle subject relation
            subject: subjectId === undefined 
              ? undefined 
              : subjectId === null 
                ? { disconnect: true } 
                : { connect: { id: subjectId } },
            // Handle topic relation  
            topic: topicId === undefined 
              ? undefined 
              : topicId === null 
                ? { disconnect: true } 
                : { connect: { id: topicId } },
            // Handle subTopic relation
            subTopic: subTopicId === undefined 
              ? undefined 
              : subTopicId === null 
                ? { disconnect: true } 
                : { connect: { id: subTopicId } },
            // Handle legacy tags
            legacyTags: tags !== undefined ? tags : undefined,
            updatedById: ctx.user.id,
            version: { increment: 1 },
            publishedAt: restData.status === 'PUBLISHED' && !currentQuestion.publishedAt
              ? new Date()
              : currentQuestion.publishedAt,
            archivedAt: restData.status === 'ARCHIVED' ? new Date() : null,
          },
        });

        // Update answers if provided
        if (answers) {
          // Delete old answers
          await tx.questionAnswer.deleteMany({ where: { questionId: id } });
          
          // Create new answers
          await tx.questionAnswer.createMany({
            data: answers.map((answer, index) => ({
              questionId: id,
              text: answer.text,
              textLatex: answer.textLatex ?? null,
              imageUrl: answer.imageUrl ?? null,
              imageAlt: answer.imageAlt ?? null,
              isCorrect: answer.isCorrect ?? false,
              explanation: answer.explanation ?? null,
              order: answer.order ?? index,
              label: answer.label ?? String.fromCharCode(65 + index),
            })),
          });
        }

        // Update keywords if provided
        if (keywords) {
          // Delete old keywords
          await tx.questionKeyword.deleteMany({ where: { questionId: id } });
          
          // Create new keywords
          await tx.questionKeyword.createMany({
            data: keywords.map((keyword) => ({
              questionId: id,
              keyword: keyword.keyword,
              weight: keyword.weight ?? 1.0,
              isRequired: keyword.isRequired ?? false,
              isSuggested: keyword.isSuggested ?? false,
              caseSensitive: keyword.caseSensitive ?? false,
              exactMatch: keyword.exactMatch ?? false,
              synonyms: keyword.synonyms ?? [],
              createdById: ctx.user.id,
            })),
          });
        }

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

      // Create duplicate
      const duplicate = await ctx.prisma.$transaction(async (tx) => {
        const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, publishedAt: _publishedAt, archivedAt: _archivedAt, version: _version, 
                timesUsed: _timesUsed, timesAnswered: _timesAnswered, timesCorrect: _timesCorrect, timesWrong: _timesWrong, timesSkipped: _timesSkipped,
                avgTimeSeconds: _avgTimeSeconds, avgCorrectRate: _avgCorrectRate, answers, keywords, ...questionData } = original;

        const newQuestion = await tx.question.create({
          data: {
            ...questionData,
            text: `${original.text} (copia)`,
            status: 'DRAFT',
            createdById: ctx.user.id,
            updatedById: ctx.user.id,
          },
        });

        // Duplicate answers
        if (answers.length > 0) {
          await tx.questionAnswer.createMany({
            data: answers.map((a) => ({
              text: a.text,
              textLatex: a.textLatex,
              imageUrl: a.imageUrl,
              imageAlt: a.imageAlt,
              isCorrect: a.isCorrect,
              explanation: a.explanation,
              order: a.order,
              label: a.label,
              questionId: newQuestion.id,
            })),
          });
        }

        // Duplicate keywords
        if (keywords.length > 0) {
          await tx.questionKeyword.createMany({
            data: keywords.map((k) => ({
              keyword: k.keyword,
              weight: k.weight,
              isRequired: k.isRequired,
              isSuggested: k.isSuggested,
              caseSensitive: k.caseSensitive,
              exactMatch: k.exactMatch,
              synonyms: k.synonyms,
              questionId: newQuestion.id,
              createdById: ctx.user.id,
            })),
          });
        }

        return newQuestion;
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
          return `"${str.replace(/"/g, '""')}"`;
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

          // Match subject
          let subjectId = input.defaultSubjectId;
          if (row.subjectCode) {
            const matchedId = subjectByCode.get(row.subjectCode.toUpperCase());
            if (matchedId) subjectId = matchedId;
          }

          // Match topic
          let topicId: string | null = null;
          if (row.topicName && subjectId) {
            const matchedTopic = topics.find(
              t => t.subjectId === subjectId && 
                   t.name.toLowerCase() === row.topicName!.toLowerCase()
            );
            if (matchedTopic) topicId = matchedTopic.id;
          }

          // Build answers array
          const answers: { text: string; isCorrect: boolean; order: number; label: string }[] = [];
          const correctSet = new Set(
            (row.correctAnswers ?? '').toUpperCase().split(',').map(s => s.trim())
          );

          const answerTexts = [row.answerA, row.answerB, row.answerC, row.answerD, row.answerE];
          answerTexts.forEach((text, idx) => {
            if (text) {
              const label = String.fromCharCode(65 + idx);
              answers.push({
                text,
                isCorrect: correctSet.has(label),
                order: idx,
                label,
              });
            }
          });

          // Build keywords array
          const keywords = row.keywords
            ? row.keywords.split(',').map(k => k.trim()).filter(Boolean).map(keyword => ({
                keyword,
                weight: 1.0,
                isRequired: false,
                isSuggested: false,
                caseSensitive: false,
                exactMatch: false,
                synonyms: [],
              }))
            : [];

          // Create question
          await ctx.prisma.$transaction(async (tx) => {
            const question = await tx.question.create({
              data: {
                text: row.text,
                type: row.type ?? 'SINGLE_CHOICE',
                status: 'DRAFT',
                difficulty: row.difficulty ?? 'MEDIUM',
                subjectId,
                topicId,
                points: row.points ?? 1.0,
                negativePoints: row.negativePoints ?? 0,
                correctExplanation: row.correctExplanation ?? null,
                wrongExplanation: row.wrongExplanation ?? null,
                legacyTags: row.tags ? row.tags.split(',').map(t => t.trim()) : [],
                year: row.year ?? null,
                source: row.source ?? null,
                externalId: row.externalId ?? null,
                createdById: ctx.user.id,
                updatedById: ctx.user.id,
              },
            });

            if (answers.length > 0) {
              await tx.questionAnswer.createMany({
                data: answers.map(a => ({ ...a, questionId: question.id })),
              });
            }

            if (keywords.length > 0) {
              await tx.questionKeyword.createMany({
                data: keywords.map(k => ({ ...k, questionId: question.id, createdById: ctx.user.id })),
              });
            }
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
        .replace(/[^\w\sàèéìòù]/g, ' ')
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
      const scientificPatterns = [
        { pattern: /\b(cellul\w+|protein\w+|enzim\w+|molecol\w+|atom\w+)\b/gi, reason: 'Termine scientifico' },
        { pattern: /\b(reazion\w+|process\w+|sistem\w+|struttur\w+)\b/gi, reason: 'Concetto chiave' },
        { pattern: /\b(membran\w+|nucle\w+|mitocondri\w+|ribosomi)\b/gi, reason: 'Termine biologico' },
        { pattern: /\b(acido|base|sale|ione|legame)\b/gi, reason: 'Termine chimico' },
        { pattern: /\b(\d+[.,]?\d*)\s*(kg|g|mg|l|ml|m|cm|mm|mol)\b/gi, reason: 'Valore numerico' },
      ];

      // Check for scientific patterns
      scientificPatterns.forEach(({ pattern, reason }) => {
        const matches = text.match(pattern);
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
      return suggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 15);
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

    // Get subject names
    const subjectIds = bySubject.map(s => s.subjectId).filter(Boolean) as string[];
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

      // Step 2: Calculate target distribution per subject
      const targetDistribution: Map<string, number> = new Map();
      
      if (preset === 'PROPORTIONAL') {
        // Distribution proportional to available questions per subject
        const activeSubjectsWithQuestions = subjects.filter(s => s._count.questions > 0);
        const totalAvailable = activeSubjectsWithQuestions.reduce((sum, s) => sum + s._count.questions, 0);
        
        if (totalAvailable > 0) {
          let distributed = 0;
          activeSubjectsWithQuestions.forEach((s, idx) => {
            const proportion = s._count.questions / totalAvailable;
            const count = idx === activeSubjectsWithQuestions.length - 1
              ? totalQuestions - distributed // Last subject gets remainder
              : Math.round(proportion * totalQuestions);
            targetDistribution.set(s.id, count);
            distributed += count;
          });
        }
      } else if (preset === 'BALANCED') {
        // Equal distribution across all subjects
        const activeSubjectsWithQuestions = subjects.filter(s => s._count.questions > 0);
        const perSubject = Math.floor(totalQuestions / activeSubjectsWithQuestions.length);
        const remainder = totalQuestions % activeSubjectsWithQuestions.length;
        activeSubjectsWithQuestions.forEach((s, idx) => {
          targetDistribution.set(s.id, perSubject + (idx < remainder ? 1 : 0));
        });
      } else if (preset === 'SINGLE_SUBJECT' && focusSubjectId) {
        // All questions from single subject
        targetDistribution.set(focusSubjectId, totalQuestions);
      } else if (preset === 'CUSTOM' && customSubjectDistribution) {
        // User-defined distribution
        for (const [subjectId, count] of Object.entries(customSubjectDistribution)) {
          if (count > 0) {
            targetDistribution.set(subjectId, count);
          }
        }
      } else {
        // Fallback: proportional distribution
        const activeSubjectsWithQuestions = subjects.filter(s => s._count.questions > 0);
        const totalAvailable = activeSubjectsWithQuestions.reduce((sum, s) => sum + s._count.questions, 0);
        
        if (totalAvailable > 0) {
          let distributed = 0;
          activeSubjectsWithQuestions.forEach((s, idx) => {
            const proportion = s._count.questions / totalAvailable;
            const count = idx === activeSubjectsWithQuestions.length - 1
              ? totalQuestions - distributed
              : Math.round(proportion * totalQuestions);
            targetDistribution.set(s.id, count);
            distributed += count;
          });
        }
      }

      // Ensure total matches requested
      const currentTotal = Array.from(targetDistribution.values()).reduce((a, b) => a + b, 0);
      if (currentTotal < totalQuestions && targetDistribution.size > 0) {
        // Add remainder to first subject
        const firstKey = Array.from(targetDistribution.keys())[0];
        targetDistribution.set(firstKey, (targetDistribution.get(firstKey) || 0) + (totalQuestions - currentTotal));
      }

      // Step 3: Get difficulty ratios
      const difficultyRatios = getDifficultyRatios(difficultyMix);

      // Step 4: Build base query for available questions
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

      // Step 5: Select questions per subject with smart ordering
      const selectedQuestions: Array<{
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
      }> = [];

      let orderCounter = 0;

      for (const [subjectId, targetCount] of targetDistribution.entries()) {
        if (targetCount === 0) continue;

        const subject = subjectsById.get(subjectId);
        if (!subject) continue;

        // Calculate difficulty counts for this subject
        const difficultyTargets = {
          EASY: Math.round(targetCount * difficultyRatios.EASY),
          MEDIUM: Math.round(targetCount * difficultyRatios.MEDIUM),
          HARD: Math.round(targetCount * difficultyRatios.HARD),
        };

        // Ensure we get exactly targetCount
        const diffTotal = difficultyTargets.EASY + difficultyTargets.MEDIUM + difficultyTargets.HARD;
        if (diffTotal < targetCount) {
          difficultyTargets.MEDIUM += targetCount - diffTotal;
        } else if (diffTotal > targetCount) {
          // Reduce from hard first, then medium
          const excess = diffTotal - targetCount;
          if (difficultyTargets.HARD >= excess) {
            difficultyTargets.HARD -= excess;
          } else {
            difficultyTargets.MEDIUM -= (excess - difficultyTargets.HARD);
            difficultyTargets.HARD = 0;
          }
        }

        // Get questions for each difficulty level
        const selectedForSubject: string[] = [];

        for (const [difficulty, count] of Object.entries(difficultyTargets)) {
          if (count === 0) continue;

          // Build order by clause for smart selection
          const orderByClause: Array<{ [key: string]: 'asc' | 'desc' }> = [];
          
          if (avoidRecentlyUsed) {
            orderByClause.push({ timesUsed: 'asc' }); // Prefer less used
          }
          if (preferRecentQuestions) {
            orderByClause.push({ createdAt: 'desc' }); // Prefer newer
          }
          if (maximizeTopicCoverage) {
            // We'll handle this with grouping later
            orderByClause.push({ topicId: 'asc' }); // Group by topic
          }
          // Add some randomness by also ordering randomly
          orderByClause.push({ id: 'asc' }); // Stable fallback

          const questions = await ctx.prisma.question.findMany({
            where: {
              ...baseWhere,
              subjectId,
              difficulty: difficulty as 'EASY' | 'MEDIUM' | 'HARD',
              id: { notIn: selectedForSubject },
            },
            take: count * 3, // Get more than needed for shuffling
            orderBy: orderByClause,
            select: {
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
            },
          });

          // Apply topic coverage maximization
          let finalQuestions = questions;
          if (maximizeTopicCoverage && questions.length > count) {
            // Group by topic and pick one from each topic first
            const byTopic = new Map<string | null, typeof questions>();
            for (const q of questions) {
              const topicId = q.topicId;
              if (!byTopic.has(topicId)) {
                byTopic.set(topicId, []);
              }
              byTopic.get(topicId)!.push(q);
            }

            // Round-robin pick from topics
            const result: typeof questions = [];
            const topicIterators = Array.from(byTopic.values()).map(arr => ({ arr, idx: 0 }));
            let topicIdx = 0;
            
            while (result.length < count && topicIterators.some(t => t.idx < t.arr.length)) {
              const iterator = topicIterators[topicIdx % topicIterators.length];
              if (iterator.idx < iterator.arr.length) {
                result.push(iterator.arr[iterator.idx]);
                iterator.idx++;
              }
              topicIdx++;
            }
            
            finalQuestions = result;
          }

          // Shuffle and take only what we need
          const shuffled = [...finalQuestions].sort(() => Math.random() - 0.5);
          const picked = shuffled.slice(0, count);

          for (const q of picked) {
            selectedForSubject.push(q.id);
            selectedQuestions.push({
              questionId: q.id,
              order: orderCounter++,
              question: {
                id: q.id,
                text: q.text,
                type: q.type,
                difficulty: q.difficulty,
                subject: q.subject ?? undefined,
                topic: q.topic ?? undefined,
              },
            });
          }
        }

        // If we didn't get enough questions, try to fill the gap while respecting difficulty ratios
        const remainingNeeded = targetCount - selectedForSubject.length;
        if (remainingNeeded > 0) {
          // Calculate how many of each difficulty we still need, respecting original ratios
          const remainingDifficultyTargets = {
            EASY: Math.round(remainingNeeded * difficultyRatios.EASY),
            MEDIUM: Math.round(remainingNeeded * difficultyRatios.MEDIUM),
            HARD: Math.round(remainingNeeded * difficultyRatios.HARD),
          };

          // Ensure total matches
          const diffTotal = remainingDifficultyTargets.EASY + remainingDifficultyTargets.MEDIUM + remainingDifficultyTargets.HARD;
          if (diffTotal < remainingNeeded) {
            remainingDifficultyTargets.MEDIUM += remainingNeeded - diffTotal;
          }

          // Try to get remaining questions for each difficulty level
          for (const [difficulty, count] of Object.entries(remainingDifficultyTargets)) {
            if (count === 0) continue;

            const extraQuestions = await ctx.prisma.question.findMany({
              where: {
                ...baseWhere,
                subjectId,
                difficulty: difficulty as 'EASY' | 'MEDIUM' | 'HARD',
                id: { notIn: selectedForSubject },
              },
              take: count,
              orderBy: avoidRecentlyUsed ? { timesUsed: 'asc' } : { createdAt: 'desc' },
              select: {
                id: true,
                text: true,
                type: true,
                difficulty: true,
                subject: {
                  select: { id: true, name: true, color: true },
                },
                topic: {
                  select: { id: true, name: true },
                },
              },
            });

            for (const q of extraQuestions) {
              selectedForSubject.push(q.id);
              selectedQuestions.push({
                questionId: q.id,
                order: orderCounter++,
                question: {
                  id: q.id,
                  text: q.text,
                  type: q.type,
                  difficulty: q.difficulty,
                  subject: q.subject ?? undefined,
                  topic: q.topic ?? undefined,
                },
              });
            }
          }
        }
      }

      // Final shuffle to mix subjects together
      const finalQuestions = [...selectedQuestions]
        .sort(() => Math.random() - 0.5)
        .map((q, idx) => ({ ...q, order: idx }));

      // Calculate statistics for the generated set
      const stats = {
        total: finalQuestions.length,
        bySubject: {} as Record<string, { name: string; count: number; color: string | null }>,
        byDifficulty: { EASY: 0, MEDIUM: 0, HARD: 0 } as Record<string, number>,
        topicsCovered: new Set<string>(),
      };

      for (const q of finalQuestions) {
        // Subject stats
        const subjectName = q.question.subject?.name || 'Sconosciuta';
        if (!stats.bySubject[subjectName]) {
          stats.bySubject[subjectName] = { 
            name: subjectName, 
            count: 0, 
            color: q.question.subject?.color || null 
          };
        }
        stats.bySubject[subjectName].count++;

        // Difficulty stats
        stats.byDifficulty[q.question.difficulty]++;

        // Topic coverage
        if (q.question.topic) {
          stats.topicsCovered.add(q.question.topic.id);
        }
      }

      return {
        questions: finalQuestions,
        stats: {
          ...stats,
          topicsCovered: stats.topicsCovered.size,
        },
        requestedTotal: totalQuestions,
        achievedTotal: finalQuestions.length,
        warning: finalQuestions.length < totalQuestions 
          ? `Sono state trovate solo ${finalQuestions.length} domande corrispondenti ai criteri (richieste: ${totalQuestions}).`
          : undefined,
      };
    }),
});