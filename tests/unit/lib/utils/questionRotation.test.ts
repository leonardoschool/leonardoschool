import { describe, it, expect } from 'vitest';
import {
  orderPoolFreshFirst,
  partitionBySeen,
  sortBySeenRankAsc,
  type SeenRank,
} from '@/lib/utils/questionRotation';

type Item = { id: string };

const pool = (...ids: string[]): Item[] => ids.map((id) => ({ id }));
const ids = (items: Item[]): string[] => items.map((item) => item.id);

describe('orderPoolFreshFirst', () => {
  it('keeps every item exactly once', () => {
    const input = pool('a', 'b', 'c', 'd', 'e');
    const seen: SeenRank = new Map([['b', 0], ['d', 1]]);
    const out = orderPoolFreshFirst(input, seen);
    expect([...ids(out)].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('places never-seen (fresh) questions before already-seen ones', () => {
    const input = pool('seen1', 'fresh1', 'seen2', 'fresh2', 'fresh3');
    const seen: SeenRank = new Map([['seen1', 5], ['seen2', 9]]);
    const out = ids(orderPoolFreshFirst(input, seen));

    const lastFreshIdx = Math.max(out.indexOf('fresh1'), out.indexOf('fresh2'), out.indexOf('fresh3'));
    const firstSeenIdx = Math.min(out.indexOf('seen1'), out.indexOf('seen2'));
    expect(lastFreshIdx).toBeLessThan(firstSeenIdx);
  });

  it('orders already-seen questions from least- to most-recently seen', () => {
    // Only stale items so the tail ordering is fully determined.
    const input = pool('recent', 'oldest', 'middle');
    const seen: SeenRank = new Map([['recent', 100], ['oldest', 1], ['middle', 50]]);
    const out = ids(orderPoolFreshFirst(input, seen));
    expect(out).toEqual(['oldest', 'middle', 'recent']);
  });

  it('returns a plain shuffle (all items preserved) when there is no history', () => {
    const input = pool('a', 'b', 'c', 'd');
    const out = orderPoolFreshFirst(input, new Map());
    expect([...ids(out)].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('handles an empty pool', () => {
    expect(orderPoolFreshFirst([], new Map())).toEqual([]);
  });
});

describe('partitionBySeen', () => {
  it('splits fresh vs stale by history', () => {
    const { fresh, stale } = partitionBySeen(pool('a', 'b', 'c'), new Map([['b', 0]]));
    expect(ids(fresh)).toEqual(['a', 'c']);
    expect(ids(stale)).toEqual(['b']);
  });

  it('treats everything as fresh with no history', () => {
    const { fresh, stale } = partitionBySeen(pool('a', 'b'), new Map());
    expect(ids(fresh)).toEqual(['a', 'b']);
    expect(stale).toEqual([]);
  });
});

describe('sortBySeenRankAsc', () => {
  it('orders least-recently-seen first', () => {
    const seen: SeenRank = new Map([['x', 30], ['y', 10], ['z', 20]]);
    expect(ids(sortBySeenRankAsc(pool('x', 'y', 'z'), seen))).toEqual(['y', 'z', 'x']);
  });
});
