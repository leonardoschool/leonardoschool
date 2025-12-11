// Auth Router - Handles user registration and sync with database
import { router, publicProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const authRouter = router({
  /**
   * Sync Firebase user with database
   * Called after successful Firebase registration
   */
  syncUser: publicProcedure
    .input(
      z.object({
        firebaseUid: z.string(),
        email: z.string().email(),
        name: z.string(),
        role: z.enum(['STUDENT', 'ADMIN', 'COLLABORATOR']).default('STUDENT'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.firebaseUid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Token non valido',
        });
      }

      if (ctx.firebaseUid !== input.firebaseUid) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'UID non corrispondente',
        });
      }

      const { firebaseUid, email, name } = input;
      const enforcedRole = 'STUDENT' as const;

      // Check if user already exists
      let user = await ctx.prisma.user.findUnique({
        where: { firebaseUid },
        include: { student: true, admin: true, collaborator: true },
      });

      if (user) {
        // User exists, just return it
        return user;
      }

      // Create new user with associated profile
      user = await ctx.prisma.user.create({
        data: {
          firebaseUid,
          email,
          name,
          role: enforcedRole,
          ...(enforcedRole === 'STUDENT' && {
            student: { create: {} },
          }),
        },
        include: {
          student: true,
          admin: true,
          collaborator: true,
        },
      });

      // Create stats for students
      if (user.student) {
        await ctx.prisma.studentStats.create({
          data: {
            studentId: user.student.id,
          },
        });
      }

      return user;
    }),

  /**
   * Get current user info
   */
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      });
    }

    return ctx.user;
  }),

  /**
   * Update last login
   */
  updateLastLogin: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.user.update({
        where: { id: input.userId },
        data: { lastLoginAt: new Date() },
      });
    }),
});
