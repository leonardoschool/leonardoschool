'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { colors } from '@/lib/theme/colors';
import { ChevronDown, ChevronUp, Keyboard } from 'lucide-react';

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
}: TextareaWithSymbolsProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div className={className}>
      {label && (
        <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
          {label}
        </label>
      )}
      
      {/* Toolbar */}
      <div className={`flex items-center justify-between mb-2`}>
        <SymbolKeyboard onInsert={handleInsertSymbol} />
        {maxLength && (
          <span className={`text-xs ${value.length > maxLength ? 'text-red-500' : colors.text.muted}`}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>

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

      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
