/**
 * FCM Server Service
 *
 * Gestisce l'invio di push notifications dal server usando Firebase Admin SDK.
 * Usato per notifiche real-time invece del polling.
 */

import { getMessaging, type MulticastMessage } from 'firebase-admin/messaging';
import { prisma } from '@/lib/prisma/client';

// Tipi per le notifiche
export interface FCMNotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
}

export type FCMNotificationType =
  | 'NEW_MESSAGE'
  | 'NOTIFICATION'
  | 'SIMULATION_STARTED'
  | 'SIMULATION_ENDED'
  | 'SESSION_KICKED'
  | 'CONTRACT_STATUS'
  | 'REVIEW_PENDING';

export interface FCMDataPayload {
  type: FCMNotificationType;
  conversationId?: string;
  notificationId?: string;
  assignmentId?: string;
  sessionId?: string;
  senderId?: string;
  [key: string]: string | undefined;
}

export interface SendNotificationOptions {
  /** Notifica silenziosa - aggiorna UI senza mostrare popup */
  silent?: boolean;
  /** Priorità alta per notifiche urgenti */
  priority?: 'high' | 'normal';
  /** Time-to-live in secondi (default 24h) */
  ttlSeconds?: number;
}

export interface SendNotificationResult {
  success: boolean;
  successCount?: number;
  failureCount?: number;
  reason?: string;
  error?: unknown;
}

/**
 * Invia push notification a un singolo utente (tutti i suoi device)
 */
export async function sendPushNotificationToUser(
  userId: string,
  notification: FCMNotificationPayload,
  data: FCMDataPayload,
  options: SendNotificationOptions = {}
): Promise<SendNotificationResult> {
  try {
    // Recupera tutti i token FCM attivi dell'utente
    const fcmTokens = await prisma.fCMToken.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        id: true,
        token: true,
      },
    });

    if (fcmTokens.length === 0) {
      console.log(`[FCM] No active tokens for user ${userId}`);
      return { success: false, reason: 'no_tokens' };
    }

    const tokens = fcmTokens.map((t) => t.token);
    const result = await sendToTokens(tokens, notification, data, options);

    // Disattiva token non validi
    if (result.failedTokens && result.failedTokens.length > 0) {
      await prisma.fCMToken.updateMany({
        where: {
          token: { in: result.failedTokens },
        },
        data: {
          isActive: false,
        },
      });
      console.log(`[FCM] Deactivated ${result.failedTokens.length} invalid tokens`);
    }

    // Aggiorna lastUsedAt per token validi
    if (result.successCount && result.successCount > 0) {
      const successfulTokens = tokens.filter((t) => !result.failedTokens?.includes(t));
      await prisma.fCMToken.updateMany({
        where: {
          token: { in: successfulTokens },
        },
        data: {
          lastUsedAt: new Date(),
        },
      });
    }

    return {
      success: result.successCount > 0,
      successCount: result.successCount,
      failureCount: result.failureCount,
    };
  } catch (error) {
    console.error('[FCM] Error sending notification to user:', error);
    return { success: false, error };
  }
}

/**
 * Invia push notification a più utenti
 */
export async function sendPushNotificationToUsers(
  userIds: string[],
  notification: FCMNotificationPayload,
  data: FCMDataPayload,
  options: SendNotificationOptions = {}
): Promise<{
  total: number;
  successful: number;
  failed: number;
}> {
  const results = await Promise.allSettled(
    userIds.map((userId) => sendPushNotificationToUser(userId, notification, data, options))
  );

  const successful = results.filter(
    (r) => r.status === 'fulfilled' && r.value.success
  ).length;

  return {
    total: userIds.length,
    successful,
    failed: userIds.length - successful,
  };
}

/**
 * Invia notifica silenziosa per aggiornare UI (senza popup)
 */
export async function sendSilentUpdate(
  userId: string,
  data: FCMDataPayload
): Promise<SendNotificationResult> {
  return sendPushNotificationToUser(
    userId,
    { title: '', body: '' },
    data,
    { silent: true, priority: 'normal' }
  );
}

/**
 * Helper interno: invia a lista di token
 */
async function sendToTokens(
  tokens: string[],
  notification: FCMNotificationPayload,
  data: FCMDataPayload,
  options: SendNotificationOptions = {}
): Promise<{
  successCount: number;
  failureCount: number;
  failedTokens: string[];
}> {
  const messaging = getMessaging();

  // Converti data object in stringhe (FCM richiede solo stringhe)
  const stringData: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      stringData[key] = String(value);
    }
  }

  // TTL default 24 ore
  const ttlSeconds = options.ttlSeconds ?? 86400;

  const message: MulticastMessage = {
    tokens,
    data: stringData,
    webpush: {
      notification: options.silent
        ? undefined
        : {
            title: notification.title,
            body: notification.body,
            icon: '/images/logo-square.png',
            badge: '/images/badge-icon.png',
          },
      fcmOptions: {
        link: getNotificationLink(data),
      },
      headers: {
        TTL: String(ttlSeconds),
        Urgency: options.priority === 'high' ? 'high' : 'normal',
      },
    },
    android: {
      priority: options.priority === 'high' ? 'high' : 'normal',
      notification: options.silent
        ? undefined
        : {
            title: notification.title,
            body: notification.body,
            icon: 'ic_notification',
            channelId: 'default',
          },
      ttl: ttlSeconds * 1000,
    },
    apns: {
      payload: {
        aps: options.silent
          ? { 'content-available': 1 }
          : {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              sound: 'default',
              badge: 1,
            },
      },
      headers: {
        'apns-priority': options.priority === 'high' ? '10' : '5',
        'apns-expiration': String(Math.floor(Date.now() / 1000) + ttlSeconds),
      },
    },
  };

  try {
    const response = await messaging.sendEachForMulticast(message);

    // Raccogli token falliti
    const failedTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errorCode = resp.error?.code;
        // Token non validi da rimuovere
        if (
          errorCode === 'messaging/invalid-registration-token' ||
          errorCode === 'messaging/registration-token-not-registered'
        ) {
          failedTokens.push(tokens[idx]);
        }
        console.warn(`[FCM] Failed to send to token ${idx}:`, resp.error?.message);
      }
    });

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens,
    };
  } catch (error) {
    console.error('[FCM] sendEachForMulticast error:', error);
    return {
      successCount: 0,
      failureCount: tokens.length,
      failedTokens: [],
    };
  }
}

/**
 * Genera link per la notifica in base al tipo
 */
function getNotificationLink(data: FCMDataPayload): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  switch (data.type) {
    case 'NEW_MESSAGE':
      return data.conversationId
        ? `${baseUrl}/messaggi?conversation=${data.conversationId}`
        : `${baseUrl}/messaggi`;

    case 'NOTIFICATION':
      return `${baseUrl}/notifiche`;

    case 'SIMULATION_STARTED':
      return data.assignmentId
        ? `${baseUrl}/virtual-room/${data.assignmentId}`
        : `${baseUrl}/simulazioni`;

    case 'SIMULATION_ENDED':
      return data.assignmentId
        ? `${baseUrl}/simulazioni/${data.assignmentId}/risultato`
        : `${baseUrl}/simulazioni`;

    case 'SESSION_KICKED':
      return `${baseUrl}/simulazioni?kicked=true`;

    case 'CONTRACT_STATUS':
      return `${baseUrl}/contratti`;

    case 'REVIEW_PENDING':
      return `${baseUrl}/simulazioni?tab=review`;

    default:
      return `${baseUrl}/dashboard`;
  }
}

// ============= Notifiche Specifiche =============

/**
 * Invia notifica per nuovo messaggio
 */
export async function notifyNewMessage(
  recipientUserId: string,
  senderName: string,
  messagePreview: string,
  conversationId: string
): Promise<SendNotificationResult> {
  return sendPushNotificationToUser(
    recipientUserId,
    {
      title: `Nuovo messaggio da ${senderName}`,
      body: messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : ''),
    },
    {
      type: 'NEW_MESSAGE',
      conversationId,
    },
    { priority: 'high' }
  );
}

/**
 * Invia notifica per nuova notifica di sistema
 */
export async function notifySystemNotification(
  userId: string,
  title: string,
  body: string,
  notificationId: string
): Promise<SendNotificationResult> {
  return sendPushNotificationToUser(
    userId,
    { title, body },
    {
      type: 'NOTIFICATION',
      notificationId,
    },
    { priority: 'normal' }
  );
}

/**
 * Invia notifica per inizio simulazione
 */
export async function notifySimulationStarted(
  userIds: string[],
  simulationTitle: string,
  assignmentId: string,
  sessionId: string
): Promise<{ total: number; successful: number; failed: number }> {
  return sendPushNotificationToUsers(
    userIds,
    {
      title: '🎯 Simulazione iniziata!',
      body: `"${simulationTitle}" è pronta. Entra nella Virtual Room!`,
    },
    {
      type: 'SIMULATION_STARTED',
      assignmentId,
      sessionId,
    },
    { priority: 'high' }
  );
}

/**
 * Invia notifica per fine simulazione
 */
export async function notifySimulationEnded(
  userIds: string[],
  simulationTitle: string,
  assignmentId: string
): Promise<{ total: number; successful: number; failed: number }> {
  return sendPushNotificationToUsers(
    userIds,
    {
      title: '✅ Simulazione completata',
      body: `"${simulationTitle}" è terminata. Visualizza i risultati!`,
    },
    {
      type: 'SIMULATION_ENDED',
      assignmentId,
    },
    { priority: 'normal' }
  );
}

/**
 * Invia notifica per espulsione da sessione
 */
export async function notifySessionKicked(
  userId: string,
  reason?: string
): Promise<SendNotificationResult> {
  return sendPushNotificationToUser(
    userId,
    {
      title: '⚠️ Rimosso dalla sessione',
      body: reason || 'Sei stato rimosso dalla sessione di simulazione.',
    },
    {
      type: 'SESSION_KICKED',
    },
    { priority: 'high' }
  );
}

/**
 * Invia aggiornamento silenzioso per invalidare cache client
 */
export async function sendCacheInvalidation(
  userId: string,
  cacheKey: string
): Promise<SendNotificationResult> {
  return sendSilentUpdate(userId, {
    type: 'NOTIFICATION',
    cacheKey,
    silent: 'true',
  });
}
