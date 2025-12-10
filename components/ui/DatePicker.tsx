'use client';

import { useState, useRef, useEffect } from 'react';
import { colors } from '@/lib/theme/colors';

interface DatePickerProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  hasError?: boolean;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
}

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const GIORNI_SETTIMANA = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'];

export default function DatePicker({
  id,
  value,
  onChange,
  onBlur,
  required = false,
  hasError = false,
  placeholder = 'Seleziona data',
  minYear = 1920,
  maxYear = new Date().getFullYear() - 14,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      // Parse date carefully to avoid timezone issues
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    // Default to 18 years ago for birth date picker
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d;
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const yearListRef = useRef<HTMLDivElement>(null);

  // Parse current value carefully
  const selectedDate = value ? (() => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  })() : null;

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowMonthPicker(false);
        setShowYearPicker(false);
        onBlur?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onBlur]);

  // Scroll to current year when year picker opens
  useEffect(() => {
    if (showYearPicker && yearListRef.current) {
      const currentYearEl = yearListRef.current.querySelector('[data-current-year]');
      currentYearEl?.scrollIntoView({ block: 'center' });
    }
  }, [showYearPicker]);

  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, adjust for Monday start)
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days: (number | null)[] = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  // Navigate months
  const prevMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const nextMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  // Handle month/year change
  const handleMonthSelect = (month: number) => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setMonth(month);
      return d;
    });
    setShowMonthPicker(false);
  };

  const handleYearSelect = (year: number) => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setFullYear(year);
      return d;
    });
    setShowYearPicker(false);
  };

  // Handle day selection
  const handleDayClick = (day: number) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
    // Don't call onBlur immediately - React state update is async
    // The validation will happen on form submit or when user clicks elsewhere
  };

  // Check if a day is selected
  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === viewDate.getMonth() &&
      selectedDate.getFullYear() === viewDate.getFullYear()
    );
  };

  // Check if a day is today
  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === viewDate.getMonth() &&
      today.getFullYear() === viewDate.getFullYear()
    );
  };

  // Format displayed date
  const formatDisplayDate = () => {
    if (!selectedDate) return '';
    const day = selectedDate.getDate();
    const month = MESI[selectedDate.getMonth()];
    const year = selectedDate.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Generate year options
  const years = [];
  for (let y = maxYear; y >= minYear; y--) {
    years.push(y);
  }

  const baseInputClass = `block w-full px-4 py-2.5 text-base ${colors.background.input} ${colors.text.primary} border rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-all cursor-pointer`;
  const inputClass = hasError
    ? `${baseInputClass} border-red-500 focus:ring-red-500`
    : `${baseInputClass} ${colors.border.primary} focus:ring-[#A01B3B]`;

  return (
    <div ref={containerRef} className="relative">
      {/* Input Field */}
      <div
        id={id}
        role="button"
        tabIndex={0}
        onClick={() => {
          setIsOpen(!isOpen);
          setShowMonthPicker(false);
          setShowYearPicker(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`${inputClass} flex items-center justify-between`}
      >
        <span className={value ? colors.text.primary : colors.text.muted}>
          {value ? formatDisplayDate() : placeholder}
        </span>
        <svg 
          className={`w-5 h-5 ${colors.text.secondary} transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      {/* Calendar Dropdown */}
      {isOpen && (
        <div className={`absolute z-50 mt-2 w-full min-w-[320px] ${colors.background.card} border ${colors.border.primary} rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200`}>
          {/* Header with Month/Year selectors */}
          <div className={`p-4 border-b ${colors.border.primary} bg-gradient-to-r from-[#A01B3B]/10 to-transparent`}>
            <div className="flex items-center justify-between gap-2">
              {/* Previous Month */}
              <button
                type="button"
                onClick={prevMonth}
                className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${colors.text.secondary}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Month/Year Display - Clickable */}
              <div className="flex items-center gap-2">
                {/* Month Picker Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMonthPicker(!showMonthPicker);
                      setShowYearPicker(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} text-sm font-semibold hover:bg-white/10 transition-colors flex items-center gap-1`}
                  >
                    {MESI[viewDate.getMonth()]}
                    <svg className={`w-4 h-4 transition-transform ${showMonthPicker ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Month Dropdown */}
                  {showMonthPicker && (
                    <div className={`absolute top-full left-0 mt-1 w-36 ${colors.background.card} border ${colors.border.primary} rounded-lg shadow-xl overflow-hidden z-10`}>
                      <div className="max-h-48 overflow-y-auto">
                        {MESI.map((mese, idx) => (
                          <button
                            key={mese}
                            type="button"
                            onClick={() => handleMonthSelect(idx)}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors
                              ${viewDate.getMonth() === idx 
                                ? `${colors.primary.bg} text-white font-semibold` 
                                : `${colors.text.primary} hover:bg-white/10`
                              }
                            `}
                          >
                            {mese}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Year Picker Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowYearPicker(!showYearPicker);
                      setShowMonthPicker(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} text-sm font-semibold hover:bg-white/10 transition-colors flex items-center gap-1`}
                  >
                    {viewDate.getFullYear()}
                    <svg className={`w-4 h-4 transition-transform ${showYearPicker ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Year Dropdown */}
                  {showYearPicker && (
                    <div className={`absolute top-full right-0 mt-1 w-24 ${colors.background.card} border ${colors.border.primary} rounded-lg shadow-xl overflow-hidden z-10`}>
                      <div ref={yearListRef} className="max-h-48 overflow-y-auto">
                        {years.map(year => (
                          <button
                            key={year}
                            type="button"
                            data-current-year={year === viewDate.getFullYear() ? true : undefined}
                            onClick={() => handleYearSelect(year)}
                            className={`w-full px-3 py-2 text-center text-sm transition-colors
                              ${viewDate.getFullYear() === year 
                                ? `${colors.primary.bg} text-white font-semibold` 
                                : `${colors.text.primary} hover:bg-white/10`
                              }
                            `}
                          >
                            {year}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Next Month */}
              <button
                type="button"
                onClick={nextMonth}
                className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${colors.text.secondary}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-4">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {GIORNI_SETTIMANA.map(giorno => (
                <div 
                  key={giorno} 
                  className={`text-center text-xs font-semibold ${colors.text.muted} py-2`}
                >
                  {giorno}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays().map((day, idx) => (
                <div key={idx} className="aspect-square">
                  {day !== null ? (
                    <button
                      type="button"
                      onClick={() => handleDayClick(day)}
                      className={`
                        w-full h-full flex items-center justify-center rounded-lg text-sm font-medium
                        transition-all duration-150
                        ${isSelected(day) 
                          ? `${colors.primary.bg} text-white shadow-lg scale-105` 
                          : isToday(day)
                            ? `border-2 border-[#A01B3B] ${colors.text.primary}`
                            : `${colors.text.secondary} hover:bg-white/10`
                        }
                      `}
                    >
                      {day}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Footer with quick actions */}
          <div className={`px-4 py-3 border-t ${colors.border.primary} flex justify-between items-center`}>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`text-sm ${colors.text.muted} hover:text-white transition-colors`}
            >
              Cancella
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={`px-4 py-1.5 rounded-lg ${colors.primary.bg} text-white text-sm font-medium hover:opacity-90 transition-opacity`}
            >
              Conferma
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
