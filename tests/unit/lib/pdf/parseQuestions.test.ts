import { describe, it, expect } from 'vitest';
import { parseQuestions, type PdfTextItem } from '@/lib/pdf/parseQuestions';

/**
 * Builds one text item per line on a page, laid out top-to-bottom.
 * PDF y grows upward, so earlier lines get the higher y.
 */
function page(lines: string[], pageIdx = 0, startY = 800, step = 20): PdfTextItem[] {
  return lines.map((text, i) => ({ str: text, x: 50, y: startY - i * step, page: pageIdx }));
}

const CLEAN_Q1 = [
  '1 What is 2 plus 2?',
  'A Four',
  'B Three',
  'C Five',
  'D Six',
  'E Seven',
];

describe('parseQuestions', () => {
  it('parses sequential questions with five options', () => {
    const items = page([
      'Ministero della Istruzione',
      ...CLEAN_Q1,
      '2 What is the capital of France?',
      'A Paris',
      'B London',
      'C Rome',
      'D Berlin',
      'E Madrid',
    ]);
    const qs = parseQuestions(items);

    expect(qs).toHaveLength(2);
    expect(qs[0].number).toBe(1);
    expect(qs[0].text).toBe('What is 2 plus 2?');
    expect(qs[0].answers.map((a) => a.label)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(qs[0].answers[0].text).toBe('Four');
    expect(qs[0].correctLetter).toBe('A');
    expect(qs[0].suspicious).toBe(false);
    expect(qs[1].number).toBe(2);
    expect(qs[1].answers[0].text).toBe('Paris');
  });

  it('drops repeated header/footer noise lines', () => {
    const items = page([
      'IMAT 2011 - MIUR 2011',
      'General Knowledge and Logical Reasoning',
      ...CLEAN_Q1,
    ]);
    const qs = parseQuestions(items);
    expect(qs).toHaveLength(1);
    expect(qs[0].text).toBe('What is 2 plus 2?');
  });

  it('appends continuation lines to the current answer', () => {
    const items = page([
      '1 A question that wraps',
      'A first option that',
      'continues on next line',
      'B second',
      'C third',
      'D fourth',
      'E fifth',
    ]);
    const qs = parseQuestions(items);
    expect(qs[0].answers[0].text).toBe('first option that continues on next line');
  });

  it('appends continuation lines to the stem before any answer appears', () => {
    const items = page([
      '1 Stem line one',
      'stem line two',
      'A opt',
      'B opt',
      'C opt',
      'D opt',
      'E opt',
    ]);
    const qs = parseQuestions(items);
    expect(qs[0].text).toBe('Stem line one stem line two');
  });

  it('flags a question with the wrong number of options as suspicious', () => {
    const items = page(['1 Broken question', 'A only option']);
    const qs = parseQuestions(items);
    expect(qs[0].suspicious).toBe(true);
    expect(qs[0].suspiciousReasons.join(' ')).toMatch(/1 risposte/);
  });

  it('flags visual/table content as suspicious even with five options', () => {
    const items = page([
      '1 The table below shows the results',
      'A one',
      'B two',
      'C three',
      'D four',
      'E five',
    ]);
    const qs = parseQuestions(items);
    expect(qs[0].suspicious).toBe(true);
    expect(qs[0].suspiciousReasons.join(' ')).toMatch(/tabella/i);
  });

  it('does not flag plain arithmetic stems that merely contain numbers', () => {
    const items = page([
      '1 A taxi charges 1 euro per km for 3 km then 70 cents after that',
      'A ten',
      'B twenty',
      'C thirty',
      'D forty',
      'E fifty',
    ]);
    const qs = parseQuestions(items);
    expect(qs[0].suspicious).toBe(false);
  });

  it('bounds the crop region only when the next question is on the same page', () => {
    const sceneSamePage = page([
      ...CLEAN_Q1,
      '2 Next on same page',
      'A a',
      'B b',
      'C c',
      'D d',
      'E e',
    ]);
    const same = parseQuestions(sceneSamePage);
    expect(Number.isFinite(same[0].region.yBottom)).toBe(true);

    const q1 = page(CLEAN_Q1, 0);
    const q2 = page(
      ['2 Next on another page', 'A a', 'B b', 'C c', 'D d', 'E e'],
      1
    );
    const crossPage = parseQuestions([...q1, ...q2]);
    expect(crossPage[0].region.yBottom).toBe(-Infinity);
    expect(crossPage[0].region.page).toBe(0);
  });
});
