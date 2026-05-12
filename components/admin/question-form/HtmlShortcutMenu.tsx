'use client';

import { useState } from 'react';
import { colors } from '@/lib/theme/colors';
import {
  AlignJustify,
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
  Plus,
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

const baseShortcuts = [
  { label: 'Grassetto', snippet: '<b>testo</b>', icon: Bold },
  { label: 'Corsivo', snippet: '<i>testo</i>', icon: Italic },
  { label: 'Sottolineato', snippet: '<u>testo</u>', icon: Underline },
  { label: 'Pedice', snippet: '<sub>2</sub>', icon: Subscript },
  { label: 'Apice', snippet: '<sup>2</sup>', icon: Superscript },
  { label: 'Titolo', snippet: '<h3>Titolo</h3>', icon: Heading3 },
  { label: 'Giustifica', snippet: '<p style="text-align: justify;">testo</p>', icon: AlignJustify },
  { label: 'Citazione', snippet: '<blockquote>Testo</blockquote>', icon: Quote },
  { label: 'Linea', snippet: '<hr>', icon: Minus },
  { label: 'A capo', snippet: '<br>', icon: CornerDownLeft },
];

const listShortcuts = [
  { label: 'Elenco', snippet: '<ul>\n  <li>Elemento 1</li>\n  <li>Elemento 2</li>\n</ul>', icon: List },
  { label: 'Elenco numerato', snippet: '<ol>\n  <li>Elemento 1</li>\n  <li>Elemento 2</li>\n</ol>', icon: ListOrdered },
  { label: '+ Punto lista', snippet: '<li>Nuovo elemento</li>', icon: Plus, hint: 'Aggiungi dentro un <ul> o <ol> esistente' },
];

const tableShortcuts = [
  { label: 'Tabella', snippet: '<table>\n  <thead><tr><th>Intestazione 1</th><th>Intestazione 2</th></tr></thead>\n  <tbody>\n    <tr><td>Voce</td><td>Dettaglio</td></tr>\n  </tbody>\n</table>', icon: Table2 },
  { label: '+ Riga tabella', snippet: '<tr><td>Voce</td><td>Dettaglio</td></tr>', icon: Plus, hint: 'Aggiungi dentro un <tbody> esistente' },
];

export default function HtmlShortcutMenu({ onInsert, compact = false }: HtmlShortcutMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const renderButton = (shortcut: { label: string; snippet: string; icon: React.ElementType; hint?: string }) => {
    const Icon = shortcut.icon;
    return (
      <button
        key={shortcut.label}
        type="button"
        title={shortcut.hint}
        onClick={() => {
          onInsert(shortcut.snippet);
          setIsOpen(false);
        }}
        className={`flex items-center gap-2 rounded-lg border ${colors.border.light} ${colors.background.secondary} px-2.5 py-2 text-left text-xs ${colors.text.secondary} hover:${colors.primary.text} hover:opacity-90 transition-colors`}
      >
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="leading-tight">{shortcut.label}</span>
      </button>
    );
  };

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
        <div className={`absolute left-0 z-30 mt-2 w-80 rounded-xl border ${colors.border.primary} ${colors.background.card} ${colors.effects.shadow.xl} p-3 space-y-3`}>
          {/* Base shortcuts */}
          <div className="grid grid-cols-2 gap-2">
            {baseShortcuts.map(renderButton)}
          </div>

          {/* List shortcuts */}
          <div>
            <p className={`text-xs font-medium ${colors.text.muted} mb-1.5 uppercase tracking-wide`}>Elenchi</p>
            <div className="grid grid-cols-2 gap-2">
              {listShortcuts.map(renderButton)}
            </div>
            <p className={`mt-1 text-xs ${colors.text.muted}`}>
              Per aggiungere un punto: posizionati dopo l&apos;ultimo <code className="font-mono">&lt;/li&gt;</code> e usa &quot;+ Punto lista&quot;
            </p>
          </div>

          {/* Table shortcuts */}
          <div>
            <p className={`text-xs font-medium ${colors.text.muted} mb-1.5 uppercase tracking-wide`}>Tabelle</p>
            <div className="grid grid-cols-2 gap-2">
              {tableShortcuts.map(renderButton)}
            </div>
            <p className={`mt-1 text-xs ${colors.text.muted}`}>
              Per aggiungere una riga: posizionati dopo l&apos;ultimo <code className="font-mono">&lt;/tr&gt;</code> e usa &quot;+ Riga tabella&quot;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
