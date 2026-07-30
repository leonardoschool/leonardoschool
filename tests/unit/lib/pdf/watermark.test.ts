/**
 * Tiled publisher watermarks.
 *
 * They are ordinary text items laid over the page, so they land *between* the words
 * of a line: "A Selexi Srl © Nel midollo osseo". Removing them after the line is
 * assembled is impossible, which is why this works on items.
 */
import { describe, it, expect } from 'vitest';
import { detectWatermarks, stripWatermarkItems } from '@/lib/pdf/watermark';

type Item = { str: string; page: number };

/** Tiles `mark` across `pages`, `perPage` times each, around some real content. */
function stamped(mark: string, pages = 4, perPage = 4): Item[] {
  const items: Item[] = [];
  for (let page = 0; page < pages; page++) {
    items.push({ str: `Domanda di pagina ${page}`, page });
    for (let i = 0; i < perPage; i++) items.push({ str: mark, page });
  }
  return items;
}

describe('detectWatermarks', () => {
  it('finds a label tiled several times on most pages', () => {
    expect(detectWatermarks(stamped('Selexi Srl ©'))).toContain('Selexi Srl ©');
  });

  it('ignores a header printed once per page', () => {
    const items: Item[] = [];
    for (let page = 0; page < 6; page++) {
      items.push({ str: 'Università degli Studi', page });
      items.push({ str: `Domanda ${page}`, page });
    }
    expect(detectWatermarks(items)).not.toContain('Università degli Studi');
  });

  it('never takes a question or option marker for a watermark', () => {
    const items: Item[] = [];
    for (let page = 0; page < 5; page++) {
      for (let i = 0; i < 4; i++) {
        items.push({ str: '1. Domanda ripetuta', page });
        items.push({ str: 'A) risposta ripetuta', page });
      }
    }
    expect(detectWatermarks(items)).toEqual([]);
  });
});

describe('stripWatermarkItems', () => {
  it('removes the stamp and leaves the content', () => {
    const items = stamped('Selexi Srl ©');
    const kept = stripWatermarkItems(items);

    expect(kept.every((i) => i.str !== 'Selexi Srl ©')).toBe(true);
    expect(kept).toHaveLength(4);
    expect(kept[0].str).toBe('Domanda di pagina 0');
  });

  it('removes the clipped copies left where the stamp runs off the page', () => {
    // Real extractions yield these: the stamp sliced by the page edge.
    const clipped = ['Selex', 'exi Srl ©', 'l ©', 'Selexi S'];
    const items = [
      ...stamped('Selexi Srl ©'),
      ...clipped.flatMap((str) => [
        { str, page: 0 },
        { str, page: 2 },
      ]),
    ];
    const kept = stripWatermarkItems(items);

    for (const fragment of clipped) {
      expect(kept.some((i) => i.str === fragment)).toBe(false);
    }
  });

  it('keeps a word that merely looks like a fragment but appears on one page only', () => {
    const items = [
      ...stamped('Selexi Srl ©'),
      { str: 'Srl', page: 1 }, // a content word, not a sliced stamp
    ];
    const kept = stripWatermarkItems(items);

    expect(kept.some((i) => i.str === 'Srl')).toBe(true);
  });

  it('leaves a document with no watermark untouched', () => {
    const items: Item[] = [
      { str: '1. Domanda?', page: 0 },
      { str: 'A) a', page: 0 },
      { str: 'B) b', page: 0 },
    ];
    expect(stripWatermarkItems(items)).toEqual(items);
  });
});
