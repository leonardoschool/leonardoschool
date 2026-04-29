export function sanitizeStudentOpenAnswerInput(value: string | null | undefined): string {
  if (!value) return '';

  return value
    .replace(/<\s*\/?\s*[a-zA-Z][^>]*>/g, '')
    .replace(/&lt;\s*\/?\s*[a-zA-Z][\s\S]*?&gt;/gi, '')
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/\$[^$]*\$/g, '')
    .replace(/\\\([\s\S]*?\\\)/g, '')
    .replace(/\\\[[\s\S]*?\\\]/g, '')
    .replace(/\\[a-zA-Z]+(?:\s*\{[^{}]*\})*/g, '')
    .replace(/[{}^_$\\]/g, '');
}

export function sanitizeStudentAnswerText(value: string | null | undefined): string | null {
  const sanitized = sanitizeStudentOpenAnswerInput(value).trim();
  return sanitized.length > 0 ? sanitized : null;
}
