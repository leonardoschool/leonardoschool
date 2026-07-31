/**
 * Delimiter passes that turn normalized rich text into HTML.
 *
 * Kept out of the React component so the diagnostic script
 * (`scripts/fix-latex-question-content.ts`) can reproduce exactly what a student sees:
 * a second copy of this sequence would silently drift and hide broken questions.
 */

/** Renders one formula to HTML. Supplied by the caller (KaTeX on web). */
export type MathRenderer = (latex: string, displayMode: boolean) => string;

// Placeholder marker for already-rendered formulas. NUL is a byte PostgreSQL cannot store
// in a text column, so no stored question can contain it and it never collides with content.
const MARK = '\u0000';

/**
 * Applies the math passes in order and returns HTML (unsanitized — the caller sanitizes).
 *
 * Rendered formulas are parked behind placeholders until the very end. KaTeX keeps the
 * original source in <annotation encoding="application/x-tex">, so leaving its markup in
 * the working string makes every later pass re-match it: a \begin{array} inside \(...\)
 * was rendered a second time, and a \$ amount turned the following $...$ pass loose on
 * the markup. Both reached the student as red garbage inside the question text.
 */
export function renderRichTextHtml(normalizedText: string, renderMath: MathRenderer): string {
  const rendered: string[] = [];
  const stash = (html: string) => `${MARK}${rendered.push(html) - 1}${MARK}`;
  const render = (latex: string, displayMode: boolean) => stash(renderMath(latex, displayMode));

  let processed = normalizedText;

  // Display math: \[ ... \] — runs before \begin so inner environments are captured as
  // part of the display block rather than extracted separately
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, latex: string) => render(latex, true));
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex: string) => render(latex, true));

  // Inline math: \( ... \) — runs before \begin for the same reason
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, latex: string) => render(latex, false));

  // Naked environment blocks: only reached when not already inside \[, \( or $$
  processed = processed.replace(/\\begin\{(\w+)\}([\s\S]*?)\\end\{\1\}/g, (_, env: string, content: string) =>
    render(`\\begin{${env}}${content}\\end{${env}}`, true)
  );

  // Single $ ... $ inline math (must not match $$)
  processed = processed.replace(/(?<!\$)\$(?!\$)(.*?)(?<!\$)\$(?!\$)/g, (_, latex: string) => render(latex, false));

  // Remaining (prose) newlines become line breaks
  processed = processed.replace(/\n/g, '<br>');

  // Split instead of replace: every placeholder contributes exactly two markers, so the
  // odd-indexed pieces are the indexes (and a regex on NUL trips the control-char rule).
  return processed
    .split(MARK)
    .map((piece, i) => (i % 2 === 1 ? rendered[Number(piece)] ?? '' : piece))
    .join('');
}
