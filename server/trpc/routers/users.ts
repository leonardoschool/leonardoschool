/* eslint-disable @typescript-eslint/no-explicit-any */
// Users Router - Handles user management for admin
// Note: 'any' types are used for Prisma dynamic queries and include patterns
// that cannot be strictly typed without significant complexity
import { router, adminProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { adminAuth } from '@/lib/firebase/admin';
import { Prisma } from '@prisma/client';

export const usersRouter = router({
  /**
   * Get all users with their roles and status
   */
  getAll: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        role: z.enum(['ALL', 'ADMIN', 'COLLABORATOR', 'STUDENT']).default('ALL'),
        status: z.enum(['ALL', 'ACTIVE', 'INACTIVE', 'PENDING_PROFILE', 'PENDING_CONTRACT', 'PENDING_SIGN', 'PENDING_ACTIVATION']).default('ALL'),
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
      }

      const [users, total] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          include: {
            student: {
              select: {
                id: true,
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
              },
            },
          } as any,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.user.count({ where }),
      ]);

      return {
        users,
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
          const newStudent = await tx.student.create({
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
});
