'use client';

import { useMemo } from 'react';
import katex from 'katex';
import DOMPurify from 'isomorphic-dompurify';

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

    let processed = text;

    // Process LaTeX environment blocks without delimiters: \begin{...}...\end{...}
    // These are rendered as display math
    processed = processed.replace(/\\begin\{(\w+)\}([\s\S]*?)\\end\{\1\}/g, (match, env, content) => {
      try {
        const fullLatex = `\\begin{${env}}${content}\\end{${env}}`;
        return katex.renderToString(fullLatex, {
          throwOnError: false,
          displayMode: true,
          strict: false,
        });
      } catch {
        return `<span class="text-red-500">[Errore LaTeX: ${match}]</span>`;
      }
    });

    // Process display math first: \[ ... \] or $$ ... $$
    processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, latex) => {
      try {
        return katex.renderToString(latex.trim(), {
          throwOnError: false,
          displayMode: true,
          strict: false,
        });
      } catch {
        return `<span class="text-red-500">[Errore LaTeX: ${latex}]</span>`;
      }
    });

    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => {
      try {
        return katex.renderToString(latex.trim(), {
          throwOnError: false,
          displayMode: true,
          strict: false,
        });
      } catch {
        return `<span class="text-red-500">[Errore LaTeX: ${latex}]</span>`;
      }
    });

    // Process inline math: \( ... \) or $ ... $
    processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, latex) => {
      try {
        return katex.renderToString(latex.trim(), {
          throwOnError: false,
          displayMode: false,
          strict: false,
        });
      } catch {
        return `<span class="text-red-500">[Errore LaTeX: ${latex}]</span>`;
      }
    });

    // Process single $ ... $ for inline math (be careful not to match $$)
    processed = processed.replace(/(?<!\$)\$(?!\$)(.*?)(?<!\$)\$(?!\$)/g, (_, latex) => {
      try {
        return katex.renderToString(latex.trim(), {
          throwOnError: false,
          displayMode: false,
          strict: false,
        });
      } catch {
        return `<span class="text-red-500">[Errore LaTeX: ${latex}]</span>`;
      }
    });

    // Convert newlines to <br> for plain text areas
    processed = processed.replace(/\n/g, '<br>');

    // Sanitize HTML to prevent XSS while allowing safe tags
    const sanitized = DOMPurify.sanitize(processed, {
      ALLOWED_TAGS: [
        'b', 'i', 'u', 'strong', 'em', 'sub', 'sup', 'br', 'span', 'p', 'div',
        'ul', 'ol', 'li', 'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup',
        'msub', 'mfrac', 'msqrt', 'mroot', 'munder', 'mover', 'munderover',
        'mtable', 'mtr', 'mtd', 'annotation', 'svg', 'path', 'line', 'g',
      ],
      ALLOWED_ATTR: [
        'class', 'style', 'href', 'xmlns', 'width', 'height', 'viewBox',
        'd', 'fill', 'stroke', 'stroke-width', 'preserveAspectRatio',
        'aria-hidden', 'focusable', 'role',
      ],
      ADD_TAGS: ['foreignObject'],
    });

    return sanitized;
  }, [text]);

  return (
    <div
      className={`rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
