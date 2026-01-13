/**
 * Validation schemas for notifications
 */
import { z } from 'zod';

// Notification types enum (must match Prisma schema)
export const NotificationTypeEnum = z.enum([
  'ACCOUNT_ACTIVATED',
  'NEW_REGISTRATION',
  'PROFILE_COMPLETED',
  'PARENT_DATA_REQUESTED',
  'CONTRACT_ASSIGNED',
  'CONTRACT_SIGNED',
  'CONTRACT_REMINDER',
  'CONTRACT_EXPIRED',
  'CONTRACT_CANCELLED',
  'EVENT_INVITATION',
  'EVENT_REMINDER',
  'EVENT_UPDATED',
  'EVENT_CANCELLED',
  'SIMULATION_ASSIGNED',
  'SIMULATION_REMINDER',
  'SIMULATION_READY',
  'SIMULATION_STARTED',
  'SIMULATION_RESULTS',
  'SIMULATION_COMPLETED',
  'STAFF_ABSENCE',
  'ABSENCE_REQUEST',
  'ABSENCE_CONFIRMED',
  'ABSENCE_REJECTED',
  'SUBSTITUTION_ASSIGNED',
  'QUESTION_FEEDBACK',
  'OPEN_ANSWER_TO_REVIEW',
  'MATERIAL_AVAILABLE',
  'GROUP_MEMBER_ADDED',
  'GROUP_REFERENT_ASSIGNED',
  'MESSAGE_RECEIVED',
  'JOB_APPLICATION',
  'CONTACT_REQUEST',
  'ATTENDANCE_RECORDED',
  'SYSTEM_ALERT',
  'GENERAL',
]);

export const NotificationChannelEnum = z.enum(['IN_APP', 'EMAIL', 'BOTH']);

// Filter schema for getting notifications
export const getNotificationsSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  unreadOnly: z.boolean().default(false),
  archivedOnly: z.boolean().default(false),
  types: z.array(NotificationTypeEnum).optional(),
  isUrgent: z.boolean().optional(),
  search: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Mark notifications as read
export const markNotificationsReadSchema = z.object({
  notificationIds: z.array(z.string()).min(1).max(100),
});

// Mark single notification as read
export const markNotificationReadSchema = z.object({
  notificationId: z.string(),
});

// Archive notifications
export const archiveNotificationsSchema = z.object({
  notificationIds: z.array(z.string()).min(1).max(100),
});

// Archive all read notifications
export const archiveAllReadSchema = z.object({
  olderThanDays: z.number().int().min(0).max(365).optional(),
});

// Delete notifications
export const deleteNotificationsSchema = z.object({
  notificationIds: z.array(z.string()).min(1).max(100),
});

// Update notification preference
export const updatePreferenceSchema = z.object({
  notificationType: NotificationTypeEnum,
  inAppEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable().optional(),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable().optional(),
});

// Bulk update preferences
export const bulkUpdatePreferencesSchema = z.object({
  preferences: z.array(z.object({
    notificationType: NotificationTypeEnum,
    inAppEnabled: z.boolean(),
    emailEnabled: z.boolean(),
  })).min(1),
});

// Create notification (admin only)
export const createNotificationSchema = z.object({
  userId: z.string().optional(), // If not provided, send to all or specific role
  userIds: z.array(z.string()).optional(),
  role: z.enum(['ADMIN', 'COLLABORATOR', 'STUDENT']).optional(), // Send to all users with this role
  type: NotificationTypeEnum.default('GENERAL'),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  channel: NotificationChannelEnum.default('IN_APP'),
  linkUrl: z.string().url().optional(),
  isUrgent: z.boolean().default(false),
  expiresAt: z.string().datetime().optional(),
});

// Types
export type GetNotificationsInput = z.infer<typeof getNotificationsSchema>;
export type MarkNotificationsReadInput = z.infer<typeof markNotificationsReadSchema>;
export type ArchiveNotificationsInput = z.infer<typeof archiveNotificationsSchema>;
export type UpdatePreferenceInput = z.infer<typeof updatePreferenceSchema>;
export type BulkUpdatePreferencesInput = z.infer<typeof bulkUpdatePreferencesSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
