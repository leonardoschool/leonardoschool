'use client';

import type { ReactNode } from 'react';
import { colors } from '@/lib/theme/colors';

type ToolbarButtonProps = {
  title: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
};

type ColorOption = {
  label: string;
  value: string;
};

type ColorMenuProps = {
  title: string;
  icon: ReactNode;
  options: readonly ColorOption[];
  isOpen: boolean;
  selectedColor?: string;
  onToggle: () => void;
  onSelect: (color: string) => void;
};

export function ToolbarButton({ title, onClick, active = false, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`h-9 w-9 inline-flex items-center justify-center rounded-lg border hover:opacity-80 transition-colors ${
        active
          ? `${colors.primary.bg} text-white border-transparent shadow-sm`
          : `${colors.background.secondary} ${colors.icon.interactive} ${colors.border.primary}`
      }`}
    >
      {children}
    </button>
  );
}

export function ToolbarDivider() {
  return <span aria-hidden="true" className={`h-8 w-px ${colors.background.tertiary}`} />;
}

export function ColorMenu({ title, icon, options, isOpen, selectedColor, onToggle, onSelect }: ColorMenuProps) {
  return (
    <div className="relative">
      {/* Custom trigger that shows a color-strip indicator below the icon */}
      <button
        type="button"
        title={title}
        aria-label={title}
        aria-pressed={isOpen}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onToggle}
        className={`h-9 w-9 relative inline-flex flex-col items-center justify-center rounded-lg border hover:opacity-80 transition-colors overflow-hidden ${
          isOpen
            ? `${colors.primary.bg} text-white border-transparent shadow-sm`
            : `${colors.background.secondary} ${colors.icon.interactive} ${colors.border.primary}`
        }`}
      >
        <span className="flex items-center justify-center flex-1 pb-0.5">{icon}</span>
        <span
          aria-hidden="true"
          className="w-full block"
          style={{
            height: '5px',
            backgroundColor: isOpen ? 'rgba(255,255,255,0.5)' : (selectedColor ?? 'transparent'),
          }}
        />
      </button>
      {isOpen && (
        <div className={`absolute left-0 z-50 mt-2 flex flex-wrap gap-2 rounded-xl border ${colors.border.primary} ${colors.background.card} ${colors.effects.shadow.xl} p-3 w-max max-w-[220px]`}>
          {options.map((option) => (
            <button
              key={`${title}-${option.value}`}
              type="button"
              title={option.label}
              aria-label={`${title}: ${option.label}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(option.value)}
              className={`h-7 w-7 rounded-full focus:outline-none focus:ring-2 focus:ring-red-700 ${
                selectedColor === option.value ? 'ring-2 ring-offset-1 ring-gray-500' : ''
              }`}
              style={{
                backgroundColor: option.value,
                border: '2px solid rgba(0,0,0,0.2)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4)',
              }}
            >
              <span className="sr-only">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}