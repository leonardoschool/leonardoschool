import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import RichTextRenderer from '@/components/ui/RichTextRenderer';

/** KaTeX prints what it cannot parse in its error colour instead of throwing. */
function renderedRedText(container: HTMLElement): string {
  return Array.from(container.querySelectorAll<HTMLElement>('[style*="cc0000"], .katex-error'))
    .map(el => el.textContent ?? '')
    .join(' ');
}

describe('RichTextRenderer — passes must not re-read rendered KaTeX output', () => {
  it('renders a \\begin{array} table inside \\(...\\) only once', () => {
    // KaTeX keeps the LaTeX source in <annotation encoding="application/x-tex">, so the
    // later naked-environment pass used to match it again and re-render the surrounding
    // markup, painting the whole table red.
    const stored =
      '\\(\\begin{array}{|c|} \\hline \\textbf{ORARI}\\\\12.00 \\\\ \\hline \\end{array}\\)';
    const { container } = render(<RichTextRenderer text={stored} />);

    expect(container.querySelectorAll('.katex')).toHaveLength(1);
    expect(renderedRedText(container)).toBe('');
    // The visible layer must show the table, not its source (the source legitimately
    // survives in the hidden <annotation>, which is how the double render started).
    expect(container.querySelector('.katex-html')?.textContent).toContain('ORARI');
    expect(container.querySelector('.katex-html')?.textContent).not.toContain('\\begin');
  });

  it('keeps an escaped dollar amount out of the $...$ pass', () => {
    // '1,40\\(\\$\\)' renders a literal $, which the following single-$ pass used to treat
    // as an opening delimiter and swallow the generated markup.
    const { container } = render(<RichTextRenderer text={'1,40\\(\\$\\) e 2,53\\(\\$\\)'} />);

    expect(renderedRedText(container)).toBe('');
    expect(container.textContent).toContain('1,40');
    expect(container.textContent).toContain('2,53');
    expect(container.querySelectorAll('.katex')).toHaveLength(2);
  });

  it('still renders plain prose, HTML and inline math together', () => {
    const { container } = render(<RichTextRenderer text={'H<sub>2</sub>O e \\(x^2\\)'} />);

    expect(container.querySelector('sub')?.textContent).toBe('2');
    expect(container.querySelectorAll('.katex')).toHaveLength(1);
    expect(renderedRedText(container)).toBe('');
  });
});
