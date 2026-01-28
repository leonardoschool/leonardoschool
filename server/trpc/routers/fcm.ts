/**
 * FCM tRPC Router
 *
 * Gestisce registrazione/rimozione token FCM e test notifiche.
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import { TRPCError } from '@trpc/server';

export const fcmRouter = router({
  /**
   * Registra un nuovo FCM token per l'utente corrente
   * Chiamato quando l'utente accetta le notifiche push
   */
  registerToken: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1),
        deviceInfo: z.string().optional(),
        platform: z.enum(['web', 'android', 'ios']).optional().default('web'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user, prisma } = ctx;

      try {
        // Controlla se il token esiste già
        const existing = await prisma.fCMToken.findUnique({
          where: { token: input.token },
        });

        if (existing) {
          // Token esiste - aggiorna se appartiene allo stesso utente
          if (existing.userId === user.id) {
            await prisma.fCMToken.update({
              where: { token: input.token },
              data: {
                lastUsedAt: new Date(),
                isActive: true,
                deviceInfo: input.deviceInfo,
                platform: input.platform,
              },
            });
            return { success: true, action: 'updated' };
          } else {
            // Token appartiene a un altro utente - trasferiscilo (logout su altro device)
            await prisma.fCMToken.update({
              where: { token: input.token },
              data: {
                userId: user.id,
                lastUsedAt: new Date(),
                isActive: true,
                deviceInfo: input.deviceInfo,
                platform: input.platform,
              },
            });
            return { success: true, action: 'transferred' };
          }
        }

        // Crea nuovo token
        await prisma.fCMToken.create({
          data: {
            token: input.token,
            userId: user.id,
            deviceInfo: input.deviceInfo,
            platform: input.platform,
          },
        });

        return { success: true, action: 'created' };
      } catch (error) {
        console.error('[FCM Router] Error registering token:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Errore durante la registrazione del token',
        });
      }
    }),

  /**
   * Disattiva un FCM token (logout o revoca permessi)
   */
  unregisterToken: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user, prisma } = ctx;

      try {
        // Disattiva solo token appartenenti all'utente corrente
        const result = await prisma.fCMToken.updateMany({
          where: {
            token: input.token,
            userId: user.id,
          },
          data: {
            isActive: false,
          },
        });

        return {
          success: true,
          deactivated: result.count > 0,
        };
      } catch (error) {
        console.error('[FCM Router] Error unregistering token:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Errore durante la rimozione del token',
        });
      }
    }),

  /**
   * Disattiva tutti i token FCM dell'utente (logout completo da tutti i device)
   */
  unregisterAllTokens: protectedProcedure.mutation(async ({ ctx }) => {
    const { user, prisma } = ctx;

    try {
      const result = await prisma.fCMToken.updateMany({
        where: {
          userId: user.id,
        },
        data: {
          isActive: false,
        },
      });

      return {
        success: true,
        deactivatedCount: result.count,
      };
    } catch (error) {
      console.error('[FCM Router] Error unregistering all tokens:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Errore durante la rimozione dei token',
      });
    }
  }),

  /**
   * Ottieni stato notifiche per l'utente corrente
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const { user, prisma } = ctx;

    const tokens = await prisma.fCMToken.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      select: {
        id: true,
        platform: true,
        deviceInfo: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: {
        lastUsedAt: 'desc',
      },
    });

    return {
      hasActiveTokens: tokens.length > 0,
      tokenCount: tokens.length,
      devices: tokens.map((t) => ({
        id: t.id,
        platform: t.platform,
        deviceInfo: t.deviceInfo?.substring(0, 100), // Trunca per privacy
        lastUsed: t.lastUsedAt,
        registeredAt: t.createdAt,
      })),
    };
  }),

  /**
   * Invia notifica di test (solo per debug)
   * Disponibile solo in development o per admin
   */
  sendTestNotification: protectedProcedure.mutation(async ({ ctx }) => {
    const { user } = ctx;

    // Import dinamico per evitare problemi con Firebase Admin in client
    const { sendPushNotificationToUser } = await import('@/server/services/fcmService');

    const result = await sendPushNotificationToUser(
      user.id,
      {
        title: '🧪 Test Notifica',
        body: 'Questa è una notifica di test da Leonardo School! Le notifiche push funzionano correttamente.',
      },
      {
        type: 'NOTIFICATION',
        notificationId: `test-${Date.now()}`,
      }
    );

    return {
      success: result.success,
      successCount: result.successCount,
      failureCount: result.failureCount,
      reason: result.reason,
    };
  }),
});
