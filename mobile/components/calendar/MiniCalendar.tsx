/**
 * Leonardo School Mobile - MiniCalendar Component
 * 
 * Compact calendar widget showing current month with event dots
 * and upcoming events list. Matches webapp MiniCalendar.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text, Caption } from '../ui/Text';
import { Card } from '../ui/Card';
import { useThemedColors } from '../../contexts/ThemeContext';
import { colors } from '../../lib/theme/colors';
import { spacing, layout } from '../../lib/theme/spacing';

// Event type colors
const eventTypeColors: Record<string, { bg: string; dot: string }> = {
  LESSON: { bg: 'rgba(59, 130, 246, 0.15)', dot: '#3B82F6' },
  SIMULATION: { bg: 'rgba(139, 92, 246, 0.15)', dot: '#8B5CF6' },
  MEETING: { bg: 'rgba(245, 158, 11, 0.15)', dot: '#F59E0B' },
  TUTORING: { bg: 'rgba(20, 184, 166, 0.15)', dot: '#14B8A6' },
  EXAM: { bg: 'rgba(239, 68, 68, 0.15)', dot: '#EF4444' },
  OTHER: { bg: 'rgba(107, 114, 128, 0.15)', dot: '#6B7280' },
};

const eventTypeLabels: Record<string, string> = {
  LESSON: 'Lezione',
  SIMULATION: 'Simulazione',
  MEETING: 'Riunione',
  TUTORING: 'Tutoraggio',
  EXAM: 'Esame',
  OTHER: 'Altro',
};

const monthNames = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export interface MiniCalendarEvent {
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
  readonly events: MiniCalendarEvent[];
  readonly isLoading?: boolean;
  readonly showViewAllButton?: boolean;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasEvents: boolean;
  eventTypes: string[];
}

export function MiniCalendar({ events, isLoading, showViewAllButton = true }: MiniCalendarProps) {
  const themedColors = useThemedColors();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get calendar data for current month
  const calendarData = useMemo((): CalendarDay[] => {
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
    const days: CalendarDay[] = [];

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
      <Card variant="elevated" style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Caption style={{ marginTop: spacing[3] }}>Caricamento calendario...</Caption>
        </View>
      </Card>
    );
  }

  return (
    <Card variant="elevated" style={styles.card}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themedColors.border }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="calendar" size={20} color={colors.primary.main} />
          <Text variant="body" style={{ fontWeight: '600', marginLeft: spacing[2] }}>
            Calendario
          </Text>
        </View>
        {showViewAllButton && (
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => router.push('/(tabs)/calendario')}
          >
            <Text variant="caption" style={{ color: colors.primary.main }}>
              Vedi tutto
            </Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary.main} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}
      </View>

      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={20} color={themedColors.text} />
        </TouchableOpacity>
        <Text variant="body" style={{ fontWeight: '600' }}>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={20} color={themedColors.text} />
        </TouchableOpacity>
      </View>

      {/* Day Headers */}
      <View style={styles.dayHeadersRow}>
        {dayNames.map((day) => (
          <View key={day} style={styles.dayHeaderCell}>
            <Caption style={{ fontWeight: '600', fontSize: 11 }}>{day}</Caption>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {calendarData.map((day) => (
          <View key={day.date.toISOString()} style={styles.dayCell}>
            <View
              style={[
                styles.dayCellInner,
                day.isToday && { backgroundColor: colors.primary.main },
              ]}
            >
              <Text
                variant="caption"
                style={[
                  styles.dayText,
                  !day.isCurrentMonth && { opacity: 0.3 },
                  day.isToday && { color: '#FFFFFF', fontWeight: '700' },
                ]}
              >
                {day.date.getDate()}
              </Text>
              {/* Event dots */}
              {day.hasEvents && !day.isToday && (
                <View style={styles.eventDots}>
                  {day.eventTypes.slice(0, 3).map((type) => (
                    <View
                      key={type}
                      style={[
                        styles.eventDot,
                        { backgroundColor: eventTypeColors[type]?.dot || '#6B7280' },
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Upcoming Events */}
      <View style={[styles.upcomingSection, { borderTopColor: themedColors.border }]}>
        <Text variant="caption" style={{ fontWeight: '600', marginBottom: spacing[2], color: themedColors.textMuted }}>
          Prossimi appuntamenti
        </Text>

        {upcomingEvents.length === 0 ? (
          <View style={styles.emptyEvents}>
            <Caption style={{ textAlign: 'center' }}>Nessun evento in programma</Caption>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {upcomingEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[
                  styles.eventItem,
                  { backgroundColor: eventTypeColors[event.type]?.bg || 'rgba(107, 114, 128, 0.15)' },
                ]}
                activeOpacity={0.7}
                onPress={() => router.push('/(tabs)/calendario')}
              >
                <View style={styles.eventItemContent}>
                  <View style={styles.eventItemMain}>
                    <Text variant="caption" style={{ fontWeight: '600' }} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <View style={styles.eventItemMeta}>
                      <Caption style={{ fontSize: 10 }}>
                        {eventTypeLabels[event.type] || event.type}
                      </Caption>
                      <Caption style={{ fontSize: 10, marginHorizontal: 4 }}>•</Caption>
                      <Caption style={{ fontSize: 10 }}>{formatEventDay(event.startDate)}</Caption>
                    </View>
                  </View>
                  <View style={styles.eventItemTime}>
                    <Ionicons name="time-outline" size={12} color={themedColors.textMuted} />
                    <Caption style={{ fontSize: 10, marginLeft: 2 }}>
                      {event.isAllDay ? 'Tutto il giorno' : formatEventTime(event.startDate)}
                    </Caption>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  navButton: {
    padding: spacing[2],
  },
  dayHeadersRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing[2],
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[2],
  },
  dayCell: {
    width: '14.28%', // 100% / 7 days
    aspectRatio: 1,
    padding: 2,
  },
  dayCellInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.borderRadius.md,
  },
  dayText: {
    fontSize: 12,
  },
  eventDots: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 2,
    gap: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  upcomingSection: {
    padding: spacing[4],
    borderTopWidth: 1,
  },
  emptyEvents: {
    paddingVertical: spacing[4],
  },
  eventsList: {
    gap: spacing[2],
  },
  eventItem: {
    borderRadius: layout.borderRadius.lg,
    padding: spacing[3],
  },
  eventItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventItemMain: {
    flex: 1,
    marginRight: spacing[2],
  },
  eventItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  eventItemTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default MiniCalendar;
