/**
 * Tests for simulationValidation schemas
 */
import { describe, it, expect } from 'vitest';
import {
  SimulationTypeEnum,
  SimulationStatusEnum,
  SimulationVisibilityEnum,
  CreatorRoleEnum,
  LocationTypeEnum,
  subjectDistributionSchema,
  difficultyDistributionSchema,
  simulationSectionSchema,
  simulationQuestionSchema,
  assignmentTargetSchema,
  bulkAssignmentSchema,
} from '@/lib/validations/simulationValidation';

describe('simulationValidation', () => {
  describe('SimulationTypeEnum', () => {
    it('should accept valid simulation types', () => {
      expect(SimulationTypeEnum.safeParse('OFFICIAL').success).toBe(true);
      expect(SimulationTypeEnum.safeParse('PRACTICE').success).toBe(true);
      expect(SimulationTypeEnum.safeParse('CUSTOM').success).toBe(true);
      expect(SimulationTypeEnum.safeParse('QUICK_QUIZ').success).toBe(true);
    });

    it('should reject invalid simulation types', () => {
      expect(SimulationTypeEnum.safeParse('INVALID').success).toBe(false);
      expect(SimulationTypeEnum.safeParse('').success).toBe(false);
      expect(SimulationTypeEnum.safeParse('official').success).toBe(false); // case sensitive
    });
  });

  describe('SimulationStatusEnum', () => {
    it('should accept valid statuses', () => {
      expect(SimulationStatusEnum.safeParse('DRAFT').success).toBe(true);
      expect(SimulationStatusEnum.safeParse('PUBLISHED').success).toBe(true);
      expect(SimulationStatusEnum.safeParse('ARCHIVED').success).toBe(true);
    });

    it('should reject invalid statuses', () => {
      expect(SimulationStatusEnum.safeParse('DELETED').success).toBe(false);
      expect(SimulationStatusEnum.safeParse('').success).toBe(false);
    });
  });

  describe('SimulationVisibilityEnum', () => {
    it('should accept valid visibility values', () => {
      expect(SimulationVisibilityEnum.safeParse('PRIVATE').success).toBe(true);
      expect(SimulationVisibilityEnum.safeParse('GROUP').success).toBe(true);
      expect(SimulationVisibilityEnum.safeParse('PUBLIC').success).toBe(true);
    });

    it('should reject invalid visibility values', () => {
      expect(SimulationVisibilityEnum.safeParse('HIDDEN').success).toBe(false);
    });
  });

  describe('CreatorRoleEnum', () => {
    it('should accept valid creator roles', () => {
      expect(CreatorRoleEnum.safeParse('ADMIN').success).toBe(true);
      expect(CreatorRoleEnum.safeParse('COLLABORATOR').success).toBe(true);
      expect(CreatorRoleEnum.safeParse('STUDENT').success).toBe(true);
    });

    it('should reject invalid roles', () => {
      expect(CreatorRoleEnum.safeParse('SUPERADMIN').success).toBe(false);
    });
  });

  describe('LocationTypeEnum', () => {
    it('should accept valid location types', () => {
      expect(LocationTypeEnum.safeParse('ONLINE').success).toBe(true);
      expect(LocationTypeEnum.safeParse('IN_PERSON').success).toBe(true);
      expect(LocationTypeEnum.safeParse('HYBRID').success).toBe(true);
    });

    it('should reject invalid location types', () => {
      expect(LocationTypeEnum.safeParse('REMOTE').success).toBe(false);
    });
  });

  describe('subjectDistributionSchema', () => {
    it('should accept valid subject distribution', () => {
      const valid = {
        'subject-1': 10,
        'subject-2': 5,
        'subject-3': 15,
      };
      const result = subjectDistributionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept empty distribution', () => {
      const result = subjectDistributionSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept zero values', () => {
      const valid = { 'subject-1': 0 };
      const result = subjectDistributionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject negative values', () => {
      const invalid = { 'subject-1': -5 };
      const result = subjectDistributionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer values', () => {
      const invalid = { 'subject-1': 5.5 };
      const result = subjectDistributionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject non-number values', () => {
      const invalid = { 'subject-1': 'ten' };
      const result = subjectDistributionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('difficultyDistributionSchema', () => {
    it('should accept valid difficulty distribution', () => {
      const valid = { EASY: 5, MEDIUM: 10, HARD: 5 };
      const result = difficultyDistributionSchema.safeParse(valid);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(valid);
    });

    it('should use defaults for missing fields', () => {
      const partial = { EASY: 5 };
      const result = difficultyDistributionSchema.safeParse(partial);
      expect(result.success).toBe(true);
      expect(result.data?.MEDIUM).toBe(0);
      expect(result.data?.HARD).toBe(0);
    });

    it('should accept all zeros', () => {
      const valid = { EASY: 0, MEDIUM: 0, HARD: 0 };
      const result = difficultyDistributionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject negative values', () => {
      const invalid = { EASY: -1, MEDIUM: 5, HARD: 5 };
      const result = difficultyDistributionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer values', () => {
      const invalid = { EASY: 5.5, MEDIUM: 5, HARD: 5 };
      const result = difficultyDistributionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('simulationSectionSchema', () => {
    it('should accept valid section', () => {
      const valid = {
        id: 'section-1',
        name: 'Matematica',
        durationMinutes: 30,
        questionCount: 10,
        subjectId: 'math-id',
        questionIds: ['q1', 'q2'],
        order: 0,
      };
      const result = simulationSectionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should require id', () => {
      const invalid = {
        name: 'Matematica',
        durationMinutes: 30,
      };
      const result = simulationSectionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require non-empty name', () => {
      const invalid = {
        id: 'section-1',
        name: '',
        durationMinutes: 30,
      };
      const result = simulationSectionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require positive duration', () => {
      const invalid = {
        id: 'section-1',
        name: 'Test',
        durationMinutes: 0,
      };
      const result = simulationSectionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject negative duration', () => {
      const invalid = {
        id: 'section-1',
        name: 'Test',
        durationMinutes: -10,
      };
      const result = simulationSectionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should use defaults for optional fields', () => {
      const minimal = {
        id: 'section-1',
        name: 'Test',
        durationMinutes: 30,
      };
      const result = simulationSectionSchema.safeParse(minimal);
      expect(result.success).toBe(true);
      expect(result.data?.questionIds).toEqual([]);
      expect(result.data?.order).toBe(0);
    });
  });

  describe('simulationQuestionSchema', () => {
    it('should accept valid question', () => {
      const valid = {
        questionId: 'q-123',
        order: 0,
        customPoints: 2,
        customNegativePoints: -0.5,
      };
      const result = simulationQuestionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should require non-empty questionId', () => {
      const invalid = {
        questionId: '',
        order: 0,
      };
      const result = simulationQuestionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require non-negative order', () => {
      const invalid = {
        questionId: 'q-123',
        order: -1,
      };
      const result = simulationQuestionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept null custom points', () => {
      const valid = {
        questionId: 'q-123',
        order: 0,
        customPoints: null,
        customNegativePoints: null,
      };
      const result = simulationQuestionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('assignmentTargetSchema', () => {
    it('should accept assignment to student', () => {
      const valid = {
        studentId: 'student-123',
        groupId: null,
        dueDate: '2025-12-31T23:59:59.000Z',
      };
      const result = assignmentTargetSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept assignment to group', () => {
      const valid = {
        studentId: null,
        groupId: 'group-123',
        dueDate: null,
      };
      const result = assignmentTargetSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept assignment to both student and group', () => {
      const valid = {
        studentId: 'student-123',
        groupId: 'group-123',
      };
      const result = assignmentTargetSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject assignment without student or group', () => {
      const invalid = {
        studentId: null,
        groupId: null,
      };
      const result = assignmentTargetSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject completely empty assignment', () => {
      const invalid = {};
      const result = assignmentTargetSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept valid location type', () => {
      const valid = {
        studentId: 'student-123',
        locationType: 'ONLINE',
      };
      const result = assignmentTargetSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept calendar event flag', () => {
      const valid = {
        studentId: 'student-123',
        createCalendarEvent: true,
      };
      const result = assignmentTargetSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate date format for dueDate', () => {
      const invalidDate = {
        studentId: 'student-123',
        dueDate: 'not-a-date',
      };
      const result = assignmentTargetSchema.safeParse(invalidDate);
      expect(result.success).toBe(false);
    });

    it('should validate date format for startDate', () => {
      const invalidDate = {
        studentId: 'student-123',
        startDate: '2025-01-01', // Missing time
      };
      const result = assignmentTargetSchema.safeParse(invalidDate);
      expect(result.success).toBe(false);
    });
  });

  describe('bulkAssignmentSchema', () => {
    it('should accept valid bulk assignment', () => {
      const valid = {
        simulationId: 'sim-123',
        targets: [
          { studentId: 'student-1' },
          { studentId: 'student-2' },
          { groupId: 'group-1' },
        ],
      };
      const result = bulkAssignmentSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should require non-empty simulationId', () => {
      const invalid = {
        simulationId: '',
        targets: [{ studentId: 'student-1' }],
      };
      const result = bulkAssignmentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require at least one target', () => {
      const invalid = {
        simulationId: 'sim-123',
        targets: [],
      };
      const result = bulkAssignmentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate each target in the array', () => {
      const invalid = {
        simulationId: 'sim-123',
        targets: [
          { studentId: 'student-1' }, // Valid
          { studentId: null, groupId: null }, // Invalid
        ],
      };
      const result = bulkAssignmentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle unicode in names', () => {
      const valid = {
        id: 'section-1',
        name: 'Sezione Física y Química',
        durationMinutes: 30,
      };
      const result = simulationSectionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should handle very long strings', () => {
      const longName = 'A'.repeat(1000);
      const section = {
        id: 'section-1',
        name: longName,
        durationMinutes: 30,
      };
      // Should accept (no max length defined in schema)
      const result = simulationSectionSchema.safeParse(section);
      expect(result.success).toBe(true);
    });

    it('should handle large question counts', () => {
      const valid = {
        'subject-1': 1000000,
      };
      const result = subjectDistributionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should handle many subjects in distribution', () => {
      const manySubjects: Record<string, number> = {};
      for (let i = 0; i < 100; i++) {
        manySubjects[`subject-${i}`] = i;
      }
      const result = subjectDistributionSchema.safeParse(manySubjects);
      expect(result.success).toBe(true);
    });
  });
});
