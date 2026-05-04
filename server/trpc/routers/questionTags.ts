/**
 * Question Tags Router - Manage question tag categories and tags
 */
import { router, staffProcedure, adminProcedure } from '../init';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  createTagCategorySchema,
  updateTagCategorySchema,
  createTagSchema,
  updateTagSchema,
  assignTagSchema,
  bulkAssignTagsSchema,
  unassignTagSchema,
  replaceQuestionTagsSchema,
  listTagsFilterSchema,
  listCategoriesFilterSchema,
} from '@/lib/validations/questionTagValidation';
import type { Prisma } from '@prisma/client';
import { createCachedQuery, CACHE_TIMES, CACHE_TAGS } from '@/lib/cache/serverCache';

export const questionTagsRouter = router({
  // ==================== CATEGORIES ====================

  /**
   * Get all tag categories with their tags
   */
  getCategories: staffProcedure
    .input(listCategoriesFilterSchema.optional())
    .query(async ({ ctx, input }) => {
      const includeInactive = input?.includeInactive || false;
      const search = input?.search || '';
      
      // Cache for 15 minutes - categories and tags change infrequently
      const getCachedCategories = createCachedQuery(
        async () => {
          const where: Prisma.QuestionTagCategoryWhereInput = {};

          if (!includeInactive) {
            where.isActive = true;
          }

          if (search) {
            where.name = { contains: search, mode: 'insensitive' };
          }

          const categories = await ctx.prisma.questionTagCategory.findMany({
            where,
            orderBy: [{ order: 'asc' }, { name: 'asc' }],
            include: {
              tags: {
                where: includeInactive ? {} : { isActive: true },
                orderBy: { name: 'asc' },
                select: {
                  id: true,
                  name: true,
                  description: true,
                  color: true,
                  categoryId: true,
                  isActive: true,
                  createdBy: true,
                  _count: {
                    select: { questions: true },
                  },
                },
              },
              _count: {
                select: { tags: true },
              },
            },
          });

          return categories;
        },
        [CACHE_TAGS.TAGS, 'categories', `inactive-${includeInactive}`, `search-${search}`],
        { revalidate: CACHE_TIMES.LONG } // 15 minutes
      );

      return await getCachedCategories();
    }),

  /**
   * Get a single category by ID
   */
  getCategory: staffProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const category = await ctx.prisma.questionTagCategory.findUnique({
        where: { id: input.id },
        include: {
          tags: {
            orderBy: { name: 'asc' },
            include: {
              _count: {
                select: { questions: true },
              },
            },
          },
        },
      });

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Categoria non trovata',
        });
      }

      return category;
    }),

  /**
   * Create a new tag category (staff - collaborators can create, admins can manage all)
   */
  createCategory: staffProcedure
    .input(createTagCategorySchema)
    .mutation(async ({ ctx, input }) => {
      // Check if name already exists
      const existing = await ctx.prisma.questionTagCategory.findUnique({
        where: { name: input.name },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Esiste già una categoria con questo nome',
        });
      }

      const category = await ctx.prisma.questionTagCategory.create({
        data: {
          name: input.name,
          description: input.description,
          color: input.color,
          order: input.order,
          createdBy: ctx.user.id,
        },
      });

      return category;
    }),

  /**
   * Update a tag category (staff - collaborators can only update their own)
   */
  updateCategory: staffProcedure
    .input(updateTagCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Check if category exists
      const existing = await ctx.prisma.questionTagCategory.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Categoria non trovata',
        });
      }

      // Collaborators can only update their own categories
      if (ctx.user.role === 'COLLABORATOR' && existing.createdBy !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Puoi modificare solo le categorie che hai creato.',
        });
      }

      // Check name uniqueness if changing
      if (data.name && data.name !== existing.name) {
        const nameExists = await ctx.prisma.questionTagCategory.findUnique({
          where: { name: data.name },
        });
        if (nameExists) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Esiste già una categoria con questo nome',
          });
        }
      }

      const category = await ctx.prisma.questionTagCategory.update({
        where: { id },
        data,
      });

      return category;
    }),

  /**
   * Delete a tag category (staff - collaborators can only delete their own)
   * Will unlink tags from this category but not delete them
   */
  deleteCategory: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const category = await ctx.prisma.questionTagCategory.findUnique({
        where: { id: input.id },
        include: { _count: { select: { tags: true } } },
      });

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Categoria non trovata',
        });
      }

      // Collaborators can only delete their own categories
      if (ctx.user.role === 'COLLABORATOR' && category.createdBy !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Puoi eliminare solo le categorie che hai creato.',
        });
      }

      // Delete category (tags will have categoryId set to null due to onDelete: SetNull)
      await ctx.prisma.questionTagCategory.delete({
        where: { id: input.id },
      });

      return { success: true, unlinkedTags: category._count.tags };
    }),

  // ==================== TAGS ====================

  /**
   * Get all tags (optionally filtered)
   */
  getTags: staffProcedure
    .input(listTagsFilterSchema.optional())
    .query(async ({ ctx, input }) => {
      const where: Prisma.QuestionTagWhereInput = {};

      if (!input?.includeInactive) {
        where.isActive = true;
      }

      if (input?.categoryId) {
        where.categoryId = input.categoryId;
      }

      // Filter only tags without category
      if (input?.uncategorized) {
        where.categoryId = null;
      }

      if (input?.search) {
        where.OR = [
          { name: { contains: input.search, mode: 'insensitive' } },
          { description: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      const page = input?.page || 1;
      const pageSize = input?.pageSize || 50;

      const [total, tags] = await Promise.all([
        ctx.prisma.questionTag.count({ where }),
        ctx.prisma.questionTag.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [{ category: { order: 'asc' } }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
            categoryId: true,
            isActive: true,
            createdBy: true,
            category: {
              select: { id: true, name: true, color: true },
            },
            _count: {
              select: { questions: true },
            },
          },
        }),
      ]);

      return {
        tags,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  /**
   * Get a single tag by ID
   */
  getTag: staffProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const tag = await ctx.prisma.questionTag.findUnique({
        where: { id: input.id },
        include: {
          category: true,
          _count: {
            select: { questions: true },
          },
        },
      });

      if (!tag) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tag non trovato',
        });
      }

      return tag;
    }),

  /**
   * Create a new tag (staff - collaborators can create, admins can manage all)
   */
  createTag: staffProcedure
    .input(createTagSchema)
    .mutation(async ({ ctx, input }) => {
      // Check uniqueness within category
      const existing = await ctx.prisma.questionTag.findFirst({
        where: {
          name: input.name,
          categoryId: input.categoryId || null,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: input.categoryId 
            ? 'Esiste già un tag con questo nome in questa categoria' 
            : 'Esiste già un tag senza categoria con questo nome',
        });
      }

      // Verify category exists if provided
      if (input.categoryId) {
        const category = await ctx.prisma.questionTagCategory.findUnique({
          where: { id: input.categoryId },
        });
        if (!category) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Categoria non trovata',
          });
        }
      }

      const tag = await ctx.prisma.questionTag.create({
        data: {
          name: input.name,
          description: input.description,
          color: input.color,
          categoryId: input.categoryId,
          createdBy: ctx.user.id,
        },
        include: {
          category: {
            select: { id: true, name: true, color: true },
          },
        },
      });

      return tag;
    }),

  /**
   * Update a tag (staff - collaborators can only update their own)
   */
  updateTag: staffProcedure
    .input(updateTagSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await ctx.prisma.questionTag.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tag non trovato',
        });
      }

      // Collaborators can only update their own tags
      if (ctx.user.role === 'COLLABORATOR' && existing.createdBy !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Puoi modificare solo i tag che hai creato.',
        });
      }

      // Check name uniqueness if changing
      const newCategoryId = data.categoryId !== undefined ? data.categoryId : existing.categoryId;
      const newName = data.name || existing.name;

      if (newName !== existing.name || newCategoryId !== existing.categoryId) {
        const nameExists = await ctx.prisma.questionTag.findFirst({
          where: {
            name: newName,
            categoryId: newCategoryId,
            id: { not: id },
          },
        });
        if (nameExists) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Esiste già un tag con questo nome in questa categoria',
          });
        }
      }

      const tag = await ctx.prisma.questionTag.update({
        where: { id },
        data,
        include: {
          category: {
            select: { id: true, name: true, color: true },
          },
        },
      });

      return tag;
    }),

  /**
   * Delete a tag (staff - collaborators can only delete their own)
   * Will remove all assignments first
   */
  deleteTag: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tag = await ctx.prisma.questionTag.findUnique({
        where: { id: input.id },
        include: { _count: { select: { questions: true } } },
      });

      if (!tag) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tag non trovato',
        });
      }

      // Collaborators can only delete their own tags
      if (ctx.user.role === 'COLLABORATOR' && tag.createdBy !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Puoi eliminare solo i tag che hai creato.',
        });
      }

      // Delete tag (assignments will cascade delete)
      await ctx.prisma.questionTag.delete({
        where: { id: input.id },
      });

      return { success: true, removedAssignments: tag._count.questions };
    }),

  // ==================== TAG ASSIGNMENTS ====================

  /**
   * Get tags assigned to a question
   */
  getQuestionTags: staffProcedure
    .input(z.object({ questionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const assignments = await ctx.prisma.questionTagAssignment.findMany({
        where: { questionId: input.questionId },
        include: {
          tag: {
            include: {
              category: {
                select: { id: true, name: true, color: true },
              },
            },
          },
        },
        orderBy: { tag: { name: 'asc' } },
      });

      return assignments.map(a => a.tag);
    }),

  /**
   * Assign a tag to a question
   */
  assignTag: staffProcedure
    .input(assignTagSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if question exists
      const question = await ctx.prisma.question.findUnique({
        where: { id: input.questionId },
      });
      if (!question) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Domanda non trovata',
        });
      }

      // Check if tag exists and is active
      const tag = await ctx.prisma.questionTag.findUnique({
        where: { id: input.tagId },
      });
      if (!tag) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tag non trovato',
        });
      }
      if (!tag.isActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Non è possibile assegnare un tag disattivato',
        });
      }

      // Check if already assigned
      const existing = await ctx.prisma.questionTagAssignment.findUnique({
        where: {
          questionId_tagId: {
            questionId: input.questionId,
            tagId: input.tagId,
          },
        },
      });
      if (existing) {
        return { success: true, alreadyAssigned: true };
      }

      await ctx.prisma.questionTagAssignment.create({
        data: {
          questionId: input.questionId,
          tagId: input.tagId,
          assignedBy: ctx.user.id,
        },
      });

      return { success: true, alreadyAssigned: false };
    }),

  /**
   * Bulk assign tags to a question
   */
  bulkAssignTags: staffProcedure
    .input(bulkAssignTagsSchema)
    .mutation(async ({ ctx, input }) => {
      const { questionId, tagIds } = input;

      // Check if question exists
      const question = await ctx.prisma.question.findUnique({
        where: { id: questionId },
      });
      if (!question) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Domanda non trovata',
        });
      }

      // Verify all tags exist and are active
      const tags = await ctx.prisma.questionTag.findMany({
        where: { id: { in: tagIds }, isActive: true },
      });
      if (tags.length !== tagIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Alcuni tag non esistono o sono disattivati',
        });
      }

      // Get existing assignments
      const existing = await ctx.prisma.questionTagAssignment.findMany({
        where: { questionId },
        select: { tagId: true },
      });
      const existingTagIds = new Set(existing.map(e => e.tagId));

      // Filter out already assigned
      const newTagIds = tagIds.filter(id => !existingTagIds.has(id));

      if (newTagIds.length === 0) {
        return { success: true, addedCount: 0 };
      }

      await ctx.prisma.questionTagAssignment.createMany({
        data: newTagIds.map(tagId => ({
          questionId,
          tagId,
          assignedBy: ctx.user.id,
        })),
      });

      return { success: true, addedCount: newTagIds.length };
    }),

  /**
   * Unassign a tag from a question
   */
  unassignTag: staffProcedure
    .input(unassignTagSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.questionTagAssignment.deleteMany({
        where: {
          questionId: input.questionId,
          tagId: input.tagId,
        },
      });

      return { success: true, removed: result.count > 0 };
    }),

  /**
   * Replace all tags on a question (atomic operation)
   */
  replaceQuestionTags: staffProcedure
    .input(replaceQuestionTagsSchema)
    .mutation(async ({ ctx, input }) => {
      const { questionId, tagIds } = input;

      // Check if question exists
      const question = await ctx.prisma.question.findUnique({
        where: { id: questionId },
      });
      if (!question) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Domanda non trovata',
        });
      }

      // Verify all tags exist and are active
      if (tagIds.length > 0) {
        const tags = await ctx.prisma.questionTag.findMany({
          where: { id: { in: tagIds }, isActive: true },
        });
        if (tags.length !== tagIds.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Alcuni tag non esistono o sono disattivati',
          });
        }
      }

      // Use array-based transaction to replace all tags
      const operations = [
        // Remove all existing
        ctx.prisma.questionTagAssignment.deleteMany({
          where: { questionId },
        }),
      ];

      // Add new ones
      if (tagIds.length > 0) {
        operations.push(
          ctx.prisma.questionTagAssignment.createMany({
            data: tagIds.map(tagId => ({
              questionId,
              tagId,
              assignedBy: ctx.user.id,
            })),
          }) as never // Type assertion needed for mixed array
        );
      }

      await ctx.prisma.$transaction(operations);

      return { success: true, newTagCount: tagIds.length };
    }),

  // ==================== UTILITIES ====================

  /**
   * Get tag statistics (admin only)
   */
  getStats: adminProcedure
    .query(async ({ ctx }) => {
      const [
        totalCategories,
        activeCategories,
        totalTags,
        activeTags,
        totalAssignments,
        tagsWithoutCategory,
        unusedTags,
      ] = await Promise.all([
        ctx.prisma.questionTagCategory.count(),
        ctx.prisma.questionTagCategory.count({ where: { isActive: true } }),
        ctx.prisma.questionTag.count(),
        ctx.prisma.questionTag.count({ where: { isActive: true } }),
        ctx.prisma.questionTagAssignment.count(),
        ctx.prisma.questionTag.count({ where: { categoryId: null } }),
        ctx.prisma.questionTag.count({
          where: {
            questions: { none: {} },
          },
        }),
      ]);

      // Top used tags
      const topTags = await ctx.prisma.questionTag.findMany({
        take: 10,
        orderBy: {
          questions: { _count: 'desc' },
        },
        include: {
          category: { select: { name: true } },
          _count: { select: { questions: true } },
        },
      });

      return {
        categories: { total: totalCategories, active: activeCategories },
        tags: { total: totalTags, active: activeTags, uncategorized: tagsWithoutCategory, unused: unusedTags },
        assignments: { total: totalAssignments },
        topTags: topTags.map(t => ({
          id: t.id,
          name: t.name,
          category: t.category?.name,
          usageCount: t._count.questions,
        })),
      };
    }),

  /**
   * Migrate legacy tags to new tag system (admin only)
   * Finds questions with legacyTags and suggests or creates new tags
   */
  migrateLegacyTags: adminProcedure
    .input(z.object({
      dryRun: z.boolean().default(true),
      categoryId: z.string().optional(), // Category to assign new tags to
    }))
    .mutation(async ({ ctx, input }) => {
      // Get all unique legacy tags
      const questionsWithLegacyTags = await ctx.prisma.question.findMany({
        where: {
          legacyTags: { isEmpty: false },
        },
        select: { id: true, legacyTags: true },
      });

      if (questionsWithLegacyTags.length === 0) {
        return {
          message: 'Nessuna domanda con tag legacy trovata',
          questionsProcessed: 0,
          uniqueLegacyTags: [],
          tagsCreated: 0,
          assignmentsCreated: 0,
        };
      }

      // Collect all unique legacy tags
      const legacyTagSet = new Set<string>();
      for (const q of questionsWithLegacyTags) {
        for (const tag of q.legacyTags) {
          legacyTagSet.add(tag.trim());
        }
      }
      const uniqueLegacyTags = Array.from(legacyTagSet).filter(t => t.length > 0);

      if (input.dryRun) {
        return {
          message: 'Dry run completato',
          questionsProcessed: questionsWithLegacyTags.length,
          uniqueLegacyTags,
          tagsToCreate: uniqueLegacyTags.length,
          assignmentsToCreate: questionsWithLegacyTags.reduce((sum, q) => sum + q.legacyTags.length, 0),
        };
      }

      // Create tags and assignments
      let tagsCreated = 0;
      let assignmentsCreated = 0;

      for (const tagName of uniqueLegacyTags) {
        // Check if tag already exists
        let tag = await ctx.prisma.questionTag.findFirst({
          where: { name: tagName },
        });

        if (!tag) {
          tag = await ctx.prisma.questionTag.create({
            data: {
              name: tagName,
              categoryId: input.categoryId,
              createdBy: ctx.user.id,
            },
          });
          tagsCreated++;
        }

        // Find all questions with this legacy tag
        for (const q of questionsWithLegacyTags) {
          if (q.legacyTags.includes(tagName)) {
            // Check if assignment exists
            const existingAssignment = await ctx.prisma.questionTagAssignment.findUnique({
              where: {
                questionId_tagId: { questionId: q.id, tagId: tag.id },
              },
            });

            if (!existingAssignment) {
              await ctx.prisma.questionTagAssignment.create({
                data: {
                  questionId: q.id,
                  tagId: tag.id,
                  assignedBy: ctx.user.id,
                },
              });
              assignmentsCreated++;
            }
          }
        }
      }

      return {
        message: 'Migrazione completata',
        questionsProcessed: questionsWithLegacyTags.length,
        uniqueLegacyTags,
        tagsCreated,
        assignmentsCreated,
      };
    }),
});
