/**
 * Tests for lib/validations/notificationValidation.ts
 *
 * Tests for notification-related Zod schemas.
 */

import { describe, it, expect } from 'vitest';
import {
  NotificationTypeEnum,
  NotificationChannelEnum,
  getNotificationsSchema,
  markNotificationsReadSchema,
  markNotificationReadSchema,
  archiveNotificationsSchema,
  archiveAllReadSchema,
  deleteNotificationsSchema,
  updatePreferenceSchema,
} from '@/lib/validations/notificationValidation';

describe('notificationValidation.ts', () => {
  describe('NotificationTypeEnum', () => {
    it('should accept valid notification types', () => {
      const validTypes = [
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
      ];

      validTypes.forEach((type) => {
        expect(NotificationTypeEnum.safeParse(type).success).toBe(true);
      });
    });

    it('should reject invalid notification types', () => {
      expect(NotificationTypeEnum.safeParse('INVALID_TYPE').success).toBe(false);
      expect(NotificationTypeEnum.safeParse('').success).toBe(false);
      expect(NotificationTypeEnum.safeParse(123).success).toBe(false);
    });
  });

  describe('NotificationChannelEnum', () => {
    it('should accept valid channels', () => {
      expect(NotificationChannelEnum.safeParse('IN_APP').success).toBe(true);
      expect(NotificationChannelEnum.safeParse('EMAIL').success).toBe(true);
      expect(NotificationChannelEnum.safeParse('BOTH').success).toBe(true);
    });

    it('should reject invalid channels', () => {
      expect(NotificationChannelEnum.safeParse('SMS').success).toBe(false);
      expect(NotificationChannelEnum.safeParse('PUSH').success).toBe(false);
      expect(NotificationChannelEnum.safeParse('').success).toBe(false);
    });
  });

  describe('getNotificationsSchema', () => {
    it('should accept valid filter options', () => {
      const result = getNotificationsSchema.safeParse({
        page: 1,
        pageSize: 20,
        unreadOnly: false,
        archivedOnly: false,
      });
      expect(result.success).toBe(true);
    });

    it('should apply default values', () => {
      const result = getNotificationsSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.unreadOnly).toBe(false);
      expect(result.archivedOnly).toBe(false);
      expect(result.sortOrder).toBe('desc');
    });

    it('should accept custom pagination', () => {
      const result = getNotificationsSchema.safeParse({
        page: 5,
        pageSize: 50,
      });
      expect(result.success).toBe(true);
      expect(result.data?.page).toBe(5);
      expect(result.data?.pageSize).toBe(50);
    });

    it('should accept unreadOnly filter', () => {
      const result = getNotificationsSchema.safeParse({
        unreadOnly: true,
      });
      expect(result.success).toBe(true);
      expect(result.data?.unreadOnly).toBe(true);
    });

    it('should accept archivedOnly filter', () => {
      const result = getNotificationsSchema.safeParse({
        archivedOnly: true,
      });
      expect(result.success).toBe(true);
      expect(result.data?.archivedOnly).toBe(true);
    });

    it('should accept types filter', () => {
      const result = getNotificationsSchema.safeParse({
        types: ['MESSAGE_RECEIVED', 'EVENT_INVITATION'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept isUrgent filter', () => {
      const result = getNotificationsSchema.safeParse({
        isUrgent: true,
      });
      expect(result.success).toBe(true);
    });

    it('should accept search filter', () => {
      const result = getNotificationsSchema.safeParse({
        search: 'test query',
      });
      expect(result.success).toBe(true);
    });

    it('should accept sortOrder', () => {
      expect(getNotificationsSchema.safeParse({ sortOrder: 'asc' }).success).toBe(true);
      expect(getNotificationsSchema.safeParse({ sortOrder: 'desc' }).success).toBe(true);
    });

    it('should reject invalid page', () => {
      expect(getNotificationsSchema.safeParse({ page: 0 }).success).toBe(false);
      expect(getNotificationsSchema.safeParse({ page: -1 }).success).toBe(false);
    });

    it('should reject invalid pageSize', () => {
      expect(getNotificationsSchema.safeParse({ pageSize: 0 }).success).toBe(false);
      expect(getNotificationsSchema.safeParse({ pageSize: 101 }).success).toBe(false);
    });
  });

  describe('markNotificationsReadSchema', () => {
    it('should accept array of notification IDs', () => {
      const result = markNotificationsReadSchema.safeParse({
        notificationIds: ['id1', 'id2', 'id3'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept single notification ID', () => {
      const result = markNotificationsReadSchema.safeParse({
        notificationIds: ['id1'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty array', () => {
      const result = markNotificationsReadSchema.safeParse({
        notificationIds: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject more than 100 IDs', () => {
      const ids = Array.from({ length: 101 }, (_, i) => `id${i}`);
      const result = markNotificationsReadSchema.safeParse({
        notificationIds: ids,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing notificationIds', () => {
      const result = markNotificationsReadSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('markNotificationReadSchema', () => {
    it('should accept valid notification ID', () => {
      const result = markNotificationReadSchema.safeParse({
        notificationId: 'test-notification-id',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing notification ID', () => {
      const result = markNotificationReadSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject non-string ID', () => {
      const result = markNotificationReadSchema.safeParse({
        notificationId: 123,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('archiveNotificationsSchema', () => {
    it('should accept array of notification IDs', () => {
      const result = archiveNotificationsSchema.safeParse({
        notificationIds: ['id1', 'id2'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty array', () => {
      const result = archiveNotificationsSchema.safeParse({
        notificationIds: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject more than 100 IDs', () => {
      const ids = Array.from({ length: 101 }, (_, i) => `id${i}`);
      const result = archiveNotificationsSchema.safeParse({
        notificationIds: ids,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('archiveAllReadSchema', () => {
    it('should accept empty object', () => {
      const result = archiveAllReadSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept olderThanDays', () => {
      const result = archiveAllReadSchema.safeParse({
        olderThanDays: 30,
      });
      expect(result.success).toBe(true);
    });

    it('should accept 0 days', () => {
      const result = archiveAllReadSchema.safeParse({
        olderThanDays: 0,
      });
      expect(result.success).toBe(true);
    });

    it('should accept up to 365 days', () => {
      const result = archiveAllReadSchema.safeParse({
        olderThanDays: 365,
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative days', () => {
      const result = archiveAllReadSchema.safeParse({
        olderThanDays: -1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject more than 365 days', () => {
      const result = archiveAllReadSchema.safeParse({
        olderThanDays: 366,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('deleteNotificationsSchema', () => {
    it('should accept array of notification IDs', () => {
      const result = deleteNotificationsSchema.safeParse({
        notificationIds: ['id1', 'id2'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty array', () => {
      const result = deleteNotificationsSchema.safeParse({
        notificationIds: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updatePreferenceSchema', () => {
    it('should accept valid preference update', () => {
      const result = updatePreferenceSchema.safeParse({
        notificationType: 'MESSAGE_RECEIVED',
        inAppEnabled: true,
        emailEnabled: false,
      });
      expect(result.success).toBe(true);
    });

    it('should require notification type', () => {
      const result = updatePreferenceSchema.safeParse({
        inAppEnabled: true,
      });
      expect(result.success).toBe(false);
    });

    it('should accept only notification type', () => {
      const result = updatePreferenceSchema.safeParse({
        notificationType: 'EVENT_INVITATION',
      });
      expect(result.success).toBe(true);
    });

    it('should accept quiet hours', () => {
      const result = updatePreferenceSchema.safeParse({
        notificationType: 'GENERAL',
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      });
      expect(result.success).toBe(true);
    });

    it('should accept null quiet hours', () => {
      const result = updatePreferenceSchema.safeParse({
        notificationType: 'GENERAL',
        quietHoursStart: null,
        quietHoursEnd: null,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid quiet hours format', () => {
      const result = updatePreferenceSchema.safeParse({
        notificationType: 'GENERAL',
        quietHoursStart: '25:00',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid time format', () => {
      const result = updatePreferenceSchema.safeParse({
        notificationType: 'GENERAL',
        quietHoursStart: '10am',
      });
      expect(result.success).toBe(false);
    });
  });
});
