import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { adminProcedure, protectedProcedure, router, staffProcedure } from '../init';
import { notifications } from '@/lib/notifications';

// Group Types
const GroupTypeEnum = z.enum(['STUDENTS', 'COLLABORATORS', 'MIXED']);

// ==================== GROUPS ROUTER ====================
export const groupsRouter = router({
  // Get paginated groups list
  getGroups: staffProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        type: GroupTypeEnum.optional(),
        search: z.string().optional(),
        includeInactive: z.boolean().optional().default(false),
        onlyMyGroups: z.boolean().optional().default(false), // For collaborators: only groups they're assigned to
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, type, search, includeInactive, onlyMyGroups } = input;

      const where: Record<string, unknown> = {};
      if (type) where.type = type;
      if (!includeInactive) where.isActive = true;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }
      
      // For collaborators: filter by groups they're assigned to
      if (onlyMyGroups && ctx.user?.role === 'COLLABORATOR' && ctx.user?.collaborator?.id) {
        where.referenceCollaboratorId = ctx.user.collaborator.id;
      }

      const total = await ctx.prisma.group.count({ where });

      const groups = await ctx.prisma.group.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: { members: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return {
        groups: groups.map((g) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          color: g.color,
          type: g.type,
          isActive: g.isActive,
          memberCount: g._count.members,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Get all groups with member counts
  getAll: staffProcedure
    .input(
      z.object({
        type: GroupTypeEnum.optional(),
        search: z.string().optional(),
        includeInactive: z.boolean().optional().default(false),
        referenceCollaboratorId: z.string().optional(), // Filtro per collaboratore di riferimento
        referenceAdminId: z.string().optional(), // Filtro per admin di riferimento
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const groups = await ctx.prisma.group.findMany({
        where: {
          ...(input?.type && { type: input.type }),
          ...(input?.search && {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { description: { contains: input.search, mode: 'insensitive' } },
            ],
          }),
          ...(!input?.includeInactive && { isActive: true }),
          ...(input?.referenceCollaboratorId && { referenceCollaboratorId: input.referenceCollaboratorId }),
          ...(input?.referenceAdminId && { referenceAdminId: input.referenceAdminId }),
        },
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
          referenceAdmin: {
            include: {
              user: { select: { name: true, email: true } },
            },
          },
          _count: {
            select: { members: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return groups.map((group) => ({
        ...group,
        memberCount: group._count.members,
      }));
    }),

  // Get a single group with full member details
  getById: staffProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const group = await ctx.prisma.group.findUnique({
        where: { id: input.id },
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
          referenceAdmin: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          members: {
            include: {
              student: {
                select: {
                  id: true,
                  matricola: true,
                  user: { select: { id: true, name: true, email: true } },
                },
              },
              collaborator: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
            orderBy: { joinedAt: 'asc' },
          },
        },
      });

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Gruppo non trovato',
        });
      }

      return group;
    }),

  // Get public group info (accessible by all authenticated users)
  // Returns limited info suitable for displaying in modals/cards
  getPublicInfo: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const group = await ctx.prisma.group.findUnique({
        where: { id: input.id },
        include: {
          referenceStudent: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
          referenceCollaborator: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
          referenceAdmin: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
          members: {
            include: {
              student: {
                include: {
                  user: { select: { id: true, name: true } },
                },
              },
              collaborator: {
                include: {
                  user: { select: { id: true, name: true } },
                },
              },
            },
            orderBy: { joinedAt: 'asc' },
          },
        },
      });

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Gruppo non trovato',
        });
      }

      return group;
    }),

  // Create a new group
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(2, 'Nome troppo corto').max(100),
        description: z.string().max(500).nullish(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullish(),
        type: GroupTypeEnum.default('MIXED'),
        referenceStudentId: z.string().nullish(),
        referenceCollaboratorId: z.string().nullish(), // Can be "admin:ID" or collaborator ID
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate references exist
      if (input.referenceStudentId) {
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.referenceStudentId },
        });
        if (!student) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Studente di riferimento non trovato',
          });
        }
      }

      // Parse referenceCollaboratorId - can be "admin:ID" or collaborator ID
      let referenceCollaboratorId: string | null = null;
      let referenceAdminId: string | null = null;

      if (input.referenceCollaboratorId) {
        if (input.referenceCollaboratorId.startsWith('admin:')) {
          // It's an admin reference
          referenceAdminId = input.referenceCollaboratorId.replace('admin:', '');
          const admin = await ctx.prisma.admin.findUnique({
            where: { id: referenceAdminId },
          });
          if (!admin) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Admin di riferimento non trovato',
            });
          }
        } else {
          // It's a collaborator reference
          referenceCollaboratorId = input.referenceCollaboratorId;
          const collaborator = await ctx.prisma.collaborator.findUnique({
            where: { id: referenceCollaboratorId },
          });
          if (!collaborator) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Collaboratore di riferimento non trovato',
            });
          }
        }
      }

      const group = await ctx.prisma.group.create({
        data: {
          name: input.name,
          description: input.description,
          color: input.color,
          type: input.type,
          isActive: true, // Set active by default
          referenceStudentId: input.referenceStudentId,
          referenceCollaboratorId,
          referenceAdminId,
        },
        include: {
          referenceStudent: {
            include: { user: { select: { name: true } } },
          },
          referenceCollaborator: {
            include: { user: { select: { name: true } } },
          },
          referenceAdmin: {
            include: { user: { select: { name: true } } },
          },
        },
      });

      return group;
    }),

  // Update a group
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).max(100).optional(),
        description: z.string().max(500).nullable().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
        type: GroupTypeEnum.optional(),
        isActive: z.boolean().optional(),
        referenceStudentId: z.string().nullable().optional(),
        referenceCollaboratorId: z.string().nullable().optional(), // Can be "admin:ID" or collaborator ID
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, referenceCollaboratorId: rawCollaboratorId, ...data } = input;

      // Check group exists
      const existing = await ctx.prisma.group.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Gruppo non trovato',
        });
      }

      // Validate references if provided
      if (data.referenceStudentId) {
        const student = await ctx.prisma.student.findUnique({
          where: { id: data.referenceStudentId },
        });
        if (!student) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Studente di riferimento non trovato',
          });
        }
      }

      // Parse referenceCollaboratorId - can be "admin:ID" or collaborator ID
      let referenceCollaboratorId: string | null | undefined = undefined;
      let referenceAdminId: string | null | undefined = undefined;

      if (rawCollaboratorId !== undefined) {
        if (rawCollaboratorId === null || rawCollaboratorId === '') {
          // Clear both references
          referenceCollaboratorId = null;
          referenceAdminId = null;
        } else if (rawCollaboratorId.startsWith('admin:')) {
          // It's an admin reference
          referenceAdminId = rawCollaboratorId.replace('admin:', '');
          referenceCollaboratorId = null; // Clear collaborator if setting admin
          const admin = await ctx.prisma.admin.findUnique({
            where: { id: referenceAdminId },
          });
          if (!admin) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Admin di riferimento non trovato',
            });
          }
        } else {
          // It's a collaborator reference
          referenceCollaboratorId = rawCollaboratorId;
          referenceAdminId = null; // Clear admin if setting collaborator
          const collaborator = await ctx.prisma.collaborator.findUnique({
            where: { id: referenceCollaboratorId },
          });
          if (!collaborator) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Collaboratore di riferimento non trovato',
            });
          }
        }
      }

      const group = await ctx.prisma.group.update({
        where: { id },
        data: {
          ...data,
          ...(referenceCollaboratorId !== undefined && { referenceCollaboratorId }),
          ...(referenceAdminId !== undefined && { referenceAdminId }),
        },
        include: {
          referenceStudent: {
            include: { user: { select: { id: true, name: true } } },
          },
          referenceCollaborator: {
            include: { user: { select: { id: true, name: true } } },
          },
          referenceAdmin: {
            include: { user: { select: { id: true, name: true } } },
          },
          _count: { select: { members: true } },
        },
      });

      // Send notifications to newly assigned referents
      // Only if the referent changed (compare with existing)
      if (referenceCollaboratorId && referenceCollaboratorId !== existing.referenceCollaboratorId) {
        const collaboratorUserId = group.referenceCollaborator?.user.id;
        if (collaboratorUserId) {
          try {
            await notifications.groupReferentAssigned(ctx.prisma, {
              recipientUserId: collaboratorUserId,
              groupId: group.id,
              groupName: group.name,
            });
          } catch (error) {
            console.error('[Groups] Failed to send referent notification:', error);
          }
        }
      }

      if (referenceAdminId && referenceAdminId !== existing.referenceAdminId) {
        const adminUserId = group.referenceAdmin?.user.id;
        if (adminUserId) {
          try {
            await notifications.groupReferentAssigned(ctx.prisma, {
              recipientUserId: adminUserId,
              groupId: group.id,
              groupName: group.name,
            });
          } catch (error) {
            console.error('[Groups] Failed to send referent notification:', error);
          }
        }
      }

      if (data.referenceStudentId && data.referenceStudentId !== existing.referenceStudentId) {
        const studentUserId = group.referenceStudent?.user.id;
        if (studentUserId) {
          try {
            await notifications.groupReferentAssigned(ctx.prisma, {
              recipientUserId: studentUserId,
              groupId: group.id,
              groupName: group.name,
            });
          } catch (error) {
            console.error('[Groups] Failed to send referent notification:', error);
          }
        }
      }

      return group;
    }),

  // Delete a group (hard delete - removes group and all members)
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.prisma.group.findUnique({
        where: { id: input.id },
      });

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Gruppo non trovato',
        });
      }

      // Hard delete - remove all members first, then group
      await ctx.prisma.$transaction([
        ctx.prisma.groupMember.deleteMany({ where: { groupId: input.id } }),
        ctx.prisma.group.delete({ where: { id: input.id } }),
      ]);
      
      return { deleted: true };
    }),

  // ==================== MEMBER MANAGEMENT ====================

  // Add a member to a group (Admin or Referent Collaborator)
  addMember: staffProcedure
    .input(
      z.object({
        groupId: z.string(),
        studentId: z.string().optional(),
        collaboratorId: z.string().optional(),
      }).refine(
        (data) => (data.studentId && !data.collaboratorId) || (!data.studentId && data.collaboratorId),
        { message: 'Specificare esattamente uno tra studentId e collaboratorId' }
      )
    )
    .mutation(async ({ ctx, input }) => {
      // Check group exists and is active
      const group = await ctx.prisma.group.findUnique({
        where: { id: input.groupId },
      });

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Gruppo non trovato',
        });
      }

      // If collaborator, check if they are the referent
      if (ctx.user?.role === 'COLLABORATOR') {
        const collaborator = await ctx.prisma.collaborator.findUnique({
          where: { userId: ctx.user.id },
        });
        
        if (!collaborator || group.referenceCollaboratorId !== collaborator.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Solo il collaboratore referente può aggiungere membri a questo gruppo',
          });
        }
      }

      // Validate group type allows this member type
      if (input.studentId && group.type === 'COLLABORATORS') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Questo gruppo accetta solo collaboratori',
        });
      }

      if (input.collaboratorId && group.type === 'STUDENTS') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Questo gruppo accetta solo studenti',
        });
      }

      // Check if already a member
      const existingMember = await ctx.prisma.groupMember.findFirst({
        where: {
          groupId: input.groupId,
          ...(input.studentId ? { studentId: input.studentId } : {}),
          ...(input.collaboratorId ? { collaboratorId: input.collaboratorId } : {}),
        },
      });

      if (existingMember) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'L\'utente è già membro di questo gruppo',
        });
      }

      // Validate student/collaborator exists
      if (input.studentId) {
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
        });
        if (!student) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Studente non trovato',
          });
        }
      }

      if (input.collaboratorId) {
        const collaborator = await ctx.prisma.collaborator.findUnique({
          where: { id: input.collaboratorId },
        });
        if (!collaborator) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Collaboratore non trovato',
          });
        }
      }

      // Add member
      const member = await ctx.prisma.groupMember.create({
        data: {
          groupId: input.groupId,
          studentId: input.studentId,
          collaboratorId: input.collaboratorId,
        },
        include: {
          student: { include: { user: { select: { id: true, name: true, email: true } } } },
          collaborator: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      });

      // Send notification to the added member
      const recipientUserId = member.student?.user.id || member.collaborator?.user.id;
      if (recipientUserId) {
        try {
          await notifications.groupMemberAdded(ctx.prisma, {
            recipientUserId,
            groupId: group.id,
            groupName: group.name,
          });
        } catch (error) {
          console.error('[Groups] Failed to send notification:', error);
        }
      } else {
        console.warn('⚠️ [GROUP NOTIFICATION] recipientUserId è undefined, notifica non inviata');
      }

      return member;
    }),

  // Add multiple members at once
  addMembers: adminProcedure
    .input(
      z.object({
        groupId: z.string(),
        studentIds: z.array(z.string()).optional(),
        collaboratorIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { groupId, studentIds = [], collaboratorIds = [] } = input;

      // Check group exists
      const group = await ctx.prisma.group.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Gruppo non trovato',
        });
      }

      // Validate group type
      if (studentIds.length > 0 && group.type === 'COLLABORATORS') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Questo gruppo accetta solo collaboratori',
        });
      }

      if (collaboratorIds.length > 0 && group.type === 'STUDENTS') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Questo gruppo accetta solo studenti',
        });
      }

      // Get existing members to avoid duplicates
      const existingMembers = await ctx.prisma.groupMember.findMany({
        where: { groupId },
        select: { studentId: true, collaboratorId: true },
      });

      const existingStudentIds = new Set(existingMembers.map((m) => m.studentId).filter(Boolean));
      const existingCollaboratorIds = new Set(existingMembers.map((m) => m.collaboratorId).filter(Boolean));

      // Filter out already existing members
      const newStudentIds = studentIds.filter((id) => !existingStudentIds.has(id));
      const newCollaboratorIds = collaboratorIds.filter((id) => !existingCollaboratorIds.has(id));

      // Create new members
      const membersToCreate = [
        ...newStudentIds.map((studentId) => ({
          groupId,
          studentId,
          collaboratorId: null,
        })),
        ...newCollaboratorIds.map((collaboratorId) => ({
          groupId,
          studentId: null,
          collaboratorId,
        })),
      ];

      if (membersToCreate.length === 0) {
        return { added: 0, skipped: studentIds.length + collaboratorIds.length };
      }

      await ctx.prisma.groupMember.createMany({
        data: membersToCreate,
        skipDuplicates: true,
      });

      // Send notifications to newly added students
      if (newStudentIds.length > 0) {
        // Get student user IDs for notifications
        const students = await ctx.prisma.student.findMany({
          where: { id: { in: newStudentIds } },
          select: { userId: true },
        });
        
        // Create notifications for each new student member
        const notificationsToCreate = students.map((student) => ({
          userId: student.userId,
          type: 'GENERAL' as const,
          title: 'Aggiunto a un gruppo',
          message: `Sei stato aggiunto al gruppo "${group.name}".`,
          data: { groupId: group.id, groupName: group.name },
        }));

        if (notificationsToCreate.length > 0) {
          await ctx.prisma.notification.createMany({
            data: notificationsToCreate,
          });
        }
      }

      // Send notifications to newly added collaborators
      if (newCollaboratorIds.length > 0) {
        const collaborators = await ctx.prisma.collaborator.findMany({
          where: { id: { in: newCollaboratorIds } },
          select: { userId: true },
        });
        
        const notificationsToCreate = collaborators.map((collab) => ({
          userId: collab.userId,
          type: 'GENERAL' as const,
          title: 'Aggiunto a un gruppo',
          message: `Sei stato aggiunto al gruppo "${group.name}".`,
          data: { groupId: group.id, groupName: group.name },
        }));

        if (notificationsToCreate.length > 0) {
          await ctx.prisma.notification.createMany({
            data: notificationsToCreate,
          });
        }
      }

      return {
        added: membersToCreate.length,
        skipped: studentIds.length + collaboratorIds.length - membersToCreate.length,
      };
    }),

  // Remove a member from a group
  removeMember: staffProcedure
    .input(z.object({ memberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.prisma.groupMember.findUnique({
        where: { id: input.memberId },
        include: { group: true },
      });

      if (!member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Membro non trovato',
        });
      }

      // If collaborator, check if they are the referent
      if (ctx.user?.role === 'COLLABORATOR') {
        const collaborator = await ctx.prisma.collaborator.findUnique({
          where: { userId: ctx.user.id },
        });
        
        if (!collaborator || member.group.referenceCollaboratorId !== collaborator.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Solo il collaboratore referente può rimuovere membri da questo gruppo',
          });
        }
      }

      await ctx.prisma.groupMember.delete({
        where: { id: input.memberId },
      });

      return { success: true };
    }),

  // Get members of a group
  getMembers: staffProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      const members = await ctx.prisma.groupMember.findMany({
        where: { groupId: input.groupId },
        include: {
          student: {
            include: {
              user: { select: { id: true, name: true, email: true, isActive: true } },
            },
          },
          collaborator: {
            include: {
              user: { select: { id: true, name: true, email: true, isActive: true } },
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
      });

      return members;
    }),

  // Get groups that a user belongs to
  getUserGroups: staffProcedure
    .input(
      z.object({
        userId: z.string(),
        userType: z.enum(['STUDENT', 'COLLABORATOR']),
      })
    )
    .query(async ({ ctx, input }) => {
      // First get the student/collaborator id from user id
      let entityId: string | null = null;

      if (input.userType === 'STUDENT') {
        const student = await ctx.prisma.student.findUnique({
          where: { userId: input.userId },
        });
        entityId = student?.id || null;
      } else {
        const collaborator = await ctx.prisma.collaborator.findUnique({
          where: { userId: input.userId },
        });
        entityId = collaborator?.id || null;
      }

      if (!entityId) {
        return [];
      }

      const memberships = await ctx.prisma.groupMember.findMany({
        where: input.userType === 'STUDENT'
          ? { studentId: entityId }
          : { collaboratorId: entityId },
        include: {
          group: {
            include: {
              referenceStudent: {
                include: { user: { select: { name: true } } },
              },
              referenceCollaborator: {
                include: { user: { select: { name: true } } },
              },
              _count: { select: { members: true } },
            },
          },
        },
      });

      return memberships.map((m) => ({
        ...m.group,
        joinedAt: m.joinedAt,
        memberCount: m.group._count.members,
      }));
    }),

  // Get available students/collaborators to add to a group
  getAvailableUsers: adminProcedure
    .input(
      z.object({
        groupId: z.string(),
        userType: z.enum(['STUDENT', 'COLLABORATOR']),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get current members
      const currentMembers = await ctx.prisma.groupMember.findMany({
        where: { groupId: input.groupId },
        select: {
          studentId: true,
          collaboratorId: true,
        },
      });

      if (input.userType === 'STUDENT') {
        const existingIds = currentMembers
          .map((m) => m.studentId)
          .filter((id): id is string => id !== null);

        const students = await ctx.prisma.student.findMany({
          where: {
            id: { notIn: existingIds },
            user: {
              isActive: true,
              ...(input.search && {
                OR: [
                  { name: { contains: input.search, mode: 'insensitive' } },
                  { email: { contains: input.search, mode: 'insensitive' } },
                ],
              }),
            },
            ...(input.search && {
              matricola: { contains: input.search, mode: 'insensitive' },
            }),
          },
          select: {
            id: true,
            matricola: true,
            user: { select: { id: true, name: true, email: true } },
            groupMemberships: {
              select: {
                group: { select: { id: true, name: true, color: true } },
              },
            },
          },
          take: 50,
        });

        return students.map((s) => ({
          id: s.id,
          userId: s.user.id,
          name: s.user.name,
          email: s.user.email,
          matricola: s.matricola,
          type: 'STUDENT' as const,
          groups: s.groupMemberships.map((gm) => ({
            id: gm.group.id,
            name: gm.group.name,
            color: gm.group.color,
          })),
        }));
      } else {
        const existingIds = currentMembers
          .map((m) => m.collaboratorId)
          .filter((id): id is string => id !== null);

        const collaborators = await ctx.prisma.collaborator.findMany({
          where: {
            id: { notIn: existingIds },
            user: {
              isActive: true,
              ...(input.search && {
                OR: [
                  { name: { contains: input.search, mode: 'insensitive' } },
                  { email: { contains: input.search, mode: 'insensitive' } },
                ],
              }),
            },
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
            groupMemberships: {
              include: {
                group: { select: { id: true, name: true, color: true } },
              },
            },
          },
          take: 50,
        });

        return collaborators.map((c) => ({
          id: c.id,
          userId: c.user.id,
          name: c.user.name,
          email: c.user.email,
          type: 'COLLABORATOR' as const,
          groups: c.groupMemberships.map((gm) => ({
            id: gm.group.id,
            name: gm.group.name,
            color: gm.group.color,
          })),
        }));
      }
    }),

  // Get stats for groups
  getStats: staffProcedure.query(async ({ ctx }) => {
    const [total, byType, activeGroups] = await Promise.all([
      ctx.prisma.group.count(),
      ctx.prisma.group.groupBy({
        by: ['type'],
        _count: true,
        where: { isActive: true },
      }),
      ctx.prisma.group.count({ where: { isActive: true } }),
    ]);

    const totalMembers = await ctx.prisma.groupMember.count();

    return {
      total,
      active: activeGroups,
      inactive: total - activeGroups,
      totalMembers,
      byType: byType.reduce(
        (acc, item) => {
          acc[item.type] = item._count;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }),

  // Get groups managed by the current collaborator (as referent or member)
  getMyGroups: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Utente non autenticato' });
    }

    // Get collaborator ID
    const collaborator = await ctx.prisma.collaborator.findUnique({
      where: { userId: ctx.user.id },
    });

    // Also check if user is admin (they can be referents too)
    const admin = await ctx.prisma.admin.findUnique({
      where: { userId: ctx.user.id },
    });

    if (!collaborator && !admin) {
      return [];
    }

    // Get groups where this user is the reference (as collaborator or admin)
    // OR where they are a member
    const groups = await ctx.prisma.group.findMany({
      where: {
        isActive: true,
        OR: [
          // Referent as collaborator
          ...(collaborator ? [{ referenceCollaboratorId: collaborator.id }] : []),
          // Referent as admin
          ...(admin ? [{ referenceAdminId: admin.id }] : []),
          // Member as collaborator
          ...(collaborator ? [{ members: { some: { collaboratorId: collaborator.id } } }] : []),
        ],
      },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { members: true },
        },
        referenceCollaborator: {
          include: { user: { select: { id: true, name: true } } },
        },
        referenceAdmin: {
          include: { user: { select: { id: true, name: true } } },
        },
        referenceStudent: {
          include: { user: { select: { id: true, name: true } } },
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
    });

    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      color: g.color,
      type: g.type,
      memberCount: g._count.members,
      isReferent: 
        (collaborator && g.referenceCollaboratorId === collaborator.id) ||
        (admin && g.referenceAdminId === admin.id),
      referenceCollaborator: g.referenceCollaborator,
      referenceAdmin: g.referenceAdmin,
      referenceStudent: g.referenceStudent,
      members: g.members,
    }));
  }),
});
