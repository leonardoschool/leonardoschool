'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { colors } from '@/lib/theme/colors';
import { Eye, Code, HelpCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
import katex from 'katex';

interface LaTeXEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  error?: string;
  className?: string;
  helpText?: string;
}

// Common LaTeX templates for quick insertion
const latexTemplates = [
  {
    category: 'Frazioni e potenze',
    items: [
      { label: 'Frazione', template: '\\frac{a}{b}', preview: '\\frac{a}{b}' },
      { label: 'Potenza', template: 'x^{n}', preview: 'x^{n}' },
      { label: 'Pedice', template: 'x_{n}', preview: 'x_{n}' },
      { label: 'Radice quadrata', template: '\\sqrt{x}', preview: '\\sqrt{x}' },
      { label: 'Radice n-esima', template: '\\sqrt[n]{x}', preview: '\\sqrt[n]{x}' },
    ],
  },
  {
    category: 'Simboli matematici',
    items: [
      { label: 'Pi greco', template: '\\pi', preview: '\\pi' },
      { label: 'Infinito', template: '\\infty', preview: '\\infty' },
      { label: 'Sommatoria', template: '\\sum_{i=1}^{n}', preview: '\\sum_{i=1}^{n}' },
      { label: 'Produttoria', template: '\\prod_{i=1}^{n}', preview: '\\prod_{i=1}^{n}' },
      { label: 'Integrale', template: '\\int_{a}^{b}', preview: '\\int_{a}^{b}' },
      { label: 'Limite', template: '\\lim_{x \\to a}', preview: '\\lim_{x \\to a}' },
    ],
  },
  {
    category: 'Relazioni',
    items: [
      { label: 'Uguale', template: '=', preview: '=' },
      { label: 'Diverso', template: '\\neq', preview: '\\neq' },
      { label: 'Minore uguale', template: '\\leq', preview: '\\leq' },
      { label: 'Maggiore uguale', template: '\\geq', preview: '\\geq' },
      { label: 'Circa uguale', template: '\\approx', preview: '\\approx' },
      { label: 'Proporzionale', template: '\\propto', preview: '\\propto' },
    ],
  },
  {
    category: 'Lettere greche',
    items: [
      { label: 'Alpha', template: '\\alpha', preview: '\\alpha' },
      { label: 'Beta', template: '\\beta', preview: '\\beta' },
      { label: 'Gamma', template: '\\gamma', preview: '\\gamma' },
      { label: 'Delta', template: '\\delta', preview: '\\delta' },
      { label: 'Epsilon', template: '\\epsilon', preview: '\\epsilon' },
      { label: 'Theta', template: '\\theta', preview: '\\theta' },
      { label: 'Lambda', template: '\\lambda', preview: '\\lambda' },
      { label: 'Mu', template: '\\mu', preview: '\\mu' },
      { label: 'Omega', template: '\\omega', preview: '\\omega' },
      { label: 'Phi', template: '\\phi', preview: '\\phi' },
    ],
  },
  {
    category: 'Fisica e Chimica',
    items: [
      { label: 'Freccia destra', template: '\\rightarrow', preview: '\\rightarrow' },
      { label: 'Equilibrio', template: '\\rightleftharpoons', preview: '\\rightleftharpoons' },
      { label: 'Vettore', template: '\\vec{v}', preview: '\\vec{v}' },
      { label: 'Delta (variazione)', template: '\\Delta', preview: '\\Delta' },
      { label: 'Gradi', template: '^{\\circ}', preview: '90^{\\circ}' },
      { label: 'Derivata parziale', template: '\\frac{\\partial f}{\\partial x}', preview: '\\frac{\\partial f}{\\partial x}' },
    ],
  },
  {
    category: 'Matrici e sistemi',
    items: [
      { label: 'Matrice 2x2', template: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', preview: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
      { label: 'Sistema', template: '\\begin{cases} x + y = 1 \\\\ x - y = 0 \\end{cases}', preview: '\\begin{cases} x + y = 1 \\\\ x - y = 0 \\end{cases}' },
    ],
  },
];

// Render LaTeX to HTML safely
function renderLatex(latex: string): { html: string; error: string | null } {
  try {
    const html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: true,
      strict: false,
    });
    return { html, error: null };
  } catch (err) {
    return { html: '', error: err instanceof Error ? err.message : 'Errore di rendering' };
  }
}

export default function LaTeXEditor({
  value,
  onChange,
  placeholder = 'Inserisci formula LaTeX...',
  rows = 4,
  label,
  error,
  className = '',
  helpText,
}: LaTeXEditorProps) {
  const [showPreview, setShowPreview] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const templatesRef = useRef<HTMLDivElement>(null);

  // Close templates on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (templatesRef.current && !templatesRef.current.contains(event.target as Node)) {
        setShowTemplates(false);
      }
    };

    if (showTemplates) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTemplates]);

  const handleInsertTemplate = useCallback((template: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + template + value.substring(end);
    
    onChange(newValue);
    
    const newPosition = start + template.length;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  }, [value, onChange]);

  // Render preview
  const { html: previewHtml, error: latexError } = renderLatex(value || '');

  return (
    <div className={className}>
      {label && (
        <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
          {label}
        </label>
      )}

      {/* Toolbar */}
      <div className={`flex items-center gap-2 mb-2 flex-wrap`}>
        {/* Template Button */}
        <div ref={templatesRef} className="relative">
          <button
            type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              showTemplates
                ? `${colors.primary.gradient} text-white`
                : `${colors.background.secondary} ${colors.text.primary} hover:${colors.background.tertiary} border ${colors.border.primary}`
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Inserisci formula</span>
            {showTemplates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Templates Dropdown */}
          {showTemplates && (
            <div className={`absolute z-50 mt-2 left-0 w-[450px] max-w-[calc(100vw-2rem)] ${colors.background.card} rounded-xl shadow-xl border ${colors.border.primary} overflow-hidden`}>
              {/* Category Tabs */}
              <div className={`flex overflow-x-auto gap-1 p-2 ${colors.background.secondary} border-b ${colors.border.light}`}>
                {latexTemplates.map((cat, idx) => (
                  <button
                    key={cat.category}
                    type="button"
                    onClick={() => setActiveCategory(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      activeCategory === idx
                        ? `${colors.primary.gradient} text-white`
                        : `${colors.text.muted} hover:${colors.text.primary} hover:${colors.background.hover}`
                    }`}
                  >
                    {cat.category}
                  </button>
                ))}
              </div>

              {/* Templates Grid */}
              <div className="p-3 max-h-[300px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {latexTemplates[activeCategory].items.map((item) => {
                    const { html } = renderLatex(item.preview);
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleInsertTemplate(item.template)}
                        className={`p-3 rounded-lg text-left ${colors.background.hover} hover:${colors.primary.softBg} transition-all border ${colors.border.light} hover:border-pink-300 dark:hover:border-pink-700`}
                      >
                        <p className={`text-xs font-medium ${colors.text.muted} mb-1`}>{item.label}</p>
                        <div 
                          className={`text-lg ${colors.text.primary}`}
                          dangerouslySetInnerHTML={{ __html: html }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview Toggle */}
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            showPreview
              ? `bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400`
              : `${colors.background.secondary} ${colors.text.muted}`
          }`}
        >
          <Eye className="w-4 h-4" />
          Anteprima
        </button>

        {/* Help Button */}
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className={`p-1.5 rounded-lg ${colors.text.muted} hover:${colors.text.primary} hover:${colors.background.hover}`}
          title="Aiuto LaTeX"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className={`mb-3 p-4 rounded-lg ${colors.background.secondary} border ${colors.border.light}`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className={`font-medium ${colors.text.primary}`}>Guida rapida LaTeX</h4>
            <button onClick={() => setShowHelp(false)} className={colors.text.muted}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className={`text-sm ${colors.text.secondary} space-y-2`}>
            <p>• Usa <code className={`px-1 rounded ${colors.background.tertiary}`}>{'{}'}</code> per raggruppare elementi</p>
            <p>• Usa <code className={`px-1 rounded ${colors.background.tertiary}`}>^</code> per esponenti: <code>x^2</code> → x²</p>
            <p>• Usa <code className={`px-1 rounded ${colors.background.tertiary}`}>_</code> per pedici: <code>H_2O</code> → H₂O</p>
            <p>• Usa <code className={`px-1 rounded ${colors.background.tertiary}`}>\frac{'{a}{b}'}</code> per frazioni</p>
            <p>• I comandi iniziano con <code className={`px-1 rounded ${colors.background.tertiary}`}>\</code></p>
          </div>
        </div>
      )}

      {/* Editor Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Textarea */}
        <div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className={`w-full px-4 py-3 rounded-lg border font-mono text-sm ${
              error || latexError ? 'border-red-500' : colors.border.primary
            } ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-colors resize-y`}
          />
          {error && (
            <p className="mt-1 text-sm text-red-500">{error}</p>
          )}
          {latexError && !error && (
            <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ Errore LaTeX: {latexError}
            </p>
          )}
        </div>

        {/* Preview */}
        {showPreview && (
          <div className={`p-4 rounded-lg border ${colors.border.primary} ${colors.background.secondary} min-h-[120px] flex items-center justify-center`}>
            {value ? (
              <div 
                className={`${colors.text.primary} text-lg overflow-x-auto max-w-full`}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <p className={`text-sm ${colors.text.muted}`}>L&apos;anteprima apparirà qui...</p>
            )}
          </div>
        )}
      </div>

      {helpText && (
        <p className={`mt-2 text-sm ${colors.text.muted}`}>{helpText}</p>
      )}
    </div>
  );
}

/**
 * Component to render LaTeX formulas in display mode
 * Use this to show LaTeX formulas in questions, answers, etc.
 */
interface LaTeXRendererProps {
  latex: string;
  className?: string;
  displayMode?: boolean;
}

export function LaTeXRenderer({ latex, className = '', displayMode = true }: LaTeXRendererProps) {
  const [html, setHtml] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!latex?.trim()) {
      setHtml('');
      setError(null);
      return;
    }

    try {
      const rendered = katex.renderToString(latex, {
        throwOnError: false,
        displayMode,
        output: 'html',
        trust: true,
      });
      setHtml(rendered);
      setError(null);
    } catch (err) {
      setError('Errore nel rendering della formula');
      console.error('LaTeX render error:', err);
    }
  }, [latex, displayMode]);

  if (!latex?.trim()) return null;

  if (error) {
    return (
      <span className="text-red-500 text-sm">
        {error}
      </span>
    );
  }

  return (
    <div 
      className={`katex-display ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
