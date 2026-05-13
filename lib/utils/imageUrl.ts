export function normalizeImageSrc(src?: string | null): string | null {
  const trimmedSrc = src?.trim();

  if (!trimmedSrc) {
    return null;
  }

  if (/^(https?:|data:|blob:)/i.test(trimmedSrc)) {
    return trimmedSrc;
  }

  const localSrc = trimmedSrc.startsWith('/') ? trimmedSrc : `/${trimmedSrc}`;

  return localSrc.replace(/\/{2,}/g, '/');
}