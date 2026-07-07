/**
 * Normalizes a question's text for exact-match duplicate detection.
 * Collapses all whitespace runs to a single space and trims, so cosmetic
 * differences introduced by PDF extraction (line breaks, double spaces) don't
 * hide a real duplicate. Case is preserved: two questions differing only in
 * casing are rare and usually intentional variants.
 */
export function normalizeQuestionText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
