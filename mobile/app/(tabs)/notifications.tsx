/**
 * Leonardo School Mobile - Notifications Screen
 * 
 * Lista notifiche utente.
 * Allineato alla webapp NotificationsPageContent.tsx
 */

import React, { useEffect, useState } from 'react';
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

import { AppHeader, DrawerMenu } from '../../components/navigation';

import { Text, Body, Caption } from '../../components/ui/Text';
import { useThemedColors } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/theme/colors';
import { spacing, layout } from '../../lib/theme/spacing';
import type { NotificationType } from '../../types';

// Filter types matching webapp
type FilterType = 'all' | 'unread' | 'archived';

// Type for notification from API
interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  message?: string;
  isRead: boolean;
  isArchived?: boolean;
  isUrgent?: boolean;
  createdAt: string | Date;
}

export default function NotificationsScreen() {
  const themedColors = useThemedColors();
  const { user } = useAuthStore();
  const { setNotifications, markAsRead: markAsReadInStore, markAllAsRead: markAllAsReadInStore } = useNotificationStore();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  // Fetch notifications from API with filter (matching webapp)
  const {
    data: notificationsData,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.notifications.getNotifications.useQuery(
    { 
      page: 1, 
      pageSize: 50,
      unreadOnly: filter === 'unread',
      archivedOnly: filter === 'archived',
    },
    { enabled: !!user }
  );

  // Update notification store when data changes
  useEffect(() => {
    if (notificationsData?.notifications) {
      setNotifications(notificationsData.notifications);
    }
  }, [notificationsData, setNotifications]);

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
    // Mark as read via API and update local store
    if (!notification.isRead) {
      markAsReadMutation.mutate({ notificationId: notification.id });
      markAsReadInStore(notification.id);
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
        // TODO: Navigate to calendar when tab is implemented
        break;
      case 'MATERIAL_AVAILABLE':
        // TODO: Navigate to materials when tab is implemented
        break;
      default:
        break;
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
    markAllAsReadInStore();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={[]}>
        <AppHeader title="Notifiche" onMenuPress={() => setDrawerVisible(true)} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
        <DrawerMenu
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          currentRoute="/notifications"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={[]}>
      <AppHeader title="Notifiche" onMenuPress={() => setDrawerVisible(true)} />
      
      {/* Header with unread count and action */}
      <View style={styles.headerSection}>
        <View style={styles.headerTitleRow}>
          <Text variant="h4">Notifiche</Text>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary.main }]}>
              <Text variant="caption" style={{ color: '#FFFFFF', fontWeight: '600' }}>
                {unreadCount} da leggere
              </Text>
            </View>
          )}
        </View>
        {filter !== 'archived' && unreadCount > 0 && (
          <TouchableOpacity 
            onPress={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
            style={styles.markAllButton}
          >
            <Ionicons name="checkmark-done" size={16} color={colors.primary.main} />
            <Text variant="bodySmall" style={{ color: colors.primary.main, marginLeft: 4 }}>
              {markAllAsReadMutation.isPending ? 'Attendere...' : 'Segna tutte lette'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs - matching webapp */}
      <View style={[styles.filterContainer, { backgroundColor: themedColors.backgroundSecondary }]}>
        {(['all', 'unread', 'archived'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterTab,
              filter === f && [styles.filterTabActive, { backgroundColor: themedColors.card }],
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              variant="buttonSmall"
              style={{ color: filter === f ? themedColors.text : themedColors.textMuted }}
            >
              {f === 'all' ? 'Tutte' : f === 'unread' ? 'Non lette' : 'Archiviate'}
            </Text>
            {f === 'unread' && unreadCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: colors.status.error.main }]}>
                <Text variant="caption" style={{ color: '#FFFFFF', fontSize: 10 }}>
                  {unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

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
            <Text variant="h5" color="muted" style={{ marginTop: spacing[3] }}>
              {filter === 'unread' && 'Nessuna notifica non letta'}
              {filter === 'archived' && 'Nessuna notifica archiviata'}
              {filter === 'all' && 'Nessuna notifica'}
            </Text>
            <Body color="muted" align="center">
              {filter === 'all' 
                ? 'Non hai ancora ricevuto notifiche'
                : filter === 'unread'
                  ? 'Tutte le notifiche sono state lette!'
                  : 'Non hai notifiche archiviate'}
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
                    : `${colors.primary.main}08`,
                  borderColor: notification.isRead ? themedColors.border : colors.primary.main,
                  borderWidth: notification.isRead ? 1 : 1.5,
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
                {notification.isUrgent ? (
                  <Ionicons name="warning" size={20} color={colors.status.warning.main} />
                ) : (
                  <Ionicons
                    name={getNotificationIcon(notification.type)}
                    size={20}
                    color={getNotificationColor(notification.type)}
                  />
                )}
              </View>

              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <View style={styles.titleRow}>
                    <Text
                      variant="body"
                      style={{ fontWeight: notification.isRead ? '400' : '600', flex: 1 }}
                      numberOfLines={1}
                    >
                      {notification.title}
                    </Text>
                    {notification.isUrgent && (
                      <View style={[styles.urgentBadge, { backgroundColor: `${colors.status.warning.main}20` }]}>
                        <Text variant="caption" style={{ color: colors.status.warning.main, fontSize: 10 }}>
                          Urgente
                        </Text>
                      </View>
                    )}
                  </View>
                  {!notification.isRead && (
                    <View style={styles.unreadDot} />
                  )}
                </View>
                <Text variant="bodySmall" color="muted" numberOfLines={2}>
                  {notification.body || notification.message}
                </Text>
                <Caption color="muted" style={{ marginTop: spacing[1] }}>
                  {formatDate(notification.createdAt)}
                </Caption>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <DrawerMenu
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        currentRoute="/notifications"
      />
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
  headerSection: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  unreadBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: layout.borderRadius.full,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    padding: spacing[1],
    borderRadius: layout.borderRadius.lg,
    gap: spacing[1],
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    borderRadius: layout.borderRadius.md,
    gap: spacing[1],
  },
  filterTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterBadge: {
    paddingHorizontal: spacing[1.5],
    paddingVertical: spacing[0.5],
    borderRadius: layout.borderRadius.full,
    minWidth: 18,
    alignItems: 'center',
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  urgentBadge: {
    paddingHorizontal: spacing[1.5],
    paddingVertical: spacing[0.5],
    borderRadius: layout.borderRadius.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.main,
    marginTop: spacing[1.5],
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[16],
    gap: spacing[2],
  },
});
