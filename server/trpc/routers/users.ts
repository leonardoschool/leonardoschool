/* eslint-disable @typescript-eslint/no-explicit-any */
// Users Router - Handles user management for admin
// Note: 'any' types are used for Prisma dynamic queries and include patterns
// that cannot be strictly typed without significant complexity
import { router, adminProcedure, protectedProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { adminAuth } from '@/lib/firebase/admin';
import { Prisma } from '@prisma/client';
import { generateMatricola } from '@/lib/utils/matricolaUtils';

export const usersRouter = router({
  /**
   * Get current user information
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      role: ctx.user.role,
      isActive: ctx.user.isActive,
      profileCompleted: ctx.user.profileCompleted,
    };
  }),

  /**
   * Get all users with their roles and status
   */
  getAll: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        role: z.enum(['ALL', 'ADMIN', 'COLLABORATOR', 'STUDENT']).default('ALL'),
        status: z.enum(['ALL', 'ACTIVE', 'INACTIVE', 'PENDING_PROFILE', 'PENDING_CONTRACT', 'PENDING_SIGN', 'PENDING_ACTIVATION', 'NO_SIGNED_CONTRACT']).default('ALL'),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { search, role, status, page, limit } = input || { page: 1, limit: 20, role: 'ALL', status: 'ALL' };

      const where: Prisma.UserWhereInput = {};

      // Search filter
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Role filter
      if (role && role !== 'ALL') {
        where.role = role;
      }

      // Status filter - Granular status filtering
      if (status === 'ACTIVE') {
        where.isActive = true;
      } else if (status === 'INACTIVE') {
        // Disattivati manualmente - profilo completato, non attivo, ma NON in attesa di qualcosa
        // Questi sono utenti che erano attivi e sono stati disattivati
        where.isActive = false;
        where.profileCompleted = true;
        // Must have a cancelled/expired contract (or be admin) but still inactive = manually deactivated
        where.OR = [
          { role: 'ADMIN' }, // Admin without contracts
          {
            role: { in: ['STUDENT', 'COLLABORATOR'] },
            OR: [
              {
                student: {
                  contracts: {
                    some: { 
                      status: 'CANCELLED'
                    }
                  }
                }
              },
              {
                collaborator: {
                  contracts: {
                    some: { 
                      status: 'CANCELLED' 
                    }
                  }
                }
              },
              {
                student: {
                  contracts: {
                    some: { 
                      status: 'EXPIRED'
                    }
                  }
                }
              },
              {
                collaborator: {
                  contracts: {
                    some: { 
                      status: 'EXPIRED'
                    }
                  }
                }
              }
            ]
          }
        ];
      } else if (status === 'PENDING_PROFILE') {
        // Profilo incompleto
        where.profileCompleted = false;
      } else if (status === 'PENDING_CONTRACT') {
        // Profilo completato, ma senza contratto assegnato
        where.profileCompleted = true;
        where.isActive = false;
        where.role = { in: ['STUDENT', 'COLLABORATOR'] };
        // Filter users without any contracts
        where.AND = [
          {
            OR: [
              { student: null },
              { student: { contracts: { none: {} } } }
            ]
          },
          {
            OR: [
              { collaborator: null },
              { collaborator: { contracts: { none: {} } } }
            ]
          }
        ];
      } else if (status === 'PENDING_SIGN') {
        // Contratto assegnato ma non firmato (status PENDING)
        where.profileCompleted = true;
        where.isActive = false;
        where.role = { in: ['STUDENT', 'COLLABORATOR'] };
        where.OR = [
          {
            student: {
              contracts: {
                some: { status: 'PENDING' }
              }
            }
          },
          {
            collaborator: {
              contracts: {
                some: { status: 'PENDING' }
              }
            }
          }
        ];
      } else if (status === 'PENDING_ACTIVATION') {
        // Profilo completato, contratto firmato, ma non attivo
        where.profileCompleted = true;
        where.isActive = false;
        where.role = { in: ['STUDENT', 'COLLABORATOR'] };
        // Has at least one signed contract
        where.OR = [
          {
            student: {
              contracts: {
                some: { signedAt: { not: null } }
              }
            }
          },
          {
            collaborator: {
              contracts: {
                some: { signedAt: { not: null } }
              }
            }
          }
        ];
      } else if (status === 'NO_SIGNED_CONTRACT') {
        // All users (active or not) without a signed contract - excludes admins
        where.role = { in: ['STUDENT', 'COLLABORATOR'] };
        where.AND = [
          {
            OR: [
              { student: null },
              { student: { contracts: { none: { signedAt: { not: null } } } } }
            ]
          },
          {
            OR: [
              { collaborator: null },
              { collaborator: { contracts: { none: { signedAt: { not: null } } } } }
            ]
          }
        ];
      }

      const [users, total] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          include: {
            student: {
              select: {
                id: true,
                matricola: true,
                fiscalCode: true,
                dateOfBirth: true,
                phone: true,
                address: true,
                city: true,
                province: true,
                postalCode: true,
                contracts: {
                  orderBy: { assignedAt: 'desc' },
                  take: 1,
                  select: {
                    id: true,
                    status: true,
                    signedAt: true,
                    template: {
                      select: { name: true },
                    },
                  },
                },
                // Groups the student belongs to
                groupMemberships: {
                  select: {
                    groupId: true,
                    group: {
                      select: {
                        id: true,
                        name: true,
                        color: true,
                      },
                    },
                  },
                },
                // Materials explicitly assigned to the student
                materialAccess: {
                  select: {
                    id: true,
                    grantedAt: true,
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
                // Simulation assignments
                simulationAssignments: {
                  select: {
                    id: true,
                    assignedAt: true,
                    status: true,
                    dueDate: true,
                    startDate: true,
                    endDate: true,
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
                // Simulation results to show completion status
                simulationResults: {
                  select: {
                    id: true,
                    completedAt: true,
                    totalScore: true,
                    percentageScore: true,
                    simulationId: true,
                  },
                  where: {
                    completedAt: { not: null },
                  },
                  orderBy: { completedAt: 'desc' },
                  take: 10,
                },
              },
            },
            admin: {
              select: {
                id: true,
              },
            },
            collaborator: {
              select: {
                id: true,
                fiscalCode: true,
                dateOfBirth: true,
                phone: true,
                address: true,
                city: true,
                province: true,
                postalCode: true,
                canManageQuestions: true,
                canManageMaterials: true,
                canViewStats: true,
                canViewStudents: true,
                subjects: {
                  include: {
                    subject: {
                      select: {
                        id: true,
                        name: true,
                        code: true,
                        color: true,
                      },
                    },
                  },
                  orderBy: { isPrimary: 'desc' },
                },
                contracts: {
                  orderBy: { assignedAt: 'desc' },
                  take: 1,
                  select: {
                    id: true,
                    status: true,
                    signedAt: true,
                    template: {
                      select: { name: true },
                    },
                  },
                },
                // Groups the collaborator is member of
                groupMemberships: {
                  select: {
                    group: {
                      select: {
                        id: true,
                        name: true,
                        color: true,
                      },
                    },
                  },
                },
                // Groups where the collaborator is the referent
                referenceGroups: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                  },
                },
              },
            },
          } as any,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.user.count({ where }),
      ]);

      // Enrich students with all accessible materials (including ALL_STUDENTS and GROUP_BASED)
      const enrichedUsers = await Promise.all(
        users.map(async (user) => {
          if (!user.student) return user;

          const student = user.student as any;
          const studentId = student.id;
          const groupIds = student.groupMemberships?.map((m: any) => m.groupId) || [];

          // Get all materials accessible to this student
          const accessibleMaterials = await ctx.prisma.material.findMany({
            where: {
              isActive: true,
              OR: [
                // Materials visible to all students
                { visibility: 'ALL_STUDENTS' },
                // Materials assigned to student's groups
                groupIds.length > 0 ? {
                  visibility: 'GROUP_BASED',
                  groupAccess: {
                    some: { groupId: { in: groupIds } },
                  },
                } : { id: 'never' },
                // Materials explicitly assigned to this student
                {
                  visibility: 'SELECTED_STUDENTS',
                  studentAccess: {
                    some: { studentId },
                  },
                },
              ],
            },
            select: {
              id: true,
              title: true,
              type: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          });

          // Transform materials to match the materialAccess structure
          const materialAccessList = accessibleMaterials.map(material => ({
            id: `synthetic-${material.id}`, // Synthetic ID to avoid conflicts
            grantedAt: material.createdAt,
            material: {
              id: material.id,
              title: material.title,
              type: material.type,
            },
          }));

          return {
            ...user,
            student: {
              ...student,
              materialAccess: materialAccessList,
            },
          };
        })
      );

      return {
        users: enrichedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get user stats for dashboard
   */
  getStats: adminProcedure
    .input(z.object({
      role: z.enum(['ALL', 'ADMIN', 'COLLABORATOR', 'STUDENT']).optional().default('ALL'),
    }).optional())
    .query(async ({ ctx, input }) => {
    const roleFilter = input?.role || 'ALL';
    const roleWhere = roleFilter !== 'ALL' ? { role: roleFilter } : {};

    const [total, students, collaborators, admins, active, pendingProfile] = await Promise.all([
      ctx.prisma.user.count({ where: roleWhere }),
      ctx.prisma.user.count({ where: { role: 'STUDENT' } }),
      ctx.prisma.user.count({ where: { role: 'COLLABORATOR' as any } }),
      ctx.prisma.user.count({ where: { role: 'ADMIN' } }),
      ctx.prisma.user.count({ where: { ...roleWhere, isActive: true } }),
      ctx.prisma.user.count({ where: { ...roleWhere, profileCompleted: false } }),
    ]);

    // Count pending contract (profile completed but no contracts)
    const usersWithProfile = await ctx.prisma.user.findMany({
      where: {
        ...roleWhere,
        profileCompleted: true,
        isActive: false,
        role: roleFilter !== 'ALL' ? roleFilter : { in: ['STUDENT', 'COLLABORATOR'] },
      },
      include: {
        student: { include: { contracts: true } },
        collaborator: { include: { contracts: true } },
      } as any,
    });

    let pendingContract = 0;
    let pendingSign = 0;
    let pendingActivation = 0;
    let inactiveCount = 0;

    for (const user of usersWithProfile) {
      const contracts = (user as any).student?.contracts || (user as any).collaborator?.contracts || [];
      if (contracts.length === 0) {
        pendingContract++;
      } else {
        const lastContract = contracts[contracts.length - 1];
        if (lastContract.status === 'PENDING') {
          pendingSign++;
        } else if (lastContract.status === 'SIGNED') {
          pendingActivation++;
        } else if (lastContract.status === 'CANCELLED' || lastContract.status === 'EXPIRED') {
          // User with cancelled or expired contract = can be considered inactive
          inactiveCount++;
        }
      }
    }

    // Handle admin users who don't need contracts
    if (roleFilter === 'ADMIN') {
      // Admins don't have contracts, so reset these counts
      pendingContract = 0;
      pendingSign = 0;
      pendingActivation = 0;
      // Inactive admins are those with profileCompleted but not active
      inactiveCount = await ctx.prisma.user.count({
        where: {
          role: 'ADMIN',
          profileCompleted: true,
          isActive: false,
        }
      });
    }

    // Count users without any signed contract (regardless of active status)
    const noSignedContractCount = roleFilter === 'ADMIN' ? 0 : await ctx.prisma.user.count({
      where: {
        role: roleFilter !== 'ALL' ? roleFilter : { in: ['STUDENT', 'COLLABORATOR'] },
        AND: [
          {
            OR: [
              { student: null },
              { student: { contracts: { none: { signedAt: { not: null } } } } }
            ]
          },
          {
            OR: [
              { collaborator: null },
              { collaborator: { contracts: { none: { signedAt: { not: null } } } } }
            ]
          }
        ]
      } as any
    });

    return {
      total,
      students,
      collaborators,
      admins,
      active,
      pending: pendingProfile,
      pendingProfile,
      pendingContract,
      pendingSign,
      pendingActivation,
      inactive: inactiveCount,
      noSignedContract: noSignedContractCount,
    };
  }),

  /**
   * Change user role
   */
  changeRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        newRole: z.enum(['ADMIN', 'COLLABORATOR', 'STUDENT']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, newRole } = input;

      // Prevent changing your own role
      if (userId === ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non puoi modificare il tuo ruolo',
        });
      }

      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
        include: {
          student: true,
          admin: true,
          collaborator: true,
        } as any,
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Utente non trovato',
        });
      }

      const currentRole = user.role as string;

      // If role is the same, do nothing
      if (currentRole === newRole) {
        return user;
      }

      // Extract common profile data from existing profiles
      const oldStudent = (user as any).student;
      const oldCollaborator = (user as any).collaborator;
      const oldAdmin = (user as any).admin;
      
      // Get common data from whichever profile exists
      const commonData = {
        fiscalCode: oldStudent?.fiscalCode || oldCollaborator?.fiscalCode || null,
        dateOfBirth: oldStudent?.dateOfBirth || oldCollaborator?.dateOfBirth || null,
        phone: oldStudent?.phone || oldCollaborator?.phone || oldAdmin?.phone || null,
        address: oldStudent?.address || oldCollaborator?.address || null,
        city: oldStudent?.city || oldCollaborator?.city || null,
        province: oldStudent?.province || oldCollaborator?.province || null,
        postalCode: oldStudent?.postalCode || oldCollaborator?.postalCode || null,
      };

      // Determine if new profile will be complete
      // Student and Collaborator require: fiscalCode, dateOfBirth, phone, address, city, province, postalCode
      // Admin only requires phone (optional, so admin profile is always "complete")
      const isNewProfileComplete = newRole === 'ADMIN' ? true : Boolean(
        commonData.fiscalCode &&
        commonData.dateOfBirth &&
        commonData.phone &&
        commonData.address &&
        commonData.city &&
        commonData.province &&
        commonData.postalCode
      );

      // Transaction to update role and create/delete related records
      return ctx.prisma.$transaction(async (tx) => {
        // 1. Delete OLD profile records (keep contracts and stats separate)
        if (oldStudent) {
          // Don't delete contracts, they're linked to student
          // Delete stats as they're student-specific
          await tx.studentStats.deleteMany({ where: { studentId: oldStudent.id } });
          await tx.student.delete({ where: { id: oldStudent.id } });
        }
        if (oldCollaborator) {
          await (tx as any).collaborator.delete({ where: { id: oldCollaborator.id } });
        }
        if (oldAdmin) {
          await tx.admin.delete({ where: { id: oldAdmin.id } });
        }

        // 2. Create NEW profile record with common data
        if (newRole === 'STUDENT') {
          // Generate new matricola for the student
          const matricola = await generateMatricola(ctx.prisma);
          const newStudent = await tx.student.create({
            data: {
              userId,
              matricola,
              fiscalCode: commonData.fiscalCode,
              dateOfBirth: commonData.dateOfBirth,
              phone: commonData.phone,
              address: commonData.address,
              city: commonData.city,
              province: commonData.province,
              postalCode: commonData.postalCode,
            },
          });
          // Create stats for student
          await tx.studentStats.create({
            data: { studentId: newStudent.id },
          });
        } else if (newRole === 'COLLABORATOR') {
          await (tx as any).collaborator.create({
            data: {
              userId,
              fiscalCode: commonData.fiscalCode,
              dateOfBirth: commonData.dateOfBirth,
              phone: commonData.phone,
              address: commonData.address,
              city: commonData.city,
              province: commonData.province,
              postalCode: commonData.postalCode,
            },
          });
        } else if (newRole === 'ADMIN') {
          await tx.admin.create({
            data: {
              userId,
              phone: commonData.phone,
            },
          });
        }

        // 3. Update user role and reset profileCompleted if data is missing
        // Also reset isActive since they need to complete profile and sign new contract
        return tx.user.update({
          where: { id: userId },
          data: {
            role: newRole as any,
            profileCompleted: isNewProfileComplete,
            isActive: false, // User needs to complete profile and sign contract for new role
          },
          include: {
            student: true,
            admin: true,
            collaborator: true,
          } as any,
        });
      });
    }),

  /**
   * Toggle user active status
   */
  toggleActive: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Utente non trovato',
        });
      }

      // Prevent deactivating yourself
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non puoi disattivare il tuo account',
        });
      }

      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: { isActive: !user.isActive },
      });
    }),

  /**
   * Delete user completely
   */
  deleteUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = input;

      // Prevent deleting yourself
      if (userId === ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non puoi eliminare il tuo account',
        });
      }

      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
        include: {
          student: true,
          admin: true,
          collaborator: true,
        } as any,
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Utente non trovato',
        });
      }

      // Delete from Firebase
      try {
        await adminAuth.deleteUser(user.firebaseUid);
      } catch (firebaseError: any) {
        // If user doesn't exist in Firebase, continue with DB deletion
        if (firebaseError.code !== 'auth/user-not-found') {
          console.error('Firebase delete error:', firebaseError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Errore durante l\'eliminazione da Firebase',
          });
        }
      }

      // Delete from database (cascade will handle related records)
      await ctx.prisma.$transaction(async (tx) => {
        // Delete student-related data if exists
        if ((user as any).student) {
          const studentId = (user as any).student.id;
          // Delete stats
          await tx.studentStats.deleteMany({ where: { studentId } });
          // Delete contracts
          await tx.contract.deleteMany({ where: { studentId } });
          // Delete simulation results
          await tx.simulationResult.deleteMany({ where: { studentId } });
          
          // Delete quick quiz simulations created by this user (QUICK_QUIZ type)
          // First get the IDs to delete related records
          const quickQuizzes = await tx.simulation.findMany({
            where: { 
              createdById: userId,
              type: 'QUICK_QUIZ',
            },
            select: { id: true },
          });
          
          if (quickQuizzes.length > 0) {
            const quizIds = quickQuizzes.map(q => q.id);
            // Delete related simulation questions
            await tx.simulationQuestion.deleteMany({ where: { simulationId: { in: quizIds } } });
            // Delete related assignments
            await tx.simulationAssignment.deleteMany({ where: { simulationId: { in: quizIds } } });
            // Delete related results
            await tx.simulationResult.deleteMany({ where: { simulationId: { in: quizIds } } });
            // Delete the quick quizzes themselves
            await tx.simulation.deleteMany({ where: { id: { in: quizIds } } });
          }
          
          // Delete student
          await tx.student.delete({ where: { id: studentId } });
        }

        // Delete collaborator-related data if exists
        if ((user as any).collaborator) {
          const collaboratorId = (user as any).collaborator.id;
          // Delete collaborator contracts from unified table
          await tx.contract.deleteMany({ where: { collaboratorId } });
          // Delete collaborator
          await (tx as any).collaborator.delete({ where: { id: collaboratorId } });
        }

        // Delete admin if exists
        if ((user as any).admin) {
          await tx.admin.delete({ where: { id: (user as any).admin.id } });
        }

        // Finally delete user
        await tx.user.delete({ where: { id: userId } });
      });

      return { success: true, message: 'Utente eliminato con successo' };
    }),

  /**
   * Get all available subjects for assignment
   */
  getSubjects: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.customSubject.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
  }),

  /**
   * Create a new subject
   */
  createSubject: adminProcedure
    .input(z.object({
      name: z.string().min(2),
      code: z.string().min(2).max(10),
      description: z.string().optional(),
      color: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.customSubject.create({
        data: {
          name: input.name,
          code: input.code.toUpperCase(),
          description: input.description,
          color: input.color || '#6B7280',
        },
      });
    }),

  /**
   * Get subjects assigned to a collaborator
   */
  getCollaboratorSubjects: adminProcedure
    .input(z.object({
      collaboratorId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const assignments = await ctx.prisma.collaboratorSubject.findMany({
        where: { collaboratorId: input.collaboratorId },
        include: { subject: true },
        orderBy: { assignedAt: 'asc' },
      });
      return assignments;
    }),

  /**
   * Assign subjects to a collaborator
   */
  assignSubjects: adminProcedure
    .input(z.object({
      collaboratorId: z.string(),
      subjectIds: z.array(z.string()),
      primarySubjectId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { collaboratorId, subjectIds, primarySubjectId } = input;

      // Verify collaborator exists
      const collaborator = await ctx.prisma.collaborator.findUnique({
        where: { id: collaboratorId },
      });

      if (!collaborator) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Collaboratore non trovato',
        });
      }

      // Remove existing assignments and add new ones in a transaction
      await ctx.prisma.$transaction(async (tx) => {
        // Remove all current assignments
        await tx.collaboratorSubject.deleteMany({
          where: { collaboratorId },
        });

        // Add new assignments
        if (subjectIds.length > 0) {
          await tx.collaboratorSubject.createMany({
            data: subjectIds.map(subjectId => ({
              collaboratorId,
              subjectId,
              isPrimary: subjectId === primarySubjectId,
            })),
          });
        }
      });

      return { success: true };
    }),

  /**
   * Remove a subject from a collaborator
   */
  removeSubject: adminProcedure
    .input(z.object({
      collaboratorId: z.string(),
      subjectId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.collaboratorSubject.deleteMany({
        where: {
          collaboratorId: input.collaboratorId,
          subjectId: input.subjectId,
        },
      });
      return { success: true };
    }),

  /**
   * Get all staff members (admin + collaborators) for selection
   */
  getStaff: protectedProcedure.query(async ({ ctx }) => {
    const staff = await ctx.prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'COLLABORATOR'] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: [
        { role: 'asc' }, // ADMIN first
        { name: 'asc' },
      ],
    });

    return staff;
  }),

  /**
   * Get collaborator dashboard stats
   * Returns statistics about simulations, questions, materials, and students
   */
  getCollaboratorDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user || (ctx.user.role !== 'COLLABORATOR' && ctx.user.role !== 'ADMIN')) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Solo i collaboratori possono accedere a questa risorsa',
      });
    }

    const userId = ctx.user.id;

    // Get collaborator record for this user
    const collaborator = await ctx.prisma.collaborator.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!collaborator) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Profilo collaboratore non trovato',
      });
    }

    // Get collaborator's assigned groups via GroupMember
    const collaboratorGroupMemberships = await ctx.prisma.groupMember.findMany({
      where: {
        collaboratorId: collaborator.id,
      },
      select: { groupId: true },
    });

    const groupIds = collaboratorGroupMemberships.map(m => m.groupId);

    // Get counts in parallel
    const [
      mySimulationsCount,
      myQuestionsCount,
      myMaterialsCount,
      myStudentsCount,
      recentSimulations,
      upcomingEvents,
    ] = await Promise.all([
      // Simulations created by this collaborator
      ctx.prisma.simulation.count({
        where: { 
          createdById: userId,
          creatorRole: { not: 'STUDENT' },
        },
      }),
      // Questions created by this collaborator
      ctx.prisma.question.count({
        where: { createdById: userId },
      }),
      // Materials uploaded by this collaborator
      ctx.prisma.material.count({
        where: { createdBy: userId },
      }),
      // Students in collaborator's groups only
      ctx.prisma.groupMember.count({
        where: { 
          groupId: { in: groupIds },
          studentId: { not: null },
          student: {
            user: { isActive: true },
          },
        },
      }),
      // Recent simulations by this collaborator (last 5)
      ctx.prisma.simulation.findMany({
        where: { 
          createdById: userId,
          creatorRole: { not: 'STUDENT' },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          createdAt: true,
          _count: {
            select: { results: true, assignments: true },
          },
        },
      }),
      // Upcoming events for next 7 days - only for collaborator's groups or direct invites
      ctx.prisma.calendarEvent.findMany({
        where: {
          OR: [
            {
              // Events where collaborator is directly invited
              invitations: {
                some: { userId: userId },
              },
            },
            {
              // Events where collaborator's groups are invited
              invitations: {
                some: {
                  groupId: { in: groupIds },
                },
              },
            },
          ],
          startDate: { gte: new Date() },
          endDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
          isCancelled: false,
        },
        orderBy: { startDate: 'asc' },
        take: 5,
        select: {
          id: true,
          title: true,
          type: true,
          startDate: true,
          endDate: true,
          isAllDay: true,
          locationType: true,
          locationDetails: true,
        },
      }),
    ]);

    return {
      stats: {
        mySimulations: mySimulationsCount,
        myQuestions: myQuestionsCount,
        myMaterials: myMaterialsCount,
        totalStudents: myStudentsCount,
      },
      recentSimulations,
      upcomingEvents,
    };
  }),

  /**
   * Get comprehensive admin platform statistics
   * Returns detailed analytics for the entire platform
   */
  getAdminPlatformStats: adminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // ============ USER STATS ============
    const [
      totalUsers,
      totalStudents,
      totalCollaborators,
      totalAdmins,
      activeUsers,
      newUsersThisMonth,
      newUsersLastMonth,
    ] = await Promise.all([
      ctx.prisma.user.count(),
      ctx.prisma.user.count({ where: { role: 'STUDENT' } }),
      ctx.prisma.user.count({ where: { role: 'COLLABORATOR' } }),
      ctx.prisma.user.count({ where: { role: 'ADMIN' } }),
      ctx.prisma.user.count({ where: { isActive: true } }),
      ctx.prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      ctx.prisma.user.count({ where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),
    ]);

    // User growth trend (last 12 months)
    const userGrowthTrend = await Promise.all(
      Array.from({ length: 12 }, async (_, i) => {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - 10 + i, 0);
        const count = await ctx.prisma.user.count({
          where: { 
            createdAt: { gte: monthStart, lte: monthEnd },
            role: 'STUDENT',
          },
        });
        // Format: "Dic '25" - clearer that 25 is year, not day
        const monthName = monthStart.toLocaleDateString('it-IT', { month: 'short' });
        const year = monthStart.getFullYear().toString().slice(-2);
        return {
          month: `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} '${year}`,
          students: count,
        };
      })
    );

    // ============ REVENUE STATS ============
    // Get signed contracts with template prices
    const signedContracts = await ctx.prisma.contract.findMany({
      where: { status: 'SIGNED' },
      include: { template: { select: { price: true, name: true } } },
    });

    const totalRevenue = signedContracts.reduce((sum, c) => sum + (c.template.price || 0), 0);
    
    // Monthly revenue (last 12 months)
    const revenueByMonth = await Promise.all(
      Array.from({ length: 12 }, async (_, i) => {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - 10 + i, 0);
        const contracts = await ctx.prisma.contract.findMany({
          where: { 
            status: 'SIGNED',
            signedAt: { gte: monthStart, lte: monthEnd },
          },
          include: { template: { select: { price: true } } },
        });
        const revenue = contracts.reduce((sum, c) => sum + (c.template.price || 0), 0);
        // Format: "Dic '25" - clearer that 25 is year, not day
        const monthName = monthStart.toLocaleDateString('it-IT', { month: 'short' });
        const year = monthStart.getFullYear().toString().slice(-2);
        return {
          month: `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} '${year}`,
          revenue,
          contracts: contracts.length,
        };
      })
    );

    const thisMonthRevenue = revenueByMonth[11]?.revenue || 0;
    const lastMonthRevenue = revenueByMonth[10]?.revenue || 0;

    // ============ SIMULATION & PERFORMANCE STATS ============
    const [
      totalSimulations,
      totalResults,
      completedResultsThisMonth,
      avgScoreResult,
    ] = await Promise.all([
      ctx.prisma.simulation.count({ where: { status: 'PUBLISHED' } }),
      ctx.prisma.simulationResult.count(),
      ctx.prisma.simulationResult.count({ 
        where: { completedAt: { gte: startOfMonth } } 
      }),
      ctx.prisma.simulationResult.aggregate({
        _avg: { percentageScore: true },
        where: { completedAt: { not: null } },
      }),
    ]);

    // Performance by subject (from subjectScores JSON field)
    const allResults = await ctx.prisma.simulationResult.findMany({
      where: { completedAt: { not: null } },
      select: { subjectScores: true },
      take: 1000, // Limit for performance
      orderBy: { completedAt: 'desc' },
    });

    type SubjectAccumulator = { correct: number; wrong: number; blank: number; total: number };
    const subjectPerformance: Record<string, SubjectAccumulator> = {};
    
    for (const result of allResults) {
      if (result.subjectScores && typeof result.subjectScores === 'object') {
        const scores = result.subjectScores as Record<string, { correct?: number; wrong?: number; blank?: number }>;
        for (const [subject, data] of Object.entries(scores)) {
          if (!subjectPerformance[subject]) {
            subjectPerformance[subject] = { correct: 0, wrong: 0, blank: 0, total: 0 };
          }
          subjectPerformance[subject].correct += data.correct || 0;
          subjectPerformance[subject].wrong += data.wrong || 0;
          subjectPerformance[subject].blank += data.blank || 0;
          subjectPerformance[subject].total += (data.correct || 0) + (data.wrong || 0) + (data.blank || 0);
        }
      }
    }

    const subjectStats = Object.entries(subjectPerformance).map(([subject, data]) => ({
      subject,
      correct: data.correct,
      wrong: data.wrong,
      blank: data.blank,
      total: data.total,
      successRate: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    })).sort((a, b) => a.successRate - b.successRate); // Sort by lowest success rate first

    // ============ QUESTION STATS ============
    const [
      totalQuestions,
      publishedQuestions,
      draftQuestions,
    ] = await Promise.all([
      ctx.prisma.question.count(),
      ctx.prisma.question.count({ where: { status: 'PUBLISHED' } }),
      ctx.prisma.question.count({ where: { status: 'DRAFT' } }),
    ]);

    // ============ COLLABORATOR STATS ============
    const collaboratorStats = await ctx.prisma.collaborator.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, isActive: true } },
        groupMemberships: { include: { group: { select: { name: true } } } },
      },
    });

    const collaboratorActivity = await Promise.all(
      collaboratorStats.map(async (collab) => {
        const [questionsCreated, materialsCreated, simulationsCreated] = await Promise.all([
          ctx.prisma.question.count({ where: { createdById: collab.user.id } }),
          ctx.prisma.material.count({ where: { createdBy: collab.user.id } }),
          ctx.prisma.simulation.count({ where: { createdById: collab.user.id, creatorRole: { not: 'STUDENT' } } }),
        ]);
        return {
          id: collab.id,
          userId: collab.user.id,
          name: collab.user.name,
          email: collab.user.email,
          isActive: collab.user.isActive,
          groups: collab.groupMemberships.map(gm => gm.group.name),
          questionsCreated,
          materialsCreated,
          simulationsCreated,
          totalActivity: questionsCreated + materialsCreated + simulationsCreated,
        };
      })
    );

    // ============ STUDENT PERFORMANCE OVERVIEW ============
    const studentPerformance = await ctx.prisma.student.findMany({
      include: {
        user: { select: { name: true, email: true, isActive: true, createdAt: true } },
        simulationResults: {
          where: { completedAt: { not: null } },
          select: {
            percentageScore: true,
            correctAnswers: true,
            wrongAnswers: true,
            blankAnswers: true,
            completedAt: true,
          },
          orderBy: { completedAt: 'desc' },
          take: 10,
        },
        _count: { select: { simulationResults: true } },
      },
      take: 50,
    });

    // Sort by user createdAt manually
    const sortedStudentPerformance = studentPerformance.sort((a, b) => 
      b.user.createdAt.getTime() - a.user.createdAt.getTime()
    );

    const studentStats = sortedStudentPerformance.map((student) => {
      const results = student.simulationResults;
      const avgScore = results.length > 0 
        ? results.reduce((sum, r) => sum + r.percentageScore, 0) / results.length 
        : 0;
      const totalCorrect = results.reduce((sum, r) => sum + r.correctAnswers, 0);
      const totalWrong = results.reduce((sum, r) => sum + r.wrongAnswers, 0);
      const totalBlank = results.reduce((sum, r) => sum + r.blankAnswers, 0);
      
      return {
        id: student.id,
        matricola: student.matricola || 'N/A',
        name: student.user.name,
        email: student.user.email,
        isActive: student.user.isActive,
        totalSimulations: student._count.simulationResults,
        avgScore: Math.round(avgScore * 10) / 10,
        totalCorrect,
        totalWrong,
        totalBlank,
        lastActivity: results[0]?.completedAt || null,
      };
    }).sort((a, b) => b.avgScore - a.avgScore);

    // ============ ACTIVITY TRENDS ============
    const activityByMonth = await Promise.all(
      Array.from({ length: 6 }, async (_, i) => {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - 4 + i, 0);
        const [simulations, questions, materials] = await Promise.all([
          ctx.prisma.simulationResult.count({
            where: { completedAt: { gte: monthStart, lte: monthEnd } },
          }),
          ctx.prisma.question.count({
            where: { createdAt: { gte: monthStart, lte: monthEnd } },
          }),
          ctx.prisma.material.count({
            where: { createdAt: { gte: monthStart, lte: monthEnd } },
          }),
        ]);
        return {
          // Format: "Dic '25" - consistent with other charts
          month: `${monthStart.toLocaleDateString('it-IT', { month: 'short' }).charAt(0).toUpperCase()}${monthStart.toLocaleDateString('it-IT', { month: 'short' }).slice(1)} '${monthStart.getFullYear().toString().slice(-2)}`,
          simulations,
          questions,
          materials,
        };
      })
    );

    return {
      // Overview
      overview: {
        totalUsers,
        totalStudents,
        totalCollaborators,
        totalAdmins,
        activeUsers,
        newUsersThisMonth,
        newUsersLastMonth,
        userGrowthPercent: newUsersLastMonth > 0 
          ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100) 
          : newUsersThisMonth > 0 ? 100 : 0,
      },
      // Revenue
      revenue: {
        total: totalRevenue,
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        growthPercent: lastMonthRevenue > 0 
          ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) 
          : thisMonthRevenue > 0 ? 100 : 0,
        byMonth: revenueByMonth,
      },
      // Simulations
      simulations: {
        total: totalSimulations,
        totalResults,
        completedThisMonth: completedResultsThisMonth,
        avgScore: Math.round((avgScoreResult._avg.percentageScore || 0) * 10) / 10,
      },
      // Questions
      questions: {
        total: totalQuestions,
        published: publishedQuestions,
        draft: draftQuestions,
      },
      // Charts data
      charts: {
        userGrowth: userGrowthTrend,
        revenueByMonth,
        activityByMonth,
        subjectPerformance: subjectStats,
      },
      // Detailed lists
      collaborators: collaboratorActivity.sort((a, b) => b.totalActivity - a.totalActivity),
      students: studentStats,
    };
  }),
});
