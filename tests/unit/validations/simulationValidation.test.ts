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

// ==================== ADDITIONAL TESTS ====================
// Tests for helper functions, type guards, presets, and additional schemas

import {
  // Helper functions
  validateDateRange,
  validatePassingScore,
  validateQuestionDistribution,
  getTotalFromDistribution,
  // Type guards
  isOfficialSimulation,
  isStudentCreatable,
  requiresScheduling,
  // Presets
  SIMULATION_PRESETS,
  // Paper-based schemas
  paperAnswerSchema,
  createPaperResultSchema,
  bulkPaperResultsSchema,
  // Smart random
  SmartRandomPresetEnum,
  DifficultyMixEnum,
  smartRandomGenerationSchema,
  getDifficultyRatios,
  // Additional schemas
  createSimulationWithQuestionsSchema,
  createSimulationAutoSchema,
  updateSimulationSchema,
  updateSimulationQuestionsSchema,
  simulationFilterSchema,
  studentSimulationFilterSchema,
  simulationAnswerSchema,
  submitSimulationSchema,
  quickQuizConfigSchema,
} from '@/lib/validations/simulationValidation';

describe('simulationValidation - Helper Functions', () => {
  describe('validateDateRange', () => {
    it('should return true when both dates are null', () => {
      expect(validateDateRange(null, null)).toBe(true);
    });

    it('should return true when startDate is null', () => {
      expect(validateDateRange(null, '2025-12-31T23:59:59Z')).toBe(true);
    });

    it('should return true when endDate is null', () => {
      expect(validateDateRange('2025-01-01T00:00:00Z', null)).toBe(true);
    });

    it('should return true when endDate is after startDate', () => {
      expect(validateDateRange('2025-01-01T00:00:00Z', '2025-12-31T23:59:59Z')).toBe(true);
    });

    it('should return false when endDate is before startDate', () => {
      expect(validateDateRange('2025-12-31T23:59:59Z', '2025-01-01T00:00:00Z')).toBe(false);
    });

    it('should return false when dates are equal', () => {
      expect(validateDateRange('2025-06-15T12:00:00Z', '2025-06-15T12:00:00Z')).toBe(false);
    });

    it('should handle undefined values', () => {
      expect(validateDateRange(undefined, undefined)).toBe(true);
      expect(validateDateRange(undefined, '2025-12-31T23:59:59Z')).toBe(true);
    });
  });

  describe('validatePassingScore', () => {
    it('should return true when both values are null', () => {
      expect(validatePassingScore(null, null)).toBe(true);
    });

    it('should return true when passingScore is null', () => {
      expect(validatePassingScore(null, 100)).toBe(true);
    });

    it('should return true when maxScore is null', () => {
      expect(validatePassingScore(60, null)).toBe(true);
    });

    it('should return true when passingScore is less than maxScore', () => {
      expect(validatePassingScore(60, 100)).toBe(true);
    });

    it('should return true when passingScore equals maxScore', () => {
      expect(validatePassingScore(100, 100)).toBe(true);
    });

    it('should return false when passingScore exceeds maxScore', () => {
      expect(validatePassingScore(110, 100)).toBe(false);
    });

    it('should handle undefined values', () => {
      expect(validatePassingScore(undefined, undefined)).toBe(true);
    });
  });

  describe('validateQuestionDistribution', () => {
    it('should return true when distribution is null', () => {
      expect(validateQuestionDistribution(30, null)).toBe(true);
    });

    it('should return true when distribution is undefined', () => {
      expect(validateQuestionDistribution(30, undefined)).toBe(true);
    });

    it('should return true when distribution sum equals totalQuestions', () => {
      const distribution = { 'math': 10, 'physics': 10, 'chemistry': 10 };
      expect(validateQuestionDistribution(30, distribution)).toBe(true);
    });

    it('should return false when distribution sum is less than totalQuestions', () => {
      const distribution = { 'math': 10, 'physics': 5 };
      expect(validateQuestionDistribution(30, distribution)).toBe(false);
    });

    it('should return false when distribution sum exceeds totalQuestions', () => {
      const distribution = { 'math': 20, 'physics': 20 };
      expect(validateQuestionDistribution(30, distribution)).toBe(false);
    });

    it('should handle empty distribution', () => {
      expect(validateQuestionDistribution(0, {})).toBe(true);
      expect(validateQuestionDistribution(10, {})).toBe(false);
    });
  });

  describe('getTotalFromDistribution', () => {
    it('should calculate total from distribution', () => {
      expect(getTotalFromDistribution({ 'math': 10, 'physics': 15, 'chemistry': 5 })).toBe(30);
    });

    it('should return 0 for empty distribution', () => {
      expect(getTotalFromDistribution({})).toBe(0);
    });

    it('should handle single subject', () => {
      expect(getTotalFromDistribution({ 'math': 25 })).toBe(25);
    });

    it('should handle zeros', () => {
      expect(getTotalFromDistribution({ 'math': 0, 'physics': 0 })).toBe(0);
    });
  });
});

describe('simulationValidation - Type Guards', () => {
  describe('isOfficialSimulation', () => {
    it('should return true for OFFICIAL type with isOfficial flag', () => {
      expect(isOfficialSimulation({ type: 'OFFICIAL', isOfficial: true })).toBe(true);
    });

    it('should return false for OFFICIAL type without isOfficial flag', () => {
      expect(isOfficialSimulation({ type: 'OFFICIAL', isOfficial: false })).toBe(false);
    });

    it('should return false for non-OFFICIAL type', () => {
      expect(isOfficialSimulation({ type: 'PRACTICE', isOfficial: true })).toBe(false);
      expect(isOfficialSimulation({ type: 'CUSTOM', isOfficial: true })).toBe(false);
      expect(isOfficialSimulation({ type: 'QUICK_QUIZ', isOfficial: true })).toBe(false);
    });
  });

  describe('isStudentCreatable', () => {
    it('should return true for CUSTOM type', () => {
      expect(isStudentCreatable('CUSTOM')).toBe(true);
    });

    it('should return true for QUICK_QUIZ type', () => {
      expect(isStudentCreatable('QUICK_QUIZ')).toBe(true);
    });

    it('should return false for OFFICIAL type', () => {
      expect(isStudentCreatable('OFFICIAL')).toBe(false);
    });

    it('should return false for PRACTICE type', () => {
      expect(isStudentCreatable('PRACTICE')).toBe(false);
    });
  });

  describe('requiresScheduling', () => {
    it('should return true for OFFICIAL type', () => {
      expect(requiresScheduling('OFFICIAL')).toBe(true);
    });

    it('should return true for PRACTICE type', () => {
      expect(requiresScheduling('PRACTICE')).toBe(true);
    });

    it('should return false for CUSTOM type', () => {
      expect(requiresScheduling('CUSTOM')).toBe(false);
    });

    it('should return false for QUICK_QUIZ type', () => {
      expect(requiresScheduling('QUICK_QUIZ')).toBe(false);
    });
  });
});

describe('simulationValidation - SIMULATION_PRESETS', () => {
  it('should have all required preset types', () => {
    expect(SIMULATION_PRESETS).toHaveProperty('OFFICIAL_TOLC_MED');
    expect(SIMULATION_PRESETS).toHaveProperty('PRACTICE_TEST');
    expect(SIMULATION_PRESETS).toHaveProperty('QUICK_QUIZ');
    expect(SIMULATION_PRESETS).toHaveProperty('PAPER_BASED');
  });

  describe('OFFICIAL_TOLC_MED preset', () => {
    const preset = SIMULATION_PRESETS.OFFICIAL_TOLC_MED;

    it('should have correct type', () => {
      expect(preset.type).toBe('OFFICIAL');
    });

    it('should be marked as official', () => {
      expect(preset.isOfficial).toBe(true);
    });

    it('should have correct duration (110 minutes)', () => {
      expect(preset.durationMinutes).toBe(110);
    });

    it('should have correct total questions (60)', () => {
      expect(preset.totalQuestions).toBe(60);
    });

    it('should have correct scoring (1.5 / -0.4 / 0)', () => {
      expect(preset.correctPoints).toBe(1.5);
      expect(preset.wrongPoints).toBe(-0.4);
      expect(preset.blankPoints).toBe(0);
    });

    it('should have anti-cheat enabled', () => {
      expect(preset.enableAntiCheat).toBe(true);
      expect(preset.forceFullscreen).toBe(true);
      expect(preset.blockTabChange).toBe(true);
      expect(preset.blockCopyPaste).toBe(true);
      expect(preset.logSuspiciousEvents).toBe(true);
    });

    it('should have sections enabled for TOLC structure', () => {
      expect(preset.hasSections).toBe(true);
    });

    it('should not show results immediately', () => {
      expect(preset.showResults).toBe(false);
      expect(preset.showCorrectAnswers).toBe(false);
    });
  });

  describe('PRACTICE_TEST preset', () => {
    const preset = SIMULATION_PRESETS.PRACTICE_TEST;

    it('should have correct type', () => {
      expect(preset.type).toBe('PRACTICE');
    });

    it('should allow repeating', () => {
      expect(preset.isRepeatable).toBe(true);
      expect(preset.maxAttempts).toBe(3);
    });

    it('should have anti-cheat disabled', () => {
      expect(preset.enableAntiCheat).toBe(false);
    });
  });

  describe('QUICK_QUIZ preset', () => {
    const preset = SIMULATION_PRESETS.QUICK_QUIZ;

    it('should have correct type', () => {
      expect(preset.type).toBe('QUICK_QUIZ');
    });

    it('should have short duration (15 minutes)', () => {
      expect(preset.durationMinutes).toBe(15);
    });

    it('should have few questions (10)', () => {
      expect(preset.totalQuestions).toBe(10);
    });
  });

  describe('PAPER_BASED preset', () => {
    const preset = SIMULATION_PRESETS.PAPER_BASED;

    it('should have correct type', () => {
      expect(preset.type).toBe('CUSTOM');
    });

    it('should be marked as paper-based', () => {
      expect(preset.isPaperBased).toBe(true);
    });

    it('should not randomize for paper exams', () => {
      expect(preset.randomizeOrder).toBe(false);
      expect(preset.randomizeAnswers).toBe(false);
    });
  });
});

describe('simulationValidation - Paper-Based Schemas', () => {
  describe('paperAnswerSchema', () => {
    it('should accept valid answer', () => {
      const result = paperAnswerSchema.safeParse({ questionId: 'q1', answerId: 'a1' });
      expect(result.success).toBe(true);
    });

    it('should accept blank answer', () => {
      const result = paperAnswerSchema.safeParse({ questionId: 'q1', answerId: null });
      expect(result.success).toBe(true);
    });

    it('should require questionId', () => {
      const result = paperAnswerSchema.safeParse({ questionId: '', answerId: 'a1' });
      expect(result.success).toBe(false);
    });
  });

  describe('createPaperResultSchema', () => {
    it('should accept valid paper result', () => {
      const result = createPaperResultSchema.safeParse({
        simulationId: 'sim-1',
        studentId: 'student-1',
        answers: [{ questionId: 'q1', answerId: 'a1' }],
      });
      expect(result.success).toBe(true);
    });

    it('should require simulationId', () => {
      const result = createPaperResultSchema.safeParse({
        simulationId: '',
        studentId: 'student-1',
        answers: [],
      });
      expect(result.success).toBe(false);
    });

    it('should require studentId', () => {
      const result = createPaperResultSchema.safeParse({
        simulationId: 'sim-1',
        studentId: '',
        answers: [],
      });
      expect(result.success).toBe(false);
    });

    it('should default wasPresent to true', () => {
      const result = createPaperResultSchema.safeParse({
        simulationId: 'sim-1',
        studentId: 'student-1',
        answers: [],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.wasPresent).toBe(true);
      }
    });
  });

  describe('bulkPaperResultsSchema', () => {
    it('should accept valid bulk results', () => {
      const result = bulkPaperResultsSchema.safeParse({
        simulationId: 'sim-1',
        results: [
          { studentId: 's1', answers: [], wasPresent: true },
          { studentId: 's2', answers: [], wasPresent: false },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should require non-empty simulationId', () => {
      const result = bulkPaperResultsSchema.safeParse({
        simulationId: '',
        results: [],
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('simulationValidation - Smart Random Schemas', () => {
  describe('SmartRandomPresetEnum', () => {
    it('should accept valid presets', () => {
      expect(SmartRandomPresetEnum.safeParse('PROPORTIONAL').success).toBe(true);
      expect(SmartRandomPresetEnum.safeParse('BALANCED').success).toBe(true);
      expect(SmartRandomPresetEnum.safeParse('SINGLE_SUBJECT').success).toBe(true);
      expect(SmartRandomPresetEnum.safeParse('CUSTOM').success).toBe(true);
    });

    it('should reject invalid presets', () => {
      expect(SmartRandomPresetEnum.safeParse('RANDOM').success).toBe(false);
    });
  });

  describe('DifficultyMixEnum', () => {
    it('should accept valid difficulty mixes', () => {
      expect(DifficultyMixEnum.safeParse('BALANCED').success).toBe(true);
      expect(DifficultyMixEnum.safeParse('EASY_FOCUS').success).toBe(true);
      expect(DifficultyMixEnum.safeParse('HARD_FOCUS').success).toBe(true);
      expect(DifficultyMixEnum.safeParse('MEDIUM_ONLY').success).toBe(true);
      expect(DifficultyMixEnum.safeParse('MIXED').success).toBe(true);
    });

    it('should reject invalid difficulty mixes', () => {
      expect(DifficultyMixEnum.safeParse('VERY_HARD').success).toBe(false);
    });
  });

  describe('smartRandomGenerationSchema', () => {
    it('should accept valid smart random config', () => {
      const result = smartRandomGenerationSchema.safeParse({
        totalQuestions: 30,
        preset: 'BALANCED',
        difficultyMix: 'BALANCED',
      });
      expect(result.success).toBe(true);
    });

    it('should require minimum 5 questions', () => {
      const result = smartRandomGenerationSchema.safeParse({
        totalQuestions: 3,
      });
      expect(result.success).toBe(false);
    });

    it('should use defaults for optional fields', () => {
      const result = smartRandomGenerationSchema.safeParse({
        totalQuestions: 20,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.preset).toBe('BALANCED');
        expect(result.data.difficultyMix).toBe('BALANCED');
        expect(result.data.avoidRecentlyUsed).toBe(true);
        expect(result.data.maximizeTopicCoverage).toBe(true);
        expect(result.data.preferRecentQuestions).toBe(false);
      }
    });

    it('should accept SINGLE_SUBJECT with focusSubjectId', () => {
      const result = smartRandomGenerationSchema.safeParse({
        totalQuestions: 15,
        preset: 'SINGLE_SUBJECT',
        focusSubjectId: 'math-123',
      });
      expect(result.success).toBe(true);
    });

    it('should accept CUSTOM with distribution', () => {
      const result = smartRandomGenerationSchema.safeParse({
        totalQuestions: 30,
        preset: 'CUSTOM',
        customSubjectDistribution: { 'math': 10, 'physics': 20 },
      });
      expect(result.success).toBe(true);
    });

    it('should accept exclude lists', () => {
      const result = smartRandomGenerationSchema.safeParse({
        totalQuestions: 20,
        tagIds: ['tag1', 'tag2'],
        excludeQuestionIds: ['q1', 'q2', 'q3'],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('getDifficultyRatios', () => {
    it('should return correct ratios for BALANCED', () => {
      const ratios = getDifficultyRatios('BALANCED');
      expect(ratios).toEqual({ EASY: 0.30, MEDIUM: 0.50, HARD: 0.20 });
    });

    it('should return correct ratios for EASY_FOCUS', () => {
      const ratios = getDifficultyRatios('EASY_FOCUS');
      expect(ratios).toEqual({ EASY: 0.50, MEDIUM: 0.40, HARD: 0.10 });
    });

    it('should return correct ratios for HARD_FOCUS', () => {
      const ratios = getDifficultyRatios('HARD_FOCUS');
      expect(ratios).toEqual({ EASY: 0.10, MEDIUM: 0.40, HARD: 0.50 });
    });

    it('should return correct ratios for MEDIUM_ONLY', () => {
      const ratios = getDifficultyRatios('MEDIUM_ONLY');
      expect(ratios).toEqual({ EASY: 0, MEDIUM: 1.0, HARD: 0 });
    });

    it('should return correct ratios for MIXED', () => {
      const ratios = getDifficultyRatios('MIXED');
      expect(ratios).toEqual({ EASY: 0.33, MEDIUM: 0.34, HARD: 0.33 });
    });

    it('should return default BALANCED for unknown type', () => {
      // TypeScript would prevent this, but testing runtime behavior
      const ratios = getDifficultyRatios('UNKNOWN' as 'BALANCED');
      expect(ratios).toEqual({ EASY: 0.30, MEDIUM: 0.50, HARD: 0.20 });
    });
  });
});

describe('simulationValidation - Additional Schemas', () => {
  describe('createSimulationAutoSchema (base schema properties)', () => {
    // Note: simulationBaseSchema is not exported, but we can test its properties
    // through createSimulationAutoSchema which extends it
    it('should accept minimal valid simulation', () => {
      const result = createSimulationAutoSchema.safeParse({
        title: 'Test Simulation',
        type: 'PRACTICE',
        totalQuestions: 10,
        subjectDistribution: { 'math': 10 },
      });
      expect(result.success).toBe(true);
    });

    it('should require non-empty title', () => {
      const result = createSimulationAutoSchema.safeParse({
        title: '',
        type: 'PRACTICE',
        totalQuestions: 10,
        subjectDistribution: { 'math': 10 },
      });
      expect(result.success).toBe(false);
    });

    it('should require at least 1 question', () => {
      const result = createSimulationAutoSchema.safeParse({
        title: 'Test',
        type: 'PRACTICE',
        totalQuestions: 0,
        subjectDistribution: {},
      });
      expect(result.success).toBe(false);
    });

    it('should reject positive wrongPoints', () => {
      const result = createSimulationAutoSchema.safeParse({
        title: 'Test',
        type: 'PRACTICE',
        totalQuestions: 10,
        wrongPoints: 0.5,
        subjectDistribution: { 'math': 10 },
      });
      expect(result.success).toBe(false);
    });

    it('should accept negative wrongPoints', () => {
      const result = createSimulationAutoSchema.safeParse({
        title: 'Test',
        type: 'PRACTICE',
        totalQuestions: 10,
        wrongPoints: -0.4,
        subjectDistribution: { 'math': 10 },
      });
      expect(result.success).toBe(true);
    });

    it('should use default values', () => {
      const result = createSimulationAutoSchema.safeParse({
        title: 'Test',
        type: 'PRACTICE',
        totalQuestions: 10,
        subjectDistribution: { 'math': 10 },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.showResults).toBe(true);
        expect(result.data.showCorrectAnswers).toBe(true);
        expect(result.data.allowReview).toBe(true);
        expect(result.data.randomizeOrder).toBe(false);
        expect(result.data.isRepeatable).toBe(false);
        expect(result.data.enableAntiCheat).toBe(false);
      }
    });
  });

  describe('createSimulationWithQuestionsSchema', () => {
    it('should accept valid simulation with questions', () => {
      const result = createSimulationWithQuestionsSchema.safeParse({
        title: 'Test',
        type: 'PRACTICE',
        totalQuestions: 2,
        questions: [
          { questionId: 'q1', order: 0 },
          { questionId: 'q2', order: 1 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should require at least one question', () => {
      const result = createSimulationWithQuestionsSchema.safeParse({
        title: 'Test',
        type: 'PRACTICE',
        totalQuestions: 0,
        questions: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateSimulationSchema', () => {
    it('should require id', () => {
      const result = updateSimulationSchema.safeParse({
        title: 'Updated Title',
      });
      expect(result.success).toBe(false);
    });

    it('should accept partial update with id', () => {
      const result = updateSimulationSchema.safeParse({
        id: 'sim-123',
        title: 'Updated Title',
      });
      expect(result.success).toBe(true);
    });

    it('should accept status update', () => {
      const result = updateSimulationSchema.safeParse({
        id: 'sim-123',
        status: 'PUBLISHED',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('updateSimulationQuestionsSchema', () => {
    it('should accept valid question update', () => {
      const result = updateSimulationQuestionsSchema.safeParse({
        simulationId: 'sim-123',
        questions: [{ questionId: 'q1', order: 0 }],
        mode: 'replace',
      });
      expect(result.success).toBe(true);
    });

    it('should accept append mode', () => {
      const result = updateSimulationQuestionsSchema.safeParse({
        simulationId: 'sim-123',
        questions: [{ questionId: 'q1', order: 0 }],
        mode: 'append',
      });
      expect(result.success).toBe(true);
    });

    it('should accept remove mode', () => {
      const result = updateSimulationQuestionsSchema.safeParse({
        simulationId: 'sim-123',
        questions: [{ questionId: 'q1', order: 0 }],
        mode: 'remove',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('simulationFilterSchema', () => {
    it('should use default pagination', () => {
      const result = simulationFilterSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
        expect(result.data.sortBy).toBe('createdAt');
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('should accept all filter options', () => {
      const result = simulationFilterSchema.safeParse({
        page: 2,
        pageSize: 50,
        search: 'test',
        type: 'OFFICIAL',
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
        isOfficial: true,
        groupId: 'group-1',
        sortBy: 'title',
        sortOrder: 'asc',
      });
      expect(result.success).toBe(true);
    });

    it('should reject pageSize over 100', () => {
      const result = simulationFilterSchema.safeParse({
        pageSize: 150,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('studentSimulationFilterSchema', () => {
    it('should accept student-specific filters', () => {
      const result = studentSimulationFilterSchema.safeParse({
        status: 'available',
        selfCreated: true,
        assignedToMe: false,
      });
      expect(result.success).toBe(true);
    });

    it('should accept all status values', () => {
      expect(studentSimulationFilterSchema.safeParse({ status: 'available' }).success).toBe(true);
      expect(studentSimulationFilterSchema.safeParse({ status: 'in_progress' }).success).toBe(true);
      expect(studentSimulationFilterSchema.safeParse({ status: 'completed' }).success).toBe(true);
      expect(studentSimulationFilterSchema.safeParse({ status: 'expired' }).success).toBe(true);
    });
  });

  describe('simulationAnswerSchema', () => {
    it('should accept valid answer', () => {
      const result = simulationAnswerSchema.safeParse({
        questionId: 'q1',
        answerId: 'a1',
        timeSpent: 30,
        flagged: true,
      });
      expect(result.success).toBe(true);
    });

    it('should accept text answer', () => {
      const result = simulationAnswerSchema.safeParse({
        questionId: 'q1',
        answerText: 'My answer to the open question',
      });
      expect(result.success).toBe(true);
    });

    it('should require questionId', () => {
      const result = simulationAnswerSchema.safeParse({
        answerId: 'a1',
      });
      expect(result.success).toBe(false);
    });

    it('should default flagged to false', () => {
      const result = simulationAnswerSchema.safeParse({
        questionId: 'q1',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.flagged).toBe(false);
      }
    });
  });

  describe('submitSimulationSchema', () => {
    it('should accept valid submission', () => {
      const result = submitSimulationSchema.safeParse({
        simulationId: 'sim-123',
        answers: [{ questionId: 'q1', answerId: 'a1' }],
        totalTimeSpent: 1800,
      });
      expect(result.success).toBe(true);
    });

    it('should require simulationId', () => {
      const result = submitSimulationSchema.safeParse({
        simulationId: '',
        answers: [],
        totalTimeSpent: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should accept partial submission', () => {
      const result = submitSimulationSchema.safeParse({
        simulationId: 'sim-123',
        answers: [],
        totalTimeSpent: 600,
        isPartial: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isPartial).toBe(true);
      }
    });
  });

  describe('quickQuizConfigSchema', () => {
    it('should accept valid quick quiz config', () => {
      const result = quickQuizConfigSchema.safeParse({
        subjectIds: ['math-1', 'physics-1'],
        questionCount: 20,
      });
      expect(result.success).toBe(true);
    });

    it('should require at least one subject', () => {
      const result = quickQuizConfigSchema.safeParse({
        subjectIds: [],
      });
      expect(result.success).toBe(false);
    });

    it('should enforce min 5 questions', () => {
      const result = quickQuizConfigSchema.safeParse({
        subjectIds: ['math-1'],
        questionCount: 3,
      });
      expect(result.success).toBe(false);
    });

    it('should enforce max 100 questions', () => {
      const result = quickQuizConfigSchema.safeParse({
        subjectIds: ['math-1'],
        questionCount: 150,
      });
      expect(result.success).toBe(false);
    });

    it('should use default values', () => {
      const result = quickQuizConfigSchema.safeParse({
        subjectIds: ['math-1'],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.difficulty).toBe('MIXED');
        expect(result.data.questionCount).toBe(10);
        expect(result.data.durationMinutes).toBe(0);
        expect(result.data.correctPoints).toBe(1.0);
        expect(result.data.wrongPoints).toBe(0);
        expect(result.data.showResultsImmediately).toBe(true);
        expect(result.data.showCorrectAnswers).toBe(true);
      }
    });
  });
});
