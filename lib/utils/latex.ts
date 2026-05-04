export function normalizeStoredRichText(value: string): string {
  let normalized = value;
  let previous: string;

  do {
    previous = normalized;
    normalized = normalized.replace(/\\\\(?=(?:[()[\]]|[a-zA-Z]))/g, '\\');
  } while (normalized !== previous);

  return normalized.replace(/\\newline\b/g, '\n');
}

export function sanitizeLatexForKatex(latex: string): string {
  return normalizeStoredRichText(latex)
    .replace(/\\(?:tiny|scriptsize|footnotesize|small|normalsize|large|Large|LARGE|huge|Huge)\b\s*/g, '')
    .replace(/\\newline\b\s*/g, ' ');
}
