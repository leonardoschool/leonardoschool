/**
 * Server-side caching utility using Next.js unstable_cache
 * 
 * Wraps expensive database queries with caching to improve performance.
 * Cache is stored in-memory and revalidated after specified time.
 */

import { unstable_cache } from 'next/cache';

export interface CacheOptions {
  /** Cache key tags for invalidation */
  tags?: string[];
  /** Revalidation time in seconds (default: 300 = 5 minutes) */
  revalidate?: number;
}

/**
 * Creates a cached version of an async function
 * 
 * @example
 * ```ts
 * const getCachedStats = createCachedQuery(
 *   async () => await prisma.question.count(),
 *   ['stats', 'questions'],
 *   { revalidate: 300 }
 * );
 * 
 * const count = await getCachedStats();
 * ```
 */
export function createCachedQuery<T>(
  queryFn: () => Promise<T>,
  cacheKeys: string[],
  options: CacheOptions = {}
): () => Promise<T> {
  const { tags = [], revalidate = 300 } = options;
  
  return unstable_cache(
    queryFn,
    cacheKeys,
    {
      tags: [...tags, ...cacheKeys],
      revalidate,
    }
  );
}

/**
 * Cache duration presets (in seconds)
 */
export const CACHE_TIMES = {
  /** 1 minute - for frequently changing data */
  SHORT: 60,
  /** 5 minutes - default for most queries */
  MEDIUM: 300,
  /** 15 minutes - for semi-static data */
  LONG: 900,
  /** 1 hour - for rarely changing data (subjects, tags categories) */
  VERY_LONG: 3600,
} as const;

/**
 * Common cache tags for easy invalidation
 */
export const CACHE_TAGS = {
  QUESTIONS: 'questions',
  USERS: 'users',
  STUDENTS: 'students',
  COLLABORATORS: 'collaborators',
  SUBJECTS: 'subjects',
  TOPICS: 'topics',
  TAGS: 'tags',
  SIMULATIONS: 'simulations',
  STATS: 'stats',
  DASHBOARD: 'dashboard',
} as const;
