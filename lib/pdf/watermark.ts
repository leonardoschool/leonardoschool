/**
 * Removes the tiled copyright watermarks that some exam publishers stamp across
 * every page (Selexi's "Selexi Srl ©" is the case this was written for).
 *
 * They are not annotations or a background image: they are ordinary text items
 * laid diagonally over the content, so they land *between* the words of a line.
 * Extraction then yields "A Selexi Srl © Nel midollo osseo" — the option letter
 * and its text separated by the watermark — and, worse, question numbers glued to
 * clipped copies of it ("l © 2"), which stops any marker from being recognised.
 *
 * Detection is by repetition, not by a hardcoded string, so a new publisher needs
 * no code change: a short run of text repeated many times per page on most pages
 * is a watermark. Clipped copies are then removed as substrings of it.
 *
 * Kept pure (no pdfjs import) so it can be unit-tested with hand-built fixtures.
 */

interface WatermarkItem {
  str: string;
  page: number;
}

/** A watermark is a short label, never a sentence of content. */
const MAX_WATERMARK_LENGTH = 40;
const MIN_WATERMARK_LENGTH = 4;
/** It must recur on this share of the pages (and on at least this many). */
const MIN_PAGE_RATIO = 0.5;
const MIN_PAGES = 2;
/** Tiling means several copies per page; one repeat per page is a running header. */
const MIN_REPEATS_PER_PAGE = 2;
/** Shortest clipped copy still removed; below this, real content collides too easily. */
const MIN_FRAGMENT_LENGTH = 3;

/**
 * The repeated strings that look like tiled watermarks, most frequent first.
 * Exported for diagnostics and tests.
 */
export function detectWatermarks<T extends WatermarkItem>(items: T[]): string[] {
  const pages = new Set<number>();
  const stats = new Map<string, { count: number; pages: Set<number> }>();

  for (const item of items) {
    pages.add(item.page);
    const text = item.str.trim();
    if (text.length < MIN_WATERMARK_LENGTH || text.length > MAX_WATERMARK_LENGTH) continue;
    // Content markers are frequent by nature; they must never be mistaken for a stamp
    if (/^\d{1,3}[.)]?\s/.test(text) || /^[A-E][).:]?\s/.test(text)) continue;

    const entry = stats.get(text);
    if (entry) {
      entry.count += 1;
      entry.pages.add(item.page);
    } else {
      stats.set(text, { count: 1, pages: new Set([item.page]) });
    }
  }

  const minPages = Math.max(MIN_PAGES, pages.size * MIN_PAGE_RATIO);

  return [...stats.entries()]
    .filter(
      ([, s]) => s.pages.size >= minPages && s.count >= s.pages.size * MIN_REPEATS_PER_PAGE
    )
    .sort((a, b) => b[1].count - a[1].count)
    .map(([text]) => text);
}

/**
 * Drops watermark items, including the clipped copies produced where the stamp
 * runs off the page ("Selex", "exi Srl ©", "l ©").
 *
 * A fragment is only removed when it recurs on more than one page: that is what
 * separates a sliced watermark from a content word that happens to be a substring
 * of the stamp.
 */
export function stripWatermarkItems<T extends WatermarkItem>(items: T[]): T[] {
  const watermarks = detectWatermarks(items);
  if (watermarks.length === 0) return items;

  const exact = new Set(watermarks);
  const fragmentPages = new Map<string, Set<number>>();

  for (const item of items) {
    const text = item.str.trim();
    if (text.length < MIN_FRAGMENT_LENGTH || exact.has(text)) continue;
    if (!watermarks.some((mark) => mark.includes(text))) continue;
    const seen = fragmentPages.get(text);
    if (seen) seen.add(item.page);
    else fragmentPages.set(text, new Set([item.page]));
  }

  const fragments = new Set(
    [...fragmentPages.entries()].filter(([, pages]) => pages.size > 1).map(([text]) => text)
  );

  return items.filter((item) => {
    const text = item.str.trim();
    return !exact.has(text) && !fragments.has(text);
  });
}
