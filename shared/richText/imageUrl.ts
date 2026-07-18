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

/**
 * Both names are referenced literally so each bundler can inline its own: Next.js only
 * substitutes NEXT_PUBLIC_*, Expo only EXPO_PUBLIC_*. A dynamic lookup would be inlined
 * by neither and leave the bucket undefined at runtime.
 */
function resolveStorageBucket(): string | undefined {
  return process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
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
  const bucket = resolveStorageBucket();
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