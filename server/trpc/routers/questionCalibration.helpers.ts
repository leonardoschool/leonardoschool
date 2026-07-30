/**
 * Helpers for the difficulty calibration router.
 *
 * A separate file from `questions.ts` on purpose: that router is already about six
 * times the size limit, and the calibration is a self-contained concern.
 */
import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * Restricts the proposals a viewer may see to the subjects they are responsible for.
 *
 * Shared by the badge count and the list, which is the point: a header badge that
 * advertises work the user cannot open is worse than no badge. Same rule, same
 * function, no chance of the two drifting.
 */
export async function applyCalibrationVisibility(
  prisma: PrismaClient,
  where: Prisma.QuestionDifficultyAuditWhereInput,
  userId: string,
  userRole: string,
  canCalibrateAllSubjects: boolean
): Promise<Prisma.QuestionDifficultyAuditWhereInput> {
  if (userRole !== 'COLLABORATOR' || canCalibrateAllSubjects) return where;

  const collaborator = await prisma.collaborator.findUnique({
    where: { userId },
    select: {
      kind: true,
      subjects: { select: { subjectId: true } },
    },
  });

  // A non-tutor collaborator has no subjects of their own, so the empty list here
  // correctly yields nothing rather than everything.
  const subjectIds =
    collaborator?.kind === 'TUTOR' ? collaborator.subjects.map((s) => s.subjectId) : [];

  return { ...where, question: { subjectId: { in: subjectIds } } };
}

export type ProposalDirection = 'harder' | 'easier';

const LEVEL_ORDER = ['EASY', 'MEDIUM', 'HARD'] as const;

/** Which way a proposal moves, derived from the levels rather than stored twice. */
export function proposalDirection(fromLevel: string, toLevel: string): ProposalDirection {
  return LEVEL_ORDER.indexOf(toLevel as (typeof LEVEL_ORDER)[number]) >
    LEVEL_ORDER.indexOf(fromLevel as (typeof LEVEL_ORDER)[number])
    ? 'harder'
    : 'easier';
}

/**
 * Ranks proposals by how far they move a question.
 *
 * `HARD → EASY` and `EASY → HARD` come first: they are where a miscalibration does
 * the most damage, so they are where human judgement is worth the most. Ties break on
 * confidence, then on sample size — most-evidenced first.
 */
export function proposalReviewWeight(proposal: {
  fromLevel: string;
  toLevel: string;
  confidence: number | null;
  sampleSize: number;
}): number {
  const distance = Math.abs(
    LEVEL_ORDER.indexOf(proposal.toLevel as (typeof LEVEL_ORDER)[number]) -
      LEVEL_ORDER.indexOf(proposal.fromLevel as (typeof LEVEL_ORDER)[number])
  );
  return distance * 1_000_000 + (proposal.confidence ?? 0) * 1000 + Math.min(proposal.sampleSize, 999);
}

export interface DirectionCounts {
  harder: number;
  easier: number;
}

export function countByDirection(
  proposals: readonly { fromLevel: string; toLevel: string }[]
): DirectionCounts {
  const counts: DirectionCounts = { harder: 0, easier: 0 };
  for (const proposal of proposals) {
    counts[proposalDirection(proposal.fromLevel, proposal.toLevel)] += 1;
  }
  return counts;
}
