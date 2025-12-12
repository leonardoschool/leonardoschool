'use client';

import { useState, useRef, useEffect } from 'react';
import { colors } from '@/lib/theme/colors';
import { Calendar, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DateTimePickerProps {
  id?: string;
  value: string; // ISO datetime-local format: "YYYY-MM-DDTHH:mm"
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  hasError?: boolean;
  placeholder?: string;
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  disabled?: boolean;
}

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const MESI_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

const GIORNI_SETTIMANA = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'];

export default function DateTimePicker({
  id,
  value,
  onChange,
  onBlur,
  required: _required = false,
  hasError = false,
  placeholder = 'Seleziona data e ora',
  minDate,
  maxDate,
  disabled = false,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      return new Date(value);
    }
    return new Date();
  });
  
  // Parse current value
  const selectedDate = value ? new Date(value) : null;
  const selectedHour = selectedDate ? selectedDate.getHours() : 9;
  const selectedMinute = selectedDate ? selectedDate.getMinutes() : 0;
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        onBlur?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onBlur]);

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
    const daysInPrevMonth = getDaysInMonth(year, month - 1);
    
    const days: { day: number; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean; isDisabled: boolean; date: Date }[] = [];
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(year, month - 1, day);
      days.push({
        day,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        isDisabled: isDateDisabled(date),
        date,
      });
    }
    
    // Current month days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = 
        day === today.getDate() && 
        month === today.getMonth() && 
        year === today.getFullYear();
      const isSelected = selectedDate
        ? day === selectedDate.getDate() &&
          month === selectedDate.getMonth() &&
          year === selectedDate.getFullYear()
        : false;
      
      days.push({
        day,
        isCurrentMonth: true,
        isToday,
        isSelected,
        isDisabled: isDateDisabled(date),
        date,
      });
    }
    
    // Next month days
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        day,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        isDisabled: isDateDisabled(date),
        date,
      });
    }
    
    return days;
  };

  const isDateDisabled = (date: Date) => {
    if (minDate) {
      const min = new Date(minDate);
      min.setHours(0, 0, 0, 0);
      if (date < min) return true;
    }
    if (maxDate) {
      const max = new Date(maxDate);
      max.setHours(23, 59, 59, 999);
      if (date > max) return true;
    }
    return false;
  };

  const handleDayClick = (date: Date) => {
    if (isDateDisabled(date)) return;
    
    const newDate = new Date(date);
    newDate.setHours(selectedHour, selectedMinute, 0, 0);
    
    // Format as datetime-local value
    const formatted = formatDateTimeLocal(newDate);
    onChange(formatted);
  };

  const handleTimeChange = (hours: number, minutes: number) => {
    if (!selectedDate) {
      // If no date selected, use today
      const today = new Date();
      today.setHours(hours, minutes, 0, 0);
      onChange(formatDateTimeLocal(today));
    } else {
      const newDate = new Date(selectedDate);
      newDate.setHours(hours, minutes, 0, 0);
      onChange(formatDateTimeLocal(newDate));
    }
  };

  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatDisplayValue = () => {
    if (!selectedDate) return '';
    const day = selectedDate.getDate();
    const month = MESI_SHORT[selectedDate.getMonth()];
    const year = selectedDate.getFullYear();
    const hours = String(selectedDate.getHours()).padStart(2, '0');
    const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  };

  const goToPreviousMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const days = generateCalendarDays();

  return (
    <div ref={containerRef} className="relative">
      {/* Input button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full px-4 py-2 rounded-lg border text-left flex items-center gap-2 transition-all
          ${hasError 
            ? 'border-red-500 focus:ring-red-500/30' 
            : `${colors.border.light} focus:border-[#a8012b] focus:ring-2 focus:ring-[#a8012b]/20`
          }
          ${colors.background.input} ${colors.text.primary}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#a8012b]/50'}
        `}
      >
        <Calendar className={`w-4 h-4 flex-shrink-0 ${value ? colors.text.primary : colors.text.muted}`} />
        <span className={`flex-1 truncate ${value ? colors.text.primary : colors.text.muted}`}>
          {value ? formatDisplayValue() : placeholder}
        </span>
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className={`p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${colors.text.muted}`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute z-50 mt-1 w-80 ${colors.background.card} rounded-xl shadow-xl border ${colors.border.primary} overflow-hidden`}>
          {/* Calendar Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${colors.border.light}`}>
            <button
              type="button"
              onClick={goToPreviousMonth}
              className={`p-1 rounded-lg ${colors.effects.hover.bgSubtle}`}
            >
              <ChevronLeft className={`w-5 h-5 ${colors.text.primary}`} />
            </button>
            <span className={`font-semibold ${colors.text.primary}`}>
              {MESI[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className={`p-1 rounded-lg ${colors.effects.hover.bgSubtle}`}
            >
              <ChevronRight className={`w-5 h-5 ${colors.text.primary}`} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 px-2 py-2">
            {GIORNI_SETTIMANA.map((giorno) => (
              <div key={giorno} className={`text-center text-xs font-medium ${colors.text.muted}`}>
                {giorno}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1 px-2 pb-2">
            {days.map((day, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleDayClick(day.date)}
                disabled={day.isDisabled}
                className={`
                  w-9 h-9 rounded-lg text-sm font-medium transition-colors flex items-center justify-center
                  ${day.isDisabled 
                    ? 'opacity-30 cursor-not-allowed' 
                    : 'cursor-pointer hover:bg-[#a8012b]/10'
                  }
                  ${!day.isCurrentMonth ? 'opacity-40' : ''}
                  ${day.isSelected 
                    ? 'bg-[#a8012b] text-white hover:bg-[#a8012b]' 
                    : day.isToday 
                      ? `border border-[#a8012b] ${colors.text.primary}` 
                      : colors.text.primary
                  }
                `}
              >
                {day.day}
              </button>
            ))}
          </div>

          {/* Time picker */}
          <div className={`border-t ${colors.border.light} px-4 py-3`}>
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${colors.text.muted}`} />
              <span className={`text-sm font-medium ${colors.text.secondary}`}>Orario:</span>
              <div className="flex items-center gap-1 flex-1 justify-end">
                <select
                  value={selectedHour}
                  onChange={(e) => handleTimeChange(parseInt(e.target.value), selectedMinute)}
                  className={`px-2 py-1 rounded border ${colors.border.light} ${colors.background.input} ${colors.text.primary} text-sm`}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <span className={colors.text.muted}>:</span>
                <select
                  value={selectedMinute}
                  onChange={(e) => handleTimeChange(selectedHour, parseInt(e.target.value))}
                  className={`px-2 py-1 rounded border ${colors.border.light} ${colors.background.input} ${colors.text.primary} text-sm`}
                >
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                    <option key={minute} value={minute}>
                      {String(minute).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={`border-t ${colors.border.light} px-4 py-2 flex justify-between`}>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                onChange(formatDateTimeLocal(now));
              }}
              className={`text-sm ${colors.primary.text} hover:underline`}
            >
              Adesso
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={`px-3 py-1 text-sm font-medium rounded-lg ${colors.primary.gradient} text-white`}
            >
              Conferma
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
