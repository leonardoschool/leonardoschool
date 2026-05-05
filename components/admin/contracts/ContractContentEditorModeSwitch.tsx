'use client';

import { Code2, Eye, Type } from 'lucide-react';
import { colors } from '@/lib/theme/colors';

type EditorMode = 'visual' | 'html' | 'preview';

type ContractContentEditorModeSwitchProps = {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
};

export function ContractContentEditorModeSwitch({ mode, onModeChange }: ContractContentEditorModeSwitchProps) {
  const modeButtonClass = (targetMode: EditorMode) =>
    `inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      mode === targetMode
        ? `${colors.primary.bg} text-white`
        : `${colors.background.secondary} ${colors.text.secondary} hover:opacity-80`
    }`;

  return (
    <div className={`inline-flex items-center gap-1 p-1 rounded-xl ${colors.background.secondary} self-start sm:self-auto`}>
      <button type="button" onClick={() => onModeChange('visual')} className={modeButtonClass('visual')}>
        <Type className="w-4 h-4" />
        Visuale
      </button>
      <button type="button" onClick={() => onModeChange('html')} className={modeButtonClass('html')}>
        <Code2 className="w-4 h-4" />
        HTML
      </button>
      <button type="button" onClick={() => onModeChange('preview')} className={modeButtonClass('preview')}>
        <Eye className="w-4 h-4" />
        Anteprima
      </button>
    </div>
  );
}