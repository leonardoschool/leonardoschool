// Pure-JS HTML sanitizer — no jsdom/DOMPurify to avoid ESM conflicts in Vercel serverless

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

// Tags whose inner content must be removed entirely (not just the tag itself)
const STRIP_WITH_CONTENT = [
  'script', 'style', 'svg', 'math', 'template',
  'form', 'input', 'button', 'select', 'textarea',
];

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
    // Strip all whitespace before checking protocol (catches "javascript :alert(1)")
    const lowerUrl = attrValue.toLowerCase().replace(/\s/g, '');
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

function sanitizeAttrsString(tag: string, attrsStr: string): string {
  const allowedAttrs = ALLOWED_ATTRIBUTES[tag];
  if (!allowedAttrs) return '';

  const result: string[] = [];
  // Non-backtracking: match attr=value pairs or bare attr names
  const attrRe = /[\w-]+=(?:"[^"]*"|'[^']*'|[^\s>]+)|[\w-]+/g;
  let m: RegExpExecArray | null;

  while ((m = attrRe.exec(attrsStr)) !== null) {
    const eqIdx = m[0].indexOf('=');
    let name: string;
    let value: string;
    if (eqIdx === -1) {
      name = m[0].toLowerCase();
      value = '';
    } else {
      name = m[0].slice(0, eqIdx).toLowerCase();
      const raw = m[0].slice(eqIdx + 1);
      value = raw[0] === '"' || raw[0] === "'" ? raw.slice(1, -1) : raw;
    }
    const sanitized = sanitizeAttribute(tag, name, value);
    if (sanitized !== null) {
      result.push(`${name}="${sanitized}"`);
    }
  }

  return result.length ? ' ' + result.join(' ') : '';
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) {
    return '';
  }

  let result = String(html);

  // Remove XML processing instructions: <?...?>
  result = result.replace(/<\?[\s\S]*?\?>/g, '');

  // Remove DOCTYPE declarations: <!DOCTYPE...>
  result = result.replace(/<!DOCTYPE[^>]*>/gi, '');

  // Remove HTML comments (including conditional comments): <!-- ... -->
  result = result.replace(/<!--[\s\S]*?-->/g, '');

  // Remove CDATA sections: <![CDATA[...]]>
  result = result.replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, '');

  // Strip remaining <! constructs (e.g. stray <![ )
  result = result.replace(/<![\s\S]*?>/g, '');

  // Strip dangerous block elements along with all their inner content
  for (const tag of STRIP_WITH_CONTENT) {
    result = result.replace(
      new RegExp(`<${tag}(\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'gi'),
      ''
    );
    result = result.replace(new RegExp(`<${tag}(\\s[^>]*)?\\/?>`, 'gi'), '');
  }

  // Sanitize all remaining tags — keep allowed ones, strip everything else
  result = result.replace(
    /<(\/?)([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?\/?>/g,
    (_, slash, rawTag, attrs) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return '';
      if (slash) return `</${tag}>`;
      const safeAttrs = attrs ? sanitizeAttrsString(tag, attrs) : '';
      return `<${tag}${safeAttrs}>`;
    }
  );

  return result;
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
