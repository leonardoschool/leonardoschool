/**
 * Picks the usable image source of a question/answer: `imageUrl` when present,
 * otherwise the Firebase `imageStoragePath` (resolved to a URL by normalizeImageSrc).
 * Every rendering surface must go through this instead of reading `imageUrl` alone,
 * otherwise images stored only as a storage path silently disappear.
 */
export function questionImageSource(
  entity?: { imageUrl?: string | null; imageStoragePath?: string | null } | null
): string | null {
  return entity?.imageUrl?.trim() || entity?.imageStoragePath?.trim() || null;
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