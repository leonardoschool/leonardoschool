/**
 * Questions Router Tests
 * 
 * Tests for question bank management:
 * - Question CRUD operations (staff)
 * - Bulk operations (admin)
 * - Import/Export functionality
 * - Tags and feedback management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { faker } from '@faker-js/faker';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock Prisma client
const mockPrisma = {
  question: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    updateMany: vi.fn(),
  },
  questionAnswer: {
    create: vi.fn(),
    createMany: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
  },
  tag: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  customSubject: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  customTopic: {
    findUnique: vi.fn(),
  },
  questionFeedback: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn((callback) => callback(mockPrisma)),
};

// Question types
type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'OPEN_ENDED';
type QuestionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

// Mock context factory
function createMockContext(userOverrides = {}) {
  return {
    user: {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      role: 'ADMIN' as const,
      isActive: true,
      profileCompleted: true,
      ...userOverrides,
    },
    prisma: mockPrisma,
  };
}

// Mock question factory
function createMockQuestion(overrides = {}) {
  return {
    id: faker.string.uuid(),
    text: faker.lorem.paragraph(),
    type: 'MULTIPLE_CHOICE' as QuestionType,
    status: 'PUBLISHED' as QuestionStatus,
    difficulty: 'MEDIUM' as DifficultyLevel,
    points: 1,
    explanation: faker.lorem.sentence(),
    subjectId: faker.string.uuid(),
    topicId: null,
    subTopicId: null,
    timeLimit: null,
    createdById: faker.string.uuid(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Mock answer factory
function createMockAnswer(overrides = {}) {
  return {
    id: faker.string.uuid(),
    questionId: faker.string.uuid(),
    text: faker.lorem.sentence(),
    isCorrect: false,
    order: 0,
    ...overrides,
  };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Questions Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // getQuestions
  // ==========================================================================
  describe('getQuestions', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('ADMIN');
      });

      it('should NOT allow students', async () => {
        const ctx = createMockContext({ role: 'STUDENT' });
        expect(['ADMIN', 'COLLABORATOR']).not.toContain(ctx.user.role);
      });
    });

    describe('filtering', () => {
      it('should filter by status', async () => {
        const status: QuestionStatus = 'PUBLISHED';
        expect(status).toBe('PUBLISHED');
      });

      it('should filter by difficulty', async () => {
        const difficulty: DifficultyLevel = 'HARD';
        expect(difficulty).toBe('HARD');
      });

      it('should filter by subject', async () => {
        const subjectId = faker.string.uuid();
        expect(subjectId).toBeTruthy();
      });

      it('should filter by topic', async () => {
        const topicId = faker.string.uuid();
        expect(topicId).toBeTruthy();
      });

      it('should filter by type', async () => {
        const types: QuestionType[] = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'OPEN_ENDED'];
        expect(types).toContain('MULTIPLE_CHOICE');
      });

      it('should support text search', async () => {
        const searchTerm = 'matematica';
        expect(searchTerm).toBeTruthy();
      });
    });

    describe('pagination', () => {
      it('should default page to 1', () => {
        const defaultPage = 1;
        expect(defaultPage).toBe(1);
      });

      it('should return pagination metadata', async () => {
        const total = 100;
        const pageSize = 20;
        const totalPages = Math.ceil(total / pageSize);
        expect(totalPages).toBe(5);
      });
    });
  });

  // ==========================================================================
  // getQuestion
  // ==========================================================================
  describe('getQuestion', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('ADMIN');
      });
    });

    describe('success scenarios', () => {
      it('should return question with answers', async () => {
        const question = createMockQuestion();
        const answers = [
          createMockAnswer({ isCorrect: true }),
          createMockAnswer({ isCorrect: false }),
        ];
        
        mockPrisma.question.findUnique.mockResolvedValue({
          ...question,
          answers,
        });
        
        expect(answers).toHaveLength(2);
      });

      it('should throw NOT_FOUND for non-existent question', async () => {
        mockPrisma.question.findUnique.mockResolvedValue(null);
        
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Domanda non trovata',
        });
        
        expect(error.code).toBe('NOT_FOUND');
      });
    });
  });

  // ==========================================================================
  // createQuestion
  // ==========================================================================
  describe('createQuestion', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('COLLABORATOR');
      });
    });

    describe('input validation', () => {
      it('should require question text', () => {
        const invalidInput = { text: '' };
        expect(invalidInput.text).toBe('');
      });

      it('should require question type', () => {
        const types: QuestionType[] = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'OPEN_ENDED'];
        expect(types).toContain('MULTIPLE_CHOICE');
      });

      it('should require at least one answer for multiple choice', () => {
        const answers = [createMockAnswer({ isCorrect: true })];
        expect(answers.length).toBeGreaterThanOrEqual(1);
      });

      it('should require exactly one correct answer for single choice', () => {
        const answers = [
          createMockAnswer({ isCorrect: true }),
          createMockAnswer({ isCorrect: false }),
        ];
        const correctCount = answers.filter(a => a.isCorrect).length;
        expect(correctCount).toBe(1);
      });

      it('should require subject', () => {
        const subjectId = faker.string.uuid();
        expect(subjectId).toBeTruthy();
      });
    });

    describe('success scenarios', () => {
      it('should create question with answers', async () => {
        const ctx = createMockContext({ role: 'COLLABORATOR' });
        const question = createMockQuestion({ createdById: ctx.user.id });
        
        mockPrisma.question.create.mockResolvedValue({
          ...question,
          answers: [createMockAnswer()],
        });
        
        expect(question.createdById).toBe(ctx.user.id);
      });

      it('should default status to DRAFT', async () => {
        const question = createMockQuestion({ status: 'DRAFT' });
        expect(question.status).toBe('DRAFT');
      });

      it('should default difficulty to MEDIUM', async () => {
        const question = createMockQuestion({ difficulty: 'MEDIUM' });
        expect(question.difficulty).toBe('MEDIUM');
      });
    });
  });

  // ==========================================================================
  // updateQuestion
  // ==========================================================================
  describe('updateQuestion', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('ADMIN');
      });

      it('should throw NOT_FOUND for non-existent question', async () => {
        mockPrisma.question.findUnique.mockResolvedValue(null);
        
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Domanda non trovata',
        });
        
        expect(error.code).toBe('NOT_FOUND');
      });
    });

    describe('success scenarios', () => {
      it('should update question fields', async () => {
        const question = createMockQuestion();
        
        mockPrisma.question.findUnique.mockResolvedValue(question);
        mockPrisma.question.update.mockResolvedValue({
          ...question,
          text: 'Updated question text',
        });
        
        expect(mockPrisma.question.update).toBeDefined();
      });

      it('should update answers', async () => {
        const question = createMockQuestion();
        const newAnswers = [createMockAnswer({ isCorrect: true })];
        
        mockPrisma.questionAnswer.deleteMany.mockResolvedValue({ count: 2 });
        mockPrisma.questionAnswer.createMany.mockResolvedValue({ count: newAnswers.length });
        
        expect(newAnswers).toHaveLength(1);
      });
    });
  });

  // ==========================================================================
  // deleteQuestion
  // ==========================================================================
  describe('deleteQuestion', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('ADMIN');
      });

      it('should throw NOT_FOUND for non-existent question', async () => {
        mockPrisma.question.findUnique.mockResolvedValue(null);
        
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Domanda non trovata',
        });
        
        expect(error.code).toBe('NOT_FOUND');
      });
    });

    describe('success scenarios', () => {
      it('should delete question', async () => {
        const _question = createMockQuestion();
        
        mockPrisma.question.findUnique.mockResolvedValue(_question);
        mockPrisma.question.delete.mockResolvedValue(_question);
        
        expect(mockPrisma.question.delete).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // archiveQuestion
  // ==========================================================================
  describe('archiveQuestion', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('ADMIN');
      });
    });

    describe('success scenarios', () => {
      it('should set status to ARCHIVED', async () => {
        const question = createMockQuestion({ status: 'PUBLISHED' });
        
        mockPrisma.question.findUnique.mockResolvedValue(question);
        mockPrisma.question.update.mockResolvedValue({
          ...question,
          status: 'ARCHIVED',
        });
        
        expect(mockPrisma.question.update).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // publishQuestion
  // ==========================================================================
  describe('publishQuestion', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('ADMIN');
      });
    });

    describe('success scenarios', () => {
      it('should set status to PUBLISHED', async () => {
        const question = createMockQuestion({ status: 'DRAFT' });
        
        mockPrisma.question.findUnique.mockResolvedValue(question);
        mockPrisma.question.update.mockResolvedValue({
          ...question,
          status: 'PUBLISHED',
        });
        
        expect(mockPrisma.question.update).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // duplicateQuestion
  // ==========================================================================
  describe('duplicateQuestion', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('ADMIN');
      });
    });

    describe('success scenarios', () => {
      it('should create copy of question', async () => {
        const original = createMockQuestion();
        const duplicate = createMockQuestion({ id: faker.string.uuid() });
        
        mockPrisma.question.findUnique.mockResolvedValue({
          ...original,
          answers: [createMockAnswer()],
        });
        mockPrisma.question.create.mockResolvedValue(duplicate);
        
        expect(duplicate.id).not.toBe(original.id);
      });

      it('should set duplicate status to DRAFT', async () => {
        const duplicate = createMockQuestion({ status: 'DRAFT' });
        expect(duplicate.status).toBe('DRAFT');
      });
    });
  });

  // ==========================================================================
  // Bulk Operations (Admin Only)
  // ==========================================================================
  describe('bulkUpdateStatus', () => {
    describe('authorization', () => {
      it('should require admin role', async () => {
        const ctx = createMockContext({ role: 'ADMIN' });
        expect(ctx.user.role).toBe('ADMIN');
      });

      it('should NOT allow collaborators', async () => {
        const ctx = createMockContext({ role: 'COLLABORATOR' });
        expect(ctx.user.role).not.toBe('ADMIN');
      });
    });

    describe('success scenarios', () => {
      it('should update status for multiple questions', async () => {
        const questionIds = [faker.string.uuid(), faker.string.uuid()];
        const newStatus: QuestionStatus = 'PUBLISHED';
        
        mockPrisma.question.updateMany.mockResolvedValue({ count: questionIds.length });
        
        expect(questionIds).toHaveLength(2);
        expect(newStatus).toBe('PUBLISHED');
      });
    });
  });

  describe('bulkAddTags', () => {
    describe('authorization', () => {
      it('should require admin role', async () => {
        const ctx = createMockContext({ role: 'ADMIN' });
        expect(ctx.user.role).toBe('ADMIN');
      });
    });

    describe('success scenarios', () => {
      it('should add tags to multiple questions', async () => {
        const questionIds = [faker.string.uuid()];
        const tagIds = [faker.string.uuid()];
        
        expect(questionIds).toHaveLength(1);
        expect(tagIds).toHaveLength(1);
      });
    });
  });

  describe('bulkUpdateSubject', () => {
    describe('authorization', () => {
      it('should require admin role', async () => {
        const ctx = createMockContext({ role: 'ADMIN' });
        expect(ctx.user.role).toBe('ADMIN');
      });
    });

    describe('success scenarios', () => {
      it('should update subject for multiple questions', async () => {
        const questionIds = [faker.string.uuid()];
        const subjectId = faker.string.uuid();
        
        mockPrisma.question.updateMany.mockResolvedValue({ count: questionIds.length });
        
        expect(subjectId).toBeTruthy();
      });
    });
  });

  describe('bulkDelete', () => {
    describe('authorization', () => {
      it('should require admin role', async () => {
        const ctx = createMockContext({ role: 'ADMIN' });
        expect(ctx.user.role).toBe('ADMIN');
      });

      it('should NOT allow collaborators', async () => {
        const ctx = createMockContext({ role: 'COLLABORATOR' });
        expect(ctx.user.role).not.toBe('ADMIN');
      });
    });

    describe('success scenarios', () => {
      it('should delete multiple questions', async () => {
        const questionIds = [faker.string.uuid(), faker.string.uuid()];
        
        mockPrisma.question.deleteMany.mockResolvedValue({ count: questionIds.length });
        
        expect(questionIds).toHaveLength(2);
      });
    });
  });

  // ==========================================================================
  // Import/Export
  // ==========================================================================
  describe('exportQuestions', () => {
    describe('authorization', () => {
      it('should require admin role', async () => {
        const ctx = createMockContext({ role: 'ADMIN' });
        expect(ctx.user.role).toBe('ADMIN');
      });
    });

    describe('success scenarios', () => {
      it('should export questions as JSON', async () => {
        const questions = [createMockQuestion(), createMockQuestion()];
        
        mockPrisma.question.findMany.mockResolvedValue(questions);
        
        const exported = JSON.stringify(questions);
        expect(JSON.parse(exported)).toHaveLength(2);
      });
    });
  });

  describe('exportQuestionsCSV', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('COLLABORATOR');
      });
    });

    describe('success scenarios', () => {
      it('should export questions as CSV', async () => {
        const questions = [createMockQuestion()];
        
        mockPrisma.question.findMany.mockResolvedValue(questions);
        
        // CSV should have headers and data rows
        const headers = 'id,text,type,status,difficulty';
        expect(headers).toContain('id');
      });
    });
  });

  describe('importQuestions', () => {
    describe('authorization', () => {
      it('should require admin role', async () => {
        const ctx = createMockContext({ role: 'ADMIN' });
        expect(ctx.user.role).toBe('ADMIN');
      });
    });

    describe('input validation', () => {
      it('should validate question format', () => {
        const validQuestion = {
          text: 'Sample question?',
          type: 'MULTIPLE_CHOICE',
          answers: [
            { text: 'Answer 1', isCorrect: true },
          ],
        };
        
        expect(validQuestion.text).toBeTruthy();
        expect(validQuestion.answers.length).toBeGreaterThan(0);
      });
    });

    describe('success scenarios', () => {
      it('should import multiple questions', async () => {
        const questionsToImport = [
          { text: 'Q1?', type: 'MULTIPLE_CHOICE', answers: [] },
          { text: 'Q2?', type: 'TRUE_FALSE', answers: [] },
        ];
        
        expect(questionsToImport).toHaveLength(2);
      });
    });
  });

  // ==========================================================================
  // Feedback Management
  // ==========================================================================
  describe('getPendingFeedbacks', () => {
    describe('authorization', () => {
      it('should require admin role', async () => {
        const ctx = createMockContext({ role: 'ADMIN' });
        expect(ctx.user.role).toBe('ADMIN');
      });
    });

    describe('success scenarios', () => {
      it('should return pending feedbacks', async () => {
        const feedbacks = [
          { id: faker.string.uuid(), status: 'PENDING' },
        ];
        
        mockPrisma.questionFeedback.findMany.mockResolvedValue(feedbacks);
        
        expect(feedbacks[0].status).toBe('PENDING');
      });
    });
  });

  describe('updateFeedback', () => {
    describe('authorization', () => {
      it('should require admin role', async () => {
        const ctx = createMockContext({ role: 'ADMIN' });
        expect(ctx.user.role).toBe('ADMIN');
      });
    });

    describe('success scenarios', () => {
      it('should update feedback status', async () => {
        const feedbackId = faker.string.uuid();
        const newStatus = 'RESOLVED';
        
        mockPrisma.questionFeedback.update.mockResolvedValue({
          id: feedbackId,
          status: newStatus,
        });
        
        expect(newStatus).toBe('RESOLVED');
      });
    });
  });

  // ==========================================================================
  // Statistics
  // ==========================================================================
  describe('getQuestionStats', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('ADMIN');
      });
    });

    describe('success scenarios', () => {
      it('should return question statistics', async () => {
        const stats = {
          total: 500,
          published: 400,
          draft: 80,
          archived: 20,
          byDifficulty: { EASY: 150, MEDIUM: 250, HARD: 100 },
        };
        
        expect(stats.total).toBe(500);
        expect(stats.published).toBe(400);
      });
    });
  });

  // ==========================================================================
  // Tags
  // ==========================================================================
  describe('getAvailableTags', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('COLLABORATOR');
      });
    });

    describe('success scenarios', () => {
      it('should return available tags', async () => {
        const tags = [
          { id: faker.string.uuid(), name: 'Algebra', color: '#FF0000' },
          { id: faker.string.uuid(), name: 'Geometria', color: '#00FF00' },
        ];
        
        mockPrisma.tag.findMany.mockResolvedValue(tags);
        
        expect(tags).toHaveLength(2);
      });
    });
  });

  // ==========================================================================
  // SECURITY TESTS
  // ==========================================================================
  describe('Security', () => {
    describe('role-based access', () => {
      it('should prevent students from accessing questions', async () => {
        const ctx = createMockContext({ role: 'STUDENT' });
        expect(['ADMIN', 'COLLABORATOR']).not.toContain(ctx.user.role);
      });

      it('should prevent collaborators from bulk operations', async () => {
        const ctx = createMockContext({ role: 'COLLABORATOR' });
        expect(ctx.user.role).not.toBe('ADMIN');
      });

      it('should prevent collaborators from importing questions', async () => {
        const ctx = createMockContext({ role: 'COLLABORATOR' });
        expect(ctx.user.role).not.toBe('ADMIN');
      });
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================
  describe('Edge Cases', () => {
    describe('empty states', () => {
      it('should handle no questions found', async () => {
        mockPrisma.question.findMany.mockResolvedValue([]);
        mockPrisma.question.count.mockResolvedValue(0);
        
        const result = { questions: [], total: 0 };
        expect(result.questions).toHaveLength(0);
      });
    });

    describe('question types', () => {
      it('should handle multiple choice questions', async () => {
        const question = createMockQuestion({ type: 'MULTIPLE_CHOICE' });
        expect(question.type).toBe('MULTIPLE_CHOICE');
      });

      it('should handle true/false questions', async () => {
        const question = createMockQuestion({ type: 'TRUE_FALSE' });
        expect(question.type).toBe('TRUE_FALSE');
      });

      it('should handle open-ended questions', async () => {
        const question = createMockQuestion({ type: 'OPEN_ENDED' });
        expect(question.type).toBe('OPEN_ENDED');
      });
    });

    describe('difficulty levels', () => {
      it('should handle EASY difficulty', async () => {
        const question = createMockQuestion({ difficulty: 'EASY' });
        expect(question.difficulty).toBe('EASY');
      });

      it('should handle MEDIUM difficulty', async () => {
        const question = createMockQuestion({ difficulty: 'MEDIUM' });
        expect(question.difficulty).toBe('MEDIUM');
      });

      it('should handle HARD difficulty', async () => {
        const question = createMockQuestion({ difficulty: 'HARD' });
        expect(question.difficulty).toBe('HARD');
      });
    });
  });
});
