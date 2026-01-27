/**
 * Leonardo School Mobile - Push Notifications Service
 * 
 * Gestione notifiche push con Expo Notifications e Firebase Cloud Messaging.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { secureStorage } from '../lib/storage';
import type { NotificationType } from '../types';

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationService {
  registerForPushNotifications: () => Promise<string | null>;
  scheduleLocalNotification: (
    title: string,
    body: string,
    data?: Record<string, unknown>,
    trigger?: Notifications.NotificationTriggerInput
  ) => Promise<string>;
  cancelNotification: (notificationId: string) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  setBadgeCount: (count: number) => Promise<void>;
  getBadgeCount: () => Promise<number>;
  addNotificationReceivedListener: (
    listener: (notification: Notifications.Notification) => void
  ) => Notifications.Subscription;
  addNotificationResponseListener: (
    listener: (response: Notifications.NotificationResponse) => void
  ) => Notifications.Subscription;
}

/**
 * Request permissions and register for push notifications
 */
async function registerForPushNotifications(): Promise<string | null> {
  let token: string | null = null;

  // Check if we're on a physical device (required for push notifications)
  if (!Device.isDevice) {
    console.log('[Notifications] Push notifications require a physical device');
    return null;
  }

  // Check current permission status
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permission not granted');
    return null;
  }

  // Get the Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    // TODO: Verificare che il projectId sia configurato correttamente e rimuovere questo commento
    if (!projectId) {
      console.warn('[Notifications] No projectId found. Push notifications require EAS project setup.');
      console.warn('[Notifications] Run: cd mobile && npx eas-cli init');
      return null;
    }
    
    const expoPushToken = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    token = expoPushToken.data;
    
    // Store token for later use
    await secureStorage.setFcmToken(token);
    
    console.log('[Notifications] Push token:', token);
  } catch (error) {
    console.error('[Notifications] Error getting push token:', error);
  }

  // Android-specific: Set up notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Predefinito',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#a8012b',
    });

    // Additional channels for different notification types
    await Notifications.setNotificationChannelAsync('simulations', {
      name: 'Simulazioni',
      description: 'Notifiche relative a simulazioni e quiz',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#a8012b',
    });

    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Promemoria',
      description: 'Promemoria eventi e scadenze',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#EAB308',
    });

    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messaggi',
      description: 'Nuovi messaggi e comunicazioni',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#a8012b',
    });
  }

  return token;
}

/**
 * Schedule a local notification
 */
async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: trigger || null, // null = show immediately
  });

  return notificationId;
}

/**
 * Cancel a scheduled notification
 */
async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Set badge count
 */
async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Get current badge count
 */
async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Add listener for received notifications (when app is in foreground)
 */
function addNotificationReceivedListener(
  listener: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(listener);
}

/**
 * Add listener for notification responses (when user taps notification)
 */
function addNotificationResponseListener(
  listener: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(listener);
}

/**
 * Handle notification response (navigation based on notification type)
 */
export function handleNotificationResponse(
  response: Notifications.NotificationResponse
): void {
  const data = response.notification.request.content.data;
  const type = data?.type as NotificationType | undefined;

  console.log('[Notifications] User tapped notification:', { type, data });

  switch (type) {
    case 'SIMULATION_ASSIGNED':
    case 'SIMULATION_REMINDER':
      router.push('/(tabs)/simulations');
      break;
    case 'SIMULATION_RESULTS':
      if (data?.simulationId) {
        router.push(`/simulation/result/${data.simulationId}`);
      } else {
        router.push('/(tabs)/statistics');
      }
      break;
    case 'EVENT_INVITATION':
    case 'EVENT_REMINDER':
      // TODO: Navigate to calendar when implemented
      router.push('/(tabs)');
      break;
    case 'MATERIAL_AVAILABLE':
      // TODO: Navigate to materials when implemented
      router.push('/(tabs)');
      break;
    case 'MESSAGE_RECEIVED':
      // TODO: Navigate to messages when implemented
      router.push('/(tabs)');
      break;
    default:
      router.push('/(tabs)/notifications');
      break;
  }
}

// Export the service
export const pushNotifications: PushNotificationService = {
  registerForPushNotifications,
  scheduleLocalNotification,
  cancelNotification,
  cancelAllNotifications,
  setBadgeCount,
  getBadgeCount,
  addNotificationReceivedListener,
  addNotificationResponseListener,
};

export default pushNotifications;
