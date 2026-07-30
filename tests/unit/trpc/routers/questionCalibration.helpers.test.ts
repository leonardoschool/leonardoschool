import { describe, it, expect, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import {
  applyCalibrationVisibility,
  countByDirection,
  proposalDirection,
  proposalReviewWeight,
} from '@/server/trpc/routers/questionCalibration.helpers';

function prismaWith(collaborator: unknown) {
  return {
    collaborator: { findUnique: vi.fn().mockResolvedValue(collaborator) },
  } as unknown as PrismaClient;
}

describe('applyCalibrationVisibility', () => {
  const base = { status: 'PROPOSED' as const };

  it('leaves an admin unrestricted', async () => {
    const prisma = prismaWith(null);
    const where = await applyCalibrationVisibility(prisma, base, 'u1', 'ADMIN', false);
    expect(where).toEqual(base);
    expect(prisma.collaborator.findUnique).not.toHaveBeenCalled();
  });

  it('leaves a collaborator with the all-subjects capability unrestricted', async () => {
    const prisma = prismaWith(null);
    const where = await applyCalibrationVisibility(prisma, base, 'u1', 'COLLABORATOR', true);
    expect(where).toEqual(base);
  });

  it('restricts a tutor to their own subjects', async () => {
    const prisma = prismaWith({
      kind: 'TUTOR',
      subjects: [{ subjectId: 'bio' }, { subjectId: 'chi' }],
    });
    const where = await applyCalibrationVisibility(prisma, base, 'u1', 'COLLABORATOR', false);
    expect(where).toEqual({ ...base, question: { subjectId: { in: ['bio', 'chi'] } } });
  });

  /** An empty subject list must yield nothing, not everything. */
  it('shows nothing to a collaborator who is not a tutor', async () => {
    const prisma = prismaWith({ kind: 'SECRETARY', subjects: [] });
    const where = await applyCalibrationVisibility(prisma, base, 'u1', 'COLLABORATOR', false);
    expect(where).toEqual({ ...base, question: { subjectId: { in: [] } } });
  });

  it('shows nothing when the collaborator record is missing', async () => {
    const prisma = prismaWith(null);
    const where = await applyCalibrationVisibility(prisma, base, 'u1', 'COLLABORATOR', false);
    expect(where).toEqual({ ...base, question: { subjectId: { in: [] } } });
  });
});

describe('proposalDirection', () => {
  it('reads the direction off the levels', () => {
    expect(proposalDirection('EASY', 'MEDIUM')).toBe('harder');
    expect(proposalDirection('MEDIUM', 'HARD')).toBe('harder');
    expect(proposalDirection('HARD', 'MEDIUM')).toBe('easier');
    expect(proposalDirection('MEDIUM', 'EASY')).toBe('easier');
  });
});

describe('countByDirection', () => {
  it('splits a batch both ways', () => {
    expect(
      countByDirection([
        { fromLevel: 'EASY', toLevel: 'MEDIUM' },
        { fromLevel: 'MEDIUM', toLevel: 'HARD' },
        { fromLevel: 'HARD', toLevel: 'MEDIUM' },
      ])
    ).toEqual({ harder: 2, easier: 1 });
  });

  it('returns zeros for an empty batch', () => {
    expect(countByDirection([])).toEqual({ harder: 0, easier: 0 });
  });
});

describe('proposalReviewWeight', () => {
  const proposal = (over: Partial<Parameters<typeof proposalReviewWeight>[0]> = {}) => ({
    fromLevel: 'MEDIUM',
    toLevel: 'HARD',
    confidence: 0.9,
    sampleSize: 100,
    ...over,
  });

  /**
   * Two-level moves come first: that is where a miscalibration does the most damage,
   * so that is where human judgement is worth the most.
   */
  it('ranks a two-level move above any one-level move', () => {
    const twoLevels = proposalReviewWeight(proposal({ fromLevel: 'HARD', toLevel: 'EASY' }));
    const oneLevelPerfect = proposalReviewWeight(proposal({ confidence: 1, sampleSize: 999 }));
    expect(twoLevels).toBeGreaterThan(oneLevelPerfect);
  });

  it('breaks ties on confidence, then on sample size', () => {
    const confident = proposalReviewWeight(proposal({ confidence: 0.99 }));
    const unsure = proposalReviewWeight(proposal({ confidence: 0.8 }));
    expect(confident).toBeGreaterThan(unsure);

    const wellEvidenced = proposalReviewWeight(proposal({ sampleSize: 500 }));
    const thin = proposalReviewWeight(proposal({ sampleSize: 25 }));
    expect(wellEvidenced).toBeGreaterThan(thin);
  });

  it('tolerates a missing confidence', () => {
    expect(Number.isFinite(proposalReviewWeight(proposal({ confidence: null })))).toBe(true);
  });
});
