'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { firebaseStorage } from '@/lib/firebase/storage';
import { normalizeQuestionText } from '@/lib/utils/questionText';
import { loadPdf, type LoadedPdf } from '@/lib/pdf/pdfClient';
import { parseQuestions } from '@/lib/pdf/parseQuestions';
import {
  buildImportItems,
  guessMetadata,
  isPublishable,
  type PdfImportItem,
} from '@/lib/pdf/buildImportItems';

export type ImportPhase = 'idle' | 'extracting' | 'ready' | 'saving';

type CreateQuestionFn = ReturnType<
  typeof trpc.questions.createQuestion.useMutation
>['mutateAsync'];
type ReplaceTagsFn = ReturnType<
  typeof trpc.questionTags.replaceQuestionTags.useMutation
>['mutateAsync'];

interface SaveDeps {
  createQuestion: CreateQuestionFn;
  replaceTags: ReplaceTagsFn;
}

/** Persists a single row, uploading its crop first if one is attached. */
async function saveItem(
  item: PdfImportItem,
  mode: 'DRAFT' | 'PUBLISHED',
  deps: SaveDeps
): Promise<string> {
  let imageUrl = item.imageUrl.trim() || item.savedImageUrl;
  if (!imageUrl && item.cropBlob) {
    const file = new File([item.cropBlob], `${item.localId}.png`, { type: 'image/png' });
    imageUrl = (await firebaseStorage.uploadQuestionImage(file)).url;
  }

  const status = mode === 'PUBLISHED' && isPublishable(item) ? 'PUBLISHED' : 'DRAFT';
  const filledAnswers = item.answers.filter((a) => a.text.trim().length > 0);

  const created = await deps.createQuestion({
    type: item.type,
    status,
    language: item.language,
    text: item.text.trim(),
    subjectId: item.subjectId || null,
    topicId: item.topicId || null,
    difficulty: item.difficulty,
    shuffleAnswers: item.shuffleAnswers,
    points: 1,
    negativePoints: 0,
    imageUrl: imageUrl ?? null,
    year: item.year ?? null,
    source: item.source || null,
    description: item.description.trim() || null,
    correctExplanation: item.correctExplanation.trim() || null,
    wrongExplanation: item.wrongExplanation.trim() || null,
    generalExplanation: item.generalExplanation.trim() || null,
    answers:
      item.type === 'OPEN_TEXT'
        ? []
        : filledAnswers.map((a, index) => ({
            text: a.text.trim(),
            isCorrect: a.isCorrect,
            explanation: a.explanation.trim() || null,
            order: index,
            label: a.label,
          })),
    keywords: [],
    tags: [],
  });

  if (created && item.tagIds.length > 0) {
    await deps.replaceTags({ questionId: created.id, tagIds: item.tagIds });
  }
  return status;
}

export function usePdfQuestionImport() {
  const utils = trpc.useUtils();
  const createQuestion = trpc.questions.createQuestion.useMutation().mutateAsync;
  const replaceTags = trpc.questionTags.replaceQuestionTags.useMutation().mutateAsync;
  const checkExisting = trpc.questions.checkExistingTexts.useMutation().mutateAsync;

  const [phase, setPhase] = useState<ImportPhase>('idle');
  const [fileName, setFileName] = useState('');
  const [extractError, setExtractError] = useState<string | null>(null);
  const [items, setItems] = useState<PdfImportItem[]>([]);
  const pdfRef = useRef<LoadedPdf | null>(null);

  const cleanupPdf = useCallback(() => {
    pdfRef.current?.destroy();
    pdfRef.current = null;
    setItems((prev) => {
      prev.forEach((it) => it.cropPreviewUrl && URL.revokeObjectURL(it.cropPreviewUrl));
      return prev;
    });
  }, []);

  useEffect(() => cleanupPdf, [cleanupPdf]);

  const patchItem = useCallback((localId: string, patch: Partial<PdfImportItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.localId === localId ? { ...it, ...patch } : it))
    );
  }, []);

  // Applies the same patch to many rows at once (bulk categorization).
  const patchMany = useCallback((localIds: string[], patch: Partial<PdfImportItem>) => {
    const idSet = new Set(localIds);
    setItems((prev) =>
      prev.map((it) => (idSet.has(it.localId) ? { ...it, ...patch } : it))
    );
  }, []);

  // Renders page crops for the suspicious rows in the background so the list
  // stays responsive while heavy per-page rendering happens.
  const generateCrops = useCallback(async (pdf: LoadedPdf, rows: PdfImportItem[]) => {
    for (const row of rows) {
      if (!row.suspicious) continue;
      try {
        const blob = await pdf.cropRegion(row.region);
        const url = URL.createObjectURL(blob);
        patchItem(row.localId, { cropBlob: blob, cropPreviewUrl: url });
      } catch {
        // A failed crop is non-fatal: the row still carries its extracted text.
      }
    }
  }, [patchItem]);

  const loadFile = useCallback(async (file: File) => {
    cleanupPdf();
    setFileName(file.name);
    setExtractError(null);
    setPhase('extracting');
    setItems([]);
    try {
      const pdf = await loadPdf(file);
      pdfRef.current = pdf;
      const textItems = await pdf.extractItems();
      // Papers distributed "con risposte" mark the correct option with a colour.
      const highlights = await pdf.extractHighlights();
      const parsed = parseQuestions(textItems, { highlights });
      const rows = buildImportItems(parsed, guessMetadata(file.name));

      const { existing } = await checkExisting({
        texts: rows.map((r) => r.text),
      });
      const existingSet = new Set(existing);
      const marked = rows.map((r) => ({
        ...r,
        isDuplicate: existingSet.has(normalizeQuestionText(r.text)),
      }));

      setItems(marked);
      setPhase('ready');
      void generateCrops(pdf, marked);
    } catch (err) {
      setExtractError(
        err instanceof Error ? err.message : 'Impossibile leggere il PDF.'
      );
      setPhase('idle');
    }
  }, [cleanupPdf, checkExisting, generateCrops]);

  const reset = useCallback(() => {
    cleanupPdf();
    setItems([]);
    setFileName('');
    setExtractError(null);
    setPhase('idle');
  }, [cleanupPdf]);

  /** Saves every included, non-duplicate, not-yet-saved row. */
  const saveAll = useCallback(
    async (mode: 'DRAFT' | 'PUBLISHED') => {
      const targets = items.filter(
        (it) => !it.excluded && !it.isDuplicate && it.status !== 'saved'
      );
      if (targets.length === 0) return { published: 0, drafted: 0, failed: 0 };

      setPhase('saving');
      const result = { published: 0, drafted: 0, failed: 0 };
      for (const item of targets) {
        patchItem(item.localId, { status: 'saving', error: null });
        try {
          const savedStatus = await saveItem(item, mode, { createQuestion, replaceTags });
          patchItem(item.localId, { status: 'saved' });
          if (savedStatus === 'PUBLISHED') result.published += 1;
          else result.drafted += 1;
        } catch (err) {
          result.failed += 1;
          patchItem(item.localId, {
            status: 'error',
            error: err instanceof Error ? err.message : 'Errore durante il salvataggio.',
          });
        }
      }
      setPhase('ready');
      await utils.questions.getQuestions.invalidate();
      await utils.questions.getQuestionStats.invalidate();
      return result;
    },
    [items, patchItem, createQuestion, replaceTags, utils]
  );

  return {
    phase,
    fileName,
    extractError,
    items,
    loadFile,
    reset,
    patchItem,
    patchMany,
    saveAll,
  };
}
