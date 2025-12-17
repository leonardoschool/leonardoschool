/**
 * Calendar Component
 * Componente calendario riutilizzabile con viste mese/settimana/giorno
 */

'use client';

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { colors } from '@/lib/theme/colors';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Video,
  Users,
  Plus,
  Star,
} from 'lucide-react';

// Types
export interface EventInvitation {
  id: string;
  status?: string;
  user?: { id: string; name: string; email: string } | null;
  group?: { id: string; name: string } | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  type: 'LESSON' | 'SIMULATION' | 'MEETING' | 'EXAM' | 'OTHER';
  startDate: Date | string;
  endDate: Date | string;
  isAllDay: boolean;
  locationType: 'ONLINE' | 'IN_PERSON' | 'HYBRID';
  locationDetails?: string | null;
  onlineLink?: string | null;
  isCancelled: boolean;
  isMine?: boolean; // Evento creato dall'utente o a cui è invitato
  createdBy?: {
    id: string;
    name: string;
  };
  invitations?: EventInvitation[];
  _count?: {
    invitations: number;
    attendances: number;
  };
}

export type CalendarView = 'month' | 'week' | 'day';

interface CalendarProps {
  events: CalendarEvent[];
  view?: CalendarView;
  onViewChange?: (view: CalendarView) => void;
  onDateChange?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onAddEvent?: (date: Date) => void;
  selectedDate?: Date;
  isLoading?: boolean;
}

// Event type colors
const eventTypeColors: Record<CalendarEvent['type'], { bg: string; text: string; border: string }> = {
  LESSON: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-800 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700',
  },
  SIMULATION: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-800 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-700',
  },
  MEETING: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
  },
  EXAM: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700',
  },
  OTHER: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-800 dark:text-gray-300',
    border: 'border-gray-300 dark:border-gray-600',
  },
};

const eventTypeLabels: Record<CalendarEvent['type'], string> = {
  LESSON: 'Lezione',
  SIMULATION: 'Simulazione',
  MEETING: 'Riunione',
  EXAM: 'Esame',
  OTHER: 'Altro',
};

// Helper functions
const getDaysInMonth = (date: Date): Date[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const days: Date[] = [];
  
  // Add days from previous month to fill the first week
  const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday = 0
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }
  
  // Add all days of the month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  
  // Add days from next month to complete the grid (6 rows)
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(year, month + 1, i));
  }
  
  return days;
};

const getWeekDays = (date: Date): Date[] => {
  const days: Date[] = [];
  const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1; // Monday = 0
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek);
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  
  return days;
};

const isSameDay = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const isMultiDayEvent = (event: CalendarEvent): boolean => {
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  return !isSameDay(start, end);
};

const formatDateRange = (event: CalendarEvent): string => {
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  
  if (isSameDay(start, end)) {
    return '';
  }
  
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = MONTHS[start.getMonth()].slice(0, 3);
  const endMonth = MONTHS[end.getMonth()].slice(0, 3);
  
  if (start.getMonth() === end.getMonth()) {
    return `${startDay}-${endDay} ${startMonth}`;
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
};

const isFirstDayOfEvent = (day: Date, event: CalendarEvent): boolean => {
  const eventStart = new Date(event.startDate);
  return isSameDay(day, eventStart);
};

const isLastDayOfEvent = (day: Date, event: CalendarEvent): boolean => {
  const eventEnd = new Date(event.endDate);
  return isSameDay(day, eventEnd);
};

const formatTime = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
};

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

export function Calendar({
  events,
  view = 'month',
  onViewChange,
  onDateChange,
  onEventClick,
  onAddEvent,
  selectedDate: propSelectedDate,
  isLoading = false,
}: CalendarProps) {
  const [internalSelectedDate, setInternalSelectedDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<CalendarView>(view);
  
  const selectedDate = propSelectedDate || internalSelectedDate;
  const activeView = onViewChange ? view : currentView;

  const handleViewChange = (newView: CalendarView) => {
    if (onViewChange) {
      onViewChange(newView);
    } else {
      setCurrentView(newView);
    }
  };

  const handleDateChange = (newDate: Date) => {
    if (onDateChange) {
      onDateChange(newDate);
    } else {
      setInternalSelectedDate(newDate);
    }
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(selectedDate.getMonth() + direction);
    handleDateChange(newDate);
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + direction * 7);
    handleDateChange(newDate);
  };

  const navigateDay = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + direction);
    handleDateChange(newDate);
  };

  const goToToday = () => {
    handleDateChange(new Date());
  };

  // Get events for a specific day
  const getEventsForDay = useMemo(() => {
    return (day: Date): CalendarEvent[] => {
      return events.filter((event) => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);
        
        return eventStart <= dayEnd && eventEnd >= dayStart;
      });
    };
  }, [events]);

  // Month view days
  const monthDays = useMemo(() => getDaysInMonth(selectedDate), [selectedDate]);
  
  // Week view days
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  const today = new Date();

  return (
    <div className={`${colors.background.card} rounded-xl border ${colors.border.primary} overflow-hidden`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${colors.border.primary} flex items-center justify-between flex-wrap gap-3`}>
        <div className="flex items-center gap-3">
          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (activeView === 'month') navigateMonth(-1);
                else if (activeView === 'week') navigateWeek(-1);
                else navigateDay(-1);
              }}
              className={`p-2 rounded-lg ${colors.background.secondary} ${colors.text.primary} hover:${colors.background.tertiary} transition-colors`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (activeView === 'month') navigateMonth(1);
                else if (activeView === 'week') navigateWeek(1);
                else navigateDay(1);
              }}
              className={`p-2 rounded-lg ${colors.background.secondary} ${colors.text.primary} hover:${colors.background.tertiary} transition-colors`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Current period */}
          <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
            {activeView === 'month' && `${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`}
            {activeView === 'week' && (
              <>
                {weekDays[0].getDate()} - {weekDays[6].getDate()} {MONTHS[weekDays[0].getMonth()]} {weekDays[0].getFullYear()}
              </>
            )}
            {activeView === 'day' && (
              <>
                {selectedDate.getDate()} {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </>
            )}
          </h2>

          <button
            onClick={goToToday}
            className={`px-3 py-1.5 text-sm rounded-lg ${colors.background.secondary} ${colors.text.primary} hover:${colors.background.tertiary} transition-colors`}
          >
            Oggi
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* View selector */}
          <div className={`flex rounded-lg ${colors.background.secondary} p-1 gap-1`}>
            {(['month', 'week', 'day'] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => handleViewChange(v)}
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                  activeView === v
                    ? `${colors.primary.bg} text-white`
                    : `hover:${colors.background.tertiary} ${colors.text.secondary}`
                }`}
              >
                {v === 'month' ? 'Mese' : v === 'week' ? 'Settimana' : 'Giorno'}
              </button>
            ))}
          </div>

          {/* Add event button */}
          {onAddEvent && (
            <button
              onClick={() => onAddEvent(selectedDate)}
              className={`px-4 py-2 rounded-lg ${colors.primary.gradient} text-white text-sm font-medium flex items-center gap-2`}
            >
              <Plus className="w-4 h-4" />
              Nuovo
            </button>
          )}
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
          <div className="animate-spin w-8 h-8 border-2 border-[#a8012b] border-t-transparent rounded-full" />
        </div>
      )}

      {/* Month View */}
      {activeView === 'month' && (
        <div className="p-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className={`text-center text-sm font-medium py-2 ${colors.text.secondary}`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day, index) => {
              const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDate);
              const dayEvents = getEventsForDay(day);
              
              // Check if day is in the past
              const isPast = (() => {
                const dayStart = new Date(day);
                dayStart.setHours(0, 0, 0, 0);
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                return dayStart < todayStart;
              })();

              return (
                <div
                  key={index}
                  onClick={() => {
                    handleDateChange(day);
                    // Single click to create event (only if not in past)
                    if (onAddEvent && !isPast) {
                      const clickDate = new Date(day);
                      clickDate.setHours(9, 0, 0, 0); // Default to 9 AM
                      onAddEvent(clickDate);
                    }
                  }}
                  className={`
                    min-h-[100px] p-1 border rounded-lg transition-all group
                    ${isPast ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-[#a8012b]/50'}
                    ${isCurrentMonth ? colors.background.primary : colors.background.secondary + ' opacity-50'}
                    ${isSelected && !isPast ? 'ring-2 ring-[#a8012b]' : colors.border.primary}
                    ${isToday ? 'bg-red-50 dark:bg-red-950/20' : ''}
                    ${isPast ? 'bg-gray-100 dark:bg-gray-900/50' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className={`
                      text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                      ${isToday ? 'bg-[#a8012b] text-white' : isPast ? colors.text.muted + ' line-through' : colors.text.primary}
                    `}>
                      {day.getDate()}
                    </div>
                    {/* Plus icon on hover - only for non-past days */}
                    {onAddEvent && isCurrentMonth && !isPast && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-4 h-4 text-[#a8012b]" />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1 mt-1">
                    {dayEvents.slice(0, 3).map((event) => {
                      const multiDay = isMultiDayEvent(event);
                      const eventStart = new Date(event.startDate);
                      const isFirstDay = isSameDay(day, eventStart);
                      const dateRange = formatDateRange(event);
                      
                      return (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick?.(event);
                          }}
                          className={`
                            px-1.5 py-0.5 rounded text-xs truncate cursor-pointer flex items-center gap-1
                            ${eventTypeColors[event.type].bg}
                            ${eventTypeColors[event.type].text}
                            ${event.isCancelled ? 'line-through opacity-50' : ''}
                            ${event.isMine ? 'ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-gray-900' : ''}
                            ${multiDay && !isFirstDay ? 'opacity-60 border-l-2 border-current' : ''}
                          `}
                          title={multiDay 
                            ? `${event.title} (${dateRange})` 
                            : event.isMine 
                              ? `⭐ ${event.title} (Il tuo evento)` 
                              : event.title
                          }
                        >
                          {event.isMine && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 flex-shrink-0" />}
                          {/* For multi-day events: show INIZIO on first day, FINE on last day, arrow + title on middle days */}
                          {multiDay ? (
                            isFirstDay ? (
                              <>
                                <span className="font-bold text-[10px] uppercase">INIZIO</span>
                                <span className="truncate">- {event.title}</span>
                              </>
                            ) : isLastDayOfEvent(day, event) ? (
                              <>
                                <span className="font-bold text-[10px] uppercase">FINE</span>
                                <span className="truncate">- {event.title}</span>
                              </>
                            ) : (
                              <>
                                <span className="font-medium">→ </span>
                                <span className="truncate">{event.title}</span>
                              </>
                            )
                          ) : (
                            <>
                              {!event.isAllDay && (
                                <span className="font-medium">{formatTime(event.startDate)} </span>
                              )}
                              <span className="truncate">{event.title}</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className={`text-xs ${colors.text.muted} px-1.5`}>
                        +{dayEvents.length - 3} altri
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {activeView === 'week' && (
        <div className="p-4 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Weekday headers */}
            <div className="grid grid-cols-8 gap-1 mb-2">
              <div className="w-16" /> {/* Time column */}
              {weekDays.map((day, index) => {
                const isToday = isSameDay(day, today);
                return (
                  <div
                    key={index}
                    className={`text-center py-2 ${isToday ? 'bg-red-50 dark:bg-red-950/20 rounded-lg' : ''}`}
                  >
                    <div className={`text-sm font-medium ${colors.text.secondary}`}>
                      {WEEKDAYS[index]}
                    </div>
                    <div className={`text-lg font-bold ${isToday ? 'text-[#a8012b]' : colors.text.primary}`}>
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* All day events */}
            <div className="grid grid-cols-8 gap-1 mb-2">
              <div className={`w-16 text-xs ${colors.text.muted} flex items-center`}>Tutto il giorno</div>
              {weekDays.map((day, index) => {
                const dayEvents = getEventsForDay(day).filter((e) => e.isAllDay);
                return (
                  <div key={index} className={`min-h-[40px] p-1 ${colors.background.secondary} rounded`}>
                    {dayEvents.map((event) => {
                      const isMultiDay = isMultiDayEvent(event);
                      const isFirstDay = isFirstDayOfEvent(day, event);
                      const isLastDay = isLastDayOfEvent(day, event);
                      
                      return (
                        <div
                          key={event.id}
                          onClick={() => onEventClick?.(event)}
                          className={`
                            px-2 py-1 rounded text-xs cursor-pointer mb-1 flex flex-col
                            ${eventTypeColors[event.type].bg}
                            ${eventTypeColors[event.type].text}
                            ${event.isMine ? 'ring-2 ring-amber-400' : ''}
                          `}
                          title={event.isMine ? `⭐ ${event.title} (Il tuo evento)` : event.title}
                        >
                          <div className="flex items-center gap-1 truncate">
                            {event.isMine && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 flex-shrink-0" />}
                            <span className="truncate">{event.title}</span>
                          </div>
                          {isMultiDay && isFirstDay && (
                            <span className="text-[10px] opacity-75">Inizio: {formatTime(event.startDate)}</span>
                          )}
                          {isMultiDay && isLastDay && (
                            <span className="text-[10px] opacity-75">Fine: {formatTime(event.endDate)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Time slots */}
            <div className="space-y-0">
              {Array.from({ length: 24 }, (_, hour) => (
                <div key={hour} className="grid grid-cols-8 gap-1">
                  <div className={`w-16 text-xs ${colors.text.muted} text-right pr-2 -mt-2`}>
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  {weekDays.map((day, dayIndex) => {
                    const dayEvents = getEventsForDay(day).filter((e) => {
                      if (e.isAllDay) return false;
                      const eventHour = new Date(e.startDate).getHours();
                      return eventHour === hour;
                    });
                    
                    return (
                      <div
                        key={dayIndex}
                        className={`h-12 border-t ${colors.border.primary} relative cursor-pointer transition-colors group
                          hover:bg-[#a8012b]/5 dark:hover:bg-[#a8012b]/10
                        `}
                        onClick={() => {
                          const clickDate = new Date(day);
                          clickDate.setHours(hour, 0, 0, 0);
                          onAddEvent?.(clickDate);
                        }}
                      >
                        {/* Hover indicator */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <div className="flex items-center gap-1 text-xs text-[#a8012b] bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm border border-[#a8012b]/20">
                            <Plus className="w-3 h-3" />
                            <span className="font-medium">{hour.toString().padStart(2, '0')}:00</span>
                          </div>
                        </div>
                        {dayEvents.map((event) => (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick?.(event);
                            }}
                            className={`
                              absolute left-0 right-0 mx-1 px-2 py-1 rounded text-xs cursor-pointer z-10
                              ${eventTypeColors[event.type].bg}
                              ${eventTypeColors[event.type].text}
                              ${eventTypeColors[event.type].border}
                              border
                              ${event.isMine ? 'ring-2 ring-amber-400' : ''}
                            `}
                            title={event.isMine ? `⭐ ${event.title} (Il tuo evento)` : event.title}
                          >
                            <div className="font-medium truncate flex items-center gap-1">
                              {event.isMine && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 flex-shrink-0" />}
                              {event.title}
                            </div>
                            <div className="text-[10px] opacity-75">
                              {formatTime(event.startDate)} - {formatTime(event.endDate)}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Day View */}
      {activeView === 'day' && (
        <div className="p-4">
          <div className="flex gap-4">
            {/* Time column */}
            <div className="w-16 flex-shrink-0">
              {Array.from({ length: 24 }, (_, hour) => (
                <div key={hour} className={`h-16 text-xs ${colors.text.muted} text-right pr-2`}>
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Events column */}
            <div className="flex-1 relative">
              {Array.from({ length: 24 }, (_, hour) => (
                <div
                  key={hour}
                  className={`h-16 border-t ${colors.border.primary} cursor-pointer transition-colors group relative
                    hover:bg-[#a8012b]/5 dark:hover:bg-[#a8012b]/10
                  `}
                  onClick={() => {
                    const clickDate = new Date(selectedDate);
                    clickDate.setHours(hour, 0, 0, 0);
                    onAddEvent?.(clickDate);
                  }}
                >
                  {/* Hover indicator */}
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    <div className="flex items-center gap-2 text-sm text-[#a8012b] bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg shadow-md border border-[#a8012b]/20">
                      <Plus className="w-4 h-4" />
                      <span className="font-medium">Crea evento alle {hour.toString().padStart(2, '0')}:00</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Render events */}
              {getEventsForDay(selectedDate).filter((e) => !e.isAllDay).map((event) => {
                const startHour = new Date(event.startDate).getHours();
                const startMinute = new Date(event.startDate).getMinutes();
                const endHour = new Date(event.endDate).getHours();
                const endMinute = new Date(event.endDate).getMinutes();
                const top = startHour * 64 + (startMinute / 60) * 64;
                const height = ((endHour - startHour) * 60 + (endMinute - startMinute)) / 60 * 64;

                return (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                    className={`
                      absolute left-0 right-0 mx-2 px-3 py-2 rounded-lg cursor-pointer
                      ${eventTypeColors[event.type].bg}
                      ${eventTypeColors[event.type].text}
                      ${eventTypeColors[event.type].border}
                      border
                      ${event.isMine ? 'ring-2 ring-amber-400' : ''}
                    `}
                    style={{ top: `${top}px`, height: `${Math.max(height, 32)}px` }}
                    title={event.isMine ? `⭐ ${event.title} (Il tuo evento)` : event.title}
                  >
                    <div className="font-medium flex items-center gap-1">
                      {event.isMine && <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />}
                      {event.title}
                    </div>
                    <div className="text-xs opacity-75 flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(event.startDate)} - {formatTime(event.endDate)}
                    </div>
                    {event.locationDetails && (
                      <div className="text-xs opacity-75 flex items-center gap-2 mt-1">
                        {event.locationType === 'ONLINE' ? (
                          <Video className="w-3 h-3" />
                        ) : (
                          <MapPin className="w-3 h-3" />
                        )}
                        {event.locationDetails}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* All day events at top */}
              {getEventsForDay(selectedDate).filter((e) => e.isAllDay).length > 0 && (
                <div className={`absolute -top-12 left-0 right-0 ${colors.background.secondary} rounded-lg p-2 space-y-1`}>
                  {getEventsForDay(selectedDate).filter((e) => e.isAllDay).map((event) => {
                    const isMultiDay = isMultiDayEvent(event);
                    const isFirstDay = isFirstDayOfEvent(selectedDate, event);
                    const isLastDay = isLastDayOfEvent(selectedDate, event);
                    
                    return (
                      <div
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
                        className={`
                          px-2 py-1 rounded text-sm cursor-pointer flex flex-col
                          ${eventTypeColors[event.type].bg}
                          ${eventTypeColors[event.type].text}
                          ${event.isMine ? 'ring-2 ring-amber-400' : ''}
                        `}
                        title={event.isMine ? `⭐ ${event.title} (Il tuo evento)` : event.title}
                      >
                        <div className="flex items-center gap-1">
                          {event.isMine && <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />}
                          <span>{event.title}</span>
                        </div>
                        {isMultiDay && isFirstDay && (
                          <span className="text-xs opacity-75">Inizio: {formatTime(event.startDate)}</span>
                        )}
                        {isMultiDay && isLastDay && (
                          <span className="text-xs opacity-75">Fine: {formatTime(event.endDate)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className={`px-4 py-3 border-t ${colors.border.primary} flex flex-wrap gap-4`}>
        {Object.entries(eventTypeLabels).map(([type, label]) => (
          <div key={type} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${eventTypeColors[type as CalendarEvent['type']].bg}`} />
            <span className={`text-xs ${colors.text.secondary}`}>{label}</span>
          </div>
        ))}
        {/* Personal events legend */}
        <div className="flex items-center gap-2 ml-auto">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className={`text-xs ${colors.text.secondary}`}>I tuoi eventi</span>
        </div>
      </div>
    </div>
  );
}

// Event Detail Modal Component
interface EventDetailProps {
  event: CalendarEvent;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onUserClick?: (userId: string, userType: 'STUDENT' | 'COLLABORATOR') => void;
  onGroupClick?: (groupId: string) => void;
}

export function EventDetail({ event, onClose, onEdit, onDelete, onUserClick, onGroupClick }: EventDetailProps) {
  // Use createPortal to render outside the parent container
  if (typeof document === 'undefined') return null;
  
  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg ${colors.background.card} rounded-xl shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`px-6 py-4 border-b ${colors.border.primary}`}>
          <div className="flex items-start justify-between">
            <div>
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${eventTypeColors[event.type].bg} ${eventTypeColors[event.type].text} mb-2`}>
                {eventTypeLabels[event.type]}
              </span>
              <h2 className={`text-xl font-semibold ${colors.text.primary}`}>
                {event.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg ${colors.background.secondary} ${colors.text.primary} hover:${colors.background.tertiary}`}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <CalendarIcon className={`w-5 h-5 ${colors.icon.secondary} mt-0.5`} />
            <div>
              {isMultiDayEvent(event) ? (
                // Multi-day event: show date range with start and end times
                <>
                  <p className={colors.text.primary}>
                    Dal {new Date(event.startDate).toLocaleDateString('it-IT', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })} al {new Date(event.endDate).toLocaleDateString('it-IT', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <p className={`text-sm ${colors.text.secondary}`}>
                    Inizio: {formatTime(event.startDate)} • Fine: {formatTime(event.endDate)}
                  </p>
                </>
              ) : (
                // Single-day event
                <>
                  <p className={colors.text.primary}>
                    {new Date(event.startDate).toLocaleDateString('it-IT', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  {!event.isAllDay && (
                    <p className={`text-sm ${colors.text.secondary}`}>
                      {formatTime(event.startDate)} - {formatTime(event.endDate)}
                    </p>
                  )}
                  {event.isAllDay && (
                    <p className={`text-sm ${colors.text.secondary}`}>Tutto il giorno</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3">
            {event.locationType === 'ONLINE' ? (
              <Video className={`w-5 h-5 ${colors.icon.secondary} mt-0.5`} />
            ) : (
              <MapPin className={`w-5 h-5 ${colors.icon.secondary} mt-0.5`} />
            )}
            <div>
              <p className={colors.text.primary}>
                {event.locationType === 'ONLINE' ? 'Online' : event.locationType === 'HYBRID' ? 'Ibrido' : 'In presenza'}
              </p>
              {event.locationDetails && (
                <p className={`text-sm ${colors.text.secondary}`}>{event.locationDetails}</p>
              )}
              {event.onlineLink && (
                <a
                  href={event.onlineLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-sm ${colors.primary.text} hover:underline`}
                >
                  Partecipa online →
                </a>
              )}
            </div>
          </div>

          {/* Attendees / Invitations */}
          {event.invitations && event.invitations.length > 0 ? (
            <div className="flex items-start gap-3">
              <Users className={`w-5 h-5 ${colors.icon.secondary} mt-0.5`} />
              <div className="flex-1">
                <p className={`${colors.text.primary} font-medium mb-2`}>{event.invitations.length} invitati</p>
                <div className={`max-h-40 overflow-y-auto space-y-1 p-2 rounded-lg ${colors.background.secondary}`}>
                  {/* Group invitations by type */}
                  {event.invitations.filter(inv => inv.user).length > 0 && (
                    <div className="mb-2">
                      <p className={`text-xs font-semibold ${colors.text.secondary} mb-1`}>Utenti</p>
                      {event.invitations.filter(inv => inv.user).map((inv) => (
                        <div key={inv.id} className="flex items-center gap-2 py-0.5">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          {onUserClick && inv.user?.id ? (
                            <button
                              type="button"
                              onClick={() => onUserClick(inv.user!.id, 'STUDENT')}
                              className={`text-sm ${colors.text.primary} hover:${colors.primary.text} hover:underline text-left`}
                            >
                              {inv.user?.name}
                            </button>
                          ) : (
                            <span className={`text-sm ${colors.text.primary}`}>{inv.user?.name}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {event.invitations.filter(inv => inv.group).length > 0 && (
                    <div>
                      <p className={`text-xs font-semibold ${colors.text.secondary} mb-1`}>Gruppi</p>
                      {event.invitations.filter(inv => inv.group).map((inv) => (
                        <div key={inv.id} className="flex items-center gap-2 py-0.5">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          {onGroupClick && inv.group?.id ? (
                            <button
                              type="button"
                              onClick={() => onGroupClick(inv.group!.id)}
                              className={`text-sm ${colors.text.primary} hover:${colors.primary.text} hover:underline text-left`}
                            >
                              {inv.group?.name}
                            </button>
                          ) : (
                            <span className={`text-sm ${colors.text.primary}`}>{inv.group?.name}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {event._count && event._count.attendances > 0 && (
                  <p className={`text-sm ${colors.text.secondary} mt-2`}>
                    {event._count.attendances} presenze registrate
                  </p>
                )}
              </div>
            </div>
          ) : event._count && event._count.invitations > 0 ? (
            <div className="flex items-start gap-3">
              <Users className={`w-5 h-5 ${colors.icon.secondary} mt-0.5`} />
              <div>
                <p className={colors.text.primary}>{event._count.invitations} invitati</p>
                {event._count.attendances > 0 && (
                  <p className={`text-sm ${colors.text.secondary}`}>
                    {event._count.attendances} presenze registrate
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {/* Description */}
          {event.description && (
            <div className={`p-4 rounded-lg ${colors.background.secondary}`}>
              <p className={`text-sm ${colors.text.primary} whitespace-pre-wrap`}>
                {event.description}
              </p>
            </div>
          )}

          {/* Creator */}
          {event.createdBy && (
            <p className={`text-xs ${colors.text.muted}`}>
              Creato da {event.createdBy.name}
            </p>
          )}
        </div>

        {/* Actions */}
        {(onEdit || onDelete) && (
          <div className={`px-6 py-4 border-t ${colors.border.primary} flex justify-end gap-3`}>
            {onDelete && (
              <button
                onClick={onDelete}
                className={`px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors`}
              >
                Elimina
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                className={`px-4 py-2 rounded-lg ${colors.primary.gradient} text-white font-medium`}
              >
                Modifica
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export { eventTypeColors, eventTypeLabels };
