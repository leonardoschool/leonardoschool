// Auth Router - Handles user registration and sync with database
import { router, publicProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { notifications } from '@/lib/notifications';
import { generateMatricola } from '@/lib/utils/matricolaUtils';

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

      // Check if user already exists by firebaseUid
      let user = await ctx.prisma.user.findUnique({
        where: { firebaseUid },
        include: { student: true, admin: true, collaborator: true },
      });

      if (user) {
        // User exists with this firebaseUid, just return it
        return user;
      }

      // Check if user exists with same email (different Firebase account)
      const existingUserByEmail = await ctx.prisma.user.findUnique({
        where: { email },
      });

      if (existingUserByEmail) {
        // Email already registered with different Firebase account
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Questa email è già registrata. Prova ad accedere con le tue credenziali esistenti.',
        });
      }

      // Generate matricola for new student
      const matricola = await generateMatricola(ctx.prisma);

      // Create new user with associated profile
      user = await ctx.prisma.user.create({
        data: {
          firebaseUid,
          email,
          name,
          role: enforcedRole,
          ...(enforcedRole === 'STUDENT' && {
            student: { create: { matricola } },
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

      // Notify admins about new registration (background, don't block response)
      notifications.newRegistration(ctx.prisma, {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
      }).catch(err => {
        console.error('[Auth] Failed to send new registration notification:', err);
      });

      return user;
    }),

  /**
   * Get current user info with student data including parent guardian
   */
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      });
    }

    // Get fresh user data including student info and parent guardian
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      include: {
        student: {
          include: {
            parentGuardian: true,
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      profileCompleted: user.profileCompleted,
      createdAt: user.createdAt?.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString(),
      student: user.student ? {
        id: user.student.id,
        userId: user.student.userId,
        matricola: user.student.matricola,
        fiscalCode: user.student.fiscalCode,
        dateOfBirth: user.student.dateOfBirth?.toISOString(),
        phone: user.student.phone,
        address: user.student.address,
        city: user.student.city,
        province: user.student.province,
        postalCode: user.student.postalCode,
        enrollmentDate: user.student.enrollmentDate?.toISOString(),
        graduationYear: user.student.graduationYear,
        requiresParentData: user.student.requiresParentData,
        parentDataRequestedAt: user.student.parentDataRequestedAt?.toISOString(),
        parentDataRequestedBy: user.student.parentDataRequestedBy,
        parentGuardian: user.student.parentGuardian,
      } : undefined,
    };
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
