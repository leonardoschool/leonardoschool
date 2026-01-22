/**
 * Notifications Router - Unified notification system for all user roles
 */
import { router, protectedProcedure, adminProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  getNotificationsSchema,
  markNotificationsReadSchema,
  markNotificationReadSchema,
  archiveNotificationsSchema,
  archiveAllReadSchema,
  deleteNotificationsSchema,
  updatePreferenceSchema,
  bulkUpdatePreferencesSchema,
  createNotificationSchema,
  NotificationTypeEnum,
} from '@/lib/validations/notificationValidation';
import type { Prisma } from '@prisma/client';

export const notificationsRouter = router({
  // ==================== GET NOTIFICATIONS ====================

  /**
   * Get paginated notifications for current user
   */
  getNotifications: protectedProcedure
    .input(getNotificationsSchema)
    .query(async ({ ctx, input }) => {
      const { page, pageSize, unreadOnly, archivedOnly, types, isUrgent, search, sortOrder } = input;

      // Build where clause
      const where: Prisma.NotificationWhereInput = {
        userId: ctx.user.id,
      };

      // Filter by read status
      if (unreadOnly) {
        where.isRead = false;
      }

      // Filter by archived status
      if (archivedOnly) {
        where.isArchived = true;
      } else {
        // By default, don't show archived
        where.isArchived = false;
      }

      // Filter by types
      if (types && types.length > 0) {
        where.type = { in: types };
      }

      // Filter by urgency
      if (typeof isUrgent === 'boolean') {
        where.isUrgent = isUrgent;
      }

      // Search in title and message
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { message: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Exclude expired notifications
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ];

      // Count total and unread
      const [total, unreadCount] = await Promise.all([
        ctx.prisma.notification.count({ where }),
        ctx.prisma.notification.count({
          where: { userId: ctx.user.id, isRead: false, isArchived: false },
        }),
      ]);

      // Get notifications
      const notifications = await ctx.prisma.notification.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [
          { isUrgent: 'desc' }, // Urgent first
          { createdAt: sortOrder },
        ],
      });

      return {
        notifications,
        unreadCount,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  /**
   * Get unread count for notification badge
   */
  getUnreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      const count = await ctx.prisma.notification.count({
        where: {
          userId: ctx.user.id,
          isRead: false,
          isArchived: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      });

      // Also get urgent unread count
      const urgentCount = await ctx.prisma.notification.count({
        where: {
          userId: ctx.user.id,
          isRead: false,
          isArchived: false,
          isUrgent: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      });

      return { count, urgentCount };
    }),

  /**
   * Get a single notification by ID
   */
  getNotification: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const notification = await ctx.prisma.notification.findUnique({
        where: { id: input.id },
      });

      if (!notification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notifica non trovata',
        });
      }

      // Verify ownership
      if (notification.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non autorizzato',
        });
      }

      return notification;
    }),

  // ==================== MARK AS READ ====================

  /**
   * Mark a single notification as read
   */
  markAsRead: protectedProcedure
    .input(markNotificationReadSchema)
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.prisma.notification.findUnique({
        where: { id: input.notificationId },
      });

      if (!notification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notifica non trovata',
        });
      }

      if (notification.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non autorizzato',
        });
      }

      if (notification.isRead) {
        return { success: true, alreadyRead: true };
      }

      await ctx.prisma.notification.update({
        where: { id: input.notificationId },
        data: { isRead: true, readAt: new Date() },
      });

      return { success: true, alreadyRead: false };
    }),

  /**
   * Mark multiple notifications as read
   */
  markMultipleAsRead: protectedProcedure
    .input(markNotificationsReadSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.notification.updateMany({
        where: {
          id: { in: input.notificationIds },
          userId: ctx.user.id,
          isRead: false,
        },
        data: { isRead: true, readAt: new Date() },
      });

      return { success: true, updatedCount: result.count };
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const result = await ctx.prisma.notification.updateMany({
        where: {
          userId: ctx.user.id,
          isRead: false,
          isArchived: false,
        },
        data: { isRead: true, readAt: new Date() },
      });

      return { success: true, updatedCount: result.count };
    }),

  // ==================== ARCHIVE ====================

  /**
   * Archive notifications
   */
  archive: protectedProcedure
    .input(archiveNotificationsSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.notification.updateMany({
        where: {
          id: { in: input.notificationIds },
          userId: ctx.user.id,
        },
        data: { isArchived: true },
      });

      return { success: true, archivedCount: result.count };
    }),

  /**
   * Archive all read notifications
   */
  archiveAllRead: protectedProcedure
    .input(archiveAllReadSchema.optional())
    .mutation(async ({ ctx, input }) => {
      const where: Prisma.NotificationWhereInput = {
        userId: ctx.user.id,
        isRead: true,
        isArchived: false,
      };

      // Optionally filter by age
      if (input?.olderThanDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - input.olderThanDays);
        where.createdAt = { lt: cutoffDate };
      }

      const result = await ctx.prisma.notification.updateMany({
        where,
        data: { isArchived: true },
      });

      return { success: true, archivedCount: result.count };
    }),

  /**
   * Unarchive notifications
   */
  unarchive: protectedProcedure
    .input(archiveNotificationsSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.notification.updateMany({
        where: {
          id: { in: input.notificationIds },
          userId: ctx.user.id,
        },
        data: { isArchived: false },
      });

      return { success: true, unarchivedCount: result.count };
    }),

  // ==================== DELETE ====================

  /**
   * Delete notifications permanently
   */
  delete: protectedProcedure
    .input(deleteNotificationsSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.notification.deleteMany({
        where: {
          id: { in: input.notificationIds },
          userId: ctx.user.id,
        },
      });

      return { success: true, deletedCount: result.count };
    }),

  /**
   * Delete all archived notifications
   */
  deleteAllArchived: protectedProcedure
    .mutation(async ({ ctx }) => {
      const result = await ctx.prisma.notification.deleteMany({
        where: {
          userId: ctx.user.id,
          isArchived: true,
        },
      });

      return { success: true, deletedCount: result.count };
    }),

  // ==================== PREFERENCES ====================

  /**
   * Get all notification preferences for current user
   */
  getPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      const preferences = await ctx.prisma.notificationPreference.findMany({
        where: { userId: ctx.user.id },
        orderBy: { notificationType: 'asc' },
      });

      // Get all notification types and merge with existing preferences
      const allTypes = NotificationTypeEnum.options;
      type PreferenceType = typeof preferences[number];
      const preferencesMap = new Map<string, PreferenceType>(
        preferences.map(p => [p.notificationType, p])
      );

      return allTypes.map(type => ({
        notificationType: type,
        inAppEnabled: preferencesMap.get(type)?.inAppEnabled ?? true,
        emailEnabled: preferencesMap.get(type)?.emailEnabled ?? true,
        quietHoursStart: preferencesMap.get(type)?.quietHoursStart ?? null,
        quietHoursEnd: preferencesMap.get(type)?.quietHoursEnd ?? null,
      }));
    }),

  /**
   * Update a single notification preference
   */
  updatePreference: protectedProcedure
    .input(updatePreferenceSchema)
    .mutation(async ({ ctx, input }) => {
      const { notificationType, ...data } = input;

      const preference = await ctx.prisma.notificationPreference.upsert({
        where: {
          userId_notificationType: {
            userId: ctx.user.id,
            notificationType,
          },
        },
        update: data,
        create: {
          userId: ctx.user.id,
          notificationType,
          inAppEnabled: data.inAppEnabled ?? true,
          emailEnabled: data.emailEnabled ?? true,
          quietHoursStart: data.quietHoursStart,
          quietHoursEnd: data.quietHoursEnd,
        },
      });

      return { success: true, preference };
    }),

  /**
   * Bulk update preferences
   */
  bulkUpdatePreferences: protectedProcedure
    .input(bulkUpdatePreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      const results = await ctx.prisma.$transaction(
        input.preferences.map(pref =>
          ctx.prisma.notificationPreference.upsert({
            where: {
              userId_notificationType: {
                userId: ctx.user.id,
                notificationType: pref.notificationType,
              },
            },
            update: {
              inAppEnabled: pref.inAppEnabled,
              emailEnabled: pref.emailEnabled,
            },
            create: {
              userId: ctx.user.id,
              notificationType: pref.notificationType,
              inAppEnabled: pref.inAppEnabled,
              emailEnabled: pref.emailEnabled,
            },
          })
        )
      );

      return { success: true, updatedCount: results.length };
    }),

  /**
   * Disable all email notifications
   */
  disableAllEmails: protectedProcedure
    .mutation(async ({ ctx }) => {
      const allTypes = NotificationTypeEnum.options;

      await ctx.prisma.$transaction(
        allTypes.map(type =>
          ctx.prisma.notificationPreference.upsert({
            where: {
              userId_notificationType: {
                userId: ctx.user.id,
                notificationType: type,
              },
            },
            update: { emailEnabled: false },
            create: {
              userId: ctx.user.id,
              notificationType: type,
              inAppEnabled: true,
              emailEnabled: false,
            },
          })
        )
      );

      return { success: true };
    }),

  /**
   * Enable all notifications (reset to defaults)
   */
  resetPreferences: protectedProcedure
    .mutation(async ({ ctx }) => {
      await ctx.prisma.notificationPreference.deleteMany({
        where: { userId: ctx.user.id },
      });

      return { success: true };
    }),

  // ==================== ADMIN PROCEDURES ====================

  /**
   * Create and send a notification (admin only)
   */
  createNotification: adminProcedure
    .input(createNotificationSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId, userIds, role, type, title, message, channel, linkUrl, isUrgent, expiresAt } = input;

      // Determine recipients
      let recipientIds: string[] = [];

      if (userId) {
        // Single user
        recipientIds = [userId];
      } else if (userIds && userIds.length > 0) {
        // Multiple specific users
        recipientIds = userIds;
      } else if (role) {
        // All users with specific role
        const users = await ctx.prisma.user.findMany({
          where: { role, isActive: true },
          select: { id: true },
        });
        recipientIds = users.map(u => u.id);
      } else {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Specifica almeno un destinatario (userId, userIds, o role)',
        });
      }

      if (recipientIds.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Nessun destinatario trovato',
        });
      }

      // Create notifications in bulk
      const notifications = await ctx.prisma.notification.createMany({
        data: recipientIds.map(id => ({
          userId: id,
          type,
          title,
          message,
          channel,
          linkUrl,
          isUrgent,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        })),
      });

      return {
        success: true,
        createdCount: notifications.count,
        recipientCount: recipientIds.length,
      };
    }),

  /**
   * Get notification statistics (admin only)
   */
  getStats: adminProcedure
    .query(async ({ ctx }) => {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalNotifications,
        unreadNotifications,
        last24hCount,
        last7dCount,
        byType,
        byChannel,
      ] = await Promise.all([
        ctx.prisma.notification.count(),
        ctx.prisma.notification.count({ where: { isRead: false } }),
        ctx.prisma.notification.count({ where: { createdAt: { gte: last24h } } }),
        ctx.prisma.notification.count({ where: { createdAt: { gte: last7d } } }),
        ctx.prisma.notification.groupBy({
          by: ['type'],
          _count: true,
          orderBy: { _count: { type: 'desc' } },
          take: 10,
        }),
        ctx.prisma.notification.groupBy({
          by: ['channel'],
          _count: true,
        }),
      ]);

      return {
        totalNotifications,
        unreadNotifications,
        readRate: totalNotifications > 0 
          ? Math.round(((totalNotifications - unreadNotifications) / totalNotifications) * 100) 
          : 0,
        last24hCount,
        last7dCount,
        byType: byType.map(t => ({ type: t.type, count: t._count })),
        byChannel: byChannel.map(c => ({ channel: c.channel, count: c._count })),
      };
    }),

  /**
   * Delete old notifications (admin cleanup)
   */
  cleanupOldNotifications: adminProcedure
    .input(z.object({
      olderThanDays: z.number().int().min(7).max(365).default(90),
      onlyRead: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - input.olderThanDays);

      const where: Prisma.NotificationWhereInput = {
        createdAt: { lt: cutoffDate },
      };

      if (input.onlyRead) {
        where.isRead = true;
      }

      const result = await ctx.prisma.notification.deleteMany({ where });

      return { success: true, deletedCount: result.count };
    }),

  // ==================== PUSH NOTIFICATIONS ====================

  /**
   * Register or update Expo push token for the current user
   */
  registerPushToken: protectedProcedure
    .input(z.object({
      expoPushToken: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { expoPushToken: input.expoPushToken },
      });

      return { success: true };
    }),

  /**
   * Remove push token (e.g., on logout)
   */
  removePushToken: protectedProcedure
    .mutation(async ({ ctx }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { expoPushToken: null },
      });

      return { success: true };
    }),
});

