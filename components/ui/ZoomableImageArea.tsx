'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, ZoomIn } from 'lucide-react';
import { Portal } from './Portal';

interface ZoomedImage {
  src: string;
  alt: string;
}

interface ZoomableImageAreaProps {
  readonly children: React.ReactNode;
  readonly className?: string;
}

/**
 * Makes every <img> inside tappable to open it full screen.
 *
 * Uses event delegation rather than a prop on each image on purpose: question figures reach
 * the page two different ways — as the question's `imageUrl` field (a React component) and as
 * an inline `\includegraphics{...}` turned into raw HTML inside RichTextRenderer's
 * dangerouslySetInnerHTML, which no React prop can reach. Delegation covers both, so a figure
 * is never zoomable in one form and dead in the other.
 *
 * Diagrams are unreadable at phone width, and until now nothing in the simulation player
 * enlarged them — students reported figures they could not actually read.
 */
export default function ZoomableImageArea({ children, className = '' }: ZoomableImageAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomed, setZoomed] = useState<ZoomedImage | null>(null);

  const openImage = useCallback((img: HTMLImageElement) => {
    const src = img.currentSrc || img.src;
    if (src) setZoomed({ src, alt: img.alt || 'Immagine della domanda' });
  }, []);

  // Mark images as interactive so pointer and keyboard users get the same affordance.
  // Runs on every render because the question (and therefore the markup) changes as the
  // student navigates, and inline images are injected outside React's control.
  useEffect(() => {
    const images = containerRef.current?.querySelectorAll('img');
    images?.forEach((img) => {
      img.style.cursor = 'zoom-in';
      img.setAttribute('role', 'button');
      img.setAttribute('tabindex', '0');
      if (!img.getAttribute('aria-label')) {
        img.setAttribute('aria-label', 'Ingrandisci immagine');
      }
    });
  });

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'IMG') openImage(target as HTMLImageElement);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target as HTMLElement;
    if (target.tagName !== 'IMG') return;
    event.preventDefault();
    openImage(target as HTMLImageElement);
  };

  return (
    <>
      <div ref={containerRef} className={className} onClick={handleClick} onKeyDown={handleKeyDown}>
        {children}
      </div>

      {zoomed && <ImageZoomOverlay image={zoomed} onClose={() => setZoomed(null)} />}
    </>
  );
}

function ImageZoomOverlay({ image, onClose }: Readonly<{ image: ZoomedImage; onClose: () => void }>) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <Portal>
      <dialog
        open
        aria-label="Immagine ingrandita"
        className="fixed inset-0 z-[9999] m-0 flex h-full max-h-none w-full max-w-none items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi immagine"
          className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Backdrop: tapping anywhere outside the picture closes, as users expect from a viewer. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi immagine"
          className="absolute inset-0 cursor-zoom-out"
          tabIndex={-1}
        />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.src}
          alt={image.alt}
          className="relative max-h-[90vh] max-w-[95vw] object-contain"
        />
      </dialog>
    </Portal>
  );
}

/** Small inline hint that a figure can be enlarged. */
export function ZoomHint({ label = 'Tocca l’immagine per ingrandirla' }: Readonly<{ label?: string }>) {
  return (
    <span className="mt-2 flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      <ZoomIn className="h-3 w-3" />
      {label}
    </span>
  );
}
