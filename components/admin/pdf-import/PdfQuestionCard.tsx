'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import CustomSelect, { type SelectOption } from '@/components/ui/CustomSelect';
import TagSelector from '@/components/admin/TagSelector';
import Checkbox from '@/components/ui/Checkbox';
import { Spinner } from '@/components/ui/loaders';
import {
  difficultyLabels,
  questionTypeLabels,
  questionLanguageLabels,
  type QuestionType,
  type DifficultyLevel,
  type QuestionLanguage,
} from '@/lib/validations/questionValidation';
import { CheckCircle, AlertTriangle, Copy, XCircle, ZoomIn, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { PdfImportItem, PdfImportAnswer } from '@/lib/pdf/buildImportItems';
import PdfAnswerEditor from './PdfAnswerEditor';

interface PdfQuestionCardProps {
  item: PdfImportItem;
  subjectOptions: SelectOption[];
  onPatch: (localId: string, patch: Partial<PdfImportItem>) => void;
}

const DIFFICULTY_OPTIONS: SelectOption[] = [
  { value: 'EASY', label: difficultyLabels.EASY },
  { value: 'MEDIUM', label: difficultyLabels.MEDIUM },
  { value: 'HARD', label: difficultyLabels.HARD },
];
const LANGUAGE_OPTIONS: SelectOption[] = [
  { value: 'IT', label: questionLanguageLabels.IT },
  { value: 'EN', label: questionLanguageLabels.EN },
];
const TYPE_OPTIONS: { value: QuestionType; hint: string }[] = [
  { value: 'SINGLE_CHOICE', hint: 'Una sola corretta' },
  { value: 'MULTIPLE_CHOICE', hint: 'Più corrette' },
  { value: 'OPEN_TEXT', hint: 'Risposta libera' },
];

export default function PdfQuestionCard({ item, subjectOptions, onPatch }: PdfQuestionCardProps) {
  const [zoomed, setZoomed] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { data: topicsData } = trpc.materials.getTopics.useQuery(
    { subjectId: item.subjectId || '', includeInactive: false },
    { enabled: !!item.subjectId }
  );

  const topicOptions = useMemo<SelectOption[]>(
    () => [
      { value: '', label: 'Seleziona argomento' },
      ...(topicsData ?? [])
        .map((t) => ({ value: t.id, label: t.name }))
        .sort((a, b) => a.label.localeCompare(b.label, 'it')),
    ],
    [topicsData]
  );

  const patch = (p: Partial<PdfImportItem>) => onPatch(item.localId, p);
  const disabled = item.isDuplicate || item.status === 'saved';

  const setType = (type: QuestionType) => {
    // Switching to single choice: keep only the first correct answer.
    if (type === 'SINGLE_CHOICE') {
      const first = item.answers.findIndex((a) => a.isCorrect);
      patch({ type, answers: item.answers.map((a, i) => ({ ...a, isCorrect: i === first })) });
    } else {
      patch({ type });
    }
  };

  return (
    <div
      className={`rounded-xl border p-4 ${colors.effects.shadow.sm} ${
        item.isDuplicate || item.excluded
          ? `${colors.border.primary} ${colors.background.secondary} opacity-70`
          : `${colors.border.primary} ${colors.background.card}`
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-bold ${colors.text.primary}`}>#{item.number}</span>
          <Badge item={item} />
        </div>
        {!item.isDuplicate && item.status !== 'saved' && (
          <Checkbox
            checked={!item.excluded}
            onChange={(e) => patch({ excluded: !e.target.checked })}
            label="Includi"
          />
        )}
      </div>

      {item.suspicious && !item.isDuplicate && (
        <div className="mb-3 flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{item.suspiciousReasons.join(' · ')} — verifica testo/immagine.</span>
        </div>
      )}

      {/* Crop preview */}
      {item.cropPreviewUrl && (
        <div className="mb-3">
          <p className={`text-xs ${colors.text.muted} mb-1`}>Ritaglio dal PDF (allegato come immagine):</p>
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="group relative inline-block rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            title="Clicca per ingrandire"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.cropPreviewUrl} alt={`Ritaglio domanda ${item.number}`} className="max-w-full max-h-52" />
            <span className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="w-4 h-4" />
            </span>
          </button>
        </div>
      )}

      {zoomed && item.cropPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 cursor-zoom-out" onClick={() => setZoomed(false)}>
          <button type="button" onClick={() => setZoomed(false)} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
            <X className="w-6 h-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.cropPreviewUrl} alt={`Ritaglio domanda ${item.number}`} className="max-w-full max-h-full rounded-lg bg-white" />
        </div>
      )}

      {/* Type */}
      {!item.isDuplicate && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              disabled={disabled}
              className={`px-2 py-2 rounded-lg border text-center transition-all disabled:opacity-60 ${
                item.type === t.value
                  ? `${colors.primary.border} ${colors.primary.softBg} ${colors.primary.text}`
                  : `${colors.border.primary} ${colors.text.secondary} hover:${colors.background.secondary}`
              }`}
            >
              <span className="block text-sm font-medium">{questionTypeLabels[t.value]}</span>
              <span className={`block text-[11px] ${colors.text.muted}`}>{t.hint}</span>
            </button>
          ))}
        </div>
      )}

      {/* Question text */}
      <textarea
        value={item.text}
        onChange={(e) => patch({ text: e.target.value })}
        disabled={disabled}
        rows={2}
        className={`w-full px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors resize-y text-sm disabled:opacity-60`}
      />

      {/* Answers */}
      {item.type !== 'OPEN_TEXT' && (
        <div className="mt-3">
          <PdfAnswerEditor
            answers={item.answers}
            type={item.type}
            disabled={disabled}
            onChange={(answers: PdfImportAnswer[]) => patch({ answers })}
          />
        </div>
      )}
      {item.type === 'OPEN_TEXT' && (
        <p className={`mt-3 text-sm ${colors.text.muted} p-3 rounded-lg ${colors.background.secondary}`}>
          Risposta aperta: le keyword di valutazione si configurano dopo l&apos;import nella domanda.
        </p>
      )}

      {/* Categorization */}
      {!item.isDuplicate && (
        <>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <CustomSelect label="Materia" options={subjectOptions} value={item.subjectId} onChange={(val) => patch({ subjectId: val, topicId: '' })} searchable size="sm" disabled={disabled} />
            <CustomSelect label="Argomento" options={topicOptions} value={item.topicId} onChange={(val) => patch({ topicId: val })} searchable size="sm" disabled={disabled || !item.subjectId} />
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <CustomSelect label="Difficoltà" options={DIFFICULTY_OPTIONS} value={item.difficulty} onChange={(val) => patch({ difficulty: val as DifficultyLevel })} size="sm" disabled={disabled} />
            <CustomSelect label="Lingua" options={LANGUAGE_OPTIONS} value={item.language} onChange={(val) => patch({ language: val as QuestionLanguage })} size="sm" disabled={disabled} />
          </div>

          <div className="mt-3">
            <Checkbox
              checked={item.shuffleAnswers}
              onChange={(e) => patch({ shuffleAnswers: e.target.checked })}
              disabled={disabled}
              label="Mescola l'ordine delle risposte durante il test"
            />
          </div>

          <div className="mt-3">
            <label className={`block text-xs font-medium ${colors.text.muted} mb-1`}>Tag</label>
            <TagSelector selectedTagIds={item.tagIds} onChange={(ids) => patch({ tagIds: ids })} placeholder="Tag (opzionale)..." />
          </div>

          {/* Advanced */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className={`mt-4 w-full flex items-center justify-between px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.text.secondary} hover:${colors.background.secondary} transition-colors text-sm`}
          >
            <span className="font-medium">Opzioni avanzate</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showAdvanced && (
            <div className={`mt-3 space-y-3 p-3 rounded-lg border border-dashed ${colors.border.primary}`}>
              <Field label="URL immagine (opzionale)">
                <input type="url" value={item.imageUrl} onChange={(e) => patch({ imageUrl: e.target.value })} disabled={disabled} placeholder="https://..." className={inputClass} />
              </Field>
              <Field label="Descrizione / Contesto aggiuntivo">
                <textarea value={item.description} onChange={(e) => patch({ description: e.target.value })} disabled={disabled} rows={2} placeholder="Informazioni mostrate prima della domanda..." className={`${inputClass} resize-y`} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Anno">
                  <input type="number" value={item.year ?? ''} onChange={(e) => patch({ year: e.target.value ? Number(e.target.value) : null })} disabled={disabled} placeholder="Es: 2011" className={inputClass} />
                </Field>
                <Field label="Fonte">
                  <input type="text" value={item.source} onChange={(e) => patch({ source: e.target.value })} disabled={disabled} placeholder="Es: IMAT 2011" className={inputClass} />
                </Field>
              </div>
              <Field label="Spiegazione risposta corretta">
                <textarea value={item.correctExplanation} onChange={(e) => patch({ correctExplanation: e.target.value })} disabled={disabled} rows={2} placeholder="Mostrata quando lo studente risponde correttamente..." className={`${inputClass} resize-y`} />
              </Field>
              <Field label="Spiegazione risposta errata">
                <textarea value={item.wrongExplanation} onChange={(e) => patch({ wrongExplanation: e.target.value })} disabled={disabled} rows={2} placeholder="Mostrata quando lo studente sbaglia..." className={`${inputClass} resize-y`} />
              </Field>
              <Field label="Spiegazione generale">
                <textarea value={item.generalExplanation} onChange={(e) => patch({ generalExplanation: e.target.value })} disabled={disabled} rows={2} placeholder="Mostrata sempre dopo la risposta..." className={`${inputClass} resize-y`} />
              </Field>
            </div>
          )}
        </>
      )}

      {item.status === 'error' && item.error && (
        <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
          <XCircle className="w-4 h-4" />
          {item.error}
        </p>
      )}
    </div>
  );
}

const inputClass = 'w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/5 focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors text-sm disabled:opacity-60';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={`block text-xs font-medium ${colors.text.muted} mb-1`}>{label}</label>
      {children}
    </div>
  );
}

function Badge({ item }: { item: PdfImportItem }) {
  if (item.isDuplicate) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
        <Copy className="w-3 h-3" /> Già presente
      </span>
    );
  }
  if (item.status === 'saved') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
        <CheckCircle className="w-3 h-3" /> Salvata
      </span>
    );
  }
  if (item.status === 'saving') {
    return (
      <span className={`inline-flex items-center gap-1 text-xs ${colors.text.muted}`}>
        <Spinner size="sm" /> Salvataggio...
      </span>
    );
  }
  if (item.suspicious) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        <AlertTriangle className="w-3 h-3" /> Da rivedere
      </span>
    );
  }
  return null;
}
