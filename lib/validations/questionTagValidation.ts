/**
 * Validation schemas for question tags
 */
import { z } from 'zod';

// ==================== TAG CATEGORIES ====================

// Create category schema
export const createTagCategorySchema = z.object({
  name: z.string().min(2, 'Il nome deve essere di almeno 2 caratteri').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Colore non valido (formato: #RRGGBB)').optional(),
  order: z.number().int().min(0).default(0),
});

// Update category schema
export const updateTagCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// ==================== TAGS ====================

// Create tag schema
export const createTagSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Colore non valido').optional(),
  categoryId: z.string().optional(),
});

// Update tag schema
export const updateTagSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  categoryId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// ==================== TAG ASSIGNMENTS ====================

// Assign tag to question
export const assignTagSchema = z.object({
  questionId: z.string(),
  tagId: z.string(),
});

// Bulk assign tags to question
export const bulkAssignTagsSchema = z.object({
  questionId: z.string(),
  tagIds: z.array(z.string()),
});

// Unassign tag from question
export const unassignTagSchema = z.object({
  questionId: z.string(),
  tagId: z.string(),
});

// Replace all tags on a question
export const replaceQuestionTagsSchema = z.object({
  questionId: z.string(),
  tagIds: z.array(z.string()),
});

// ==================== FILTERS ====================

// List tags filter
export const listTagsFilterSchema = z.object({
  categoryId: z.string().optional(),
  uncategorized: z.boolean().optional(), // Filter only tags without category
  search: z.string().optional(),
  includeInactive: z.boolean().default(false),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(200).default(50),
});

// List categories filter
export const listCategoriesFilterSchema = z.object({
  search: z.string().optional(),
  includeInactive: z.boolean().default(false),
});

// ==================== TYPES ====================

export type CreateTagCategoryInput = z.infer<typeof createTagCategorySchema>;
export type UpdateTagCategoryInput = z.infer<typeof updateTagCategorySchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type AssignTagInput = z.infer<typeof assignTagSchema>;
export type BulkAssignTagsInput = z.infer<typeof bulkAssignTagsSchema>;
export type ReplaceQuestionTagsInput = z.infer<typeof replaceQuestionTagsSchema>;
export type ListTagsFilterInput = z.infer<typeof listTagsFilterSchema>;
export type ListCategoriesFilterInput = z.infer<typeof listCategoriesFilterSchema>;
