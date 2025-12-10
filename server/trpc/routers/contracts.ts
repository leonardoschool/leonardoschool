// Contracts Router - Handles contract templates, assignments, and signatures
import { router, protectedProcedure, adminProcedure, studentProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { emailService } from '../../services/emailService';

export const contractsRouter = router({
  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get all contract templates
   */
  getTemplates: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.contractTemplate.findMany({
      where: { isActive: true },
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
   * Assign a contract to a student
   */
  assignContract: adminProcedure
    .input(
      z.object({
        studentId: z.string(),
        templateId: z.string(),
        expiresInDays: z.number().min(1).max(30).default(7),
        adminNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify student exists and has completed profile
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

      // Generate content snapshot with student data
      const contentSnapshot = generateContractContent(template.content, student, student.user);

      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

      // Token expiration (same as contract expiration)
      const signTokenExpiresAt = expiresAt;

      // Create contract
      const contract = await ctx.prisma.contract.create({
        data: {
          studentId: input.studentId,
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
          template: true,
        },
      });

      // Create admin notification
      await ctx.prisma.adminNotification.create({
        data: {
          type: 'CONTRACT_ASSIGNED',
          title: 'Contratto assegnato',
          message: `Contratto "${template.name}" assegnato a ${student.user.name}`,
          studentId: student.id,
          contractId: contract.id,
        },
      });

      // Send email to student with sign link
      const signLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.leonardoschool.it'}/contratto/${contract.signToken}`;
      await emailService.sendContractAssignedEmail({
        studentName: student.user.name,
        studentEmail: student.user.email,
        signLink,
        contractName: template.name,
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

      // Create notification
      await ctx.prisma.adminNotification.create({
        data: {
          type: 'ACCOUNT_ACTIVATED',
          title: 'Account attivato',
          message: `Account di ${student.user.name} è stato attivato`,
          studentId: student.id,
        },
      });

      // Send account activated email to student
      const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.leonardoschool.it'}/auth/login`;
      await emailService.sendAccountActivatedEmail({
        studentName: student.user.name,
        studentEmail: student.user.email,
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
   * Cancel a pending contract
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

      return ctx.prisma.contract.update({
        where: { id: input.contractId },
        data: { status: 'CANCELLED' },
      });
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
          where.user = { ...where.user, isActive: false };
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

      // Verify the logged-in user owns this contract
      if (contract.student.user.id !== ctx.user.id) {
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
   * Sign a contract
   */
  signContract: studentProcedure
    .input(
      z.object({
        contractId: z.string(),
        signatureData: z.string().min(100, 'Firma non valida'), // Base64 signature
      })
    )
    .mutation(async ({ ctx, input }) => {
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
          template: true,
          student: {
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

      if (contract.studentId !== student.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non sei autorizzato a firmare questo contratto',
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

      // Create admin notification
      await ctx.prisma.adminNotification.create({
        data: {
          type: 'CONTRACT_SIGNED',
          title: 'Contratto firmato',
          message: `${contract.student.user.name} ha firmato il contratto "${contract.template.name}"`,
          studentId: student.id,
          contractId: contract.id,
          isUrgent: true,
        },
      });

      // Send confirmation email to student
      await emailService.sendContractSignedConfirmationEmail({
        studentName: contract.student.user.name,
        studentEmail: contract.student.user.email,
        contractName: contract.template.name,
        signedAt,
        price: contract.template.price || 0,
      });

      // Send notification email to admin
      await emailService.sendContractSignedAdminNotification({
        studentName: contract.student.user.name,
        studentEmail: contract.student.user.email,
        contractName: contract.template.name,
        signedAt,
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

  const fullAddress = [
    student.address,
    student.city,
    student.province ? `(${student.province})` : '',
    student.postalCode,
  ]
    .filter(Boolean)
    .join(', ');

  return template
    .replace(/\{\{NOME_COMPLETO\}\}/g, user.name)
    .replace(/\{\{EMAIL\}\}/g, user.email)
    .replace(/\{\{CODICE_FISCALE\}\}/g, student.fiscalCode || '')
    .replace(/\{\{DATA_NASCITA\}\}/g, formattedBirthDate)
    .replace(/\{\{TELEFONO\}\}/g, student.phone || '')
    .replace(/\{\{INDIRIZZO_COMPLETO\}\}/g, fullAddress)
    .replace(/\{\{INDIRIZZO\}\}/g, student.address || '')
    .replace(/\{\{CITTA\}\}/g, student.city || '')
    .replace(/\{\{PROVINCIA\}\}/g, student.province || '')
    .replace(/\{\{CAP\}\}/g, student.postalCode || '')
    .replace(/\{\{DATA_ODIERNA\}\}/g, formattedDate)
    .replace(/\{\{ANNO\}\}/g, today.getFullYear().toString());
}
