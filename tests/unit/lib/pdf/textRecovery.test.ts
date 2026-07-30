import { describe, it, expect } from 'vitest';
import { decodeMacGlyphOrder, repairMangledText } from '@/lib/pdf/textRecovery';

/**
 * For plain ASCII the standard Macintosh glyph ordering is simply `code - 29`,
 * so the fixture below is "la particella ruota in senso orario e non cambia di
 * velocita" with every non-space character shifted down by 29.
 */
const CIPHER = 'OD SDUWLFHOOD UXRWD LQ VHQVR RUDULR H QRQ FDPELD GL YHORFLWD';
const PLAIN = 'la particella ruota in senso orario e non cambia di velocita';

function items(strs: string[], fontName: string, page = 0) {
  return strs.map((str) => ({ str, page, fontName }));
}

describe('decodeMacGlyphOrder', () => {
  it('restores ASCII text from glyph ids', () => {
    expect(decodeMacGlyphOrder(CIPHER)).toBe(PLAIN);
  });

  it('restores accented Italian characters', () => {
    // 'j' is glyph id 106 (agrave), 'q' is 113 (egrave).
    expect(decodeMacGlyphOrder('YHORFLWj')).toBe('velocità');
    expect(decodeMacGlyphOrder('q')).toBe('è');
  });

  it('leaves real spaces and unmapped characters untouched', () => {
    expect(decodeMacGlyphOrder('  ')).toBe('  ');
    expect(decodeMacGlyphOrder('\u0003')).toBe(' '); // glyph id 3 is the space
  });
});

describe('repairMangledText', () => {
  it('decodes items belonging to a broken font', () => {
    const repaired = repairMangledText(items(CIPHER.split(' '), 'g_d0_f10'));
    expect(repaired.map((i) => i.str).join(' ')).toBe(PLAIN);
  });

  it('leaves readable text alone', () => {
    const readable = items(PLAIN.split(' '), 'g_d0_f3');
    expect(repairMangledText(readable)).toEqual(readable);
  });

  it('leaves a legitimately all-caps font alone', () => {
    const caps = items(
      'PROVA DI AMMISSIONE AI CORSI DI LAUREA DELLE PROFESSIONI SANITARIE'.split(' '),
      'g_d0_f1'
    );
    expect(repairMangledText(caps)).toEqual(caps);
  });

  it('also decodes short symbol fonts sharing a broken page', () => {
    const mixed = [
      ...items(CIPHER.split(' '), 'g_d0_f10', 4),
      ...items(['OQ[$%&'], 'g_d0_f11', 4), // formula subset, too short to score alone
      ...items(['ABC'], 'g_d0_f5', 7), // untouched: lives on a healthy page
    ];
    const repaired = repairMangledText(mixed);
    expect(repaired.find((i) => i.fontName === 'g_d0_f11')?.str).toBe('lnxABC');
    expect(repaired.find((i) => i.fontName === 'g_d0_f5')?.str).toBe('ABC');
  });
});
