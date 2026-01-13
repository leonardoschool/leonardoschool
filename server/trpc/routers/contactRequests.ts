// Contact Requests Router - Handles contact/information requests management for admin
import { router, adminProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createCachedQuery, CACHE_TIMES } from '@/lib/cache/serverCache';

export const contactRequestsRouter = router({
  /**
   * Get all contact requests with optional filters
   */
  getAll: adminProcedure
    .input(
      z.object({
        status: z.enum(['PENDING', 'READ', 'REPLIED', 'ARCHIVED']).optional(),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { status, search, page = 1, limit = 20 } = input || {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
          { message: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [requests, total] = await Promise.all([
        ctx.prisma.contactRequest.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.contactRequest.count({ where }),
      ]);

      return {
        requests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get a single contact request by ID
   */
  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const request = await ctx.prisma.contactRequest.findUnique({
        where: { id: input.id },
      });

      if (!request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Richiesta non trovata',
        });
      }

      return request;
    }),

  /**
   * Update contact request status
   */
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['PENDING', 'READ', 'REPLIED', 'ARCHIVED']),
        adminNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.prisma.contactRequest.findUnique({
        where: { id: input.id },
      });

      if (!request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Richiesta non trovata',
        });
      }

      // Prepare update data
      const updateData: {
        status: typeof input.status;
        adminNotes?: string;
        handledBy: string;
        readAt?: Date;
        repliedAt?: Date;
      } = {
        status: input.status,
        adminNotes: input.adminNotes,
        handledBy: ctx.user.id,
      };

      // Set timestamps based on status change
      if (input.status === 'READ' && !request.readAt) {
        updateData.readAt = new Date();
      }
      if (input.status === 'REPLIED') {
        updateData.repliedAt = new Date();
        if (!request.readAt) {
          updateData.readAt = new Date();
        }
      }

      return ctx.prisma.contactRequest.update({
        where: { id: input.id },
        data: updateData,
      });
    }),

  /**
   * Mark as read when viewing
   */
  markAsRead: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.prisma.contactRequest.findUnique({
        where: { id: input.id },
      });

      if (!request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Richiesta non trovata',
        });
      }

      // Only update if currently PENDING
      if (request.status === 'PENDING') {
        return ctx.prisma.contactRequest.update({
          where: { id: input.id },
          data: {
            status: 'READ',
            readAt: new Date(),
            handledBy: ctx.user.id,
          },
        });
      }

      return request;
    }),

  /**
   * Delete a contact request
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.prisma.contactRequest.findUnique({
        where: { id: input.id },
      });

      if (!request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Richiesta non trovata',
        });
      }

      await ctx.prisma.contactRequest.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Get statistics for contact requests
   */
  getStats: adminProcedure.query(async ({ ctx }) => {
    const getCachedStats = createCachedQuery(
      async () => {
        const [total, pending, read, replied, archived] = await Promise.all([
          ctx.prisma.contactRequest.count(),
          ctx.prisma.contactRequest.count({ where: { status: 'PENDING' } }),
          ctx.prisma.contactRequest.count({ where: { status: 'READ' } }),
          ctx.prisma.contactRequest.count({ where: { status: 'REPLIED' } }),
          ctx.prisma.contactRequest.count({ where: { status: 'ARCHIVED' } }),
        ]);

        return {
          total,
          pending,
          read,
          replied,
          archived,
        };
      },
      ['contact-requests-stats'],
      { revalidate: CACHE_TIMES.MEDIUM } // 5 minutes
    );

    return await getCachedStats();
  }),
});
