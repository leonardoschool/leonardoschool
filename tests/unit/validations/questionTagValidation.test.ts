/**
 * Tests for lib/validations/questionTagValidation.ts
 *
 * Tests for question tag-related Zod schemas.
 */

import { describe, it, expect } from 'vitest';
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

describe('questionTagValidation.ts', () => {
  describe('createTagCategorySchema', () => {
    it('should accept valid category data', () => {
      const result = createTagCategorySchema.safeParse({
        name: 'Biologia',
        description: 'Domande di biologia',
        color: '#D54F8A',
        order: 1,
      });
      expect(result.success).toBe(true);
    });

    it('should accept minimal data', () => {
      const result = createTagCategorySchema.safeParse({
        name: 'Test',
      });
      expect(result.success).toBe(true);
      expect(result.data?.order).toBe(0);
    });

    it('should reject empty name', () => {
      const result = createTagCategorySchema.safeParse({
        name: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject name too short', () => {
      const result = createTagCategorySchema.safeParse({
        name: 'A',
      });
      expect(result.success).toBe(false);
    });

    it('should reject name too long', () => {
      const result = createTagCategorySchema.safeParse({
        name: 'A'.repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it('should accept description up to 500 chars', () => {
      const result = createTagCategorySchema.safeParse({
        name: 'Test',
        description: 'A'.repeat(500),
      });
      expect(result.success).toBe(true);
    });

    it('should reject description over 500 chars', () => {
      const result = createTagCategorySchema.safeParse({
        name: 'Test',
        description: 'A'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should validate hex color format', () => {
      expect(
        createTagCategorySchema.safeParse({ name: 'Test', color: '#FF0000' }).success
      ).toBe(true);
      expect(
        createTagCategorySchema.safeParse({ name: 'Test', color: '#abc123' }).success
      ).toBe(true);
      expect(
        createTagCategorySchema.safeParse({ name: 'Test', color: 'red' }).success
      ).toBe(false);
      expect(
        createTagCategorySchema.safeParse({ name: 'Test', color: '#FFF' }).success
      ).toBe(false);
    });

    it('should accept valid order', () => {
      expect(
        createTagCategorySchema.safeParse({ name: 'Test', order: 0 }).success
      ).toBe(true);
      expect(
        createTagCategorySchema.safeParse({ name: 'Test', order: 100 }).success
      ).toBe(true);
    });

    it('should reject negative order', () => {
      expect(
        createTagCategorySchema.safeParse({ name: 'Test', order: -1 }).success
      ).toBe(false);
    });
  });

  describe('updateTagCategorySchema', () => {
    it('should require id', () => {
      const result = updateTagCategorySchema.safeParse({
        name: 'Updated',
      });
      expect(result.success).toBe(false);
    });

    it('should accept only id', () => {
      const result = updateTagCategorySchema.safeParse({
        id: 'category-id',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all updateable fields', () => {
      const result = updateTagCategorySchema.safeParse({
        id: 'category-id',
        name: 'Updated Name',
        description: 'Updated description',
        color: '#123456',
        order: 5,
        isActive: false,
      });
      expect(result.success).toBe(true);
    });

    it('should accept null for optional fields', () => {
      const result = updateTagCategorySchema.safeParse({
        id: 'category-id',
        description: null,
        color: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createTagSchema', () => {
    it('should accept valid tag data', () => {
      const result = createTagSchema.safeParse({
        name: 'Cellula',
        description: 'Domande sulla cellula',
        color: '#00FF00',
        categoryId: 'cat-123',
      });
      expect(result.success).toBe(true);
    });

    it('should accept minimal data', () => {
      const result = createTagSchema.safeParse({
        name: 'Tag',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = createTagSchema.safeParse({
        name: '',
      });
      expect(result.success).toBe(false);
    });

    it('should accept name up to 100 chars', () => {
      const result = createTagSchema.safeParse({
        name: 'A'.repeat(100),
      });
      expect(result.success).toBe(true);
    });

    it('should reject name over 100 chars', () => {
      const result = createTagSchema.safeParse({
        name: 'A'.repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it('should validate color format', () => {
      expect(
        createTagSchema.safeParse({ name: 'Test', color: '#AABBCC' }).success
      ).toBe(true);
      expect(
        createTagSchema.safeParse({ name: 'Test', color: 'blue' }).success
      ).toBe(false);
    });
  });

  describe('updateTagSchema', () => {
    it('should require id', () => {
      const result = updateTagSchema.safeParse({
        name: 'Updated',
      });
      expect(result.success).toBe(false);
    });

    it('should accept only id', () => {
      const result = updateTagSchema.safeParse({
        id: 'tag-id',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all updateable fields', () => {
      const result = updateTagSchema.safeParse({
        id: 'tag-id',
        name: 'Updated Tag',
        description: 'Updated desc',
        color: '#FFFFFF',
        categoryId: 'new-cat-id',
        isActive: true,
      });
      expect(result.success).toBe(true);
    });

    it('should accept null categoryId', () => {
      const result = updateTagSchema.safeParse({
        id: 'tag-id',
        categoryId: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('assignTagSchema', () => {
    it('should accept valid assignment', () => {
      const result = assignTagSchema.safeParse({
        questionId: 'question-123',
        tagId: 'tag-456',
      });
      expect(result.success).toBe(true);
    });

    it('should require questionId', () => {
      const result = assignTagSchema.safeParse({
        tagId: 'tag-456',
      });
      expect(result.success).toBe(false);
    });

    it('should require tagId', () => {
      const result = assignTagSchema.safeParse({
        questionId: 'question-123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('bulkAssignTagsSchema', () => {
    it('should accept valid bulk assignment', () => {
      const result = bulkAssignTagsSchema.safeParse({
        questionId: 'question-123',
        tagIds: ['tag-1', 'tag-2', 'tag-3'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty tagIds array', () => {
      const result = bulkAssignTagsSchema.safeParse({
        questionId: 'question-123',
        tagIds: [],
      });
      expect(result.success).toBe(true);
    });

    it('should require questionId', () => {
      const result = bulkAssignTagsSchema.safeParse({
        tagIds: ['tag-1'],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('unassignTagSchema', () => {
    it('should accept valid unassignment', () => {
      const result = unassignTagSchema.safeParse({
        questionId: 'question-123',
        tagId: 'tag-456',
      });
      expect(result.success).toBe(true);
    });

    it('should require both IDs', () => {
      expect(unassignTagSchema.safeParse({ questionId: 'q' }).success).toBe(false);
      expect(unassignTagSchema.safeParse({ tagId: 't' }).success).toBe(false);
    });
  });

  describe('replaceQuestionTagsSchema', () => {
    it('should accept valid replacement', () => {
      const result = replaceQuestionTagsSchema.safeParse({
        questionId: 'question-123',
        tagIds: ['tag-1', 'tag-2'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty tagIds to remove all tags', () => {
      const result = replaceQuestionTagsSchema.safeParse({
        questionId: 'question-123',
        tagIds: [],
      });
      expect(result.success).toBe(true);
    });

    it('should require questionId', () => {
      const result = replaceQuestionTagsSchema.safeParse({
        tagIds: ['tag-1'],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('listTagsFilterSchema', () => {
    it('should accept empty filter', () => {
      const result = listTagsFilterSchema.safeParse({});
      expect(result.success).toBe(true);
      expect(result.data?.page).toBe(1);
      expect(result.data?.pageSize).toBe(50);
      expect(result.data?.includeInactive).toBe(false);
    });

    it('should accept categoryId filter', () => {
      const result = listTagsFilterSchema.safeParse({
        categoryId: 'cat-123',
      });
      expect(result.success).toBe(true);
    });

    it('should accept uncategorized filter', () => {
      const result = listTagsFilterSchema.safeParse({
        uncategorized: true,
      });
      expect(result.success).toBe(true);
    });

    it('should accept search filter', () => {
      const result = listTagsFilterSchema.safeParse({
        search: 'biologia',
      });
      expect(result.success).toBe(true);
    });

    it('should accept includeInactive filter', () => {
      const result = listTagsFilterSchema.safeParse({
        includeInactive: true,
      });
      expect(result.success).toBe(true);
    });

    it('should accept pagination', () => {
      const result = listTagsFilterSchema.safeParse({
        page: 5,
        pageSize: 100,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid pageSize', () => {
      expect(listTagsFilterSchema.safeParse({ pageSize: 0 }).success).toBe(false);
      expect(listTagsFilterSchema.safeParse({ pageSize: 201 }).success).toBe(false);
    });

    it('should reject invalid page', () => {
      expect(listTagsFilterSchema.safeParse({ page: 0 }).success).toBe(false);
      expect(listTagsFilterSchema.safeParse({ page: -1 }).success).toBe(false);
    });
  });

  describe('listCategoriesFilterSchema', () => {
    it('should accept empty filter', () => {
      const result = listCategoriesFilterSchema.safeParse({});
      expect(result.success).toBe(true);
      expect(result.data?.includeInactive).toBe(false);
    });

    it('should accept search filter', () => {
      const result = listCategoriesFilterSchema.safeParse({
        search: 'chimica',
      });
      expect(result.success).toBe(true);
    });

    it('should accept includeInactive filter', () => {
      const result = listCategoriesFilterSchema.safeParse({
        includeInactive: true,
      });
      expect(result.success).toBe(true);
    });
  });
});
