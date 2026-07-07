'use client';

/**
 * Browser-only wrapper around pdfjs-dist. Kept separate from the pure
 * `parseQuestions` logic so parsing stays unit-testable without a DOM.
 * pdfjs is imported dynamically so this module never runs during SSR.
 */
import type { PdfTextItem } from './parseQuestions';

export interface QuestionRegion {
  page: number; // 0-based
  yTop: number; // PDF user-space y of the question start (higher = upper)
  yBottom: number; // PDF user-space y where the next question starts; may be -Infinity
}

export interface LoadedPdf {
  numPages: number;
  extractItems: () => Promise<PdfTextItem[]>;
  cropRegion: (region: QuestionRegion, opts?: CropOptions) => Promise<Blob>;
  destroy: () => void;
}

interface CropOptions {
  /** Render scale; higher = crisper crop, larger file. */
  scale?: number;
  /** Extra vertical pixels kept above/below the region. */
  padding?: number;
}

// The worker source is process-global in pdfjs, so configure it once.
let workerConfigured = false;

async function getPdfjs() {
  const pdfjs = await import('pdfjs-dist');
  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
    workerConfigured = true;
  }
  return pdfjs;
}

export async function loadPdf(file: File): Promise<LoadedPdf> {
  const pdfjs = await getPdfjs();
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const doc = await loadingTask.promise;

  const extractItems = async (): Promise<PdfTextItem[]> => {
    const items: PdfTextItem[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      for (const raw of content.items) {
        const item = raw as { str?: string; transform?: number[] };
        if (typeof item.str !== 'string' || !item.transform) continue;
        items.push({
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          page: p - 1,
        });
      }
    }
    return items;
  };

  const cropRegion = async (
    region: QuestionRegion,
    opts: CropOptions = {}
  ): Promise<Blob> => {
    const scale = opts.scale ?? 2;
    const padding = opts.padding ?? 6;
    const page = await doc.getPage(region.page + 1);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context non disponibile');
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    // PDF y grows upward from the bottom-left; canvas y grows downward.
    const pageHeightPt = viewport.height / scale;
    const yBottomPt = Number.isFinite(region.yBottom) ? region.yBottom : 0;
    const topPx = clamp((pageHeightPt - region.yTop) * scale - padding, 0, canvas.height);
    const bottomPx = clamp((pageHeightPt - yBottomPt) * scale + padding, 0, canvas.height);
    const cropTop = Math.min(topPx, bottomPx);
    const cropHeight = Math.max(1, Math.abs(bottomPx - topPx));

    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = Math.ceil(cropHeight);
    const outCtx = out.getContext('2d');
    if (!outCtx) throw new Error('Canvas 2D context non disponibile');
    outCtx.drawImage(canvas, 0, cropTop, canvas.width, cropHeight, 0, 0, canvas.width, cropHeight);

    return await new Promise<Blob>((resolve, reject) => {
      out.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Generazione immagine fallita'))),
        'image/png'
      );
    });
  };

  return {
    numPages: doc.numPages,
    extractItems,
    cropRegion,
    destroy: () => {
      void loadingTask.destroy();
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
