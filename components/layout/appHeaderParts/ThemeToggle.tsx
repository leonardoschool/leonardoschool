'use client';

import { useRef, useEffect } from 'react';
import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { colors } from '@/lib/theme/colors';
import type { Theme } from './types';

interface ThemeToggleProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const themeOptions = [
  { value: 'light' as Theme, label: 'Chiaro', icon: Sun },
  { value: 'dark' as Theme, label: 'Scuro', icon: Moon },
  { value: 'system' as Theme, label: 'Sistema', icon: Monitor },
];

function getThemeIcon(theme: Theme) {
  if (theme === 'dark') return Moon;
  if (theme === 'light') return Sun;
  return Monitor;
}

export function ThemeToggle({
  isOpen,
  onClose,
  onToggle,
  currentTheme,
  onThemeChange,
}: ThemeToggleProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const CurrentIcon = getThemeIcon(currentTheme);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className={`p-1.5 sm:p-2 rounded-lg ${colors.effects.hover.bgSubtle} ${colors.icon.interactive} transition-colors`}
        title="Cambia tema"
      >
        <CurrentIcon className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className={`absolute right-0 mt-2 w-40 ${colors.background.card} rounded-xl shadow-lg border ${colors.border.primary} py-1 z-50`}>
          {themeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onThemeChange(option.value)}
              className={`w-full px-4 py-2 flex items-center gap-3 text-sm ${colors.text.primary} ${colors.effects.hover.bgSubtle} transition-colors ${
                currentTheme === option.value ? colors.primary.text : colors.icon.primary
              }`}
            >
              <option.icon className="w-4 h-4" />
              {option.label}
              {currentTheme === option.value && (
                <Check className={`w-4 h-4 ml-auto ${colors.primary.text}`} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
