/**
 * Firebase Cloud Messaging Client SDK
 *
 * Gestisce le push notifications per il browser web.
 * Per mobile, usiamo Expo Push Notifications che usa FCM/APNs sotto il cofano.
 */

import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';
import { app } from './config';

let messaging: Messaging | null = null;
let isMessagingSupported = false;

/**
 * Inizializza Firebase Cloud Messaging (solo browser)
 * Verifica supporto browser prima di inizializzare
 */
export async function initializeMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;

  try {
    // Verifica se il browser supporta FCM
    isMessagingSupported = await isSupported();
    if (!isMessagingSupported) {
      console.log('[FCM] Browser does not support messaging');
      return null;
    }

    if (!app) {
      console.error('[FCM] Firebase app not initialized');
      return null;
    }

    messaging = getMessaging(app);
    return messaging;
  } catch (error) {
    console.error('[FCM] Error initializing messaging:', error);
    return null;
  }
}

/**
 * Richiede permessi notifiche e genera FCM token
 * @returns FCM token o null se non disponibile/negato
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    // Verifica supporto
    const supported = await isSupported();
    if (!supported) {
      console.log('[FCM] Notifications not supported in this browser');
      return null;
    }

    // Richiedi permessi
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[FCM] Notification permission denied');
      return null;
    }

    // Inizializza messaging se non già fatto
    const msg = await initializeMessaging();
    if (!msg) return null;

    // Registra service worker
    const registration = await registerServiceWorker();
    if (!registration) {
      console.error('[FCM] Service worker registration failed');
      return null;
    }

    // Genera token con VAPID key
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error('[FCM] VAPID key not configured');
      return null;
    }

    const token = await getToken(msg, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    console.log('[FCM] Token obtained successfully');
    return token;
  } catch (error) {
    console.error('[FCM] Error getting token:', error);
    return null;
  }
}

/**
 * Registra il service worker per notifiche background
 * Usa l'endpoint dinamico che inietta le variabili d'ambiente
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.error('[FCM] Service workers not supported');
    return null;
  }

  try {
    // Use dynamic service worker endpoint that injects environment variables
    const registration = await navigator.serviceWorker.register('/api/firebase-messaging-sw', {
      scope: '/',
    });
    console.log('[FCM] Service worker registered:', registration.scope);
    return registration;
  } catch (error) {
    console.error('[FCM] Service worker registration failed:', error);
    return null;
  }
}

/**
 * Tipo per payload messaggio FCM
 */
export interface FCMPayload {
  notification?: {
    title?: string;
    body?: string;
    image?: string;
  };
  data?: {
    type?: 'NEW_MESSAGE' | 'NOTIFICATION' | 'SIMULATION_STARTED' | 'SIMULATION_ENDED' | 'SESSION_KICKED';
    conversationId?: string;
    notificationId?: string;
    assignmentId?: string;
    sessionId?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Setup listener per messaggi in foreground
 * Chiamato quando l'app è aperta e in primo piano
 */
export function setupForegroundMessageListener(
  onMessageReceived: (payload: FCMPayload) => void
): (() => void) | null {
  if (!messaging) {
    console.warn('[FCM] Messaging not initialized, cannot setup listener');
    return null;
  }

  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('[FCM] Foreground message received:', payload);
    onMessageReceived(payload as FCMPayload);
  });

  return unsubscribe;
}

/**
 * Verifica se le notifiche sono supportate e abilitate
 */
export async function checkNotificationStatus(): Promise<{
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
}> {
  if (typeof window === 'undefined') {
    return { supported: false, permission: 'unsupported' };
  }

  const supported = await isSupported();
  if (!supported) {
    return { supported: false, permission: 'unsupported' };
  }

  return {
    supported: true,
    permission: Notification.permission,
  };
}

/**
 * Verifica se FCM è pronto per l'uso
 */
export function isMessagingReady(): boolean {
  return messaging !== null && isMessagingSupported;
}
