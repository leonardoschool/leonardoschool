// Materials Router - Manage learning materials (PDF, Video, Links)
import { router, protectedProcedure, studentProcedure, staffProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import * as notificationService from '@/server/services/notificationService';
import { createCachedQuery, CACHE_TIMES } from '@/lib/cache/serverCache';

export const materialsRouter = router({
  // ==================== MATERIAL CATEGORIES (containers for materials) ====================

  // Get all categories (for students - filtered by visibility)
  getCategories: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;
      const userRole = ctx.user.role;

      // If admin/collaborator, return all active categories
      if (userRole === 'ADMIN' || userRole === 'COLLABORATOR') {
        return ctx.prisma.materialCategory.findMany({
          where: { isActive: true },
          orderBy: { order: 'asc' },
          include: {
            _count: {
              select: { 
                materials: { 
                  where: { 
                    material: { 
                      isActive: true 
                    } 
                  } 
                } 
              },
            },
          },
        });
      }

      // For students, filter by visibility
      const student = await ctx.prisma.student.findFirst({
        where: { userId },
        include: { groupMemberships: { select: { groupId: true } } },
      });

      if (!student) {
        return [];
      }

      const groupIds = student.groupMemberships.map(m => m.groupId);

      return ctx.prisma.materialCategory.findMany({
        where: {
          isActive: true,
          OR: [
            { visibility: 'ALL_STUDENTS' },
            { 
              visibility: 'GROUP_BASED',
              groupAccess: { some: { groupId: { in: groupIds } } },
            },
            { 
              visibility: 'SELECTED_STUDENTS',
              studentAccess: { some: { studentId: student.id } },
            },
          ],
        },
        orderBy: { order: 'asc' },
        include: {
          _count: {
            select: { 
              materials: { 
                where: { 
                  material: { isActive: true } 
                } 
              } 
            },
          },
        },
      });
    }),

  // Get all categories including inactive (staff only)
  getAllCategories: staffProcedure
    .query(async ({ ctx }) => {
      return ctx.prisma.materialCategory.findMany({
        orderBy: { order: 'asc' },
        include: {
          _count: {
            select: { 
              materials: { 
                where: { 
                  material: { isActive: true } 
                } 
              } 
            },
          },
          groupAccess: {
            include: { group: { select: { id: true, name: true } } },
          },
          studentAccess: {
            include: { 
              student: { 
                select: { 
                  id: true,
                  user: { select: { id: true, name: true } } 
                } 
              } 
            },
          },
        },
      });
    }),

  // Create category (staff only)
  createCategory: staffProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      icon: z.string().optional(),
      order: z.number().optional(),
      visibility: z.enum(['NONE', 'ALL_STUDENTS', 'GROUP_BASED', 'SELECTED_STUDENTS']).default('ALL_STUDENTS'),
      groupIds: z.array(z.string()).optional(),
      studentIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get max order if not provided
      const maxOrder = input.order ?? await ctx.prisma.materialCategory.count();

      const category = await ctx.prisma.materialCategory.create({
        data: {
          name: input.name,
          description: input.description,
          icon: input.icon,
          order: maxOrder,
          visibility: input.visibility,
          createdBy: ctx.user.id,
        },
      });

      // Add group access if GROUP_BASED
      if (input.visibility === 'GROUP_BASED' && input.groupIds?.length) {
        await ctx.prisma.materialCategoryGroupAccess.createMany({
          data: input.groupIds.map(groupId => ({
            categoryId: category.id,
            groupId,
          })),
        });
      }

      // Add student access if SELECTED_STUDENTS
      if (input.visibility === 'SELECTED_STUDENTS' && input.studentIds?.length) {
        await ctx.prisma.materialCategoryStudentAccess.createMany({
          data: input.studentIds.map(studentId => ({
            categoryId: category.id,
            studentId,
          })),
        });
      }

      return category;
    }),

  // Update category (staff only)
  updateCategory: staffProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional().nullable(),
      icon: z.string().optional().nullable(),
      order: z.number().optional(),
      isActive: z.boolean().optional(),
      visibility: z.enum(['NONE', 'ALL_STUDENTS', 'GROUP_BASED', 'SELECTED_STUDENTS']).optional(),
      groupIds: z.array(z.string()).optional(),
      studentIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, groupIds, studentIds, ...data } = input;
      
      // Get old category state to compare for notifications
      const oldCategory = await ctx.prisma.materialCategory.findUnique({
        where: { id },
        include: {
          groupAccess: true,
          studentAccess: true,
          materials: {
            include: {
              material: {
                select: { id: true, title: true }
              }
            }
          }
        },
      });
      const oldVisibility = oldCategory?.visibility;
      const oldGroupIds = oldCategory?.groupAccess?.map(g => g.groupId) || [];
      const oldStudentIds = oldCategory?.studentAccess?.map(s => s.studentId) || [];
      
      const category = await ctx.prisma.materialCategory.update({
        where: { id },
        data,
      });

      // Update group access if provided
      if (groupIds !== undefined) {
        await ctx.prisma.materialCategoryGroupAccess.deleteMany({
          where: { categoryId: id },
        });
        if (groupIds.length > 0) {
          await ctx.prisma.materialCategoryGroupAccess.createMany({
            data: groupIds.map(groupId => ({
              categoryId: id,
              groupId,
            })),
          });
        }
      }

      // Update student access if provided
      if (studentIds !== undefined) {
        await ctx.prisma.materialCategoryStudentAccess.deleteMany({
          where: { categoryId: id },
        });
        if (studentIds.length > 0) {
          await ctx.prisma.materialCategoryStudentAccess.createMany({
            data: studentIds.map(studentId => ({
              categoryId: id,
              studentId,
            })),
          });
        }
      }

      // Send notifications for category visibility changes
      // Only notify if category has materials and visibility changed to include new students
      const categoryMaterials = oldCategory?.materials || [];
      if (categoryMaterials.length > 0) {
        let targetUserIds: string[] = [];

        if (input.visibility === 'ALL_STUDENTS' && oldVisibility !== 'ALL_STUDENTS') {
          // Category is now visible to all students
          const allStudents = await ctx.prisma.student.findMany({
            where: { user: { isActive: true } },
            select: { userId: true },
          });
          targetUserIds = allStudents.map(s => s.userId);
        } else if (input.visibility === 'GROUP_BASED' && groupIds?.length) {
          // Find newly added groups
          const newGroupIds = groupIds.filter(g => !oldGroupIds.includes(g));
          if (newGroupIds.length > 0) {
            const groupMembers = await ctx.prisma.groupMember.findMany({
              where: { groupId: { in: newGroupIds } },
              select: { student: { select: { userId: true } } },
            });
            targetUserIds = groupMembers.map(m => m.student.userId);
          }
        } else if (input.visibility === 'SELECTED_STUDENTS' && studentIds?.length) {
          // Find newly added students
          const newStudentIds = studentIds.filter(s => !oldStudentIds.includes(s));
          if (newStudentIds.length > 0) {
            const students = await ctx.prisma.student.findMany({
              where: { id: { in: newStudentIds } },
              select: { userId: true },
            });
            targetUserIds = students.map(s => s.userId);
          }
        }

        // Send notification for each material in the category
        if (targetUserIds.length > 0) {
          const uniqueUserIds = [...new Set(targetUserIds)];
          for (const catMaterial of categoryMaterials) {
            notificationService.notifyMaterialAvailable(ctx.prisma, {
              materialId: catMaterial.material.id,
              materialTitle: catMaterial.material.title,
              targetUserIds: uniqueUserIds,
            }).catch(err => {
              console.error('[Materials] Failed to send category update notification:', err);
            });
          }
        }
      }

      return category;
    }),

  // Delete category (staff only) - unlinks materials but doesn't delete them
  deleteCategory: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // First, delete all MaterialCategoryLink records for this category
      // This will unlink all materials from this category
      await ctx.prisma.materialCategoryLink.deleteMany({
        where: { categoryId: input.id },
      });
      
      // Then delete the category
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

  // Get all subjects including inactive (admin and collaborators)
  getAllSubjects: staffProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const userRole = ctx.user.role;

    // Get collaborator's assigned subjects if not admin
    let assignedSubjectIds: string[] = [];
    if (userRole === 'COLLABORATOR') {
      const collaborator = await ctx.prisma.collaborator.findFirst({
        where: { userId },
        include: {
          subjects: { select: { subjectId: true } },
        },
      });
      assignedSubjectIds = collaborator?.subjects.map(s => s.subjectId) || [];
    }

    const subjects = await ctx.prisma.customSubject.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { materials: true },
        },
      },
    });

    // Add canEdit flag for each subject
    return subjects.map(subject => ({
      ...subject,
      canEdit: userRole === 'ADMIN' || assignedSubjectIds.includes(subject.id),
      canDelete: userRole === 'ADMIN', // Only admins can delete
    }));
  }),

  // Get full hierarchy: Subjects → Topics → SubTopics (for material classification)
  getHierarchy: protectedProcedure
    .input(z.object({
      includeInactive: z.boolean().optional().default(false),
    }).optional())
    .query(async ({ ctx, input }) => {
      const activeFilter = input?.includeInactive ? {} : { isActive: true };
      
      return ctx.prisma.customSubject.findMany({
        where: activeFilter,
        orderBy: { order: 'asc' },
        include: {
          topics: {
            where: activeFilter,
            orderBy: { order: 'asc' },
            include: {
              subTopics: {
                where: activeFilter,
                orderBy: { order: 'asc' },
                select: {
                  id: true,
                  name: true,
                  description: true,
                  difficulty: true,
                  order: true,
                  isActive: true,
                  _count: {
                    select: { materials: true },
                  },
                },
              },
              _count: {
                select: { materials: true, subTopics: true },
              },
            },
          },
          _count: {
            select: { materials: true, topics: true },
          },
        },
      });
    }),

  // Create subject (staff: admin + collaborator)
  createSubject: staffProcedure
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

  // Update subject (staff: admin + collaborator with subject assigned)
  updateSubject: staffProcedure
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
      const userId = ctx.user.id;
      const userRole = ctx.user.role;

      // Check if user can manage this subject
      if (userRole !== 'ADMIN') {
        const collaborator = await ctx.prisma.collaborator.findFirst({
          where: {
            userId,
            subjects: {
              some: { subjectId: input.id },
            },
          },
        });
        
        if (!collaborator) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Non hai i permessi per modificare questa materia.',
          });
        }
      }

      const { id, ...data } = input;
      return ctx.prisma.customSubject.update({
        where: { id },
        data,
      });
    }),

  // Delete subject (admin only - collaborators cannot delete subjects)
  deleteSubject: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userRole = ctx.user.role;

      // Only admins can delete subjects
      if (userRole !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Solo gli amministratori possono eliminare materie.',
        });
      }

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

  // Get all materials (staff: admin + collaborator)
  getAll: staffProcedure
    .input(z.object({
      type: z.enum(['PDF', 'VIDEO', 'LINK', 'DOCUMENT']).optional(),
      categoryId: z.string().optional(),  // Container category filter
      topicId: z.string().optional(),     // Classification filter
      subTopicId: z.string().optional(),  // Classification filter
      visibility: z.enum(['NONE', 'ALL_STUDENTS', 'GROUP_BASED', 'SELECTED_STUDENTS']).optional(),
      isActive: z.boolean().optional(),
      subjectId: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.material.findMany({
        where: {
          type: input?.type,
          ...(input?.categoryId && {
            categories: {
              some: { categoryId: input.categoryId }
            }
          }),
          topicId: input?.topicId,
          subTopicId: input?.subTopicId,
          visibility: input?.visibility,
          isActive: input?.isActive,
          subjectId: input?.subjectId,
        },
        orderBy: [
          { topic: { order: 'asc' } },
          { subTopic: { order: 'asc' } },
          { order: 'asc' },
          { createdAt: 'desc' },
        ],
        include: {
          categories: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  icon: true,
                  order: true,
                  visibility: true,
                },
              },
            },
          },
          topic: true,     // Classification
          subTopic: true,  // Classification
          subject: true,
          groupAccess: {
            include: {
              group: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  _count: {
                    select: { members: true },
                  },
                },
              },
            },
          },
          studentAccess: {
            include: {
              student: {
                include: {
                  user: {
                    select: { id: true, name: true, email: true },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              groupAccess: true,
              studentAccess: true,
            },
          },
        },
      });
    }),

  // Get material by ID (staff: admin + collaborator)
  getById: staffProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const material = await ctx.prisma.material.findUnique({
        where: { id: input.id },
        include: {
          categories: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  icon: true,
                  order: true,
                  visibility: true,
                },
              },
            },
          },
          topic: true,
          subTopic: true,
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

  // Create material (staff: admin + collaborator)
  create: staffProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      type: z.enum(['PDF', 'VIDEO', 'LINK', 'DOCUMENT']),
      fileUrl: z.string().optional(),
      fileName: z.string().optional(),
      fileSize: z.number().optional(),
      externalUrl: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      visibility: z.enum(['NONE', 'ALL_STUDENTS', 'GROUP_BASED', 'SELECTED_STUDENTS']).default('NONE'),
      categoryIds: z.array(z.string()).optional(),  // Multiple container categories
      subjectId: z.string().optional(),      // Classification (required for proper organization)
      topicId: z.string().optional(),        // Classification
      subTopicId: z.string().optional(),     // Classification
      tags: z.array(z.string()).optional(),
      order: z.number().optional(),
      // For group-based visibility
      groupIds: z.array(z.string()).optional(),
      // For selected students visibility
      studentIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { groupIds, studentIds, categoryIds, subjectId, topicId, subTopicId, ...materialData } = input;

      // Use nested writes to create material with all relations atomically
      const material = await ctx.prisma.material.create({
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
          // Connect multiple categories if provided
          ...(categoryIds?.length ? {
            categories: {
              create: categoryIds.map(categoryId => ({
                category: { connect: { id: categoryId } }
              }))
            }
          } : {}),
          // Connect subject if provided
          ...(subjectId ? { subject: { connect: { id: subjectId } } } : {}),
          // Connect topic (classification) if provided
          ...(topicId ? { topic: { connect: { id: topicId } } } : {}),
          // Connect subtopic (classification) if provided
          ...(subTopicId ? { subTopic: { connect: { id: subTopicId } } } : {}),
          // If GROUP_BASED, create group access records with nested write
          ...(input.visibility === 'GROUP_BASED' && groupIds?.length ? {
            groupAccess: {
              create: groupIds.map((groupId) => ({
                group: { connect: { id: groupId } }
              }))
            }
          } : {}),
          // If SELECTED_STUDENTS, create student access records with nested write
          ...(input.visibility === 'SELECTED_STUDENTS' && studentIds?.length ? {
            studentAccess: {
              create: studentIds.map((studentId) => ({
                student: { connect: { id: studentId } },
                grantedBy: ctx.user.id,
              }))
            }
          } : {}),
        },
      });

      const result = { material, groupIds, studentIds };

      // Send notifications to target students (background, outside transaction)
      // Get target user IDs based on visibility
      let targetUserIds: string[] = [];
      
      if (input.visibility === 'ALL_STUDENTS') {
        // Get all active students
        const allStudents = await ctx.prisma.student.findMany({
          where: { user: { isActive: true } },
          select: { userId: true },
        });
        targetUserIds = allStudents.map(s => s.userId);
      } else if (input.visibility === 'GROUP_BASED' && result.groupIds?.length) {
        // Get students in the specified groups
        const groupMembers = await ctx.prisma.groupMember.findMany({
          where: { groupId: { in: result.groupIds } },
          select: { student: { select: { userId: true } } },
        });
        targetUserIds = groupMembers.map(m => m.student.userId);
      } else if (input.visibility === 'SELECTED_STUDENTS' && result.studentIds?.length) {
        // Get user IDs for selected students
        const students = await ctx.prisma.student.findMany({
          where: { id: { in: result.studentIds } },
          select: { userId: true },
        });
        targetUserIds = students.map(s => s.userId);
      }

      // Remove duplicates and send notifications
      if (targetUserIds.length > 0) {
        const uniqueUserIds = [...new Set(targetUserIds)];
        notificationService.notifyMaterialAvailable(ctx.prisma, {
          materialId: result.material.id,
          materialTitle: result.material.title,
          targetUserIds: uniqueUserIds,
        }).catch(err => {
          console.error('[Materials] Failed to send new material notification:', err);
        });
      }

      return result.material;
    }),

  // Create multiple materials at once (batch upload)
  createBatch: staffProcedure
    .input(z.object({
      // Shared metadata for all materials
      categoryId: z.string().optional(),     // Container category
      subjectId: z.string().optional(),      // Classification
      topicId: z.string().optional(),        // Classification
      subTopicId: z.string().optional(),     // Classification
      visibility: z.enum(['NONE', 'ALL_STUDENTS', 'GROUP_BASED', 'SELECTED_STUDENTS']).default('NONE'),
      groupIds: z.array(z.string()).optional(),
      studentIds: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      // Array of files to upload
      files: z.array(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        type: z.enum(['PDF', 'VIDEO', 'LINK', 'DOCUMENT']),
        fileUrl: z.string().optional(),
        fileName: z.string().optional(),
        fileSize: z.number().optional(),
        externalUrl: z.string().optional(),
      })).min(1).max(20), // Max 20 files at once
    }))
    .mutation(async ({ ctx, input }) => {
      const { files, groupIds, studentIds, categoryId, subjectId, topicId, subTopicId, visibility, tags } = input;

      // Create all materials with nested writes (no interactive transaction needed)
      const createdMaterials = await Promise.all(
        files.map(async (file) => {
          return ctx.prisma.material.create({
            data: {
              title: file.title,
              description: file.description,
              type: file.type,
              fileUrl: file.fileUrl,
              fileName: file.fileName,
              fileSize: file.fileSize,
              externalUrl: file.externalUrl,
              visibility,
              tags: tags || [],
              createdBy: ctx.user.id,
              ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
              ...(subjectId ? { subject: { connect: { id: subjectId } } } : {}),
              ...(topicId ? { topic: { connect: { id: topicId } } } : {}),
              ...(subTopicId ? { subTopic: { connect: { id: subTopicId } } } : {}),
              // Create group access records with nested write
              ...(visibility === 'GROUP_BASED' && groupIds?.length ? {
                groupAccess: {
                  create: groupIds.map((groupId) => ({
                    group: { connect: { id: groupId } }
                  }))
                }
              } : {}),
              // Create student access records with nested write
              ...(visibility === 'SELECTED_STUDENTS' && studentIds?.length ? {
                studentAccess: {
                  create: studentIds.map((studentId) => ({
                    student: { connect: { id: studentId } },
                    grantedBy: ctx.user.id,
                  }))
                }
              } : {}),
            },
          });
        })
      );

      // Send notifications for new materials (background)
      let targetUserIds: string[] = [];
      
      if (visibility === 'ALL_STUDENTS') {
        const allStudents = await ctx.prisma.student.findMany({
          where: { user: { isActive: true } },
          select: { userId: true },
        });
        targetUserIds = allStudents.map(s => s.userId);
      } else if (visibility === 'GROUP_BASED' && groupIds?.length) {
        const groupMembers = await ctx.prisma.groupMember.findMany({
          where: { groupId: { in: groupIds } },
          select: { student: { select: { userId: true } } },
        });
        targetUserIds = groupMembers.map(m => m.student.userId);
      } else if (visibility === 'SELECTED_STUDENTS' && studentIds?.length) {
        const students = await ctx.prisma.student.findMany({
          where: { id: { in: studentIds } },
          select: { userId: true },
        });
        targetUserIds = students.map(s => s.userId);
      }

      // Send one notification per material
      if (targetUserIds.length > 0) {
        const uniqueUserIds = [...new Set(targetUserIds)];
        for (const material of createdMaterials) {
          notificationService.notifyMaterialAvailable(ctx.prisma, {
            materialId: material.id,
            materialTitle: material.title,
            targetUserIds: uniqueUserIds,
          }).catch(err => {
            console.error('[Materials] Failed to send batch material notification:', err);
          });
        }
      }

      return {
        created: createdMaterials.length,
        materials: createdMaterials,
      };
    }),

  // Update material (staff: admin + collaborator)
  update: staffProcedure
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
      visibility: z.enum(['NONE', 'ALL_STUDENTS', 'GROUP_BASED', 'SELECTED_STUDENTS']).optional(),
      categoryIds: z.array(z.string()).optional(),     // Multiple container categories
      subjectId: z.string().optional().nullable(),      // Classification
      topicId: z.string().optional().nullable(),        // Classification
      subTopicId: z.string().optional().nullable(),     // Classification
      tags: z.array(z.string()).optional(),
      order: z.number().optional(),
      isActive: z.boolean().optional(),
      // For group-based visibility
      groupIds: z.array(z.string()).optional(),
      // For selected students visibility
      studentIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, groupIds, studentIds, subjectId, categoryIds, topicId, subTopicId, ...materialData } = input;

      // Get the current material to compare visibility changes
      const currentMaterial = await ctx.prisma.material.findUnique({
        where: { id },
        select: { 
          title: true, 
          visibility: true,
          groupAccess: { select: { groupId: true } },
          studentAccess: { select: { studentId: true } },
        },
      });

      if (!currentMaterial) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Materiale non trovato',
        });
      }

      const result = await ctx.prisma.$transaction(async () => {
        // First, handle categories - delete and recreate if provided
        if (categoryIds !== undefined) {
          await ctx.prisma.materialCategoryLink.deleteMany({
            where: { materialId: id },
          });
        }

        // Handle group access - delete and recreate if GROUP_BASED
        if (input.visibility === 'GROUP_BASED' && groupIds !== undefined) {
          await ctx.prisma.materialGroupAccess.deleteMany({
            where: { materialId: id },
          });
        }

        // Handle student access - delete and recreate if SELECTED_STUDENTS
        if (input.visibility === 'SELECTED_STUDENTS' && studentIds !== undefined) {
          await ctx.prisma.materialStudentAccess.deleteMany({
            where: { materialId: id },
          });
        }

        // Update material with all nested creates
        const material = await ctx.prisma.material.update({
          where: { id },
          data: {
            ...materialData,
            // Handle subject connection
            ...(subjectId !== undefined ? (
              subjectId ? { subject: { connect: { id: subjectId } } } : { subject: { disconnect: true } }
            ) : {}),
            // Handle topic connection
            ...(topicId !== undefined ? (
              topicId ? { topic: { connect: { id: topicId } } } : { topic: { disconnect: true } }
            ) : {}),
            // Handle subtopic connection
            ...(subTopicId !== undefined ? (
              subTopicId ? { subTopic: { connect: { id: subTopicId } } } : { subTopic: { disconnect: true } }
            ) : {}),
            // Handle categories - create new links
            ...(categoryIds !== undefined && categoryIds.length ? {
              categories: {
                create: categoryIds.map((categoryId) => ({
                  category: { connect: { id: categoryId } }
                }))
              }
            } : {}),
            // Handle group access - create new links
            ...(input.visibility === 'GROUP_BASED' && groupIds !== undefined && groupIds.length ? {
              groupAccess: {
                create: groupIds.map((groupId) => ({
                  group: { connect: { id: groupId } }
                }))
              }
            } : {}),
            // Handle student access - create new links
            ...(input.visibility === 'SELECTED_STUDENTS' && studentIds !== undefined && studentIds.length ? {
              studentAccess: {
                create: studentIds.map((studentId) => ({
                  student: { connect: { id: studentId } },
                  grantedBy: ctx.user.id,
                }))
              }
            } : {}),
          },
        });

        return { material, groupIds, studentIds };
      });

      // Send notifications for visibility changes (background, outside transaction)
      const newVisibility = input.visibility || currentMaterial.visibility;
      const oldVisibility = currentMaterial.visibility;
      const materialTitle = currentMaterial.title;
      
      // Determine which students should be notified (new recipients only)
      let targetUserIds: string[] = [];

      // Case 1: Visibility changed to ALL_STUDENTS
      if (newVisibility === 'ALL_STUDENTS' && oldVisibility !== 'ALL_STUDENTS') {
        const allStudents = await ctx.prisma.student.findMany({
          where: { user: { isActive: true } },
          select: { userId: true },
        });
        targetUserIds = allStudents.map(s => s.userId);
      }
      
      // Case 2: Visibility is GROUP_BASED and new groups were added
      if (newVisibility === 'GROUP_BASED' && groupIds !== undefined && groupIds.length > 0) {
        const oldGroupIds = currentMaterial.groupAccess.map(g => g.groupId);
        const newGroupIds = groupIds.filter(gid => !oldGroupIds.includes(gid));
        
        if (newGroupIds.length > 0) {
          const groupMembers = await ctx.prisma.groupMember.findMany({
            where: { groupId: { in: newGroupIds } },
            select: { student: { select: { userId: true } } },
          });
          targetUserIds = groupMembers.map(m => m.student.userId);
        }
      }
      
      // Case 3: Visibility is SELECTED_STUDENTS and new students were added
      if (newVisibility === 'SELECTED_STUDENTS' && studentIds !== undefined && studentIds.length > 0) {
        const oldStudentIds = currentMaterial.studentAccess.map(s => s.studentId);
        const newStudentIds = studentIds.filter(sid => !oldStudentIds.includes(sid));
        
        if (newStudentIds.length > 0) {
          const students = await ctx.prisma.student.findMany({
            where: { id: { in: newStudentIds } },
            select: { userId: true },
          });
          targetUserIds = students.map(s => s.userId);
        }
      }

      // Send notifications to new recipients
      if (targetUserIds.length > 0) {
        const uniqueUserIds = [...new Set(targetUserIds)];
        notificationService.notifyMaterialAvailable(ctx.prisma, {
          materialId: id,
          materialTitle: materialTitle,
          targetUserIds: uniqueUserIds,
        }).catch(err => {
          console.error('[Materials] Failed to send material update notification:', err);
        });
      }

      return result.material;
    }),

  // Delete material (staff: admin + collaborator)
  delete: staffProcedure
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
  addStudentAccess: staffProcedure
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
  removeStudentAccess: staffProcedure
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
  addGroupAccess: staffProcedure
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
  removeGroupAccess: staffProcedure
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
      categoryId: z.string().optional(),   // Container category filter
      subjectId: z.string().optional(),    // Classification filter
      topicId: z.string().optional(),      // Classification filter
      subTopicId: z.string().optional(),   // Classification filter
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

      // Get visible categories for this student
      const visibleCategories = await ctx.prisma.materialCategory.findMany({
        where: {
          isActive: true,
          OR: [
            { visibility: 'ALL_STUDENTS' },
            { 
              visibility: 'GROUP_BASED',
              groupAccess: { some: { groupId: { in: groupIds } } },
            },
            { 
              visibility: 'SELECTED_STUDENTS',
              studentAccess: { some: { studentId: student.id } },
            },
          ],
        },
        select: { id: true },
      });

      const visibleCategoryIds = visibleCategories.map(c => c.id);

      // Get materials visible to this student
      // A material is visible if:
      // 1. It has explicit visibility (ALL_STUDENTS, GROUP_BASED, SELECTED_STUDENTS)
      // 2. OR it belongs to a visible category (regardless of material visibility)
      const materials = await ctx.prisma.material.findMany({
        where: {
          isActive: true,
          type: input?.type,
          ...(input?.categoryId && {
            categories: {
              some: { categoryId: input.categoryId },
            },
          }),
          subjectId: input?.subjectId,
          topicId: input?.topicId,
          subTopicId: input?.subTopicId,
          OR: [
            // Materials with explicit visibility
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
            // Materials in visible categories (category acts as visibility container)
            visibleCategoryIds.length > 0
              ? {
                  categories: {
                    some: { categoryId: { in: visibleCategoryIds } },
                  },
                }
              : { id: 'never' },
          ],
        },
        orderBy: [
          { topic: { order: 'asc' } },
          { subTopic: { order: 'asc' } },
          { order: 'asc' },
          { createdAt: 'desc' },
        ],
        include: {
          categories: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  icon: true,
                  order: true,
                  visibility: true,
                },
              },
            },
          },
          topic: true,
          subTopic: true,
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
          categories: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  icon: true,
                  order: true,
                  visibility: true,
                },
              },
            },
          },
          topic: true,
          subTopic: true,
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

  // Get material statistics (staff: admin + collaborator) - cached
  getStats: staffProcedure.query(async ({ ctx }) => {
    const getCachedStats = createCachedQuery(
      async () => {
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
      },
      ['materials', 'stats'],
      { revalidate: CACHE_TIMES.MEDIUM }
    );

    return getCachedStats();
  }),
});
