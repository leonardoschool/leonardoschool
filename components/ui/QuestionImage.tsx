'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { normalizeImageSrc } from '@/lib/utils/imageUrl';

// Hosts that next/image is allowed to optimize (see remotePatterns in next.config.ts).
// Any other source (arbitrary external URLs, data:/blob:) must NOT go through next/image,
// otherwise the optimizer rejects the domain and the picture silently disappears — which is
// exactly what happened to questions whose image was pasted as an external URL.
const OPTIMIZABLE_HOSTS = new Set([
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
]);

function canOptimize(src: string): boolean {
  try {
    return OPTIMIZABLE_HOSTS.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

interface QuestionImageProps {
  readonly src?: string | null;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/**
 * Renders a question/answer image, resolving Firebase Storage paths via
 * normalizeImageSrc. Uses next/image for allowlisted hosts (optimized) and a plain
 * <img> for everything else so external URLs are never dropped by the optimizer.
 * Returns null when there is no usable source.
 */
export default function QuestionImage({ src, alt, width, height, className, style }: QuestionImageProps) {
  const resolved = normalizeImageSrc(src);
  if (!resolved) return null;

  if (canOptimize(resolved)) {
    return (
      <Image src={resolved} alt={alt} width={width} height={height} className={className} style={style} />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolved} alt={alt} width={width} height={height} className={className} style={style} />
  );
}
