// Simple HTML escaping utility to prevent injection when interpolating user data
const HTML_ESCAPE_REGEX = /[&<>"']/g;

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(HTML_ESCAPE_REGEX, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

export function sanitizeText(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return escapeHtml(String(value));
}
