// Simulations Router - Manage tests and simulations
import { router, staffProcedure, studentProcedure, protectedProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  createSimulationWithQuestionsSchema,
  createSimulationAutoSchema,
  updateSimulationSchema,
  updateSimulationQuestionsSchema,
  simulationFilterSchema,
  studentSimulationFilterSchema,
  submitSimulationSchema,
  quickQuizConfigSchema,
  bulkAssignmentSchema,
} from '@/lib/validations/simulationValidation';
import type { Prisma, PrismaClient } from '@prisma/client';
import { notifySimulationCreated } from '@/server/services/simulationNotificationService';

// Helper function to get student from user
async function getStudentFromUser(prisma: PrismaClient, userId: string) {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: { id: true, classId: true, userId: true },
  });
  if (!student) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Profilo studente non trovato',
    });
  }
  return student;
}

export const simulationsRouter = router({
  // ==================== ADMIN/STAFF PROCEDURES ====================

  // Get paginated simulations list (admin/staff)
  getSimulations: staffProcedure
    .input(simulationFilterSchema)
    .query(async ({ ctx, input }) => {
      const {
        page,
        pageSize,
        search,
        type,
        status,
        visibility,
        isOfficial,
        classId,
        createdById,
        creatorRole,
        startDateFrom,
        startDateTo,
        endDateFrom,
        endDateTo,
        sortBy,
        sortOrder,
      } = input;

      // Build where clause
      const where: Prisma.SimulationWhereInput = {};
      const andConditions: Prisma.SimulationWhereInput[] = [];

      // Search in title and description
      if (search) {
        andConditions.push({
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        });
      }

      // Filters
      if (type) where.type = type;
      if (status) where.status = status;
      if (visibility) where.visibility = visibility;
      if (typeof isOfficial === 'boolean') where.isOfficial = isOfficial;
      if (classId) where.classId = classId;
      if (createdById) where.createdById = createdById;
      if (creatorRole) where.creatorRole = creatorRole;

      // Date ranges
      if (startDateFrom || startDateTo) {
        where.startDate = {};
        if (startDateFrom) where.startDate.gte = new Date(startDateFrom);
        if (startDateTo) where.startDate.lte = new Date(startDateTo);
      }

      if (endDateFrom || endDateTo) {
        where.endDate = {};
        if (endDateFrom) where.endDate.gte = new Date(endDateFrom);
        if (endDateTo) where.endDate.lte = new Date(endDateTo);
      }

      // Collaborators can only see their own + published simulations
      if (ctx.user.role === 'COLLABORATOR') {
        andConditions.push({
          OR: [
            { createdById: ctx.user.id },
            { status: 'PUBLISHED' },
          ],
        });
      }

      // Combine AND conditions
      if (andConditions.length > 0) {
        where.AND = andConditions;
      }

      // Count total
      const total = await ctx.prisma.simulation.count({ where });

      // Get simulations
      const simulations = await ctx.prisma.simulation.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdBy: {
            select: { id: true, name: true, role: true },
          },
          class: {
            select: { id: true, name: true, year: true, section: true },
          },
          _count: {
            select: {
              questions: true,
              results: true,
              assignments: true,
            },
          },
        },
      });

      return {
        simulations,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Get single simulation with all details
  getSimulation: staffProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: input.id },
        include: {
          createdBy: {
            select: { id: true, name: true, role: true, email: true },
          },
          class: {
            select: { id: true, name: true, year: true, section: true },
          },
          questions: {
            orderBy: { order: 'asc' },
            include: {
              question: {
                include: {
                  subject: { select: { id: true, name: true, code: true, color: true } },
                  topic: { select: { id: true, name: true } },
                  answers: { orderBy: { order: 'asc' } },
                },
              },
            },
          },
          assignments: {
            include: {
              student: {
                include: { user: { select: { id: true, name: true, email: true } } },
              },
              group: { select: { id: true, name: true, color: true } },
              class: { select: { id: true, name: true, year: true, section: true } },
              assignedBy: { select: { id: true, name: true } },
            },
          },
          results: {
            include: {
              student: {
                include: { user: { select: { id: true, name: true, email: true } } },
              },
            },
            orderBy: { completedAt: 'desc' },
            take: 50,
          },
        },
      });

      if (!simulation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      // Collaborators can only see their own or published simulations
      if (ctx.user.role === 'COLLABORATOR' && 
          simulation.createdById !== ctx.user.id && 
          simulation.status !== 'PUBLISHED') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non hai accesso a questa simulazione' });
      }

      return simulation;
    }),

  // Create simulation with manual question selection
  createWithQuestions: staffProcedure
    .input(createSimulationWithQuestionsSchema)
    .mutation(async ({ ctx, input }) => {
      const { questions, assignments, ...simulationData } = input;

      // Validate official simulations can only be created by admins
      if (simulationData.isOfficial && ctx.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Solo gli admin possono creare simulazioni ufficiali',
        });
      }

      // For collaborators: validate they can only assign to their groups/students
      if (ctx.user.role === 'COLLABORATOR' && ctx.user.collaborator?.id && assignments.length > 0) {
        const collaboratorId = ctx.user.collaborator.id;
        
        // Get groups managed by this collaborator
        const collaboratorGroups = await ctx.prisma.group.findMany({
          where: { referenceCollaboratorId: collaboratorId },
          select: { id: true },
        });
        const allowedGroupIds = new Set(collaboratorGroups.map(g => g.id));

        // Get students in those groups
        const studentsInGroups = await ctx.prisma.groupMember.findMany({
          where: { groupId: { in: Array.from(allowedGroupIds) } },
          select: { studentId: true },
        });
        const allowedStudentIds = new Set(studentsInGroups.map(m => m.studentId));

        // Validate each assignment
        for (const target of assignments) {
          if (target.groupId && !allowedGroupIds.has(target.groupId)) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Non puoi assegnare a gruppi che non gestisci',
            });
          }
          if (target.studentId && !allowedStudentIds.has(target.studentId)) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Non puoi assegnare a studenti che non sono nei tuoi gruppi',
            });
          }
          if (target.classId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'I collaboratori non possono assegnare a intere classi',
            });
          }
        }
      }

      // Validate all questions exist and are published
      const questionIds = questions.map(q => q.questionId);
      const existingQuestions = await ctx.prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: { id: true, status: true },
      });

      if (existingQuestions.length !== questionIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Una o più domande non esistono',
        });
      }

      const unpublishedQuestions = existingQuestions.filter(q => q.status !== 'PUBLISHED');
      // Note: simulationData from createWithQuestions doesn't include status field
      // Status is always DRAFT on creation, can be changed via update
      if (unpublishedQuestions.length > 0) {
        // Allow creation but warn (status will be DRAFT by default)
        console.warn('Creating simulation with unpublished questions');
      }

      // Create simulation with questions and assignments
      const simClassId = simulationData.classId;
      
      const simulation = await ctx.prisma.simulation.create({
        data: {
          title: simulationData.title,
          description: simulationData.description,
          type: simulationData.type,
          visibility: simulationData.visibility ?? 'PRIVATE',
          isOfficial: simulationData.isOfficial ?? false,
          durationMinutes: simulationData.durationMinutes ?? 0,
          totalQuestions: questions.length,
          showResults: simulationData.showResults ?? true,
          showCorrectAnswers: simulationData.showCorrectAnswers ?? true,
          allowReview: simulationData.allowReview ?? true,
          randomizeOrder: simulationData.randomizeOrder ?? false,
          randomizeAnswers: simulationData.randomizeAnswers ?? false,
          useQuestionPoints: simulationData.useQuestionPoints ?? false,
          correctPoints: simulationData.correctPoints ?? 1.5,
          wrongPoints: simulationData.wrongPoints ?? -0.4,
          blankPoints: simulationData.blankPoints ?? 0,
          maxScore: simulationData.maxScore,
          passingScore: simulationData.passingScore,
          isRepeatable: simulationData.isRepeatable ?? false,
          maxAttempts: simulationData.maxAttempts,
          isPublic: simulationData.isPublic ?? false,
          startDate: simulationData.startDate ? new Date(simulationData.startDate) : null,
          endDate: simulationData.endDate ? new Date(simulationData.endDate) : null,
          topicIds: simulationData.topicIds ?? [],
          subjectDistribution: simulationData.subjectDistribution ?? undefined,
          difficultyDistribution: simulationData.difficultyDistribution ?? undefined,
          // New fields for paper-based, attendance, sections, and anti-cheat
          isPaperBased: simulationData.isPaperBased ?? false,
          paperInstructions: simulationData.paperInstructions,
          trackAttendance: simulationData.trackAttendance ?? false,
          locationType: simulationData.locationType,
          locationDetails: simulationData.locationDetails,
          hasSections: simulationData.hasSections ?? false,
          sections: simulationData.sections ?? undefined,
          isScheduled: simulationData.isScheduled ?? false,
          enableAntiCheat: simulationData.enableAntiCheat ?? false,
          forceFullscreen: simulationData.forceFullscreen ?? false,
          blockTabChange: simulationData.blockTabChange ?? false,
          blockCopyPaste: simulationData.blockCopyPaste ?? false,
          logSuspiciousEvents: simulationData.logSuspiciousEvents ?? false,
          createdBy: { connect: { id: ctx.user.id } },
          creatorRole: ctx.user.role,
          class: simClassId ? { connect: { id: simClassId } } : undefined,
          questions: {
            create: questions.map((q, index) => ({
              question: { connect: { id: q.questionId } },
              order: q.order ?? index,
              customPoints: q.customPoints,
              customNegativePoints: q.customNegativePoints,
            })),
          },
          assignments: assignments.length > 0 ? {
            create: assignments.map(a => ({
              student: a.studentId ? { connect: { id: a.studentId } } : undefined,
              group: a.groupId ? { connect: { id: a.groupId } } : undefined,
              class: a.classId ? { connect: { id: a.classId } } : undefined,
              dueDate: a.dueDate ? new Date(a.dueDate) : null,
              notes: a.notes,
              assignedBy: { connect: { id: ctx.user.id } },
            })),
          } : undefined,
        },
        include: {
          questions: { include: { question: true } },
          assignments: true,
        },
      });

      // Send notifications to assigned students (calendar event + email with .ics)
      if (simulation.assignments.length > 0) {
        // Fire and forget - don't block the response
        notifySimulationCreated(simulation.id, ctx.prisma).catch((error) => {
          console.error('[Simulations] Failed to send notifications:', error);
        });
      }

      return simulation;
    }),

  // Create simulation with automatic question selection
  createAutomatic: staffProcedure
    .input(createSimulationAutoSchema)
    .mutation(async ({ ctx, input }) => {
      const { subjectDistribution, difficultyDistribution, topicIds, assignments, ...simulationData } = input;

      // Validate official simulations
      if (simulationData.isOfficial && ctx.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Solo gli admin possono creare simulazioni ufficiali',
        });
      }

      // For collaborators: validate they can only assign to their groups/students
      if (ctx.user.role === 'COLLABORATOR' && ctx.user.collaborator?.id && assignments.length > 0) {
        const collaboratorId = ctx.user.collaborator.id;
        
        // Get groups managed by this collaborator
        const collaboratorGroups = await ctx.prisma.group.findMany({
          where: { referenceCollaboratorId: collaboratorId },
          select: { id: true },
        });
        const allowedGroupIds = new Set(collaboratorGroups.map(g => g.id));

        // Get students in those groups
        const studentsInGroups = await ctx.prisma.groupMember.findMany({
          where: { groupId: { in: Array.from(allowedGroupIds) } },
          select: { studentId: true },
        });
        const allowedStudentIds = new Set(studentsInGroups.map(m => m.studentId));

        // Validate each assignment
        for (const target of assignments) {
          if (target.groupId && !allowedGroupIds.has(target.groupId)) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Non puoi assegnare a gruppi che non gestisci',
            });
          }
          if (target.studentId && !allowedStudentIds.has(target.studentId)) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Non puoi assegnare a studenti che non sono nei tuoi gruppi',
            });
          }
          if (target.classId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'I collaboratori non possono assegnare a intere classi',
            });
          }
        }
      }

      // Calculate total questions from distribution
      const totalNeeded = Object.values(subjectDistribution).reduce((a, b) => a + b, 0);
      
      if (totalNeeded !== simulationData.totalQuestions) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Il numero totale di domande (${simulationData.totalQuestions}) non corrisponde alla distribuzione (${totalNeeded})`,
        });
      }

      // Select questions based on criteria
      const selectedQuestions: { id: string; order: number }[] = [];
      let currentOrder = 0;

      for (const [subjectId, count] of Object.entries(subjectDistribution)) {
        if (count <= 0) continue;

        const where: Prisma.QuestionWhereInput = {
          subjectId,
          status: 'PUBLISHED',
        };

        if (topicIds && topicIds.length > 0) {
          where.topicId = { in: topicIds };
        }

        // Get questions for this subject
        const questions = await ctx.prisma.question.findMany({
          where,
          select: { id: true, difficulty: true },
          take: count * 3, // Get more than needed for random selection
        });

        if (questions.length < count) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Non ci sono abbastanza domande per la materia selezionata (disponibili: ${questions.length}, richieste: ${count})`,
          });
        }

        // Apply difficulty filter if specified
        let filteredQuestions = questions;
        if (difficultyDistribution) {
          const { EASY, MEDIUM, HARD } = difficultyDistribution;
          const total = EASY + MEDIUM + HARD;
          if (total > 0) {
            // Proportionally select by difficulty
            const easyCount = Math.round((EASY / total) * count);
            const mediumCount = Math.round((MEDIUM / total) * count);
            const hardCount = count - easyCount - mediumCount;

            const easyQs = questions.filter(q => q.difficulty === 'EASY').slice(0, easyCount);
            const mediumQs = questions.filter(q => q.difficulty === 'MEDIUM').slice(0, mediumCount);
            const hardQs = questions.filter(q => q.difficulty === 'HARD').slice(0, hardCount);

            filteredQuestions = [...easyQs, ...mediumQs, ...hardQs];
          }
        }

        // Shuffle and select
        const shuffled = filteredQuestions.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, count);

        for (const q of selected) {
          selectedQuestions.push({ id: q.id, order: currentOrder++ });
        }
      }

      // Create simulation
      const simClassId = simulationData.classId;
      
      const simulation = await ctx.prisma.simulation.create({
        data: {
          title: simulationData.title,
          description: simulationData.description,
          type: simulationData.type,
          visibility: simulationData.visibility ?? 'PRIVATE',
          isOfficial: simulationData.isOfficial ?? false,
          durationMinutes: simulationData.durationMinutes ?? 0,
          totalQuestions: selectedQuestions.length,
          showResults: simulationData.showResults ?? true,
          showCorrectAnswers: simulationData.showCorrectAnswers ?? true,
          allowReview: simulationData.allowReview ?? true,
          randomizeOrder: simulationData.randomizeOrder ?? false,
          randomizeAnswers: simulationData.randomizeAnswers ?? false,
          useQuestionPoints: simulationData.useQuestionPoints ?? false,
          correctPoints: simulationData.correctPoints ?? 1.5,
          wrongPoints: simulationData.wrongPoints ?? -0.4,
          blankPoints: simulationData.blankPoints ?? 0,
          maxScore: simulationData.maxScore,
          passingScore: simulationData.passingScore,
          isRepeatable: simulationData.isRepeatable ?? false,
          maxAttempts: simulationData.maxAttempts,
          isPublic: simulationData.isPublic ?? false,
          startDate: simulationData.startDate ? new Date(simulationData.startDate) : null,
          endDate: simulationData.endDate ? new Date(simulationData.endDate) : null,
          subjectDistribution: subjectDistribution as Prisma.JsonObject,
          difficultyDistribution: difficultyDistribution as Prisma.JsonObject | null,
          topicIds: topicIds ?? [],
          // New fields for paper-based, attendance, sections, and anti-cheat
          isPaperBased: simulationData.isPaperBased ?? false,
          paperInstructions: simulationData.paperInstructions,
          trackAttendance: simulationData.trackAttendance ?? false,
          locationType: simulationData.locationType,
          locationDetails: simulationData.locationDetails,
          hasSections: simulationData.hasSections ?? false,
          sections: simulationData.sections ?? undefined,
          isScheduled: simulationData.isScheduled ?? false,
          enableAntiCheat: simulationData.enableAntiCheat ?? false,
          forceFullscreen: simulationData.forceFullscreen ?? false,
          blockTabChange: simulationData.blockTabChange ?? false,
          blockCopyPaste: simulationData.blockCopyPaste ?? false,
          logSuspiciousEvents: simulationData.logSuspiciousEvents ?? false,
          createdBy: { connect: { id: ctx.user.id } },
          creatorRole: ctx.user.role,
          class: simClassId ? { connect: { id: simClassId } } : undefined,
          questions: {
            create: selectedQuestions.map(q => ({
              question: { connect: { id: q.id } },
              order: q.order,
            })),
          },
          assignments: assignments.length > 0 ? {
            create: assignments.map(a => ({
              student: a.studentId ? { connect: { id: a.studentId } } : undefined,
              group: a.groupId ? { connect: { id: a.groupId } } : undefined,
              class: a.classId ? { connect: { id: a.classId } } : undefined,
              dueDate: a.dueDate ? new Date(a.dueDate) : null,
              notes: a.notes,
              assignedBy: { connect: { id: ctx.user.id } },
            })),
          } : undefined,
        },
        include: {
          questions: { include: { question: true } },
          assignments: true,
        },
      });

      // Send notifications to assigned students (calendar event + email with .ics)
      if (simulation.assignments.length > 0) {
        // Fire and forget - don't block the response
        notifySimulationCreated(simulation.id, ctx.prisma).catch((error) => {
          console.error('[Simulations] Failed to send notifications for automatic simulation:', error);
        });
      }

      return simulation;
    }),

  // Update simulation metadata
  update: staffProcedure
    .input(updateSimulationSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Check simulation exists
      const existing = await ctx.prisma.simulation.findUnique({
        where: { id },
        select: { createdById: true, status: true, isOfficial: true },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      // Collaborators can only edit their own
      if (ctx.user.role === 'COLLABORATOR' && existing.createdById !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non hai i permessi per modificare questa simulazione' });
      }

      // Can't make official if not admin
      if (data.isOfficial && !existing.isOfficial && ctx.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Solo gli admin possono rendere ufficiale una simulazione',
        });
      }

      // Can't edit closed simulations
      if (existing.status === 'CLOSED' || existing.status === 'ARCHIVED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Non puoi modificare una simulazione chiusa o archiviata',
        });
      }

      const simulation = await ctx.prisma.simulation.update({
        where: { id },
        data: {
          ...data,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
        },
        include: {
          createdBy: { select: { id: true, name: true } },
          class: { select: { id: true, name: true } },
          _count: { select: { questions: true, results: true, assignments: true } },
        },
      });

      return simulation;
    }),

  // Update simulation questions
  updateQuestions: staffProcedure
    .input(updateSimulationQuestionsSchema)
    .mutation(async ({ ctx, input }) => {
      const { simulationId, questions, mode } = input;

      // Check simulation
      const existing = await ctx.prisma.simulation.findUnique({
        where: { id: simulationId },
        select: { createdById: true, status: true },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      if (ctx.user.role === 'COLLABORATOR' && existing.createdById !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non hai i permessi' });
      }

      if (existing.status === 'CLOSED' || existing.status === 'ARCHIVED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Non puoi modificare le domande di una simulazione chiusa' });
      }

      // Validate questions exist
      const questionIds = questions.map(q => q.questionId);
      const existingQuestions = await ctx.prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: { id: true },
      });

      if (existingQuestions.length !== questionIds.length) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Una o più domande non esistono' });
      }

      await ctx.prisma.$transaction(async (tx) => {
        if (mode === 'replace') {
          // Delete all existing questions and add new ones
          await tx.simulationQuestion.deleteMany({ where: { simulationId } });
          await tx.simulationQuestion.createMany({
            data: questions.map((q, index) => ({
              simulationId,
              questionId: q.questionId,
              order: q.order ?? index,
              customPoints: q.customPoints,
              customNegativePoints: q.customNegativePoints,
            })),
          });
          await tx.simulation.update({
            where: { id: simulationId },
            data: { totalQuestions: questions.length },
          });
        } else if (mode === 'append') {
          // Get current max order
          const maxOrder = await tx.simulationQuestion.findFirst({
            where: { simulationId },
            orderBy: { order: 'desc' },
            select: { order: true },
          });
          const startOrder = (maxOrder?.order ?? -1) + 1;

          await tx.simulationQuestion.createMany({
            data: questions.map((q, index) => ({
              simulationId,
              questionId: q.questionId,
              order: startOrder + index,
              customPoints: q.customPoints,
              customNegativePoints: q.customNegativePoints,
            })),
          });

          // Update total
          const newTotal = await tx.simulationQuestion.count({ where: { simulationId } });
          await tx.simulation.update({
            where: { id: simulationId },
            data: { totalQuestions: newTotal },
          });
        } else if (mode === 'remove') {
          await tx.simulationQuestion.deleteMany({
            where: {
              simulationId,
              questionId: { in: questionIds },
            },
          });

          const newTotal = await tx.simulationQuestion.count({ where: { simulationId } });
          await tx.simulation.update({
            where: { id: simulationId },
            data: { totalQuestions: newTotal },
          });
        }
      });

      return { success: true };
    }),

  // Delete simulation
  delete: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.simulation.findUnique({
        where: { id: input.id },
        select: { createdById: true, status: true, _count: { select: { results: true } } },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      // Only creators or admins can delete
      if (ctx.user.role === 'COLLABORATOR' && existing.createdById !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non hai i permessi per eliminare questa simulazione' });
      }

      // Can't delete if has results (archive instead)
      if (existing._count.results > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Non puoi eliminare una simulazione con risultati. Archiviala invece.',
        });
      }

      await ctx.prisma.simulation.delete({ where: { id: input.id } });

      return { success: true };
    }),

  // Publish simulation
  publish: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: input.id },
        include: {
          questions: { include: { question: { select: { status: true } } } },
        },
      });

      if (!simulation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      if (ctx.user.role === 'COLLABORATOR' && simulation.createdById !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non hai i permessi' });
      }

      // Check all questions are published
      const unpublished = simulation.questions.filter(sq => sq.question.status !== 'PUBLISHED');
      if (unpublished.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `${unpublished.length} domande non sono ancora pubblicate`,
        });
      }

      // Check has at least 1 question
      if (simulation.questions.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La simulazione deve avere almeno una domanda',
        });
      }

      const updated = await ctx.prisma.simulation.update({
        where: { id: input.id },
        data: { status: 'PUBLISHED' },
      });

      return updated;
    }),

  // Archive simulation
  archive: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.simulation.findUnique({
        where: { id: input.id },
        select: { createdById: true },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      if (ctx.user.role === 'COLLABORATOR' && existing.createdById !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non hai i permessi' });
      }

      const simulation = await ctx.prisma.simulation.update({
        where: { id: input.id },
        data: { status: 'ARCHIVED' },
      });

      return simulation;
    }),

  // ==================== ASSIGNMENTS ====================

  // Add assignments to simulation
  addAssignments: staffProcedure
    .input(bulkAssignmentSchema)
    .mutation(async ({ ctx, input }) => {
      const { simulationId, targets } = input;

      // Check simulation exists
      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: simulationId },
        select: { createdById: true, status: true },
      });

      if (!simulation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      if (ctx.user.role === 'COLLABORATOR' && simulation.createdById !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non hai i permessi' });
      }

      // For collaborators: validate they can only assign to their groups/students
      if (ctx.user.role === 'COLLABORATOR' && ctx.user.collaborator?.id) {
        const collaboratorId = ctx.user.collaborator.id;
        
        // Get groups managed by this collaborator
        const collaboratorGroups = await ctx.prisma.group.findMany({
          where: { referenceCollaboratorId: collaboratorId },
          select: { id: true },
        });
        const allowedGroupIds = new Set(collaboratorGroups.map(g => g.id));

        // Get students in those groups
        const studentsInGroups = await ctx.prisma.groupMember.findMany({
          where: { groupId: { in: Array.from(allowedGroupIds) } },
          select: { studentId: true },
        });
        const allowedStudentIds = new Set(studentsInGroups.map(m => m.studentId));

        // Validate each target
        for (const target of targets) {
          if (target.groupId && !allowedGroupIds.has(target.groupId)) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Non puoi assegnare a gruppi che non gestisci',
            });
          }
          if (target.studentId && !allowedStudentIds.has(target.studentId)) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Non puoi assegnare a studenti che non sono nei tuoi gruppi',
            });
          }
          if (target.classId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'I collaboratori non possono assegnare a intere classi',
            });
          }
        }
      }

      // Create assignments (ignore duplicates)
      const created = await ctx.prisma.$transaction(async (tx) => {
        const results = [];
        for (const target of targets) {
          try {
            const assignment = await tx.simulationAssignment.create({
              data: {
                simulationId,
                studentId: target.studentId,
                groupId: target.groupId,
                classId: target.classId,
                dueDate: target.dueDate ? new Date(target.dueDate) : null,
                notes: target.notes,
                assignedById: ctx.user.id,
              },
            });
            results.push(assignment);
          } catch {
            // Ignore duplicate assignments
          }
        }
        return results;
      });

      // Send notifications for newly added assignments
      if (created.length > 0) {
        // Fire and forget - don't block the response
        notifySimulationCreated(simulationId, ctx.prisma).catch((error) => {
          console.error('[Simulations] Failed to send notifications for new assignments:', error);
        });
      }

      return { created: created.length };
    }),

  // Remove assignment
  removeAssignment: staffProcedure
    .input(z.object({ assignmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.prisma.simulationAssignment.findUnique({
        where: { id: input.assignmentId },
        include: { simulation: { select: { createdById: true } } },
      });

      if (!assignment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Assegnazione non trovata' });
      }

      if (ctx.user.role === 'COLLABORATOR' && assignment.simulation.createdById !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non hai i permessi' });
      }

      await ctx.prisma.simulationAssignment.delete({ where: { id: input.assignmentId } });

      return { success: true };
    }),

  // ==================== STUDENT PROCEDURES ====================

  // Get available simulations for student
  getAvailableSimulations: studentProcedure
    .input(studentSimulationFilterSchema)
    .query(async ({ ctx, input }) => {
      const { page, pageSize, type, status, isOfficial, sortBy, sortOrder } = input;

      const student = await getStudentFromUser(ctx.prisma, ctx.user.id);
      const studentId = student.id;
      const classId = student.classId;
      const now = new Date();

      // Get student's groups
      const groupMembers = await ctx.prisma.groupMember.findMany({
        where: { studentId },
        select: { groupId: true },
      });
      const groupIds = groupMembers.map(gm => gm.groupId);

      // Build base conditions for accessible simulations
      const accessConditions: Prisma.SimulationWhereInput[] = [
        // Public simulations
        { isPublic: true },
        // Assigned to student directly
        { assignments: { some: { studentId } } },
        // Assigned to student's class
        ...(classId ? [
          { classId },
          { assignments: { some: { classId } } },
        ] : []),
        // Assigned to student's groups
        ...(groupIds.length > 0 ? [
          { assignments: { some: { groupId: { in: groupIds } } } },
        ] : []),
      ];

      const where: Prisma.SimulationWhereInput = {
        status: 'PUBLISHED',
        OR: accessConditions,
      };

      // Apply filters
      if (type) where.type = type;
      if (typeof isOfficial === 'boolean') where.isOfficial = isOfficial;

      // Status filter (available, in_progress, completed, expired)
      if (status === 'available') {
        where.AND = [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gt: now } }] },
        ];
      } else if (status === 'expired') {
        where.endDate = { lt: now };
      }

      // Get student's results for filtering
      const studentResults = await ctx.prisma.simulationResult.findMany({
        where: { studentId },
        select: { simulationId: true, completedAt: true },
      });
      const completedSimulationIds = studentResults
        .filter(r => r.completedAt)
        .map(r => r.simulationId);
      const inProgressSimulationIds = studentResults
        .filter(r => !r.completedAt)
        .map(r => r.simulationId);

      if (status === 'completed') {
        where.id = { in: completedSimulationIds };
      } else if (status === 'in_progress') {
        where.id = { in: inProgressSimulationIds };
      }

      // Count total
      const total = await ctx.prisma.simulation.count({ where });

      // Get simulations
      const simulations = await ctx.prisma.simulation.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdBy: { select: { name: true } },
          class: { select: { id: true, name: true } },
          _count: { select: { questions: true } },
          assignments: {
            where: {
              OR: [
                { studentId },
                ...(classId ? [{ classId }] : []),
                ...(groupIds.length > 0 ? [{ groupId: { in: groupIds } }] : []),
              ],
            },
            select: { dueDate: true, notes: true },
            take: 1,
          },
        },
      });

      // Add student's status for each simulation
      const simulationsWithStatus = simulations.map(sim => {
        const isCompleted = completedSimulationIds.includes(sim.id);
        const isInProgress = inProgressSimulationIds.includes(sim.id);
        const isExpired = sim.endDate && sim.endDate < now;
        const isNotStarted = sim.startDate && sim.startDate > now;

        let studentStatus: 'not_started' | 'available' | 'in_progress' | 'completed' | 'expired';
        if (isCompleted) studentStatus = 'completed';
        else if (isInProgress) studentStatus = 'in_progress';
        else if (isExpired) studentStatus = 'expired';
        else if (isNotStarted) studentStatus = 'not_started';
        else studentStatus = 'available';

        return {
          ...sim,
          studentStatus,
          dueDate: sim.assignments[0]?.dueDate ?? null,
          assignmentNotes: sim.assignments[0]?.notes ?? null,
        };
      });

      return {
        simulations: simulationsWithStatus,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Get simulation details for student (without answers if not allowed)
  getSimulationForStudent: studentProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const student = await getStudentFromUser(ctx.prisma, ctx.user.id);
      const studentId = student.id;
      const classId = student.classId;
      const now = new Date();

      // Get student's groups
      const groupMembers = await ctx.prisma.groupMember.findMany({
        where: { studentId },
        select: { groupId: true },
      });
      const groupIds = groupMembers.map(gm => gm.groupId);

      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: input.id },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: {
              question: {
                include: {
                  subject: { select: { id: true, name: true, code: true, color: true } },
                  topic: { select: { id: true, name: true } },
                  answers: {
                    select: {
                      id: true,
                      text: true,
                      textLatex: true,
                      imageUrl: true,
                      imageAlt: true,
                      order: true,
                      label: true,
                      // NOTE: isCorrect is intentionally excluded for active simulations
                    },
                    orderBy: { order: 'asc' },
                  },
                },
              },
            },
          },
          assignments: {
            where: {
              OR: [
                { studentId },
                ...(classId ? [{ classId }] : []),
                ...(groupIds.length > 0 ? [{ groupId: { in: groupIds } }] : []),
              ],
            },
            select: { dueDate: true, notes: true },
            take: 1,
          },
        },
      });

      if (!simulation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      // Check access
      const hasAccess = 
        simulation.isPublic ||
        simulation.classId === classId ||
        simulation.assignments.length > 0;

      if (!hasAccess) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non hai accesso a questa simulazione' });
      }

      // Check dates
      if (simulation.startDate && simulation.startDate > now) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'La simulazione non è ancora iniziata' });
      }

      if (simulation.endDate && simulation.endDate < now) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'La simulazione è scaduta' });
      }

      // Check attempts
      const existingResults = await ctx.prisma.simulationResult.findMany({
        where: { simulationId: input.id, studentId },
        orderBy: { startedAt: 'desc' },
      });

      const completedAttempts = existingResults.filter(r => r.completedAt).length;
      const inProgressAttempt = existingResults.find(r => !r.completedAt);

      if (!simulation.isRepeatable && completedAttempts > 0 && !inProgressAttempt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Hai già completato questa simulazione',
        });
      }

      if (simulation.maxAttempts && completedAttempts >= simulation.maxAttempts && !inProgressAttempt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Hai raggiunto il numero massimo di tentativi (${simulation.maxAttempts})`,
        });
      }

      // Randomize if needed
      let questions = simulation.questions;
      if (simulation.randomizeOrder) {
        questions = [...questions].sort(() => Math.random() - 0.5);
      }

      if (simulation.randomizeAnswers) {
        questions = questions.map(sq => ({
          ...sq,
          question: {
            ...sq.question,
            answers: [...sq.question.answers].sort(() => Math.random() - 0.5),
          },
        }));
      }

      return {
        ...simulation,
        questions,
        completedAttempts,
        hasInProgressAttempt: !!inProgressAttempt,
        inProgressAttemptId: inProgressAttempt?.id,
        dueDate: simulation.assignments[0]?.dueDate ?? null,
      };
    }),

  // Start simulation attempt
  startAttempt: studentProcedure
    .input(z.object({ simulationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const student = await getStudentFromUser(ctx.prisma, ctx.user.id);
      const studentId = student.id;

      // Check simulation exists and is accessible
      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: input.simulationId },
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          isRepeatable: true,
          maxAttempts: true,
          totalQuestions: true,
        },
      });

      if (!simulation || simulation.status !== 'PUBLISHED') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non disponibile' });
      }

      const now = new Date();
      if (simulation.startDate && simulation.startDate > now) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'La simulazione non è ancora iniziata' });
      }
      if (simulation.endDate && simulation.endDate < now) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'La simulazione è scaduta' });
      }

      // Check existing attempts
      const existingResults = await ctx.prisma.simulationResult.findMany({
        where: { simulationId: input.simulationId, studentId },
      });

      const completedAttempts = existingResults.filter(r => r.completedAt).length;
      const inProgressAttempt = existingResults.find(r => !r.completedAt);

      // Return existing in-progress attempt
      if (inProgressAttempt) {
        return { resultId: inProgressAttempt.id, resumed: true };
      }

      // Check if can start new attempt
      if (!simulation.isRepeatable && completedAttempts > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Simulazione già completata' });
      }

      if (simulation.maxAttempts && completedAttempts >= simulation.maxAttempts) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tentativi esauriti' });
      }

      // Create new attempt
      const result = await ctx.prisma.simulationResult.create({
        data: {
          simulation: { connect: { id: input.simulationId } },
          student: { connect: { id: studentId } },
          totalQuestions: simulation.totalQuestions,
          answers: [],
        },
      });

      return { resultId: result.id, resumed: false };
    }),

  // Save progress (partial save)
  saveProgress: studentProcedure
    .input(z.object({
      resultId: z.string(),
      answers: z.array(z.object({
        questionId: z.string(),
        answerId: z.string().nullable().optional(),
        answerText: z.string().nullable().optional(),
        timeSpent: z.number().optional(),
        flagged: z.boolean().optional(),
      })),
      timeSpent: z.number().int().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const { resultId, answers, timeSpent } = input;
      const student = await getStudentFromUser(ctx.prisma, ctx.user.id);

      const result = await ctx.prisma.simulationResult.findUnique({
        where: { id: resultId },
        select: { studentId: true, completedAt: true },
      });

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Tentativo non trovato' });
      }

      if (result.studentId !== student.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non autorizzato' });
      }

      if (result.completedAt) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tentativo già completato' });
      }

      await ctx.prisma.simulationResult.update({
        where: { id: resultId },
        data: {
          answers: answers as Prisma.JsonArray,
          durationSeconds: timeSpent,
        },
      });

      return { success: true };
    }),

  // Submit simulation (final)
  submit: studentProcedure
    .input(submitSimulationSchema)
    .mutation(async ({ ctx, input }) => {
      const { simulationId, answers, totalTimeSpent } = input;
      const student = await getStudentFromUser(ctx.prisma, ctx.user.id);
      const studentId = student.id;

      // Get simulation with questions
      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: simulationId },
        include: {
          questions: {
            include: {
              question: {
                include: { answers: true },
              },
            },
          },
        },
      });

      if (!simulation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      // Get or create result
      let result = await ctx.prisma.simulationResult.findFirst({
        where: { simulationId, studentId, completedAt: null },
      });

      if (!result) {
        // Create new result for direct submission
        const _completedCount = await ctx.prisma.simulationResult.count({
          where: { simulationId, studentId, completedAt: { not: null } },
        });

        result = await ctx.prisma.simulationResult.create({
          data: {
            simulation: { connect: { id: simulationId } },
            student: { connect: { id: studentId } },
            totalQuestions: simulation.totalQuestions,
            answers: [],
          },
        });
      }

      // Calculate score
      let correctCount = 0;
      let wrongCount = 0;
      let blankCount = 0;
      let totalScore = 0;

      const evaluatedAnswers = [];

      for (const sq of simulation.questions) {
        const studentAnswer = answers.find(a => a.questionId === sq.questionId);
        const correctAnswer = sq.question.answers.find(a => a.isCorrect);

        const points = sq.customPoints ?? (simulation.useQuestionPoints ? sq.question.points : simulation.correctPoints);
        const negativePoints = sq.customNegativePoints ?? (simulation.useQuestionPoints ? sq.question.negativePoints : simulation.wrongPoints);

        let isCorrect = false;
        let earnedPoints = 0;

        if (!studentAnswer?.answerId) {
          // Blank answer
          blankCount++;
          earnedPoints = simulation.blankPoints;
        } else if (studentAnswer.answerId === correctAnswer?.id) {
          // Correct answer
          isCorrect = true;
          correctCount++;
          earnedPoints = points;
        } else {
          // Wrong answer
          wrongCount++;
          earnedPoints = negativePoints;
        }

        totalScore += earnedPoints;

        evaluatedAnswers.push({
          questionId: sq.questionId,
          answerId: studentAnswer?.answerId ?? null,
          answerText: studentAnswer?.answerText ?? null,
          isCorrect,
          earnedPoints,
          timeSpent: studentAnswer?.timeSpent ?? 0,
        });
      }

      // Update result
      const updatedResult = await ctx.prisma.simulationResult.update({
        where: { id: result.id },
        data: {
          answers: evaluatedAnswers as Prisma.JsonArray,
          totalScore: totalScore,
          percentageScore: simulation.maxScore ? (totalScore / simulation.maxScore) * 100 : 0,
          correctAnswers: correctCount,
          wrongAnswers: wrongCount,
          blankAnswers: blankCount,
          durationSeconds: totalTimeSpent,
          completedAt: new Date(),
        },
      });

      // Return results if allowed
      if (simulation.showResults) {
        return {
          resultId: updatedResult.id,
          score: totalScore,
          maxScore: simulation.maxScore,
          correctCount,
          wrongCount,
          blankCount,
          totalQuestions: simulation.totalQuestions,
          passed: simulation.passingScore ? totalScore >= simulation.passingScore : null,
          showCorrectAnswers: simulation.showCorrectAnswers,
          answers: simulation.showCorrectAnswers ? evaluatedAnswers : undefined,
        };
      }

      return {
        resultId: updatedResult.id,
        message: 'Simulazione completata. I risultati saranno disponibili dopo la chiusura.',
      };
    }),

  // Get detailed result for review
  getResultDetails: studentProcedure
    .input(z.object({ resultId: z.string() }))
    .query(async ({ ctx, input }) => {
      const student = await getStudentFromUser(ctx.prisma, ctx.user.id);
      
      const result = await ctx.prisma.simulationResult.findUnique({
        where: { id: input.resultId },
        include: {
          simulation: {
            select: {
              id: true,
              title: true,
              description: true,
              type: true,
              isOfficial: true,
              maxScore: true,
              passingScore: true,
              totalQuestions: true,
              correctPoints: true,
              wrongPoints: true,
              blankPoints: true,
              showCorrectAnswers: true,
              allowReview: true,
            },
          },
          student: {
            select: { id: true },
          },
        },
      });

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Risultato non trovato' });
      }

      // Verify this result belongs to the student
      if (result.student.id !== student.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non hai accesso a questo risultato' });
      }

      // Check if review is allowed
      if (!result.simulation.allowReview) {
        return {
          simulation: result.simulation,
          score: result.totalScore ?? 0,
          totalScore: result.simulation.maxScore ?? 0,
          correctAnswers: result.correctAnswers ?? 0,
          wrongAnswers: result.wrongAnswers ?? 0,
          blankAnswers: result.blankAnswers ?? 0,
          timeSpent: result.durationSeconds ?? 0,
          passed: result.simulation.passingScore 
            ? (result.totalScore ?? 0) >= result.simulation.passingScore 
            : null,
          answers: [],
          canReview: false,
        };
      }

      // Get question details for review
      const answersData = result.answers as Array<{
        questionId: string;
        answerId: string | null;
        isCorrect: boolean;
        earnedPoints: number;
        timeSpent: number;
      }>;

      // Fetch all questions with their answers
      const questionIds = answersData.map(a => a.questionId);
      const questions = await ctx.prisma.question.findMany({
        where: { id: { in: questionIds } },
        include: {
          answers: {
            select: {
              id: true,
              text: true,
              isCorrect: result.simulation.showCorrectAnswers,
            },
          },
          subject: { select: { name: true } },
          topic: { select: { name: true } },
        },
      });

      // Build answers with question details
      const detailedAnswers = answersData.map(answer => {
        const question = questions.find(q => q.id === answer.questionId);
        return {
          id: answer.questionId,
          question: {
            id: question?.id || '',
            text: question?.text || '',
            subject: question?.subject?.name || 'UNKNOWN',
            explanation: question?.generalExplanation || question?.correctExplanation || null,
            answers: question?.answers || [],
          },
          selectedAnswerId: answer.answerId,
          isCorrect: result.simulation.showCorrectAnswers ? answer.isCorrect : null,
          earnedPoints: answer.earnedPoints,
          timeSpent: answer.timeSpent,
        };
      });

      return {
        simulation: result.simulation,
        score: result.totalScore ?? 0,
        totalScore: result.simulation.maxScore ?? 0,
        correctAnswers: result.correctAnswers ?? 0,
        wrongAnswers: result.wrongAnswers ?? 0,
        blankAnswers: result.blankAnswers ?? 0,
        timeSpent: result.durationSeconds ?? 0,
        passed: result.simulation.passingScore 
          ? (result.totalScore ?? 0) >= result.simulation.passingScore 
          : null,
        answers: detailedAnswers,
        canReview: true,
      };
    }),

  // Get student's results
  getMyResults: studentProcedure
    .input(z.object({
      simulationId: z.string().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { simulationId, page, pageSize } = input;
      const student = await getStudentFromUser(ctx.prisma, ctx.user.id);
      const studentId = student.id;

      const where: Prisma.SimulationResultWhereInput = {
        studentId,
        completedAt: { not: null },
      };

      if (simulationId) where.simulationId = simulationId;

      const total = await ctx.prisma.simulationResult.count({ where });

      const results = await ctx.prisma.simulationResult.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { completedAt: 'desc' },
        include: {
          simulation: {
            select: {
              id: true,
              title: true,
              type: true,
              isOfficial: true,
              maxScore: true,
              passingScore: true,
              totalQuestions: true,
              showCorrectAnswers: true,
              allowReview: true,
            },
          },
        },
      });

      return {
        results,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // ==================== QUICK QUIZ ====================

  // Generate quick quiz (for students)
  generateQuickQuiz: studentProcedure
    .input(quickQuizConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const { subjectIds, topicIds, difficulty, questionCount, durationMinutes, correctPoints, wrongPoints, showResultsImmediately, showCorrectAnswers } = input;
      const student = await getStudentFromUser(ctx.prisma, ctx.user.id);

      // Build question selection criteria
      const where: Prisma.QuestionWhereInput = {
        subjectId: { in: subjectIds },
        status: 'PUBLISHED',
      };

      if (topicIds && topicIds.length > 0) {
        where.topicId = { in: topicIds };
      }

      if (difficulty !== 'MIXED') {
        where.difficulty = difficulty;
      }

      // Get questions
      const questions = await ctx.prisma.question.findMany({
        where,
        select: { id: true },
        take: questionCount * 3,
      });

      if (questions.length < questionCount) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Non ci sono abbastanze domande (disponibili: ${questions.length}, richieste: ${questionCount})`,
        });
      }

      // Shuffle and select
      const shuffled = questions.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, questionCount);

      // Create simulation
      const simulation = await ctx.prisma.simulation.create({
        data: {
          title: `Quiz Veloce - ${new Date().toLocaleDateString('it-IT')}`,
          type: 'QUICK_QUIZ',
          status: 'PUBLISHED',
          visibility: 'PRIVATE',
          createdBy: { connect: { id: ctx.user.id } },
          creatorRole: 'STUDENT',
          isOfficial: false,
          durationMinutes,
          totalQuestions: questionCount,
          showResults: showResultsImmediately,
          showCorrectAnswers,
          allowReview: true,
          randomizeOrder: true,
          randomizeAnswers: true,
          correctPoints,
          wrongPoints,
          blankPoints: 0,
          isRepeatable: false,
          questions: {
            create: selected.map((q, i) => ({
              question: { connect: { id: q.id } },
              order: i,
            })),
          },
          assignments: {
            create: {
              student: { connect: { id: student.id } },
              assignedBy: { connect: { id: ctx.user.id } },
            },
          },
        },
      });

      return { simulationId: simulation.id };
    }),

  // ==================== STATISTICS ====================

  // Get simulation statistics (admin/staff)
  getStatistics: staffProcedure
    .input(z.object({ simulationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: input.simulationId },
        select: { createdById: true, passingScore: true },
      });

      if (!simulation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      if (ctx.user.role === 'COLLABORATOR' && simulation.createdById !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non hai accesso alle statistiche' });
      }

      const results = await ctx.prisma.simulationResult.findMany({
        where: { simulationId: input.simulationId, completedAt: { not: null } },
        select: {
          totalScore: true,
          correctAnswers: true,
          wrongAnswers: true,
          blankAnswers: true,
          durationSeconds: true,
        },
      });

      if (results.length === 0) {
        return {
          totalAttempts: 0,
          averageScore: 0,
          maxScore: 0,
          minScore: 0,
          averageCorrect: 0,
          averageWrong: 0,
          averageBlank: 0,
          averageTime: 0,
          passRate: 0,
        };
      }

      const scores = results.map(r => r.totalScore ?? 0);
      const correctCounts = results.map(r => r.correctAnswers ?? 0);
      const wrongCounts = results.map(r => r.wrongAnswers ?? 0);
      const blankCounts = results.map(r => r.blankAnswers ?? 0);
      const times = results.map(r => r.durationSeconds ?? 0);

      // Calculate pass rate if passingScore is set
      const passRate = simulation.passingScore 
        ? results.filter(r => (r.totalScore ?? 0) >= simulation.passingScore!).length / results.length * 100
        : 0;

      return {
        totalAttempts: results.length,
        averageScore: scores.reduce((a, b) => a + b, 0) / results.length,
        maxScore: Math.max(...scores),
        minScore: Math.min(...scores),
        averageCorrect: correctCounts.reduce((a, b) => a + b, 0) / results.length,
        averageWrong: wrongCounts.reduce((a, b) => a + b, 0) / results.length,
        averageBlank: blankCounts.reduce((a, b) => a + b, 0) / results.length,
        averageTime: times.reduce((a, b) => a + b, 0) / results.length,
        passRate,
      };
    }),

  // Get leaderboard for official simulations
  // Students see their own name but others are anonymized
  // Admin and simulation creator (collaborator) see all names
  getLeaderboard: protectedProcedure
    .input(z.object({ 
      simulationId: z.string(),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: input.simulationId },
        select: { 
          id: true,
          title: true,
          isOfficial: true,
          maxScore: true,
          passingScore: true,
          totalQuestions: true,
          createdById: true, // For checking if current user is creator
        },
      });

      if (!simulation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      // Determine if current user can see all names
      const userRole = ctx.user?.role;
      const isAdmin = userRole === 'ADMIN';
      const isCreator = ctx.user?.id === simulation.createdById;
      const canSeeAllNames = isAdmin || isCreator;
      
      // Get current student's ID if user is a student
      let currentStudentId: string | null = null;
      if (userRole === 'STUDENT' && ctx.user?.student?.id) {
        currentStudentId = ctx.user.student.id;
      }

      // Get all completed results ordered by score
      const results = await ctx.prisma.simulationResult.findMany({
        where: { 
          simulationId: input.simulationId, 
          completedAt: { not: null } 
        },
        include: {
          student: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              class: { select: { id: true, name: true, year: true, section: true } },
            },
          },
        },
        orderBy: [
          { totalScore: 'desc' },
          { durationSeconds: 'asc' }, // Tie-breaker: faster time wins
        ],
        take: input.limit,
      });

      // Calculate rankings with tie handling and anonymization
      const leaderboard = results.map((result, index) => {
        // Check if this score ties with previous
        let rank = index + 1;
        if (index > 0) {
          const prevResult = results[index - 1];
          if (result.totalScore === prevResult.totalScore) {
            // Find the rank of the first person with this score
            const firstWithScore = results.findIndex(r => r.totalScore === result.totalScore);
            rank = firstWithScore + 1;
          }
        }

        // Determine if we should show this student's name
        const isCurrentStudent = result.studentId === currentStudentId;
        const showRealName = canSeeAllNames || isCurrentStudent;
        
        // Generate anonymous name: "Partecipante #X" with some fun adjectives for variety
        const anonymousAdjectives = [
          'Misterioso', 'Brillante', 'Coraggioso', 'Diligente', 'Energico',
          'Fantastico', 'Geniale', 'Intraprendente', 'Laborioso', 'Metodico',
          'Notevole', 'Originale', 'Perseverante', 'Risoluto', 'Tenace'
        ];
        const adjective = anonymousAdjectives[index % anonymousAdjectives.length];
        const anonymousName = `Partecipante ${adjective} #${rank}`;

        return {
          rank,
          studentId: showRealName ? result.studentId : null,
          studentName: showRealName ? result.student.user.name : anonymousName,
          studentEmail: showRealName ? result.student.user.email : null,
          className: showRealName 
            ? (result.student.class 
                ? `${result.student.class.year}${result.student.class.section} - ${result.student.class.name}`
                : null)
            : null,
          isCurrentUser: isCurrentStudent,
          totalScore: result.totalScore,
          percentageScore: result.percentageScore,
          correctAnswers: result.correctAnswers,
          wrongAnswers: result.wrongAnswers,
          blankAnswers: result.blankAnswers,
          durationSeconds: result.durationSeconds,
          completedAt: result.completedAt,
          passed: simulation.passingScore 
            ? result.totalScore >= simulation.passingScore 
            : null,
        };
      });

      return {
        simulation: {
          id: simulation.id,
          title: simulation.title,
          isOfficial: simulation.isOfficial,
          maxScore: simulation.maxScore,
          passingScore: simulation.passingScore,
          totalQuestions: simulation.totalQuestions,
        },
        leaderboard,
        totalParticipants: results.length,
        canSeeAllNames, // Let frontend know if user can see all names
      };
    }),

  // ==================== PAPER-BASED RESULTS ====================

  // Create paper-based result for a student (staff only)
  createPaperResult: staffProcedure
    .input(z.object({
      simulationId: z.string().min(1),
      studentId: z.string().min(1),
      answers: z.array(z.object({
        questionId: z.string().min(1),
        answerId: z.string().optional().nullable(),
      })),
      wasPresent: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const { simulationId, studentId, answers, wasPresent } = input;

      // Get simulation with questions
      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: simulationId },
        include: {
          questions: {
            include: {
              question: {
                include: { answers: true },
              },
            },
          },
        },
      });

      if (!simulation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      if (!simulation.isPaperBased) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Questa funzione è disponibile solo per simulazioni cartacee' 
        });
      }

      // Check student exists
      const student = await ctx.prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Studente non trovato' });
      }

      // Check if result already exists
      const existingResult = await ctx.prisma.simulationResult.findUnique({
        where: { simulationId_studentId: { simulationId, studentId } },
      });

      if (existingResult) {
        throw new TRPCError({ 
          code: 'CONFLICT', 
          message: 'Risultato già inserito per questo studente' 
        });
      }

      // If student was not present, create empty result
      if (!wasPresent) {
        const result = await ctx.prisma.simulationResult.create({
          data: {
            simulation: { connect: { id: simulationId } },
            student: { connect: { id: studentId } },
            totalQuestions: simulation.totalQuestions,
            correctAnswers: 0,
            wrongAnswers: 0,
            blankAnswers: simulation.totalQuestions,
            totalScore: 0,
            percentageScore: 0,
            answers: [],
            completedAt: new Date(),
          },
        });

        return { 
          resultId: result.id, 
          wasPresent: false,
          message: 'Studente assente registrato' 
        };
      }

      // Calculate score
      let correctCount = 0;
      let wrongCount = 0;
      let blankCount = 0;
      let totalScore = 0;

      const evaluatedAnswers = [];

      for (const sq of simulation.questions) {
        const studentAnswer = answers.find(a => a.questionId === sq.questionId);
        const correctAnswer = sq.question.answers.find(a => a.isCorrect);

        const points = sq.customPoints ?? (simulation.useQuestionPoints ? sq.question.points : simulation.correctPoints);
        const negativePoints = sq.customNegativePoints ?? (simulation.useQuestionPoints ? sq.question.negativePoints : simulation.wrongPoints);

        let isCorrect = false;
        let earnedPoints = 0;

        if (!studentAnswer?.answerId) {
          // Blank answer
          blankCount++;
          earnedPoints = simulation.blankPoints;
        } else if (studentAnswer.answerId === correctAnswer?.id) {
          // Correct answer
          isCorrect = true;
          correctCount++;
          earnedPoints = points;
        } else {
          // Wrong answer
          wrongCount++;
          earnedPoints = negativePoints;
        }

        totalScore += earnedPoints;

        evaluatedAnswers.push({
          questionId: sq.questionId,
          answerId: studentAnswer?.answerId ?? null,
          isCorrect,
          earnedPoints,
          timeSpent: 0, // Paper-based doesn't track time
        });
      }

      // Create result
      const result = await ctx.prisma.simulationResult.create({
        data: {
          simulation: { connect: { id: simulationId } },
          student: { connect: { id: studentId } },
          totalQuestions: simulation.totalQuestions,
          correctAnswers: correctCount,
          wrongAnswers: wrongCount,
          blankAnswers: blankCount,
          totalScore,
          percentageScore: simulation.maxScore ? (totalScore / simulation.maxScore) * 100 : 0,
          answers: evaluatedAnswers as Prisma.JsonArray,
          completedAt: new Date(),
        },
      });

      return {
        resultId: result.id,
        wasPresent: true,
        score: totalScore,
        maxScore: simulation.maxScore,
        correctCount,
        wrongCount,
        blankCount,
        passed: simulation.passingScore ? totalScore >= simulation.passingScore : null,
      };
    }),

  // Get assigned students for paper-based result entry
  getPaperBasedStudents: staffProcedure
    .input(z.object({ simulationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const simulation = await ctx.prisma.simulation.findUnique({
        where: { id: input.simulationId },
        include: {
          assignments: {
            include: {
              student: {
                include: { user: { select: { id: true, name: true, email: true } } },
              },
              group: {
                include: {
                  members: {
                    include: {
                      student: {
                        include: { user: { select: { id: true, name: true, email: true } } },
                      },
                    },
                  },
                },
              },
              class: {
                include: {
                  students: {
                    include: { user: { select: { id: true, name: true, email: true } } },
                  },
                },
              },
            },
          },
          results: {
            select: { studentId: true, completedAt: true },
          },
          questions: {
            orderBy: { order: 'asc' },
            include: {
              question: {
                include: {
                  answers: { orderBy: { order: 'asc' } },
                  subject: true,
                },
              },
            },
          },
        },
      });

      if (!simulation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Simulazione non trovata' });
      }

      // Collect all assigned students
      const studentsMap = new Map<string, { 
        id: string; 
        name: string; 
        email: string;
        hasResult: boolean;
      }>();

      for (const assignment of simulation.assignments) {
        // Direct student assignment
        if (assignment.student) {
          studentsMap.set(assignment.student.id, {
            id: assignment.student.id,
            name: assignment.student.user.name,
            email: assignment.student.user.email,
            hasResult: simulation.results.some(r => r.studentId === assignment.student!.id),
          });
        }

        // Group assignment
        if (assignment.group) {
          for (const member of assignment.group.members) {
            studentsMap.set(member.student.id, {
              id: member.student.id,
              name: member.student.user.name,
              email: member.student.user.email,
              hasResult: simulation.results.some(r => r.studentId === member.student.id),
            });
          }
        }

        // Class assignment
        if (assignment.class) {
          for (const student of assignment.class.students) {
            studentsMap.set(student.id, {
              id: student.id,
              name: student.user.name,
              email: student.user.email,
              hasResult: simulation.results.some(r => r.studentId === student.id),
            });
          }
        }
      }

      const students = Array.from(studentsMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );

      return {
        simulation: {
          id: simulation.id,
          title: simulation.title,
          totalQuestions: simulation.totalQuestions,
          isPaperBased: simulation.isPaperBased,
        },
        questions: simulation.questions.map((sq, index) => ({
          id: sq.questionId,
          order: index + 1,
          text: sq.question.text.replace(/<[^>]*>/g, '').substring(0, 100) + '...',
          subject: sq.question.subject?.name,
          answers: sq.question.answers.map(a => ({
            id: a.id,
            label: a.label || String.fromCharCode(65 + (a.order || 0)), // A, B, C, D, E
          })),
        })),
        students,
        completedCount: students.filter(s => s.hasResult).length,
        totalStudents: students.length,
      };
    }),
});
