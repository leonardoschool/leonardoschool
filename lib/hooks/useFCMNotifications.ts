/**
 * useFCMNotifications Hook
 *
 * Gestisce l'inizializzazione e la ricezione di push notifications FCM.
 * Registra automaticamente il token quando l'utente accetta le notifiche.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  requestNotificationPermission,
  setupForegroundMessageListener,
  checkNotificationStatus,
  type FCMPayload,
} from '@/lib/firebase/messaging';

export interface UseFCMNotificationsOptions {
  /** Callback quando arriva un messaggio in foreground */
  onMessage?: (payload: FCMPayload) => void;
  /** Abilita richiesta automatica permessi (default: false, richiede user gesture) */
  autoRequestPermission?: boolean;
}

export interface UseFCMNotificationsReturn {
  /** Permessi notifiche concessi */
  permissionGranted: boolean;
  /** Notifiche supportate dal browser */
  isSupported: boolean;
  /** Stato permessi: 'default' | 'granted' | 'denied' | 'unsupported' */
  permissionStatus: NotificationPermission | 'unsupported';
  /** Caricamento in corso */
  isLoading: boolean;
  /** Errore durante setup */
  error: string | null;
  /** Token FCM registrato */
  hasToken: boolean;
  /** Richiedi permessi manualmente */
  requestPermission: () => Promise<boolean>;
}

/**
 * Hook per gestire le push notifications FCM
 *
 * @example
 * ```tsx
 * const { permissionGranted, requestPermission } = useFCMNotifications({
 *   onMessage: (payload) => {
 *     // Invalida query React Query
 *     if (payload.data?.type === 'NEW_MESSAGE') {
 *       queryClient.invalidateQueries(['messages']);
 *     }
 *   }
 * });
 * ```
 */
export function useFCMNotifications(
  options: UseFCMNotificationsOptions = {}
): UseFCMNotificationsReturn {
  const { onMessage } = options;

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const tokenRef = useRef<string | null>(null);
  const isRegisteringRef = useRef(false); // Prevent multiple registrations

  const utils = trpc.useUtils();
  const registerTokenMutation = trpc.fcm.registerToken.useMutation();

  /**
   * Mostra notifica browser in foreground
   */
  const showBrowserNotification = useCallback((payload: FCMPayload) => {
    if (!payload.notification?.title) return;

    const notification = new Notification(payload.notification.title, {
      body: payload.notification.body || '',
      icon: '/images/logo-square.png',
      badge: '/images/badge-icon.png',
      tag: payload.data?.notificationId || payload.data?.conversationId || 'default',
      data: payload.data,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();

      // Naviga in base al tipo
      if (payload.data?.type === 'NEW_MESSAGE' && payload.data.conversationId) {
        window.location.href = `/messaggi?conversation=${payload.data.conversationId}`;
      } else if (payload.data?.type === 'NOTIFICATION') {
        window.location.href = '/notifiche';
      }
    };
  }, []);

  /**
   * Handler per messaggi in foreground
   */
  const handleForegroundMessage = useCallback(
    (payload: FCMPayload) => {
      console.log('[FCM Hook] Message received:', payload);

      // Invalida query React Query in base al tipo
      if (payload.data?.type === 'NEW_MESSAGE') {
        utils.messages.getConversations.invalidate();
        utils.messages.getUnreadCount.invalidate();
        if (payload.data.conversationId) {
          utils.messages.getMessages.invalidate({ conversationId: payload.data.conversationId });
        }
      } else if (payload.data?.type === 'NOTIFICATION') {
        utils.notifications.getNotifications.invalidate();
      } else if (payload.data?.type === 'SIMULATION_STARTED' || payload.data?.type === 'SIMULATION_ENDED') {
        utils.simulations.getAssignments.invalidate();
        utils.virtualRoom.getStudentSessionStatus.invalidate();
      }

      // Callback utente
      onMessage?.(payload);

      // Mostra notifica browser anche in foreground (opzionale)
      if (Notification.permission === 'granted' && payload.notification && !payload.data?.silent) {
        showBrowserNotification(payload);
      }
    },
    [onMessage, utils, showBrowserNotification]
  );

  /**
   * Richiedi permessi e registra token
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    // Prevent concurrent registrations
    if (isRegisteringRef.current) {
      console.log('[FCM Hook] Registration already in progress, skipping');
      return hasToken;
    }
    
    isRegisteringRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const token = await requestNotificationPermission();

      if (!token) {
        setPermissionGranted(false);
        setPermissionStatus(Notification.permission);
        setIsLoading(false);
        isRegisteringRef.current = false;
        return false;
      }

      // Registra token nel database
      const deviceInfo = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
      await registerTokenMutation.mutateAsync({
        token,
        deviceInfo,
        platform: 'web',
      });

      tokenRef.current = token;
      setHasToken(true);
      setPermissionGranted(true);
      setPermissionStatus('granted');

      // Setup listener per messaggi foreground
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      unsubscribeRef.current = setupForegroundMessageListener(handleForegroundMessage);

      console.log('[FCM Hook] Token registered successfully');
      setIsLoading(false);
      isRegisteringRef.current = false;
      return true;
    } catch (err) {
      console.error('[FCM Hook] Error requesting permission:', err);
      setError(err instanceof Error ? err.message : 'Errore durante la richiesta permessi');
      setIsLoading(false);
      isRegisteringRef.current = false;
      return false;
    }
  }, [registerTokenMutation, handleForegroundMessage, hasToken]);

  /**
   * Check iniziale supporto e stato permessi
   */
  useEffect(() => {
    // Run only once on mount
    let mounted = true;
    
    const checkStatus = async () => {
      const status = await checkNotificationStatus();
      
      if (!mounted) return;
      
      setIsSupported(status.supported);
      setPermissionStatus(status.permission);
      setPermissionGranted(status.permission === 'granted');

      // Se già granted e non abbiamo già un token, registra automaticamente
      if (status.permission === 'granted' && status.supported && !tokenRef.current) {
        console.log('[FCM Hook] Permission already granted, registering token...');
        await requestPermission();
      }

      if (mounted) {
        setIsLoading(false);
      }
    };

    checkStatus();

    // Cleanup
    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  /**
   * Listener per messaggi dal service worker (click su notifica)
   * Invalida le query per aggiornare UI quando l'utente clicca su notifica
   */
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        console.log('[FCM Hook] Notification clicked from SW:', event.data);
        
        // Invalida le query in base al tipo di notifica
        const data = event.data.data || {};
        if (data.type === 'NEW_MESSAGE') {
          utils.messages.getConversations.invalidate();
          utils.messages.getUnreadCount.invalidate();
          if (data.conversationId) {
            utils.messages.getMessages.invalidate({ conversationId: data.conversationId });
          }
        } else {
          // Per tutte le altre notifiche, aggiorna la lista notifiche
          utils.notifications.getNotifications.invalidate();
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSWMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
    };
  }, [utils]);

  /**
   * Invalida le notifiche quando la pagina torna visibile
   * Questo gestisce il caso in cui l'utente ha visto il banner ma non ci ha cliccato
   */
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasToken) {
        // Refresh notifiche quando la pagina torna visibile
        // Questo cattura le notifiche arrivate mentre la pagina era in background
        utils.notifications.getNotifications.invalidate();
        utils.messages.getUnreadCount.invalidate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [utils, hasToken]);

  return {
    permissionGranted,
    isSupported,
    permissionStatus,
    isLoading,
    error,
    hasToken,
    requestPermission,
  };
}

/**
 * Hook semplificato per componenti che vogliono solo invalidare cache
 */
export function useFCMCacheInvalidation() {
  return useFCMNotifications({
    autoRequestPermission: false,
  });
}
