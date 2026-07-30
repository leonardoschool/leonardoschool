'use client';

import { useState } from 'react';
import { colors } from '@/lib/theme/colors';
import { Plus, Trash2, Check, MessageSquarePlus } from 'lucide-react';
import RichTextField from '@/components/admin/question-form/RichTextField';
import type { PdfImportAnswer } from '@/lib/pdf/buildImportItems';
import type { QuestionType } from '@/lib/validations/questionValidation';

interface PdfAnswerEditorProps {
  answers: PdfImportAnswer[];
  type: QuestionType;
  disabled: boolean;
  onChange: (answers: PdfImportAnswer[]) => void;
}

const LETTERS = 'ABCDEFGH'.split('');

/** Re-labels answers A, B, C… after add/remove so labels stay sequential. */
function relabel(answers: PdfImportAnswer[]): PdfImportAnswer[] {
  return answers.map((a, i) => ({ ...a, label: LETTERS[i] ?? String(i + 1) }));
}

export default function PdfAnswerEditor({ answers, type, disabled, onChange }: PdfAnswerEditorProps) {
  const isMulti = type === 'MULTIPLE_CHOICE';

  const patchAnswer = (index: number, patch: Partial<PdfImportAnswer>) =>
    onChange(answers.map((a, i) => (i === index ? { ...a, ...patch } : a)));

  const setCorrect = (index: number) => {
    if (isMulti) {
      onChange(answers.map((a, i) => (i === index ? { ...a, isCorrect: !a.isCorrect } : a)));
    } else {
      onChange(answers.map((a, i) => ({ ...a, isCorrect: i === index })));
    }
  };

  const remove = (index: number) => onChange(relabel(answers.filter((_, i) => i !== index)));
  const add = () =>
    onChange(relabel([...answers, { label: '', text: '', isCorrect: false, explanation: '' }]));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${colors.text.muted}`}>
          Risposte {isMulti ? '(seleziona tutte le corrette)' : '(seleziona la corretta)'}
        </span>
        {!disabled && answers.length < LETTERS.length && (
          <button
            type="button"
            onClick={add}
            className={`inline-flex items-center gap-1 text-xs ${colors.primary.text} hover:underline`}
          >
            <Plus className="w-3.5 h-3.5" /> Aggiungi
          </button>
        )}
      </div>
      {answers.map((answer, index) => (
        <AnswerRow
          key={index}
          answer={answer}
          disabled={disabled}
          onPatch={(patch) => patchAnswer(index, patch)}
          onToggleCorrect={() => setCorrect(index)}
          onRemove={() => remove(index)}
        />
      ))}
    </div>
  );
}

interface AnswerRowProps {
  answer: PdfImportAnswer;
  disabled: boolean;
  onPatch: (patch: Partial<PdfImportAnswer>) => void;
  onToggleCorrect: () => void;
  onRemove: () => void;
}

function AnswerRow({ answer, disabled, onPatch, onToggleCorrect, onRemove }: AnswerRowProps) {
  // Kept collapsed by default: on an import of 40 questions an always-open
  // explanation box for every option buries the answers themselves.
  const [showExplanation, setShowExplanation] = useState(!!answer.explanation);

  return (
    <div
      className={`p-2 rounded-lg border ${
        answer.isCorrect ? 'border-green-400 dark:border-green-700' : colors.border.primary
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`w-7 h-7 mt-1 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
            answer.isCorrect ? 'bg-green-500 text-white' : `${colors.background.tertiary} ${colors.text.secondary}`
          }`}
        >
          {answer.label}
        </span>
        <div className="flex-1 min-w-0">
          <RichTextField
            value={answer.text}
            onChange={(text) => onPatch({ text })}
            disabled={disabled}
            rows={1}
            compact
            showSymbols={false}
            placeholder={`Risposta ${answer.label}... (supporta LaTeX: $x^2$ e HTML: <sub>2</sub>)`}
          />
          {showExplanation && (
            <div className="mt-2">
              <RichTextField
                value={answer.explanation}
                onChange={(explanation) => onPatch({ explanation })}
                disabled={disabled}
                rows={1}
                compact
                showSymbols={false}
                showImage={false}
                showPreview={false}
                placeholder="Spiegazione per questa risposta (opzionale, supporta LaTeX/HTML)"
              />
            </div>
          )}
          {!showExplanation && !disabled && (
            <button
              type="button"
              onClick={() => setShowExplanation(true)}
              className={`mt-1 inline-flex items-center gap-1 text-xs ${colors.text.muted} hover:${colors.primary.text} transition-colors`}
            >
              <MessageSquarePlus className="w-3.5 h-3.5" /> Spiegazione
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={onToggleCorrect}
            disabled={disabled}
            title={answer.isCorrect ? 'Risposta corretta' : 'Segna come corretta'}
            className={`p-1.5 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50 ${
              answer.isCorrect
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
            }`}
          >
            <Check className="w-4 h-4" />
          </button>
          {!disabled && (
            <button
              type="button"
              onClick={onRemove}
              title="Rimuovi risposta"
              className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
