import { normalizeImageSrc } from './imageUrl';

// Known LaTeX math command names (without the leading backslash).
// Used instead of a giant alternation regex to stay within SonarJS regex-complexity limits.
const MATH_CMDS = new Set([
  'sqrt', 'frac', 'dfrac', 'tfrac', 'cfrac', 'sfrac',
  'sum', 'int', 'oint', 'iint', 'iiint', 'prod', 'coprod',
  'lim', 'limsup', 'liminf', 'log', 'ln', 'exp',
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'coth',
  'max', 'min', 'sup', 'inf', 'det', 'ker', 'deg', 'gcd', 'lcm',
  'dim', 'hom', 'Pr', 'arg',
  'cdot', 'cdots', 'ldots', 'vdots', 'ddots',
  'times', 'div', 'pm', 'mp',
  'leq', 'geq', 'le', 'ge', 'neq', 'ne', 'll', 'gg',
  'approx', 'equiv', 'sim', 'simeq', 'cong', 'propto',
  'in', 'notin', 'ni', 'subset', 'supset', 'subseteq', 'supseteq',
  'cup', 'cap', 'setminus', 'emptyset',
  'infty', 'partial', 'nabla', 'forall', 'exists', 'nexists',
  'to', 'rightarrow', 'leftarrow', 'leftrightarrow',
  'Rightarrow', 'Leftarrow', 'Leftrightarrow', 'longrightarrow',
  'iff', 'mapsto', 'not', 'neg',
  'vec', 'hat', 'bar', 'tilde', 'dot', 'ddot', 'dddot',
  'overline', 'underline', 'overbrace', 'underbrace',
  'widehat', 'widetilde', 'mathring',
  'binom', 'pmod', 'bmod', 'mod',
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon',
  'zeta', 'eta', 'theta', 'vartheta', 'iota', 'kappa', 'lambda',
  'mu', 'nu', 'xi', 'pi', 'varpi', 'rho', 'varrho',
  'sigma', 'varsigma', 'tau', 'upsilon', 'phi', 'varphi', 'chi', 'psi', 'omega',
  'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon', 'Phi', 'Psi', 'Omega',
  'mathbb', 'mathbf', 'mathrm', 'mathit', 'mathcal', 'mathfrak', 'mathsf', 'mathtt',
  'boldsymbol', 'text', 'textrm', 'textbf', 'textit',
  'left', 'right', 'middle', 'big', 'Big', 'bigg', 'Bigg',
  'langle', 'rangle', 'lceil', 'rceil', 'lfloor', 'rfloor',
  'hbar', 'ell', 'Re', 'Im', 'wp', 'aleph', 'imath', 'jmath',
  'angle', 'triangle', 'square', 'circ', 'bullet', 'star', 'dagger', 'ddagger',
  'oplus', 'otimes', 'ominus', 'oslash',
  'uparrow', 'downarrow', 'updownarrow', 'Uparrow', 'Downarrow',
  'gt', 'lt',
]);

// Extracts the command name from a string that starts with `\name` (letters only).
const CMD_NAME_RE = /^\\([a-zA-Z]+)/;

// A \includegraphics{...} reference we can actually resolve to a real image: an absolute
// URL, a data/blob URI, or a storage path (has a slash).
// A BARE filename (e.g. \includegraphics{47bec697-….png}) is NOT resolvable client-side: it
// would map to a token-less Firebase URL that 403s, showing a broken image. Such references
// only come from imports (e.g. CINECA), which also store the real picture in the question's
// `imageUrl` field — rendered separately — so we strip the bare inline reference instead.
function isResolvableImageRef(ref: string): boolean {
  return (
    /^(https?:|data:|blob:)/i.test(ref) ||
    ref.includes('/')
  );
}

/**
 * Replaces every \includegraphics{ref} with buildImg(resolvedUrl) when the ref is resolvable,
 * and with '' otherwise. Shared by the on-screen renderer and the print/PDF HTML builders.
 */
function replaceIncludegraphics(text: string, buildImg: (src: string) => string): string {
  return text.replace(
    /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g,
    (_full, rawRef: string) => {
      const ref = rawRef.trim();
      if (!isResolvableImageRef(ref)) return '';
      const resolved = normalizeImageSrc(ref);
      return resolved ? buildImg(resolved) : '';
    }
  );
}

/**
 * Print/PDF path: turns \includegraphics references into raw <img> tags so inline images appear
 * in the printed simulation too (the print builders assemble an HTML string, not React).
 */
export function renderLatexImagesForPrint(text: string): string {
  return replaceIncludegraphics(text, (src) => {
    const safeSrc = src.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    // Cap the size to match the print sheet's .question-image/.answer-image (≤300×200px),
    // otherwise max-width:100% blows up to full A4 width. Inline style is used because it
    // overrides the stylesheet and keeps both print builders consistent.
    return `<img src="${safeSrc}" alt="" class="inline-text-image" loading="eager" decoding="sync" style="display:block;max-width:300px;max-height:200px;width:auto;height:auto;margin:6px 0" />`;
  }).trim();
}

/** Returns true if `slice` starts with a known math command (`\name` in MATH_CMDS). */
function startsWithMathCmd(slice: string): boolean {
  const m = slice.match(CMD_NAME_RE);
  return m !== null && MATH_CMDS.has(m[1]);
}

/** Returns true if `text` contains at least one known math command anywhere. */
function containsMathCmd(text: string): boolean {
  let pos = 0;
  while (pos < text.length) {
    const idx = text.indexOf('\\', pos);
    if (idx === -1) return false;
    const m = text.slice(idx).match(CMD_NAME_RE);
    if (m && MATH_CMDS.has(m[1])) return true;
    pos = idx + 1;
  }
  return false;
}

/**
 * Low-level normalizer shared by both the full-text and LaTeX-only paths.
 * Unescapes double backslashes and decodes HTML entities.
 * Does NOT convert \newline or wrap undelimited math — callers handle those.
 */
function normalizeLatexContent(text: string): string {
  let normalized = text;
  let previous: string;

  do {
    previous = normalized;
    normalized = normalized.replace(/\\\\(?=(?:[()[\]]|[a-zA-Z]))/g, '\\');
  } while (normalized !== previous);

  return normalized
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&le;/g, '≤')
    .replace(/&ge;/g, '≥')
    .replace(/&ne;/g, '≠')
    .replace(/&times;/g, '×')
    .replace(/&divide;/g, '÷')
    .replace(/&plusmn;/g, '±')
    .replace(/&infin;/g, '∞');
}

/**
 * Scans `text` for LaTeX math commands that appear outside existing math
 * delimiters (`$`, `\(`, `\[`, `$$`, `\begin`) and wraps each contiguous
 * math expression with `$...$`.
 *
 * "Contiguous math" includes: balanced braces, operators (+−*\/=<>^_|.,),
 * digits, whitespace, parentheses/brackets, and single-letter variables.
 * A run of 2+ unbraced letters that don't follow `\` is treated as natural
 * language and terminates the math region.
 */
export function wrapUndelimitedMath(text: string): string {
  if (!containsMathCmd(text)) return text;

  const len = text.length;
  let result = '';
  let i = 0;

  while (i < len) {
    const ch = text[i];

    // ── Pass through existing delimited blocks unchanged ──────────────────
    if (ch === '\\') {
      if (text.startsWith('\\(', i)) {
        const end = text.indexOf('\\)', i + 2);
        if (end !== -1) { result += text.slice(i, end + 2); i = end + 2; continue; }
      }
      if (text.startsWith('\\[', i)) {
        const end = text.indexOf('\\]', i + 2);
        if (end !== -1) { result += text.slice(i, end + 2); i = end + 2; continue; }
      }
      // \begin{...}...\end{...}
      const beginMatch = text.slice(i).match(/^\\begin\{(\w+\*?)\}/);
      if (beginMatch) {
        const envName = beginMatch[1];
        const endTag = `\\end{${envName}}`;
        const endIdx = text.indexOf(endTag, i + beginMatch[0].length);
        if (endIdx !== -1) {
          result += text.slice(i, endIdx + endTag.length);
          i = endIdx + endTag.length;
          continue;
        }
      }

      // ── Undelimited math command? ─────────────────────────────────────
      if (startsWithMathCmd(text.slice(i))) {
        let j = i;
        let depth = 0;

        while (j < len) {
          const c = text[j];
          if (c === '{') { depth++; j++; continue; }
          if (c === '}') {
            if (depth > 0) { depth--; j++; continue; }
            break;
          }
          if (c === '\\') {
            // Skip command name and continue collecting
            j++;
            while (j < len && /[a-zA-Z*]/.test(text[j])) j++;
            continue;
          }
          // Operators, digits, whitespace, parens, brackets, standard math punctuation
          if (/[+\-*\/=<>^_|.,:!\d\s()[\]]/.test(c)) { j++; continue; }
          // Letter(s): single letter outside braces → variable; 2+ letters → natural language
          if (/[a-zA-ZÀ-ÿ]/.test(c)) {
            let k = j + 1;
            while (k < len && /[a-zA-ZÀ-ÿ]/.test(text[k])) k++;
            if (k - j >= 2 && depth === 0) break;
            j = k;
            continue;
          }
          break;
        }

        const mathExpr = text.slice(i, j).trim();
        if (mathExpr) result += `$${mathExpr}$`;
        i = j;
        continue;
      }
    }

    // ── Pass through existing $ blocks unchanged ──────────────────────────
    if (ch === '$') {
      if (text.startsWith('$$', i)) {
        const end = text.indexOf('$$', i + 2);
        if (end !== -1) { result += text.slice(i, end + 2); i = end + 2; continue; }
      } else {
        const end = text.indexOf('$', i + 1);
        if (end !== -1) { result += text.slice(i, end + 1); i = end + 1; continue; }
      }
    }

    result += ch;
    i++;
  }

  return result;
}

/**
 * Finds pre-rendered KaTeX HTML blocks (stored by old platforms) and replaces
 * each one with the original LaTeX source extracted from the embedded
 * <annotation encoding="application/x-tex"> tag.
 */
export function restoreKaTeXToLatex(html: string): string {
  if (!html.includes('class="katex')) return html;

  let result = '';
  let i = 0;
  const len = html.length;

  while (i < len) {
    const katexStart = html.indexOf('<span class="katex', i);
    if (katexStart === -1) { result += html.slice(i); break; }

    result += html.slice(i, katexStart);

    let depth = 0;
    let j = katexStart;
    while (j < len) {
      if (html[j] === '<') {
        if (html.startsWith('<span', j)) {
          depth++;
          const tagEnd = html.indexOf('>', j);
          j = tagEnd === -1 ? len : tagEnd + 1;
          continue;
        }
        if (html.startsWith('</span>', j)) {
          depth--;
          j += 7;
          if (depth === 0) break;
          continue;
        }
      }
      j++;
    }

    const block = html.slice(katexStart, j);
    const annotationMatch = block.match(/<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/);
    result += annotationMatch ? annotationMatch[1] : block;
    i = j;
  }

  return result;
}

/**
 * Normalizes text that may contain a mix of prose and LaTeX coming from the
 * database. Strips pre-rendered KaTeX HTML, unescapes backslashes, decodes
 * HTML entities, and wraps bare LaTeX commands with `$...$` so that
 * RichTextRenderer can render them.
 */
export function normalizeStoredRichText(value: string): string {
  let normalized = restoreKaTeXToLatex(value);
  normalized = normalizeLatexContent(normalized);
  normalized = normalized.replace(/\\newline\b/g, '\n');
  // Render LaTeX image references inline (in place of the command) when the target is
  // resolvable, so an image can sit in the middle of the text — not only appended via the
  // question's imageUrl field. Unresolvable bare names are stripped (see isResolvableImageRef).
  normalized = replaceIncludegraphics(
    normalized,
    (src) => `<img src="${src}" alt="" style="max-width:100%;height:auto;display:block;margin:0.5rem auto" />`
  );
  return wrapUndelimitedMath(normalized);
}

/**
 * Prepares a raw LaTeX string (already extracted from a math delimiter) for
 * KaTeX's renderToString. Only unescapes backslashes, decodes HTML entities,
 * and strips unsupported font-size commands.
 *
 * Must NOT call wrapUndelimitedMath: the content is already pure LaTeX and
 * adding `$...$` wrappers would break KaTeX's parser.
 */
export function sanitizeLatexForKatex(latex: string): string {
  return normalizeLatexContent(latex)
    .replace(/\\(?:tiny|scriptsize|footnotesize|small|normalsize|large|Large|LARGE|huge|Huge)\b\s*/g, '')
    .replace(/\\newline\b\s*/g, ' ');
}
