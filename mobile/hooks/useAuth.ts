/**
 * Leonardo School Mobile - Auth Hook
 * 
 * Hook per gestire l'inizializzazione dell'autenticazione e le notifiche.
 */

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { router, useSegments, useRootNavigationState } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { pushNotifications, handleNotificationResponse } from '../services/pushNotifications';
import { config } from '../lib/config';
import { secureStorage } from '../lib/storage';

/**
 * Hook per proteggere le route e reindirizzare in base allo stato auth
 */
export function useProtectedRoute() {
  const { user, isInitialized, isAuthenticated } = useAuthStore();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Wait for navigation to be ready
    if (!navigationState?.key) return;
    // Wait for auth initialization
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    // inTabsGroup could be used for additional logic if needed
    const _inTabsGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to home if authenticated and in auth group
      router.replace('/(tabs)');
    }
  }, [user, isInitialized, isAuthenticated, segments, navigationState?.key]);
}

/**
 * Hook per inizializzare le notifiche push
 */
export function usePushNotifications() {
  const { isAuthenticated } = useAuthStore();
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;

    const setupNotifications = async () => {
      try {
        const token = await pushNotifications.registerForPushNotifications();
        if (isMounted && token) {
          setPushToken(token);
          // Send token to backend
          await sendPushTokenToBackend(token);
          console.log('[Notifications] Registered with token:', token);
        }
      } catch (error) {
        console.error('[Notifications] Setup error:', error);
      }
    };

    setupNotifications();

    // Set up notification listeners
    const receivedSubscription = pushNotifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[Notifications] Received:', notification.request.content);
      }
    );

    const responseSubscription = pushNotifications.addNotificationResponseListener(
      (response) => {
        handleNotificationResponse(response);
      }
    );

    return () => {
      isMounted = false;
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [isAuthenticated]);

  return { pushToken };
}

/**
 * Hook combinato per autenticazione e notifiche
 */
export function useAppInitialization() {
  const { initialize, isInitialized } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initialize();
      setIsReady(true);
    };
    init();
  }, [initialize]);

  // Protezione route
  useProtectedRoute();

  // Push notifications (solo dopo init)
  usePushNotifications();

  return { isReady: isReady && isInitialized };
}

export default useAppInitialization;

/**
 * Send push notification token to backend for push notifications
 */
async function sendPushTokenToBackend(pushToken: string): Promise<void> {
  try {
    const authToken = await secureStorage.getAuthToken();
    if (!authToken) {
      console.warn('[Notifications] No auth token, skipping push token registration');
      return;
    }

    const response = await fetch(`${config.api.baseUrl}/api/notifications/register-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        token: pushToken,
        platform: Platform.OS, // 'ios' or 'android'
      }),
    });

    if (!response.ok) {
      console.warn('[Notifications] Failed to register push token:', response.status);
    } else {
      console.log('[Notifications] Push token registered successfully');
    }
  } catch (error) {
    console.error('[Notifications] Error sending push token:', error);
  }
}
