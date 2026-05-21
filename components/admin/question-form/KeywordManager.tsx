'use client';

import { useRef } from 'react';
import { colors } from '@/lib/theme/colors';
import CustomSelect from '@/components/ui/CustomSelect';
import SymbolKeyboard from '@/components/ui/SymbolKeyboard';
import HtmlShortcutMenu from '@/components/admin/question-form/HtmlShortcutMenu';
import { Spinner } from '@/components/ui/loaders';
import { Plus, Trash2, Sparkles, Lightbulb, AlertCircle } from 'lucide-react';
import type { OpenAnswerValidationType, QuestionKeywordInput } from '@/lib/validations/questionValidation';
import { openValidationTypeLabels } from '@/lib/validations/questionValidation';

interface KeywordSuggestion {
  keyword: string;
  confidence: number;
  reason?: string;
}

interface KeywordManagerProps {
  openValidationType: OpenAnswerValidationType | '';
  setOpenValidationType: (val: OpenAnswerValidationType | '') => void;
  keywords: QuestionKeywordInput[];
  openMinLength: number | '';
  openMaxLength: number | '';
  showKeywordSuggestions: boolean;
  keywordSuggestions?: KeywordSuggestion[];
  fetchingSuggestions: boolean;
  questionTextLength: number;
  error?: string;
  onAddKeyword: () => void;
  onRemoveKeyword: (index: number) => void;
  onUpdateKeyword: (index: number, field: keyof QuestionKeywordInput, value: unknown) => void;
  onAddSuggested: (suggestion: KeywordSuggestion) => void;
  onToggleSuggestions: () => void;
  onMinLengthChange: (val: number | '') => void;
  onMaxLengthChange: (val: number | '') => void;
}

export default function KeywordManager({
  openValidationType,
  setOpenValidationType,
  keywords,
  openMinLength,
  openMaxLength,
  showKeywordSuggestions,
  keywordSuggestions,
  fetchingSuggestions,
  questionTextLength,
  error,
  onAddKeyword,
  onRemoveKeyword,
  onUpdateKeyword,
  onAddSuggested,
  onToggleSuggestions,
  onMinLengthChange,
  onMaxLengthChange,
}: KeywordManagerProps) {
  const keywordRefs = useRef<Array<HTMLInputElement | null>>([]);

  const insertIntoKeyword = (index: number, symbol: string) => {
    const el = keywordRefs.current[index];
    const currentValue = keywords[index].keyword;
    if (!el) {
      onUpdateKeyword(index, 'keyword', currentValue + symbol);
      return;
    }
    const start = el.selectionStart ?? currentValue.length;
    const end = el.selectionEnd ?? start;
    const newValue = currentValue.substring(0, start) + symbol + currentValue.substring(end);
    onUpdateKeyword(index, 'keyword', newValue);
    const newPos = start + symbol.length;
    setTimeout(() => { el.focus(); el.setSelectionRange(newPos, newPos); }, 0);
  };

  return (
    <div className="space-y-4">
      <CustomSelect
        label="Tipo di valutazione *"
        options={[
          { value: '', label: 'Seleziona tipo di valutazione' },
          { value: 'MANUAL', label: openValidationTypeLabels.MANUAL },
          { value: 'KEYWORDS', label: openValidationTypeLabels.KEYWORDS },
          { value: 'BOTH', label: openValidationTypeLabels.BOTH },
        ]}
        value={openValidationType}
        onChange={(val) => setOpenValidationType(val as OpenAnswerValidationType | '')}
      />

      {(openValidationType === 'KEYWORDS' || openValidationType === 'BOTH') && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className={`text-sm font-medium ${colors.text.primary}`}>
                Keywords per validazione *
              </label>
              <p className={`text-xs ${colors.text.muted} mt-0.5`}>
                Lo studente deve scrivere almeno una delle keywords indicate (alternative tra loro).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleSuggestions}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border ${
                  showKeywordSuggestions
                    ? 'border-[#a8012b] text-[#a8012b] bg-[#a8012b]/10'
                    : `${colors.border.primary} ${colors.text.secondary} hover:border-[#a8012b]/50`
                } transition-colors`}
              >
                <Sparkles className="w-4 h-4" />
                Suggerimenti
              </button>
              <button
                type="button"
                onClick={onAddKeyword}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-[#a8012b] text-white hover:bg-[#8a0123] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Aggiungi
              </button>
            </div>
          </div>

          {error && (
            <p className="mb-3 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          )}

          {showKeywordSuggestions && (
            <div className={`mb-4 p-4 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className={`w-5 h-5 ${colors.primary.text}`} />
                <span className={`font-medium ${colors.text.primary}`}>Keywords suggerite</span>
                {fetchingSuggestions && <Spinner size="xs" />}
              </div>
              {questionTextLength < 10 ? (
                <p className={`text-sm ${colors.text.muted}`}>
                  Inserisci almeno 10 caratteri nel testo della domanda per ottenere suggerimenti.
                </p>
              ) : keywordSuggestions && keywordSuggestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {keywordSuggestions.map((suggestion, idx) => {
                    const alreadyAdded = keywords.some(
                      (k) => k.keyword.toLowerCase() === suggestion.keyword.toLowerCase()
                    );
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onAddSuggested(suggestion)}
                        disabled={alreadyAdded}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border ${
                          alreadyAdded ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#a8012b] hover:text-[#a8012b]'
                        } ${colors.border.primary} ${colors.text.secondary} transition-colors`}
                        title={suggestion.reason}
                      >
                        <Plus className="w-3 h-3" />
                        {suggestion.keyword}
                        <span className={`text-xs ${colors.text.muted}`}>
                          ({Math.round(suggestion.confidence * 100)}%)
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className={`text-sm ${colors.text.muted}`}>Nessun suggerimento disponibile.</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            {keywords.map((keyword, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${colors.border.primary} ${colors.background.secondary} space-y-2`}
              >
                <div className="flex items-center gap-3">
                  <input
                    ref={(el) => { keywordRefs.current[index] = el; }}
                    type="text"
                    value={keyword.keyword}
                    onChange={(e) => onUpdateKeyword(index, 'keyword', e.target.value)}
                    placeholder="Keyword... (supporta LaTeX: $x^2$ e HTML: <sub>2</sub>)"
                    className={`flex-1 px-3 py-1.5 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} text-sm focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveKeyword(index)}
                    className="p-1.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <SymbolKeyboard onInsert={(symbol) => insertIntoKeyword(index, symbol)} />
                  <HtmlShortcutMenu compact onInsert={(snippet) => insertIntoKeyword(index, snippet)} />
                </div>
              </div>
            ))}
            {keywords.length === 0 && (
              <p className={`text-sm ${colors.text.muted} text-center py-4`}>
                Nessuna keyword inserita. Aggiungi keywords per la validazione automatica.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
            Lunghezza minima (caratteri)
          </label>
          <input
            type="number"
            value={openMinLength}
            onChange={(e) => onMinLengthChange(e.target.value ? Number(e.target.value) : '')}
            min="0"
            placeholder="Nessun limite"
            className={`w-full px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
          />
        </div>
        <div>
          <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
            Lunghezza massima (caratteri)
          </label>
          <input
            type="number"
            value={openMaxLength}
            onChange={(e) => onMaxLengthChange(e.target.value ? Number(e.target.value) : '')}
            min="0"
            placeholder="Nessun limite"
            className={`w-full px-4 py-2 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors`}
          />
        </div>
      </div>
    </div>
  );
}
