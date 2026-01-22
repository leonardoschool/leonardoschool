/**
 * Leonardo School Mobile - Calendario Screen
 * 
 * Calendario eventi, lezioni e appuntamenti per studenti.
 * Parità con webapp StudentCalendarContent.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text, Heading3, Caption, Body } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useThemedColors } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../lib/theme/colors';
import { spacing, layout } from '../../lib/theme/spacing';
import { DrawerMenu, AppHeader } from '../../components/navigation';
import { trpc } from '../../lib/trpc';
import { Ionicons } from '@expo/vector-icons';

// Event types and labels
const eventTypeLabels: Record<string, string> = {
  LESSON: 'Lezione',
  EXAM: 'Esame',
  MEETING: 'Riunione',
  TUTORING: 'Tutoraggio',
  OTHER: 'Altro',
};

const eventTypeFilters = [
  { value: '', label: 'Tutti gli eventi' },
  { value: 'LESSON', label: 'Lezioni' },
  { value: 'EXAM', label: 'Esami' },
  { value: 'MEETING', label: 'Riunioni' },
  { value: 'TUTORING', label: 'Tutoraggio' },
  { value: 'OTHER', label: 'Altri' },
];

interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  type?: string;
  startDate: Date | string;
  endDate: Date | string;
  isAllDay?: boolean;
  locationType?: string;
  locationDetails?: string | null;
  onlineLink?: string | null;
  isCancelled?: boolean;
}

export default function CalendarioScreen() {
  const themedColors = useThemedColors();
  const { user } = useAuthStore();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Calculate date range (current month + 60 days ahead)
  const dateRange = useMemo(() => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date();
    end.setDate(end.getDate() + 60);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  }, []);

  // Fetch calendar events
  const {
    data: eventsData,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.calendar.getEvents.useQuery(
    {
      startDate: dateRange.start,
      endDate: dateRange.end,
      type: filterType ? (filterType as CalendarEvent['type']) : undefined,
      onlyMyEvents: true,
      includeInvitations: true,
      includeCancelled: false,
    },
    { enabled: !!user }
  );

  // Calcola stats lato client dagli eventi (getStats è solo per staff)
  const stats = useMemo(() => {
    if (!eventsData?.events) return null;
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const allEvents = eventsData.events as CalendarEvent[];
    const totalEvents = allEvents.length;
    const eventsThisMonth = allEvents.filter(e => {
      const eventDate = new Date(e.startDate);
      return eventDate >= startOfMonth && eventDate <= endOfMonth;
    }).length;
    const upcomingEvents = allEvents.filter(e => new Date(e.startDate) > now).length;
    
    return {
      totalEvents,
      eventsThisMonth,
      upcomingEvents,
      pendingAbsences: 0, // Non disponibile per studenti
    };
  }, [eventsData?.events]);

  const events: CalendarEvent[] = useMemo(() => {
    return (eventsData?.events || []) as CalendarEvent[];
  }, [eventsData?.events]);

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, CalendarEvent[]> = {};
    
    events.forEach((event) => {
      const dateKey = new Date(event.startDate).toISOString().split('T')[0];
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    });

    // Sort dates
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dateEvents]) => ({
        date,
        events: dateEvents.sort((a, b) => 
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        ),
      }));
  }, [events]);

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Oggi';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Domani';
    }
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      LESSON: 'school',
      EXAM: 'document-text',
      MEETING: 'people',
      TUTORING: 'person',
      OTHER: 'calendar',
    };
    return iconMap[type] || 'calendar';
  };

  const getEventTypeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      LESSON: colors.status.info.main,
      EXAM: colors.status.error.main,
      MEETING: colors.status.warning.main,
      TUTORING: colors.primary.main,
      OTHER: colors.neutral[500],
    };
    return colorMap[type] || colors.primary.main;
  };

  const getLocationIcon = (locationType: string): keyof typeof Ionicons.glyphMap => {
    return locationType === 'ONLINE' ? 'videocam' : 'location';
  };

  const selectedFilterLabel = eventTypeFilters.find(f => f.value === filterType)?.label || 'Tutti gli eventi';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={[]}>
      <AppHeader 
        title="Calendario" 
        onMenuPress={() => setDrawerVisible(true)} 
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary.main}
          />
        }
      >
        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsGrid}>
            <Card variant="outlined" style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: `${colors.primary.main}15` }]}>
                <Ionicons name="calendar" size={20} color={colors.primary.main} />
              </View>
              <Text variant="h3" style={styles.statValue}>{stats.totalEvents || 0}</Text>
              <Caption>Totali</Caption>
            </Card>

            <Card variant="outlined" style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: `${colors.status.success.main}15` }]}>
                <Ionicons name="bar-chart" size={20} color={colors.status.success.main} />
              </View>
              <Text variant="h3" style={styles.statValue}>{stats.eventsThisMonth || 0}</Text>
              <Caption>Questo mese</Caption>
            </Card>

            <Card variant="outlined" style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: `${colors.status.info.main}15` }]}>
                <Ionicons name="time" size={20} color={colors.status.info.main} />
              </View>
              <Text variant="h3" style={styles.statValue}>{stats.upcomingEvents || 0}</Text>
              <Caption>In arrivo</Caption>
            </Card>

            <Card variant="outlined" style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: `${colors.status.warning.main}15` }]}>
                <Ionicons name="alert-circle" size={20} color={colors.status.warning.main} />
              </View>
              <Text variant="h3" style={styles.statValue}>{stats.pendingAbsences || 0}</Text>
              <Caption>Assenze</Caption>
            </Card>
          </View>
        )}

        {/* Filter Button */}
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: themedColors.card, borderColor: themedColors.border }]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="filter" size={18} color={themedColors.textMuted} />
          <Text variant="body" style={{ marginLeft: 8, flex: 1, color: themedColors.text }}>
            {selectedFilterLabel}
          </Text>
          <Ionicons name="chevron-down" size={18} color={themedColors.textMuted} />
        </TouchableOpacity>

        {/* Events List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Caption style={{ marginTop: 12 }}>Caricamento eventi...</Caption>
          </View>
        ) : groupedEvents.length === 0 ? (
          <Card variant="outlined" style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Ionicons name="calendar-outline" size={48} color={themedColors.textMuted} />
              <Heading3 style={{ marginTop: 16, textAlign: 'center' }}>
                Nessun evento in programma
              </Heading3>
              <Caption style={{ marginTop: 8, textAlign: 'center' }}>
                {filterType 
                  ? 'Nessun evento trovato con questo filtro.'
                  : 'Gli eventi e le lezioni appariranno qui quando saranno programmati.'}
              </Caption>
            </View>
          </Card>
        ) : (
          groupedEvents.map(({ date, events: dayEvents }) => (
            <View key={date} style={styles.dateGroup}>
              <Text variant="h5" style={[styles.dateHeader, { color: themedColors.text }]}>
                {formatDateHeader(date)}
              </Text>
              
              {dayEvents.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  activeOpacity={0.7}
                  onPress={() => setSelectedEvent(event)}
                >
                  <Card variant="outlined" style={styles.eventCard}>
                    <View style={styles.eventRow}>
                      <View
                        style={[
                          styles.eventIconContainer,
                          { backgroundColor: `${getEventTypeColor(event.type || 'OTHER')}15` },
                        ]}
                      >
                        <Ionicons
                          name={getEventTypeIcon(event.type || 'OTHER')}
                          size={20}
                          color={getEventTypeColor(event.type || 'OTHER')}
                        />
                      </View>
                      
                      <View style={styles.eventInfo}>
                        <View style={styles.eventTitleRow}>
                          <Text variant="body" style={{ fontWeight: '600', flex: 1 }} numberOfLines={1}>
                            {event.title}
                          </Text>
                          {event.isCancelled && (
                            <Badge variant="error" size="sm">Annullato</Badge>
                          )}
                        </View>
                        
                        <View style={styles.eventMeta}>
                          <Ionicons name="time-outline" size={14} color={themedColors.textMuted} />
                          <Caption style={{ marginLeft: 4 }}>
                            {event.isAllDay 
                              ? 'Tutto il giorno' 
                              : `${formatTime(event.startDate)} - ${formatTime(event.endDate)}`}
                          </Caption>
                        </View>
                        
                        {event.locationDetails && (
                          <View style={styles.eventMeta}>
                            <Ionicons 
                              name={getLocationIcon(event.locationType || 'IN_PERSON')} 
                              size={14} 
                              color={themedColors.textMuted} 
                            />
                            <Caption style={{ marginLeft: 4 }} numberOfLines={1}>
                              {event.locationDetails}
                            </Caption>
                          </View>
                        )}
                      </View>
                      
                      <Ionicons name="chevron-forward" size={20} color={themedColors.textMuted} />
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setFilterModalVisible(false)}
        >
          <View style={[styles.filterModal, { backgroundColor: themedColors.card }]}>
            <Text variant="h4" style={{ marginBottom: 16 }}>Filtra per tipo</Text>
            {eventTypeFilters.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterOption,
                  filterType === filter.value && { backgroundColor: `${colors.primary.main}15` },
                ]}
                onPress={() => {
                  setFilterType(filter.value);
                  setFilterModalVisible(false);
                }}
              >
                <Text 
                  variant="body" 
                  style={{ 
                    color: filterType === filter.value ? colors.primary.main : themedColors.text,
                    fontWeight: filterType === filter.value ? '600' : '400',
                  }}
                >
                  {filter.label}
                </Text>
                {filterType === filter.value && (
                  <Ionicons name="checkmark" size={20} color={colors.primary.main} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Event Detail Modal */}
      <Modal
        visible={!!selectedEvent}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedEvent(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.eventDetailModal, { backgroundColor: themedColors.card }]}>
            {selectedEvent && (
              <>
                <View style={styles.eventDetailHeader}>
                  <View
                    style={[
                      styles.eventDetailIcon,
                      { backgroundColor: `${getEventTypeColor(selectedEvent.type || 'OTHER')}15` },
                    ]}
                  >
                    <Ionicons
                      name={getEventTypeIcon(selectedEvent.type || 'OTHER')}
                      size={28}
                      color={getEventTypeColor(selectedEvent.type || 'OTHER')}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.closeButton, { backgroundColor: themedColors.backgroundSecondary }]}
                    onPress={() => setSelectedEvent(null)}
                  >
                    <Ionicons name="close" size={22} color={themedColors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.eventDetailContent}>
                  <View style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
                    <Badge variant="default" size="sm">
                      {eventTypeLabels[selectedEvent.type || 'OTHER'] || 'Evento'}
                    </Badge>
                  </View>
                  
                  <Text variant="h3" style={{ marginBottom: 16 }}>
                    {selectedEvent.title}
                  </Text>

                  {selectedEvent.description && (
                    <Body style={{ marginBottom: 16, color: themedColors.textMuted }}>
                      {selectedEvent.description}
                    </Body>
                  )}

                  <View style={styles.eventDetailRow}>
                    <Ionicons name="calendar-outline" size={20} color={themedColors.textMuted} />
                    <Text variant="body" style={{ marginLeft: 12 }}>
                      {formatDateHeader(new Date(selectedEvent.startDate).toISOString().split('T')[0])}
                    </Text>
                  </View>

                  <View style={styles.eventDetailRow}>
                    <Ionicons name="time-outline" size={20} color={themedColors.textMuted} />
                    <Text variant="body" style={{ marginLeft: 12 }}>
                      {selectedEvent.isAllDay 
                        ? 'Tutto il giorno' 
                        : `${formatTime(selectedEvent.startDate)} - ${formatTime(selectedEvent.endDate)}`}
                    </Text>
                  </View>

                  {selectedEvent.locationDetails && (
                    <View style={styles.eventDetailRow}>
                      <Ionicons 
                        name={getLocationIcon(selectedEvent.locationType || 'IN_PERSON')} 
                        size={20} 
                        color={themedColors.textMuted} 
                      />
                      <Text variant="body" style={{ marginLeft: 12 }}>
                        {selectedEvent.locationDetails}
                      </Text>
                    </View>
                  )}

                  {selectedEvent.onlineLink && (
                    <View style={styles.eventDetailRow}>
                      <Ionicons name="link-outline" size={20} color={themedColors.textMuted} />
                      <Text 
                        variant="body" 
                        style={{ marginLeft: 12, color: colors.primary.main }}
                        numberOfLines={1}
                      >
                        {selectedEvent.onlineLink}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      <DrawerMenu
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        currentRoute="/calendario"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  statCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  statValue: {
    marginBottom: spacing[1],
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: layout.borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing[4],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
  },
  emptyCard: {
    marginTop: spacing[4],
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[4],
  },
  dateGroup: {
    marginBottom: spacing[4],
  },
  dateHeader: {
    marginBottom: spacing[3],
    textTransform: 'capitalize',
  },
  eventCard: {
    marginBottom: spacing[2],
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
    marginLeft: spacing[3],
    marginRight: spacing[2],
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  bottomSpacer: {
    height: spacing[8],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing[6],
    paddingBottom: spacing[10],
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: layout.borderRadius.lg,
    marginBottom: spacing[1],
  },
  eventDetailModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: spacing[8],
  },
  eventDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[6],
    paddingBottom: spacing[4],
  },
  eventDetailIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDetailContent: {
    paddingHorizontal: spacing[6],
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
});
