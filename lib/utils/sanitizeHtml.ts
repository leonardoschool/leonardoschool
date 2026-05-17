import DOMPurify from 'isomorphic-dompurify';

export const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
  'a', 'blockquote', 'pre', 'code',
  'img', 'hr',
]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  span: new Set(['class', 'style']),
  div: new Set(['class', 'style']),
  p: new Set(['class', 'style']),
  table: new Set(['class', 'style', 'border', 'cellpadding', 'cellspacing']),
  th: new Set(['class', 'style', 'colspan', 'rowspan']),
  td: new Set(['class', 'style', 'colspan', 'rowspan']),
  img: new Set(['src', 'alt', 'width', 'height', 'style', 'class']),
};

const DANGEROUS_PROTOCOLS = [
  'javascript' + ':',
  'vbscript' + ':',
  'data:text/html',
  'data:application',
];

const DANGEROUS_CSS_PROPERTIES = ['behavior', 'expression', '-moz-binding'];
const DANGEROUS_CSS_PROTOCOLS = ['javascript' + ':', 'vbscript' + ':'];

function sanitizeStyle(style: string): string {
  return style
    .split(';')
    .filter(prop => {
      const lowerProp = prop.toLowerCase().trim();
      if (DANGEROUS_CSS_PROPERTIES.some(p => lowerProp.includes(p))) return false;
      if (DANGEROUS_CSS_PROTOCOLS.some(p => lowerProp.includes(p))) return false;
      return true;
    })
    .join(';');
}

export function sanitizeAttribute(tagName: string, attrName: string, attrValue: string): string | null {
  const allowedAttrs = ALLOWED_ATTRIBUTES[tagName.toLowerCase()];

  if (!allowedAttrs?.has(attrName.toLowerCase())) {
    return null;
  }

  if (attrName.toLowerCase() === 'href') {
    const lowerUrl = attrValue.toLowerCase().trim();
    if (DANGEROUS_PROTOCOLS.some(p => lowerUrl.startsWith(p))) {
      return '#';
    }
  }

  if (attrName.toLowerCase() === 'style') {
    return sanitizeStyle(attrValue);
  }

  if (attrName.toLowerCase() === 'target') {
    return attrValue === '_blank' ? '_blank' : null;
  }

  return attrValue;
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) {
    return '';
  }

  return DOMPurify.sanitize(String(html), {
    ALLOWED_TAGS: Array.from(ALLOWED_TAGS),
    ALLOWED_ATTR: [
      'href', 'title', 'target', 'rel',
      'class', 'style',
      'border', 'cellpadding', 'cellspacing', 'colspan', 'rowspan',
      'src', 'alt', 'width', 'height',
    ],
    ADD_ATTR: ['target'],
    FORBID_CONTENTS: ['script', 'style', 'button', 'textarea', 'select', 'form', 'input', 'template', 'math', 'svg'],
  });
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) {
    return '';
  }

  let result = String(html);
  let startIdx = result.indexOf('<');

  while (startIdx !== -1) {
    const endIdx = result.indexOf('>', startIdx);
    if (endIdx === -1) break;
    result = result.slice(0, startIdx) + result.slice(endIdx + 1);
    startIdx = result.indexOf('<');
  }

  return result
    .replaceAll(/&nbsp;/gi, ' ')
    .replaceAll(/&amp;/gi, '&')
    .replaceAll(/&lt;/gi, '<')
    .replaceAll(/&gt;/gi, '>')
    .replaceAll(/&quot;/gi, '"')
    .replaceAll(/&#39;/gi, "'")
    .replaceAll(/\s+/g, ' ')
    .trim();
}

export function validateContentLength(
  content: string,
  maxLength: number = 100000
): { valid: boolean; message?: string } {
  if (content.length > maxLength) {
    return {
      valid: false,
      message: `Il contenuto supera la lunghezza massima consentita (${Math.round(maxLength / 1000)}KB)`,
    };
  }
  return { valid: true };
}
