/**
 * Pure, framework-agnostic parser that turns positioned PDF text items into
 * structured multiple-choice questions. Kept free of any pdfjs import so it can
 * be unit-tested with hand-built fixtures.
 *
 * Assumptions (shared by the admission-test PDFs this targets):
 * - Questions are numbered with a sequential integer, either bare (`1 …`, IMAT)
 *   or punctuated (`1. …` / `1) …`, Italian university papers). Some papers print
 *   the number alone in its own column with the stem on the next line (Selexi);
 *   that reading is a fallback, tried only when the strict one finds nothing.
 * - Each question is followed by options labelled A–E, in order, again either
 *   bare (`A …`) or punctuated (`A) …` / `A. …`).
 * - Page furniture is noise, and is found by repetition rather than hardcoded per
 *   template: by wording (`dropPageFurniture`), by a fixed slot whose wording
 *   changes per section (`dropRunningHeads`), and by counting up one per page
 *   (`dropPageNumbers`). Centred one-off section titles are dropped too.
 * - A numbered line is not always a question: a table of contents and the items of
 *   a matching exercise are numbered in sequence as well, and are told apart by
 *   sitting back to back with no option list between them.
 * - Where the PDF marks the correct option with a coloured highlight, that
 *   highlight decides `correctLetter`.
 */
import { repairMangledText } from './textRecovery';
import { stripWatermarkItems } from './watermark';

/** A single positioned text run as extracted from a PDF page. */
export interface PdfTextItem {
  str: string;
  x: number; // PDF user-space x (transform[4])
  y: number; // PDF user-space y (transform[5]); origin bottom-left, grows upward
  page: number; // 0-based page index
  /** pdfjs font id, used to repair fonts with an unusable ToUnicode map. */
  fontName?: string;
}

/**
 * A filled, coloured rectangle from the page content: how exam PDFs distributed
 * "with answers" mark the correct option.
 */
export interface PdfHighlight {
  page: number; // 0-based page index
  yTop: number; // PDF user-space y of the band's upper edge
  yBottom: number; // PDF user-space y of the band's lower edge
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
  /** The PDF highlighted this option, i.e. marked it as the correct one. */
  highlighted?: boolean;
}

export interface ParsedQuestion {
  /** Sequential number as printed in the PDF (1-based). */
  number: number;
  /**
   * `OPEN_TEXT` for the option-less questions of a completion section; the import
   * creates those as open answers instead of empty multiple-choice rows.
   */
  type: 'SINGLE_CHOICE' | 'OPEN_TEXT';
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
 * Question marker: `1`, `1.` or `1)`. A separator must be followed by whitespace
 * or a non-digit, so a thousands-separated amount inside a stem ("15.000 €")
 * can never be mistaken for the start of question 15.
 */
const QUESTION_MARKER = /^(\d{1,3})(?:[.)]?[ \t]+|[.)](?=[^\d\s]))(\S.*)$/;

/**
 * Question number printed alone in its own column, with the stem on the next line.
 * Safe to accept only because page numbers are removed as furniture first.
 */
const BARE_QUESTION_MARKER = /^(\d{1,3})[.)]?$/;

/**
 * Numbered *section* head: "1 - Comprensione del Testo". It satisfies
 * `QUESTION_MARKER`, but no question stem opens with a dash, and reading these as
 * questions is how a running head became "question 1" of the paper.
 */
const SECTION_HEAD = /^\d{1,3}\s*[-–—]\s/;

/** Option marker: `A`, `A)`, `A.` or `A:` — every style seen in these papers. */
const ANSWER_MARKER = /^([A-E])(?:[).:]?[ \t]+|[).:](?=\S))(\S.*)$/;

/** Whether a line opens a question, as opposed to a section head that looks like one. */
function isQuestionMarkerLine(text: string): boolean {
  return QUESTION_MARKER.test(text) && !SECTION_HEAD.test(text);
}

/**
 * Lines matching any of these are treated as page furniture and removed before
 * parsing. Repeated headers/footers are detected dynamically (see
 * `dropPageFurniture`), so this list only covers shapes repetition can't catch.
 */
export const DEFAULT_NOISE_PATTERNS: RegExp[] = [
  /^ministero/i,
  /\bMIUR\b/i,
  /\bIMAT\b/i,
  /admission test/i,
  /^academic year/i,
  /general knowledge/i,
  /logical reasoning/i,
  /^[*_=]{3,}/, // decorative rules, e.g. "***** FINE DELLE DOMANDE *****"
  /^pag(?:ina)?\.?\s*\d+(?:\s*(?:\/|di)\s*\d+)?$/i,
  // Per-question tracking code printed in the right margin ("S00025"): it sits above
  // the question number, so left in it would be glued onto the previous option.
  /^[A-Z]{1,4}\d{4,}$/,
  /^\s*$/,
];

/** Header/footer candidates live within this many lines of a page edge. */
const FURNITURE_EDGE_LINES = 2;
const FURNITURE_MIN_PAGES = 3;
const FURNITURE_MIN_PAGE_RATIO = 0.4;
/** Rounding (PDF units) when deciding that two lines occupy the same slot. */
const SLOT_TOLERANCE = 2;
/** How far right of the body margin a line must sit to read as centred. */
const HEADING_MIN_INDENT = 25;
const HEADING_MIN_LENGTH = 4;
const HEADING_MAX_LENGTH = 90;
/** Slack (PDF units) when testing whether a baseline falls inside a highlight. */
const HIGHLIGHT_SLACK = 1;
/**
 * How close the next entry of a numbered list must follow. Entries sit back to back,
 * allowing for one wrapped line; a question is separated from the next number by its
 * own option list.
 */
const LIST_LOOKAHEAD_LINES = 3;
/** Below this, the strict reading is treated as having failed to find the paper. */
const MIN_STRICT_QUESTIONS = 3;
/**
 * How far left of its own marker a line may still sit and count as part of the
 * question. Wrapped option text is normally indented further right; only genuinely
 * out-of-block material (a new reading passage at the page margin) goes further left.
 */
const BODY_LEFT_SLACK = 12;

interface ParseOptions {
  noisePatterns?: RegExp[];
  /** Max vertical delta (in PDF units) to treat items as the same line. */
  lineTolerance?: number;
  /** Coloured bands marking the correct option, if the PDF has any. */
  highlights?: PdfHighlight[];
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

function groupLinesByPage(lines: PdfLine[]): Map<number, PdfLine[]> {
  const byPage = new Map<number, PdfLine[]>();
  for (const line of lines) {
    const bucket = byPage.get(line.page);
    if (bucket) bucket.push(line);
    else byPage.set(line.page, [line]);
  }
  return byPage;
}

/**
 * Header/footer candidates: the outermost lines of a page, minus anything that
 * carries a question or option marker. Without that exclusion a paper whose
 * questions share a wording template ("Domanda 1?", "Domanda 2?") would see them
 * collapse to one furniture key once the digits are stripped.
 */
function edgeLines(pageLines: PdfLine[]): PdfLine[] {
  return [
    ...pageLines.slice(0, FURNITURE_EDGE_LINES),
    ...pageLines.slice(-FURNITURE_EDGE_LINES),
  ].filter((l) => !isQuestionMarkerLine(l.text) && !ANSWER_MARKER.test(l.text));
}

/** Page numbers differ per page, so furniture is compared without its digits. */
function furnitureKey(text: string): string {
  return text.replace(/\d+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

const slotKey = (line: PdfLine) =>
  `${Math.round(line.x / SLOT_TOLERANCE)}:${Math.round(line.y / SLOT_TOLERANCE)}`;

/**
 * Running heads that repeat by *position* rather than by wording: a section head
 * like "1 - Comprensione del Testo", which becomes "2 - …" in the next section.
 *
 * Text-based detection misses them twice over. They read as question markers (so
 * they were deliberately excluded from that pass), and no single wording covers
 * enough pages of a sectioned paper to clear the ratio. What they do share is a
 * fixed slot, occupied on nearly every page, saying nearly the same thing.
 *
 * Purely numeric lines are left alone here: some papers print the question number
 * in its own column at the top of the page, which occupies just such a slot.
 * `dropPageNumbers` deals with the numeric case on its own terms.
 */
function dropRunningHeads(lines: PdfLine[]): PdfLine[] {
  const byPage = groupLinesByPage(lines);
  if (byPage.size < FURNITURE_MIN_PAGES) return lines;

  const eligible = (line: PdfLine) => furnitureKey(line.text).length >= HEADING_MIN_LENGTH;

  const slots = new Map<string, { pages: Set<number>; texts: Set<string> }>();
  for (const [page, pageLines] of byPage) {
    for (const line of edgeLines(pageLines)) {
      if (!eligible(line)) continue;
      const key = slotKey(line);
      const slot = slots.get(key);
      if (slot) {
        slot.pages.add(page);
        slot.texts.add(furnitureKey(line.text));
      } else {
        slots.set(key, { pages: new Set([page]), texts: new Set([furnitureKey(line.text)]) });
      }
    }
  }

  const minPages = Math.max(FURNITURE_MIN_PAGES, byPage.size * FURNITURE_MIN_PAGE_RATIO);
  // Recurring position alone is not enough: a question often opens at the top of a
  // page, so the first line shares its slot across most pages. What marks a running
  // head is that the slot says almost the same thing every time — one wording per
  // section — whereas a question column carries a different sentence on every page.
  const maxDistinct = (pageCount: number) => Math.max(2, Math.floor(pageCount / 5));
  const headSlots = new Set(
    [...slots.entries()]
      .filter(
        ([, slot]) =>
          slot.pages.size >= minPages && slot.texts.size <= maxDistinct(slot.pages.size)
      )
      .map(([key]) => key)
  );
  if (headSlots.size === 0) return lines;

  const doomed = new Set<PdfLine>();
  for (const pageLines of byPage.values()) {
    for (const line of edgeLines(pageLines)) {
      if (eligible(line) && headSlots.has(slotKey(line))) doomed.add(line);
    }
  }
  return lines.filter((line) => !doomed.has(line));
}

/**
 * Drops the printed page number: a numeric line in a fixed slot whose value goes up
 * by one from page to page.
 *
 * The arithmetic is the whole point. A paper that prints the question number alone
 * in a column at the top of each page puts a numeric line in just such a slot, but
 * those values climb by however many questions fit on a page — never by exactly one.
 * Left in, a page number is glued onto the option it follows, and it would also be
 * indistinguishable from a question marker once bare numbers are allowed.
 */
function dropPageNumbers(lines: PdfLine[]): PdfLine[] {
  const byPage = groupLinesByPage(lines);
  if (byPage.size < FURNITURE_MIN_PAGES) return lines;

  const numeric = new Map<number, Map<number, PdfLine>>();
  for (const [page, pageLines] of byPage) {
    for (const line of edgeLines(pageLines)) {
      if (!/^\d{1,4}$/.test(line.text)) continue;
      // Keyed by the vertical band alone: a centred page number shifts sideways when
      // it grows a digit, so "9" and "10" would otherwise land in different slots and
      // each fall short of the page count on its own.
      const band = Math.round(line.y / SLOT_TOLERANCE);
      const slot = numeric.get(band);
      if (slot) slot.set(page, line);
      else numeric.set(band, new Map([[page, line]]));
    }
  }

  const minPages = Math.max(FURNITURE_MIN_PAGES, byPage.size * FURNITURE_MIN_PAGE_RATIO);
  const doomed = new Set<PdfLine>();
  for (const slot of numeric.values()) {
    if (slot.size < minPages) continue;
    const entries = [...slot.entries()].sort((a, b) => a[0] - b[0]);
    // Same offset between the page index and the printed number on every page
    const offsets = new Set(entries.map(([page, line]) => Number(line.text) - page));
    if (offsets.size === 1) for (const [, line] of entries) doomed.add(line);
  }
  if (doomed.size === 0) return lines;
  return lines.filter((line) => !doomed.has(line));
}

/**
 * Drops repeated headers/footers by detecting the repetition itself, so a new
 * exam template needs no new noise pattern. Only lines near a page edge are
 * eligible, which keeps a body line that happens to repeat from being removed.
 */
function dropPageFurniture(lines: PdfLine[]): PdfLine[] {
  const byPage = groupLinesByPage(lines);
  const pagesPerKey = new Map<string, Set<number>>();
  for (const [page, pageLines] of byPage) {
    for (const line of edgeLines(pageLines)) {
      const key = furnitureKey(line.text);
      if (key.length < 3) continue;
      const seen = pagesPerKey.get(key);
      if (seen) seen.add(page);
      else pagesPerKey.set(key, new Set([page]));
    }
  }

  const minPages = Math.max(FURNITURE_MIN_PAGES, byPage.size * FURNITURE_MIN_PAGE_RATIO);
  const furniture = new Set<string>();
  for (const [key, pages] of pagesPerKey) {
    if (pages.size >= minPages) furniture.add(key);
  }
  if (furniture.size === 0) return lines;

  const doomed = new Set<PdfLine>();
  for (const pageLines of byPage.values()) {
    for (const line of edgeLines(pageLines)) {
      if (furniture.has(furnitureKey(line.text))) doomed.add(line);
    }
  }
  return lines.filter((line) => !doomed.has(line));
}

/** The stem of a question, as printed on its marker line. */
interface QuestionStart {
  number: number;
  text: string;
}

/** Reads a line as a question marker, whatever the layout puts after the number. */
function readQuestionMarker(
  text: string,
  allowBareNumbers: boolean
): { number: number; text: string } | null {
  const inline = isQuestionMarkerLine(text) ? text.match(QUESTION_MARKER) : null;
  if (inline) return { number: Number(inline[1]), text: inline[2] ?? '' };
  // Some papers (Selexi) print the number alone in its own column and start the
  // stem on the next line, so the stem is picked up as a continuation. Only tried
  // when the strict reading found nothing: a lone number is far too common in
  // these papers (a numeric option, a superscript split off its unit, a figure
  // label) to be trusted while a well-formed alternative exists.
  if (!allowBareNumbers) return null;
  const bare = text.match(BARE_QUESTION_MARKER);
  if (bare) return { number: Number(bare[1]), text: '' };
  return null;
}

/**
 * Does an option list open shortly after `from`? That is the invariant separating a
 * real question from a number that merely opens a line: a table of contents entry
 * ("1 Comprensione del Testo 3") is followed by more entries, never by options.
 *
 * Both A and B are required, in that order. A single "A" is not enough — prose
 * supplies those by accident ("A Tebe c'è stata una guerra"), and one such line in
 * a reading passage would be enough to certify a contents entry as question 1.
 */
function looksLikeNumberedList(
  lines: PdfLine[],
  candidates: ({ number: number } | null)[],
  from: number
): boolean {
  const number = candidates[from]!.number;
  const until = Math.min(lines.length, from + 1 + LIST_LOOKAHEAD_LINES);
  for (let i = from + 1; i < until; i++) {
    // Options reached first: this is a question, and its own list can wait.
    if (ANSWER_MARKER.test(lines[i].text)) return false;
    if (candidates[i]?.number === number + 1) return true;
  }
  return false;
}

/**
 * Locates the real question markers by walking the expected numbering. Tracking
 * the sequence is what separates a marker from a number that merely opens a line
 * — a table row ("12 noon - 2pm 35") or an enumerated statement ("1 glycogen").
 *
 * Each candidate must also be followed by an option list before the next
 * candidate, which is what stops a numbered table of contents from being read as
 * the first questions of the paper (and pushing the real ones out of sequence).
 */
function findQuestionStarts(
  lines: PdfLine[],
  allowBareNumbers = false
): Map<PdfLine, QuestionStart> {
  const candidates = lines.map((line) => readQuestionMarker(line.text, allowBareNumbers));
  const starts = new Map<PdfLine, QuestionStart>();

  let expected = 1;
  let cursor = 0;
  while (cursor < lines.length) {
    const matching: number[] = [];
    for (let i = cursor; i < lines.length; i++) {
      if (candidates[i]?.number === expected) matching.push(i);
    }
    if (matching.length === 0) break;

    // Skip candidates that are really entries of a numbered list — a table of
    // contents, or the items of a matching exercise — and take the next line
    // bearing the same number. When every candidate looks like a list entry, take
    // the first anyway: a layout this check misreads must cost one question, not
    // every question after it.
    const at =
      matching.find((index) => !looksLikeNumberedList(lines, candidates, index)) ?? matching[0];

    starts.set(lines[at], { number: expected, text: candidates[at]!.text });
    expected += 1;
    cursor = at + 1;
  }

  return starts;
}

/**
 * Drops centred one-off lines that sit immediately before a question
 * ("Test di Biologia", "General Knowledge and Logical Reasoning"). Without this
 * they get glued onto the last option of the preceding question. Centred lines
 * *inside* a question — a passage attribution, a table row — are kept, because
 * what follows them is not a new question; so is anything carrying sentence
 * punctuation or too short to be a title, which is how the right-hand wrapped
 * option text of some IMAT layouts survives.
 */
function dropSectionHeadings(
  lines: PdfLine[],
  questionStarts: Map<PdfLine, QuestionStart>
): PdfLine[] {
  if (lines.length === 0) return lines;
  let bodyX = Infinity;
  for (const line of lines) bodyX = Math.min(bodyX, line.x);

  return lines.filter((line, index) => {
    if (line.x < bodyX + HEADING_MIN_INDENT) return true;
    if (line.text.length < HEADING_MIN_LENGTH) return true;
    if (line.text.length > HEADING_MAX_LENGTH) return true;
    if (/[.,;:!?]$/.test(line.text)) return true; // prose, not a title
    if (questionStarts.has(line) || ANSWER_MARKER.test(line.text)) return true;
    const next = lines[index + 1];
    // The last line of the document opens nothing, so it cannot be a section heading.
    // Reading a missing successor as "followed by a question" dropped it every time —
    // silently eating the wrapped tail of the last option in a centred layout.
    if (next === undefined) return true;
    return !questionStarts.has(next);
  });
}

/** Builds a predicate telling whether a line's baseline falls inside a highlight. */
function highlightMatcher(highlights: PdfHighlight[]): (line: PdfLine) => boolean {
  if (highlights.length === 0) return () => false;
  const byPage = new Map<number, PdfHighlight[]>();
  for (const band of highlights) {
    const bucket = byPage.get(band.page);
    if (bucket) bucket.push(band);
    else byPage.set(band.page, [band]);
  }
  return (line) =>
    (byPage.get(line.page) ?? []).some(
      (band) => line.y >= band.yBottom - HIGHLIGHT_SLACK && line.y <= band.yTop
    );
}

const missingAnswersReason = (count: number) => `Trovate ${count} risposte invece di 5`;
const UNMARKED_ANSWER_REASON = 'Risposta corretta non evidenziata nel PDF';

/**
 * Heading that opens a section of written-answer questions, e.g. BIOLOGIA's
 * "DOMANDE A RISPOSTA CON MODALITÀ A COMPLETAMENTO".
 */
const COMPLETION_HEADING = /(completamento|risposta aperta|risposte aperte|open[- ]ended)/i;

/**
 * Where a written-answer section begins, if the paper announces one.
 *
 * The announcement is the only trustworthy signal. Judging by structure alone —
 * "two option-less questions in a row" — misreads two adjacent questions whose
 * option layout simply defeated the parser, and clearing their warning is worse
 * than leaving them flagged: nobody would know to look at them.
 */
function findCompletionSectionStart(lines: PdfLine[]): PdfLine | null {
  for (const line of lines) {
    if (line.text.length > HEADING_MAX_LENGTH) continue;
    if (isQuestionMarkerLine(line.text) || ANSWER_MARKER.test(line.text)) continue;
    if (COMPLETION_HEADING.test(line.text)) return line;
  }
  return null;
}

/** Whether `question` starts after `heading` in reading order. */
function startsAfter(question: ParsedQuestion, heading: PdfLine): boolean {
  const { page, yTop } = question.region;
  return page > heading.page || (page === heading.page && yTop < heading.y);
}

/**
 * Relabels the option-less questions of a completion section as open answers.
 *
 * Reported as multiple-choice they reach the import as empty rows flagged
 * "0 risposte invece di 5", when nothing is missing — the exam asks for a written
 * answer. Questions that kept some options are never touched, and a paper that
 * announces no such section keeps every warning it had.
 */
function markOpenAnswerSection(questions: ParsedQuestion[], heading: PdfLine | null): void {
  if (!heading) return;
  for (const question of questions) {
    if (question.answers.length > 0 || !startsAfter(question, heading)) continue;
    question.type = 'OPEN_TEXT';
    question.suspiciousReasons = question.suspiciousReasons.filter(
      (reason) => reason !== missingAnswersReason(0) && reason !== UNMARKED_ANSWER_REASON
    );
    question.suspicious = question.suspiciousReasons.length > 0;
  }
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
  const highlights = options.highlights ?? [];
  const isHighlighted = highlightMatcher(highlights);
  // Watermarks are stripped per item, before lines are assembled: a tiled stamp
  // lands between the words of a line, so removing it afterwards is impossible.
  const denoised = dropPageNumbers(
    dropRunningHeads(
      dropPageFurniture(
        assembleLines(
          repairMangledText(stripWatermarkItems(items)),
          options.lineTolerance
        ).filter((l) => !isNoiseLine(l.text, patterns))
      )
    )
  );
  // Strict reading first; the bare-number layout is a fallback, not an alternative
  // worth weighing, so it is only consulted when the strict one comes up empty.
  let questionStarts = findQuestionStarts(denoised);
  if (questionStarts.size < MIN_STRICT_QUESTIONS) {
    const relaxed = findQuestionStarts(denoised, true);
    if (relaxed.size > questionStarts.size) questionStarts = relaxed;
  }
  const lines = dropSectionHeadings(denoised, questionStarts);

  const questions: ParsedQuestion[] = [];
  let expectedLetterIdx = 0;
  let current: ParsedQuestion | null = null;
  let markerX = 0;
  let lastLinePage = -1;

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
      current.suspiciousReasons.push(missingAnswersReason(current.answers.length));
    }
    if (looksTabular(current.text)) {
      current.suspiciousReasons.push('Possibile tabella o figura nel testo');
    }
    if (!current.text) {
      current.suspiciousReasons.push('Testo della domanda vuoto');
    }
    // Only trust the highlight when exactly one option carries it: a PDF that
    // shades whole blocks would otherwise silently pick the wrong answer.
    if (highlights.length > 0) {
      const marked = current.answers.filter((a) => a.highlighted);
      if (marked.length === 1) current.correctLetter = marked[0].label;
      else
        current.suspiciousReasons.push(
          marked.length === 0 ? UNMARKED_ANSWER_REASON : 'Più risposte evidenziate nel PDF'
        );
    }
    current.suspicious = current.suspiciousReasons.length > 0;
    questions.push(current);
  };

  for (const line of lines) {
    const start = questionStarts.get(line);
    if (start) {
      finalize(line.y, line.page);
      current = {
        number: start.number,
        type: 'SINGLE_CHOICE',
        text: start.text,
        answers: [],
        correctLetter: 'A',
        suspicious: false,
        suspiciousReasons: [],
        region: { page: line.page, yTop: line.y, yBottom: -Infinity },
      };
      markerX = line.x;
      lastLinePage = line.page;
      expectedLetterIdx = 0;
      continue;
    }

    if (!current) continue;

    const answerMatch = line.text.match(ANSWER_MARKER);
    const expectedLetter = ANSWER_LETTERS[expectedLetterIdx];
    if (answerMatch && answerMatch[1] === expectedLetter) {
      current.answers.push({
        label: expectedLetter,
        text: answerMatch[2] ?? '',
        highlighted: isHighlighted(line),
      });
      expectedLetterIdx += 1;
      lastLinePage = line.page;
      continue;
    }

    // Once the option list is complete, anything that follows is only a wrapped
    // option if it is still on the same page and no further left than the question's
    // own column. In a reading-comprehension paper what follows is the next passage —
    // title, attribution and several pages of prose — and it used to be swallowed
    // whole by the last option of the question above.
    if (
      current.answers.length === ANSWER_LETTERS.length &&
      (line.page !== lastLinePage || line.x < markerX - BODY_LEFT_SLACK)
    ) {
      continue;
    }
    lastLinePage = line.page;

    // Continuation line: belongs to the last answer, or to the question stem.
    if (current.answers.length > 0) {
      const last = current.answers[current.answers.length - 1];
      last.text = `${last.text} ${line.text}`.trim();
      // A wrapped option is highlighted band-by-band, so any of its lines counts.
      last.highlighted = last.highlighted || isHighlighted(line);
    } else {
      current.text = `${current.text} ${line.text}`.trim();
    }
  }

  finalize(null, null);
  // Read from `denoised`: the heading is a centred one-off, so `dropSectionHeadings`
  // has already removed it from the lines the loop above walked.
  markOpenAnswerSection(questions, findCompletionSectionStart(denoised));
  return questions;
}
