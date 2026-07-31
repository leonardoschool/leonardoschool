'use client';

import { useMemo } from 'react';
import katex from 'katex';
import DOMPurify from 'isomorphic-dompurify';
import { normalizeStoredRichText, sanitizeLatexForKatex } from '@/lib/utils/latex';
import { renderRichTextHtml } from '@/shared/richText/render';
import { richTextSanitizeConfig } from '@/shared/richText/sanitize';

interface RichTextRendererProps {
  text: string;
  className?: string;
}

// KaTeX emits SVG <path d="..."> whose data spans multiple physical lines. The prose
// newline→<br> conversion would otherwise inject <br> tags inside those attributes and
// corrupt SVG-based glyphs (\sqrt radical, \vec accent), leaving only the base symbol.
// Collapsing newlines to spaces is safe: both are valid separators in SVG path data.
function renderMath(latex: string, displayMode: boolean): string {
  try {
    return katex
      .renderToString(sanitizeLatexForKatex(latex.trim()), {
        throwOnError: false,
        displayMode,
        strict: false,
      })
      .replace(/\n/g, ' ');
  } catch {
    return `<span class="text-red-500">[Errore LaTeX: ${latex}]</span>`;
  }
}

/**
 * Renders text with LaTeX formulas and safe HTML.
 *
 * LaTeX syntax:
 * - Inline math: \( formula \) or $ formula $
 * - Display math: \[ formula \] or $$ formula $$
 * - Environment blocks: \begin{...}...\end{...} (auto-detected)
 *
 * HTML: Basic HTML tags are supported (sub, sup, b, i, u, br, etc.)
 */
export default function RichTextRenderer({ text, className = '' }: RichTextRendererProps) {
  const renderedHtml = useMemo(() => {
    if (!text) return '';

    const html = renderRichTextHtml(normalizeStoredRichText(text), renderMath);

    // Sanitize HTML to prevent XSS while allowing safe tags
    return DOMPurify.sanitize(html, richTextSanitizeConfig);
  }, [text]);

  return (
    <div
      className={`rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
