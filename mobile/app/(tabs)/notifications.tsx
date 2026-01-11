/**
 * Leonardo School Mobile - Notifications Screen
 * 
 * Lista notifiche utente.
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text, Body, Caption } from '../../components/ui/Text';
import { useThemedColors } from '../../contexts/ThemeContext';
import { useNotificationStore } from '../../stores/notificationStore';
import { colors } from '../../lib/theme/colors';
import { spacing, layout } from '../../lib/theme/spacing';
import type { Notification, NotificationType } from '../../types';

// Mock data
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'SIMULATION_ASSIGNED',
    title: 'Nuova Simulazione Assegnata',
    body: 'Ti è stata assegnata la simulazione "TOLC-MED 2026". Scadenza: 15 Gennaio.',
    isRead: false,
    createdAt: '2026-01-11T10:30:00',
  },
  {
    id: '2',
    type: 'SIMULATION_RESULTS',
    title: 'Risultati Disponibili',
    body: 'I risultati della simulazione "Quiz Chimica" sono ora disponibili.',
    isRead: false,
    createdAt: '2026-01-10T15:45:00',
  },
  {
    id: '3',
    type: 'EVENT_REMINDER',
    title: 'Promemoria Lezione',
    body: 'La lezione di Biologia inizierà tra 1 ora.',
    isRead: true,
    createdAt: '2026-01-10T08:00:00',
  },
  {
    id: '4',
    type: 'MATERIAL_AVAILABLE',
    title: 'Nuovo Materiale',
    body: 'Sono stati aggiunti nuovi materiali di Fisica nella tua area didattica.',
    isRead: true,
    createdAt: '2026-01-09T12:00:00',
  },
  {
    id: '5',
    type: 'ACCOUNT_ACTIVATED',
    title: 'Benvenuto!',
    body: 'Il tuo account è stato attivato. Inizia subito a prepararti!',
    isRead: true,
    createdAt: '2026-01-05T09:00:00',
  },
];

export default function NotificationsScreen() {
  const themedColors = useThemedColors();
  const { markAsRead: _markAsRead, markAllAsRead } = useNotificationStore();
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getNotificationIcon = (type: NotificationType): keyof typeof Ionicons.glyphMap => {
    const iconMap: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
      ACCOUNT_ACTIVATED: 'checkmark-circle',
      CONTRACT_ASSIGNED: 'document-text',
      CONTRACT_SIGNED: 'create',
      CONTRACT_REMINDER: 'alarm',
      EVENT_INVITATION: 'calendar',
      EVENT_REMINDER: 'alarm',
      SIMULATION_ASSIGNED: 'school',
      SIMULATION_REMINDER: 'time',
      SIMULATION_RESULTS: 'trophy',
      MATERIAL_AVAILABLE: 'folder-open',
      MESSAGE_RECEIVED: 'chatbubble',
      GENERAL: 'notifications',
    };
    return iconMap[type] || 'notifications';
  };

  const getNotificationColor = (type: NotificationType): string => {
    const colorMap: Record<NotificationType, string> = {
      ACCOUNT_ACTIVATED: colors.status.success.main,
      CONTRACT_ASSIGNED: colors.status.info.main,
      CONTRACT_SIGNED: colors.status.success.main,
      CONTRACT_REMINDER: colors.status.warning.main,
      EVENT_INVITATION: colors.primary.main,
      EVENT_REMINDER: colors.status.warning.main,
      SIMULATION_ASSIGNED: colors.primary.main,
      SIMULATION_REMINDER: colors.status.warning.main,
      SIMULATION_RESULTS: colors.status.success.main,
      MATERIAL_AVAILABLE: colors.status.info.main,
      MESSAGE_RECEIVED: colors.primary.main,
      GENERAL: colors.neutral[500],
    };
    return colorMap[type] || colors.neutral[500];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    if (diffDays < 7) return `${diffDays} giorni fa`;
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    const updated = notifications.map(n =>
      n.id === notification.id ? { ...n, isRead: true } : n
    );
    setNotifications(updated);

    // Navigate based on type
    switch (notification.type) {
      case 'SIMULATION_ASSIGNED':
      case 'SIMULATION_REMINDER':
        router.push('/(tabs)/simulations');
        break;
      case 'SIMULATION_RESULTS':
        router.push('/(tabs)/statistics');
        break;
      case 'EVENT_INVITATION':
      case 'EVENT_REMINDER':
        // router.push('/(tabs)/calendar');
        break;
      case 'MATERIAL_AVAILABLE':
        // router.push('/(tabs)/materials');
        break;
      default:
        break;
    }
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    markAllAsRead();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={['top']}>
      {/* Header actions */}
      {unreadCount > 0 && (
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text variant="bodySmall" style={{ color: colors.primary.main }}>
              Segna tutto come letto
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.main}
          />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="notifications-off-outline"
              size={64}
              color={themedColors.textMuted}
            />
            <Text variant="h5" color="muted">
              Nessuna notifica
            </Text>
            <Body color="muted" align="center">
              Non hai ancora ricevuto notifiche
            </Body>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                {
                  backgroundColor: notification.isRead
                    ? themedColors.card
                    : themedColors.backgroundSecondary,
                  borderColor: themedColors.border,
                },
              ]}
              onPress={() => handleNotificationPress(notification)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${getNotificationColor(notification.type)}20` },
                ]}
              >
                <Ionicons
                  name={getNotificationIcon(notification.type)}
                  size={20}
                  color={getNotificationColor(notification.type)}
                />
              </View>

              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <Text
                    variant="body"
                    style={{ fontWeight: notification.isRead ? '400' : '600' }}
                    numberOfLines={1}
                  >
                    {notification.title}
                  </Text>
                  {!notification.isRead && (
                    <View style={styles.unreadDot} />
                  )}
                </View>
                <Text variant="bodySmall" color="muted" numberOfLines={2}>
                  {notification.body}
                </Text>
                <Caption color="muted">{formatDate(notification.createdAt)}</Caption>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActions: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    alignItems: 'flex-end',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingTop: 0,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: spacing[4],
    borderRadius: layout.borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing[2],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: layout.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  notificationContent: {
    flex: 1,
    gap: spacing[1],
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.main,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[16],
    gap: spacing[3],
  },
});
