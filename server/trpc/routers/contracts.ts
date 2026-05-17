/* eslint-disable @typescript-eslint/no-explicit-any */
// Contracts Router - Handles contract templates, assignments, and signatures
// Note: 'any' types are used for Prisma dynamic queries and complex object mappings
import { router, protectedProcedure, adminProcedure, studentProcedure, collaboratorProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { revalidateTag } from 'next/cache';
import * as notificationService from '../../services/notificationService';
import { CACHE_TAGS } from '@/lib/cache/serverCache';
import { sanitizeText } from '@/lib/utils/escapeHtml';
import {
  getContractTarget,
  getActiveTemplate,
  prepareContractContent,
  generateContractContent,
  calculateContractExpiration,
  getSignerInfo,
  validateContractForSigning,
} from './contracts.helpers';

export const contractsRouter = router({
  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get all contract templates
   */
  getTemplates: adminProcedure
    .input(
      z.object({
        targetRole: z.enum(['STUDENT', 'COLLABORATOR']).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.contractTemplate.findMany({
        where: { 
          isActive: true,
          ...(input?.targetRole ? { targetRole: input.targetRole } : {}),
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
    }),

  /**
   * Create a new contract template
   */
  createTemplate: adminProcedure
    .input(
      z.object({
        name: z.string().min(3, 'Nome troppo corto'),
        description: z.string().optional(),
        content: z.string().min(50, 'Contenuto contratto troppo corto'),
        price: z.number().optional(),
        duration: z.string().optional(),
        targetRole: z.enum(['STUDENT', 'COLLABORATOR']).default('STUDENT'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const maxOrder = await ctx.prisma.contractTemplate.aggregate({
        where: { isActive: true },
        _max: { sortOrder: true },
      });
      const nextSortOrder = (maxOrder._max.sortOrder ?? 0) + 1000;

      return ctx.prisma.contractTemplate.create({
        data: {
          name: input.name,
          description: input.description,
          content: input.content,
          price: input.price,
          duration: input.duration,
          targetRole: input.targetRole,
          createdBy: ctx.user.id,
          sortOrder: nextSortOrder,
        },
      });
    }),

  /**
   * Update a contract template
   */
  updateTemplate: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(3).optional(),
        description: z.string().optional(),
        content: z.string().min(50).optional(),
        price: z.number().optional(),
        duration: z.string().optional(),
        targetRole: z.enum(['STUDENT', 'COLLABORATOR']).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.contractTemplate.update({
        where: { id },
        data,
      });
    }),

  /**
   * Duplicate a contract template (copy appears right after the original)
   */
  duplicateTemplate: adminProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch all active templates in current display order
      const allTemplates = await ctx.prisma.contractTemplate.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });

      const originalIndex = allTemplates.findIndex(t => t.id === input.id);
      if (originalIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template non trovato',
        });
      }

      const original = allTemplates[originalIndex];

      // Renormalize all sortOrders to integer multiples of 1000, then
      // insert the copy at originalIndex + 0.5 (i.e., between original and next)
      return ctx.prisma.$transaction(async (tx) => {
        for (let i = 0; i < allTemplates.length; i++) {
          await tx.contractTemplate.update({
            where: { id: allTemplates[i].id },
            data: { sortOrder: (i + 1) * 1000 },
          });
        }

        const copySortOrder = (originalIndex + 1) * 1000 + 500;

        return tx.contractTemplate.create({
          data: {
            name: `Copia di ${original.name}`,
            description: original.description,
            content: original.content,
            price: original.price,
            duration: original.duration,
            targetRole: original.targetRole,
            createdBy: ctx.user.id,
            sortOrder: copySortOrder,
          },
        });
      });
    }),

  /**
   * Delete a contract template (soft delete by setting isActive to false)
   */
  deleteTemplate: adminProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if template has any active contracts
      const contractsCount = await ctx.prisma.contract.count({
        where: {
          templateId: input.id,
          status: { in: ['PENDING', 'SIGNED'] },
        },
      });

      if (contractsCount > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Impossibile eliminare: ${contractsCount} contratti attivi utilizzano questo template`,
        });
      }

      // Soft delete by setting isActive to false
      return ctx.prisma.contractTemplate.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  /**
   * Get all students pending contract (profileCompleted = true, no active contract, not active)
   */
  getStudentsPendingContract: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.student.findMany({
      where: {
        user: {
          profileCompleted: true,
          isActive: false,
        },
        contracts: {
          none: {
            status: { in: ['PENDING', 'SIGNED'] },
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profileCompleted: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        user: { createdAt: 'desc' },
      },
    });
  }),

  /**
   * Get all students with pending contracts (waiting for signature)
   */
  getStudentsPendingSignature: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.contract.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }),

  /**
   * Get all signed contracts pending activation
   */
  getContractsPendingActivation: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.contract.findMany({
      where: {
        status: 'SIGNED',
        student: {
          user: {
            isActive: false,
          },
        },
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
              },
            },
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
      orderBy: { signedAt: 'desc' },
    });
  }),

  /**
   * Get contract preview with user data filled in
   */
  getContractPreview: adminProcedure
    .input(z.object({
      templateId: z.string(),
      studentId: z.string().optional(),
      collaboratorId: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      compensation: z.number().optional(),
    }).refine(
      (data) => data.studentId || data.collaboratorId,
      { message: 'Devi specificare studentId o collaboratorId' }
    ))
    .query(async ({ ctx, input }) => {
      const template = await ctx.prisma.contractTemplate.findUnique({
        where: { id: input.templateId },
      });

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template non trovato',
        });
      }

      let targetUser: any = null;

      if (input.studentId) {
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          include: { user: true },
        });
        if (!student) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Studente non trovato',
          });
        }
        targetUser = student;
      } else if (input.collaboratorId) {
        const collaborator = await ctx.prisma.collaborator.findUnique({
          where: { id: input.collaboratorId },
          include: { user: true },
        });
        if (!collaborator) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Collaboratore non trovato',
          });
        }
        targetUser = collaborator;
      }

      // Generate preview content
      const previewExtras = {
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        compensation: input.compensation ?? null,
      };
      const previewContent = generateContractContent(template.content, targetUser, targetUser.user, previewExtras);

      return {
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          price: template.price,
          duration: template.duration,
          content: template.content, // Original template content
        },
        previewContent, // Content with user data filled in
        user: {
          name: targetUser.user.name,
          email: targetUser.user.email,
          fiscalCode: targetUser.fiscalCode,
          phone: targetUser.phone,
          address: targetUser.address,
          city: targetUser.city,
          province: targetUser.province,
          postalCode: targetUser.postalCode,
          dateOfBirth: targetUser.dateOfBirth,
        },
      };
    }),

  /**
   * Assign a contract to a student
   */
  assignContract: adminProcedure
    .input(
      z.object({
        studentId: z.string().optional(),
        collaboratorId: z.string().optional(),
        templateId: z.string(),
        expiresInDays: z.number().min(1).max(30).default(7),
        adminNotes: z.string().optional(),
        customContent: z.string().optional(), // Admin can customize the contract content
        customPrice: z.number().optional(), // Admin can override the price
        canDownload: z.boolean().default(false), // If true, user can download the signed contract
        startDate: z.string().datetime().optional(), // For collaborator templates {{DATA_INIZIO}}
        endDate: z.string().datetime().optional(), // For collaborator templates {{DATA_FINE}}
        compensation: z.number().optional(), // For collaborator templates {{COMPENSO}}
      }).refine(
        (data) => data.studentId || data.collaboratorId,
        { message: 'Devi specificare studentId o collaboratorId' }
      )
    )
    .mutation(async ({ ctx, input }) => {
      // Get and validate target (student or collaborator)
      const { targetUser, targetType, targetId } = await getContractTarget(
        ctx.prisma,
        input.studentId,
        input.collaboratorId
      );

      // Get and validate template
      const template = await getActiveTemplate(ctx.prisma, input.templateId);

      // Prepare contract content
      const contentSnapshot = prepareContractContent(
        input.customContent,
        template.content,
        targetUser,
        {
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
          compensation: input.compensation ?? null,
        }
      );
      
      // Use custom price if provided, otherwise use template price
      // eslint-disable-next-line sonarjs/no-unused-vars -- price calculation reserved for future invoice feature
      const _finalPrice = input.customPrice ?? template.price;

      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

      // Token expiration (same as contract expiration)
      const signTokenExpiresAt = expiresAt;

      // Create contract - assign to either student or collaborator
      const contract = await ctx.prisma.contract.create({
        data: {
          ...(targetType === 'STUDENT' ? { studentId: targetId } : { collaboratorId: targetId }),
          templateId: input.templateId,
          contentSnapshot,
          expiresAt,
          signTokenExpiresAt,
          adminNotes: input.adminNotes,
          assignedBy: ctx.user.id,
          canDownload: input.canDownload,
        },
        include: {
          student: {
            include: { user: true },
          },
          collaborator: {
            include: { user: true },
          },
          template: true,
        },
      });

      // Send notifications using the unified notification service
      // Use relative URL for in-app navigation, full URL for emails
      const signLinkRelative = `/contratto/${contract.signToken}`;
      const signLinkAbsolute = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.leonardoschool.it'}/contratto/${contract.signToken}`;
      
      await notificationService.notifyContractAssigned(ctx.prisma, {
        contractId: contract.id,
        templateName: template.name,
        recipientUserId: targetUser.user.id,
        recipientName: targetUser.user.name,
        recipientEmail: targetUser.user.email,
        recipientType: targetType,
        recipientProfileId: targetId,
        signLink: signLinkRelative,
        signLinkAbsolute: signLinkAbsolute,
        price: template.price || 0,
        expiresAt,
      });

      return contract;
    }),

  /**
   * Activate a student account
   */
  activateStudent: adminProcedure
    .input(
      z.object({
        studentId: z.string(),
        skipContractCheck: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const student = await ctx.prisma.student.findUnique({
        where: { id: input.studentId },
        include: {
          user: true,
          contracts: {
            where: { status: 'SIGNED' },
            orderBy: { signedAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!student) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Studente non trovato',
        });
      }

      if (!student.user.profileCompleted) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Lo studente non ha ancora completato il profilo',
        });
      }

      if (!input.skipContractCheck && student.contracts.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Lo studente non ha firmato il contratto. Usa skipContractCheck per attivare comunque.',
        });
      }

      // Activate user
      const updatedUser = await ctx.prisma.user.update({
        where: { id: student.user.id },
        data: { isActive: true },
      });
      revalidateTag(CACHE_TAGS.USERS, {});
      revalidateTag(CACHE_TAGS.STATS, {});

      // Send notifications using the unified notification service
      const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.leonardoschool.it'}/auth/login`;
      await notificationService.notifyAccountActivated(ctx.prisma, {
        userId: student.user.id,
        userName: student.user.name,
        userEmail: student.user.email,
        profileId: student.id,
        loginUrl,
      });

      return { success: true, user: updatedUser };
    }),

  /**
   * Deactivate a student account
   */
  deactivateStudent: adminProcedure
    .input(z.object({ studentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const student = await ctx.prisma.student.findUnique({
        where: { id: input.studentId },
        include: { user: true },
      });

      if (!student) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Studente non trovato',
        });
      }

      const updatedUser = await ctx.prisma.user.update({
        where: { id: student.user.id },
        data: { isActive: false },
      });
      revalidateTag(CACHE_TAGS.USERS, {});
      revalidateTag(CACHE_TAGS.STATS, {});

      return { success: true, user: updatedUser };
    }),

  /**
   * Cancel a pending contract (deletes it from DB to save space)
   */
  cancelContract: adminProcedure
    .input(z.object({ contractId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const contract = await ctx.prisma.contract.findUnique({
        where: { id: input.contractId },
      });

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contratto non trovato',
        });
      }

      if (contract.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Solo i contratti in attesa possono essere annullati',
        });
      }

      // Delete the contract from DB to save space
      await ctx.prisma.contract.delete({
        where: { id: input.contractId },
      });

      return { success: true, message: 'Contratto eliminato' };
    }),

  /**
   * Get all admin notifications
   */
  getAdminNotifications: adminProcedure
    .input(
      z.object({
        unreadOnly: z.boolean().default(false),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const notifications = await ctx.prisma.adminNotification.findMany({
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });

      // Filter unread for this admin if requested
      if (input.unreadOnly) {
        return notifications.filter(n => {
          const readBy = n.readBy as Record<string, string>;
          return !readBy[ctx.user.id];
        });
      }

      return notifications;
    }),

  /**
   * Mark notification as read
   */
  markNotificationRead: adminProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.prisma.adminNotification.findUnique({
        where: { id: input.notificationId },
      });

      if (!notification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notifica non trovata',
        });
      }

      const readBy = (notification.readBy as Record<string, string>) || {};
      readBy[ctx.user.id] = new Date().toISOString();

      return ctx.prisma.adminNotification.update({
        where: { id: input.notificationId },
        data: { readBy },
      });
    }),

  /**
   * Delete a single notification from DB
   */
  deleteNotification: adminProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.prisma.adminNotification.findUnique({
        where: { id: input.notificationId },
      });

      if (!notification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notifica non trovata',
        });
      }

      await ctx.prisma.adminNotification.delete({
        where: { id: input.notificationId },
      });

      return { success: true, message: 'Notifica eliminata' };
    }),

  /**
   * Delete all notifications from DB
   */
  deleteAllNotifications: adminProcedure
    .mutation(async ({ ctx }) => {
      const result = await ctx.prisma.adminNotification.deleteMany({});

      return { 
        success: true, 
        message: `${result.count} notifiche eliminate`,
        count: result.count,
      };
    }),

  /**
   * Get students statistics for admin dashboard
   */
  getStudentsStats: adminProcedure.query(async ({ ctx }) => {
    const [
      total,
      active,
      pendingProfile,
      pendingContract,
      pendingSignature,
      pendingActivation,
    ] = await Promise.all([
      // Total students
      ctx.prisma.student.count(),
      // Active students
      ctx.prisma.student.count({
        where: { user: { isActive: true } },
      }),
      // Pending profile (not completed)
      ctx.prisma.student.count({
        where: { user: { profileCompleted: false } },
      }),
      // Pending contract (profile complete, no contract)
      ctx.prisma.student.count({
        where: {
          user: { profileCompleted: true, isActive: false },
          contracts: { none: { status: { in: ['PENDING', 'SIGNED'] } } },
        },
      }),
      // Pending signature (contract assigned but not signed)
      ctx.prisma.student.count({
        where: {
          contracts: { some: { status: 'PENDING' } },
        },
      }),
      // Pending activation (contract signed but not active)
      ctx.prisma.student.count({
        where: {
          user: { isActive: false },
          contracts: { some: { status: 'SIGNED' } },
        },
      }),
    ]);

    return {
      total,
      active,
      pendingProfile,
      pendingContract,
      pendingSignature,
      pendingActivation,
      inactive: total - active,
    };
  }),

  /**
   * Get all students for admin management
   */
  getAllStudents: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.enum(['all', 'active', 'inactive', 'pending_profile', 'pending_contract', 'pending_activation']).default('all'),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      
      // Search filter
      if (input.search) {
        where.OR = [
          { user: { name: { contains: input.search, mode: 'insensitive' } } },
          { user: { email: { contains: input.search, mode: 'insensitive' } } },
          { fiscalCode: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      // Status filter
      switch (input.status) {
        case 'active':
          where.user = { ...where.user, isActive: true };
          break;
        case 'inactive':
          where.user = { ...where.user, isActive: false, profileCompleted: true };
          break;
        case 'pending_profile':
          where.user = { ...where.user, profileCompleted: false };
          break;
        case 'pending_contract':
          where.user = { ...where.user, profileCompleted: true, isActive: false };
          where.contracts = { none: { status: { in: ['PENDING', 'SIGNED'] } } };
          break;
        case 'pending_activation':
          where.user = { ...where.user, isActive: false, profileCompleted: true };
          where.contracts = { some: { status: 'SIGNED' } };
          break;
      }

      const [students, total] = await Promise.all([
        ctx.prisma.student.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profileCompleted: true,
                isActive: true,
                createdAt: true,
                lastLoginAt: true,
              },
            },
            contracts: {
              orderBy: { assignedAt: 'desc' },
              take: 1,
              include: {
                template: {
                  select: { name: true },
                },
              },
            },
          },
          orderBy: { user: { createdAt: 'desc' } },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        ctx.prisma.student.count({ where }),
      ]);

      return {
        students,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    }),

  /**
   * Revoke/Cancel a pending contract
   */
  revokeContract: adminProcedure
    .input(z.object({
      contractId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const contract = await ctx.prisma.contract.findUnique({
        where: { id: input.contractId },
        include: {
          student: { include: { user: true } },
          collaborator: { include: { user: true } },
          template: true,
        },
      });

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contratto non trovato',
        });
      }

      if (contract.status === 'SIGNED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Non è possibile revocare un contratto già firmato',
        });
      }

      // Get user info for notification before deleting
      const userName = contract.student?.user?.name || contract.collaborator?.user?.name || 'Utente';
      const userUserId = contract.student?.user?.id || contract.collaborator?.user?.id;
      const templateName = contract.template.name;
      const studentId = contract.studentId;
      const collaboratorId = contract.collaboratorId;

      // Delete the contract from DB to save space
      await ctx.prisma.contract.delete({
        where: { id: input.contractId },
      });

      // Determine recipient type
      const getRecipientType = (): 'STUDENT' | 'COLLABORATOR' | undefined => {
        if (studentId) return 'STUDENT';
        if (collaboratorId) return 'COLLABORATOR';
        return undefined;
      };

      // Send notifications using the unified notification service
      await notificationService.notifyContractCancelled(ctx.prisma, {
        contractId: input.contractId,
        templateName,
        recipientUserId: userUserId,
        recipientName: userName,
        recipientProfileId: studentId || collaboratorId || undefined,
        recipientType: getRecipientType(),
      });

      return { success: true, message: 'Contratto revocato ed eliminato' };
    }),

  /**
   * Toggle contract download permission
   */
  toggleContractDownload: adminProcedure
    .input(z.object({
      contractId: z.string(),
      canDownload: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const contract = await ctx.prisma.contract.findUnique({
        where: { id: input.contractId },
      });

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contratto non trovato',
        });
      }

      await ctx.prisma.contract.update({
        where: { id: input.contractId },
        data: { canDownload: input.canDownload },
      });

      return { 
        success: true, 
        message: input.canDownload 
          ? 'Download contratto abilitato' 
          : 'Download contratto disabilitato',
        canDownload: input.canDownload,
      };
    }),

  /**
   * Revoke a signed contract (keeps history, allows reassignment)
   */
  revokeSignedContract: adminProcedure
    .input(z.object({
      contractId: z.string(),
      revokeNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const contract = await ctx.prisma.contract.findUnique({
        where: { id: input.contractId },
        include: {
          student: { include: { user: true } },
          collaborator: { include: { user: true } },
          template: true,
        },
      });

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contratto non trovato',
        });
      }

      if (contract.status !== 'SIGNED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Solo i contratti firmati possono essere revocati. Usa "Annulla" per i contratti in attesa.',
        });
      }

      // Update contract status to REVOKED
      await ctx.prisma.contract.update({
        where: { id: input.contractId },
        data: { 
          status: 'REVOKED',
          revokedAt: new Date(),
          revokedBy: ctx.user.id,
          revokeNotes: input.revokeNotes ? sanitizeText(input.revokeNotes) : null,
          canDownload: false, // Disable download on revocation
        },
      });

      // Get user info for return message
      const userName = contract.student?.user?.name || contract.collaborator?.user?.name || 'Utente';

      return { 
        success: true, 
        message: `Contratto di ${userName} revocato. Ora puoi assegnarne uno nuovo.` 
      };
    }),

  // ==================== STUDENT ENDPOINTS ====================

  /**
   * Get current student's contract (if any)
   */
  getMyContract: studentProcedure.query(async ({ ctx }) => {
    const student = await ctx.prisma.student.findUnique({
      where: { userId: ctx.user.id },
    });

    if (!student) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Profilo studente non trovato',
      });
    }

    return ctx.prisma.contract.findFirst({
      where: {
        studentId: student.id,
        status: { in: ['PENDING', 'SIGNED'] },
      },
      include: {
        template: {
          select: {
            name: true,
            description: true,
            price: true,
            duration: true,
          },
        },
        student: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }),

  // ==================== COLLABORATOR ENDPOINTS ====================

  /**
   * Get current collaborator's contract (if any)
   */
  getMyCollaboratorContract: collaboratorProcedure.query(async ({ ctx }) => {
    const collaborator = await ctx.prisma.collaborator.findUnique({
      where: { userId: ctx.user.id },
    });

    if (!collaborator) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Profilo collaboratore non trovato',
      });
    }

    return ctx.prisma.contract.findFirst({
      where: {
        collaboratorId: collaborator.id,
        status: { in: ['PENDING', 'SIGNED'] },
      },
      include: {
        template: {
          select: {
            name: true,
            description: true,
            price: true,
            duration: true,
          },
        },
        collaborator: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }),

  /**
   * Get contract by sign token (for email link)
   */
  getContractByToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const contract = await ctx.prisma.contract.findUnique({
        where: { signToken: input.token },
        include: {
          student: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          collaborator: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          template: {
            select: {
              name: true,
              description: true,
              price: true,
              duration: true,
            },
          },
        },
      });

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contratto non trovato',
        });
      }

      // Verify the logged-in user owns this contract (student or collaborator)
      const contractUserId = contract.student?.user.id || contract.collaborator?.user.id;
      if (contractUserId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non sei autorizzato a vedere questo contratto',
        });
      }

      // Check if token expired
      if (contract.signTokenExpiresAt && contract.signTokenExpiresAt < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Il link per la firma è scaduto. Contatta l\'amministrazione.',
        });
      }

      // Check if already signed
      if (contract.status === 'SIGNED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Il contratto è già stato firmato',
        });
      }

      return contract;
    }),

  /**
   * Get signed contract details (for student to view/download)
   */
  getSignedContract: studentProcedure
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      const student = await ctx.prisma.student.findUnique({
        where: { userId: ctx.user.id },
      });

      if (!student) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profilo studente non trovato',
        });
      }

      const contract = await ctx.prisma.contract.findUnique({
        where: { id: input.contractId },
        include: {
          template: {
            select: {
              name: true,
              description: true,
              price: true,
              duration: true,
            },
          },
          student: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contratto non trovato',
        });
      }

      if (contract.studentId !== student.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non sei autorizzato a vedere questo contratto',
        });
      }

      return contract;
    }),

  /**
   * Get signed contract details for admin
   */
  getSignedContractAdmin: adminProcedure
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      const contract = await ctx.prisma.contract.findUnique({
        where: { id: input.contractId },
        include: {
          template: {
            select: {
              name: true,
              description: true,
              price: true,
              duration: true,
            },
          },
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contratto non trovato',
        });
      }

      return contract;
    }),

  /**
   * Sign a contract (works for both students and collaborators)
   */
  signContract: protectedProcedure
    .input(
      z.object({
        contractId: z.string(),
        signatureData: z.string().min(100, 'Firma non valida'), // Base64 signature
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find the contract first
      const contract = await ctx.prisma.contract.findUnique({
        where: { id: input.contractId },
        include: {
          template: true,
          student: {
            include: { user: true },
          },
          collaborator: {
            include: { user: true },
          },
        },
      });

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contratto non trovato',
        });
      }

      // Get signer info and verify authorization
      const { signerName, signerEmail, signerId, signerType } = await getSignerInfo(
        ctx.prisma,
        ctx.user.id,
        contract
      );

      // Validate contract status
      await validateContractForSigning(ctx.prisma, contract);

      const signedAt = new Date();

      // Calculate contract expiration date based on template duration
      const contractExpiresAt = calculateContractExpiration(contract.template.duration);

      // Sign the contract
      const signedContract = await ctx.prisma.contract.update({
        where: { id: input.contractId },
        data: {
          status: 'SIGNED',
          signedAt,
          signatureData: input.signatureData,
          contractExpiresAt,
        },
      });

      // Automatically activate the user account after signing the contract
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { isActive: true },
      });
      revalidateTag(CACHE_TAGS.USERS, {});
      revalidateTag(CACHE_TAGS.STATS, {});

      // Send notifications using the unified notification service
      await notificationService.notifyContractSigned(ctx.prisma, {
        contractId: contract.id,
        templateName: contract.template.name,
        signerUserId: ctx.user.id,
        signerName: signerName,
        signerEmail: signerEmail,
        signerType: signerType,
        signerProfileId: signerId,
        signedAt,
        price: contract.template.price || 0,
      });

      return signedContract;
    }),
});
