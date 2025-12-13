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
            { tags: { has: search } },
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
      if (tags && tags.length > 0) where.tags = { hasEvery: tags };

      // Status filter
      if (status) {
        where.status = status;
      } else {
        const statusIn: string[] = ['PUBLISHED'];
        if (includeDrafts) statusIn.push('DRAFT');
        if (includeArchived) statusIn.push('ARCHIVED');
        where.status = { in: statusIn };
      }

      // Collaborator can only see their own questions + published ones
      // BUT admin can see all questions
      if (ctx.user.role === 'COLLABORATOR') {
        andConditions.push({
          OR: [
            { createdById: ctx.user.id },
            { status: 'PUBLISHED' },
          ],
        });
      }

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
            tags: questionData.tags,
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

        // Update question
        const updated = await tx.question.update({
          where: { id },
          data: {
            ...questionData,
            updatedById: ctx.user.id,
            version: { increment: 1 },
            publishedAt: questionData.status === 'PUBLISHED' && !currentQuestion.publishedAt
              ? new Date()
              : currentQuestion.publishedAt,
            archivedAt: questionData.status === 'ARCHIVED' ? new Date() : null,
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
          tags: q.tags.join(','),
          year: q.year ?? '',
          source: q.source ?? '',
          keywords: q.keywords.map(k => k.keyword).join(','),
        }));
      }

      return questions;
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
                tags: row.tags ? row.tags.split(',').map(t => t.trim()) : [],
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

      return ctx.prisma.questionFeedback.create({
        data: {
          questionId: input.questionId,
          studentId: student.id,
          type: input.type,
          message: input.message,
        },
      });
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

  // Get available tags
  getAvailableTags: staffProcedure.query(async ({ ctx }) => {
    const questions = await ctx.prisma.question.findMany({
      where: { tags: { isEmpty: false } },
      select: { tags: true },
    });

    const tagCounts = new Map<string, number>();
    questions.forEach(q => {
      q.tags.forEach(tag => {
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
});
