import { describe, it, expect } from 'vitest';
import { hasRenderableRichText, normalizeStoredRichText } from '@/lib/utils/latex';
import { RICH_TEXT_ALLOWED_TAGS, RICH_TEXT_ALLOWED_ATTR } from '@/shared/richText/sanitize';

describe('hasRenderableRichText', () => {
  it('detects HTML markup', () => {
    expect(hasRenderableRichText('x<sub>2</sub>')).toBe(true);
    expect(hasRenderableRichText('20<sup>')).toBe(true);
  });

  it('detects $...$ math', () => {
    expect(hasRenderableRichText('$x^2$')).toBe(true);
  });

  it('detects \\(...\\) delimited LaTeX (the regression case)', () => {
    // Reported bug: answer "20\(\sqrt{\frac{2}{8-\pi}}\)" showed no preview
    // because the check only looked for $ or <.
    expect(hasRenderableRichText('20\\(\\sqrt{\\frac{2}{8-\\pi}}\\)')).toBe(true);
  });

  it('detects \\[...\\] display LaTeX', () => {
    expect(hasRenderableRichText('\\[a^2+b^2\\]')).toBe(true);
  });

  it('detects bare backslash commands', () => {
    expect(hasRenderableRichText('\\sqrt{2}')).toBe(true);
    expect(hasRenderableRichText('\\frac{1}{2}')).toBe(true);
  });

  it('returns false for plain text', () => {
    expect(hasRenderableRichText('nessuna delle precedenti')).toBe(false);
    expect(hasRenderableRichText('row 1')).toBe(false);
  });

  it('handles empty / nullish input', () => {
    expect(hasRenderableRichText('')).toBe(false);
    expect(hasRenderableRichText(null)).toBe(false);
    expect(hasRenderableRichText(undefined)).toBe(false);
  });

  it('flags text whose only markup is an inline \\includegraphics image', () => {
    // The mobile renderer uses this to decide between a native <Text> and the WebView:
    // a false here makes an image-bearing question render as raw LaTeX again.
    expect(hasRenderableRichText('Il grafico mostra:\n\\includegraphics{https://cdn.example/x.png}')).toBe(true);
  });
});

describe('normalizeStoredRichText — inline images', () => {
  // Placeholder values only: never paste a real Firebase download token into a test — the
  // repository is public and a token grants read access to that stored object.
  const FAKE_TOKEN = '00000000-0000-4000-8000-000000000000';
  const firebaseUrl =
    `https://firebasestorage.googleapis.com/v0/b/example-bucket.appspot.com/o/questions%2Fimages%2Fnephron.png?alt=media&token=${FAKE_TOKEN}`;

  it('turns an absolute \\includegraphics URL into an <img> with the URL intact', () => {
    const result = normalizeStoredRichText(
      `The diagram shows a nephron.\n\\includegraphics{${firebaseUrl}}\nWhich region has no urea?`
    );

    expect(result).toContain('<img');
    // The signed-download token must survive: without it the bucket answers 403 and the
    // student sees a broken image instead of the figure.
    expect(result).toContain(`token=${FAKE_TOKEN}`);
    expect(result).not.toContain('\\includegraphics');
    expect(result).toContain('The diagram shows a nephron.');
    expect(result).toContain('Which region has no urea?');
  });

  it('keeps the surrounding text when the image sits mid-sentence', () => {
    const result = normalizeStoredRichText(`before \\includegraphics{${firebaseUrl}} after`);
    expect(result.indexOf('before')).toBeLessThan(result.indexOf('<img'));
    expect(result.indexOf('<img')).toBeLessThan(result.indexOf('after'));
  });

  it('strips a bare-filename reference instead of emitting a broken <img>', () => {
    // Import-only refs with no path/URL resolve to a token-less URL that 403s; the real
    // picture is served from the question's imageUrl field instead.
    const result = normalizeStoredRichText('Testo \\includegraphics{47bec697.png} fine');
    expect(result).not.toContain('<img');
    expect(result).toContain('Testo');
    expect(result).toContain('fine');
  });

  it('preserves stored HTML lists', () => {
    const result = normalizeStoredRichText('Domanda?\n<ol>\n  <li>Pentose sugar</li>\n</ol>');
    expect(result).toContain('<ol>');
    expect(result).toContain('<li>Pentose sugar</li>');
  });
});

describe('rich text sanitize allowlist', () => {
  it('allows images through', () => {
    // Web and the mobile WebView share this list; dropping img/src here would make every
    // inline question figure disappear on both clients at once.
    expect(RICH_TEXT_ALLOWED_TAGS).toContain('img');
    expect(RICH_TEXT_ALLOWED_ATTR).toContain('src');
  });

  it('allows the HTML structures questions are authored with', () => {
    for (const tag of ['ol', 'ul', 'li', 'sub', 'sup', 'table', 'tr', 'td']) {
      expect(RICH_TEXT_ALLOWED_TAGS).toContain(tag);
    }
  });

  it('does not allow script or event handlers', () => {
    expect(RICH_TEXT_ALLOWED_TAGS).not.toContain('script');
    expect(RICH_TEXT_ALLOWED_ATTR.some((attr) => attr.startsWith('on'))).toBe(false);
  });
});
