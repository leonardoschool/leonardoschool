'use client';

import { useState } from 'react';
import { colors } from '@/lib/theme/colors';
import {
  Bold,
  ChevronDown,
  ChevronUp,
  Code2,
  CornerDownLeft,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Subscript,
  Superscript,
  Table2,
  Underline,
} from 'lucide-react';

interface HtmlShortcutMenuProps {
  onInsert: (snippet: string) => void;
  compact?: boolean;
}

const htmlShortcuts = [
  { label: 'Grassetto', snippet: '<b>testo</b>', icon: Bold },
  { label: 'Corsivo', snippet: '<i>testo</i>', icon: Italic },
  { label: 'Sottolineato', snippet: '<u>testo</u>', icon: Underline },
  { label: 'Pedice', snippet: '<sub>2</sub>', icon: Subscript },
  { label: 'Apice', snippet: '<sup>2</sup>', icon: Superscript },
  { label: 'Titolo', snippet: '<h3>Titolo</h3>', icon: Heading3 },
  { label: 'Elenco', snippet: '<ul><li>Elemento</li></ul>', icon: List },
  { label: 'Elenco numerato', snippet: '<ol><li>Elemento</li></ol>', icon: ListOrdered },
  { label: 'Citazione', snippet: '<blockquote>Testo</blockquote>', icon: Quote },
  { label: 'Tabella', snippet: '<table><tbody><tr><td>Voce</td><td>Dettaglio</td></tr></tbody></table>', icon: Table2 },
  { label: 'Linea', snippet: '<hr>', icon: Minus },
  { label: 'A capo', snippet: '<br>', icon: CornerDownLeft },
];

export default function HtmlShortcutMenu({ onInsert, compact = false }: HtmlShortcutMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`inline-flex items-center gap-2 rounded-lg border ${colors.border.primary} ${colors.background.secondary} ${colors.text.secondary} hover:${colors.primary.text} transition-colors ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'
        }`}
        aria-expanded={isOpen}
      >
        <Code2 className="w-4 h-4" />
        HTML rapido
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className={`absolute left-0 z-30 mt-2 w-72 rounded-xl border ${colors.border.primary} ${colors.background.card} ${colors.effects.shadow.xl} p-3`}>
          <div className="grid grid-cols-2 gap-2">
            {htmlShortcuts.map((shortcut) => {
              const Icon = shortcut.icon;
              return (
                <button
                  key={shortcut.label}
                  type="button"
                  onClick={() => {
                    onInsert(shortcut.snippet);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-lg border ${colors.border.light} ${colors.background.secondary} px-2.5 py-2 text-left text-xs ${colors.text.secondary} hover:${colors.primary.text} hover:opacity-90 transition-colors`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{shortcut.label}</span>
                </button>
              );
            })}
          </div>
          <p className={`mt-3 text-xs ${colors.text.muted}`}>
            Puoi continuare a scrivere HTML o LaTeX manualmente.
          </p>
        </div>
      )}
    </div>
  );
}
