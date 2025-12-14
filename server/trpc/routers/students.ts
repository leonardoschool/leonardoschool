// Students Router - Handles student profile and data
import { router, protectedProcedure, adminProcedure, staffProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import * as notificationService from '../../services/notificationService';

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

// Funzione per capitalizzare correttamente nomi di città/indirizzi
const capitalizeWords = (str: string): string => {
  return str.trim().toLowerCase()
    .split(' ')
    .map(word => {
      // Non capitalizzare se inizia con un numero
      if (/^\d/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

// Funzione per formattare il telefono
const formatPhone = (phone: string): string => {
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Rimuovi prefisso internazionale se presente
  if (cleaned.startsWith('+39')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('0039')) {
    cleaned = cleaned.substring(4);
  }
  
  // Formatta come +39 XXX XXX XXXX
  return `+39 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
};

export const studentsRouter = router({
  /**
   * Complete student profile with required personal information
   * Sets profileCompleted = true after successful update
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
            return age >= 14 && age <= 100;
          }, 'Devi avere almeno 14 anni per registrarti'),
        phone: z.string()
          .min(9, 'Il numero di telefono è troppo corto')
          .max(20, 'Il numero di telefono è troppo lungo')
          .transform(formatPhone),
        address: z.string()
          .min(5, "L'indirizzo è troppo corto")
          .max(200, "L'indirizzo è troppo lungo")
          .transform(capitalizeWords),
        city: z.string()
          .min(2, 'Il nome della città è troppo corto')
          .max(100, 'Il nome della città è troppo lungo')
          .transform(capitalizeWords),
        province: z.string()
          .length(2, 'La provincia deve essere di 2 lettere')
          .transform(val => val.toUpperCase())
          .refine(val => PROVINCE_ITALIANE.includes(val as typeof PROVINCE_ITALIANE[number]), 
            'Sigla provincia non valida'),
        postalCode: z.string()
          .length(5, 'Il CAP deve essere di 5 cifre')
          .regex(/^\d{5}$/, 'Il CAP deve contenere solo numeri')
          .refine(val => {
            const num = parseInt(val, 10);
            return num >= 10 && num <= 98168;
          }, 'CAP non valido'),
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

      // Send notifications using the unified notification service
      await notificationService.notifyProfileCompleted(
        ctx.prisma,
        student.id,
        ctx.user.name,
        ctx.user.email
      );

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

  /**
   * Get student details by ID (admin/staff only)
   */
  getById: staffProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.id },
        include: {
          student: {
            include: {
              class: true,
              groupMemberships: {
                include: {
                  group: {
                    select: {
                      id: true,
                      name: true,
                      color: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user || user.role !== 'STUDENT') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Studente non trovato',
        });
      }

      return user;
    }),

  /**
   * Get public student info (accessible by all authenticated users)
   * Returns limited info suitable for displaying in modals/cards
   */
  getPublicInfo: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          student: {
            select: {
              phone: true,
              enrollmentDate: true,
              class: {
                select: {
                  id: true,
                  name: true,
                },
              },
              groupMemberships: {
                include: {
                  group: {
                    select: {
                      id: true,
                      name: true,
                      color: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user || !user.student) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Studente non trovato',
        });
      }

      return user;
    }),

  /**
   * Get all students for admin (used in materials assignment)
   */
  getAllForAdmin: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: {
        student: true,
      },
      orderBy: { name: 'asc' },
    });
  }),

  /**
   * Get students list for collaborators (limited view - no sensitive data)
   */
  getListForCollaborator: staffProcedure.query(async ({ ctx }) => {
    const students = await ctx.prisma.user.findMany({
      where: { 
        role: 'STUDENT',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        student: {
          select: {
            id: true,
            enrollmentDate: true,
            class: {
              select: {
                id: true,
                name: true,
              }
            },
            stats: {
              select: {
                totalSimulations: true,
                avgScore: true,
              }
            },
          }
        }
      },
      orderBy: { name: 'asc' },
    });

    // Flatten the response for easier use
    return students.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      isActive: s.isActive,
      studentId: s.student?.id,
      enrollmentDate: s.student?.enrollmentDate,
      className: s.student?.class?.name,
      stats: s.student?.stats,
    }));
  }),

  /**
   * Get all classes for simulation assignment
   */
  getClasses: staffProcedure.query(async ({ ctx }) => {
    return ctx.prisma.class.findMany({
      select: {
        id: true,
        name: true,
        year: true,
        section: true,
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { name: 'asc' }],
    });
  }),

  /**
   * Get paginated students list for simulation assignment
   */
  getStudents: staffProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(500).default(50),
      search: z.string().optional(),
      classId: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, classId, isActive } = input;

      const where: Record<string, unknown> = {
        role: 'STUDENT',
      };

      if (typeof isActive === 'boolean') {
        where.isActive = isActive;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (classId) {
        where.student = { classId };
      }

      const total = await ctx.prisma.user.count({ where });

      const students = await ctx.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          student: {
            select: {
              id: true,
              class: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      return {
        students: students.map(s => ({
          id: s.id,
          name: s.name,
          email: s.email,
          isActive: s.isActive,
          studentId: s.student?.id,
          classId: s.student?.class?.id,
          className: s.student?.class?.name,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // ==================== STUDENT SELF-SERVICE ====================

  /**
   * Get current student's stats (for student dashboard)
   */
  getMyStats: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      });
    }

    const student = await ctx.prisma.student.findUnique({
      where: { userId: ctx.user.id },
      include: {
        stats: true,
      },
    });

    if (!student) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Profilo studente non trovato',
      });
    }

    // Get recent simulation results
    const recentResults = await ctx.prisma.simulationResult.findMany({
      where: { studentId: student.id },
      orderBy: { startedAt: 'desc' },
      take: 10,
      include: {
        simulation: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
    });

    // Get subject breakdown from stats
    const subjectStats = student.stats?.subjectStats as Record<string, { total: number; correct: number; avg: number }> | null;

    return {
      overview: {
        totalSimulations: student.stats?.totalSimulations || 0,
        totalQuestions: student.stats?.totalQuestions || 0,
        totalCorrectAnswers: student.stats?.totalCorrectAnswers || 0,
        avgScore: student.stats?.avgScore || 0,
        bestScore: student.stats?.bestScore || 0,
        totalStudyTimeMinutes: student.stats?.totalStudyTimeMinutes || 0,
        currentStreak: student.stats?.currentStreak || 0,
        longestStreak: student.stats?.longestStreak || 0,
        lastActivityDate: student.stats?.lastActivityDate,
      },
      subjectStats: subjectStats || {},
      recentResults: recentResults.map(r => ({
        id: r.id,
        simulationId: r.simulationId,
        simulationTitle: r.simulation.title,
        simulationType: r.simulation.type,
        totalScore: r.totalScore,
        percentageScore: r.percentageScore,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
      })),
    };
  }),

  /**
   * Get current student's group (for student group page)
   */
  getMyGroup: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      });
    }

    const student = await ctx.prisma.student.findUnique({
      where: { userId: ctx.user.id },
    });

    if (!student) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Profilo studente non trovato',
      });
    }

    // Find groups where this student is a member
    const groupMemberships = await ctx.prisma.groupMember.findMany({
      where: { studentId: student.id },
      include: {
        group: {
          include: {
            referenceStudent: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
            referenceCollaborator: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
            members: {
              include: {
                student: {
                  include: {
                    user: { select: { name: true, email: true } },
                  },
                },
                collaborator: {
                  include: {
                    user: { select: { name: true, email: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (groupMemberships.length === 0) {
      return null;
    }

    // Return the first (primary) group
    const membership = groupMemberships[0];
    const group = membership.group;

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      color: group.color,
      type: group.type,
      joinedAt: membership.joinedAt,
      reference: group.referenceStudent
        ? {
            type: 'STUDENT' as const,
            name: group.referenceStudent.user.name,
            email: group.referenceStudent.user.email,
          }
        : group.referenceCollaborator
        ? {
            type: 'COLLABORATOR' as const,
            name: group.referenceCollaborator.user.name,
            email: group.referenceCollaborator.user.email,
          }
        : null,
      members: group.members.map(m => ({
        id: m.id,
        joinedAt: m.joinedAt,
        type: m.studentId ? ('STUDENT' as const) : ('COLLABORATOR' as const),
        name: m.student?.user.name || m.collaborator?.user.name || '',
        email: m.student?.user.email || m.collaborator?.user.email || '',
        isCurrentUser: m.studentId === student.id,
      })),
      totalMembers: group.members.length,
    };
  }),
});
