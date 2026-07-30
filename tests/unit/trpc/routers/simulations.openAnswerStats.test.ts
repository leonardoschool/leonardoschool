/**
 * Open-answer statistics helpers.
 *
 * An open answer carries no answerId, so the statistics used to count every one
 * of them as blank: the correct rate of every OPEN_TEXT question collapsed to 0%
 * and each one was flagged as critical. These helpers are the fix, and the
 * keyword matcher is shared with the scorer so display and grading cannot drift.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyAnswerOutcome,
  matchOpenAnswerKeywords,
  buildTextAnswerDistribution,
} from '@/server/trpc/routers/simulations.helpers';

describe('classifyAnswerOutcome', () => {
  it('counts a chosen option by its verdict', () => {
    expect(classifyAnswerOutcome({ answerId: 'a1', isCorrect: true })).toBe('correct');
    expect(classifyAnswerOutcome({ answerId: 'a1', isCorrect: false })).toBe('wrong');
  });

  it('counts a written open answer, not a blank', () => {
    expect(classifyAnswerOutcome({ answerId: null, answerText: '0.83', isCorrect: true })).toBe('correct');
    expect(classifyAnswerOutcome({ answerId: null, answerText: '0.83', isCorrect: false })).toBe('wrong');
  });

  it('reports an open answer awaiting correction as pending', () => {
    expect(classifyAnswerOutcome({ answerId: null, answerText: '0.83', isCorrect: null })).toBe('pending');
  });

  it('treats missing and whitespace-only answers as blank', () => {
    expect(classifyAnswerOutcome({ answerId: null, answerText: null, isCorrect: null })).toBe('blank');
    expect(classifyAnswerOutcome({ answerId: null, answerText: '   ', isCorrect: null })).toBe('blank');
    expect(classifyAnswerOutcome({})).toBe('blank');
  });
});

describe('matchOpenAnswerKeywords', () => {
  it('matches case-insensitively on substrings', () => {
    const result = matchOpenAnswerKeywords('La Velocità Critica', ['velocità', 'portata']);
    expect(result.matched).toEqual(['velocità']);
    expect(result.missed).toEqual(['portata']);
  });

  it('reports every keyword as missed when nothing matches', () => {
    const result = matchOpenAnswerKeywords('non lo so', ['0.83', '0,83']);
    expect(result.matched).toEqual([]);
    expect(result.missed).toEqual(['0.83', '0,83']);
  });

  it('has no matches when the question has no keywords', () => {
    expect(matchOpenAnswerKeywords('qualsiasi cosa', [])).toEqual({ matched: [], missed: [] });
  });
});

describe('buildTextAnswerDistribution', () => {
  it('groups answers ignoring case and surrounding whitespace', () => {
    const { items } = buildTextAnswerDistribution(['0.83', ' 0.83 ', '0,83'], ['0.83']);

    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ text: '0.83', count: 2, matchesKeyword: true });
    expect(items[1]).toEqual({ text: '0,83', count: 1, matchesKeyword: false });
  });

  it('collapses internal whitespace when grouping', () => {
    const { items } = buildTextAnswerDistribution(['circa  due', 'circa due'], []);

    expect(items).toHaveLength(1);
    expect(items[0].count).toBe(2);
  });

  it('keeps the first spelling encountered as the label', () => {
    const { items } = buildTextAnswerDistribution(['Velocità', 'velocità'], []);

    expect(items[0].text).toBe('Velocità');
    expect(items[0].count).toBe(2);
  });

  it('skips blank and whitespace-only answers', () => {
    const { items } = buildTextAnswerDistribution([null, undefined, '', '   ', '0.83'], []);

    expect(items).toEqual([{ text: '0.83', count: 1, matchesKeyword: false }]);
  });

  it('orders by frequency, then alphabetically for stability', () => {
    const { items } = buildTextAnswerDistribution(['b', 'a', 'c', 'c'], []);

    expect(items.map((i) => i.text)).toEqual(['c', 'a', 'b']);
  });

  it('reports what the limit left out instead of truncating silently', () => {
    const answers = ['a', 'a', 'b', 'c', 'd'];
    const { items, otherCount, otherDistinct } = buildTextAnswerDistribution(answers, [], 2);

    expect(items.map((i) => i.text)).toEqual(['a', 'b']);
    expect(otherDistinct).toBe(2);
    expect(otherCount).toBe(2);
  });

  it('strips markup and LaTeX from stored answers before grouping', () => {
    const { items } = buildTextAnswerDistribution(['<b>0.83</b>', '0.83'], ['0.83']);

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ text: '0.83', count: 2, matchesKeyword: true });
  });

  it('flags an answer that contains a keyword as matching', () => {
    const { items } = buildTextAnswerDistribution(['la velocità è 0.83 m/s'], ['0.83']);

    expect(items[0].matchesKeyword).toBe(true);
  });
});
