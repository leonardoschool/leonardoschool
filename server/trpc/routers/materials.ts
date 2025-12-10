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
              courseAccess: true,
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
          courseAccess: {
            include: {
              template: true,
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
      visibility: z.enum(['ALL_STUDENTS', 'COURSE_BASED', 'SELECTED_STUDENTS']).default('ALL_STUDENTS'),
      categoryId: z.string().optional(),
      subjectId: z.string().optional(),
      tags: z.array(z.string()).optional(),
      order: z.number().optional(),
      // For course-based visibility
      courseIds: z.array(z.string()).optional(),
      // For selected students visibility
      studentIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { courseIds, studentIds, categoryId, subjectId, ...materialData } = input;

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

        // If COURSE_BASED, create course access records
        if (input.visibility === 'COURSE_BASED' && courseIds?.length) {
          await tx.materialCourseAccess.createMany({
            data: courseIds.map((templateId) => ({
              materialId: material.id,
              templateId,
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
      visibility: z.enum(['ALL_STUDENTS', 'COURSE_BASED', 'SELECTED_STUDENTS']).optional(),
      categoryId: z.string().optional().nullable(),
      subjectId: z.string().optional().nullable(),
      tags: z.array(z.string()).optional(),
      order: z.number().optional(),
      isActive: z.boolean().optional(),
      // For course-based visibility
      courseIds: z.array(z.string()).optional(),
      // For selected students visibility
      studentIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, courseIds, studentIds, subjectId, categoryId, ...materialData } = input;

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

        // If visibility changed to COURSE_BASED, update course access
        if (input.visibility === 'COURSE_BASED' && courseIds !== undefined) {
          // Remove existing course access
          await tx.materialCourseAccess.deleteMany({
            where: { materialId: id },
          });
          
          // Add new course access
          if (courseIds.length) {
            await tx.materialCourseAccess.createMany({
              data: courseIds.map((templateId) => ({
                materialId: id,
                templateId,
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

  // Add course access to a material
  addCourseAccess: adminProcedure
    .input(z.object({
      materialId: z.string(),
      templateIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.materialCourseAccess.createMany({
        data: input.templateIds.map((templateId) => ({
          materialId: input.materialId,
          templateId,
        })),
        skipDuplicates: true,
      });
    }),

  // Remove course access from a material
  removeCourseAccess: adminProcedure
    .input(z.object({
      materialId: z.string(),
      templateId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.materialCourseAccess.delete({
        where: {
          materialId_templateId: {
            materialId: input.materialId,
            templateId: input.templateId,
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
      // First, get the student and their signed contract
      const student = await ctx.prisma.student.findUnique({
        where: { userId: ctx.user.id },
        include: {
          contracts: {
            where: { status: 'SIGNED' },
            orderBy: { signedAt: 'desc' },
            take: 1,
            select: { templateId: true },
          },
        },
      });

      if (!student) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Studente non trovato',
        });
      }

      // Get the template ID from the most recent signed contract
      const templateId = student.contracts[0]?.templateId;

      // Get materials visible to this student
      const materials = await ctx.prisma.material.findMany({
        where: {
          isActive: true,
          type: input?.type,
          categoryId: input?.categoryId,
          OR: [
            // All students visibility
            { visibility: 'ALL_STUDENTS' },
            // Course-based (if student has a contract)
            templateId
              ? {
                  visibility: 'COURSE_BASED',
                  courseAccess: {
                    some: { templateId },
                  },
                }
              : { id: 'never' }, // No match if no template
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
          contracts: {
            where: { status: 'SIGNED' },
            orderBy: { signedAt: 'desc' },
            take: 1,
            select: { templateId: true },
          },
        },
      });

      if (!student) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Studente non trovato',
        });
      }

      const templateId = student.contracts[0]?.templateId;

      const material = await ctx.prisma.material.findFirst({
        where: {
          id: input.id,
          isActive: true,
          OR: [
            { visibility: 'ALL_STUDENTS' },
            templateId
              ? {
                  visibility: 'COURSE_BASED',
                  courseAccess: {
                    some: { templateId },
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
