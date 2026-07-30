'use client';

/**
 * Browser-only wrapper around pdfjs-dist. Kept separate from the pure
 * `parseQuestions` logic so parsing stays unit-testable without a DOM.
 * pdfjs is imported dynamically so this module never runs during SSR.
 */
import type { PdfHighlight, PdfTextItem } from './parseQuestions';

export interface QuestionRegion {
  page: number; // 0-based
  yTop: number; // PDF user-space y of the question start (higher = upper)
  yBottom: number; // PDF user-space y where the next question starts; may be -Infinity
}

export interface LoadedPdf {
  numPages: number;
  extractItems: () => Promise<PdfTextItem[]>;
  extractHighlights: () => Promise<PdfHighlight[]>;
  cropRegion: (region: QuestionRegion, opts?: CropOptions) => Promise<Blob>;
  destroy: () => void;
}

interface CropOptions {
  /** Render scale; higher = crisper crop, larger file. */
  scale?: number;
  /** Extra vertical pixels kept above/below the region. */
  padding?: number;
}

/**
 * A highlight band must be tall enough to cover a text line but not a whole
 * block, and wide enough to span an option: this rules out rules, underlines,
 * table borders and full-page background fills.
 */
const HIGHLIGHT_MIN_HEIGHT = 6;
const HIGHLIGHT_MAX_HEIGHT = 40;
const HIGHLIGHT_MIN_WIDTH = 30;

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
        const item = raw as { str?: string; transform?: number[]; fontName?: string };
        if (typeof item.str !== 'string' || !item.transform) continue;
        items.push({
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          page: p - 1,
          fontName: item.fontName,
        });
      }
    }
    return items;
  };

  /**
   * Collects the coloured bands the PDF paints behind the correct option. They
   * live in the page content stream (not as annotations), so the operator list
   * is walked while tracking the CTM and the current fill colour.
   */
  const extractHighlights = async (): Promise<PdfHighlight[]> => {
    const { OPS } = pdfjs;
    const fillOps = new Set<number>([
      OPS.fill,
      OPS.eoFill,
      OPS.fillStroke,
      OPS.eoFillStroke,
      OPS.closeFillStroke,
      OPS.closeEOFillStroke,
    ]);

    const bands: PdfHighlight[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      let opList;
      try {
        opList = await (await doc.getPage(p)).getOperatorList();
      } catch {
        continue; // A page we can't introspect simply contributes no highlights.
      }

      let ctm = IDENTITY;
      let fill: string | null = null;
      const ctmStack: number[][] = [];
      const fillStack: (string | null)[] = [];

      for (let i = 0; i < opList.fnArray.length; i++) {
        const fn = opList.fnArray[i];
        const args = opList.argsArray[i] as unknown[];
        if (fn === OPS.save) {
          ctmStack.push(ctm);
          fillStack.push(fill);
        } else if (fn === OPS.restore) {
          ctm = ctmStack.pop() ?? ctm;
          fill = fillStack.pop() ?? null;
        } else if (fn === OPS.transform) {
          ctm = multiplyMatrix(ctm, args as number[]);
        } else if (fn === OPS.setFillRGBColor) {
          fill = typeof args[0] === 'string' ? args[0] : null;
        } else if (fn === OPS.constructPath && fillOps.has(args[0] as number)) {
          const band = toHighlightBand(args[2], ctm, fill, p - 1);
          if (band) bands.push(band);
        }
      }
    }
    return bands;
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
    extractHighlights,
    cropRegion,
    destroy: () => {
      // Fire-and-forget: teardown failures are irrelevant, we just don't want an unhandled rejection.
      loadingTask.destroy().catch(() => {});
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

const IDENTITY: number[] = [1, 0, 0, 1, 0, 0];

function multiplyMatrix(a: number[], b: number[]): number[] {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

/**
 * A highlighter colour is chromatic and light: text has to stay readable on top
 * of it. This rejects white (used to mask content), greys and black rules.
 */
function isHighlightFill(color: string | null): boolean {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return false;
  const channels = [1, 3, 5].map((at) => parseInt(color.slice(at, at + 2), 16) / 255);
  if (Math.max(...channels) - Math.min(...channels) < 0.06) return false;
  return channels.reduce((sum, c) => sum + c, 0) / 3 > 0.5;
}

/**
 * Turns a filled path's bounding box into a highlight band, or null when its
 * colour or geometry says it isn't one. `minMax` is pdfjs's axis-aligned path
 * bounding box in path space; exam pages are never rotated, so transforming the
 * two opposite corners is enough.
 */
function toHighlightBand(
  minMax: unknown,
  ctm: number[],
  fill: string | null,
  page: number
): PdfHighlight | null {
  if (!isHighlightFill(fill)) return null;
  const box = minMax as ArrayLike<number> | null | undefined;
  if (!box || box.length < 4) return null;
  const [minX, minY, maxX, maxY] = [box[0], box[1], box[2], box[3]];
  if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;

  const x0 = ctm[0] * minX + ctm[2] * minY + ctm[4];
  const y0 = ctm[1] * minX + ctm[3] * minY + ctm[5];
  const x1 = ctm[0] * maxX + ctm[2] * maxY + ctm[4];
  const y1 = ctm[1] * maxX + ctm[3] * maxY + ctm[5];

  const height = Math.abs(y1 - y0);
  if (height < HIGHLIGHT_MIN_HEIGHT || height > HIGHLIGHT_MAX_HEIGHT) return null;
  if (Math.abs(x1 - x0) < HIGHLIGHT_MIN_WIDTH) return null;

  return { page, yTop: Math.max(y0, y1), yBottom: Math.min(y0, y1) };
}
