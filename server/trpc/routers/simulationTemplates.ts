import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { Prisma, PrismaClient } from '@prisma/client';
import { router, staffProcedure, studentProcedure } from '../init';
import {
  createSimulationTemplateSchema,
  simulationTemplateFilterSchema,
  updateSimulationTemplateSchema,
} from '@/lib/validations/simulationValidation';

function sumTemplateQuestions(sections: Array<{ questionCount?: number | null }>): number {
  return sections.reduce((total, section) => total + (section.questionCount ?? 0), 0);
}

function cleanTemplateSections(sections: z.infer<typeof createSimulationTemplateSchema>['sections']) {
  return sections.map((section, index) => ({
    ...section,
    order: section.order ?? index,
    questionCount: section.questionCount ?? 0,
    topicIds: section.topicIds ?? [],
    questionTypes: section.questionTypes ?? [],
    questionTypeCounts: section.questionTypeCounts ?? {},
    difficultyLevels: section.difficultyLevels ?? [],
    tagIds: section.tagIds ?? [],
    language: section.language ?? null,
    questionIds: [],
  }));
}

async function validateTemplateAssignments(
  ctx: { prisma: Prisma.TransactionClient | PrismaClient; user: { id: string; role: string; collaborator?: { id: string } | null } },
  isSelfPracticeTemplate: boolean,
  assignedStudentIds: string[],
  assignedGroupIds: string[]
) {
  if (!isSelfPracticeTemplate) return;

  if (assignedStudentIds.length === 0 && assignedGroupIds.length === 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Seleziona almeno uno studente o un gruppo per il template di autoesercitazione',
    });
  }

  if (assignedStudentIds.length > 0) {
    const count = await ctx.prisma.student.count({ where: { id: { in: assignedStudentIds } } });
    if (count !== assignedStudentIds.length) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Uno o più studenti non sono stati trovati' });
    }
  }

  if (assignedGroupIds.length > 0) {
    const count = await ctx.prisma.group.count({ where: { id: { in: assignedGroupIds }, isActive: true } });
    if (count !== assignedGroupIds.length) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Uno o più gruppi non sono stati trovati' });
    }
  }

  if (ctx.user.role !== 'COLLABORATOR') return;

  const collaboratorId = ctx.user.collaborator?.id;
  if (!collaboratorId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Collaboratore non trovato' });
  }

  const allowedGroups = await ctx.prisma.group.findMany({
    where: {
      OR: [
        { referenceCollaboratorId: collaboratorId },
        { referenceCollaborators: { some: { collaboratorId } } },
      ],
    },
    select: { id: true },
  });
  const allowedGroupIds = new Set(allowedGroups.map((group) => group.id));

  if (assignedGroupIds.some((groupId) => !allowedGroupIds.has(groupId))) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Non puoi assegnare template a gruppi che non gestisci' });
  }

  if (assignedStudentIds.length > 0) {
    const allowedStudents = await ctx.prisma.groupMember.findMany({
      where: { groupId: { in: Array.from(allowedGroupIds) }, studentId: { not: null } },
      select: { studentId: true },
    });
    const allowedStudentIds = new Set(allowedStudents.map((member) => member.studentId).filter(Boolean));

    if (assignedStudentIds.some((studentId) => !allowedStudentIds.has(studentId))) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Non puoi assegnare template a studenti che non sono nei tuoi gruppi' });
    }
  }
}

async function replaceTemplateAssignments(
  tx: Prisma.TransactionClient,
  templateId: string,
  assignedById: string,
  isSelfPracticeTemplate: boolean,
  assignedStudentIds: string[],
  assignedGroupIds: string[]
) {
  await tx.simulationTemplateAssignment.deleteMany({ where: { templateId } });

  if (!isSelfPracticeTemplate) return;

  const assignmentRows = [
    ...Array.from(new Set(assignedStudentIds)).map((studentId) => ({
      templateId,
      studentId,
      groupId: null,
      assignedById,
    })),
    ...Array.from(new Set(assignedGroupIds)).map((groupId) => ({
      templateId,
      studentId: null,
      groupId,
      assignedById,
    })),
  ];

  if (assignmentRows.length > 0) {
    await tx.simulationTemplateAssignment.createMany({ data: assignmentRows, skipDuplicates: true });
  }
}

function buildTemplateWhereClause(
  input: z.infer<typeof simulationTemplateFilterSchema>,
  userRole: string,
  userId: string
): Prisma.SimulationTemplateWhereInput {
  const where: Prisma.SimulationTemplateWhereInput = {};
  const andConditions: Prisma.SimulationTemplateWhereInput[] = [];

  if (input.search) {
    andConditions.push({
      OR: [
        { title: { contains: input.search, mode: 'insensitive' } },
        { description: { contains: input.search, mode: 'insensitive' } },
      ],
    });
  }

  if (input.status) where.status = input.status;

  if (userRole === 'COLLABORATOR') {
    andConditions.push({
      OR: [{ createdById: userId }, { status: 'PUBLISHED' }],
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}

async function ensureTemplateAccess(
  template: { createdById: string | null; status: string } | null,
  user: { id: string; role: string }
) {
  if (!template) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Template non trovato' });
  }

  if (user.role === 'COLLABORATOR' && template.createdById !== user.id && template.status !== 'PUBLISHED') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Non hai accesso a questo template' });
  }
}

export const simulationTemplatesRouter = router({
  list: staffProcedure
    .input(simulationTemplateFilterSchema)
    .query(async ({ ctx, input }) => {
      const { page, pageSize, sortBy, sortOrder } = input;
      const where = buildTemplateWhereClause(input, ctx.user.role, ctx.user.id);

      const [total, templates] = await Promise.all([
        ctx.prisma.simulationTemplate.count({ where }),
        ctx.prisma.simulationTemplate.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { [sortBy]: sortOrder },
          include: {
            createdBy: { select: { id: true, name: true, role: true } },
            _count: { select: { simulationsCreated: true, templateAssignments: true } },
          },
        }),
      ]);

      return {
        templates,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  get: staffProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.prisma.simulationTemplate.findUnique({
        where: { id: input.id },
        include: {
          createdBy: { select: { id: true, name: true, role: true, email: true } },
          templateAssignments: {
            select: {
              id: true,
              studentId: true,
              groupId: true,
              student: { select: { id: true, matricola: true, user: { select: { name: true, email: true } } } },
              group: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
          simulationsCreated: {
            select: { id: true, title: true, status: true, type: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      });

      await ensureTemplateAccess(template, ctx.user);
      return template;
    }),

  create: staffProcedure
    .input(createSimulationTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const sections = cleanTemplateSections(input.sections);
      const totalQuestions = input.totalQuestions || sumTemplateQuestions(sections);
      const assignedStudentIds = input.assignedStudentIds ?? [];
      const assignedGroupIds = input.assignedGroupIds ?? [];

      await validateTemplateAssignments(ctx, input.isSelfPracticeTemplate, assignedStudentIds, assignedGroupIds);

      return ctx.prisma.$transaction(async (tx) => {
        const template = await tx.simulationTemplate.create({
          data: {
            title: input.title,
            description: input.description,
            type: 'CUSTOM',
            status: 'DRAFT',
            createdBy: { connect: { id: ctx.user.id } },
            creatorRole: ctx.user.role,
            isOfficial: false,
            durationMinutes: input.durationMinutes,
            totalQuestions,
            showResults: input.showResults,
            showCorrectAnswers: input.showCorrectAnswers,
            allowReview: input.allowReview,
            randomizeOrder: input.randomizeOrder,
            randomizeAnswers: input.randomizeAnswers,
            useQuestionPoints: input.useQuestionPoints,
            correctPoints: input.correctPoints,
            wrongPoints: input.wrongPoints,
            blankPoints: input.blankPoints,
            maxScore: input.maxScore,
            passingScore: input.passingScore,
            isRepeatable: input.isRepeatable,
            maxAttempts: input.maxAttempts,
            isPaperBased: false,
            showSectionsInPaper: true,
            trackAttendance: false,
            hasSections: true,
            sections: sections as Prisma.InputJsonValue,
            isSelfPracticeTemplate: input.isSelfPracticeTemplate,
            enableAntiCheat: false,
            forceFullscreen: false,
            blockTabChange: false,
            blockCopyPaste: false,
            logSuspiciousEvents: false,
          },
        });

        await replaceTemplateAssignments(
          tx,
          template.id,
          ctx.user.id,
          input.isSelfPracticeTemplate,
          assignedStudentIds,
          assignedGroupIds
        );

        return template;
      });
    }),

  update: staffProcedure
    .input(updateSimulationTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.simulationTemplate.findUnique({
        where: { id: input.id },
        select: { createdById: true, status: true },
      });
      await ensureTemplateAccess(existing, ctx.user);

      if (ctx.user.role === 'COLLABORATOR' && existing?.createdById !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Puoi modificare solo i tuoi template' });
      }

      const sections = input.sections ? cleanTemplateSections(input.sections) : undefined;
      const totalQuestions = sections ? (input.totalQuestions || sumTemplateQuestions(sections)) : input.totalQuestions;
      const nextIsSelfPracticeTemplate = input.isSelfPracticeTemplate ?? false;
      const assignedStudentIds = input.assignedStudentIds ?? [];
      const assignedGroupIds = input.assignedGroupIds ?? [];

      if (input.isSelfPracticeTemplate !== undefined || input.assignedStudentIds !== undefined || input.assignedGroupIds !== undefined) {
        await validateTemplateAssignments(ctx, nextIsSelfPracticeTemplate, assignedStudentIds, assignedGroupIds);
      }

      return ctx.prisma.$transaction(async (tx) => {
        const updated = await tx.simulationTemplate.update({
          where: { id: input.id },
          data: {
            ...(input.title !== undefined && { title: input.title }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.status !== undefined && { status: input.status }),
            ...(input.durationMinutes !== undefined && { durationMinutes: input.durationMinutes }),
            ...(totalQuestions !== undefined && { totalQuestions }),
            ...(input.showResults !== undefined && { showResults: input.showResults }),
            ...(input.showCorrectAnswers !== undefined && { showCorrectAnswers: input.showCorrectAnswers }),
            ...(input.allowReview !== undefined && { allowReview: input.allowReview }),
            ...(input.randomizeOrder !== undefined && { randomizeOrder: input.randomizeOrder }),
            ...(input.randomizeAnswers !== undefined && { randomizeAnswers: input.randomizeAnswers }),
            ...(input.useQuestionPoints !== undefined && { useQuestionPoints: input.useQuestionPoints }),
            ...(input.correctPoints !== undefined && { correctPoints: input.correctPoints }),
            ...(input.wrongPoints !== undefined && { wrongPoints: input.wrongPoints }),
            ...(input.blankPoints !== undefined && { blankPoints: input.blankPoints }),
            ...(input.maxScore !== undefined && { maxScore: input.maxScore }),
            ...(input.passingScore !== undefined && { passingScore: input.passingScore }),
            ...(input.isRepeatable !== undefined && { isRepeatable: input.isRepeatable }),
            ...(input.maxAttempts !== undefined && { maxAttempts: input.maxAttempts }),
            ...(input.isSelfPracticeTemplate !== undefined && { isSelfPracticeTemplate: input.isSelfPracticeTemplate }),
            ...(sections !== undefined && { sections: sections as Prisma.InputJsonValue, hasSections: true }),
          },
        });

        if (input.isSelfPracticeTemplate !== undefined || input.assignedStudentIds !== undefined || input.assignedGroupIds !== undefined) {
          await replaceTemplateAssignments(
            tx,
            input.id,
            ctx.user.id,
            nextIsSelfPracticeTemplate,
            assignedStudentIds,
            assignedGroupIds
          );
        }

        return updated;
      });
    }),

  delete: staffProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.simulationTemplate.findUnique({
        where: { id: input.id },
        select: { createdById: true, status: true },
      });
      await ensureTemplateAccess(existing, ctx.user);

      if (ctx.user.role === 'COLLABORATOR' && existing?.createdById !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Puoi eliminare solo i tuoi template' });
      }

      await ctx.prisma.simulationTemplate.delete({ where: { id: input.id } });
      return { success: true };
    }),

  duplicate: staffProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const original = await ctx.prisma.simulationTemplate.findUnique({
        where: { id: input.id },
      });
      await ensureTemplateAccess(original, ctx.user);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, createdAt, updatedAt, createdById, creatorRole, simulationsCreated, ...rest } =
        original as typeof original & { simulationsCreated?: unknown };

      return ctx.prisma.simulationTemplate.create({
        data: {
          ...rest,
          title: `Copia di ${original!.title}`,
          status: 'DRAFT',
          isSelfPracticeTemplate: false,
          createdBy: { connect: { id: ctx.user.id } },
          creatorRole: ctx.user.role,
        },
      });
    }),

  listMySelfPracticeTemplates: studentProcedure.query(async ({ ctx }) => {
    const student = await ctx.prisma.student.findUnique({
      where: { userId: ctx.user.id },
      select: {
        id: true,
        groupMemberships: { select: { groupId: true } },
      },
    });

    if (!student) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Profilo studente non trovato' });
    }

    const groupIds = student.groupMemberships.map((membership) => membership.groupId);

    return ctx.prisma.simulationTemplate.findMany({
      where: {
        status: 'PUBLISHED',
        isSelfPracticeTemplate: true,
        templateAssignments: {
          some: {
            OR: [
              { studentId: student.id },
              ...(groupIds.length > 0 ? [{ groupId: { in: groupIds } }] : []),
            ],
          },
        },
      },
      orderBy: { title: 'asc' },
      include: {
        createdBy: { select: { name: true, role: true } },
      },
    });
  }),
});
