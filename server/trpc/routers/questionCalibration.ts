/**
 * Difficulty calibration review.
 *
 * The calibration job proposes; this router is how a human accepts. Nothing here
 * lets the machine decide: every write below is the direct consequence of someone
 * clicking, and every one of them leaves an audit row saying who and why.
 *
 * A separate router from `questions.ts` deliberately — that file is already about
 * six times the size limit.
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, staffProcedure, adminProcedure, assertCapability, hasCapability } from '../init';
import {
  applyCalibrationVisibility,
  countByDirection,
  proposalReviewWeight,
} from './questionCalibration.helpers';
import { CALIBRATION } from '@/server/services/questionCalibration.helpers';
import { runQuestionCalibration } from '@/server/services/questionCalibrationService';

const DifficultyLevelEnum = z.enum(['EASY', 'MEDIUM', 'HARD']);

/** Shape shared by the list and the badge, so both filter the same way. */
const proposalFilterSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(25),
  subjectId: z.string().optional(),
  direction: z.enum(['harder', 'easier']).optional(),
  minSampleSize: z.number().min(0).optional(),
  /** Only proposals that contradict a difficulty a human set by hand. */
  onlyContradictingHuman: z.boolean().optional(),
});

export const questionCalibrationRouter = router({
  /** Header badge. Kept separate from getOverview, which computes far more. */
  getPendingProposalCount: staffProcedure.query(async ({ ctx }) => {
    if (!hasCapability(ctx, 'questions.calibrateDifficulty')) return { count: 0 };

    const where = await applyCalibrationVisibility(
      ctx.prisma,
      { status: 'PROPOSED' },
      ctx.user.id,
      ctx.user.role,
      hasCapability(ctx, 'questions.calibrateAllSubjects')
    );
    return { count: await ctx.prisma.questionDifficultyAudit.count({ where }) };
  }),

  getOverview: staffProcedure.query(async ({ ctx }) => {
    // Same capability as the badge. Gating this on `questions.view` let a collaborator
    // whose badge deliberately reads 0 open the queue and read every proposal in it.
    assertCapability(ctx, 'questions.calibrateDifficulty');

    const visibleWhere = await applyCalibrationVisibility(
      ctx.prisma,
      { status: 'PROPOSED' },
      ctx.user.id,
      ctx.user.role,
      hasCapability(ctx, 'questions.calibrateAllSubjects')
    );

    const [
      pending,
      lastRun,
      measured,
      unmeasured,
      manuallyLocked,
      flagged,
      scales,
    ] = await Promise.all([
      ctx.prisma.questionDifficultyAudit.findMany({
        where: visibleWhere,
        select: { fromLevel: true, toLevel: true },
      }),
      ctx.prisma.questionCalibrationRun.findFirst({
        orderBy: { startedAt: 'desc' },
      }),
      ctx.prisma.question.count({
        where: { status: { not: 'ARCHIVED' }, timesGraded: { gt: 0 } },
      }),
      ctx.prisma.question.count({
        where: { status: { not: 'ARCHIVED' }, timesGraded: 0 },
      }),
      ctx.prisma.question.count({
        where: { status: { not: 'ARCHIVED' }, difficultySource: 'MANUAL' },
      }),
      ctx.prisma.question.count({
        where: { status: { not: 'ARCHIVED' }, qualityFlagCode: { not: null } },
      }),
      // The anchored scale is what makes the labels comparable over time. A reviewer
      // has to be able to see how much of it rests on real data before treating a
      // proposal as authoritative.
      ctx.prisma.difficultyScale.findMany({
        select: {
          subjectId: true,
          confidence: true,
          fitKappa: true,
          fitSampleSize: true,
          lastEquatingRmsd: true,
          frozenAt: true,
        },
      }),
    ]);

    return {
      scales,
      // Sent rather than duplicated in the UI: the copy explains the threshold, and a
      // second hardcoded copy of it would drift the first time the constant changes.
      minAnchorsForScale: CALIBRATION.anchorsMinimum,
      pendingTotal: pending.length,
      // Split by direction because "quante diventerebbero più difficili" is the first
      // thing anyone checks, and a one-sided batch is a symptom rather than a result.
      byDirection: countByDirection(pending),
      measuredQuestions: measured,
      unmeasuredQuestions: unmeasured,
      manuallyLockedQuestions: manuallyLocked,
      flaggedQuestions: flagged,
      lastRun,
      canDecide: hasCapability(ctx, 'questions.calibrateDifficulty'),
    };
  }),

  listProposals: staffProcedure
    .input(proposalFilterSchema)
    .query(async ({ ctx, input }) => {
      assertCapability(ctx, 'questions.calibrateDifficulty');

      const where = await applyCalibrationVisibility(
        ctx.prisma,
        {
          status: 'PROPOSED',
          ...(input.minSampleSize ? { sampleSize: { gte: input.minSampleSize } } : {}),
          ...(input.subjectId ? { question: { subjectId: input.subjectId } } : {}),
        },
        ctx.user.id,
        ctx.user.role,
        hasCapability(ctx, 'questions.calibrateAllSubjects')
      );

      const rows = await ctx.prisma.questionDifficultyAudit.findMany({
        where,
        include: {
          question: {
            select: {
              id: true,
              text: true,
              type: true,
              difficulty: true,
              difficultySource: true,
              difficultyLockedAt: true,
              avgCorrectRate: true,
              avgTimeSeconds: true,
              timesGraded: true,
              timesAnswered: true,
              qualityFlagCode: true,
              subject: { select: { id: true, name: true, color: true } },
            },
          },
        },
      });

      // Filtering and ordering happen here rather than in SQL: the review weight is a
      // derived quantity, and the proposal set is a worklist measured in tens.
      const filtered = rows
        .filter((row) => {
          if (input.direction) {
            const isHarder = row.toLevel === 'HARD' || (row.fromLevel === 'EASY' && row.toLevel === 'MEDIUM');
            if (input.direction === 'harder' && !isHarder) return false;
            if (input.direction === 'easier' && isHarder) return false;
          }
          if (input.onlyContradictingHuman && row.question.difficultySource !== 'MANUAL') return false;
          return true;
        })
        .sort((a, b) => proposalReviewWeight(b) - proposalReviewWeight(a));

      const start = (input.page - 1) * input.pageSize;
      return {
        proposals: filtered.slice(start, start + input.pageSize),
        total: filtered.length,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  /**
   * Accepts or rejects proposals in bulk.
   *
   * The accept path uses a conditional `updateMany`: it only writes when the question
   * still carries the difficulty the proposal was computed against and no human has
   * decided its difficulty since the proposal was made. Someone editing the question
   * while this page was open can therefore never be silently overwritten — the write
   * simply matches no row and the proposal is reported back as a conflict.
   *
   * The guard is deliberately "no newer human decision" rather than "not MANUAL": a
   * proposal that contradicts a hand-set difficulty is one the UI shows on purpose,
   * warning that confirming replaces it. Excluding MANUAL outright made exactly those
   * proposals impossible to accept, while reporting a conflict that had not happened.
   */
  decideProposals: staffProcedure
    .input(
      z.object({
        auditIds: z.array(z.string()).min(1).max(200),
        decision: z.enum(['ACCEPT', 'REJECT']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertCapability(ctx, 'questions.calibrateDifficulty');

      const where = await applyCalibrationVisibility(
        ctx.prisma,
        { status: 'PROPOSED', id: { in: input.auditIds } },
        ctx.user.id,
        ctx.user.role,
        hasCapability(ctx, 'questions.calibrateAllSubjects')
      );
      const proposals = await ctx.prisma.questionDifficultyAudit.findMany({
        where,
        select: { id: true, questionId: true, fromLevel: true, toLevel: true, createdAt: true },
      });

      const now = new Date();
      let applied = 0;
      let rejected = 0;
      let conflicts = 0;

      for (const proposal of proposals) {
        if (input.decision === 'REJECT') {
          await ctx.prisma.$transaction([
            ctx.prisma.questionDifficultyAudit.update({
              where: { id: proposal.id },
              data: { status: 'REJECTED', decidedAt: now, decidedById: ctx.user.id },
            }),
            ctx.prisma.question.update({
              where: { id: proposal.questionId },
              data: { suggestedDifficulty: null, suggestionConfidence: null, suggestedAt: null },
            }),
          ]);
          rejected += 1;
          continue;
        }

        const { count } = await ctx.prisma.question.updateMany({
          where: {
            id: proposal.questionId,
            difficulty: proposal.fromLevel,
            // A human decision taken AFTER the proposal wins: the reviewer would be
            // overruling a colleague's fresh choice without seeing it.
            OR: [
              { difficultyLockedAt: null },
              { difficultyLockedAt: { lte: proposal.createdAt } },
            ],
          },
          data: {
            difficulty: proposal.toLevel,
            difficultySource: 'AUTO',
            suggestedDifficulty: null,
            suggestionConfidence: null,
            suggestedAt: null,
          },
        });

        if (count === 0) {
          conflicts += 1;
          continue; // no audit row: nothing happened
        }

        await ctx.prisma.questionDifficultyAudit.update({
          where: { id: proposal.id },
          data: {
            status: 'APPLIED',
            trigger: 'STAFF_REVIEW',
            decidedAt: now,
            decidedById: ctx.user.id,
          },
        });
        applied += 1;
      }

      return { applied, rejected, conflicts, requested: input.auditIds.length };
    }),

  /**
   * Undoes one applied change.
   *
   * The difficulty goes back and the source becomes MANUAL, because reverting *is* a
   * human decision: the calibration must not immediately propose the same move again.
   */
  revertChange: staffProcedure
    .input(z.object({ auditId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertCapability(ctx, 'questions.calibrateDifficulty');

      const where = await applyCalibrationVisibility(
        ctx.prisma,
        { status: 'APPLIED', id: input.auditId },
        ctx.user.id,
        ctx.user.role,
        hasCapability(ctx, 'questions.calibrateAllSubjects')
      );
      const audit = await ctx.prisma.questionDifficultyAudit.findFirst({ where });
      if (!audit) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Modifica non trovata o già annullata.',
        });
      }

      const now = new Date();
      await ctx.prisma.$transaction([
        ctx.prisma.question.update({
          where: { id: audit.questionId },
          data: {
            difficulty: audit.fromLevel,
            difficultySource: 'MANUAL',
            difficultyLockedAt: now,
            suggestedDifficulty: null,
            suggestionConfidence: null,
            suggestedAt: null,
          },
        }),
        ctx.prisma.questionDifficultyAudit.update({
          where: { id: audit.id },
          data: { status: 'REVERTED' },
        }),
        ctx.prisma.questionDifficultyAudit.create({
          data: {
            questionId: audit.questionId,
            status: 'APPLIED',
            trigger: 'REVERT',
            fromLevel: audit.toLevel,
            toLevel: audit.fromLevel,
            reasonCode: 'REVERT',
            reasonMetadata: { revertedAuditId: audit.id },
            sampleSize: audit.sampleSize,
            decidedAt: now,
            decidedById: ctx.user.id,
            revertedFromId: audit.id,
          },
        }),
      ]);

      return { reverted: true, questionId: audit.questionId };
    }),

  /**
   * The emergency button: undoes everything one run applied.
   *
   * Each undo leaves the same compensating row a single revert does. That row is not
   * bookkeeping: `loadLastAppliedChanges` reads it to enforce the 30-day cooldown, so
   * without it the next run would re-propose exactly what was just rolled back — the
   * queue filling up again with the changes someone had judged wrong enough to undo
   * en masse.
   */
  revertRun: staffProcedure
    .input(z.object({ runId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertCapability(ctx, 'questions.calibrateAllSubjects');

      const audits = await ctx.prisma.questionDifficultyAudit.findMany({
        where: { runId: input.runId, status: 'APPLIED' },
        select: { id: true, questionId: true, fromLevel: true, toLevel: true, sampleSize: true },
      });

      const now = new Date();
      for (const audit of audits) {
        await ctx.prisma.$transaction([
          ctx.prisma.question.update({
            where: { id: audit.questionId },
            data: {
              difficulty: audit.fromLevel,
              difficultySource: 'MANUAL',
              difficultyLockedAt: now,
              suggestedDifficulty: null,
              suggestionConfidence: null,
              suggestedAt: null,
            },
          }),
          ctx.prisma.questionDifficultyAudit.update({
            where: { id: audit.id },
            data: { status: 'REVERTED' },
          }),
          ctx.prisma.questionDifficultyAudit.create({
            data: {
              questionId: audit.questionId,
              status: 'APPLIED',
              trigger: 'REVERT',
              fromLevel: audit.toLevel,
              toLevel: audit.fromLevel,
              reasonCode: 'REVERT',
              reasonMetadata: { revertedAuditId: audit.id, revertedRunId: input.runId },
              sampleSize: audit.sampleSize,
              decidedAt: now,
              decidedById: ctx.user.id,
              revertedFromId: audit.id,
            },
          }),
        ]);
      }

      return { reverted: audits.length };
    }),

  listHistory: staffProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
        runId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      assertCapability(ctx, 'questions.calibrateDifficulty');

      const where = await applyCalibrationVisibility(
        ctx.prisma,
        {
          status: { in: ['APPLIED', 'REJECTED', 'REVERTED'] },
          ...(input.runId ? { runId: input.runId } : {}),
        },
        ctx.user.id,
        ctx.user.role,
        hasCapability(ctx, 'questions.calibrateAllSubjects')
      );

      const [rows, total] = await Promise.all([
        ctx.prisma.questionDifficultyAudit.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            question: {
              select: {
                id: true,
                text: true,
                difficulty: true,
                subject: { select: { name: true, color: true } },
              },
            },
          },
        }),
        ctx.prisma.questionDifficultyAudit.count({ where }),
      ]);

      return { changes: rows, total, page: input.page, pageSize: input.pageSize };
    }),

  listRuns: staffProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      assertCapability(ctx, 'questions.view');
      return ctx.prisma.questionCalibrationRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: input.limit,
      });
    }),

  /**
   * Runs the job on demand. Admin-only: it is the escape hatch after an anomalous
   * run, and `questionIds` lets it be narrowed to one subject at a time.
   */
  runNow: adminProcedure
    .input(
      z.object({
        mode: z.enum(['DRY_RUN', 'STATS_ONLY', 'PROPOSE']).default('STATS_ONLY'),
        forceProposals: z.boolean().default(false),
        questionIds: z.array(z.string()).max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return runQuestionCalibration(ctx.prisma, {
        mode: input.mode,
        trigger: 'MANUAL',
        triggeredById: ctx.user.id,
        forceProposals: input.forceProposals,
        questionIds: input.questionIds,
      });
    }),
});

export type DifficultyLevelInput = z.infer<typeof DifficultyLevelEnum>;
