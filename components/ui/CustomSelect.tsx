'use client';

import { useState, useRef, useEffect } from 'react';
import { colors } from '@/lib/theme/colors';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  id?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
  dropdownClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function CustomSelect({
  id,
  value,
  options,
  onChange,
  onBlur,
  placeholder = 'Seleziona...',
  hasError = false,
  disabled = false,
  searchable = false,
  className = '',
  dropdownClassName = '',
  size = 'md',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Find selected option
  const selectedOption = options.find(opt => opt.value === value);

  // Filter options based on search
  const filteredOptions = searchable && searchTerm
    ? options.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opt.value.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        onBlur?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onBlur]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-option]');
      items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        }
        break;
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const toggleOpen = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        // Find and highlight current value
        const currentIndex = filteredOptions.findIndex(opt => opt.value === value);
        setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
      }
    }
  };

  // Size variants
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-5 py-3.5 text-lg',
  };

  const baseClass = `w-full ${sizeClasses[size]} ${colors.background.input} ${colors.text.primary} border rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-all cursor-pointer flex items-center justify-between`;
  
  const inputClass = hasError
    ? `${baseClass} border-red-500 focus:ring-red-500`
    : disabled
      ? `${baseClass} ${colors.border.primary} opacity-50 cursor-not-allowed`
      : `${baseClass} ${colors.border.primary} focus:ring-[#A01B3B] hover:border-gray-500`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <div
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        tabIndex={disabled ? -1 : 0}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        className={inputClass}
      >
        <span className={selectedOption ? colors.text.primary : colors.text.muted}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg 
          className={`w-5 h-5 ${colors.text.secondary} transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className={`absolute z-50 mt-2 w-full ${colors.background.card} border ${colors.border.primary} rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 ${dropdownClassName}`}
        >
          {/* Search Input */}
          {searchable && (
            <div className={`p-3 border-b ${colors.border.primary}`}>
              <div className="relative">
                <svg 
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${colors.text.muted}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  placeholder="Cerca..."
                  className={`w-full pl-10 pr-4 py-2 ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A01B3B]`}
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div 
            ref={listRef}
            id={`${id}-listbox`}
            role="listbox"
            className="max-h-60 overflow-y-auto overscroll-contain"
          >
            {filteredOptions.length === 0 ? (
              <div className={`px-4 py-3 text-sm ${colors.text.muted} text-center`}>
                Nessun risultato
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;
                
                return (
                  <div
                    key={option.value}
                    data-option
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`
                      px-4 py-3 cursor-pointer transition-colors duration-100 flex items-center justify-between
                      ${isSelected 
                        ? `${colors.primary.bg} text-white` 
                        : isHighlighted
                          ? 'bg-white/10'
                          : `${colors.text.primary} hover:bg-white/5`
                      }
                    `}
                  >
                    <span className="font-medium">{option.label}</span>
                    {isSelected && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
