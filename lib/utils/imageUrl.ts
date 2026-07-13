/**
 * Resolves the best usable image source for a question or answer entity.
 * An image can live in `imageUrl` (canonical URL) OR `imageStoragePath`
 * (Firebase relative path); some legacy/CINECA rows only have the latter.
 * Prefers imageUrl, falls back to imageStoragePath, both run through
 * normalizeImageSrc. Returns null when neither is usable.
 */
export function questionImageSource(
  entity?: { imageUrl?: string | null; imageStoragePath?: string | null } | null
): string | null {
  if (!entity) return null;
  return normalizeImageSrc(entity.imageUrl) ?? normalizeImageSrc(entity.imageStoragePath);
}

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
    // Legacy __uploads files are nested under schools/leonardo/ in Firebase Storage
    const storagePath = cleanPath.startsWith('__uploads/')
      ? `schools/leonardo/${cleanPath}`
      : cleanPath;
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(storagePath)}?alt=media`;
  }

  const localSrc = trimmedSrc.startsWith('/') ? trimmedSrc : `/${trimmedSrc}`;
  return localSrc.replace(/\/{2,}/g, '/');
}