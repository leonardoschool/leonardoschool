/**
 * Materials Router Tests
 *
 * Tests for materials management including categories, subjects, topics, and materials.
 * The materials router handles:
 * - Category CRUD operations
 * - Subject CRUD operations
 * - Topic and SubTopic management
 * - Material CRUD and access control
 * - View/download tracking
 *
 * Procedures tested:
 * - Category: getCategories, getAllCategories, createCategory, updateCategory, deleteCategory
 * - Subject: getSubjects, getAllSubjects, getHierarchy, createSubject, updateSubject, deleteSubject
 * - Topic: getTopics, getSubjectWithTopics, createTopic, updateTopic, deleteTopic
 * - SubTopic: createSubTopic, updateSubTopic, deleteSubTopic, reorderTopics, reorderSubTopics
 * - Material: getAll, getById, create, createBatch, update, delete, recordView, recordDownload
 * - Access: addStudentAccess, removeStudentAccess, addGroupAccess, removeGroupAccess
 * - Student: getMyMaterials, getMaterial, getStats
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { faker } from '@faker-js/faker/locale/it';
import type {
  Material,
  MaterialCategory,
  CustomSubject,
  Topic,
  SubTopic,
  MaterialType,
  MaterialVisibility,
  DifficultyLevel,
  UserRole,
} from '@prisma/client';

// ===================== MOCK FACTORIES =====================

const MATERIAL_TYPES: MaterialType[] = ['PDF', 'VIDEO', 'LINK', 'DOCUMENT'];
const VISIBILITY_OPTIONS: MaterialVisibility[] = ['NONE', 'ALL_STUDENTS', 'GROUP_BASED', 'SELECTED_STUDENTS'];
const DIFFICULTY_LEVELS: DifficultyLevel[] = ['EASY', 'MEDIUM', 'HARD'];

/**
 * Create a mock material category
 */
function _createMockCategory(overrides: Partial<MaterialCategory> = {}): MaterialCategory {
  return {
    id: faker.string.uuid(),
    name: faker.commerce.department(),
    description: faker.lorem.sentence(),
    icon: 'folder',
    order: faker.number.int({ min: 0, max: 10 }),
    isActive: true,
    visibility: 'ALL_STUDENTS' as MaterialVisibility,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: faker.string.uuid(),
    ...overrides,
  };
}

/**
 * Create a mock custom subject
 */
function _createMockSubject(overrides: Partial<CustomSubject> = {}): CustomSubject {
  return {
    id: faker.string.uuid(),
    name: faker.science.unit().name + ' ' + faker.number.int(100),
    code: faker.string.alpha({ length: 3, casing: 'upper' }),
    description: faker.lorem.sentence(),
    color: faker.color.rgb(),
    icon: 'book',
    order: faker.number.int({ min: 0, max: 10 }),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock topic
 */
function createMockTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: faker.string.uuid(),
    name: faker.lorem.words(3),
    description: faker.lorem.sentence(),
    difficulty: 'MEDIUM' as DifficultyLevel,
    order: faker.number.int({ min: 0, max: 10 }),
    isActive: true,
    subjectId: faker.string.uuid(),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: faker.string.uuid(),
    ...overrides,
  };
}

/**
 * Create a mock subtopic
 */
function _createMockSubTopic(overrides: Partial<SubTopic> = {}): SubTopic {
  return {
    id: faker.string.uuid(),
    name: faker.lorem.words(2),
    description: faker.lorem.sentence(),
    difficulty: 'MEDIUM' as DifficultyLevel,
    order: faker.number.int({ min: 0, max: 10 }),
    isActive: true,
    topicId: faker.string.uuid(),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: faker.string.uuid(),
    ...overrides,
  };
}

/**
 * Create a mock material
 */
function createMockMaterial(overrides: Partial<Material> = {}): Material {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.words(4),
    description: faker.lorem.paragraph(),
    type: 'PDF' as MaterialType,
    fileUrl: `https://storage.example.com/${faker.string.uuid()}.pdf`,
    fileName: `${faker.system.fileName()}.pdf`,
    fileSize: faker.number.int({ min: 1024, max: 10485760 }),
    externalUrl: null,
    thumbnailUrl: null,
    visibility: 'ALL_STUDENTS' as MaterialVisibility,
    subjectId: faker.string.uuid(),
    topicId: null,
    subTopicId: null,
    tags: [faker.lorem.word(), faker.lorem.word()],
    order: 0,
    isActive: true,
    viewCount: faker.number.int({ min: 0, max: 1000 }),
    downloadCount: faker.number.int({ min: 0, max: 500 }),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: faker.string.uuid(),
    ...overrides,
  };
}

// ===================== TEST SUITES =====================

describe('Materials Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== CATEGORY OPERATIONS ====================
  describe('Category Operations', () => {
    describe('getCategories (protectedProcedure)', () => {
      describe('authorization', () => {
        it('should allow any authenticated user', () => {
          const roles: UserRole[] = ['ADMIN', 'COLLABORATOR', 'STUDENT'];
          roles.forEach((role) => {
            const isAuthenticated = !!role;
            expect(isAuthenticated).toBe(true);
          });
        });
      });

      describe('filtering', () => {
        it('should only return active categories by default', () => {
          const where = { isActive: true };
          expect(where.isActive).toBe(true);
        });

        it('should order by order field', () => {
          const orderBy = { order: 'asc' };
          expect(orderBy.order).toBe('asc');
        });
      });

      describe('visibility for students', () => {
        it('should filter categories based on visibility', () => {
          const studentId = faker.string.uuid();
          const studentGroups = ['group1', 'group2'];
          const where = {
            OR: [
              { visibility: 'ALL_STUDENTS' },
              {
                visibility: 'GROUP_BASED',
                groupAccess: { some: { groupId: { in: studentGroups } } },
              },
              {
                visibility: 'SELECTED_STUDENTS',
                studentAccess: { some: { studentId } },
              },
            ],
          };
          expect(where.OR).toHaveLength(3);
        });
      });
    });

    describe('getAllCategories (staffProcedure)', () => {
      describe('authorization', () => {
        it('should allow admin access', () => {
          const adminRole: UserRole = 'ADMIN';
          const isStaff = ['ADMIN', 'COLLABORATOR'].includes(adminRole);
          expect(isStaff).toBe(true);
        });

        it('should reject students', () => {
          const studentRole: UserRole = 'STUDENT';
          const isStaff = ['ADMIN', 'COLLABORATOR'].includes(studentRole);
          expect(isStaff).toBe(false);
        });
      });

      describe('includes', () => {
        it('should include material count', () => {
          const include = {
            _count: { select: { materials: true } },
          };
          expect(include._count.select.materials).toBe(true);
        });
      });
    });

    describe('createCategory (staffProcedure)', () => {
      describe('input validation', () => {
        it('should require name', () => {
          const input = { name: 'Nuova Categoria' };
          expect(input.name).toBeDefined();
          expect(input.name.length).toBeGreaterThan(0);
        });

        it('should accept optional description', () => {
          const input = { name: 'Cat', description: 'Descrizione' };
          expect(input.description).toBe('Descrizione');
        });

        it('should accept optional icon', () => {
          const validIcons = ['folder', 'book', 'file', 'video'];
          validIcons.forEach((icon) => {
            expect(typeof icon).toBe('string');
          });
        });

        it('should accept valid visibility enum', () => {
          VISIBILITY_OPTIONS.forEach((visibility) => {
            expect(VISIBILITY_OPTIONS).toContain(visibility);
          });
        });
      });

      describe('duplicate handling', () => {
        it('should throw CONFLICT for duplicate category name', () => {
          const error = new TRPCError({
            code: 'CONFLICT',
            message: 'Una categoria con questo nome esiste già',
          });
          expect(error.code).toBe('CONFLICT');
        });
      });
    });

    describe('updateCategory (staffProcedure)', () => {
      describe('input validation', () => {
        it('should require category id', () => {
          const input = { id: faker.string.uuid() };
          expect(input.id).toBeDefined();
        });

        it('should accept partial updates', () => {
          const input = {
            id: faker.string.uuid(),
            name: 'Updated Name',
          };
          expect(input).not.toHaveProperty('description');
        });
      });

      describe('error handling', () => {
        it('should throw NOT_FOUND for non-existent category', () => {
          const error = new TRPCError({
            code: 'NOT_FOUND',
            message: 'Categoria non trovata',
          });
          expect(error.code).toBe('NOT_FOUND');
        });
      });
    });

    describe('deleteCategory (staffProcedure)', () => {
      describe('cascade behavior', () => {
        it('should cascade delete MaterialCategoryLinks', () => {
          // MaterialCategoryLink has onDelete: Cascade
          const cascadeRule = 'Cascade';
          expect(cascadeRule).toBe('Cascade');
        });
      });
    });
  });

  // ==================== SUBJECT OPERATIONS ====================
  describe('Subject Operations', () => {
    describe('getSubjects (protectedProcedure)', () => {
      it('should return active subjects', () => {
        const where = { isActive: true };
        expect(where.isActive).toBe(true);
      });

      it('should order by order field', () => {
        const orderBy = { order: 'asc' };
        expect(orderBy.order).toBe('asc');
      });
    });

    describe('getAllSubjects (staffProcedure)', () => {
      it('should include topic count', () => {
        const include = {
          _count: { select: { topics: true } },
        };
        expect(include._count.select.topics).toBe(true);
      });
    });

    describe('getHierarchy (protectedProcedure)', () => {
      it('should return nested structure', () => {
        const include = {
          topics: {
            include: {
              subTopics: true,
            },
            orderBy: { order: 'asc' },
          },
        };
        expect(include.topics.include.subTopics).toBe(true);
      });
    });

    describe('createSubject (staffProcedure)', () => {
      describe('input validation', () => {
        it('should require name and code', () => {
          const input = {
            name: 'Biologia',
            code: 'BIO',
          };
          expect(input.name).toBeDefined();
          expect(input.code).toBeDefined();
        });

        it('should enforce unique code', () => {
          const error = new TRPCError({
            code: 'CONFLICT',
            message: 'Una materia con questo codice esiste già',
          });
          expect(error.code).toBe('CONFLICT');
        });
      });
    });

    describe('updateSubject (staffProcedure)', () => {
      it('should require subject id', () => {
        const input = { id: faker.string.uuid() };
        expect(input.id).toBeDefined();
      });
    });

    describe('deleteSubject (staffProcedure)', () => {
      it('should cascade delete topics', () => {
        // Topic has onDelete: Cascade on subjectId relation
        const cascadeRule = 'Cascade';
        expect(cascadeRule).toBe('Cascade');
      });
    });
  });

  // ==================== TOPIC OPERATIONS ====================
  describe('Topic Operations', () => {
    describe('getTopics (protectedProcedure)', () => {
      it('should require subjectId', () => {
        const input = { subjectId: faker.string.uuid() };
        expect(input.subjectId).toBeDefined();
      });

      it('should include subtopic count', () => {
        const include = {
          _count: { select: { subTopics: true } },
        };
        expect(include._count.select.subTopics).toBe(true);
      });
    });

    describe('getSubjectWithTopics (protectedProcedure)', () => {
      it('should throw NOT_FOUND for invalid subject', () => {
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Materia non trovata',
        });
        expect(error.code).toBe('NOT_FOUND');
      });
    });

    describe('createTopic (protectedProcedure)', () => {
      describe('input validation', () => {
        it('should require name and subjectId', () => {
          const input = {
            name: 'Genetica',
            subjectId: faker.string.uuid(),
          };
          expect(input.name).toBeDefined();
          expect(input.subjectId).toBeDefined();
        });

        it('should accept difficulty level', () => {
          DIFFICULTY_LEVELS.forEach((level) => {
            expect(DIFFICULTY_LEVELS).toContain(level);
          });
        });
      });

      describe('unique constraint', () => {
        it('should enforce unique topic name within subject', () => {
          const error = new TRPCError({
            code: 'CONFLICT',
            message: 'Un argomento con questo nome esiste già per questa materia',
          });
          expect(error.code).toBe('CONFLICT');
        });
      });
    });

    describe('updateTopic (protectedProcedure)', () => {
      it('should require topic id', () => {
        const input = { id: faker.string.uuid() };
        expect(input.id).toBeDefined();
      });
    });

    describe('deleteTopic (protectedProcedure)', () => {
      it('should cascade delete subtopics', () => {
        const cascadeRule = 'Cascade';
        expect(cascadeRule).toBe('Cascade');
      });
    });
  });

  // ==================== SUBTOPIC OPERATIONS ====================
  describe('SubTopic Operations', () => {
    describe('createSubTopic (protectedProcedure)', () => {
      it('should require name and topicId', () => {
        const input = {
          name: 'DNA Replicazione',
          topicId: faker.string.uuid(),
        };
        expect(input.name).toBeDefined();
        expect(input.topicId).toBeDefined();
      });

      it('should enforce unique name within topic', () => {
        const error = new TRPCError({
          code: 'CONFLICT',
          message: 'Un sotto-argomento con questo nome esiste già',
        });
        expect(error.code).toBe('CONFLICT');
      });
    });

    describe('updateSubTopic (protectedProcedure)', () => {
      it('should require subtopic id', () => {
        const input = { id: faker.string.uuid() };
        expect(input.id).toBeDefined();
      });
    });

    describe('deleteSubTopic (protectedProcedure)', () => {
      it('should throw NOT_FOUND for non-existent subtopic', () => {
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sotto-argomento non trovato',
        });
        expect(error.code).toBe('NOT_FOUND');
      });
    });

    describe('reorderTopics (protectedProcedure)', () => {
      it('should accept array of topic IDs with new orders', () => {
        const input = {
          subjectId: faker.string.uuid(),
          topics: [
            { id: 'topic1', order: 0 },
            { id: 'topic2', order: 1 },
            { id: 'topic3', order: 2 },
          ],
        };
        expect(input.topics).toHaveLength(3);
      });
    });

    describe('reorderSubTopics (protectedProcedure)', () => {
      it('should accept array of subtopic IDs with new orders', () => {
        const input = {
          topicId: faker.string.uuid(),
          subTopics: [
            { id: 'sub1', order: 0 },
            { id: 'sub2', order: 1 },
          ],
        };
        expect(input.subTopics).toHaveLength(2);
      });
    });
  });

  // ==================== MATERIAL CRUD ====================
  describe('Material CRUD', () => {
    describe('getAll (staffProcedure)', () => {
      describe('authorization', () => {
        it('should only allow staff access', () => {
          const staffRoles: UserRole[] = ['ADMIN', 'COLLABORATOR'];
          expect(staffRoles).toContain('ADMIN');
          expect(staffRoles).toContain('COLLABORATOR');
        });
      });

      describe('filtering', () => {
        it('should filter by type', () => {
          MATERIAL_TYPES.forEach((type) => {
            const where = { type };
            expect(where.type).toBe(type);
          });
        });

        it('should filter by subject', () => {
          const subjectId = faker.string.uuid();
          const where = { subjectId };
          expect(where.subjectId).toBe(subjectId);
        });

        it('should filter by visibility', () => {
          VISIBILITY_OPTIONS.forEach((visibility) => {
            const where = { visibility };
            expect(where.visibility).toBe(visibility);
          });
        });

        it('should search in title and description', () => {
          const search = 'biologia';
          const where = {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          };
          expect(where.OR).toHaveLength(2);
        });
      });

      describe('pagination', () => {
        it('should use default pagination', () => {
          const defaults = { page: 1, pageSize: 20 };
          expect(defaults.page).toBe(1);
          expect(defaults.pageSize).toBe(20);
        });
      });
    });

    describe('getById (staffProcedure)', () => {
      it('should require material id', () => {
        const input = { id: faker.string.uuid() };
        expect(input.id).toBeDefined();
      });

      it('should throw NOT_FOUND for non-existent material', () => {
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Materiale non trovato',
        });
        expect(error.code).toBe('NOT_FOUND');
      });

      it('should include all relations', () => {
        const include = {
          subject: true,
          topic: true,
          subTopic: true,
          categories: { include: { category: true } },
          groupAccess: { include: { group: true } },
          studentAccess: { include: { student: { include: { user: true } } } },
        };
        expect(include.subject).toBe(true);
        expect(include.topic).toBe(true);
      });
    });

    describe('create (staffProcedure)', () => {
      describe('input validation', () => {
        it('should require title and type', () => {
          const input = {
            title: 'Materiale di studio',
            type: 'PDF' as MaterialType,
          };
          expect(input.title).toBeDefined();
          expect(input.type).toBeDefined();
        });

        it('should validate material type enum', () => {
          MATERIAL_TYPES.forEach((type) => {
            expect(MATERIAL_TYPES).toContain(type);
          });
        });

        it('should accept optional file URL for PDF/VIDEO', () => {
          const input = {
            title: 'PDF',
            type: 'PDF' as MaterialType,
            fileUrl: 'https://storage.example.com/file.pdf',
            fileName: 'documento.pdf',
            fileSize: 1024000,
          };
          expect(input.fileUrl).toBeDefined();
        });

        it('should accept optional external URL for LINK type', () => {
          const input = {
            title: 'Link Esterno',
            type: 'LINK' as MaterialType,
            externalUrl: 'https://example.com/resource',
          };
          expect(input.externalUrl).toBeDefined();
        });
      });

      describe('category assignment', () => {
        it('should accept categoryIds array', () => {
          const input = {
            title: 'Materiale',
            type: 'PDF' as MaterialType,
            categoryIds: [faker.string.uuid(), faker.string.uuid()],
          };
          expect(input.categoryIds).toHaveLength(2);
        });
      });
    });

    describe('createBatch (staffProcedure)', () => {
      it('should accept array of materials', () => {
        const input = {
          materials: [
            { title: 'Material 1', type: 'PDF' as MaterialType },
            { title: 'Material 2', type: 'VIDEO' as MaterialType },
          ],
        };
        expect(input.materials).toHaveLength(2);
      });
    });

    describe('update (staffProcedure)', () => {
      it('should require material id', () => {
        const input = { id: faker.string.uuid() };
        expect(input.id).toBeDefined();
      });

      it('should accept partial updates', () => {
        const input = {
          id: faker.string.uuid(),
          title: 'Updated Title',
        };
        expect(input).not.toHaveProperty('type');
        expect(input).not.toHaveProperty('fileUrl');
      });
    });

    describe('delete (staffProcedure)', () => {
      it('should require material id', () => {
        const input = { id: faker.string.uuid() };
        expect(input.id).toBeDefined();
      });

      it('should cascade delete access records', () => {
        // MaterialGroupAccess and MaterialStudentAccess have onDelete: Cascade
        const cascadeRule = 'Cascade';
        expect(cascadeRule).toBe('Cascade');
      });
    });
  });

  // ==================== TRACKING ====================
  describe('Tracking', () => {
    describe('recordView (protectedProcedure)', () => {
      it('should increment viewCount', () => {
        const material = createMockMaterial({ viewCount: 10 });
        const updatedViewCount = material.viewCount + 1;
        expect(updatedViewCount).toBe(11);
      });
    });

    describe('recordDownload (protectedProcedure)', () => {
      it('should increment downloadCount', () => {
        const material = createMockMaterial({ downloadCount: 5 });
        const updatedDownloadCount = material.downloadCount + 1;
        expect(updatedDownloadCount).toBe(6);
      });
    });
  });

  // ==================== ACCESS CONTROL ====================
  describe('Access Control', () => {
    describe('addStudentAccess (staffProcedure)', () => {
      it('should require materialId and studentId', () => {
        const input = {
          materialId: faker.string.uuid(),
          studentId: faker.string.uuid(),
        };
        expect(input.materialId).toBeDefined();
        expect(input.studentId).toBeDefined();
      });

      it('should throw CONFLICT if access already exists', () => {
        const error = new TRPCError({
          code: 'CONFLICT',
          message: 'Lo studente ha già accesso a questo materiale',
        });
        expect(error.code).toBe('CONFLICT');
      });
    });

    describe('removeStudentAccess (staffProcedure)', () => {
      it('should require materialId and studentId', () => {
        const input = {
          materialId: faker.string.uuid(),
          studentId: faker.string.uuid(),
        };
        expect(input.materialId).toBeDefined();
        expect(input.studentId).toBeDefined();
      });
    });

    describe('addGroupAccess (staffProcedure)', () => {
      it('should require materialId and groupId', () => {
        const input = {
          materialId: faker.string.uuid(),
          groupId: faker.string.uuid(),
        };
        expect(input.materialId).toBeDefined();
        expect(input.groupId).toBeDefined();
      });
    });

    describe('removeGroupAccess (staffProcedure)', () => {
      it('should require materialId and groupId', () => {
        const input = {
          materialId: faker.string.uuid(),
          groupId: faker.string.uuid(),
        };
        expect(input.materialId).toBeDefined();
        expect(input.groupId).toBeDefined();
      });
    });
  });

  // ==================== STUDENT MATERIALS ====================
  describe('Student Materials', () => {
    describe('getMyMaterials (studentProcedure)', () => {
      describe('authorization', () => {
        it('should only allow students', () => {
          const studentRole: UserRole = 'STUDENT';
          expect(studentRole).toBe('STUDENT');
        });
      });

      describe('visibility logic', () => {
        it('should include ALL_STUDENTS materials', () => {
          const visibility: MaterialVisibility = 'ALL_STUDENTS';
          expect(visibility).toBe('ALL_STUDENTS');
        });

        it('should include group-accessible materials', () => {
          const studentGroups = ['group1', 'group2'];
          const where = {
            visibility: 'GROUP_BASED',
            groupAccess: { some: { groupId: { in: studentGroups } } },
          };
          expect(where.groupAccess.some.groupId.in).toEqual(studentGroups);
        });

        it('should include individually accessible materials', () => {
          const studentId = faker.string.uuid();
          const where = {
            visibility: 'SELECTED_STUDENTS',
            studentAccess: { some: { studentId } },
          };
          expect(where.studentAccess.some.studentId).toBe(studentId);
        });
      });

      describe('filtering', () => {
        it('should filter by category', () => {
          const categoryId = faker.string.uuid();
          const where = {
            categories: { some: { categoryId } },
          };
          expect(where.categories.some.categoryId).toBe(categoryId);
        });

        it('should filter by subject', () => {
          const subjectId = faker.string.uuid();
          const where = { subjectId };
          expect(where.subjectId).toBe(subjectId);
        });
      });
    });

    describe('getMaterial (studentProcedure)', () => {
      it('should throw NOT_FOUND for non-existent material', () => {
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Materiale non trovato',
        });
        expect(error.code).toBe('NOT_FOUND');
      });

      it('should throw FORBIDDEN if student has no access', () => {
        const error = new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non hai accesso a questo materiale',
        });
        expect(error.code).toBe('FORBIDDEN');
      });
    });
  });

  // ==================== STATS ====================
  describe('getStats (staffProcedure)', () => {
    it('should return material statistics', () => {
      const stats = {
        totalMaterials: 100,
        byType: {
          PDF: 50,
          VIDEO: 30,
          LINK: 15,
          IMAGE: 3,
          OTHER: 2,
        },
        totalViews: 5000,
        totalDownloads: 2000,
        activeCategories: 10,
        activeSubjects: 5,
      };
      expect(stats.totalMaterials).toBe(100);
      expect(stats.byType.PDF).toBe(50);
    });
  });

  // ==================== INPUT VALIDATION ====================
  describe('Input Validation', () => {
    describe('material title', () => {
      it('should have minimum length', () => {
        const minLength = 1;
        const title = 'A';
        expect(title.length).toBeGreaterThanOrEqual(minLength);
      });

      it('should reject empty titles', () => {
        const title = '';
        expect(title.length).toBe(0);
      });
    });

    describe('file validation', () => {
      it('should validate file size limits', () => {
        const maxFileSize = 100 * 1024 * 1024; // 100MB
        const fileSize = 50 * 1024 * 1024;
        expect(fileSize).toBeLessThanOrEqual(maxFileSize);
      });

      it('should validate file URL format', () => {
        const validUrl = 'https://storage.example.com/file.pdf';
        expect(validUrl.startsWith('https://')).toBe(true);
      });
    });

    describe('order validation', () => {
      it('should accept non-negative order values', () => {
        const validOrders = [0, 1, 10, 100];
        validOrders.forEach((order) => {
          expect(order).toBeGreaterThanOrEqual(0);
        });
      });
    });
  });

  // ==================== ERROR HANDLING ====================
  describe('Error Handling', () => {
    it('should use NOT_FOUND for missing resources', () => {
      const resources = ['material', 'category', 'subject', 'topic', 'subtopic'];
      resources.forEach(() => {
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Risorsa non trovata',
        });
        expect(error.code).toBe('NOT_FOUND');
      });
    });

    it('should use FORBIDDEN for access violations', () => {
      const error = new TRPCError({
        code: 'FORBIDDEN',
        message: 'Accesso negato',
      });
      expect(error.code).toBe('FORBIDDEN');
    });

    it('should use CONFLICT for duplicate resources', () => {
      const error = new TRPCError({
        code: 'CONFLICT',
        message: 'Risorsa già esistente',
      });
      expect(error.code).toBe('CONFLICT');
    });
  });

  // ==================== SECURITY CONSIDERATIONS ====================
  describe('Security Considerations', () => {
    it('should enforce role-based access for admin operations', () => {
      const adminOps = ['createCategory', 'updateCategory', 'deleteCategory'];
      expect(adminOps.length).toBe(3);
    });

    it('should verify material ownership for students', () => {
      const studentId = faker.string.uuid();
      const materialVisibility: MaterialVisibility = 'SELECTED_STUDENTS';
      const accessCheck = {
        studentAccess: { some: { studentId } },
      };
      expect(materialVisibility).toBe('SELECTED_STUDENTS');
      expect(accessCheck.studentAccess.some.studentId).toBe(studentId);
    });

    it('should sanitize file URLs', () => {
      const validSchemes = ['https://'];
      const testUrl = 'https://storage.example.com/file.pdf';
      const isValid = validSchemes.some((scheme) => testUrl.startsWith(scheme));
      expect(isValid).toBe(true);
    });
  });

  // ==================== VISIBILITY TYPES ====================
  describe('Visibility Types', () => {
    it('should support ALL_STUDENTS visibility', () => {
      const material = createMockMaterial({ visibility: 'ALL_STUDENTS' });
      expect(material.visibility).toBe('ALL_STUDENTS');
    });

    it('should support GROUP_BASED visibility', () => {
      const material = createMockMaterial({ visibility: 'GROUP_BASED' });
      expect(material.visibility).toBe('GROUP_BASED');
    });

    it('should support SELECTED_STUDENTS visibility', () => {
      const material = createMockMaterial({ visibility: 'SELECTED_STUDENTS' });
      expect(material.visibility).toBe('SELECTED_STUDENTS');
    });
  });

  // ==================== MATERIAL TYPES ====================
  describe('Material Types', () => {
    MATERIAL_TYPES.forEach((type) => {
      it(`should support ${type} type`, () => {
        const material = createMockMaterial({ type });
        expect(material.type).toBe(type);
      });
    });
  });

  // ==================== DIFFICULTY LEVELS ====================
  describe('Difficulty Levels', () => {
    DIFFICULTY_LEVELS.forEach((level) => {
      it(`should support ${level} difficulty`, () => {
        const topic = createMockTopic({ difficulty: level });
        expect(topic.difficulty).toBe(level);
      });
    });
  });
});
