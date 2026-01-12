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

// Parent/Guardian relationship types
const PARENT_RELATIONSHIP_TYPES = ['PADRE', 'MADRE', 'TUTORE_LEGALE', 'ALTRO'] as const;

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

// Funzione per capitalizzare nomi propri (gestisce apostrofi e trattini)
const capitalizeProperName = (str: string): string => {
  return str.trim().toLowerCase()
    .split(/(\s+|'|-)/)
    .map((part) => {
      if (part === ' ' || part === "'" || part === '-') return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
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

// Helper to calculate age from date of birth
const calculateAge = (dateOfBirth: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  
  return age;
};

// Parent/Guardian schema
const parentGuardianSchema = z.object({
  relationship: z.enum(PARENT_RELATIONSHIP_TYPES, {
    errorMap: () => ({ message: 'Tipo di relazione non valido' }),
  }),
  firstName: z.string()
    .min(2, 'Il nome è troppo corto')
    .max(50, 'Il nome è troppo lungo')
    .transform(capitalizeProperName),
  lastName: z.string()
    .min(2, 'Il cognome è troppo corto')
    .max(50, 'Il cognome è troppo lungo')
    .transform(capitalizeProperName),
  fiscalCode: z.string()
    .length(16, 'Il codice fiscale deve essere di 16 caratteri')
    .regex(CODICE_FISCALE_REGEX, 'Formato codice fiscale non valido')
    .transform(val => val.toUpperCase()),
  phone: z.string()
    .min(9, 'Il numero di telefono è troppo corto')
    .max(20, 'Il numero di telefono è troppo lungo')
    .transform(formatPhone),
  email: z.string()
    .email('Formato email non valido')
    .transform(val => val.toLowerCase())
    .optional()
    .or(z.literal('')),
  address: z.string()
    .min(5, "L'indirizzo è troppo corto")
    .max(200, "L'indirizzo è troppo lungo")
    .transform(capitalizeWords)
    .optional()
    .or(z.literal('')),
  city: z.string()
    .min(2, 'Il nome della città è troppo corto')
    .max(100, 'Il nome della città è troppo lungo')
    .transform(capitalizeWords)
    .optional()
    .or(z.literal('')),
  province: z.string()
    .length(2, 'La provincia deve essere di 2 lettere')
    .transform(val => val.toUpperCase())
    .refine(val => PROVINCE_ITALIANE.includes(val as typeof PROVINCE_ITALIANE[number]), 
      'Sigla provincia non valida')
    .optional()
    .or(z.literal('')),
  postalCode: z.string()
    .length(5, 'Il CAP deve essere di 5 cifre')
    .regex(/^\d{5}$/, 'Il CAP deve contenere solo numeri')
    .optional()
    .or(z.literal('')),
});

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
              matricola: true,
              phone: true,
              enrollmentDate: true,
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
            matricola: true,
            enrollmentDate: true,
            stats: {
              select: {
                totalSimulations: true,
                avgScore: true,
              }
            },
            groupMemberships: {
              select: {
                group: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                  }
                }
              }
            }
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
      matricola: s.student?.matricola,
      enrollmentDate: s.student?.enrollmentDate,
      stats: s.student?.stats,
      groups: s.student?.groupMemberships?.map(gm => gm.group) || [],
    }));
  }),

  /**
   * Get paginated students list for simulation assignment
   */
  getStudents: staffProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(500).default(50),
      search: z.string().optional(),
      isActive: z.boolean().optional(),
      onlyMyGroups: z.boolean().optional().default(false), // For collaborators: only students in their groups
    }))
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, isActive, onlyMyGroups } = input;

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

      // For collaborators: filter students to those in groups they manage
      if (onlyMyGroups && ctx.user?.role === 'COLLABORATOR' && ctx.user?.collaborator?.id) {
        // Get groups managed by this collaborator
        const collaboratorGroups = await ctx.prisma.group.findMany({
          where: { referenceCollaboratorId: ctx.user.collaborator.id },
          select: { id: true },
        });
        
        if (collaboratorGroups.length > 0) {
          const groupIds = collaboratorGroups.map(g => g.id);
          // Students must be members of at least one of these groups
          where.student = {
            ...(typeof where.student === 'object' ? where.student : {}),
            groupMemberships: {
              some: {
                groupId: { in: groupIds },
              },
            },
          };
        } else {
          // No groups assigned - return empty result
          return {
            students: [],
            pagination: { page, pageSize, total: 0, totalPages: 0 },
          };
        }
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
              matricola: true,
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
          matricola: s.student?.matricola,
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
   * Get detailed statistics for student's statistics page
   * Includes: simulation breakdown by type, trends over time, subject analysis, difficulty stats
   */
  getDetailedStats: protectedProcedure.query(async ({ ctx }) => {
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

    // Get ALL simulation results for this student (completed ones)
    const allResults = await ctx.prisma.simulationResult.findMany({
      where: { 
        studentId: student.id,
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'asc' },
      include: {
        simulation: {
          select: {
            id: true,
            title: true,
            type: true,
            isOfficial: true,
            durationMinutes: true,
            totalQuestions: true,
            subjectDistribution: true,
            questions: {
              include: {
                question: {
                  select: {
                    id: true,
                    difficulty: true,
                    subjectId: true,
                    subject: {
                      select: {
                        id: true,
                        name: true,
                        code: true,
                        color: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Get recent results (last 20) for the activity section
    const recentResults = allResults.slice(-20).reverse();

    // === OVERVIEW STATS ===
    const totalSimulations = allResults.length;
    const totalQuestions = allResults.reduce((sum, r) => sum + r.totalQuestions, 0);
    const totalCorrect = allResults.reduce((sum, r) => sum + r.correctAnswers, 0);
    const totalWrong = allResults.reduce((sum, r) => sum + r.wrongAnswers, 0);
    const totalBlank = allResults.reduce((sum, r) => sum + r.blankAnswers, 0);
    const avgPercentage = totalSimulations > 0 
      ? allResults.reduce((sum, r) => sum + r.percentageScore, 0) / totalSimulations 
      : 0;
    const bestScore = allResults.length > 0 
      ? Math.max(...allResults.map(r => r.percentageScore)) 
      : 0;
    const worstScore = allResults.length > 0 
      ? Math.min(...allResults.map(r => r.percentageScore)) 
      : 0;

    // Calculate improvement (last 5 vs first 5)
    const first5Avg = allResults.length >= 5 
      ? allResults.slice(0, 5).reduce((sum, r) => sum + r.percentageScore, 0) / 5 
      : allResults.reduce((sum, r) => sum + r.percentageScore, 0) / Math.max(allResults.length, 1);
    const last5Avg = allResults.length >= 5 
      ? allResults.slice(-5).reduce((sum, r) => sum + r.percentageScore, 0) / 5 
      : allResults.reduce((sum, r) => sum + r.percentageScore, 0) / Math.max(allResults.length, 1);
    const improvement = last5Avg - first5Avg;

    // Simulations this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const simulationsThisMonth = allResults.filter(r => 
      r.completedAt && r.completedAt >= startOfMonth
    ).length;

    // === SIMULATION TYPE BREAKDOWN ===
    const typeBreakdown: Record<string, { count: number; avgScore: number; totalScore: number }> = {};
    for (const result of allResults) {
      const type = result.simulation.type;
      if (!typeBreakdown[type]) {
        typeBreakdown[type] = { count: 0, avgScore: 0, totalScore: 0 };
      }
      typeBreakdown[type].count++;
      typeBreakdown[type].totalScore += result.percentageScore;
    }
    for (const type of Object.keys(typeBreakdown)) {
      typeBreakdown[type].avgScore = typeBreakdown[type].totalScore / typeBreakdown[type].count;
    }

    // === TREND DATA (last 12 simulations or all if less) ===
    const trendData = allResults.slice(-12).map((r, index) => ({
      index: index + 1,
      date: r.completedAt?.toISOString() || '',
      score: r.percentageScore,
      simulationTitle: r.simulation.title,
      type: r.simulation.type,
    }));

    // === MONTHLY TREND (group by month) ===
    const monthlyData: Record<string, { month: string; count: number; avgScore: number; totalScore: number }> = {};
    for (const result of allResults) {
      if (!result.completedAt) continue;
      const monthKey = `${result.completedAt.getFullYear()}-${String(result.completedAt.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { 
          month: monthKey, 
          count: 0, 
          avgScore: 0, 
          totalScore: 0 
        };
      }
      monthlyData[monthKey].count++;
      monthlyData[monthKey].totalScore += result.percentageScore;
    }
    const monthlyTrend = Object.values(monthlyData)
      .map(m => ({
        ...m,
        avgScore: m.totalScore / m.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months

    // === SUBJECT STATS (calculate from results' subjectScores) ===
    const subjectAccumulator: Record<string, { total: number; correct: number; wrong: number; blank: number }> = {};
    for (const result of allResults) {
      const subjectScores = result.subjectScores as Record<string, { correct: number; wrong: number; blank: number }> | null;
      if (subjectScores) {
        for (const [subject, scores] of Object.entries(subjectScores)) {
          if (!subjectAccumulator[subject]) {
            subjectAccumulator[subject] = { total: 0, correct: 0, wrong: 0, blank: 0 };
          }
          subjectAccumulator[subject].correct += scores.correct || 0;
          subjectAccumulator[subject].wrong += scores.wrong || 0;
          subjectAccumulator[subject].blank += scores.blank || 0;
          subjectAccumulator[subject].total += (scores.correct || 0) + (scores.wrong || 0) + (scores.blank || 0);
        }
      }
    }

    const subjectStats = Object.entries(subjectAccumulator).map(([subject, data]) => ({
      subject,
      totalQuestions: data.total,
      correctAnswers: data.correct,
      wrongAnswers: data.wrong,
      blankAnswers: data.blank,
      accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
    })).sort((a, b) => b.totalQuestions - a.totalQuestions);

    // Best and worst subjects
    const sortedByAccuracy = [...subjectStats].filter(s => s.totalQuestions >= 5).sort((a, b) => b.accuracy - a.accuracy);
    const bestSubject = sortedByAccuracy[0] || null;
    const worstSubject = sortedByAccuracy[sortedByAccuracy.length - 1] || null;

    // === ANSWER DISTRIBUTION (for pie chart) ===
    const answerDistribution = {
      correct: totalCorrect,
      wrong: totalWrong,
      blank: totalBlank,
    };

    // === DIFFICULTY BREAKDOWN ===
    const difficultyStats: Record<string, { total: number; correct: number }> = {
      EASY: { total: 0, correct: 0 },
      MEDIUM: { total: 0, correct: 0 },
      HARD: { total: 0, correct: 0 },
    };

    // Calculate from answers in results
    for (const result of allResults) {
      const answers = result.answers as Array<{
        questionId: string;
        isCorrect: boolean;
        difficulty?: string;
      }> | null;
      
      if (answers && Array.isArray(answers)) {
        for (const answer of answers) {
          // Try to get difficulty from the answer or from the simulation's questions
          let difficulty = answer.difficulty;
          if (!difficulty) {
            const simQuestion = result.simulation.questions.find(q => q.questionId === answer.questionId);
            difficulty = simQuestion?.question?.difficulty || 'MEDIUM';
          }
          
          if (difficultyStats[difficulty]) {
            difficultyStats[difficulty].total++;
            if (answer.isCorrect) {
              difficultyStats[difficulty].correct++;
            }
          }
        }
      }
    }

    const difficultyBreakdown = Object.entries(difficultyStats).map(([difficulty, data]) => ({
      difficulty,
      total: data.total,
      correct: data.correct,
      accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
    }));

    // === TIME STATS ===
    const completedWithTime = allResults.filter(r => r.durationSeconds && r.durationSeconds > 0);
    const avgTimeSeconds = completedWithTime.length > 0
      ? completedWithTime.reduce((sum, r) => sum + (r.durationSeconds || 0), 0) / completedWithTime.length
      : 0;
    const totalStudyMinutes = student.stats?.totalStudyTimeMinutes || 
      Math.round(completedWithTime.reduce((sum, r) => sum + (r.durationSeconds || 0), 0) / 60);

    // === ACHIEVEMENTS/MILESTONES ===
    const achievements: Array<{
      id: string;
      title: string;
      description: string;
      icon: string;
      unlocked: boolean;
      progress?: number;
      target?: number;
    }> = [];
    if (totalSimulations >= 1) achievements.push({ id: 'first_sim', title: 'Prima Simulazione', description: 'Hai completato la tua prima simulazione!', icon: '🎯', unlocked: true });
    if (totalSimulations >= 10) achievements.push({ id: 'ten_sims', title: '10 Simulazioni', description: '10 simulazioni completate', icon: '🔟', unlocked: true });
    if (totalSimulations >= 50) achievements.push({ id: 'fifty_sims', title: '50 Simulazioni', description: '50 simulazioni completate', icon: '🏆', unlocked: true });
    if (bestScore >= 90) achievements.push({ id: 'score_90', title: 'Eccellenza', description: 'Hai raggiunto il 90%!', icon: '⭐', unlocked: true });
    if (bestScore >= 100) achievements.push({ id: 'perfect', title: 'Punteggio Perfetto', description: '100% in una simulazione!', icon: '💯', unlocked: true });
    if (student.stats?.longestStreak && student.stats.longestStreak >= 7) {
      achievements.push({ id: 'streak_7', title: 'Settimana Perfetta', description: '7 giorni consecutivi', icon: '🔥', unlocked: true });
    }
    if (student.stats?.longestStreak && student.stats.longestStreak >= 30) {
      achievements.push({ id: 'streak_30', title: 'Mese Perfetto', description: '30 giorni consecutivi', icon: '🌟', unlocked: true });
    }

    // Potential achievements (not yet unlocked)
    if (totalSimulations < 10) achievements.push({ id: 'ten_sims', title: '10 Simulazioni', description: `${totalSimulations}/10 completate`, icon: '🔟', unlocked: false, progress: totalSimulations, target: 10 });
    if (totalSimulations >= 10 && totalSimulations < 50) achievements.push({ id: 'fifty_sims', title: '50 Simulazioni', description: `${totalSimulations}/50 completate`, icon: '🏆', unlocked: false, progress: totalSimulations, target: 50 });
    if (bestScore < 90) achievements.push({ id: 'score_90', title: 'Eccellenza', description: `Raggiungi il 90%`, icon: '⭐', unlocked: false, progress: bestScore, target: 90 });

    // === OFFICIAL SIMULATIONS STATS ===
    const officialResults = allResults.filter(r => r.simulation.isOfficial);
    const officialStats = {
      count: officialResults.length,
      avgScore: officialResults.length > 0 
        ? officialResults.reduce((sum, r) => sum + r.percentageScore, 0) / officialResults.length 
        : 0,
      bestScore: officialResults.length > 0 
        ? Math.max(...officialResults.map(r => r.percentageScore)) 
        : 0,
    };

    return {
      // Overview
      overview: {
        totalSimulations,
        totalQuestions,
        totalCorrect,
        totalWrong,
        totalBlank,
        averageScore: avgPercentage,
        bestScore,
        worstScore,
        improvement,
        simulationsThisMonth,
        totalTimeSpent: totalStudyMinutes,
        averageTime: Math.round(avgTimeSeconds / 60),
        currentStreak: student.stats?.currentStreak || 0,
        longestStreak: student.stats?.longestStreak || 0,
        lastActivityDate: student.stats?.lastActivityDate,
      },

      // Breakdown by simulation type
      typeBreakdown: Object.entries(typeBreakdown).map(([type, data]) => ({
        type,
        count: data.count,
        averageScore: data.avgScore,
      })),

      // Trend data for charts
      trendData,
      monthlyTrend,

      // Subject stats
      subjectStats,
      bestSubject,
      worstSubject,

      // Answer distribution
      answerDistribution,

      // Difficulty breakdown
      difficultyBreakdown,

      // Achievements
      achievements,

      // Official simulations
      officialStats,

      // Recent results
      recentResults: recentResults.map(r => ({
        id: r.id,
        title: r.simulation.title,
        type: r.simulation.type,
        isOfficial: r.simulation.isOfficial,
        score: r.percentageScore,
        correct: r.correctAnswers,
        total: r.totalQuestions,
        date: r.completedAt?.toISOString() || r.startedAt.toISOString(),
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
                user: { select: { id: true, name: true, email: true } },
              },
            },
            referenceCollaborator: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
            members: {
              include: {
                student: {
                  include: {
                    user: { select: { id: true, name: true, email: true } },
                  },
                },
                collaborator: {
                  include: {
                    user: { select: { id: true, name: true, email: true } },
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

    // Return all groups the student belongs to
    return groupMemberships.map(membership => {
      const group = membership.group;

      // Build members list (excluding reference student/collaborator - they'll be shown separately)
      const members = group.members.map(m => ({
        id: m.studentId || m.collaboratorId || m.id,
        memberId: m.id,
        joinedAt: m.joinedAt,
        type: m.studentId ? ('STUDENT' as const) : ('COLLABORATOR' as const),
        name: m.student?.user.name || m.collaborator?.user.name || '',
        email: m.student?.user.email || m.collaborator?.user.email || '',
        userId: m.student?.user.id || m.collaborator?.user.id || '',
        isCurrentUser: m.studentId === student.id,
      }));

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        color: group.color,
        type: group.type,
        joinedAt: membership.joinedAt,
        // Reference student (responsabile studenti)
        referenceStudent: group.referenceStudent
          ? {
              id: group.referenceStudent.id,
              userId: group.referenceStudent.user.id,
              name: group.referenceStudent.user.name,
              email: group.referenceStudent.user.email,
              isCurrentUser: group.referenceStudent.id === student.id,
            }
          : null,
        // Reference collaborator (responsabile collaboratore)
        referenceCollaborator: group.referenceCollaborator
          ? {
              id: group.referenceCollaborator.id,
              userId: group.referenceCollaborator.user.id,
              name: group.referenceCollaborator.user.name,
              email: group.referenceCollaborator.user.email,
            }
          : null,
        members,
        totalMembers: members.length,
      };
    });
  }),

  /**
   * Get detailed student info for collaborator view
   * Includes groups, assigned simulations, materials and parent/guardian data
   */
  getStudentDetailForCollaborator: staffProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      // The ID can be either a userId or a studentId, try both
      let user = await ctx.prisma.user.findUnique({
        where: { id: input.studentId },
        include: {
          student: {
            include: {
              stats: true,
              parentGuardian: true,
              groupMemberships: {
                include: {
                  group: {
                    include: {
                      // Include materials assigned to this group
                      materialAccess: {
                        include: {
                          material: true,
                        },
                      },
                    },
                  },
                },
              },
              simulationAssignments: {
                include: {
                  simulation: true,
                },
                orderBy: { assignedAt: 'desc' },
                take: 10,
              },
              // Direct material access for this student
              materialAccess: {
                include: {
                  material: true,
                },
                orderBy: { grantedAt: 'desc' },
                take: 10,
              },
            },
          },
        },
      });

      // If not found by userId, try to find by studentId
      if (!user || !user.student) {
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          include: {
            user: true,
            stats: true,
            parentGuardian: true,
            groupMemberships: {
              include: {
                group: {
                  include: {
                    materialAccess: {
                      include: {
                        material: true,
                      },
                    },
                  },
                },
              },
            },
            simulationAssignments: {
              include: {
                simulation: true,
              },
              orderBy: { assignedAt: 'desc' },
              take: 10,
            },
            materialAccess: {
              include: {
                material: true,
              },
              orderBy: { grantedAt: 'desc' },
              take: 10,
            },
          },
        });

        if (student) {
          // Reshape to match expected format
          user = {
            ...student.user,
            student,
          } as typeof user;
        }
      }

      if (!user || !user.student) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Studente non trovato',
        });
      }

      // Collect all materials (direct + from groups)
      // Define material type
      type MaterialItem = {
        id: string;
        title: string;
        type: string;
        grantedAt: Date;
        accessType: 'DIRECT' | 'GROUP';
        groupName: string | null;
      };

      const directMaterials: MaterialItem[] = user.student.materialAccess.map(ma => ({
        id: ma.material.id,
        title: ma.material.title,
        type: ma.material.type,
        grantedAt: ma.grantedAt,
        accessType: 'DIRECT' as const,
        groupName: null,
      }));

      // Materials from group memberships
      const groupMaterials: MaterialItem[] = [];
      for (const gm of user.student.groupMemberships) {
        for (const mga of gm.group.materialAccess) {
          // Avoid duplicates if already in direct access
          if (!directMaterials.some(dm => dm.id === mga.material.id)) {
            groupMaterials.push({
              id: mga.material.id,
              title: mga.material.title,
              type: mga.material.type,
              grantedAt: gm.joinedAt, // Use join date as access date
              accessType: 'GROUP' as const,
              groupName: gm.group.name,
            });
          }
        }
      }

      // Combine and deduplicate
      const allMaterials = [...directMaterials, ...groupMaterials];
      const uniqueMaterials = allMaterials.filter((m, index, self) => 
        index === self.findIndex(t => t.id === m.id)
      );

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        createdAt: user.createdAt,
        studentId: user.student.id,
        matricola: user.student.matricola,
        enrollmentDate: user.student.enrollmentDate,
        graduationYear: user.student.graduationYear,
        dateOfBirth: user.student.dateOfBirth,
        stats: user.student.stats,
        parentGuardian: user.student.parentGuardian,
        groups: user.student.groupMemberships.map(gm => ({
          id: gm.group.id,
          name: gm.group.name,
          color: gm.group.color,
          description: gm.group.description,
          joinedAt: gm.joinedAt,
          materialsCount: gm.group.materialAccess.length,
        })),
        simulations: user.student.simulationAssignments.map(sa => ({
          id: sa.id,
          title: sa.simulation?.title,
          type: sa.simulation?.type,
          assignedAt: sa.assignedAt,
        })),
        materials: uniqueMaterials,
      };
    }),

  // Get students from groups managed by current collaborator
  getFromMyGroups: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Utente non autenticato',
      });
    }

    // Get collaborator ID
    const collaborator = await ctx.prisma.collaborator.findUnique({
      where: { userId: ctx.user.id },
    });

    if (!collaborator) {
      return [];
    }

    // Get groups where this collaborator is the reference
    const myGroups = await ctx.prisma.group.findMany({
      where: {
        referenceCollaboratorId: collaborator.id,
        isActive: true,
      },
      select: { id: true },
    });

    if (myGroups.length === 0) {
      return [];
    }

    const groupIds = myGroups.map(g => g.id);

    // Get all students who are members of these groups
    const groupMembers = await ctx.prisma.groupMember.findMany({
      where: {
        groupId: { in: groupIds },
      },
      include: {
        student: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      distinct: ['studentId'],
    });

    return groupMembers
      .filter(gm => gm.student !== null)
      .map(gm => ({
        id: gm.student!.id,
        userId: gm.student!.user.id,
        name: gm.student!.user.name,
        email: gm.student!.user.email,
        user: gm.student!.user,
      }));
  }),

  // Get all simulations and results for a specific student (staff only)
  getStudentSimulations: staffProcedure
    .input(z.object({ 
      studentId: z.string().min(1), // This can be either userId or studentId from the URL
    }))
    .query(async ({ ctx, input }) => {
      // Staff (ADMIN and COLLABORATOR) can view all students' simulations
      // The ID can be either a userId or a studentId, try both
      
      let studentId: string;
      
      // First, try to find by userId
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.studentId },
        include: { student: true },
      });

      if (user && user.student) {
        studentId = user.student.id;
      } else {
        // Try to find directly as studentId
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
        });
        
        if (student) {
          studentId = student.id;
        } else {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Studente non trovato',
          });
        }
      }

      // Get student with all simulation results
      const student = await ctx.prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          simulationResults: {
            include: {
              simulation: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                  totalQuestions: true,
                  maxScore: true,
                  passingScore: true,
                  durationMinutes: true,
                  correctPoints: true,
                  wrongPoints: true,
                  blankPoints: true,
                },
              },
            },
            orderBy: {
              completedAt: 'desc',
            },
          },
        },
      });

      if (!student) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Studente non trovato',
        });
      }

      // Group results by simulation (keep only latest for each simulation)
      const simulationMap = new Map<string, typeof student.simulationResults[0]>();
      
      for (const result of student.simulationResults) {
        if (!result.completedAt) continue; // Skip incomplete attempts
        
        const simulationId = result.simulationId;
        const existing = simulationMap.get(simulationId);
        
        // Keep the most recent result for each simulation
        if (!existing || (result.completedAt && existing.completedAt && result.completedAt > existing.completedAt)) {
          simulationMap.set(simulationId, result);
        }
      }

      const latestResults = Array.from(simulationMap.values());

      // Calculate statistics
      const totalSimulations = latestResults.length;
      const totalQuestions = latestResults.reduce((sum, r) => 
        sum + (r.correctAnswers || 0) + (r.wrongAnswers || 0) + (r.blankAnswers || 0), 0
      );
      const totalCorrect = latestResults.reduce((sum, r) => sum + (r.correctAnswers || 0), 0);
      const totalWrong = latestResults.reduce((sum, r) => sum + (r.wrongAnswers || 0), 0);
      const totalBlank = latestResults.reduce((sum, r) => sum + (r.blankAnswers || 0), 0);
      const avgScore = totalSimulations > 0 
        ? latestResults.reduce((sum, r) => sum + (r.percentageScore || 0), 0) / totalSimulations 
        : 0;
      const passedCount = latestResults.filter(r => {
        if (!r.simulation.passingScore) return null;
        return (r.totalScore || 0) >= r.simulation.passingScore;
      }).length;

      // Map results with detailed question analysis
      const simulationsWithDetails = await Promise.all(latestResults.map(async (result) => {
        // Get simulation questions with details
        const simulation = await ctx.prisma.simulation.findUnique({
          where: { id: result.simulationId },
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: {
                question: {
                  select: {
                    id: true,
                    text: true,
                    textLatex: true,
                    imageUrl: true,
                    generalExplanation: true,
                    correctExplanation: true,
                    wrongExplanation: true,
                    subject: {
                      select: {
                        id: true,
                        name: true,
                        code: true,
                        color: true,
                      },
                    },
                    topic: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                    answers: {
                      select: {
                        id: true,
                        text: true,
                        isCorrect: true,
                        order: true,
                      },
                      orderBy: { order: 'asc' },
                    },
                  },
                },
              },
            },
          },
        });

        if (!simulation) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Simulazione non trovata',
          });
        }

        // Parse answers from JSON
        const answersData = result.answers as {
          questionId: string;
          answerId?: string | null;
          isCorrect: boolean | null;
        }[];

        // Group wrong answers by subject
        const wrongBySubject = new Map<string, Array<{
          questionId: string;
          questionText: string;
          selectedAnswerText: string | null;
          correctAnswerText: string;
          explanation: string | null;
          topicName: string | null;
        }>>();

        // Group answers by subject for stats
        const subjectStats = new Map<string, {
          name: string;
          color: string | null;
          correct: number;
          wrong: number;
          blank: number;
          total: number;
        }>();

        answersData.forEach(answer => {
          const questionData = simulation.questions.find(q => q.questionId === answer.questionId);
          if (!questionData) return;

          const question = questionData.question;
          const subjectCode = question.subject?.code || 'UNKNOWN';
          const subjectName = question.subject?.name || 'Sconosciuto';
          const subjectColor = question.subject?.color || null;

          // Update subject stats
          if (!subjectStats.has(subjectCode)) {
            subjectStats.set(subjectCode, {
              name: subjectName,
              color: subjectColor,
              correct: 0,
              wrong: 0,
              blank: 0,
              total: 0,
            });
          }

          const stats = subjectStats.get(subjectCode)!;
          stats.total++;
          if (answer.isCorrect === null) {
            stats.blank++;
          } else if (answer.isCorrect) {
            stats.correct++;
          } else {
            stats.wrong++;
          }

          // Add wrong answers to list
          if (answer.isCorrect === false) {
            if (!wrongBySubject.has(subjectCode)) {
              wrongBySubject.set(subjectCode, []);
            }

            const correctAnswer = question.answers.find(a => a.isCorrect);
            const selectedAnswer = answer.answerId 
              ? question.answers.find(a => a.id === answer.answerId) 
              : null;

            wrongBySubject.get(subjectCode)!.push({
              questionId: answer.questionId,
              questionText: question.text,
              selectedAnswerText: selectedAnswer?.text || null,
              correctAnswerText: correctAnswer?.text || 'N/A',
              explanation: question.generalExplanation || question.correctExplanation || null,
              topicName: question.topic?.name || null,
            });
          }
        });

        return {
          resultId: result.id,
          simulationId: result.simulationId,
          simulationTitle: result.simulation.title,
          simulationType: result.simulation.type,
          completedAt: result.completedAt,
          totalScore: result.totalScore,
          percentageScore: result.percentageScore,
          correctAnswers: result.correctAnswers,
          wrongAnswers: result.wrongAnswers,
          blankAnswers: result.blankAnswers,
          durationSeconds: result.durationSeconds,
          passed: result.simulation.passingScore 
            ? (result.totalScore || 0) >= result.simulation.passingScore 
            : null,
          maxScore: result.simulation.maxScore,
          passingScore: result.simulation.passingScore,
          subjectStats: Array.from(subjectStats.entries()).map(([code, stats]) => ({
            code,
            ...stats,
            percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
          })),
          wrongAnswersBySubject: Array.from(wrongBySubject.entries()).map(([code, questions]) => {
            const subjectName = subjectStats.get(code)?.name || 'Sconosciuto';
            return {
              subjectCode: code,
              subjectName,
              count: questions.length,
              questions,
            };
          }),
        };
      }));

      return {
        student: {
          id: student.id,
          name: student.user.name,
          email: student.user.email,
          matricola: student.matricola,
        },
        statistics: {
          totalSimulations,
          totalQuestions,
          totalCorrect,
          totalWrong,
          totalBlank,
          avgScore,
          passedCount,
          correctPercentage: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
        },
        simulations: simulationsWithDetails,
      };
    }),

  // ==================== PARENT/GUARDIAN PROCEDURES ====================

  /**
   * Save or update parent/guardian data
   * Can be called during profile completion or when admin requests it
   */
  saveParentGuardian: protectedProcedure
    .input(parentGuardianSchema)
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
          message: 'Solo gli studenti possono aggiornare i dati del genitore',
        });
      }

      const student = await ctx.prisma.student.findUnique({
        where: { userId: ctx.user.id },
        include: { parentGuardian: true },
      });

      if (!student) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profilo studente non trovato',
        });
      }

      // Prepare data (filter out empty strings for optional fields)
      const parentData = {
        relationship: input.relationship,
        firstName: input.firstName,
        lastName: input.lastName,
        fiscalCode: input.fiscalCode,
        phone: input.phone,
        email: input.email || null,
        address: input.address || null,
        city: input.city || null,
        province: input.province || null,
        postalCode: input.postalCode || null,
      };

      // Upsert parent guardian
      const parentGuardian = await ctx.prisma.parentGuardian.upsert({
        where: { studentId: student.id },
        create: {
          studentId: student.id,
          ...parentData,
        },
        update: parentData,
      });

      // If parent data was required by admin, clear the requirement and reactivate account
      if (student.requiresParentData) {
        await ctx.prisma.student.update({
          where: { id: student.id },
          data: {
            requiresParentData: false,
            parentDataRequestedAt: null,
            parentDataRequestedById: null,
          },
        });

        // Reactivate the user account
        await ctx.prisma.user.update({
          where: { id: ctx.user.id },
          data: { isActive: true },
        });

        // Notify admins that parent data has been provided
        await notificationService.notifyAdmins(ctx.prisma, {
          type: 'GENERAL',
          title: 'Dati genitore inseriti',
          message: `${ctx.user.name} ha inserito i dati del genitore/tutore richiesti`,
          linkUrl: `/utenti?highlight=${ctx.user.id}`,
          linkType: 'user',
          linkEntityId: ctx.user.id,
        });
      }

      return {
        success: true,
        parentGuardian,
      };
    }),

  /**
   * Get current student's parent/guardian data
   */
  getMyParentGuardian: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      });
    }

    if (ctx.user.role !== 'STUDENT') {
      return null;
    }

    const student = await ctx.prisma.student.findUnique({
      where: { userId: ctx.user.id },
      include: { parentGuardian: true },
    });

    return student?.parentGuardian || null;
  }),

  /**
   * Check if student needs to provide parent data
   * Returns: { required: boolean, isMinor: boolean, hasData: boolean, requestedByAdmin: boolean }
   */
  getParentDataRequirement: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      });
    }

    if (ctx.user.role !== 'STUDENT') {
      return { required: false, isMinor: false, hasData: false, requestedByAdmin: false };
    }

    const student = await ctx.prisma.student.findUnique({
      where: { userId: ctx.user.id },
      include: { parentGuardian: true },
    });

    if (!student) {
      return { required: false, isMinor: false, hasData: false, requestedByAdmin: false };
    }

    const isMinorStudent = student.dateOfBirth ? calculateAge(student.dateOfBirth) < 18 : false;
    const hasData = !!student.parentGuardian;
    const requestedByAdmin = student.requiresParentData;

    // Parent data is required if:
    // 1. Student is a minor
    // 2. Admin has requested it (for adult students)
    const required = (isMinorStudent || requestedByAdmin) && !hasData;

    return {
      required,
      isMinor: isMinorStudent,
      hasData,
      requestedByAdmin,
      requiresParentData: student.requiresParentData,
      requestedAt: student.parentDataRequestedAt,
    };
  }),

  /**
   * Admin: Request parent data from an adult student
   */
  requestParentData: adminProcedure
    .input(z.object({
      studentId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Find the student (can be userId or studentId)
      let student = await ctx.prisma.student.findFirst({
        where: {
          OR: [
            { id: input.studentId },
            { userId: input.studentId },
          ],
        },
        include: {
          user: true,
          parentGuardian: true,
        },
      });

      if (!student) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Studente non trovato',
        });
      }

      // Check if student already has parent data
      if (student.parentGuardian) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Lo studente ha già fornito i dati del genitore',
        });
      }

      // Update the student to require parent data
      await ctx.prisma.student.update({
        where: { id: student.id },
        data: {
          requiresParentData: true,
          parentDataRequestedAt: new Date(),
          parentDataRequestedById: ctx.user?.id,
        },
      });

      // Also set user as inactive until parent data is provided
      await ctx.prisma.user.update({
        where: { id: student.userId },
        data: {
          isActive: false,
        },
      });

      // Send notification to the student
      await notificationService.createNotification(ctx.prisma, {
        userId: student.userId,
        type: 'PARENT_DATA_REQUESTED',
        title: 'Richiesta dati genitore/tutore',
        message: 'L\'amministrazione richiede di inserire i dati del tuo genitore o tutore. Accedi al tuo profilo per completare le informazioni.',
        linkUrl: '/profilo?section=genitore',
        linkType: 'profile',
        isUrgent: true,
        channel: 'BOTH',
      });

      return { success: true };
    }),

  /**
   * Admin: Remove parent data requirement for a student (unblocks the account)
   */
  cancelParentDataRequest: adminProcedure
    .input(z.object({
      studentId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Find the student
      const student = await ctx.prisma.student.findFirst({
        where: {
          OR: [
            { id: input.studentId },
            { userId: input.studentId },
          ],
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      });

      if (!student) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Studente non trovato',
        });
      }

      // Update the student to not require parent data and reactivate the user
      await ctx.prisma.$transaction([
        ctx.prisma.student.update({
          where: { id: student.id },
          data: {
            requiresParentData: false,
            parentDataRequestedAt: null,
            parentDataRequestedById: null,
          },
        }),
        ctx.prisma.user.update({
          where: { id: student.userId },
          data: { isActive: true },
        }),
      ]);

      return { success: true };
    }),

  /**
   * Staff: Get parent/guardian data for a student
   */
  getStudentParentGuardian: staffProcedure
    .input(z.object({
      studentId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Find the student (can be userId or studentId)
      const student = await ctx.prisma.student.findFirst({
        where: {
          OR: [
            { id: input.studentId },
            { userId: input.studentId },
          ],
        },
        include: {
          user: { select: { name: true } },
          parentGuardian: true,
        },
      });

      if (!student) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Studente non trovato',
        });
      }

      const isMinorStudent = student.dateOfBirth ? calculateAge(student.dateOfBirth) < 18 : null;

      return {
        studentName: student.user.name,
        isMinor: isMinorStudent,
        dateOfBirth: student.dateOfBirth,
        requiresParentData: student.requiresParentData,
        parentDataRequestedAt: student.parentDataRequestedAt,
        parentGuardian: student.parentGuardian,
      };
    }),

  /**
   * Get full student details for admin view (includes parent/guardian data)
   */
  getFullStudentDetails: staffProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Find student by userId or studentId
      const user = await ctx.prisma.user.findFirst({
        where: {
          OR: [
            { id: input.studentId },
            { student: { id: input.studentId } },
          ],
        },
        include: {
          student: {
            include: {
              parentGuardian: true,
              stats: true,
              groupMemberships: {
                include: {
                  group: {
                    select: {
                      id: true,
                      name: true,
                      color: true,
                      description: true,
                    },
                  },
                },
              },
              contracts: {
                where: { status: 'SIGNED' },
                orderBy: { signedAt: 'desc' },
                take: 1,
              },
              simulationAssignments: {
                include: {
                  simulation: {
                    select: {
                      id: true,
                      title: true,
                      type: true,
                    },
                  },
                },
                orderBy: { assignedAt: 'desc' },
                take: 10,
              },
              materialAccess: {
                include: {
                  material: {
                    select: {
                      id: true,
                      title: true,
                      type: true,
                    },
                  },
                },
                orderBy: { grantedAt: 'desc' },
                take: 10,
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

      const isMinorStudent = user.student.dateOfBirth 
        ? calculateAge(user.student.dateOfBirth) < 18 
        : null;

      return {
        // User info
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        profileCompleted: user.profileCompleted,
        createdAt: user.createdAt,

        // Student info
        studentId: user.student.id,
        matricola: user.student.matricola,
        fiscalCode: user.student.fiscalCode,
        dateOfBirth: user.student.dateOfBirth,
        isMinor: isMinorStudent,
        phone: user.student.phone,
        address: user.student.address,
        city: user.student.city,
        province: user.student.province,
        postalCode: user.student.postalCode,
        enrollmentDate: user.student.enrollmentDate,
        graduationYear: user.student.graduationYear,

        // Parent data requirement
        requiresParentData: user.student.requiresParentData,
        parentDataRequestedAt: user.student.parentDataRequestedAt,

        // Parent/Guardian
        parentGuardian: user.student.parentGuardian,

        // Other relations
        stats: user.student.stats,
        groups: user.student.groupMemberships.map(gm => ({
          id: gm.group.id,
          name: gm.group.name,
          color: gm.group.color,
          description: gm.group.description,
          joinedAt: gm.joinedAt,
        })),
        simulations: user.student.simulationAssignments.map(sa => ({
          id: sa.id,
          title: sa.simulation?.title,
          type: sa.simulation?.type,
          assignedAt: sa.assignedAt,
        })),
        materials: user.student.materialAccess.map(ma => ({
          id: ma.material.id,
          title: ma.material.title,
          type: ma.material.type,
          grantedAt: ma.grantedAt,
        })),
        hasSignedContract: user.student.contracts.length > 0,
      };
    }),
});
