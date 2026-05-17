export function normalizeImageSrc(src?: string | null): string | null {
  const trimmedSrc = src?.trim();

  if (!trimmedSrc) {
    return null;
  }

  if (/^(https?:|data:|blob:)/i.test(trimmedSrc)) {
    return trimmedSrc;
  }

  // Firebase Storage relative path → full download URL
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (bucket) {
    const cleanPath = trimmedSrc.startsWith('/') ? trimmedSrc.slice(1) : trimmedSrc;
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(cleanPath)}?alt=media`;
  }

  const localSrc = trimmedSrc.startsWith('/') ? trimmedSrc : `/${trimmedSrc}`;
  return localSrc.replace(/\/{2,}/g, '/');
}