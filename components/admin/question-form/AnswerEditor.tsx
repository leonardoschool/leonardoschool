'use client';

import { useRef, type RefObject } from 'react';
import { colors } from '@/lib/theme/colors';
import RichTextRenderer from '@/components/ui/RichTextRenderer';
import Checkbox from '@/components/ui/Checkbox';
import { Plus, Trash2, Check, AlertCircle } from 'lucide-react';
import type { QuestionType, QuestionAnswerInput } from '@/lib/validations/questionValidation';
import HtmlShortcutMenu from './HtmlShortcutMenu';

interface AnswerEditorProps {
  answers: QuestionAnswerInput[];
  type: QuestionType;
  shuffleAnswers: boolean;
  error?: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof QuestionAnswerInput, value: unknown) => void;
  onShuffleChange: (checked: boolean) => void;
  onInsertHtml: (
    index: number,
    field: keyof QuestionAnswerInput,
    value: string,
    snippet: string,
    ref: RefObject<HTMLInputElement | null>
  ) => void;
}

export default function AnswerEditor({
  answers,
  shuffleAnswers,
  error,
  onAdd,
  onRemove,
  onUpdate,
  onShuffleChange,
  onInsertHtml,
}: AnswerEditorProps) {
  const answerTextRefs = useRef<Array<HTMLInputElement | null>>([]);
  const explanationRefs = useRef<Array<HTMLInputElement | null>>([]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className={`text-sm font-medium ${colors.text.primary}`}>Risposte *</label>
        <button
          type="button"
          onClick={onAdd}
          disabled={answers.length >= 6}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-[#a8012b] text-white hover:bg-[#8a0123] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Aggiungi
        </button>
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}

      <div className="space-y-3">
        {answers.map((answer, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${
              answer.isCorrect
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : colors.border.primary
            } ${colors.background.secondary}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-2 pt-2">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    answer.isCorrect
                      ? 'bg-green-500 text-white'
                      : `${colors.background.tertiary} ${colors.text.secondary}`
                  }`}
                >
                  {answer.label}
                </span>
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={(element) => {
                    answerTextRefs.current[index] = element;
                  }}
                  type="text"
                  value={answer.text}
                  onChange={(e) => onUpdate(index, 'text', e.target.value)}
                  placeholder={`Risposta ${answer.label}... (supporta LaTeX: $x^2$ e HTML: <sub>2</sub>)`}
                  className={`w-full px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
                />
                <HtmlShortcutMenu
                  compact
                  onInsert={(snippet) =>
                    onInsertHtml(index, 'text', answer.text, snippet, {
                      current: answerTextRefs.current[index] ?? null,
                    })
                  }
                />
                <input
                  ref={(element) => {
                    explanationRefs.current[index] = element;
                  }}
                  type="text"
                  value={answer.explanation ?? ''}
                  onChange={(e) => onUpdate(index, 'explanation', e.target.value)}
                  placeholder="Spiegazione per questa risposta (opzionale, supporta LaTeX/HTML)"
                  className={`w-full px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.muted} text-sm focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
                />
                <HtmlShortcutMenu
                  compact
                  onInsert={(snippet) =>
                    onInsertHtml(index, 'explanation', answer.explanation ?? '', snippet, {
                      current: explanationRefs.current[index] ?? null,
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => onUpdate(index, 'isCorrect', !answer.isCorrect)}
                  className={`p-2 rounded-lg transition-colors ${
                    answer.isCorrect
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                  }`}
                  title={answer.isCorrect ? 'Rimuovi come corretta' : 'Imposta come corretta'}
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  disabled={answers.length <= 2}
                  className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Rimuovi risposta"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {(answer.text.includes('$') || answer.text.includes('<') || answer.explanation?.includes('$') || answer.explanation?.includes('<')) && (
              <div className={`mt-2 pt-2 border-t ${colors.border.light}`}>
                <p className={`text-xs ${colors.text.muted} mb-1`}>Anteprima:</p>
                <div className={`text-sm ${colors.text.primary}`}>
                  <RichTextRenderer text={answer.text} />
                </div>
                {answer.explanation && (answer.explanation.includes('$') || answer.explanation.includes('<')) && (
                  <div className={`text-xs ${colors.text.muted} mt-1`}>
                    <span className="italic">Spiegazione: </span>
                    <RichTextRenderer text={answer.explanation} className="inline" />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Checkbox
          id="shuffleAnswers"
          checked={shuffleAnswers}
          onChange={(e) => onShuffleChange(e.target.checked)}
          label="Mescola l'ordine delle risposte durante il test"
        />
      </div>
    </div>
  );
}
