// Materials Router - Manage learning materials (PDF, Video, Links)
import { router, adminProcedure, protectedProcedure, studentProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const materialsRouter = router({
  // ==================== CATEGORIES ====================

  // Get all categories (for students and admins)
  getCategories: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.materialCategory.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { materials: { where: { isActive: true } } },
        },
      },
    });
  }),

  // Get all categories including inactive (admin only)
  getAllCategories: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.materialCategory.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { materials: true },
        },
      },
    });
  }),

  // Create category (admin only)
  createCategory: adminProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      icon: z.string().optional(),
      order: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.materialCategory.create({
        data: {
          name: input.name,
          description: input.description,
          icon: input.icon,
          order: input.order ?? 0,
        },
      });
    }),

  // Update category (admin only)
  updateCategory: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional().nullable(),
      icon: z.string().optional().nullable(),
      order: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.materialCategory.update({
        where: { id },
        data,
      });
    }),

  // Delete category (admin only)
  deleteCategory: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if category has materials
      const materialsCount = await ctx.prisma.material.count({
        where: { categoryId: input.id },
      });
      
      if (materialsCount > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Non puoi eliminare questa categoria. Contiene ${materialsCount} materiali.`,
        });
      }
      
      return ctx.prisma.materialCategory.delete({
        where: { id: input.id },
      });
    }),

  // ==================== SUBJECTS (Custom) ====================

  // Get all subjects (for students and admins)
  getSubjects: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.customSubject.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { materials: { where: { isActive: true } } },
        },
      },
    });
  }),

  // Get all subjects including inactive (admin only)
  getAllSubjects: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.customSubject.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { materials: true },
        },
      },
    });
  }),

  // Create subject (admin only)
  createSubject: adminProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      code: z.string().min(1).max(10).transform(val => val.toUpperCase()),
      description: z.string().optional(),
      color: z.string().optional(),
      icon: z.string().optional(),
      order: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.customSubject.create({
        data: {
          name: input.name,
          code: input.code,
          description: input.description,
          color: input.color,
          icon: input.icon,
          order: input.order ?? 0,
        },
      });
    }),

  // Update subject (admin only)
  updateSubject: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(100).optional(),
      code: z.string().min(1).max(10).transform(val => val.toUpperCase()).optional(),
      description: z.string().optional().nullable(),
      color: z.string().optional().nullable(),
      icon: z.string().optional().nullable(),
      order: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.customSubject.update({
        where: { id },
        data,
      });
    }),

  // Delete subject (admin only)
  deleteSubject: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if subject has materials
      const materialsCount = await ctx.prisma.material.count({
        where: { subjectId: input.id },
      });
      
      if (materialsCount > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Non puoi eliminare questa materia. È associata a ${materialsCount} materiali.`,
        });
      }
      
      return ctx.prisma.customSubject.delete({
        where: { id: input.id },
      });
    }),

  // ==================== TOPICS (Argomenti) ====================

  // Get all topics for a subject with subtopics
  getTopics: protectedProcedure
    .input(z.object({
      subjectId: z.string(),
      includeInactive: z.boolean().optional().default(false),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.topic.findMany({
        where: {
          subjectId: input.subjectId,
          ...(input.includeInactive ? {} : { isActive: true }),
        },
        orderBy: { order: 'asc' },
        include: {
          subTopics: {
            where: input.includeInactive ? {} : { isActive: true },
            orderBy: { order: 'asc' },
          },
          _count: {
            select: { subTopics: true },
          },
        },
      });
    }),

  // Get subject with all topics and subtopics (for editing)
  getSubjectWithTopics: protectedProcedure
    .input(z.object({ subjectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.customSubject.findUnique({
        where: { id: input.subjectId },
        include: {
          topics: {
            orderBy: { order: 'asc' },
            include: {
              subTopics: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      });
    }),

  // Create topic (admin or collaborator with this subject)
  createTopic: protectedProcedure
    .input(z.object({
      subjectId: z.string(),
      name: z.string().min(1).max(200),
      description: z.string().optional(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
      order: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const userRole = ctx.user.role;

      // Check if user can manage this subject (admin or collaborator with subject assigned)
      if (userRole !== 'ADMIN') {
        const collaborator = await ctx.prisma.collaborator.findFirst({
          where: {
            userId,
            subjects: {
              some: { subjectId: input.subjectId },
            },
          },
        });
        
        if (!collaborator) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Non hai i permessi per gestire questa materia.',
          });
        }
      }

      // Get max order if not provided
      const maxOrder = input.order ?? await ctx.prisma.topic.count({
        where: { subjectId: input.subjectId },
      });

      return ctx.prisma.topic.create({
        data: {
          name: input.name,
          description: input.description,
          difficulty: input.difficulty,
          order: maxOrder,
          subjectId: input.subjectId,
          createdBy: userId,
        },
        include: {
          subTopics: true,
        },
      });
    }),

  // Update topic
  updateTopic: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().optional().nullable(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
      order: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const userRole = ctx.user.role;

      // Get topic with subject
      const topic = await ctx.prisma.topic.findUnique({
        where: { id: input.id },
        include: { subject: true },
      });

      if (!topic) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Argomento non trovato.',
        });
      }

      // Check permissions
      if (userRole !== 'ADMIN') {
        const collaborator = await ctx.prisma.collaborator.findFirst({
          where: {
            userId,
            subjects: {
              some: { subjectId: topic.subjectId },
            },
          },
        });
        
        if (!collaborator) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Non hai i permessi per modificare questo argomento.',
          });
        }
      }

      const { id, ...data } = input;
      return ctx.prisma.topic.update({
        where: { id },
        data,
        include: {
          subTopics: true,
        },
      });
    }),

  // Delete topic
  deleteTopic: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const userRole = ctx.user.role;

      const topic = await ctx.prisma.topic.findUnique({
        where: { id: input.id },
      });

      if (!topic) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Argomento non trovato.',
        });
      }

      // Check permissions
      if (userRole !== 'ADMIN') {
        const collaborator = await ctx.prisma.collaborator.findFirst({
          where: {
            userId,
            subjects: {
              some: { subjectId: topic.subjectId },
            },
          },
        });
        
        if (!collaborator) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Non hai i permessi per eliminare questo argomento.',
          });
        }
      }

      // Delete topic (cascades to subtopics)
      return ctx.prisma.topic.delete({
        where: { id: input.id },
      });
    }),

  // ==================== SUBTOPICS (Sotto-argomenti) ====================

  // Create subtopic
  createSubTopic: protectedProcedure
    .input(z.object({
      topicId: z.string(),
      name: z.string().min(1).max(200),
      description: z.string().optional(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
      order: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const userRole = ctx.user.role;

      // Get topic with subject
      const topic = await ctx.prisma.topic.findUnique({
        where: { id: input.topicId },
        include: { subject: true },
      });

      if (!topic) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Argomento non trovato.',
        });
      }

      // Check permissions
      if (userRole !== 'ADMIN') {
        const collaborator = await ctx.prisma.collaborator.findFirst({
          where: {
            userId,
            subjects: {
              some: { subjectId: topic.subjectId },
            },
          },
        });
        
        if (!collaborator) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Non hai i permessi per gestire questa materia.',
          });
        }
      }

      // Get max order if not provided
      const maxOrder = input.order ?? await ctx.prisma.subTopic.count({
        where: { topicId: input.topicId },
      });

      return ctx.prisma.subTopic.create({
        data: {
          name: input.name,
          description: input.description,
          difficulty: input.difficulty,
          order: maxOrder,
          topicId: input.topicId,
          createdBy: userId,
        },
      });
    }),

  // Update subtopic
  updateSubTopic: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().optional().nullable(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
      order: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const userRole = ctx.user.role;

      // Get subtopic with topic and subject
      const subTopic = await ctx.prisma.subTopic.findUnique({
        where: { id: input.id },
        include: {
          topic: {
            include: { subject: true },
          },
        },
      });

      if (!subTopic) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sotto-argomento non trovato.',
        });
      }

      // Check permissions
      if (userRole !== 'ADMIN') {
        const collaborator = await ctx.prisma.collaborator.findFirst({
          where: {
            userId,
            subjects: {
              some: { subjectId: subTopic.topic.subjectId },
            },
          },
        });
        
        if (!collaborator) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Non hai i permessi per modificare questo sotto-argomento.',
          });
        }
      }

      const { id, ...data } = input;
      return ctx.prisma.subTopic.update({
        where: { id },
        data,
      });
    }),

  // Delete subtopic
  deleteSubTopic: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const userRole = ctx.user.role;

      const subTopic = await ctx.prisma.subTopic.findUnique({
        where: { id: input.id },
        include: {
          topic: true,
        },
      });

      if (!subTopic) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sotto-argomento non trovato.',
        });
      }

      // Check permissions
      if (userRole !== 'ADMIN') {
        const collaborator = await ctx.prisma.collaborator.findFirst({
          where: {
            userId,
            subjects: {
              some: { subjectId: subTopic.topic.subjectId },
            },
          },
        });
        
        if (!collaborator) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Non hai i permessi per eliminare questo sotto-argomento.',
          });
        }
      }

      return ctx.prisma.subTopic.delete({
        where: { id: input.id },
      });
    }),

  // Reorder topics
  reorderTopics: protectedProcedure
    .input(z.object({
      subjectId: z.string(),
      topicIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const userRole = ctx.user.role;

      // Check permissions
      if (userRole !== 'ADMIN') {
        const collaborator = await ctx.prisma.collaborator.findFirst({
          where: {
            userId,
            subjects: {
              some: { subjectId: input.subjectId },
            },
          },
        });
        
        if (!collaborator) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Non hai i permessi per riordinare gli argomenti.',
          });
        }
      }

      // Update order for each topic
      await ctx.prisma.$transaction(
        input.topicIds.map((id, index) =>
          ctx.prisma.topic.update({
            where: { id },
            data: { order: index },
          })
        )
      );

      return { success: true };
    }),

  // Reorder subtopics
  reorderSubTopics: protectedProcedure
    .input(z.object({
      topicId: z.string(),
      subTopicIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const userRole = ctx.user.role;

      // Get topic
      const topic = await ctx.prisma.topic.findUnique({
        where: { id: input.topicId },
      });

      if (!topic) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Argomento non trovato.',
        });
      }

      // Check permissions
      if (userRole !== 'ADMIN') {
        const collaborator = await ctx.prisma.collaborator.findFirst({
          where: {
            userId,
            subjects: {
              some: { subjectId: topic.subjectId },
            },
          },
        });
        
        if (!collaborator) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Non hai i permessi per riordinare i sotto-argomenti.',
          });
        }
      }

      // Update order for each subtopic
      await ctx.prisma.$transaction(
        input.subTopicIds.map((id, index) =>
          ctx.prisma.subTopic.update({
            where: { id },
            data: { order: index },
          })
        )
      );

      return { success: true };
    }),

  // ==================== MATERIALS ====================

  // Get all materials (admin only)
  getAll: adminProcedure
    .input(z.object({
      type: z.enum(['PDF', 'VIDEO', 'LINK', 'DOCUMENT']).optional(),
      categoryId: z.string().optional(),
      visibility: z.enum(['ALL_STUDENTS', 'COURSE_BASED', 'SELECTED_STUDENTS']).optional(),
      isActive: z.boolean().optional(),
      subjectId: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.material.findMany({
        where: {
          type: input?.type,
          categoryId: input?.categoryId,
          visibility: input?.visibility,
          isActive: input?.isActive,
          subjectId: input?.subjectId,
        },
        orderBy: [
          { categoryId: 'asc' },
          { order: 'asc' },
          { createdAt: 'desc' },
        ],
        include: {
          category: true,
          subject: true,
          _count: {
            select: {
              groupAccess: true,
              studentAccess: true,
            },
          },
        },
      });
    }),

  // Get material by ID (admin only for now)
  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const material = await ctx.prisma.material.findUnique({
        where: { id: input.id },
        include: {
          category: true,
          subject: true,
          groupAccess: {
            include: {
              group: true,
            },
          },
          studentAccess: {
            include: {
              student: {
                include: {
                  user: {
                    select: { name: true, email: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!material) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Materiale non trovato',
        });
      }

      return material;
    }),

  // Create material (admin only)
  create: adminProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      type: z.enum(['PDF', 'VIDEO', 'LINK', 'DOCUMENT']),
      fileUrl: z.string().optional(),
      fileName: z.string().optional(),
      fileSize: z.number().optional(),
      externalUrl: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      visibility: z.enum(['ALL_STUDENTS', 'GROUP_BASED', 'SELECTED_STUDENTS']).default('ALL_STUDENTS'),
      categoryId: z.string().optional(),
      subjectId: z.string().optional(),
      tags: z.array(z.string()).optional(),
      order: z.number().optional(),
      // For group-based visibility
      groupIds: z.array(z.string()).optional(),
      // For selected students visibility
      studentIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { groupIds, studentIds, categoryId, subjectId, ...materialData } = input;

      return ctx.prisma.$transaction(async (tx) => {
        // Create material
        const material = await tx.material.create({
          data: {
            title: materialData.title,
            description: materialData.description,
            type: materialData.type,
            fileUrl: materialData.fileUrl,
            fileName: materialData.fileName,
            fileSize: materialData.fileSize,
            externalUrl: materialData.externalUrl,
            thumbnailUrl: materialData.thumbnailUrl,
            visibility: materialData.visibility,
            tags: materialData.tags || [],
            order: materialData.order,
            createdBy: ctx.user.id,
            // Connect category if provided
            ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
            // Connect subject if provided
            ...(subjectId ? { subject: { connect: { id: subjectId } } } : {}),
          },
        });

        // If GROUP_BASED, create group access records
        if (input.visibility === 'GROUP_BASED' && groupIds?.length) {
          await tx.materialGroupAccess.createMany({
            data: groupIds.map((groupId) => ({
              materialId: material.id,
              groupId,
            })),
          });
        }

        // If SELECTED_STUDENTS, create student access records
        if (input.visibility === 'SELECTED_STUDENTS' && studentIds?.length) {
          await tx.materialStudentAccess.createMany({
            data: studentIds.map((studentId) => ({
              materialId: material.id,
              studentId,
              grantedBy: ctx.user.id,
            })),
          });
        }

        return material;
      });
    }),

  // Update material (admin only)
  update: adminProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1).max(255).optional(),
      description: z.string().optional().nullable(),
      type: z.enum(['PDF', 'VIDEO', 'LINK', 'DOCUMENT']).optional(),
      fileUrl: z.string().optional().nullable(),
      fileName: z.string().optional().nullable(),
      fileSize: z.number().optional().nullable(),
      externalUrl: z.string().optional().nullable(),
      thumbnailUrl: z.string().optional().nullable(),
      visibility: z.enum(['ALL_STUDENTS', 'GROUP_BASED', 'SELECTED_STUDENTS']).optional(),
      categoryId: z.string().optional().nullable(),
      subjectId: z.string().optional().nullable(),
      tags: z.array(z.string()).optional(),
      order: z.number().optional(),
      isActive: z.boolean().optional(),
      // For group-based visibility
      groupIds: z.array(z.string()).optional(),
      // For selected students visibility
      studentIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, groupIds, studentIds, subjectId, categoryId, ...materialData } = input;

      return ctx.prisma.$transaction(async (tx) => {
        // Update material
        const material = await tx.material.update({
          where: { id },
          data: {
            ...materialData,
            // Handle category connection
            ...(categoryId !== undefined ? (
              categoryId ? { category: { connect: { id: categoryId } } } : { category: { disconnect: true } }
            ) : {}),
            // Handle subject connection
            ...(subjectId !== undefined ? (
              subjectId ? { subject: { connect: { id: subjectId } } } : { subject: { disconnect: true } }
            ) : {}),
          },
        });

        // If visibility changed to GROUP_BASED, update group access
        if (input.visibility === 'GROUP_BASED' && groupIds !== undefined) {
          // Remove existing group access
          await tx.materialGroupAccess.deleteMany({
            where: { materialId: id },
          });
          
          // Add new group access
          if (groupIds.length) {
            await tx.materialGroupAccess.createMany({
              data: groupIds.map((groupId) => ({
                materialId: id,
                groupId,
              })),
            });
          }
        }

        // If visibility changed to SELECTED_STUDENTS, update student access
        if (input.visibility === 'SELECTED_STUDENTS' && studentIds !== undefined) {
          // Remove existing student access
          await tx.materialStudentAccess.deleteMany({
            where: { materialId: id },
          });
          
          // Add new student access
          if (studentIds.length) {
            await tx.materialStudentAccess.createMany({
              data: studentIds.map((studentId) => ({
                materialId: id,
                studentId,
                grantedBy: ctx.user.id,
              })),
            });
          }
        }

        return material;
      });
    }),

  // Delete material (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Material will cascade delete course/student access
      return ctx.prisma.material.delete({
        where: { id: input.id },
      });
    }),

  // Increment view count
  recordView: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.material.update({
        where: { id: input.id },
        data: {
          viewCount: { increment: 1 },
        },
      });
    }),

  // Increment download count
  recordDownload: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.material.update({
        where: { id: input.id },
        data: {
          downloadCount: { increment: 1 },
        },
      });
    }),

  // ==================== ACCESS MANAGEMENT ====================

  // Add student access to a material
  addStudentAccess: adminProcedure
    .input(z.object({
      materialId: z.string(),
      studentIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.materialStudentAccess.createMany({
        data: input.studentIds.map((studentId) => ({
          materialId: input.materialId,
          studentId,
          grantedBy: ctx.user.id,
        })),
        skipDuplicates: true,
      });
    }),

  // Remove student access from a material
  removeStudentAccess: adminProcedure
    .input(z.object({
      materialId: z.string(),
      studentId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.materialStudentAccess.delete({
        where: {
          materialId_studentId: {
            materialId: input.materialId,
            studentId: input.studentId,
          },
        },
      });
    }),

  // Add group access to a material
  addGroupAccess: adminProcedure
    .input(z.object({
      materialId: z.string(),
      groupIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.materialGroupAccess.createMany({
        data: input.groupIds.map((groupId) => ({
          materialId: input.materialId,
          groupId,
        })),
        skipDuplicates: true,
      });
    }),

  // Remove group access from a material
  removeGroupAccess: adminProcedure
    .input(z.object({
      materialId: z.string(),
      groupId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.materialGroupAccess.delete({
        where: {
          materialId_groupId: {
            materialId: input.materialId,
            groupId: input.groupId,
          },
        },
      });
    }),

  // ==================== STUDENT ENDPOINTS ====================

  // Get materials accessible to the current student
  getMyMaterials: studentProcedure
    .input(z.object({
      categoryId: z.string().optional(),
      type: z.enum(['PDF', 'VIDEO', 'LINK', 'DOCUMENT']).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      // First, get the student and their group memberships
      const student = await ctx.prisma.student.findUnique({
        where: { userId: ctx.user.id },
        include: {
          groupMemberships: {
            select: { groupId: true },
          },
        },
      });

      if (!student) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Studente non trovato',
        });
      }

      // Get the group IDs the student belongs to
      const groupIds = student.groupMemberships.map(m => m.groupId);

      // Get materials visible to this student
      const materials = await ctx.prisma.material.findMany({
        where: {
          isActive: true,
          type: input?.type,
          categoryId: input?.categoryId,
          OR: [
            // All students visibility
            { visibility: 'ALL_STUDENTS' },
            // Group-based (if student belongs to groups)
            groupIds.length > 0
              ? {
                  visibility: 'GROUP_BASED',
                  groupAccess: {
                    some: { groupId: { in: groupIds } },
                  },
                }
              : { id: 'never' }, // No match if not in any group
            // Individual access
            {
              visibility: 'SELECTED_STUDENTS',
              studentAccess: {
                some: { studentId: student.id },
              },
            },
          ],
        },
        orderBy: [
          { category: { order: 'asc' } },
          { order: 'asc' },
          { createdAt: 'desc' },
        ],
        include: {
          category: true,
          subject: true,
        },
      });

      return materials;
    }),

  // Get a single material for student (with access check)
  getMaterial: studentProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const student = await ctx.prisma.student.findUnique({
        where: { userId: ctx.user.id },
        include: {
          groupMemberships: {
            select: { groupId: true },
          },
        },
      });

      if (!student) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Studente non trovato',
        });
      }

      const groupIds = student.groupMemberships.map(m => m.groupId);

      const material = await ctx.prisma.material.findFirst({
        where: {
          id: input.id,
          isActive: true,
          OR: [
            { visibility: 'ALL_STUDENTS' },
            groupIds.length > 0
              ? {
                  visibility: 'GROUP_BASED',
                  groupAccess: {
                    some: { groupId: { in: groupIds } },
                  },
                }
              : { id: 'never' },
            {
              visibility: 'SELECTED_STUDENTS',
              studentAccess: {
                some: { studentId: student.id },
              },
            },
          ],
        },
        include: {
          category: true,
          subject: true,
        },
      });

      if (!material) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Materiale non trovato o accesso non autorizzato',
        });
      }

      // Record view
      await ctx.prisma.material.update({
        where: { id: input.id },
        data: { viewCount: { increment: 1 } },
      });

      return material;
    }),

  // ==================== STATS ====================

  // Get material statistics (admin only)
  getStats: adminProcedure.query(async ({ ctx }) => {
    const [
      totalMaterials,
      totalByType,
      totalByVisibility,
      topViewed,
      topDownloaded,
    ] = await Promise.all([
      ctx.prisma.material.count({ where: { isActive: true } }),
      ctx.prisma.material.groupBy({
        by: ['type'],
        _count: true,
        where: { isActive: true },
      }),
      ctx.prisma.material.groupBy({
        by: ['visibility'],
        _count: true,
        where: { isActive: true },
      }),
      ctx.prisma.material.findMany({
        where: { isActive: true },
        orderBy: { viewCount: 'desc' },
        take: 5,
        select: { id: true, title: true, viewCount: true, type: true },
      }),
      ctx.prisma.material.findMany({
        where: { isActive: true },
        orderBy: { downloadCount: 'desc' },
        take: 5,
        select: { id: true, title: true, downloadCount: true, type: true },
      }),
    ]);

    return {
      totalMaterials,
      byType: totalByType.reduce((acc, item) => ({
        ...acc,
        [item.type]: item._count,
      }), {} as Record<string, number>),
      byVisibility: totalByVisibility.reduce((acc, item) => ({
        ...acc,
        [item.visibility]: item._count,
      }), {} as Record<string, number>),
      topViewed,
      topDownloaded,
    };
  }),
});
