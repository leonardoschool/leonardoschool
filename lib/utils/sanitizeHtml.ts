/**
 * HTML Sanitization utility for user-generated content
 * Prevents XSS attacks by removing dangerous HTML elements and attributes
 */

// Allowed HTML tags (safe for display)
export const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'a', 'blockquote', 'pre', 'code',
]);

// Allowed attributes per tag
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  span: new Set(['class', 'style']),
  div: new Set(['class', 'style']),
  p: new Set(['class', 'style']),
  table: new Set(['class', 'style', 'border', 'cellpadding', 'cellspacing']),
  th: new Set(['class', 'style', 'colspan', 'rowspan']),
  td: new Set(['class', 'style', 'colspan', 'rowspan']),
};

// Dangerous CSS properties that could be used for attacks
const DANGEROUS_CSS_PROPERTIES = [
  'behavior',
  'expression',
  '-moz-binding',
  'javascript:',
  'vbscript:',
];

// Dangerous URL protocols
const DANGEROUS_PROTOCOLS = [
  'javascript:',
  'vbscript:',
  'data:text/html',
  'data:application',
];

/**
 * Sanitize a style attribute value
 */
function sanitizeStyle(style: string): string {
  const sanitized = style
    .split(';')
    .filter(prop => {
      const lowerProp = prop.toLowerCase().trim();
      return !DANGEROUS_CSS_PROPERTIES.some(dangerous => 
        lowerProp.includes(dangerous)
      );
    })
    .join(';');
  
  return sanitized;
}

/**
 * Sanitize a URL (href attribute)
 */
function sanitizeUrl(url: string): string {
  const lowerUrl = url.toLowerCase().trim();
  
  // Check for dangerous protocols
  if (DANGEROUS_PROTOCOLS.some(protocol => lowerUrl.startsWith(protocol))) {
    return '#';
  }
  
  return url;
}

/**
 * Sanitize an HTML attribute value
 * Exported for testing and potential external use
 */
export function sanitizeAttribute(tagName: string, attrName: string, attrValue: string): string | null {
  const allowedAttrs = ALLOWED_ATTRIBUTES[tagName.toLowerCase()];
  
  // If tag has no allowed attributes or this attribute is not allowed, remove it
  if (!allowedAttrs || !allowedAttrs.has(attrName.toLowerCase())) {
    return null;
  }
  
  // Special handling for specific attributes
  if (attrName.toLowerCase() === 'href') {
    return sanitizeUrl(attrValue);
  }
  
  if (attrName.toLowerCase() === 'style') {
    return sanitizeStyle(attrValue);
  }
  
  // For target attribute, only allow _blank
  if (attrName.toLowerCase() === 'target') {
    return attrValue === '_blank' ? '_blank' : null;
  }
  
  return attrValue;
}

/**
 * Remove all event handlers and dangerous attributes from HTML
 */
function removeEventHandlers(html: string): string {
  // Remove on* event handlers
  html = html.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  html = html.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: and vbscript: in any attribute
  html = html.replace(/javascript\s*:/gi, '');
  html = html.replace(/vbscript\s*:/gi, '');
  
  return html;
}

/**
 * Remove script, style, iframe, object, embed tags completely
 */
function removeDangerousTags(html: string): string {
  const dangerousTagsRegex = /<(script|style|iframe|object|embed|form|input|button|textarea|select|meta|link|base)[^>]*>[\s\S]*?<\/\1>/gi;
  const selfClosingDangerousTagsRegex = /<(script|style|iframe|object|embed|form|input|button|textarea|select|meta|link|base)[^>]*\/?>/gi;
  
  let sanitized = html;
  
  // Remove paired tags
  sanitized = sanitized.replace(dangerousTagsRegex, '');
  
  // Remove self-closing tags
  sanitized = sanitized.replace(selfClosingDangerousTagsRegex, '');
  
  return sanitized;
}

/**
 * Main HTML sanitization function
 * Use this for any user-generated HTML content displayed with dangerouslySetInnerHTML
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) {
    return '';
  }
  
  let sanitized = String(html);
  
  // Step 1: Remove dangerous tags completely
  sanitized = removeDangerousTags(sanitized);
  
  // Step 2: Remove event handlers
  sanitized = removeEventHandlers(sanitized);
  
  // Step 3: Handle SVG and MathML (remove completely for now)
  sanitized = sanitized.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');
  sanitized = sanitized.replace(/<math[^>]*>[\s\S]*?<\/math>/gi, '');
  
  // Step 4: Sanitize remaining dangerous patterns
  // Remove HTML comments (can be used for attacks)
  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove CDATA sections
  sanitized = sanitized.replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, '');
  
  // Remove XML declarations
  sanitized = sanitized.replace(/<\?xml[^>]*\?>/gi, '');
  
  // Remove doctype
  sanitized = sanitized.replace(/<!DOCTYPE[^>]*>/gi, '');
  
  return sanitized.trim();
}

/**
 * Strict sanitization - strips ALL HTML and returns plain text
 * Use this for fields that should never contain HTML
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) {
    return '';
  }
  
  return String(html)
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validate that content doesn't exceed maximum length
 * Useful for preventing DoS via large content
 */
export function validateContentLength(
  content: string,
  maxLength: number = 100000 // 100KB default
): { valid: boolean; message?: string } {
  if (content.length > maxLength) {
    return {
      valid: false,
      message: `Il contenuto supera la lunghezza massima consentita (${Math.round(maxLength / 1000)}KB)`,
    };
  }
  return { valid: true };
}
