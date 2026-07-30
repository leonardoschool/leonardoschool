/**
 * Pure transforms turning parsed PDF questions into the editable rows the
 * import UI works with. Kept DOM-free so it can be unit-tested.
 */
import type { ParsedQuestion } from './parseQuestions';
import type { QuestionRegion } from './pdfClient';
import type {
  QuestionType,
  QuestionLanguage,
  DifficultyLevel,
} from '@/lib/validations/questionValidation';

export type ImportItemStatus = 'pending' | 'saving' | 'saved' | 'error';

export interface PdfImportAnswer {
  label: string;
  text: string;
  isCorrect: boolean;
  explanation: string;
}

export interface PdfImportItem {
  localId: string;
  number: number;
  type: QuestionType;
  language: QuestionLanguage;
  text: string;
  answers: PdfImportAnswer[];
  subjectId: string;
  topicId: string;
  tagIds: string[];
  difficulty: DifficultyLevel;
  /** Shuffle answer order during the test — on by default, per the form. */
  shuffleAnswers: boolean;
  imageUrl: string;
  year: number | null;
  source: string;
  description: string;
  correctExplanation: string;
  wrongExplanation: string;
  generalExplanation: string;
  suspicious: boolean;
  suspiciousReasons: string[];
  /** Exact-text match against an already-stored question. */
  isDuplicate: boolean;
  /** User opted this row out of the import. */
  excluded: boolean;
  region: QuestionRegion;
  /** Page crop generated for suspicious rows (table/figure), if any. */
  cropBlob: Blob | null;
  cropPreviewUrl: string | null;
  /** Firebase URL once the crop has been uploaded during save. */
  savedImageUrl: string | null;
  status: ImportItemStatus;
  error: string | null;
}

export interface ImportDefaults {
  difficulty?: DifficultyLevel;
  language?: QuestionLanguage;
  year: number | null;
  source: string;
}

/** Derives a sensible default year/source from the uploaded file name. */
export function guessMetadata(fileName: string): { year: number | null; source: string } {
  const base = fileName.replace(/\.[^./\\]+$/, '').trim();
  const yearMatch = base.match(/(19|20)\d{2}/);
  const year = yearMatch ? Number(yearMatch[0]) : null;
  // Split camelCase / joined words for a readable source, e.g. "CompitoInglese2011".
  const source = base
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { year, source };
}

export function buildImportItems(
  parsed: ParsedQuestion[],
  defaults: ImportDefaults
): PdfImportItem[] {
  return parsed.map((q, index) => ({
    localId: `pdf-${q.number}-${index}`,
    number: q.number,
    // Honour the parser: a completion section carries no options, and forcing those
    // rows to SINGLE_CHOICE is what made them arrive as empty multiple-choice questions.
    type: q.type as QuestionType,
    language: defaults.language ?? 'IT',
    text: q.text,
    answers: q.answers.map((a) => ({
      label: a.label,
      text: a.text,
      isCorrect: a.label === q.correctLetter,
      explanation: '',
    })),
    subjectId: '',
    topicId: '',
    tagIds: [],
    difficulty: defaults.difficulty ?? 'MEDIUM',
    shuffleAnswers: true,
    imageUrl: '',
    year: defaults.year,
    source: defaults.source,
    description: '',
    correctExplanation: '',
    wrongExplanation: '',
    generalExplanation: '',
    suspicious: q.suspicious,
    suspiciousReasons: q.suspiciousReasons,
    isDuplicate: false,
    excluded: false,
    region: q.region,
    cropBlob: null,
    cropPreviewUrl: null,
    savedImageUrl: null,
    status: 'pending' as const,
    error: null,
  }));
}

/** Whether a row carries everything required to be PUBLISHED (not just drafted). */
export function isPublishable(item: PdfImportItem): boolean {
  if (!item.subjectId || !item.topicId || item.text.trim().length === 0) return false;
  if (item.type === 'OPEN_TEXT') return true;
  const filledAnswers = item.answers.filter((a) => a.text.trim().length > 0);
  const correctCount = filledAnswers.filter((a) => a.isCorrect).length;
  if (filledAnswers.length < 2) return false;
  if (item.type === 'SINGLE_CHOICE') return correctCount === 1;
  return correctCount >= 1; // MULTIPLE_CHOICE
}
