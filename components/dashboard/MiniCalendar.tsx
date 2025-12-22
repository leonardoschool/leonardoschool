'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { colors } from '@/lib/theme/colors';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Video,
  ExternalLink,
} from 'lucide-react';

/**
 * Event type colors for mini calendar
 */
const eventTypeColors: Record<string, { bg: string; text: string; dot: string }> = {
  LESSON: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  SIMULATION: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    dot: 'bg-purple-500',
  },
  MEETING: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  EXAM: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    dot: 'bg-red-500',
  },
  OTHER: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    dot: 'bg-gray-500',
  },
};

const eventTypeLabels: Record<string, string> = {
  LESSON: 'Lezione',
  SIMULATION: 'Simulazione',
  MEETING: 'Riunione',
  EXAM: 'Esame',
  OTHER: 'Altro',
};

interface MiniCalendarEvent {
  id: string;
  title: string;
  type: string;
  startDate: Date | string;
  endDate: Date | string;
  isAllDay?: boolean;
  locationType?: string;
  locationDetails?: string | null;
  onlineLink?: string | null;
}

interface MiniCalendarProps {
  events: MiniCalendarEvent[];
  isLoading?: boolean;
}

/**
 * MiniCalendar - Compact calendar widget for dashboard
 * Shows current month with event dots and upcoming events list
 */
export function MiniCalendar({ events, isLoading }: MiniCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get calendar data for current month
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of month and total days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Day of week for first day (0 = Sunday, adjust for Monday start)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;

    // Build calendar grid
    const days: Array<{ date: Date; isCurrentMonth: boolean; isToday: boolean; hasEvents: boolean; eventTypes: string[] }> = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        hasEvents: false,
        eventTypes: [],
      });
    }

    // Current month days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);

      // Check for events on this day
      const dayEvents = events.filter((e) => {
        const eventStart = new Date(e.startDate);
        const eventEnd = new Date(e.endDate);
        eventStart.setHours(0, 0, 0, 0);
        eventEnd.setHours(23, 59, 59, 999);
        return date >= eventStart && date <= eventEnd;
      });

      const eventTypes = [...new Set(dayEvents.map((e) => e.type))];

      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        hasEvents: dayEvents.length > 0,
        eventTypes,
      });
    }

    // Next month days to fill grid (6 rows * 7 days = 42)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        hasEvents: false,
        eventTypes: [],
      });
    }

    return days;
  }, [currentDate, events]);

  // Get upcoming events (next 7 days)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    return events
      .filter((e) => {
        const eventDate = new Date(e.startDate);
        return eventDate >= now && eventDate <= weekFromNow;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 4);
  }, [events]);

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
  ];

  const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const formatEventTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatEventDay = (date: Date | string) => {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return 'Oggi';
    if (d.toDateString() === tomorrow.toDateString()) return 'Domani';
    return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className={`${colors.background.card} rounded-2xl p-5 animate-pulse`}>
        <div className="h-6 w-32 bg-gray-200 dark:bg-slate-700 rounded mb-4" />
        <div className="h-48 bg-gray-200 dark:bg-slate-700 rounded mb-4" />
        <div className="space-y-2">
          <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded" />
          <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${colors.background.card} rounded-2xl ${colors.effects.shadow.lg} overflow-hidden`}>
      {/* Header */}
      <div className={`px-5 py-4 border-b ${colors.border.primary} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Calendar className={`w-5 h-5 ${colors.primary.text}`} />
          <h3 className={`font-semibold ${colors.text.primary}`}>Calendario</h3>
        </div>
        <Link 
          href="/calendario" 
          className={`text-sm ${colors.primary.text} ${colors.primary.textHover} flex items-center gap-1`}
        >
          Vedi tutto
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Month Navigation */}
      <div className="px-5 py-3 flex items-center justify-between">
        <button
          onClick={goToPrevMonth}
          className={`p-1.5 rounded-lg ${colors.background.hover} transition-colors`}
        >
          <ChevronLeft className={`w-4 h-4 ${colors.icon.primary}`} />
        </button>
        <span className={`font-medium ${colors.text.primary}`}>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </span>
        <button
          onClick={goToNextMonth}
          className={`p-1.5 rounded-lg ${colors.background.hover} transition-colors`}
        >
          <ChevronRight className={`w-4 h-4 ${colors.icon.primary}`} />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="px-5 pb-3">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map((day) => (
            <div 
              key={day} 
              className={`text-center text-xs font-medium ${colors.text.muted} py-1`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarData.map((day, index) => (
            <div
              key={index}
              className={`
                relative aspect-square flex items-center justify-center text-sm rounded-lg
                ${day.isCurrentMonth ? colors.text.primary : colors.text.muted + ' opacity-40'}
                ${day.isToday ? `${colors.primary.bg} text-white font-bold` : ''}
                ${!day.isToday && day.isCurrentMonth ? colors.background.hover : ''}
                transition-colors cursor-default
              `}
            >
              {day.date.getDate()}
              {/* Event dots */}
              {day.hasEvents && !day.isToday && (
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {day.eventTypes.slice(0, 3).map((type, i) => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full ${eventTypeColors[type]?.dot || 'bg-gray-400'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className={`px-5 py-4 border-t ${colors.border.primary}`}>
        <h4 className={`text-sm font-medium ${colors.text.secondary} mb-3`}>
          Prossimi appuntamenti
        </h4>

        {upcomingEvents.length === 0 ? (
          <p className={`text-sm ${colors.text.muted} text-center py-3`}>
            Nessun evento in programma
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className={`p-3 rounded-xl ${eventTypeColors[event.type]?.bg || 'bg-gray-100 dark:bg-gray-800'} transition-colors`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${colors.text.primary} truncate`}>
                      {event.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs ${eventTypeColors[event.type]?.text || colors.text.muted}`}>
                        {eventTypeLabels[event.type] || event.type}
                      </span>
                      <span className={`text-xs ${colors.text.muted}`}>•</span>
                      <span className={`text-xs ${colors.text.muted}`}>
                        {formatEventDay(event.startDate)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Clock className={`w-3.5 h-3.5 ${colors.icon.muted}`} />
                    <span className={`text-xs ${colors.text.muted}`}>
                      {event.isAllDay ? 'Tutto il giorno' : formatEventTime(event.startDate)}
                    </span>
                  </div>
                </div>
                {(event.locationDetails || event.onlineLink) && (
                  <div className="flex items-center gap-1 mt-2">
                    {event.locationType === 'ONLINE' ? (
                      <Video className={`w-3 h-3 ${colors.icon.muted}`} />
                    ) : (
                      <MapPin className={`w-3 h-3 ${colors.icon.muted}`} />
                    )}
                    <span className={`text-xs ${colors.text.muted} truncate`}>
                      {event.locationType === 'ONLINE' ? 'Online' : event.locationDetails}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MiniCalendar;
