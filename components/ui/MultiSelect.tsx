'use client';

/**
 * MultiSelect — Dropdown with checkbox items for multi-value selection.
 * Styled to match CustomSelect.
 */

import { useState, useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { colors } from '@/lib/theme/colors';

export interface MultiSelectOption {
  value: string;
  label: string;
  /** Optional hex color to render a swatch next to the label */
  color?: string | null;
}

export interface MultiSelectProps {
  id?: string;
  values: string[];
  options: MultiSelectOption[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function MultiSelect({
  id,
  values,
  options,
  onChange,
  placeholder = 'Seleziona...',
  disabled = false,
  className = '',
  label,
  size = 'md',
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    openUpward: false,
  });
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const internalId = useId();
  const listboxId = `${id ?? internalId}-listbox`;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const updateDropdownPosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownHeight = 280;
      const spaceBelow = globalThis.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      setDropdownPosition({
        top: openUpward ? rect.top - 8 : rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        openUpward,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      globalThis.addEventListener('scroll', updateDropdownPosition, true);
      globalThis.addEventListener('resize', updateDropdownPosition);
      return () => {
        globalThis.removeEventListener('scroll', updateDropdownPosition, true);
        globalThis.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [isOpen, updateDropdownPosition]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      const dropdowns = document.querySelectorAll('[data-multi-select-dropdown]');
      for (const dropdown of dropdowns) {
        if (dropdown.contains(target)) return;
      }
      setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleOpen = () => {
    if (!disabled) setIsOpen((prev) => !prev);
  };

  const toggleOption = (value: string) => {
    onChange(
      values.includes(value) ? values.filter((v) => v !== value) : [...values, value]
    );
  };

  // Build trigger label
  const triggerLabel = (() => {
    if (values.length === 0) return null;
    if (values.length === 1) {
      return options.find((o) => o.value === values[0])?.label ?? null;
    }
    return `${values.length} selezionati`;
  })();

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-5 py-3.5 text-lg',
  };

  const baseClass = [
    'w-full',
    sizeClasses[size],
    colors.background.input,
    colors.text.primary,
    'border rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-all cursor-pointer flex items-center justify-between gap-2',
  ].join(' ');

  const triggerClass = disabled
    ? `${baseClass} ${colors.border.primary} opacity-50 cursor-not-allowed`
    : `${baseClass} ${colors.border.primary} focus:ring-[#A01B3B] hover:border-gray-500`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
          {label}
        </label>
      )}

      {/* Trigger */}
      <div
        ref={triggerRef}
        id={id}
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleOpen();
          }
          if (e.key === 'Escape') setIsOpen(false);
        }}
        className={triggerClass}
      >
        <span className={`truncate ${triggerLabel ? colors.text.primary : colors.text.muted}`}>
          {triggerLabel ?? placeholder}
        </span>
        <svg
          className={`w-5 h-5 shrink-0 ${colors.text.secondary} transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown via Portal */}
      {isOpen && isMounted && createPortal(
        <div
          data-multi-select-dropdown
          className={`fixed z-[9999] ${colors.background.card} border ${colors.border.primary} rounded-xl shadow-2xl overflow-hidden`}
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            ...(dropdownPosition.openUpward && { transform: 'translateY(-100%)' }),
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Clear all button */}
          {values.length > 0 && (
            <div className={`flex items-center justify-end px-3 py-1.5 border-b ${colors.border.primary}`}>
              <button
                type="button"
                onClick={() => onChange([])}
                className={`text-xs ${colors.text.muted} hover:${colors.text.secondary} transition-colors`}
              >
                Deseleziona tutto
              </button>
            </div>
          )}

          {/* Options */}
          <div role="listbox" id={listboxId} aria-multiselectable="true" className="max-h-60 overflow-y-auto overscroll-contain">
            {options.map((option) => {
              const isSelected = values.includes(option.value);
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggleOption(option.value)}
                  className={`px-4 py-2.5 cursor-pointer transition-colors duration-100 flex items-center gap-3 ${
                    isSelected
                      ? `${colors.background.secondary}`
                      : `${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-700`
                  }`}
                >
                  {/* Checkbox */}
                  <span
                    className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-[#A01B3B] border-[#A01B3B]'
                        : `border-gray-400 dark:border-gray-500 ${colors.background.input}`
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>

                  {/* Color swatch */}
                  {option.color && (
                    <span
                      className="w-3 h-3 shrink-0 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                  )}

                  <span className={`text-sm ${isSelected ? colors.text.primary : ''}`}>
                    {option.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
