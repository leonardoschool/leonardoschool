/* eslint-disable @typescript-eslint/no-explicit-any */
// Contracts Router - Handles contract templates, assignments, and signatures
// Note: 'any' types are used for Prisma dynamic queries and complex object mappings
import { router, protectedProcedure, adminProcedure, studentProcedure, collaboratorProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import * as notificationService from '../../services/notificationService';
import { sanitizeText } from '@/lib/utils/escapeHtml';
import { sanitizeHtml, validateContentLength } from '@/lib/utils/sanitizeHtml';

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
        orderBy: { name: 'asc' },
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
      return ctx.prisma.contractTemplate.create({
        data: {
          name: input.name,
          description: input.description,
          content: input.content,
          price: input.price,
          duration: input.duration,
          targetRole: input.targetRole,
          createdBy: ctx.user.id,
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
      const previewContent = generateContractContent(template.content, targetUser, targetUser.user);

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
      }).refine(
        (data) => data.studentId || data.collaboratorId,
        { message: 'Devi specificare studentId o collaboratorId' }
      )
    )
    .mutation(async ({ ctx, input }) => {
      let targetUser: any = null;
      let targetType: 'STUDENT' | 'COLLABORATOR' = 'STUDENT';
      let targetId: string = '';

      // Check if assigning to student or collaborator
      if (input.studentId) {
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          include: {
            user: true,
            contracts: {
              where: { status: { in: ['PENDING', 'SIGNED'] } },
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

        if (student.contracts.length > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Lo studente ha già un contratto attivo o in attesa',
          });
        }

        targetUser = student;
        targetType = 'STUDENT';
        targetId = input.studentId;
      } else if (input.collaboratorId) {
        const collaborator = await ctx.prisma.collaborator.findUnique({
          where: { id: input.collaboratorId },
          include: {
            user: true,
            contracts: {
              where: { status: { in: ['PENDING', 'SIGNED'] } },
            },
          },
        });

        if (!collaborator) {
          // Try to find by userId to give more helpful error
          const byUserId = await ctx.prisma.collaborator.findUnique({
            where: { userId: input.collaboratorId },
          });
          
          if (byUserId) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `ID errato: hai passato l'userId, usa collaboratorId: "${byUserId.id}"`,
            });
          }
          
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Collaboratore con ID "${input.collaboratorId}" non trovato. Verifica che il record esista nella tabella collaborators.`,
          });
        }

        if (!collaborator.user.profileCompleted) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Il collaboratore non ha ancora completato il profilo',
          });
        }

        if (collaborator.contracts.length > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Il collaboratore ha già un contratto attivo o in attesa',
          });
        }

        targetUser = collaborator;
        targetType = 'COLLABORATOR';
        targetId = input.collaboratorId;
      }

      // Get template
      const template = await ctx.prisma.contractTemplate.findUnique({
        where: { id: input.templateId },
      });

      if (!template || !template.isActive) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template contratto non trovato o non attivo',
        });
      }

      // Generate content snapshot with user data
      // Use custom content if provided, otherwise generate from template
      // SECURITY: Sanitize custom content to prevent XSS attacks
      let contentSnapshot: string;
      if (input.customContent) {
        // Validate content length to prevent DoS
        const lengthValidation = validateContentLength(input.customContent);
        if (!lengthValidation.valid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: lengthValidation.message || 'Contenuto troppo lungo',
          });
        }
        // Sanitize HTML to remove dangerous elements
        contentSnapshot = sanitizeHtml(input.customContent);
      } else {
        contentSnapshot = generateContractContent(template.content, targetUser, targetUser.user);
      }
      
      // Use custom price if provided, otherwise use template price
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
      const signLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.leonardoschool.it'}/contratto/${contract.signToken}`;
      await notificationService.notifyContractAssigned(ctx.prisma, {
        contractId: contract.id,
        templateName: template.name,
        recipientUserId: targetUser.user.id,
        recipientName: targetUser.user.name,
        recipientEmail: targetUser.user.email,
        recipientType: targetType,
        recipientProfileId: targetId,
        signLink,
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

      // Send notifications using the unified notification service
      const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.leonardoschool.it'}/auth/login`;
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

      // Send notifications using the unified notification service
      await notificationService.notifyContractCancelled(ctx.prisma, {
        contractId: input.contractId,
        templateName,
        recipientUserId: userUserId,
        recipientName: userName,
        recipientProfileId: studentId || collaboratorId || undefined,
        recipientType: studentId ? 'STUDENT' : collaboratorId ? 'COLLABORATOR' : undefined,
      });

      return { success: true, message: 'Contratto revocato ed eliminato' };
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

      // Determine if this is a student or collaborator contract
      const isStudentContract = !!contract.studentId;
      const isCollaboratorContract = !!contract.collaboratorId;

      // Verify authorization
      let signerName: string;
      let signerEmail: string;
      let signerId: string;

      if (isStudentContract) {
        const student = await ctx.prisma.student.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!student || contract.studentId !== student.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Non sei autorizzato a firmare questo contratto',
          });
        }

        signerName = contract.student!.user.name;
        signerEmail = contract.student!.user.email;
        signerId = student.id;
      } else if (isCollaboratorContract) {
        const collaborator = await ctx.prisma.collaborator.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!collaborator || contract.collaboratorId !== collaborator.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Non sei autorizzato a firmare questo contratto',
          });
        }

        signerName = contract.collaborator!.user.name;
        signerEmail = contract.collaborator!.user.email;
        signerId = collaborator.id;
      } else {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Contratto non valido: nessun destinatario associato',
        });
      }

      if (contract.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Il contratto non è in stato di attesa firma',
        });
      }

      if (contract.expiresAt && contract.expiresAt < new Date()) {
        // Mark as expired
        await ctx.prisma.contract.update({
          where: { id: contract.id },
          data: { status: 'EXPIRED' },
        });

        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Il contratto è scaduto. Contatta l\'amministrazione.',
        });
      }

      const signedAt = new Date();

      // Sign the contract
      const signedContract = await ctx.prisma.contract.update({
        where: { id: input.contractId },
        data: {
          status: 'SIGNED',
          signedAt,
          signatureData: input.signatureData,
          // Note: IP and User-Agent should be captured from request headers in production
        },
      });

      // Send notifications using the unified notification service
      await notificationService.notifyContractSigned(ctx.prisma, {
        contractId: contract.id,
        templateName: contract.template.name,
        signerUserId: ctx.user.id,
        signerName: signerName,
        signerEmail: signerEmail,
        signerType: isStudentContract ? 'STUDENT' : 'COLLABORATOR',
        signerProfileId: signerId,
        signedAt,
        price: contract.template.price || 0,
      });

      return signedContract;
    }),
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate contract content with student data filled in
 */
function generateContractContent(
  template: string,
  student: {
    fiscalCode: string | null;
    dateOfBirth: Date | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
  },
  user: {
    name: string;
    email: string;
  }
): string {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const formattedBirthDate = student.dateOfBirth
    ? student.dateOfBirth.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

  const sanitizedAddressParts = [
    sanitizeText(student.address),
    sanitizeText(student.city),
    student.province ? `(${sanitizeText(student.province)})` : '',
    sanitizeText(student.postalCode),
  ].filter(Boolean);

  const fullAddress = sanitizedAddressParts.join(', ');

  return template
    .replace(/\{\{NOME_COMPLETO\}\}/g, sanitizeText(user.name))
    .replace(/\{\{EMAIL\}\}/g, sanitizeText(user.email))
    .replace(/\{\{CODICE_FISCALE\}\}/g, sanitizeText(student.fiscalCode))
    .replace(/\{\{DATA_NASCITA\}\}/g, sanitizeText(formattedBirthDate))
    .replace(/\{\{TELEFONO\}\}/g, sanitizeText(student.phone))
    .replace(/\{\{INDIRIZZO_COMPLETO\}\}/g, fullAddress)
    .replace(/\{\{INDIRIZZO\}\}/g, sanitizeText(student.address))
    .replace(/\{\{CITTA\}\}/g, sanitizeText(student.city))
    .replace(/\{\{PROVINCIA\}\}/g, sanitizeText(student.province))
    .replace(/\{\{CAP\}\}/g, sanitizeText(student.postalCode))
    .replace(/\{\{DATA_ODIERNA\}\}/g, sanitizeText(formattedDate))
    .replace(/\{\{ANNO\}\}/g, today.getFullYear().toString());
}
