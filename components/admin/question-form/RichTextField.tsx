'use client';

import { useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { colors } from '@/lib/theme/colors';
import RichTextRenderer from '@/components/ui/RichTextRenderer';
import SymbolKeyboard from '@/components/ui/SymbolKeyboard';
import LaTeXEditor from '@/components/ui/LaTeXEditor';
import { hasRenderableRichText } from '@/lib/utils/latex';
import { insertAtCaret } from '@/lib/utils/textareaInsert';
import HtmlShortcutMenu from './HtmlShortcutMenu';
import InsertImageButton from './InsertImageButton';

interface RichTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  /** Smaller toolbar/spacing, for fields nested inside a list (answers). */
  compact?: boolean;
  showSymbols?: boolean;
  showImage?: boolean;
  showFormulaHelper?: boolean;
  showPreview?: boolean;
  invalid?: boolean;
}

/**
 * Textarea plus the authoring toolbar used when writing a question: symbols,
 * "HTML rapido", inline image insertion, LaTeX assistant and a live preview.
 * Packaged as one component so the creation form and the PDF import review
 * offer exactly the same features instead of drifting apart.
 */
export default function RichTextField({
  value,
  onChange,
  rows = 3,
  placeholder,
  disabled = false,
  compact = false,
  showSymbols = true,
  showImage = true,
  showFormulaHelper = false,
  showPreview = true,
  invalid = false,
}: RichTextFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showFormula, setShowFormula] = useState(false);
  const [latex, setLatex] = useState('');

  const insert = (snippet: string) => insertAtCaret(textareaRef.current, value, onChange, snippet);

  const insertFormula = () => {
    if (!latex.trim()) return;
    insert(`$${latex.trim()}$`);
    setLatex('');
    setShowFormula(false);
  };

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full rounded-lg border ${
          invalid ? 'border-red-500' : colors.border.primary
        } ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-[#a8012b]/20 focus:border-[#a8012b] transition-colors resize-y disabled:opacity-60 ${
          compact ? 'px-3 py-1.5 text-sm' : 'px-3 py-2 text-sm'
        }`}
      />

      {!disabled && (
        <div className="flex items-center gap-2 flex-wrap">
          {showSymbols && <SymbolKeyboard onInsert={insert} />}
          <HtmlShortcutMenu compact={compact} onInsert={insert} />
          {showImage && <InsertImageButton onInsert={insert} />}
          {showFormulaHelper && (
            <button
              type="button"
              onClick={() => setShowFormula((current) => !current)}
              className={`inline-flex items-center gap-2 text-sm ${colors.text.muted} hover:${colors.primary.text} transition-colors`}
            >
              <Sparkles className="w-4 h-4" />
              {showFormula ? 'Nascondi assistente formule' : 'Assistente formule LaTeX'}
              {showFormula ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      )}

      {showFormulaHelper && showFormula && !disabled && (
        <div className={`p-3 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
          <LaTeXEditor
            value={latex}
            onChange={setLatex}
            placeholder="Costruisci la tua formula qui..."
            rows={2}
          />
          <button
            type="button"
            onClick={insertFormula}
            disabled={!latex.trim()}
            className={`mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg ${colors.primary.bg} text-white hover:opacity-90 transition-opacity text-sm disabled:opacity-50`}
          >
            <Sparkles className="w-4 h-4" />
            Inserisci nel testo
          </button>
        </div>
      )}

      {showPreview && hasRenderableRichText(value) && (
        <div>
          <p className={`text-xs ${colors.text.muted} mb-1`}>Anteprima formattazione:</p>
          <div className={`p-2 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
            <RichTextRenderer text={value} className={`text-sm ${colors.text.primary}`} />
          </div>
        </div>
      )}
    </div>
  );
}
