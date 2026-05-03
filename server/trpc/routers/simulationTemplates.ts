import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { router, staffProcedure } from '../init';
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
    questionIds: [],
  }));
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
            _count: { select: { simulationsCreated: true } },
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

      return ctx.prisma.simulationTemplate.create({
        data: {
          title: input.title,
          description: input.description,
          type: 'CUSTOM',
          status: 'PUBLISHED',
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
          enableAntiCheat: false,
          forceFullscreen: false,
          blockTabChange: false,
          blockCopyPaste: false,
          logSuspiciousEvents: false,
        },
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

      return ctx.prisma.simulationTemplate.update({
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
          ...(sections !== undefined && { sections: sections as Prisma.InputJsonValue, hasSections: true }),
        },
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
          createdBy: { connect: { id: ctx.user.id } },
          creatorRole: ctx.user.role,
        },
      });
    }),
});
