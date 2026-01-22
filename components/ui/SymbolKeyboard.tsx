'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { colors } from '@/lib/theme/colors';
import { ChevronDown, ChevronUp, Keyboard, Info, Eye } from 'lucide-react';
import RichTextRenderer from '@/components/ui/RichTextRenderer';

interface SymbolKeyboardProps {
  onInsert: (symbol: string) => void;
  className?: string;
}

// Symbol categories based on the provided image
const symbolCategories = [
  {
    name: 'Alfabeto greco',
    symbols: [
      { symbol: 'α', label: 'alfa' },
      { symbol: 'β', label: 'beta' },
      { symbol: 'γ', label: 'gamma' },
      { symbol: 'δ', label: 'delta' },
      { symbol: 'ε', label: 'epsilon' },
      { symbol: 'ζ', label: 'zeta' },
      { symbol: 'η', label: 'eta' },
      { symbol: 'θ', label: 'theta' },
      { symbol: 'ι', label: 'iota' },
      { symbol: 'κ', label: 'kappa' },
      { symbol: 'λ', label: 'lambda' },
      { symbol: 'μ', label: 'mu' },
      { symbol: 'ν', label: 'nu' },
      { symbol: 'ξ', label: 'xi' },
      { symbol: 'ο', label: 'omicron' },
      { symbol: 'π', label: 'pi' },
      { symbol: 'ρ', label: 'rho' },
      { symbol: 'σ', label: 'sigma' },
      { symbol: 'ς', label: 'sigma finale' },
      { symbol: 'τ', label: 'tau' },
      { symbol: 'υ', label: 'upsilon' },
      { symbol: 'φ', label: 'phi' },
      { symbol: 'χ', label: 'chi' },
      { symbol: 'ψ', label: 'psi' },
      { symbol: 'ω', label: 'omega' },
    ],
  },
  {
    name: 'Greco maiuscolo',
    symbols: [
      { symbol: 'Α', label: 'Alfa' },
      { symbol: 'Β', label: 'Beta' },
      { symbol: 'Γ', label: 'Gamma' },
      { symbol: 'Δ', label: 'Delta' },
      { symbol: 'Ε', label: 'Epsilon' },
      { symbol: 'Ζ', label: 'Zeta' },
      { symbol: 'Η', label: 'Eta' },
      { symbol: 'Θ', label: 'Theta' },
      { symbol: 'Ι', label: 'Iota' },
      { symbol: 'Κ', label: 'Kappa' },
      { symbol: 'Λ', label: 'Lambda' },
      { symbol: 'Μ', label: 'Mu' },
      { symbol: 'Ν', label: 'Nu' },
      { symbol: 'Ξ', label: 'Xi' },
      { symbol: 'Ο', label: 'Omicron' },
      { symbol: 'Π', label: 'Pi' },
      { symbol: 'Ρ', label: 'Rho' },
      { symbol: 'Σ', label: 'Sigma' },
      { symbol: 'Τ', label: 'Tau' },
      { symbol: 'Υ', label: 'Upsilon' },
      { symbol: 'Φ', label: 'Phi' },
      { symbol: 'Χ', label: 'Chi' },
      { symbol: 'Ψ', label: 'Psi' },
      { symbol: 'Ω', label: 'Omega' },
    ],
  },
  {
    name: 'Operatori matematici',
    symbols: [
      { symbol: '+', label: 'più' },
      { symbol: '−', label: 'meno' },
      { symbol: '±', label: 'più o meno' },
      { symbol: '×', label: 'per' },
      { symbol: '÷', label: 'diviso' },
      { symbol: '·', label: 'punto (prodotto)' },
      { symbol: '/', label: 'frazione' },
      { symbol: '√', label: 'radice' },
      { symbol: '%', label: 'percentuale' },
    ],
  },
  {
    name: 'Relazioni',
    symbols: [
      { symbol: '=', label: 'uguale' },
      { symbol: '≠', label: 'diverso' },
      { symbol: '<', label: 'minore' },
      { symbol: '>', label: 'maggiore' },
      { symbol: '≤', label: 'minore o uguale' },
      { symbol: '≥', label: 'maggiore o uguale' },
      { symbol: '≈', label: 'circa uguale' },
      { symbol: '∝', label: 'proporzionale' },
      { symbol: '∞', label: 'infinito' },
    ],
  },
  {
    name: 'Frecce e direzioni',
    symbols: [
      { symbol: '→', label: 'freccia destra' },
      { symbol: '←', label: 'freccia sinistra' },
      { symbol: '↔', label: 'freccia doppia' },
      { symbol: '⇌', label: 'equilibrio chimico' },
      { symbol: '↑', label: 'aumenta' },
      { symbol: '↓', label: 'diminuisce' },
    ],
  },
  {
    name: 'Chimica',
    symbols: [
      { symbol: '−', label: 'legame singolo' },
      { symbol: '=', label: 'legame doppio' },
      { symbol: '≡', label: 'legame triplo' },
      { symbol: '···', label: 'legame idrogeno' },
      { symbol: '⁺', label: 'carica +' },
      { symbol: '⁻', label: 'carica -' },
      { symbol: '²⁺', label: 'carica 2+' },
      { symbol: '²⁻', label: 'carica 2-' },
      { symbol: '³⁺', label: 'carica 3+' },
      { symbol: '³⁻', label: 'carica 3-' },
    ],
  },
  {
    name: 'Biologia',
    symbols: [
      { symbol: "5'→3'", label: 'direzione 5-3' },
      { symbol: "3'→5'", label: 'direzione 3-5' },
      { symbol: '♀', label: 'femmina' },
      { symbol: '♂', label: 'maschio' },
    ],
  },
  {
    name: 'Apici e pedici',
    symbols: [
      { symbol: '⁰', label: 'apice 0' },
      { symbol: '¹', label: 'apice 1' },
      { symbol: '²', label: 'apice 2' },
      { symbol: '³', label: 'apice 3' },
      { symbol: '⁴', label: 'apice 4' },
      { symbol: '⁵', label: 'apice 5' },
      { symbol: '⁶', label: 'apice 6' },
      { symbol: '⁷', label: 'apice 7' },
      { symbol: '⁸', label: 'apice 8' },
      { symbol: '⁹', label: 'apice 9' },
      { symbol: '₀', label: 'pedice 0' },
      { symbol: '₁', label: 'pedice 1' },
      { symbol: '₂', label: 'pedice 2' },
      { symbol: '₃', label: 'pedice 3' },
      { symbol: '₄', label: 'pedice 4' },
      { symbol: '₅', label: 'pedice 5' },
      { symbol: '₆', label: 'pedice 6' },
      { symbol: '₇', label: 'pedice 7' },
      { symbol: '₈', label: 'pedice 8' },
      { symbol: '₉', label: 'pedice 9' },
    ],
  },
];

export default function SymbolKeyboard({ onInsert, className = '' }: SymbolKeyboardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSymbolClick = useCallback((symbol: string) => {
    onInsert(symbol);
  }, [onInsert]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          isOpen
            ? `${colors.primary.gradient} text-white`
            : `${colors.background.secondary} ${colors.text.primary} hover:${colors.background.tertiary} border ${colors.border.primary}`
        }`}
      >
        <Keyboard className="w-4 h-4" />
        <span>Simboli</span>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Keyboard Panel */}
      {isOpen && (
        <div 
          className={`absolute z-50 mt-2 left-0 w-[400px] max-w-[calc(100vw-2rem)] ${colors.background.card} rounded-xl shadow-xl border ${colors.border.primary} overflow-hidden`}
        >
          {/* Category Tabs */}
          <div className={`flex overflow-x-auto gap-1 p-2 ${colors.background.secondary} border-b ${colors.border.light}`}>
            {symbolCategories.map((cat, idx) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setActiveCategory(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeCategory === idx
                    ? `${colors.primary.gradient} text-white`
                    : `${colors.text.muted} hover:${colors.text.primary} hover:${colors.background.hover}`
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Symbols Grid */}
          <div className="p-3 max-h-[250px] overflow-y-auto">
            <div className="grid grid-cols-8 gap-1">
              {symbolCategories[activeCategory].symbols.map((item) => (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => handleSymbolClick(item.symbol)}
                  title={item.label}
                  className={`p-2 rounded-lg text-lg font-medium ${colors.text.primary} ${colors.background.hover} hover:${colors.primary.softBg} hover:${colors.primary.text} transition-all border ${colors.border.light} hover:border-pink-300 dark:hover:border-pink-700`}
                >
                  {item.symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className={`px-3 py-2 ${colors.background.secondary} border-t ${colors.border.light}`}>
            <p className={`text-xs ${colors.text.muted}`}>
              Clicca su un simbolo per inserirlo
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Textarea with integrated symbol keyboard
interface TextareaWithSymbolsProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  label?: string;
  error?: string;
  maxLength?: number;
  minLength?: number;
  disabled?: boolean;
  showFormattingHelp?: boolean; // Show LaTeX/HTML formatting help
  showPreview?: boolean; // Show live preview
}

export function TextareaWithSymbols({
  value,
  onChange,
  placeholder = '',
  rows = 4,
  className = '',
  label,
  error,
  maxLength,
  minLength,
  disabled = false,
  showFormattingHelp = true,
  showPreview = true,
}: TextareaWithSymbolsProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);

  const handleInsertSymbol = useCallback((symbol: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + symbol + value.substring(end);
    
    onChange(newValue);
    
    // Set cursor position after the inserted symbol
    const newPosition = start + symbol.length;
    
    // Focus back on textarea
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  }, [value, onChange]);

  // Insert LaTeX template
  const insertLatexTemplate = useCallback((template: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    // Replace placeholder with selected text if any
    const newTemplate = selectedText ? template.replace('...', selectedText) : template;
    const newValue = value.substring(0, start) + newTemplate + value.substring(end);
    
    onChange(newValue);
    
    setTimeout(() => {
      textarea.focus();
      // Position cursor at the placeholder or after the template
      const placeholderIndex = newValue.indexOf('...', start);
      if (placeholderIndex !== -1) {
        textarea.setSelectionRange(placeholderIndex, placeholderIndex + 3);
      } else {
        const newPosition = start + newTemplate.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  }, [value, onChange]);

  return (
    <div className={className}>
      {label && (
        <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
          {label}
        </label>
      )}
      
      {/* Toolbar */}
      <div className={`flex flex-wrap items-center gap-2 mb-2`}>
        <SymbolKeyboard onInsert={handleInsertSymbol} />
        
        {showFormattingHelp && (
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              showHelp
                ? `${colors.primary.softBg} ${colors.primary.text}`
                : `${colors.background.secondary} ${colors.text.muted} hover:${colors.text.primary} border ${colors.border.primary}`
            }`}
          >
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline">Formattazione</span>
          </button>
        )}
        
        {showPreview && value && (
          <button
            type="button"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              showLivePreview
                ? `${colors.primary.softBg} ${colors.primary.text}`
                : `${colors.background.secondary} ${colors.text.muted} hover:${colors.text.primary} border ${colors.border.primary}`
            }`}
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Anteprima</span>
          </button>
        )}
        
        {maxLength && (
          <span className={`ml-auto text-xs ${value.length > maxLength ? 'text-red-500' : colors.text.muted}`}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>

      {/* Formatting Help Panel */}
      {showHelp && (
        <div className={`mb-3 p-4 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
          <h4 className={`font-medium ${colors.text.primary} mb-3 flex items-center gap-2`}>
            <Info className="w-4 h-4" />
            Come formattare la risposta
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* LaTeX Section */}
            <div>
              <p className={`font-medium ${colors.text.primary} mb-2`}>📐 Formule LaTeX</p>
              <div className={`space-y-1.5 ${colors.text.secondary}`}>
                <p><code className="px-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">$formula$</code> → formula inline</p>
                <p><code className="px-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">$$formula$$</code> → formula centrata</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <button type="button" onClick={() => insertLatexTemplate('$...$')} className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50">
                  Inline
                </button>
                <button type="button" onClick={() => insertLatexTemplate('$$...$$')} className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50">
                  Centrata
                </button>
                <button type="button" onClick={() => insertLatexTemplate('$\\frac{...}{...}$')} className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50">
                  Frazione
                </button>
                <button type="button" onClick={() => insertLatexTemplate('$\\sqrt{...}$')} className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50">
                  Radice
                </button>
                <button type="button" onClick={() => insertLatexTemplate('$x^{...}$')} className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50">
                  Potenza
                </button>
              </div>
            </div>
            
            {/* HTML Section */}
            <div>
              <p className={`font-medium ${colors.text.primary} mb-2`}>📝 Formattazione HTML</p>
              <div className={`space-y-1.5 ${colors.text.secondary}`}>
                <p><code className="px-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">&lt;sub&gt;2&lt;/sub&gt;</code> → pedice (H₂O)</p>
                <p><code className="px-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">&lt;sup&gt;2&lt;/sup&gt;</code> → apice (x²)</p>
                <p><code className="px-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">&lt;b&gt;testo&lt;/b&gt;</code> → <b>grassetto</b></p>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <button type="button" onClick={() => insertLatexTemplate('<sub>...</sub>')} className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50">
                  Pedice
                </button>
                <button type="button" onClick={() => insertLatexTemplate('<sup>...</sup>')} className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50">
                  Apice
                </button>
                <button type="button" onClick={() => insertLatexTemplate('<b>...</b>')} className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50">
                  Grassetto
                </button>
                <button type="button" onClick={() => insertLatexTemplate('<i>...</i>')} className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50">
                  Corsivo
                </button>
              </div>
            </div>
          </div>
          
          <p className={`mt-3 text-xs ${colors.text.muted}`}>
            💡 Esempi: <code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">$x^2 + y^2 = r^2$</code> • <code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">H&lt;sub&gt;2&lt;/sub&gt;O</code> • <code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">{'$\\frac{a}{b}$'}</code>
          </p>
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        minLength={minLength}
        disabled={disabled}
        className={`w-full px-4 py-3 rounded-lg border ${
          error ? 'border-red-500' : colors.border.primary
        } ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-colors resize-y disabled:opacity-50 disabled:cursor-not-allowed`}
      />

      {/* Live Preview */}
      {showLivePreview && value && (
        <div className={`mt-3 p-4 rounded-lg ${colors.background.secondary} border ${colors.border.primary}`}>
          <p className={`text-xs font-medium ${colors.text.muted} mb-2`}>Anteprima:</p>
          <div className={`${colors.text.primary}`}>
            <RichTextRenderer text={value} />
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
