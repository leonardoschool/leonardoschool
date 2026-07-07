/**
 * Pure, framework-agnostic parser that turns positioned PDF text items into
 * structured multiple-choice questions. Kept free of any pdfjs import so it can
 * be unit-tested with hand-built fixtures.
 *
 * Assumptions (shared by the IMAT-style admission-test PDFs this targets):
 * - Questions are numbered with a sequential integer (1, 2, 3, ...).
 * - Each question is followed by options labelled A–E, in order.
 * - Repeated header/footer lines (ministry heading, "IMAT ... MIUR ...", page
 *   numbers, section titles) are noise and must be dropped.
 */

/** A single positioned text run as extracted from a PDF page. */
export interface PdfTextItem {
  str: string;
  x: number; // PDF user-space x (transform[4])
  y: number; // PDF user-space y (transform[5]); origin bottom-left, grows upward
  page: number; // 0-based page index
}

/** A visual line: text items sharing (approximately) the same baseline. */
export interface PdfLine {
  page: number;
  y: number;
  x: number;
  text: string;
}

export interface ParsedAnswer {
  label: string; // 'A'..'E'
  text: string;
}

export interface ParsedQuestion {
  /** Sequential number as printed in the PDF (1-based). */
  number: number;
  text: string;
  answers: ParsedAnswer[];
  /** Default correct option; caller may override. */
  correctLetter: string;
  /** True when the extraction looks unreliable and needs human review. */
  suspicious: boolean;
  /** Human-readable reasons for the suspicious flag (Italian, UI-facing). */
  suspiciousReasons: string[];
  /** Page region enclosing the question, for optional image cropping. */
  region: { page: number; yTop: number; yBottom: number };
}

const ANSWER_LETTERS = ['A', 'B', 'C', 'D', 'E'];

/**
 * Lines matching any of these are treated as repeated page furniture and
 * removed before parsing. Extend this list as new fixed templates appear.
 */
export const DEFAULT_NOISE_PATTERNS: RegExp[] = [
  /^ministero/i,
  /\bMIUR\b/i,
  /\bIMAT\b/i,
  /admission test/i,
  /^academic year/i,
  /general knowledge/i,
  /logical reasoning/i,
  /^\s*$/,
];

interface ParseOptions {
  noisePatterns?: RegExp[];
  /** Max vertical delta (in PDF units) to treat items as the same line. */
  lineTolerance?: number;
}

/** Groups positioned items into top-to-bottom, left-to-right visual lines. */
export function assembleLines(
  items: PdfTextItem[],
  lineTolerance = 3
): PdfLine[] {
  const byPage = new Map<number, PdfTextItem[]>();
  for (const item of items) {
    if (!item.str) continue;
    const bucket = byPage.get(item.page);
    if (bucket) bucket.push(item);
    else byPage.set(item.page, [item]);
  }

  const lines: PdfLine[] = [];
  const pages = [...byPage.keys()].sort((a, b) => a - b);

  for (const page of pages) {
    const pageItems = byPage.get(page)!.slice().sort((a, b) => b.y - a.y || a.x - b.x);
    let current: PdfTextItem[] = [];
    let currentY: number | null = null;

    const flush = () => {
      if (!current.length) return;
      const ordered = current.slice().sort((a, b) => a.x - b.x);
      lines.push({
        page,
        y: currentY!,
        x: ordered[0].x,
        text: joinLineItems(ordered),
      });
      current = [];
    };

    for (const item of pageItems) {
      if (currentY === null || Math.abs(item.y - currentY) <= lineTolerance) {
        current.push(item);
        currentY = currentY === null ? item.y : currentY;
      } else {
        flush();
        current.push(item);
        currentY = item.y;
      }
    }
    flush();
  }

  return lines;
}

/** Joins line items, inserting a space only where the gap warrants one. */
function joinLineItems(ordered: PdfTextItem[]): string {
  let text = '';
  for (let i = 0; i < ordered.length; i++) {
    const chunk = ordered[i].str;
    if (i === 0) {
      text = chunk;
      continue;
    }
    const needsSpace = !text.endsWith(' ') && !chunk.startsWith(' ');
    text += needsSpace ? ` ${chunk}` : chunk;
  }
  return text.replace(/\s+/g, ' ').trim();
}

export function isNoiseLine(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

/**
 * Detects table/figure/list content that a flat text extraction mangles.
 * Deliberately conservative: plain arithmetic stems (which merely contain
 * several numbers) must NOT trip this, or half the exam gets flagged. Only
 * explicit visual-content keywords and flattened enumerated lists count.
 */
function looksTabular(text: string): boolean {
  if (
    /\b(table|graph|diagram|figure|chart|grid|histogram|tabella|grafico|figura|diagramma|istogramma)\b/i.test(
      text
    )
  ) {
    return true;
  }
  // Flattened multi-statement lists ("1 statement ... 2 statement ...") merged
  // into one line. Require a real word after the digit so multiplications like
  // "6 x 1c" don't register as list markers.
  const enumMarkers = text.match(/(?:^|\s)[1-6]\s+[A-Za-z]{2,}/g)?.length ?? 0;
  return enumMarkers >= 3;
}

/**
 * Parses questions out of positioned PDF text items.
 * The core loop tracks the next expected question number and the next expected
 * option letter, which disambiguates real markers from numbers/letters that
 * merely start a sentence.
 */
export function parseQuestions(
  items: PdfTextItem[],
  options: ParseOptions = {}
): ParsedQuestion[] {
  const patterns = options.noisePatterns ?? DEFAULT_NOISE_PATTERNS;
  const lines = assembleLines(items, options.lineTolerance).filter(
    (l) => !isNoiseLine(l.text, patterns)
  );

  const questions: ParsedQuestion[] = [];
  let expectedNumber = 1;
  let expectedLetterIdx = 0;
  let current: ParsedQuestion | null = null;

  const finalize = (nextTopY: number | null, nextPage: number | null) => {
    if (!current) return;
    // Only bound the crop by the next question when it lives on the same page;
    // otherwise leave -Infinity so the cropper falls back to the page bottom.
    if (nextTopY !== null && nextPage === current.region.page) {
      current.region.yBottom = nextTopY;
    }
    current.text = current.text.trim();
    current.suspicious = false;
    current.suspiciousReasons = [];
    if (current.answers.length !== ANSWER_LETTERS.length) {
      current.suspiciousReasons.push(
        `Trovate ${current.answers.length} risposte invece di 5`
      );
    }
    if (looksTabular(current.text)) {
      current.suspiciousReasons.push('Possibile tabella o figura nel testo');
    }
    if (!current.text) {
      current.suspiciousReasons.push('Testo della domanda vuoto');
    }
    current.suspicious = current.suspiciousReasons.length > 0;
    questions.push(current);
  };

  for (const line of lines) {
    // `\S.*` (not `.*`) keeps the separator `\s+` and the captured rest as disjoint classes,
    // so there's no overlapping backtracking (sonarjs/slow-regex). The rest is optional to
    // still match a bare number line.
    const questionMatch = line.text.match(/^(\d+)\s+(\S.*)?$/);
    if (questionMatch && Number(questionMatch[1]) === expectedNumber) {
      finalize(line.y, line.page);
      current = {
        number: expectedNumber,
        text: questionMatch[2] ?? '',
        answers: [],
        correctLetter: 'A',
        suspicious: false,
        suspiciousReasons: [],
        region: { page: line.page, yTop: line.y, yBottom: -Infinity },
      };
      expectedNumber += 1;
      expectedLetterIdx = 0;
      continue;
    }

    if (!current) continue;

    const answerMatch = line.text.match(/^([A-E])\s+(\S.*)?$/);
    const expectedLetter = ANSWER_LETTERS[expectedLetterIdx];
    if (answerMatch && answerMatch[1] === expectedLetter) {
      current.answers.push({ label: expectedLetter, text: answerMatch[2] ?? '' });
      expectedLetterIdx += 1;
      continue;
    }

    // Continuation line: belongs to the last answer, or to the question stem.
    if (current.answers.length > 0) {
      const last = current.answers[current.answers.length - 1];
      last.text = `${last.text} ${line.text}`.trim();
    } else {
      current.text = `${current.text} ${line.text}`.trim();
    }
  }

  finalize(null, null);
  return questions;
}
