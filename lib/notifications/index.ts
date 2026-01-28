/**
 * Notifications Module - Sistema di notifiche centralizzato
 * 
 * @example
 * // Per la configurazione UI (lato client) - SAFE
 * import { getNotificationConfig, getNotificationRoute } from '@/lib/notifications';
 * 
 * const config = getNotificationConfig('CONTRACT_SIGNED');
 * 
 * // Per creare notifiche (SOLO lato server)
 * // Import direttamente da notificationHelpers per evitare bundling client
 * import { notifications } from '@/lib/notifications/notificationHelpers';
 * 
 * await notifications.contractSigned(prisma, { ... });
 */

// Export configuration utilities - SAFE FOR CLIENT
export {
  notificationConfigs,
  getNotificationConfig,
  getNotificationRoute,
  getCategoryLabels,
  getTypesByCategory,
  isValidNotificationType,
  type NotificationType,
  type NotificationCategory,
  type NotificationConfig,
  type UserRole,
  type RouteParams,
} from './notificationConfig';

// NOTE: Server-only exports (notifications, createNotification, etc.)
// are NOT re-exported here to prevent client bundling issues.
// Import them directly from '@/lib/notifications/notificationHelpers' in server code.
