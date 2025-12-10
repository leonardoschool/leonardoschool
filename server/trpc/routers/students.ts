// Students Router - Handles student profile and data
import { router, protectedProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const studentsRouter = router({
  /**
   * Complete student profile with required personal information
   * Sets profileCompleted = true after successful update
   */
  completeProfile: protectedProcedure
    .input(
      z.object({
        fiscalCode: z.string().length(16).toUpperCase(),
        dateOfBirth: z.date(),
        phone: z.string().min(10),
        address: z.string().min(5),
        city: z.string().min(2),
        province: z.string().length(2).toUpperCase(),
        postalCode: z.string().length(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        });
      }

      if (ctx.user.role !== 'STUDENT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only students can complete profile',
        });
      }

      // Update student record
      const student = await ctx.prisma.student.findUnique({
        where: { userId: ctx.user.id },
      });

      if (!student) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Student profile not found',
        });
      }

      // Check if fiscal code already exists (for another user)
      const existingFiscalCode = await ctx.prisma.student.findUnique({
        where: { fiscalCode: input.fiscalCode },
      });

      if (existingFiscalCode && existingFiscalCode.id !== student.id) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Codice fiscale già registrato',
        });
      }

      // Update student with transaction (student + user profileCompleted)
      const updatedStudent = await ctx.prisma.$transaction(async (tx) => {
        // Update student data
        const studentUpdate = await tx.student.update({
          where: { id: student.id },
          data: {
            fiscalCode: input.fiscalCode,
            dateOfBirth: input.dateOfBirth,
            phone: input.phone,
            address: input.address,
            city: input.city,
            province: input.province,
            postalCode: input.postalCode,
          },
        });

        // Mark profile as completed in User table
        await tx.user.update({
          where: { id: ctx.user!.id },
          data: { profileCompleted: true },
        });

        return studentUpdate;
      });

      return {
        success: true,
        student: updatedStudent,
      };
    }),

  /**
   * Get current student profile
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      });
    }

    if (ctx.user.role !== 'STUDENT') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only students can access this',
      });
    }

    const student = await ctx.prisma.student.findUnique({
      where: { userId: ctx.user.id },
      include: {
        user: true,
        stats: true,
        class: true,
      },
    });

    if (!student) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Student profile not found',
      });
    }

    return student;
  }),
});
