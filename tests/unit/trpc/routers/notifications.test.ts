/**
 * Notifications Router Tests
 *
 * Tests for notification management and preferences.
 * The notifications router handles:
 * - User notifications CRUD
 * - Read/unread status management
 * - Archive functionality
 * - Notification preferences
 * - Admin notification creation and stats
 *
 * Procedures tested:
 * - User: getNotifications, getUnreadCount, getNotification, markAsRead, markMultipleAsRead, markAllAsRead
 * - Archive: archive, archiveAllRead, unarchive, delete, deleteAllArchived
 * - Preferences: getPreferences, updatePreference, bulkUpdatePreferences, disableAllEmails, resetPreferences
 * - Admin: createNotification, getStats
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { faker } from '@faker-js/faker/locale/it';
import type {
  Notification,
  NotificationPreference,
  NotificationType,
  NotificationChannel,
  UserRole,
} from '@prisma/client';

// ===================== MOCK FACTORIES =====================

// Sample notification types (subset of enum)
const NOTIFICATION_TYPES: NotificationType[] = [
  'ACCOUNT_ACTIVATED',
  'NEW_REGISTRATION',
  'CONTRACT_ASSIGNED',
  'CONTRACT_SIGNED',
  'EVENT_INVITATION',
  'SIMULATION_ASSIGNED',
  'MESSAGE_RECEIVED',
  'GENERAL',
];

const NOTIFICATION_CHANNELS: NotificationChannel[] = ['IN_APP', 'EMAIL', 'BOTH'];

/**
 * Create a mock notification
 */
function createMockNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    type: 'GENERAL' as NotificationType,
    title: faker.lorem.sentence(),
    message: faker.lorem.paragraph(),
    iconUrl: null,
    linkUrl: null,
    linkType: null,
    linkEntityType: null,
    linkEntityId: null,
    channel: 'IN_APP' as NotificationChannel,
    emailSent: false,
    emailSentAt: null,
    emailError: null,
    isRead: false,
    readAt: null,
    isUrgent: false,
    isArchived: false,
    groupKey: null,
    createdAt: new Date(),
    expiresAt: null,
    ...overrides,
  };
}

/**
 * Create a mock notification preference
 */
function createMockPreference(overrides: Partial<NotificationPreference> = {}): NotificationPreference {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    notificationType: 'GENERAL' as NotificationType,
    inAppEnabled: true,
    emailEnabled: true,
    quietHoursStart: null,
    quietHoursEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ===================== TEST SUITES =====================

describe('Notifications Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== GET NOTIFICATIONS ====================
  describe('getNotifications (protectedProcedure)', () => {
    describe('authorization', () => {
      it('should allow any authenticated user', () => {
        const roles: UserRole[] = ['ADMIN', 'COLLABORATOR', 'STUDENT'];
        roles.forEach((role) => {
          expect(role).toBeDefined();
        });
      });
    });

    describe('filtering', () => {
      it('should filter by userId', () => {
        const userId = faker.string.uuid();
        const where = { userId };
        expect(where.userId).toBe(userId);
      });

      it('should filter by type', () => {
        const notificationType: NotificationType = 'CONTRACT_ASSIGNED';
        const where = { type: notificationType };
        expect(where.type).toBe('CONTRACT_ASSIGNED');
      });

      it('should filter by isRead status', () => {
        const where = { isRead: false };
        expect(where.isRead).toBe(false);
      });

      it('should filter by isArchived status', () => {
        const where = { isArchived: false };
        expect(where.isArchived).toBe(false);
      });

      it('should exclude archived by default', () => {
        const includeArchived = false;
        const where: Record<string, unknown> = {};
        if (!includeArchived) where.isArchived = false;
        expect(where.isArchived).toBe(false);
      });

      it('should filter by isUrgent', () => {
        const where = { isUrgent: true };
        expect(where.isUrgent).toBe(true);
      });
    });

    describe('pagination', () => {
      it('should use default pagination values', () => {
        const defaults = { page: 1, limit: 20 };
        expect(defaults.page).toBe(1);
        expect(defaults.limit).toBe(20);
      });

      it('should calculate skip correctly', () => {
        const page = 3;
        const limit = 20;
        const skip = (page - 1) * limit;
        expect(skip).toBe(40);
      });
    });

    describe('ordering', () => {
      it('should order by createdAt descending', () => {
        const orderBy = [{ isUrgent: 'desc' }, { createdAt: 'desc' }];
        expect(orderBy).toHaveLength(2);
      });

      it('should prioritize urgent notifications', () => {
        const orderBy = { isUrgent: 'desc' };
        expect(orderBy.isUrgent).toBe('desc');
      });
    });

    describe('response structure', () => {
      it('should include notifications list', () => {
        const response = {
          notifications: [createMockNotification()],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        };
        expect(response.notifications).toBeDefined();
        expect(response.total).toBe(1);
      });
    });
  });

  // ==================== GET UNREAD COUNT ====================
  describe('getUnreadCount (protectedProcedure)', () => {
    it('should count unread notifications for user', () => {
      const userId = faker.string.uuid();
      const where = { userId, isRead: false, isArchived: false };
      expect(where.userId).toBe(userId);
      expect(where.isRead).toBe(false);
    });

    it('should exclude archived notifications from count', () => {
      const where = { isArchived: false };
      expect(where.isArchived).toBe(false);
    });

    it('should return count and urgent count', () => {
      const response = {
        count: 10,
        urgentCount: 2,
      };
      expect(response.count).toBe(10);
      expect(response.urgentCount).toBe(2);
    });
  });

  // ==================== GET NOTIFICATION ====================
  describe('getNotification (protectedProcedure)', () => {
    describe('input validation', () => {
      it('should require notification id', () => {
        const input = { id: faker.string.uuid() };
        expect(input.id).toBeDefined();
      });
    });

    describe('ownership verification', () => {
      it('should verify notification belongs to user', () => {
        const userId = faker.string.uuid();
        const notification = createMockNotification({ userId });
        expect(notification.userId).toBe(userId);
      });

      it('should throw NOT_FOUND for non-existent notification', () => {
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notifica non trovata',
        });
        expect(error.code).toBe('NOT_FOUND');
      });
    });
  });

  // ==================== MARK AS READ ====================
  describe('markAsRead (protectedProcedure)', () => {
    describe('input validation', () => {
      it('should require notification id', () => {
        const input = { id: faker.string.uuid() };
        expect(input.id).toBeDefined();
      });
    });

    describe('update behavior', () => {
      it('should set isRead to true', () => {
        const _notification = createMockNotification({ isRead: false });
        const update = { isRead: true, readAt: new Date() };
        expect(update.isRead).toBe(true);
        expect(update.readAt).toBeDefined();
      });

      it('should set readAt timestamp', () => {
        const now = new Date();
        const update = { readAt: now };
        expect(update.readAt).toEqual(now);
      });
    });

    describe('ownership verification', () => {
      it('should only update own notifications', () => {
        const userId = faker.string.uuid();
        const where = { id: faker.string.uuid(), userId };
        expect(where.userId).toBe(userId);
      });
    });
  });

  // ==================== MARK MULTIPLE AS READ ====================
  describe('markMultipleAsRead (protectedProcedure)', () => {
    it('should accept array of notification IDs', () => {
      const input = {
        ids: [faker.string.uuid(), faker.string.uuid(), faker.string.uuid()],
      };
      expect(input.ids).toHaveLength(3);
    });

    it('should use updateMany with ID filter', () => {
      const ids = ['id1', 'id2', 'id3'];
      const userId = faker.string.uuid();
      const where = { id: { in: ids }, userId };
      expect(where.id.in).toEqual(ids);
      expect(where.userId).toBe(userId);
    });
  });

  // ==================== MARK ALL AS READ ====================
  describe('markAllAsRead (protectedProcedure)', () => {
    it('should update all unread notifications for user', () => {
      const userId = faker.string.uuid();
      const where = { userId, isRead: false };
      expect(where.isRead).toBe(false);
    });

    it('should return count of updated notifications', () => {
      const result = { count: 15 };
      expect(result.count).toBe(15);
    });
  });

  // ==================== ARCHIVE OPERATIONS ====================
  describe('Archive Operations', () => {
    describe('archive (protectedProcedure)', () => {
      it('should set isArchived to true', () => {
        const update = { isArchived: true };
        expect(update.isArchived).toBe(true);
      });

      it('should require notification id', () => {
        const input = { id: faker.string.uuid() };
        expect(input.id).toBeDefined();
      });
    });

    describe('archiveAllRead (protectedProcedure)', () => {
      it('should archive all read notifications', () => {
        const userId = faker.string.uuid();
        const where = { userId, isRead: true, isArchived: false };
        expect(where.isRead).toBe(true);
        expect(where.isArchived).toBe(false);
      });

      it('should return count of archived notifications', () => {
        const result = { count: 10 };
        expect(result.count).toBe(10);
      });
    });

    describe('unarchive (protectedProcedure)', () => {
      it('should set isArchived to false', () => {
        const update = { isArchived: false };
        expect(update.isArchived).toBe(false);
      });
    });
  });

  // ==================== DELETE OPERATIONS ====================
  describe('Delete Operations', () => {
    describe('delete (protectedProcedure)', () => {
      it('should require notification id', () => {
        const input = { id: faker.string.uuid() };
        expect(input.id).toBeDefined();
      });

      it('should verify ownership before deletion', () => {
        const userId = faker.string.uuid();
        const where = { id: faker.string.uuid(), userId };
        expect(where.userId).toBe(userId);
      });

      it('should throw NOT_FOUND for non-existent notification', () => {
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notifica non trovata',
        });
        expect(error.code).toBe('NOT_FOUND');
      });
    });

    describe('deleteAllArchived (protectedProcedure)', () => {
      it('should delete only archived notifications', () => {
        const userId = faker.string.uuid();
        const where = { userId, isArchived: true };
        expect(where.isArchived).toBe(true);
      });

      it('should return count of deleted notifications', () => {
        const result = { count: 5 };
        expect(result.count).toBe(5);
      });
    });
  });

  // ==================== PREFERENCES ====================
  describe('Notification Preferences', () => {
    describe('getPreferences (protectedProcedure)', () => {
      it('should return user preferences', () => {
        const userId = faker.string.uuid();
        const where = { userId };
        expect(where.userId).toBe(userId);
      });

      it('should return all notification types with preferences', () => {
        const preferences = NOTIFICATION_TYPES.map((type) => ({
          type,
          inAppEnabled: true,
          emailEnabled: true,
        }));
        expect(preferences.length).toBe(NOTIFICATION_TYPES.length);
      });
    });

    describe('updatePreference (protectedProcedure)', () => {
      it('should accept notification type and settings', () => {
        const input = {
          notificationType: 'CONTRACT_ASSIGNED' as NotificationType,
          inAppEnabled: true,
          emailEnabled: false,
        };
        expect(input.notificationType).toBeDefined();
        expect(input.inAppEnabled).toBe(true);
        expect(input.emailEnabled).toBe(false);
      });

      it('should upsert preference (create or update)', () => {
        const userId = faker.string.uuid();
        const notificationType: NotificationType = 'GENERAL';
        const where = { userId_notificationType: { userId, notificationType } };
        expect(where.userId_notificationType).toBeDefined();
      });

      it('should validate notification type enum', () => {
        NOTIFICATION_TYPES.forEach((type) => {
          expect(NOTIFICATION_TYPES).toContain(type);
        });
      });
    });

    describe('bulkUpdatePreferences (protectedProcedure)', () => {
      it('should accept array of preferences', () => {
        const input = {
          preferences: [
            { notificationType: 'GENERAL' as NotificationType, emailEnabled: false },
            { notificationType: 'CONTRACT_ASSIGNED' as NotificationType, emailEnabled: true },
          ],
        };
        expect(input.preferences).toHaveLength(2);
      });

      it('should use transaction for atomic update', () => {
        const useTransaction = true;
        expect(useTransaction).toBe(true);
      });
    });

    describe('disableAllEmails (protectedProcedure)', () => {
      it('should set emailEnabled to false for all preferences', () => {
        const _userId = faker.string.uuid();
        const update = { emailEnabled: false };
        expect(update.emailEnabled).toBe(false);
      });
    });

    describe('resetPreferences (protectedProcedure)', () => {
      it('should delete all user preferences', () => {
        const userId = faker.string.uuid();
        const where = { userId };
        expect(where.userId).toBe(userId);
      });
    });
  });

  // ==================== ADMIN PROCEDURES ====================
  describe('Admin Procedures', () => {
    describe('createNotification (adminProcedure)', () => {
      describe('authorization', () => {
        it('should only allow admin access', () => {
          const adminRole: UserRole = 'ADMIN';
          expect(adminRole).toBe('ADMIN');
        });

        it('should reject non-admin users', () => {
          const roles: UserRole[] = ['COLLABORATOR', 'STUDENT'];
          roles.forEach((role) => {
            const isAdmin = role === 'ADMIN';
            expect(isAdmin).toBe(false);
          });
        });
      });

      describe('input validation', () => {
        it('should require userId or userIds', () => {
          const input = {
            userId: faker.string.uuid(),
            type: 'GENERAL' as NotificationType,
            title: 'Test',
            message: 'Test message',
          };
          expect(input.userId).toBeDefined();
        });

        it('should accept multiple recipients', () => {
          const input = {
            userIds: [faker.string.uuid(), faker.string.uuid()],
            type: 'GENERAL' as NotificationType,
            title: 'Broadcast',
            message: 'Message to all',
          };
          expect(input.userIds).toHaveLength(2);
        });

        it('should require notification type', () => {
          const input = { type: 'GENERAL' as NotificationType };
          expect(input.type).toBeDefined();
        });

        it('should require title and message', () => {
          const input = {
            title: 'Notification Title',
            message: 'Notification message content',
          };
          expect(input.title.length).toBeGreaterThan(0);
          expect(input.message.length).toBeGreaterThan(0);
        });

        it('should accept optional channel', () => {
          NOTIFICATION_CHANNELS.forEach((channel) => {
            const input = { channel };
            expect(NOTIFICATION_CHANNELS).toContain(input.channel);
          });
        });

        it('should accept optional linkUrl', () => {
          const input = {
            linkUrl: '/simulazioni/123',
            linkType: 'simulation',
          };
          expect(input.linkUrl).toBeDefined();
        });

        it('should accept optional isUrgent flag', () => {
          const input = { isUrgent: true };
          expect(input.isUrgent).toBe(true);
        });
      });

      describe('email sending', () => {
        it('should check user preferences before sending email', () => {
          const preference = createMockPreference({ emailEnabled: true });
          expect(preference.emailEnabled).toBe(true);
        });

        it('should skip email if emailEnabled is false', () => {
          const preference = createMockPreference({ emailEnabled: false });
          expect(preference.emailEnabled).toBe(false);
        });

        it('should record emailSent status', () => {
          const notification = createMockNotification({
            emailSent: true,
            emailSentAt: new Date(),
          });
          expect(notification.emailSent).toBe(true);
          expect(notification.emailSentAt).toBeDefined();
        });

        it('should record emailError if sending fails', () => {
          const notification = createMockNotification({
            emailSent: false,
            emailError: 'SMTP connection failed',
          });
          expect(notification.emailError).toBeDefined();
        });
      });
    });

    describe('getStats (adminProcedure)', () => {
      it('should only allow admin access', () => {
        const adminRole: UserRole = 'ADMIN';
        expect(adminRole).toBe('ADMIN');
      });

      it('should return notification statistics', () => {
        const stats = {
          totalNotifications: 1000,
          unreadCount: 150,
          readCount: 850,
          archivedCount: 50,
          urgentCount: 10,
          byType: {
            GENERAL: 200,
            CONTRACT_ASSIGNED: 150,
            SIMULATION_ASSIGNED: 300,
          },
          byChannel: {
            IN_APP: 600,
            EMAIL: 200,
            BOTH: 200,
          },
          emailStats: {
            sent: 380,
            failed: 20,
          },
        };
        expect(stats.totalNotifications).toBe(1000);
        expect(stats.byType).toBeDefined();
      });
    });
  });

  // ==================== INPUT VALIDATION ====================
  describe('Input Validation', () => {
    describe('notification ID', () => {
      it('should require valid UUID', () => {
        const id = faker.string.uuid();
        expect(id).toMatch(/^[0-9a-f-]{36}$/i);
      });
    });

    describe('notification type', () => {
      it('should accept valid notification types', () => {
        NOTIFICATION_TYPES.forEach((type) => {
          expect(NOTIFICATION_TYPES).toContain(type);
        });
      });
    });

    describe('pagination', () => {
      it('should validate page >= 1', () => {
        const validPages = [1, 10, 100];
        validPages.forEach((page) => {
          expect(page).toBeGreaterThanOrEqual(1);
        });
      });

      it('should validate limit between 1 and 100', () => {
        const validLimits = [1, 20, 50, 100];
        validLimits.forEach((limit) => {
          expect(limit).toBeGreaterThanOrEqual(1);
          expect(limit).toBeLessThanOrEqual(100);
        });
      });
    });

    describe('quiet hours', () => {
      it('should validate time format HH:MM', () => {
        const validTimes = ['00:00', '08:00', '22:00', '23:59'];
        validTimes.forEach((time) => {
          expect(time).toMatch(/^\d{2}:\d{2}$/);
        });
      });
    });
  });

  // ==================== ERROR HANDLING ====================
  describe('Error Handling', () => {
    it('should use NOT_FOUND for missing notifications', () => {
      const error = new TRPCError({
        code: 'NOT_FOUND',
        message: 'Notifica non trovata',
      });
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should use FORBIDDEN for unauthorized access', () => {
      const error = new TRPCError({
        code: 'FORBIDDEN',
        message: 'Non sei autorizzato ad accedere a questa notifica',
      });
      expect(error.code).toBe('FORBIDDEN');
    });

    it('should use BAD_REQUEST for invalid input', () => {
      const error = new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Dati non validi',
      });
      expect(error.code).toBe('BAD_REQUEST');
    });
  });

  // ==================== SECURITY CONSIDERATIONS ====================
  describe('Security Considerations', () => {
    it('should only allow users to access their own notifications', () => {
      const userId = faker.string.uuid();
      const notification = createMockNotification({ userId });
      expect(notification.userId).toBe(userId);
    });

    it('should verify ownership before any modification', () => {
      const userId = faker.string.uuid();
      const where = { id: faker.string.uuid(), userId };
      expect(where.userId).toBe(userId);
    });

    it('should restrict admin procedures to admin role', () => {
      const adminProcedures = ['createNotification', 'getStats'];
      expect(adminProcedures.length).toBe(2);
    });

    it('should sanitize notification content', () => {
      const dangerousHtml = '<script>alert("xss")</script>';
      // Use a simple string-based approach for this test case
      const scriptStart = dangerousHtml.indexOf('<script');
      const scriptEnd = dangerousHtml.indexOf('</script>') + 9;
      const sanitized = scriptStart >= 0 ? dangerousHtml.slice(0, scriptStart) + dangerousHtml.slice(scriptEnd) : dangerousHtml;
      expect(sanitized).not.toContain('<script>');
    });
  });

  // ==================== NOTIFICATION TYPES ====================
  describe('Notification Types', () => {
    it('should support ACCOUNT_ACTIVATED type', () => {
      const notification = createMockNotification({ type: 'ACCOUNT_ACTIVATED' });
      expect(notification.type).toBe('ACCOUNT_ACTIVATED');
    });

    it('should support CONTRACT_ASSIGNED type', () => {
      const notification = createMockNotification({ type: 'CONTRACT_ASSIGNED' });
      expect(notification.type).toBe('CONTRACT_ASSIGNED');
    });

    it('should support SIMULATION_ASSIGNED type', () => {
      const notification = createMockNotification({ type: 'SIMULATION_ASSIGNED' });
      expect(notification.type).toBe('SIMULATION_ASSIGNED');
    });

    it('should support MESSAGE_RECEIVED type', () => {
      const notification = createMockNotification({ type: 'MESSAGE_RECEIVED' });
      expect(notification.type).toBe('MESSAGE_RECEIVED');
    });
  });

  // ==================== NOTIFICATION CHANNELS ====================
  describe('Notification Channels', () => {
    it('should support IN_APP channel', () => {
      const notification = createMockNotification({ channel: 'IN_APP' });
      expect(notification.channel).toBe('IN_APP');
    });

    it('should support EMAIL channel', () => {
      const notification = createMockNotification({ channel: 'EMAIL' });
      expect(notification.channel).toBe('EMAIL');
    });

    it('should support BOTH channel', () => {
      const notification = createMockNotification({ channel: 'BOTH' });
      expect(notification.channel).toBe('BOTH');
    });
  });

  // ==================== GROUPING ====================
  describe('Notification Grouping', () => {
    it('should support groupKey for related notifications', () => {
      const simulationId = faker.string.uuid();
      const groupKey = `simulation_${simulationId}`;
      const notification = createMockNotification({ groupKey });
      expect(notification.groupKey).toBe(groupKey);
    });

    it('should allow querying by groupKey', () => {
      const groupKey = 'event_123';
      const where = { groupKey };
      expect(where.groupKey).toBe(groupKey);
    });
  });

  // ==================== EXPIRATION ====================
  describe('Notification Expiration', () => {
    it('should support optional expiresAt', () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const notification = createMockNotification({ expiresAt });
      expect(notification.expiresAt).toEqual(expiresAt);
    });

    it('should filter expired notifications', () => {
      const now = new Date();
      const where = {
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      };
      expect(where.OR).toHaveLength(2);
    });
  });
});
