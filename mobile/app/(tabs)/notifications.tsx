/**
 * Leonardo School Mobile - Notifications Screen
 * 
 * Lista notifiche utente.
 * Dati caricati dalle API tRPC reali.
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text, Body, Caption } from '../../components/ui/Text';
import { useThemedColors } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/theme/colors';
import { spacing, layout } from '../../lib/theme/spacing';
import type { NotificationType } from '../../types';

// Type for notification from API
interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string | Date;
}

export default function NotificationsScreen() {
  const themedColors = useThemedColors();
  const { user } = useAuthStore();

  // Fetch notifications from API
  const {
    data: notificationsData,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.notifications.getMyNotifications.useQuery(
    { page: 1, pageSize: 50 },
    { enabled: !!user }
  );

  // Mark as read mutation
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => refetch(),
  });

  // Mark all as read mutation
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => refetch(),
  });

  const onRefresh = async () => {
    await refetch();
  };

  const notifications: NotificationItem[] = (notificationsData?.notifications || []) as NotificationItem[];

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

  const formatDate = (dateStr: string | Date) => {
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

  const handleNotificationPress = (notification: NotificationItem) => {
    // Mark as read via API
    if (!notification.isRead) {
      markAsReadMutation.mutate({ notificationId: notification.id });
    }

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
    markAllAsReadMutation.mutate();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={['top']}>
      {/* Header actions */}
      {unreadCount > 0 && (
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
          >
            <Text variant="bodySmall" style={{ color: colors.primary.main }}>
              {markAllAsReadMutation.isPending ? 'Attendere...' : 'Segna tutto come letto'}
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
            refreshing={isRefetching}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
