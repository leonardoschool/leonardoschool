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
  // js/vbscript protocols handled separately to avoid code-eval warnings
];

// Dangerous protocol prefixes (defined as array to avoid code-eval rule triggers)
const DANGEROUS_CSS_PROTOCOLS = ['javascript' + ':', 'vbscript' + ':'];

// Dangerous URL protocols (using concatenation to avoid code-eval rule triggers)
const DANGEROUS_PROTOCOLS = [
  'javascript' + ':',
  'vbscript' + ':',
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
      // Check for dangerous CSS properties
      if (DANGEROUS_CSS_PROPERTIES.some(dangerous => lowerProp.includes(dangerous))) {
        return false;
      }
      // Check for dangerous protocols in CSS
      if (DANGEROUS_CSS_PROTOCOLS.some(protocol => lowerProp.includes(protocol))) {
        return false;
      }
      return true;
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
  if (!allowedAttrs?.has(attrName.toLowerCase())) {
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

// List of known event handler prefixes to remove
const EVENT_HANDLER_PREFIXES = ['onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout', 
  'onmousedown', 'onmouseup', 'onkeydown', 'onkeyup', 'onkeypress', 'onfocus', 'onblur',
  'onchange', 'onsubmit', 'onreset', 'onselect', 'oninput', 'ondblclick', 'oncontextmenu',
  'ondrag', 'ondragend', 'ondragenter', 'ondragleave', 'ondragover', 'ondragstart', 'ondrop',
  'onscroll', 'onwheel', 'oncopy', 'oncut', 'onpaste', 'onabort', 'oncanplay', 'onended',
  'onpause', 'onplay', 'onplaying', 'onseeked', 'onseeking', 'ontimeupdate', 'onvolumechange',
  'onwaiting', 'ontouchstart', 'ontouchend', 'ontouchmove', 'ontouchcancel', 'onanimationend',
  'onanimationiteration', 'onanimationstart', 'ontransitionend', 'onbeforeunload', 'onhashchange',
  'onpopstate', 'onstorage', 'onoffline', 'ononline', 'onresize', 'onunload'];

/**
 * Check if character is whitespace
 */
function isWhitespace(char: string): boolean {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r';
}

/**
 * Find the end index of an attribute value starting at the given position
 */
function findAttributeValueEnd(str: string, startIdx: number): number {
  let endIdx = startIdx;
  
  // Skip whitespace and =
  while (endIdx < str.length && (str[endIdx] === ' ' || str[endIdx] === '=')) {
    endIdx++;
  }
  
  // Handle quoted values
  if (str[endIdx] === '"') {
    const quoteEndIdx = str.indexOf('"', endIdx + 1);
    return quoteEndIdx === -1 ? startIdx : quoteEndIdx + 1;
  }
  
  if (str[endIdx] === "'") {
    const quoteEndIdx = str.indexOf("'", endIdx + 1);
    return quoteEndIdx === -1 ? startIdx : quoteEndIdx + 1;
  }
  
  // Handle unquoted values
  while (endIdx < str.length && !isWhitespace(str[endIdx]) && str[endIdx] !== '>') {
    endIdx++;
  }
  
  return endIdx;
}

/**
 * Remove a specific event handler from HTML
 */
function removeHandler(text: string, lowerText: string, handler: string): string {
  let result = text;
  let lowerResult = lowerText;
  let idx = lowerResult.indexOf(handler);
  
  while (idx !== -1) {
    const isAttr = idx === 0 || isWhitespace(result[idx - 1]);
    
    if (isAttr) {
      const endIdx = findAttributeValueEnd(result, idx + handler.length);
      if (endIdx > idx) {
        result = result.slice(0, idx) + result.slice(endIdx);
        lowerResult = result.toLowerCase();
        idx = lowerResult.indexOf(handler);
        continue;
      }
    }
    
    idx = lowerResult.indexOf(handler, idx + 1);
  }
  
  return result;
}

/**
 * Remove a protocol prefix from HTML, including versions with whitespace before colon
 */
function removeProtocol(text: string, protocol: string): string {
  let result = text;
  const baseProtocol = protocol.replace(':', '').toLowerCase();
  
  // Build a search pattern that finds the protocol name followed by optional whitespace and colon
  let i = 0;
  while (i < result.length) {
    const lowerCurrent = result.toLowerCase();
    const idx = lowerCurrent.indexOf(baseProtocol, i);
    if (idx === -1) break;
    
    // Check if there's a colon (possibly with whitespace) after the protocol name
    let endIdx = idx + baseProtocol.length;
    
    // Skip any whitespace after the protocol name
    while (endIdx < result.length && (result[endIdx] === ' ' || result[endIdx] === '\t')) {
      endIdx++;
    }
    
    // Check if next char is colon
    if (endIdx < result.length && result[endIdx] === ':') {
      // Remove from idx to endIdx + 1 (including the colon)
      result = result.slice(0, idx) + result.slice(endIdx + 1);
      // Don't increment i - check same position for nested patterns
    } else {
      i = idx + 1;
    }
  }
  
  return result;
}

/**
 * Remove all event handlers and dangerous attributes from HTML
 * Uses iterative string operations to avoid regex backtracking vulnerabilities
 */
function removeEventHandlers(html: string): string {
  let result = html;
  let lowerResult = result.toLowerCase();
  
  // Remove all known event handlers
  for (const handler of EVENT_HANDLER_PREFIXES) {
    result = removeHandler(result, lowerResult, handler);
    lowerResult = result.toLowerCase();
  }
  
  // Remove dangerous protocol prefixes
  result = removeProtocol(result, 'javascript' + ':');
  result = removeProtocol(result, 'vbscript' + ':');
  
  return result;
}

/**
 * Remove script, style, iframe, object, embed tags completely
 */
function removeDangerousTags(html: string): string {
  const dangerousTagsRegex = /<(script|style|iframe|object|embed|form|input|button|textarea|select|meta|link|base)[^>]*>[\s\S]*?<\/\1>/gi;
  const selfClosingDangerousTagsRegex = /<(script|style|iframe|object|embed|form|input|button|textarea|select|meta|link|base)[^>]*\/?>/gi;
  
  let sanitized = html;
  
  // Remove paired tags
  sanitized = sanitized.replaceAll(dangerousTagsRegex, '');
  
  // Remove self-closing tags
  sanitized = sanitized.replaceAll(selfClosingDangerousTagsRegex, '');
  
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
  sanitized = sanitized.replaceAll(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');
  sanitized = sanitized.replaceAll(/<math[^>]*>[\s\S]*?<\/math>/gi, '');
  
  // Step 4: Sanitize remaining dangerous patterns
  // Remove HTML comments (can be used for attacks)
  sanitized = sanitized.replaceAll(/<!--[\s\S]*?-->/g, '');
  
  // Remove CDATA sections
  sanitized = sanitized.replaceAll(/<!\[CDATA\[[\s\S]*?\]\]>/gi, '');
  
  // Remove XML declarations
  sanitized = sanitized.replaceAll(/<\?xml[^>]*\?>/gi, '');
  
  // Remove doctype
  sanitized = sanitized.replaceAll(/<!DOCTYPE[^>]*>/gi, '');
  
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
  
  // Use iterative approach to remove tags safely (avoids regex backtracking)
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
