'use client';

import { useMemo } from 'react';
import katex from 'katex';
import DOMPurify from 'isomorphic-dompurify';
import { normalizeStoredRichText, sanitizeLatexForKatex } from '@/lib/utils/latex';
import { richTextSanitizeConfig } from '@/shared/richText/sanitize';

interface RichTextRendererProps {
  text: string;
  className?: string;
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

    let processed = normalizeStoredRichText(text);

    // KaTeX emits SVG <path d="..."> whose data spans multiple physical lines.
    // The newline→<br> conversion at the end would otherwise inject <br> tags inside
    // those attributes and corrupt SVG-based glyphs (\sqrt radical, \vec accent),
    // leaving only the base symbol. Collapse newlines in KaTeX output to spaces —
    // both are valid separators in SVG path data — so only prose newlines remain.
    const renderMath = (latex: string, displayMode: boolean) => {
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
    };

    // Process display math: \[ ... \] — runs before \begin so inner environments
    // are captured as part of the display block rather than extracted separately
    processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, latex) => renderMath(latex, true));

    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => renderMath(latex, true));

    // Process inline math: \( ... \) — runs before \begin for the same reason
    processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, latex) => renderMath(latex, false));

    // Process naked environment blocks: \begin{...}...\end{...}
    // Only reaches here if not already inside \[, \(, or $$ delimiters
    processed = processed.replace(/\\begin\{(\w+)\}([\s\S]*?)\\end\{\1\}/g, (_, env, content) =>
      renderMath(`\\begin{${env}}${content}\\end{${env}}`, true)
    );

    // Process single $ ... $ for inline math (be careful not to match $$)
    processed = processed.replace(/(?<!\$)\$(?!\$)(.*?)(?<!\$)\$(?!\$)/g, (_, latex) => renderMath(latex, false));

    // Convert remaining (prose) newlines to <br>
    processed = processed.replace(/\n/g, '<br>');

    // Sanitize HTML to prevent XSS while allowing safe tags
    const sanitized = DOMPurify.sanitize(processed, richTextSanitizeConfig);

    return sanitized;
  }, [text]);

  return (
    <div
      className={`rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
