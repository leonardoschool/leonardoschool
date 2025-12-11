/* eslint-disable @typescript-eslint/no-explicit-any */
// Collaborators Router - Handles collaborator management
// Note: 'any' types are used for Prisma dynamic queries and include patterns
import { router, adminProcedure, protectedProcedure, staffProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

// Lista delle province italiane valide
const PROVINCE_ITALIANE = [
  'AG', 'AL', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AT', 'AV', 'BA',
  'BG', 'BI', 'BL', 'BN', 'BO', 'BR', 'BS', 'BT', 'BZ', 'CA',
  'CB', 'CE', 'CH', 'CI', 'CL', 'CN', 'CO', 'CR', 'CS', 'CT',
  'CZ', 'EN', 'FC', 'FE', 'FG', 'FI', 'FM', 'FR', 'GE', 'GO',
  'GR', 'IM', 'IS', 'KR', 'LC', 'LE', 'LI', 'LO', 'LT', 'LU',
  'MB', 'MC', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NA', 'NO',
  'NU', 'OG', 'OR', 'OT', 'PA', 'PC', 'PD', 'PE', 'PG', 'PI',
  'PN', 'PO', 'PR', 'PT', 'PU', 'PV', 'PZ', 'RA', 'RC', 'RE',
  'RG', 'RI', 'RM', 'RN', 'RO', 'SA', 'SI', 'SO', 'SP', 'SR',
  'SS', 'SU', 'SV', 'TA', 'TE', 'TN', 'TO', 'TP', 'TR', 'TS',
  'TV', 'UD', 'VA', 'VB', 'VC', 'VE', 'VI', 'VR', 'VS', 'VT', 'VV'
] as const;

// Regex per codice fiscale italiano
const CODICE_FISCALE_REGEX = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;

export const collaboratorsRouter = router({
  /**
   * Get all collaborators (admin only)
   */
  getAll: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({
      where: { role: 'COLLABORATOR' as any },
      include: {
        collaborator: {
          include: {
            contracts: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      } as any,
      orderBy: { name: 'asc' },
    });
  }),

  /**
   * Get collaborator details (admin only)
   */
  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.id },
        include: {
          collaborator: {
            include: {
              contracts: {
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        } as any,
      });

      if (!user || (user.role as string) !== 'COLLABORATOR') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Collaboratore non trovato',
        });
      }

      return user;
    }),

  /**
   * Get current collaborator profile
   */
  getProfile: staffProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Non autenticato',
      });
    }

    if ((ctx.user.role as string) !== 'COLLABORATOR') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Solo i collaboratori possono accedere',
      });
    }

    const collaborator = await (ctx.prisma as any).collaborator.findUnique({
      where: { userId: ctx.user.id },
      include: {
        user: true,
        contracts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!collaborator) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Profilo collaboratore non trovato',
      });
    }

    return collaborator;
  }),

  /**
   * Complete collaborator profile
   */
  completeProfile: protectedProcedure
    .input(
      z.object({
        fiscalCode: z.string()
          .length(16, 'Il codice fiscale deve essere di 16 caratteri')
          .regex(CODICE_FISCALE_REGEX, 'Formato codice fiscale non valido')
          .transform(val => val.toUpperCase()),
        dateOfBirth: z.date()
          .refine(date => {
            const age = new Date().getFullYear() - date.getFullYear();
            return age >= 18 && age <= 100;
          }, 'Devi avere almeno 18 anni'),
        phone: z.string()
          .min(9, 'Il numero di telefono è troppo corto')
          .max(20, 'Il numero di telefono è troppo lungo'),
        address: z.string()
          .min(5, "L'indirizzo è troppo corto")
          .max(200, "L'indirizzo è troppo lungo"),
        city: z.string()
          .min(2, 'Il nome della città è troppo corto')
          .max(100, 'Il nome della città è troppo lungo'),
        province: z.string()
          .length(2, 'La provincia deve essere di 2 lettere')
          .transform(val => val.toUpperCase())
          .refine(val => PROVINCE_ITALIANE.includes(val as typeof PROVINCE_ITALIANE[number]), 
            'Sigla provincia non valida'),
        postalCode: z.string()
          .length(5, 'Il CAP deve essere di 5 cifre')
          .regex(/^\d{5}$/, 'Il CAP deve contenere solo numeri'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Non autenticato',
        });
      }

      if ((ctx.user.role as string) !== 'COLLABORATOR') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Solo i collaboratori possono completare questo profilo',
        });
      }

      // Transaction to update both user and collaborator
      const result = await ctx.prisma.$transaction(async (tx: any) => {
        // Update collaborator data
        const updatedCollaborator = await tx.collaborator.update({
          where: { userId: ctx.user!.id },
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

        // Mark profile as completed
        const updatedUser = await tx.user.update({
          where: { id: ctx.user!.id },
          data: { profileCompleted: true },
        });

        return { user: updatedUser, collaborator: updatedCollaborator };
      });

      return result;
    }),

  /**
   * Activate/deactivate collaborator (admin only)
   */
  toggleActive: adminProcedure
    .input(z.object({ 
      userId: z.string(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
      });

      if (!user || (user.role as string) !== 'COLLABORATOR') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Collaboratore non trovato',
        });
      }

      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: { isActive: input.isActive },
      });
    }),

  /**
   * Update collaborator permissions (admin only)
   */
  updatePermissions: adminProcedure
    .input(z.object({
      collaboratorId: z.string(),
      canManageQuestions: z.boolean().optional(),
      canManageMaterials: z.boolean().optional(),
      canViewStats: z.boolean().optional(),
      canViewStudents: z.boolean().optional(),
      specialization: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { collaboratorId, ...data } = input;
      
      return (ctx.prisma as any).collaborator.update({
        where: { id: collaboratorId },
        data,
      });
    }),

  /**
   * Get pending collaborator registrations (admin only)
   */
  getPendingRegistrations: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({
      where: { 
        role: 'COLLABORATOR' as any,
        isActive: false,
      },
      include: {
        collaborator: {
          include: {
            contracts: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      } as any,
      orderBy: { createdAt: 'desc' },
    });
  }),

  /**
   * Convert a student to collaborator (admin only)
   * Moves data from Student to Collaborator table
   */
  convertFromStudent: adminProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        include: { student: true },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Utente non trovato',
        });
      }

      if ((user.role as string) !== 'STUDENT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'L\'utente non è uno studente',
        });
      }

      // Transaction to convert student to collaborator
      return ctx.prisma.$transaction(async (tx: any) => {
        // Get student data
        const student = user.student;
        
        // Create collaborator with student data
        await tx.collaborator.create({
          data: {
            userId: input.userId,
            fiscalCode: student?.fiscalCode,
            dateOfBirth: student?.dateOfBirth,
            phone: student?.phone,
            address: student?.address,
            city: student?.city,
            province: student?.province,
            postalCode: student?.postalCode,
          },
        });

        // Delete student record (and related data like contracts)
        if (student) {
          // First delete related records
          await tx.contract.deleteMany({ where: { studentId: student.id } });
          await tx.studentStats.deleteMany({ where: { studentId: student.id } });
          await tx.materialStudentAccess.deleteMany({ where: { studentId: student.id } });
          await tx.student.delete({ where: { id: student.id } });
        }

        // Update user role
        const updatedUser = await tx.user.update({
          where: { id: input.userId },
          data: { 
            role: 'COLLABORATOR' as any,
            isActive: false, // Reset activation status
          },
        });

        return updatedUser;
      });
    }),
});
