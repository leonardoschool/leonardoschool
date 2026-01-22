/**
 * Leonardo School Mobile - Tabs Layout
 * 
 * Layout con bottom tabs per la navigazione principale.
 */

import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform, StyleSheet } from 'react-native';

import { useThemedColors } from '../../contexts/ThemeContext';
import { colors } from '../../lib/theme/colors';
import { CountBadge } from '../../components/ui/Badge';
import { useNotificationStore } from '../../stores/notificationStore';
import { useAuthStore } from '../../stores/authStore';
import { trpc } from '../../lib/trpc';
import { pushNotifications, handleNotificationResponse } from '../../services/pushNotifications';
import type { NotificationType } from '../../types';

type IconName = keyof typeof Ionicons.glyphMap;

interface TabBarIconProps {
  name: IconName;
  color: string;
  focused: boolean;
  badge?: number;
}

function TabBarIcon({ name, color, focused, badge }: TabBarIconProps) {
  return (
    <View style={styles.iconContainer}>
      <Ionicons
        name={focused ? name : (`${name}-outline` as IconName)}
        size={24}
        color={color}
      />
      {badge !== undefined && badge > 0 && (
        <View style={styles.badgeContainer}>
          <CountBadge count={badge} />
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const themedColors = useThemedColors();
  const { unreadCount, setNotifications, setFcmToken, setPermissionStatus, addNotification } = useNotificationStore();
  const { user, isAuthenticated } = useAuthStore();

  // Fetch notifications on mount to populate badge
  const { data: notificationsData } = trpc.notifications.getNotifications.useQuery(
    { page: 1, pageSize: 50 },
    { enabled: isAuthenticated && !!user }
  );

  // Update store when notifications data changes
  useEffect(() => {
    if (notificationsData?.notifications) {
      setNotifications(notificationsData.notifications);
    }
  }, [notificationsData, setNotifications]);

  // Register push token mutation
  const registerPushTokenMutation = trpc.notifications.registerPushToken.useMutation();

  // Initialize push notifications
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    let receivedSubscription: ReturnType<typeof pushNotifications.addNotificationReceivedListener>;
    let responseSubscription: ReturnType<typeof pushNotifications.addNotificationResponseListener>;

    async function initPushNotifications() {
      try {
        // Register for push notifications and get token
        const token = await pushNotifications.registerForPushNotifications();
        
        if (token) {
          setFcmToken(token);
          setPermissionStatus('granted');
          console.log('[TabsLayout] Push token registered:', token);
          
          // Register token in backend
          registerPushTokenMutation.mutate({ expoPushToken: token });
        } else {
          setPermissionStatus('denied');
        }

        // Listen for notifications when app is in foreground
        receivedSubscription = pushNotifications.addNotificationReceivedListener((notification) => {
          console.log('[TabsLayout] Notification received:', notification);
          
          // Add to local store for immediate badge update
          const { title, body, data } = notification.request.content;
          addNotification({
            id: notification.request.identifier,
            type: (data?.type as NotificationType) || 'GENERAL',
            title: title || 'Nuova notifica',
            body: body || '',
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        });

        // Handle notification taps
        responseSubscription = pushNotifications.addNotificationResponseListener((response) => {
          handleNotificationResponse(response);
        });

      } catch (error) {
        console.error('[TabsLayout] Error initializing push notifications:', error);
      }
    }

    initPushNotifications();

    // Cleanup listeners
    return () => {
      receivedSubscription?.remove();
      responseSubscription?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, setFcmToken, setPermissionStatus, addNotification]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: themedColors.textMuted,
        tabBarStyle: {
          backgroundColor: themedColors.card,
          borderTopColor: themedColors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: themedColors.card,
        },
        headerTitleStyle: {
          color: themedColors.text,
          fontWeight: '600',
        },
        headerShadowVisible: false,
        headerTintColor: colors.primary.main,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="simulations"
        options={{
          title: 'Simulazioni',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="document-text" color={color} focused={focused} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="statistics"
        options={{
          title: 'Statistiche',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="stats-chart" color={color} focused={focused} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifiche',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="notifications"
              color={color}
              focused={focused}
              badge={unreadCount}
            />
          ),
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profilo',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="person" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -12,
  },
});
