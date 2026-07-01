import type { PrismaClient } from '@prisma/client';
import { secureShuffleArray } from '@/lib/utils';

/**
 * Recency map for the questions a student has already been served: questionId ->
 * rank, where a higher rank means "seen more recently". A missing key means the
 * student has never seen that question.
 */
export type SeenRank = Map<string, number>;

/**
 * Split a candidate pool into questions the student has never seen ("fresh") and
 * ones already served ("stale"). With no history everything is fresh.
 */
export function partitionBySeen<T extends { id: string }>(
  pool: T[],
  seenRank: SeenRank,
): { fresh: T[]; stale: T[] } {
  if (seenRank.size === 0) return { fresh: [...pool], stale: [] };

  const fresh: T[] = [];
  const stale: T[] = [];
  for (const item of pool) {
    (seenRank.has(item.id) ? stale : fresh).push(item);
  }
  return { fresh, stale };
}

/** Order already-seen questions from least- to most-recently seen. */
export function sortBySeenRankAsc<T extends { id: string }>(items: T[], seenRank: SeenRank): T[] {
  return items
    .map((item) => ({ item, rank: seenRank.get(item.id) ?? 0 }))
    .sort((a, b) => a.rank - b.rank)
    .map((entry) => entry.item);
}

/**
 * Order a candidate pool so that questions the student has never seen come first
 * (uniformly shuffled), followed by already-seen ones from least- to most-recently
 * seen. This guarantees the whole question bank is exhausted before any question
 * repeats, while keeping fresh picks unpredictable.
 *
 * With an empty seenRank (no history, or the student disabled "avoid recent") it
 * degrades to a plain uniform shuffle of the entire pool.
 */
export function orderPoolFreshFirst<T extends { id: string }>(pool: T[], seenRank: SeenRank): T[] {
  if (seenRank.size === 0) return secureShuffleArray(pool);
  const { fresh, stale } = partitionBySeen(pool, seenRank);
  return [...secureShuffleArray(fresh), ...sortBySeenRankAsc(stale, seenRank)];
}

/**
 * Build the recency map of every question a student has already received in their
 * own self-practice simulations. Newer sightings overwrite older ones, so the rank
 * reflects the most recent time the question was seen.
 */
export async function buildStudentSeenRank(prisma: PrismaClient, userId: string): Promise<SeenRank> {
  const rows = await prisma.simulationQuestion.findMany({
    where: { simulation: { createdById: userId, creatorRole: 'STUDENT' } },
    select: { questionId: true },
    orderBy: { simulation: { createdAt: 'asc' } },
  });

  const rank: SeenRank = new Map();
  rows.forEach((row, index) => rank.set(row.questionId, index));
  return rank;
}
