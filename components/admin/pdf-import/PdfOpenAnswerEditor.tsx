'use client';

import { useRef } from 'react';
import { colors } from '@/lib/theme/colors';
import CustomSelect, { type SelectOption } from '@/components/ui/CustomSelect';
import SymbolKeyboard from '@/components/ui/SymbolKeyboard';
import HtmlShortcutMenu from '@/components/admin/question-form/HtmlShortcutMenu';
import { insertAtCaret } from '@/lib/utils/textareaInsert';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import {
  openValidationTypeLabels,
  type OpenAnswerValidationType,
} from '@/lib/validations/questionValidation';

interface PdfOpenAnswerEditorProps {
  validationType: OpenAnswerValidationType | '';
  keywords: string[];
  disabled: boolean;
  onValidationTypeChange: (val: OpenAnswerValidationType | '') => void;
  onKeywordsChange: (keywords: string[]) => void;
}

const VALIDATION_OPTIONS: SelectOption[] = [
  { value: '', label: "Da definire dopo l'import" },
  { value: 'MANUAL', label: openValidationTypeLabels.MANUAL },
  { value: 'KEYWORDS', label: openValidationTypeLabels.KEYWORDS },
  { value: 'BOTH', label: openValidationTypeLabels.BOTH },
];

/**
 * Open-answer settings inside the PDF import card: validation type plus the
 * accepted keywords, so open questions no longer have to be re-opened one by
 * one after the import just to add them.
 */
export default function PdfOpenAnswerEditor({
  validationType,
  keywords,
  disabled,
  onValidationTypeChange,
  onKeywordsChange,
}: PdfOpenAnswerEditorProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const updateKeyword = (index: number, value: string) =>
    onKeywordsChange(keywords.map((k, i) => (i === index ? value : k)));
  const removeKeyword = (index: number) =>
    onKeywordsChange(keywords.filter((_, i) => i !== index));
  const addKeyword = () => onKeywordsChange([...keywords, '']);

  const insertIntoKeyword = (index: number, snippet: string) =>
    insertAtCaret(inputRefs.current[index], keywords[index], (v) => updateKeyword(index, v), snippet);

  const needsKeywords = validationType === 'KEYWORDS' || validationType === 'BOTH';
  const hasFilledKeyword = keywords.some((k) => k.trim().length > 0);

  return (
    <div className="space-y-3">
      <CustomSelect
        label="Tipo di valutazione"
        options={VALIDATION_OPTIONS}
        value={validationType}
        onChange={(val) => onValidationTypeChange(val as OpenAnswerValidationType | '')}
        size="sm"
        disabled={disabled}
      />

      {needsKeywords && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${colors.text.muted}`}>
              Keywords accettate (alternative tra loro: ne basta una)
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={addKeyword}
                className={`inline-flex items-center gap-1 text-xs ${colors.primary.text} hover:underline`}
              >
                <Plus className="w-3.5 h-3.5" /> Aggiungi
              </button>
            )}
          </div>

          {keywords.map((keyword, index) => (
            <div key={index} className={`p-2 rounded-lg border ${colors.border.primary} space-y-1.5`}>
              <div className="flex items-center gap-2">
                <input
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  value={keyword}
                  onChange={(e) => updateKeyword(index, e.target.value)}
                  disabled={disabled}
                  placeholder="Keyword... (supporta LaTeX: $x^2$ e HTML: <sub>2</sub>)"
                  className={`flex-1 px-3 py-1.5 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} text-sm focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors disabled:opacity-60`}
                />
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeKeyword(index)}
                    title="Rimuovi keyword"
                    className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {!disabled && (
                <div className="flex items-center gap-1">
                  <SymbolKeyboard onInsert={(symbol) => insertIntoKeyword(index, symbol)} />
                  <HtmlShortcutMenu compact onInsert={(snippet) => insertIntoKeyword(index, snippet)} />
                </div>
              )}
            </div>
          ))}

          {!hasFilledKeyword && (
            <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              Inserisci almeno una keyword: senza, la domanda non può essere salvata con valutazione automatica.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
