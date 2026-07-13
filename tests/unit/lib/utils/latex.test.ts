import { describe, it, expect } from 'vitest';
import { hasRenderableRichText } from '@/lib/utils/latex';

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
});
