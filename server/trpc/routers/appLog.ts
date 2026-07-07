// Application Log Router — consultazione dello storico errori applicativi (admin only).
// Alimentato da lib/logging/appLog.ts (middleware tRPC + catch delle route API).
import { router, adminProcedure } from '../init';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

const levelEnum = z.enum(['ERROR', 'WARN', 'INFO']);

export const appLogRouter = router({
  /** Elenco paginato dei log con filtri opzionali. */
  getAll: adminProcedure
    .input(
      z
        .object({
          level: levelEnum.optional(),
          source: z.string().optional(),
          search: z.string().optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { level, source, search, page = 1, limit = 20 } = input || {};

      const where: Prisma.ApplicationLogWhereInput = {};
      if (level) where.level = level;
      if (source) where.source = source;
      if (search) {
        where.OR = [
          { message: { contains: search, mode: 'insensitive' } },
          { path: { contains: search, mode: 'insensitive' } },
          { userEmail: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [logs, total] = await Promise.all([
        ctx.prisma.applicationLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.applicationLog.count({ where }),
      ]);

      return {
        logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    }),

  /** Contatori sintetici (totali, errori, warning) rispettando gli stessi filtri. */
  getStats: adminProcedure
    .input(z.object({ source: z.string().optional(), search: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const { source, search } = input || {};

      const baseWhere: Prisma.ApplicationLogWhereInput = {};
      if (source) baseWhere.source = source;
      if (search) {
        baseWhere.OR = [
          { message: { contains: search, mode: 'insensitive' } },
          { path: { contains: search, mode: 'insensitive' } },
          { userEmail: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [total, errors, warnings] = await Promise.all([
        ctx.prisma.applicationLog.count({ where: baseWhere }),
        ctx.prisma.applicationLog.count({ where: { ...baseWhere, level: 'ERROR' } }),
        ctx.prisma.applicationLog.count({ where: { ...baseWhere, level: 'WARN' } }),
      ]);

      // Sorgenti distinte per popolare il filtro lato UI.
      const sources = await ctx.prisma.applicationLog.findMany({
        distinct: ['source'],
        select: { source: true },
        orderBy: { source: 'asc' },
      });

      return { total, errors, warnings, sources: sources.map((s) => s.source) };
    }),

  /** Elimina i log più vecchi di N giorni (default 30). Manutenzione manuale della tabella. */
  clearOlderThan: adminProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }))
    .mutation(async ({ ctx, input }) => {
      const cutoff = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
      const { count } = await ctx.prisma.applicationLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      return { deleted: count };
    }),
});
