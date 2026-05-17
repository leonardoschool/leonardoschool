// Regex that matches a known LaTeX math command anchored at start-of-string.
// Used to detect the beginning of an undelimited math expression.
const MATH_CMD_AT_START =
  /^\\(?:sqrt|[dt]?frac|cfrac|sfrac|sum|int|oint|iint|iiint|prod|coprod|lim(?:sup|inf)?|log|ln|exp|sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|sinh|cosh|tanh|coth|max|min|sup|inf|det|ker|deg|gcd|lcm|dim|hom|Pr|arg|cdot|cdots|ldots|vdots|ddots|times|div|pm|mp|leq|geq|le|ge|neq|ne|ll|gg|approx|equiv|sim|simeq|cong|propto|in|notin|ni|subset|supset|subseteq|supseteq|cup|cap|setminus|emptyset|infty|partial|nabla|forall|exists|nexists|to|rightarrow|leftarrow|leftrightarrow|Rightarrow|Leftarrow|Leftrightarrow|longrightarrow|iff|mapsto|not|neg|vec|hat|bar|tilde|dot|ddot|dddot|overline|underline|overbrace|underbrace|widehat|widetilde|mathring|binom|pmod|bmod|mod|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|varrho|sigma|varsigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|mathbb|mathbf|mathrm|mathit|mathcal|mathfrak|mathsf|mathtt|boldsymbol|text|textrm|textbf|textit|left|right|middle|big|Big|bigg|Bigg|langle|rangle|lceil|rceil|lfloor|rfloor|hbar|ell|Re|Im|wp|aleph|imath|jmath|angle|triangle|square|circ|bullet|star|dagger|ddagger|oplus|otimes|ominus|oslash|uparrow|downarrow|updownarrow|Uparrow|Downarrow|gt|lt)\b/;

// Quick check: does the string contain at least one LaTeX math command?
const MATH_CMD_ANYWHERE = /\\(?:sqrt|frac|sum|int|prod|lim|log|ln|sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|sinh|cosh|tanh|max|min|sup|inf|det|binom|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|nu|xi|pi|sigma|tau|phi|psi|omega|Gamma|Delta|Lambda|Pi|Sigma|Omega|mathbb|mathbf|mathrm|mathit|text|vec|hat|bar|tilde|overline|underline|cdot|times|div|pm|leq|geq|neq|approx|equiv|infty|partial|nabla|forall|exists|to|rightarrow|Rightarrow|gt|lt)\b/;

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
  if (!MATH_CMD_ANYWHERE.test(text)) return text;

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
      const cmdMatch = text.slice(i).match(MATH_CMD_AT_START);
      if (cmdMatch) {
        // Collect the full math expression from this point
        let j = i;
        let depth = 0;

        while (j < len) {
          const c = text[j];
          if (c === '{') { depth++; j++; continue; }
          if (c === '}') {
            if (depth > 0) { depth--; j++; continue; }
            break; // unmatched closing brace — stop
          }
          if (c === '\\') {
            // Another math command — include it and keep going
            if (text.slice(j).match(MATH_CMD_AT_START)) {
              j++;
              while (j < len && /[a-zA-Z*]/.test(text[j])) j++;
              continue;
            }
            // Unknown command — include and skip name
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
            if (k - j >= 2 && depth === 0) break; // natural language word — stop
            j = k;
            continue;
          }
          break; // any other character (?, !, etc.) — stop
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
 *
 * Uses balanced-span counting so nested <span> elements are handled correctly
 * regardless of how deeply the KaTeX HTML is nested.
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

    // Walk forward counting <span> opens and </span> closes
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

export function normalizeStoredRichText(value: string): string {
  let normalized = value;
  let previous: string;

  // Strip pre-rendered KaTeX HTML, restoring raw LaTeX source
  normalized = restoreKaTeXToLatex(normalized);

  // Unescape double-escaped backslashes before math delimiters/commands
  do {
    previous = normalized;
    normalized = normalized.replace(/\\\\(?=(?:[()[\]]|[a-zA-Z]))/g, '\\');
  } while (normalized !== previous);

  normalized = normalized.replace(/\\newline\b/g, '\n');

  // Decode HTML entities commonly stored by old platforms in math expressions
  normalized = normalized
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

  // Wrap raw LaTeX math (no delimiters) so RichTextRenderer can render it
  normalized = wrapUndelimitedMath(normalized);

  return normalized;
}

export function sanitizeLatexForKatex(latex: string): string {
  return normalizeStoredRichText(latex)
    .replace(/\\(?:tiny|scriptsize|footnotesize|small|normalsize|large|Large|LARGE|huge|Huge)\b\s*/g, '')
    .replace(/\\newline\b\s*/g, ' ');
}
