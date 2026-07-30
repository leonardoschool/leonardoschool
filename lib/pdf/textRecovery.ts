/**
 * Repairs text extracted from PDFs whose embedded subset fonts carry no usable
 * ToUnicode map (typical of older Office → PDF converters). pdfjs then falls
 * back to the raw glyph ids, so the page comes out as a substitution cipher:
 * "Una particella ruota" is extracted as "8QDSDUWLFHOODUXRWD".
 *
 * The ids are indices into the *standard Macintosh glyph ordering*, whose
 * entries 3..97 are exactly the printable ASCII range — hence the constant −29
 * offset — and which continues with the Latin-1 accented glyphs. Mapping the ids
 * back through that table restores the real characters.
 *
 * Kept pure (no pdfjs import) so it can be unit-tested with hand-built fixtures.
 */

interface RecoverableItem {
  str: string;
  page: number;
  /** pdfjs font id; items without one can't be attributed to a broken font. */
  fontName?: string;
}

/** Standard Macintosh ordering entry for glyph id 3 (space). */
const FIRST_GID = 3;

/** Glyph ids 98.. of the standard Macintosh ordering, starting at Adieresis. */
const MAC_TAIL =
  'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü' +
  '†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄¤‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔ';

const MAC_GLYPH_ORDER: string[] = (() => {
  const table: string[] = [];
  for (let code = 0x20; code <= 0x7e; code++) table.push(String.fromCharCode(code));
  table.push(...MAC_TAIL);
  return table;
})();

/** A font needs this much text before its casing is statistically meaningful. */
const MIN_LETTERS = 40;
/** Lowercase prose enciphered this way lands almost entirely in the A–Z range. */
const MIN_UPPERCASE_RATIO = 0.7;
/** Minimum share of function words for decoded text to count as real prose. */
const MIN_WORD_SCORE = 0.05;

/**
 * Function words shared by the Italian and English exam papers this imports.
 * Their presence separates recovered prose from a coincidental all-caps font.
 */
const FUNCTION_WORDS =
  /\b(?:di|il|la|le|lo|un|una|che|non|per|con|del|della|dei|delle|come|nel|alla|sono|and|the|of|in|is|to|for|which|are)\b/gi;

/** Decodes one string from standard-Macintosh glyph ids back to characters. */
export function decodeMacGlyphOrder(str: string): string {
  let out = '';
  for (const ch of str) {
    // Real spaces are emitted verbatim by pdfjs and must not be remapped.
    if (/\s/.test(ch)) {
      out += ch;
      continue;
    }
    out += MAC_GLYPH_ORDER[(ch.codePointAt(0) ?? 0) - FIRST_GID] ?? ch;
  }
  // These files use the ordering's quoteleft slot for the Italian apostrophe.
  return out.replace(/‘/g, '’');
}

function countLetters(text: string): { upper: number; lower: number } {
  let upper = 0;
  let lower = 0;
  for (const ch of text) {
    if (/[A-Z]/.test(ch)) upper += 1;
    else if (/[a-z]/.test(ch)) lower += 1;
  }
  return { upper, lower };
}

function wordScore(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 8) return 0;
  return (text.match(FUNCTION_WORDS)?.length ?? 0) / words;
}

function looksAllCaps(text: string, minLetters: number): boolean {
  const { upper, lower } = countLetters(text);
  const total = upper + lower;
  return total >= minLetters && upper / total >= MIN_UPPERCASE_RATIO;
}

function groupBy<T>(items: T[], key: (item: T) => string | number): Map<string | number, T[]> {
  const groups = new Map<string | number, T[]>();
  for (const item of items) {
    const bucket = groups.get(key(item));
    if (bucket) bucket.push(item);
    else groups.set(key(item), [item]);
  }
  return groups;
}

/**
 * Returns the items with every string belonging to a broken font decoded.
 * Detection is deliberately two-tiered: a font only qualifies on its own when
 * decoding turns it into recognisable prose, but once a page is proven broken
 * its remaining all-caps fonts (formula and symbol subsets, too short to score)
 * are decoded as well.
 */
export function repairMangledText<T extends RecoverableItem>(items: T[]): T[] {
  const byFont = groupBy(
    items.filter((it) => it.fontName && it.str),
    (it) => it.fontName!
  );

  const brokenFonts = new Set<string>();
  const brokenPages = new Set<number>();
  for (const [font, bucket] of byFont) {
    const raw = bucket.map((it) => it.str).join(' ');
    if (!looksAllCaps(raw, MIN_LETTERS)) continue;
    const decoded = decodeMacGlyphOrder(raw);
    const score = wordScore(decoded);
    if (score < MIN_WORD_SCORE || score <= wordScore(raw)) continue;
    brokenFonts.add(String(font));
    bucket.forEach((it) => brokenPages.add(it.page));
  }

  if (brokenFonts.size === 0) return items;

  // Second tier: symbol/formula subsets on an already-broken page.
  for (const [font, bucket] of byFont) {
    if (brokenFonts.has(String(font))) continue;
    if (!bucket.some((it) => brokenPages.has(it.page))) continue;
    if (bucket.some((it) => !brokenPages.has(it.page))) continue;
    if (looksAllCaps(bucket.map((it) => it.str).join(' '), 1)) brokenFonts.add(String(font));
  }

  return items.map((it) =>
    it.fontName && brokenFonts.has(it.fontName)
      ? { ...it, str: decodeMacGlyphOrder(it.str) }
      : it
  );
}
