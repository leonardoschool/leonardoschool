/**
 * Notifications Module - Sistema di notifiche centralizzato
 * 
 * @example
 * // Per creare notifiche (lato server)
 * import { notifications } from '@/lib/notifications';
 * 
 * await notifications.contractSigned(prisma, { ... });
 * 
 * // Per la configurazione UI (lato client)
 * import { getNotificationConfig, getNotificationRoute } from '@/lib/notifications';
 * 
 * const config = getNotificationConfig('CONTRACT_SIGNED');
 */

// Export configuration utilities
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

// Export notification creation helpers
export {
  notifications,
  createNotification,
  createBulkNotifications,
  notifyByRole,
  notifyAdmins,
  notifyStaff,
  buildNotificationLink,
  deleteNotificationsForEntity,
  archiveReadNotifications,
  getUnreadCount,
} from './notificationHelpers';
