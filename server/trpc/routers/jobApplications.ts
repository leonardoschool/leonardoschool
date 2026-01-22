// Job Applications Router - Handles job applications management for admin
import { router, adminProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createCachedQuery, CACHE_TIMES } from '@/lib/cache/serverCache';

export const jobApplicationsRouter = router({
  /**
   * Get all job applications with optional filters
   */
  getAll: adminProcedure
    .input(
      z.object({
        status: z.enum(['PENDING', 'REVIEWING', 'APPROVED', 'REJECTED']).optional(),
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
          { materia: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [applications, total] = await Promise.all([
        ctx.prisma.jobApplication.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.jobApplication.count({ where }),
      ]);

      return {
        applications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get a single job application by ID
   */
  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const application = await ctx.prisma.jobApplication.findUnique({
        where: { id: input.id },
      });

      if (!application) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Candidatura non trovata',
        });
      }

      return application;
    }),

  /**
   * Update job application status
   */
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['PENDING', 'REVIEWING', 'APPROVED', 'REJECTED']),
        adminNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const application = await ctx.prisma.jobApplication.findUnique({
        where: { id: input.id },
      });

      if (!application) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Candidatura non trovata',
        });
      }

      return ctx.prisma.jobApplication.update({
        where: { id: input.id },
        data: {
          status: input.status,
          adminNotes: input.adminNotes,
          reviewedAt: new Date(),
          reviewedBy: ctx.user.id,
        },
      });
    }),

  /**
   * Delete a job application
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const application = await ctx.prisma.jobApplication.findUnique({
        where: { id: input.id },
      });

      if (!application) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Candidatura non trovata',
        });
      }

      // Delete from Firebase Storage if CV exists
      if (application.cvUrl) {
        try {
          const { adminStorage } = await import('@/lib/firebase/admin');
          const bucket = adminStorage.bucket();
          // Extract file path from URL
          const urlParts = application.cvUrl.split('/');
          const fileName = urlParts.slice(-2).join('/'); // cv/filename
          await bucket.file(fileName).delete();
        } catch (error) {
          console.error('Error deleting CV from storage:', error);
          // Continue with deletion even if storage delete fails
        }
      }

      await ctx.prisma.jobApplication.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Get statistics for job applications
   */
  getStats: adminProcedure.query(async ({ ctx }) => {
    const getCachedStats = createCachedQuery(
      async () => {
        const [total, pending, reviewing, approved, rejected] = await Promise.all([
          ctx.prisma.jobApplication.count(),
          ctx.prisma.jobApplication.count({ where: { status: 'PENDING' } }),
          ctx.prisma.jobApplication.count({ where: { status: 'REVIEWING' } }),
          ctx.prisma.jobApplication.count({ where: { status: 'APPROVED' } }),
          ctx.prisma.jobApplication.count({ where: { status: 'REJECTED' } }),
        ]);

        return {
          total,
          pending,
          reviewing,
          approved,
          rejected,
        };
      },
      ['job-applications-stats'],
      { revalidate: CACHE_TIMES.MEDIUM } // 5 minutes
    );

    return await getCachedStats();
  }),
});
