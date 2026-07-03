// Email Log Router - Consultazione dello storico invii email (admin only).
// Persiste in DB perché i log applicativi (Vercel) hanno retention breve senza piano Pro.
import { router, adminProcedure } from '../init';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

export const emailLogRouter = router({
  /**
   * Elenco paginato degli invii email con filtri opzionali
   */
  getAll: adminProcedure
    .input(
      z.object({
        status: z.enum(['SENT', 'FAILED']).optional(),
        category: z.string().optional(),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { status, category, search, page = 1, limit = 20 } = input || {};

      const where: Prisma.EmailLogWhereInput = {};

      if (status) where.status = status;
      if (category) where.category = category;
      if (search) {
        where.OR = [
          { to: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [logs, total] = await Promise.all([
        ctx.prisma.emailLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.emailLog.count({ where }),
      ]);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Contatori sintetici (totale, inviate, fallite) rispettando gli stessi filtri
   */
  getStats: adminProcedure
    .input(
      z.object({
        category: z.string().optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { category, search } = input || {};

      const baseWhere: Prisma.EmailLogWhereInput = {};
      if (category) baseWhere.category = category;
      if (search) {
        baseWhere.OR = [
          { to: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [total, sent, failed] = await Promise.all([
        ctx.prisma.emailLog.count({ where: baseWhere }),
        ctx.prisma.emailLog.count({ where: { ...baseWhere, status: 'SENT' } }),
        ctx.prisma.emailLog.count({ where: { ...baseWhere, status: 'FAILED' } }),
      ]);

      return { total, sent, failed };
    }),
});
