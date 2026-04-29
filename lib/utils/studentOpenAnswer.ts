export function sanitizeStudentOpenAnswerInput(value: string | null | undefined): string {
  if (!value) return '';

  return value
    // eslint-disable-next-line sonarjs/slow-regex
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;[^>]*&gt;/gi, '')
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
