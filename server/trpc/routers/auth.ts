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
        role: z.enum(['STUDENT', 'ADMIN']).default('STUDENT'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { firebaseUid, email, name, role } = input;

      // Check if user already exists
      let user = await ctx.prisma.user.findUnique({
        where: { firebaseUid },
        include: { student: true, admin: true },
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
          role,
          ...(role === 'STUDENT' && {
            student: { create: {} },
          }),
          ...(role === 'ADMIN' && {
            admin: { create: {} },
          }),
        },
        include: {
          student: true,
          admin: true,
        },
      });

      // Create stats for students
      if (role === 'STUDENT' && user.student) {
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
