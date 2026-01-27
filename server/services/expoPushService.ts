/**
 * Expo Push Notification Service
 * 
 * Invia push notifications ai dispositivi mobile tramite Expo Push Service.
 * 
 * @see https://docs.expo.dev/push-notifications/sending-notifications/
 */

interface ExpoPushMessage {
  to: string; // Expo push token
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number; // seconds
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: 'DeviceNotRegistered' | 'InvalidCredentials' | 'MessageTooBig' | 'MessageRateExceeded';
  };
}

interface ExpoPushResponse {
  data: ExpoPushTicket[];
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send a push notification to a single device
 */
export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
  options?: {
    sound?: 'default' | null;
    badge?: number;
    channelId?: string;
    priority?: 'default' | 'normal' | 'high';
  }
): Promise<{ success: boolean; error?: string }> {
  // Validate Expo push token format
  if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken[')) {
    console.warn('[ExpoPush] Invalid push token format:', expoPushToken);
    return { success: false, error: 'Invalid push token format' };
  }

  const message: ExpoPushMessage = {
    to: expoPushToken,
    title,
    body,
    data,
    sound: options?.sound ?? 'default',
    badge: options?.badge,
    channelId: options?.channelId ?? 'default',
    priority: options?.priority ?? 'high',
  };

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ExpoPush] HTTP error:', response.status, errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = (await response.json()) as ExpoPushResponse;
    const ticket = result.data[0];

    if (ticket.status === 'error') {
      console.error('[ExpoPush] Push failed:', ticket.message, ticket.details);
      
      // Handle DeviceNotRegistered - token is invalid
      if (ticket.details?.error === 'DeviceNotRegistered') {
        return { success: false, error: 'DeviceNotRegistered' };
      }
      
      return { success: false, error: ticket.message };
    }

    console.log('[ExpoPush] Push sent successfully:', ticket.id);
    return { success: true };
  } catch (error) {
    console.error('[ExpoPush] Failed to send push:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send push notifications to multiple devices
 */
export async function sendBulkPushNotifications(
  messages: Array<{
    expoPushToken: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }>
): Promise<{ sent: number; failed: number; invalidTokens: string[] }> {
  // Filter valid tokens
  const validMessages = messages.filter(m => 
    m.expoPushToken && m.expoPushToken.startsWith('ExponentPushToken[')
  );

  if (validMessages.length === 0) {
    return { sent: 0, failed: 0, invalidTokens: [] };
  }

  const pushMessages: ExpoPushMessage[] = validMessages.map(m => ({
    to: m.expoPushToken,
    title: m.title,
    body: m.body,
    data: m.data,
    sound: 'default',
    priority: 'high',
  }));

  try {
    // Expo recommends sending in batches of 100
    const BATCH_SIZE = 100;
    const batches = [];
    for (let i = 0; i < pushMessages.length; i += BATCH_SIZE) {
      batches.push(pushMessages.slice(i, i + BATCH_SIZE));
    }

    let sent = 0;
    let failed = 0;
    const invalidTokens: string[] = [];

    for (const batch of batches) {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        console.error('[ExpoPush] Batch failed:', response.status);
        failed += batch.length;
        continue;
      }

      const result = (await response.json()) as ExpoPushResponse;
      
      result.data.forEach((ticket, index) => {
        if (ticket.status === 'ok') {
          sent++;
        } else {
          failed++;
          if (ticket.details?.error === 'DeviceNotRegistered') {
            invalidTokens.push(batch[index].to);
          }
        }
      });
    }

    console.log(`[ExpoPush] Bulk send complete: ${sent} sent, ${failed} failed`);
    return { sent, failed, invalidTokens };
  } catch (error) {
    console.error('[ExpoPush] Bulk send error:', error);
    return { sent: 0, failed: messages.length, invalidTokens: [] };
  }
}
