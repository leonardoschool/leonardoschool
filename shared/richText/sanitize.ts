/**
 * The single allowlist used to sanitize rendered question/answer HTML.
 *
 * Shared so the web renderer (isomorphic-dompurify) and the mobile WebView renderer
 * (DOMPurify loaded inside the WebView) accept exactly the same markup: a tag allowed
 * on one client and stripped on the other is how content silently disappears for part
 * of the students.
 */
export const RICH_TEXT_ALLOWED_TAGS = [
  'b', 'i', 'u', 'strong', 'em', 'sub', 'sup', 'br', 'span', 'p', 'div',
  'ul', 'ol', 'li', 'h3', 'h4', 'blockquote', 'hr',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  'img',
  'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup',
  'msub', 'mfrac', 'msqrt', 'mroot', 'munder', 'mover', 'munderover',
  'mtable', 'mtr', 'mtd', 'annotation', 'svg', 'path', 'line', 'g',
];

export const RICH_TEXT_ALLOWED_ATTR = [
  'class', 'style', 'href', 'xmlns', 'width', 'height', 'viewBox',
  'd', 'fill', 'stroke', 'stroke-width', 'preserveAspectRatio',
  'aria-hidden', 'focusable', 'role',
  'border', 'cellpadding', 'cellspacing', 'colspan', 'rowspan',
  'src', 'alt',
];

export const RICH_TEXT_ADD_TAGS = ['foreignObject'];

export const richTextSanitizeConfig = {
  ALLOWED_TAGS: RICH_TEXT_ALLOWED_TAGS,
  ALLOWED_ATTR: RICH_TEXT_ALLOWED_ATTR,
  ADD_TAGS: RICH_TEXT_ADD_TAGS,
};
