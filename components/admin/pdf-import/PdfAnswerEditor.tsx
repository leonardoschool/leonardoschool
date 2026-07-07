'use client';

import { colors } from '@/lib/theme/colors';
import { Plus, Trash2, Check } from 'lucide-react';
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

  const setText = (index: number, text: string) =>
    onChange(answers.map((a, i) => (i === index ? { ...a, text } : a)));

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
        <div key={index} className="flex items-center gap-2">
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
              answer.isCorrect ? 'bg-green-500 text-white' : `${colors.background.tertiary} ${colors.text.secondary}`
            }`}
          >
            {answer.label}
          </span>
          <input
            type="text"
            value={answer.text}
            onChange={(e) => setText(index, e.target.value)}
            disabled={disabled}
            className={`flex-1 px-3 py-1.5 rounded-lg border ${
              answer.isCorrect ? 'border-green-400 dark:border-green-700' : colors.border.primary
            } ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors text-sm disabled:opacity-60`}
          />
          <button
            type="button"
            onClick={() => setCorrect(index)}
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
              onClick={() => remove(index)}
              title="Rimuovi risposta"
              className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
