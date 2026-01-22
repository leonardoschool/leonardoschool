/**
 * Leonardo School Mobile - Calendario Screen
 * 
 * Calendario eventi, lezioni e appuntamenti.
 * Placeholder - da implementare con parità webapp.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text, Heading3, Caption } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { useThemedColors } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../lib/theme/colors';
import { DrawerMenu, AppHeader } from '../../components/navigation';
import { trpc } from '../../lib/trpc';
import { Ionicons } from '@expo/vector-icons';

export default function CalendarioScreen() {
  const themedColors = useThemedColors();
  const { user } = useAuthStore();
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Fetch calendar events
  const {
    data: eventsData,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.calendar.getEvents.useQuery(
    {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 giorni
      onlyMyEvents: true,
    },
    { enabled: !!user }
  );

  const events = eventsData?.events || [];

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('it-IT', {
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
      OTHER: 'calendar',
    };
    return iconMap[type] || 'calendar';
  };

  const getEventTypeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      LESSON: colors.status.info.main,
      EXAM: colors.status.error.main,
      MEETING: colors.status.warning.main,
      OTHER: colors.primary.main,
    };
    return colorMap[type] || colors.primary.main;
  };

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
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text>Caricamento eventi...</Text>
          </View>
        ) : events.length === 0 ? (
          <Card variant="outlined" style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Ionicons name="calendar-outline" size={48} color={themedColors.textMuted} />
              <Heading3 style={{ marginTop: 16, textAlign: 'center' }}>
                Nessun evento in programma
              </Heading3>
              <Caption style={{ marginTop: 8, textAlign: 'center' }}>
                Gli eventi e le lezioni appariranno qui quando saranno programmati.
              </Caption>
            </View>
          </Card>
        ) : (
          events.map((event: { id: string; title: string; type?: string; startDate?: Date | string; endDate?: Date | string; locationDetails?: string }) => (
            <Card key={event.id} variant="outlined" style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <View
                  style={[
                    styles.eventIconContainer,
                    { backgroundColor: `${getEventTypeColor(event.type || 'OTHER')}20` },
                  ]}
                >
                  <Ionicons
                    name={getEventTypeIcon(event.type || 'OTHER')}
                    size={20}
                    color={getEventTypeColor(event.type || 'OTHER')}
                  />
                </View>
                <View style={styles.eventInfo}>
                  <Text variant="body" style={{ fontWeight: '600', color: themedColors.text }}>
                    {event.title}
                  </Text>
                  <Caption>{formatDate(event.startDate!)}</Caption>
                </View>
              </View>
              <View style={styles.eventDetails}>
                <View style={styles.eventDetailRow}>
                  <Ionicons name="time-outline" size={16} color={themedColors.textMuted} />
                  <Caption style={{ marginLeft: 6 }}>
                    {formatTime(event.startDate!)} - {formatTime(event.endDate!)}
                  </Caption>
                </View>
                {event.locationDetails && (
                  <View style={styles.eventDetailRow}>
                    <Ionicons name="location-outline" size={16} color={themedColors.textMuted} />
                    <Caption style={{ marginLeft: 6 }}>{event.locationDetails}</Caption>
                  </View>
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>

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
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCard: {
    marginTop: 20,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  eventCard: {
    marginBottom: 12,
  },
  eventHeader: {
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
    marginLeft: 12,
  },
  eventDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
});
