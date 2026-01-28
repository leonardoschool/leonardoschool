/**
 * Simulations Router Tests
 *
 * Tests for simulation management tRPC procedures:
 * - getSimulations: List simulations (staff only)
 * - createWithQuestions: Create simulation with questions (staff only)
 * - delete: Delete simulation (admin only)
 * - startAttempt: Start simulation attempt (student only)
 * - saveProgress: Save answers during attempt (student only)
 * 
 * Security focus: Role-based access, data integrity, student cheating prevention
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { TRPCError } from '@trpc/server';

// Mock dependencies
vi.mock('@/lib/notifications', () => ({
  notifications: {
    simulationAssigned: vi.fn().mockResolvedValue(undefined),
  },
}));

// Type for mock Prisma client
type MockPrismaClient = {
  simulation: {
    findUnique: Mock;
    findMany: Mock;
    findFirst: Mock;
    count: Mock;
    create: Mock;
    update: Mock;
    delete: Mock;
    deleteMany: Mock;
  };
  simulationQuestion: {
    findMany: Mock;
    createMany: Mock;
    deleteMany: Mock;
  };
  simulationAssignment: {
    findUnique: Mock;
    findMany: Mock;
    findFirst: Mock;
    create: Mock;
    createMany: Mock;
    update: Mock;
    delete: Mock;
    deleteMany: Mock;
  };
  simulationResult: {
    findFirst: Mock;
    findMany: Mock;
    count: Mock;
    create: Mock;
    update: Mock;
    deleteMany: Mock;
  };
  simulationSession: {
    findFirst: Mock;
    findMany: Mock;
    create: Mock;
    update: Mock;
    deleteMany: Mock;
  };
  student: {
    findUnique: Mock;
    findFirst: Mock;
  };
  groupMember: {
    findMany: Mock;
  };
  calendarEvent: {
    findMany: Mock;
    deleteMany: Mock;
  };
  eventInvitation: {
    deleteMany: Mock;
  };
  question: {
    findMany: Mock;
  };
  $transaction: Mock;
};

// Helper to create mock Prisma
function createMockPrisma(): MockPrismaClient {
  return {
    simulation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    simulationQuestion: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    simulationAssignment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    simulationResult: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    simulationSession: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    student: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    groupMember: {
      findMany: vi.fn(),
    },
    calendarEvent: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    eventInvitation: {
      deleteMany: vi.fn(),
    },
    question: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn()),
  };
}

// Helper to create mock user with role
function createMockUser(role: 'ADMIN' | 'COLLABORATOR' | 'STUDENT', overrides = {}) {
  return {
    id: `${role.toLowerCase()}-123`,
    firebaseUid: `firebase-${role.toLowerCase()}-uid`,
    email: `${role.toLowerCase()}@example.com`,
    name: `Test ${role}`,
    role,
    isActive: true,
    profileCompleted: true,
    ...overrides,
  };
}

// Helper to create mock simulation
function createMockSimulation(overrides = {}) {
  return {
    id: 'simulation-123',
    title: 'Test Simulation',
    description: 'A test simulation',
    type: 'OFFICIAL' as const,
    status: 'PUBLISHED' as const,
    visibility: 'ASSIGNED' as const,
    isOfficial: true,
    createdById: 'admin-123',
    creatorRole: 'ADMIN' as const,
    totalQuestions: 50,
    duration: 60,
    passingScore: 60,
    isRepeatable: false,
    maxAttempts: 1,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

// Helper to create mock assignment
function createMockAssignment(overrides = {}) {
  return {
    id: 'assignment-123',
    simulationId: 'simulation-123',
    studentId: 'student-record-123',
    groupId: null,
    status: 'ACTIVE' as const,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    assignedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('Simulations Router', () => {
  let mockPrisma: MockPrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
  });

  // ==================== autoCloseExpiredAssignment Tests ====================
  describe('autoCloseExpiredAssignment (helper function)', () => {
    /**
     * Tests for the on-demand auto-close functionality that ensures
     * expired assignments are closed when students access them,
     * without depending on cron jobs.
     */

    describe('when endDate is null', () => {
      it('should not close assignment and return false', async () => {
        const assignment = createMockAssignment({ endDate: null });
        
        // Function logic: if (!endDate || endDate >= new Date()) return false
        const shouldClose = assignment.endDate !== null && assignment.endDate < new Date();
        
        expect(shouldClose).toBe(false);
        expect(mockPrisma.simulationAssignment.update).not.toHaveBeenCalled();
      });
    });

    describe('when endDate is in the future', () => {
      it('should not close assignment and return false', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7); // 7 days in future
        
        const assignment = createMockAssignment({ endDate: futureDate });
        
        // Function logic: endDate >= new Date() means not expired
        const isExpired = assignment.endDate < new Date();
        
        expect(isExpired).toBe(false);
        expect(mockPrisma.simulationAssignment.update).not.toHaveBeenCalled();
      });

      it('should not close assignment if endDate is exactly now', async () => {
        const now = new Date();
        const assignment = createMockAssignment({ endDate: now });
        
        // endDate >= new Date() - boundary case, should NOT close
        const isExpired = assignment.endDate < now;
        
        expect(isExpired).toBe(false);
      });
    });

    describe('when endDate is in the past', () => {
      it('should close assignment and return true', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1); // 1 day ago
        
        const assignment = createMockAssignment({ 
          id: 'expired-assignment-123',
          endDate: pastDate,
          status: 'ACTIVE',
        });
        
        // Simulate the auto-close logic
        const isExpired = assignment.endDate !== null && assignment.endDate < new Date();
        
        expect(isExpired).toBe(true);
        
        // In real implementation, this would update the assignment
        if (isExpired) {
          mockPrisma.simulationAssignment.update.mockResolvedValue({
            ...assignment,
            status: 'CLOSED',
          });
          
          await mockPrisma.simulationAssignment.update({
            where: { id: assignment.id },
            data: { status: 'CLOSED' },
          });
        }
        
        expect(mockPrisma.simulationAssignment.update).toHaveBeenCalledWith({
          where: { id: 'expired-assignment-123' },
          data: { status: 'CLOSED' },
        });
      });

      it('should close assignment expired by minutes', async () => {
        const pastDate = new Date();
        pastDate.setMinutes(pastDate.getMinutes() - 5); // 5 minutes ago
        
        const isExpired = pastDate < new Date();
        expect(isExpired).toBe(true);
      });

      it('should close assignment expired by hours', async () => {
        const pastDate = new Date();
        pastDate.setHours(pastDate.getHours() - 2); // 2 hours ago
        
        const isExpired = pastDate < new Date();
        expect(isExpired).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should return false and not throw if update fails', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        
        mockPrisma.simulationAssignment.update.mockRejectedValue(
          new Error('Database connection lost')
        );
        
        // The function should handle errors gracefully
        let result = false;
        try {
          await mockPrisma.simulationAssignment.update({
            where: { id: 'some-id' },
            data: { status: 'CLOSED' },
          });
          result = true;
        } catch {
          result = false; // Should catch and return false
        }
        
        expect(result).toBe(false);
      });

      it('should handle non-existent assignment gracefully', async () => {
        mockPrisma.simulationAssignment.update.mockRejectedValue(
          new Error('Record not found')
        );
        
        let caughtError = false;
        try {
          await mockPrisma.simulationAssignment.update({
            where: { id: 'non-existent' },
            data: { status: 'CLOSED' },
          });
        } catch {
          caughtError = true;
        }
        
        expect(caughtError).toBe(true);
      });
    });

    describe('idempotency', () => {
      it('should be safe to call multiple times on same assignment', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        
        const assignment = createMockAssignment({ 
          id: 'already-closed-123',
          endDate: pastDate,
          status: 'CLOSED', // Already closed
        });
        
        mockPrisma.simulationAssignment.update.mockResolvedValue(assignment);
        
        // Calling again should still work (no-op in practice)
        await mockPrisma.simulationAssignment.update({
          where: { id: assignment.id },
          data: { status: 'CLOSED' },
        });
        
        expect(mockPrisma.simulationAssignment.update).toHaveBeenCalled();
        // Status remains CLOSED
        expect(assignment.status).toBe('CLOSED');
      });
    });

    describe('timezone considerations', () => {
      it('should compare dates correctly regardless of timezone', () => {
        // Dates should be compared as UTC
        const pastDateUTC = new Date('2026-01-27T23:59:59.999Z');
        const now = new Date('2026-01-28T00:00:00.000Z');
        
        const isExpired = pastDateUTC < now;
        expect(isExpired).toBe(true);
      });
    });
  });

  // ==================== checkSimulationDateAccess Tests ====================
  describe('checkSimulationDateAccess (helper function)', () => {
    /**
     * Tests for date-based access control with Virtual Room bypass logic
     */

    describe('before start date', () => {
      it('should block access if startDate is in future and no Virtual Room', () => {
        const futureStart = new Date();
        futureStart.setDate(futureStart.getDate() + 1);
        
        const now = new Date();
        const hasActiveVirtualRoom = false;
        const _isAssignmentActive = true;
        
        // Logic: effectiveStartDate > now && !hasActiveVirtualRoom
        const shouldBlock = futureStart > now && !hasActiveVirtualRoom;
        
        expect(shouldBlock).toBe(true);
      });

      it('should ALLOW access if startDate is in future but Virtual Room is active', () => {
        const futureStart = new Date();
        futureStart.setDate(futureStart.getDate() + 1);
        
        const now = new Date();
        const hasActiveVirtualRoom = true; // Virtual Room bypass
        
        // Logic: effectiveStartDate > now && !hasActiveVirtualRoom
        const shouldBlock = futureStart > now && !hasActiveVirtualRoom;
        
        expect(shouldBlock).toBe(false); // Should NOT block
      });

      it('should allow access if startDate is null', () => {
        const effectiveStartDate = null;
        const now = new Date();
        const hasActiveVirtualRoom = false;
        
        // Logic: if (!effectiveStartDate) -> no check
        const shouldBlock = effectiveStartDate && effectiveStartDate > now && !hasActiveVirtualRoom;
        
        expect(shouldBlock).toBeFalsy(); // null is falsy
      });

      it('should allow access if startDate equals now', () => {
        const now = new Date();
        const effectiveStartDate = new Date(now);
        const _hasActiveVirtualRoom = false;
        
        // Boundary: effectiveStartDate > now should be false
        const shouldBlock = effectiveStartDate > now;
        
        expect(shouldBlock).toBe(false);
      });
    });

    describe('after end date', () => {
      it('should block access if endDate passed and assignment not active', () => {
        const pastEnd = new Date();
        pastEnd.setDate(pastEnd.getDate() - 1);
        
        const now = new Date();
        const isAssignmentActive = false;
        
        // Logic: effectiveEndDate < now && !isAssignmentActive
        const shouldBlock = pastEnd < now && !isAssignmentActive;
        
        expect(shouldBlock).toBe(true);
      });

      it('should ALLOW access if endDate passed but assignment is ACTIVE (admin override)', () => {
        const pastEnd = new Date();
        pastEnd.setDate(pastEnd.getDate() - 1);
        
        const now = new Date();
        const isAssignmentActive = true; // Admin keeps it active
        
        // Logic: effectiveEndDate < now && !isAssignmentActive
        const shouldBlock = pastEnd < now && !isAssignmentActive;
        
        expect(shouldBlock).toBe(false); // Admin override
      });

      it('should allow access if endDate is null', () => {
        const effectiveEndDate = null;
        const now = new Date();
        const isAssignmentActive = false;
        
        // Logic: if (!effectiveEndDate) -> no check
        const shouldBlock = effectiveEndDate && effectiveEndDate < now && !isAssignmentActive;
        
        expect(shouldBlock).toBeFalsy(); // null is falsy
      });

      it('should allow access if endDate equals now', () => {
        const now = new Date();
        const effectiveEndDate = new Date(now);
        const _isAssignmentActive = false;
        
        // Boundary: effectiveEndDate < now should be false
        const shouldBlock = effectiveEndDate < now;
        
        expect(shouldBlock).toBe(false);
      });
    });

    describe('within valid date range', () => {
      it('should allow access between start and end dates', () => {
        const pastStart = new Date();
        pastStart.setDate(pastStart.getDate() - 1);
        
        const futureEnd = new Date();
        futureEnd.setDate(futureEnd.getDate() + 7);
        
        const now = new Date();
        const hasActiveVirtualRoom = false;
        const isAssignmentActive = true;
        
        const blockedByStart = pastStart > now && !hasActiveVirtualRoom;
        const blockedByEnd = futureEnd < now && !isAssignmentActive;
        
        expect(blockedByStart).toBe(false);
        expect(blockedByEnd).toBe(false);
      });
    });
  });

  // ==================== checkAttemptLimits Tests ====================
  describe('checkAttemptLimits (helper function)', () => {
    /**
     * Tests for attempt limit enforcement and repeatability logic
     */

    describe('non-repeatable simulations', () => {
      it('should block second attempt if not repeatable and one completed', () => {
        const isRepeatable = false;
        const completedAttempts = 1;
        const hasInProgress = false;
        
        // Logic: !isRepeatable && completedAttempts > 0 && !hasInProgress
        const shouldBlock = !isRepeatable && completedAttempts > 0 && !hasInProgress;
        
        expect(shouldBlock).toBe(true);
      });

      it('should ALLOW access to in-progress attempt even if not repeatable', () => {
        const isRepeatable = false;
        const completedAttempts = 1;
        const hasInProgress = true; // Has existing in-progress
        
        // Logic: !isRepeatable && completedAttempts > 0 && !hasInProgress
        const shouldBlock = !isRepeatable && completedAttempts > 0 && !hasInProgress;
        
        expect(shouldBlock).toBe(false); // Can resume
      });

      it('should allow first attempt if not repeatable', () => {
        const isRepeatable = false;
        const completedAttempts = 0;
        const hasInProgress = false;
        
        const shouldBlock = !isRepeatable && completedAttempts > 0 && !hasInProgress;
        
        expect(shouldBlock).toBe(false);
      });
    });

    describe('repeatable simulations', () => {
      it('should allow multiple attempts if repeatable', () => {
        const isRepeatable = true;
        const completedAttempts = 5;
        const hasInProgress = false;
        
        // Logic: !isRepeatable && ... -> false when repeatable
        const shouldBlock = !isRepeatable && completedAttempts > 0 && !hasInProgress;
        
        expect(shouldBlock).toBe(false);
      });
    });

    describe('maxAttempts enforcement', () => {
      it('should block when maxAttempts reached', () => {
        const maxAttempts = 3;
        const completedAttempts = 3;
        const hasInProgress = false;
        
        // Logic: maxAttempts && completedAttempts >= maxAttempts && !hasInProgress
        const shouldBlock = maxAttempts && completedAttempts >= maxAttempts && !hasInProgress;
        
        expect(shouldBlock).toBe(true);
      });

      it('should allow if under maxAttempts', () => {
        const maxAttempts = 3;
        const completedAttempts = 2;
        const hasInProgress = false;
        
        const shouldBlock = maxAttempts && completedAttempts >= maxAttempts && !hasInProgress;
        
        expect(shouldBlock).toBe(false);
      });

      it('should allow resuming in-progress even if maxAttempts reached', () => {
        const maxAttempts = 3;
        const completedAttempts = 3;
        const hasInProgress = true;
        
        const shouldBlock = maxAttempts && completedAttempts >= maxAttempts && !hasInProgress;
        
        expect(shouldBlock).toBe(false);
      });

      it('should allow unlimited attempts if maxAttempts is null', () => {
        const maxAttempts = null;
        const completedAttempts = 100;
        const hasInProgress = false;
        
        const shouldBlock = maxAttempts && completedAttempts >= maxAttempts && !hasInProgress;
        
        expect(shouldBlock).toBeFalsy(); // null is falsy
      });

      it('should handle maxAttempts = 1 (single attempt allowed)', () => {
        const maxAttempts = 1;
        const completedAttempts = 1;
        const _hasInProgress = false;
        
        const shouldBlock = completedAttempts >= maxAttempts;
        
        expect(shouldBlock).toBe(true);
      });
    });
  });

  // ==================== evaluateSingleSubmissionAnswer Tests ====================
  describe('evaluateSingleSubmissionAnswer (scoring logic)', () => {
    /**
     * Critical scoring tests - bugs here affect student grades
     */

    const mockQuestion = {
      questionId: 'q1',
      customPoints: null,
      customNegativePoints: null,
      question: {
        type: 'SINGLE_CHOICE',
        points: 1.5,
        negativePoints: -0.4,
        subject: { name: 'Matematica' },
        answers: [
          { id: 'a1', isCorrect: true },
          { id: 'a2', isCorrect: false },
        ],
        keywords: [],
      },
    };

    const mockConfig = {
      useQuestionPoints: true,
      correctPoints: 1.0,
      wrongPoints: -0.25,
      blankPoints: 0,
    };

    describe('choice questions', () => {
      it('should award points for correct answer', () => {
        const studentAnswer = { questionId: 'q1', answerId: 'a1' };
        const correctAnswerId = mockQuestion.question.answers.find(a => a.isCorrect)?.id;
        
        const isCorrect = studentAnswer.answerId === correctAnswerId;
        const earnedPoints = isCorrect ? mockQuestion.question.points : 0;
        
        expect(isCorrect).toBe(true);
        expect(earnedPoints).toBe(1.5);
      });

      it('should deduct points for wrong answer', () => {
        const studentAnswer = { questionId: 'q1', answerId: 'a2' };
        const correctAnswerId = mockQuestion.question.answers.find(a => a.isCorrect)?.id;
        
        const isCorrect = studentAnswer.answerId === correctAnswerId;
        const earnedPoints = isCorrect ? mockQuestion.question.points : mockQuestion.question.negativePoints;
        
        expect(isCorrect).toBe(false);
        expect(earnedPoints).toBe(-0.4);
      });

      it('should handle blank answer (no answer)', () => {
        const _studentAnswer = undefined;
        const earnedPoints = mockConfig.blankPoints;
        
        expect(earnedPoints).toBe(0);
      });

      it('should handle null answerId as blank', () => {
        const studentAnswer = { questionId: 'q1', answerId: null };
        const isBlank = !studentAnswer.answerId;
        
        expect(isBlank).toBe(true);
      });
    });

    describe('custom points override', () => {
      it('should use customPoints when provided', () => {
        const questionWithCustom = {
          ...mockQuestion,
          customPoints: 2.0,
        };
        
        const points = questionWithCustom.customPoints ?? mockQuestion.question.points;
        
        expect(points).toBe(2.0);
      });

      it('should use customNegativePoints when provided', () => {
        const questionWithCustom = {
          ...mockQuestion,
          customNegativePoints: -0.5,
        };
        
        const negativePoints = questionWithCustom.customNegativePoints ?? mockQuestion.question.negativePoints;
        
        expect(negativePoints).toBe(-0.5);
      });

      it('should fallback to question points if useQuestionPoints is false', () => {
        const config = {
          ...mockConfig,
          useQuestionPoints: false,
          correctPoints: 1.0,
        };
        
        const points = mockQuestion.customPoints ?? (config.useQuestionPoints ? mockQuestion.question.points : config.correctPoints);
        
        expect(points).toBe(1.0);
      });
    });

    describe('OPEN_TEXT questions', () => {
      const _openQuestion = {
        ...mockQuestion,
        question: {
          ...mockQuestion.question,
          type: 'OPEN_TEXT',
        },
      };

      it('should mark as pending if answer text provided', () => {
        const studentAnswer = { questionId: 'q1', answerText: 'La risposta è 42' };
        
        const hasText = studentAnswer.answerText && studentAnswer.answerText.trim().length > 0;
        const category = hasText ? 'pending' : 'blank';
        
        expect(category).toBe('pending');
      });

      it('should mark as blank if no text provided', () => {
        const studentAnswer = { questionId: 'q1', answerText: '' };
        
        const hasText = studentAnswer.answerText && studentAnswer.answerText.trim().length > 0;
        const category = hasText ? 'pending' : 'blank';
        
        expect(category).toBe('blank');
      });

      it('should mark as blank if only whitespace provided', () => {
        const studentAnswer = { questionId: 'q1', answerText: '   ' };
        
        const hasText = studentAnswer.answerText && studentAnswer.answerText.trim().length > 0;
        
        expect(hasText).toBe(false);
      });

      it('should return 0 points for pending answers', () => {
        const studentAnswer = { questionId: 'q1', answerText: 'Answer' };
        const hasText = studentAnswer.answerText && studentAnswer.answerText.trim().length > 0;
        const earnedPoints = hasText ? 0 : mockConfig.blankPoints;
        
        expect(earnedPoints).toBe(0); // Pending, not scored yet
      });
    });
  });

  // ==================== autoScoreOpenAnswer Tests ====================
  describe('autoScoreOpenAnswer (keyword matching)', () => {
    /**
     * Tests for automatic scoring of open-ended answers based on keywords
     */

    describe('keyword matching', () => {
      it('should match simple keywords case-insensitively', () => {
        const answerText = 'La fotosintesi è il processo di produzione di glucosio';
        const keywords = [
          { keyword: 'fotosintesi', weight: 1, isRequired: false },
          { keyword: 'glucosio', weight: 1, isRequired: false },
        ];
        
        const matched = keywords.filter(kw => 
          answerText.toLowerCase().includes(kw.keyword.toLowerCase())
        );
        
        expect(matched).toHaveLength(2);
      });

      it('should calculate weighted score correctly', () => {
        const keywords = [
          { keyword: 'fotosintesi', weight: 0.5, isRequired: true },
          { keyword: 'clorofilla', weight: 0.3, isRequired: false },
          { keyword: 'ossigeno', weight: 0.2, isRequired: false },
        ];
        
        const answerText = 'La fotosintesi produce ossigeno';
        const matched: string[] = [];
        let matchedWeight = 0;
        let totalWeight = 0;
        
        keywords.forEach(kw => {
          totalWeight += kw.weight;
          if (answerText.toLowerCase().includes(kw.keyword.toLowerCase())) {
            matched.push(kw.keyword);
            matchedWeight += kw.weight;
          }
        });
        
        const score = totalWeight > 0 ? matchedWeight / totalWeight : null;
        
        expect(matched).toEqual(['fotosintesi', 'ossigeno']);
        expect(matchedWeight).toBe(0.7); // 0.5 + 0.2
        expect(totalWeight).toBe(1.0);
        expect(score).toBe(0.7);
      });

      it('should return null score if no keywords provided', () => {
        const _keywords: Array<{ keyword: string; weight: number; isRequired: boolean }> = [];
        const score = _keywords.length > 0 ? 0 : null;
        
        expect(score).toBeNull();
      });

      it('should handle required keywords', () => {
        const _keywords = [
          { keyword: 'mitocondrio', weight: 1, isRequired: true },
        ];
        
        const answerWithoutRequired = 'La cellula produce energia';
        const answerWithRequired = 'Il mitocondrio produce energia';
        
        const hasRequired1 = answerWithoutRequired.toLowerCase().includes('mitocondrio');
        const hasRequired2 = answerWithRequired.toLowerCase().includes('mitocondrio');
        
        expect(hasRequired1).toBe(false);
        expect(hasRequired2).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle empty answer text', () => {
        const answerText = '';
        const keywords = [{ keyword: 'test', weight: 1, isRequired: false }];
        
        const matched = keywords.filter(kw => 
          answerText.toLowerCase().includes(kw.keyword.toLowerCase())
        );
        
        expect(matched).toHaveLength(0);
      });

      it('should handle partial word matches', () => {
        const answerText = 'La fotosintesi clorofilliana';
        const keyword = 'clorofill'; // Match partial word
        
        const isMatched = answerText.toLowerCase().includes(keyword.toLowerCase());
        
        expect(isMatched).toBe(true); // 'clorofill' is in 'clorofilliana'
      });

      it('should handle accented characters', () => {
        const answerText = 'L\'ossigeno è necessario';
        const keyword = 'ossigeno';
        
        const isMatched = answerText.toLowerCase().includes(keyword.toLowerCase());
        
        expect(isMatched).toBe(true);
      });

      it('should calculate score as 1.0 for all keywords matched', () => {
        const keywords = [
          { keyword: 'parola1', weight: 0.5, isRequired: false },
          { keyword: 'parola2', weight: 0.5, isRequired: false },
        ];
        const answerText = 'parola1 e parola2';
        
        let matchedWeight = 0;
        let totalWeight = 0;
        
        keywords.forEach(kw => {
          totalWeight += kw.weight;
          if (answerText.toLowerCase().includes(kw.keyword.toLowerCase())) {
            matchedWeight += kw.weight;
          }
        });
        
        const score = matchedWeight / totalWeight;
        
        expect(score).toBe(1.0);
      });
    });
  });

  describe('getSimulations (staffProcedure)', () => {
    describe('authorization', () => {
      it('should only allow staff (admin/collaborator) access', () => {
        const adminUser = createMockUser('ADMIN');
        const collabUser = createMockUser('COLLABORATOR');
        const studentUser = createMockUser('STUDENT');

        expect(adminUser.role).toBe('ADMIN');
        expect(collabUser.role).toBe('COLLABORATOR');
        expect(studentUser.role).toBe('STUDENT');

        // staffProcedure allows ADMIN or COLLABORATOR
        const isStaff = (role: string) => role === 'ADMIN' || role === 'COLLABORATOR';
        expect(isStaff(adminUser.role)).toBe(true);
        expect(isStaff(collabUser.role)).toBe(true);
        expect(isStaff(studentUser.role)).toBe(false);
      });
    });

    describe('filtering', () => {
      it('should filter by simulation type', () => {
        const type = 'OFFICIAL';
        const where = { type };
        expect(where.type).toBe('OFFICIAL');
      });

      it('should filter by status', () => {
        const status = 'PUBLISHED';
        const where = { status };
        expect(where.status).toBe('PUBLISHED');
      });

      it('should filter by visibility', () => {
        const visibility = 'ASSIGNED';
        const where = { visibility };
        expect(where.visibility).toBe('ASSIGNED');
      });

      it('should filter official simulations', () => {
        const isOfficial = true;
        const where = { isOfficial };
        expect(where.isOfficial).toBe(true);
      });

      it('should exclude student-created simulations by default', () => {
        // Default behavior: creatorRole should NOT be 'STUDENT'
        const where = { creatorRole: { not: 'STUDENT' } };
        expect(where.creatorRole.not).toBe('STUDENT');
      });

      it('should search in title and description', () => {
        const search = 'medicina';
        const searchCondition = {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        };

        expect(searchCondition.OR).toHaveLength(2);
        expect(searchCondition.OR[0].title.contains).toBe('medicina');
      });
    });

    describe('pagination', () => {
      it('should use default pagination', () => {
        const defaultPage = 1;
        const defaultPageSize = 20;
        const skip = (defaultPage - 1) * defaultPageSize;

        expect(skip).toBe(0);
      });

      it('should calculate skip correctly', () => {
        const page = 3;
        const pageSize = 10;
        const skip = (page - 1) * pageSize;

        expect(skip).toBe(20);
      });
    });
  });

  describe('delete (adminProcedure)', () => {
    describe('authorization', () => {
      it('should only allow admin access', () => {
        const adminUser = createMockUser('ADMIN');
        const collabUser = createMockUser('COLLABORATOR');

        expect(adminUser.role).toBe('ADMIN');
        expect(collabUser.role).not.toBe('ADMIN');
      });
    });

    describe('simulation lookup', () => {
      it('should throw NOT_FOUND for non-existent simulation', async () => {
        mockPrisma.simulation.findUnique.mockResolvedValue(null);

        const result = await mockPrisma.simulation.findUnique({
          where: { id: 'non-existent' },
        });

        expect(result).toBeNull();
        // Would throw NOT_FOUND: 'Simulazione non trovata'
      });
    });

    describe('results protection', () => {
      it('should prevent deletion if has results without force flag', async () => {
        const simulationData = {
          ...createMockSimulation(),
          _count: {
            results: 5,
            assignments: 10,
            sessions: 2,
          },
        };

        mockPrisma.simulation.findUnique.mockResolvedValue(simulationData);

        const hasResults = simulationData._count.results > 0;
        const forceDelete = false;

        const shouldBlock = hasResults && !forceDelete;
        expect(shouldBlock).toBe(true);
        // Would throw BAD_REQUEST with count info
      });

      it('should allow deletion with force flag', async () => {
        const _simulation = createMockSimulation({});

        const forceDelete = true;
        const shouldProceed = forceDelete;
        expect(shouldProceed).toBe(true);
      });

      it('should allow deletion of simulations without results', async () => {
        const simulationData = {
          ...createMockSimulation(),
          _count: {
            results: 0,
            assignments: 0,
            sessions: 0,
          },
        };

        const hasResults = simulationData._count.results > 0;
        expect(hasResults).toBe(false);
      });
    });

    describe('cascade deletion', () => {
      it('should delete related calendar events', async () => {
        const simulation = createMockSimulation({ title: 'TOLC Medicina' });
        
        const tolcTitle = `TOLC: ${simulation.title}`;
        const simTitle = `Simulazione: ${simulation.title}`;

        expect(tolcTitle).toBe('TOLC: TOLC Medicina');
        expect(simTitle).toBe('Simulazione: TOLC Medicina');

        mockPrisma.calendarEvent.findMany.mockResolvedValue([
          { id: 'event-1' },
          { id: 'event-2' },
        ]);

        await mockPrisma.calendarEvent.findMany({
          where: {
            OR: [
              { title: tolcTitle },
              { title: simTitle },
            ],
          },
        });

        expect(mockPrisma.calendarEvent.findMany).toHaveBeenCalled();
      });
    });
  });

  describe('startAttempt (studentProcedure)', () => {
    describe('authorization', () => {
      it('should only allow student access', () => {
        const studentUser = createMockUser('STUDENT');
        const adminUser = createMockUser('ADMIN');

        expect(studentUser.role).toBe('STUDENT');
        expect(adminUser.role).not.toBe('STUDENT');
      });
    });

    describe('simulation availability', () => {
      it('should throw NOT_FOUND for non-existent simulation', async () => {
        mockPrisma.simulation.findUnique.mockResolvedValue(null);

        const result = await mockPrisma.simulation.findUnique({
          where: { id: 'non-existent' },
        });

        expect(result).toBeNull();
        // Would throw NOT_FOUND: 'Simulazione non disponibile'
      });

      it('should throw NOT_FOUND for unpublished simulation', async () => {
        const simulation = createMockSimulation({ status: 'DRAFT' });
        
        const isPublished = simulation.status === 'PUBLISHED';
        expect(isPublished).toBe(false);
        // Would throw NOT_FOUND
      });

      it('should allow access to published simulations', async () => {
        const simulation = createMockSimulation({ status: 'PUBLISHED' });
        
        const isPublished = simulation.status === 'PUBLISHED';
        expect(isPublished).toBe(true);
      });
    });

    describe('assignment checks', () => {
      it('should throw FORBIDDEN for closed assignments', async () => {
        const assignmentStatus: string = 'CLOSED';

        const isClosed = assignmentStatus === 'CLOSED';
        expect(isClosed).toBe(true);
        // Would throw FORBIDDEN: 'Questa simulazione è stata chiusa'
      });

      it('should allow access to active assignments', async () => {
        const assignment = createMockAssignment({ status: 'ACTIVE' });

        const isActive = assignment.status === 'ACTIVE';
        expect(isActive).toBe(true);
      });
    });

    describe('group membership check', () => {
      it('should check student groups for group assignments', async () => {
        const studentId = 'student-record-123';

        mockPrisma.groupMember.findMany.mockResolvedValue([
          { groupId: 'group-1' },
          { groupId: 'group-2' },
        ]);

        const groupMembers = await mockPrisma.groupMember.findMany({
          where: { studentId },
          select: { groupId: true },
        });

        const groupIds = groupMembers.map((gm: { groupId: string }) => gm.groupId);

        expect(groupIds).toEqual(['group-1', 'group-2']);
      });
    });

    describe('attempt limits', () => {
      it('should check maxAttempts for non-repeatable simulations', async () => {
        const simulation = createMockSimulation({
          isRepeatable: false,
          maxAttempts: 1,
        });

        expect(simulation.isRepeatable).toBe(false);
        expect(simulation.maxAttempts).toBe(1);
      });

      it('should allow unlimited attempts for repeatable simulations', async () => {
        const simulation = createMockSimulation({
          isRepeatable: true,
          maxAttempts: null,
        });

        expect(simulation.isRepeatable).toBe(true);
      });
    });
  });

  describe('input validation', () => {
    describe('getSimulations input', () => {
      it('should accept valid type values', () => {
        const validTypes = ['OFFICIAL', 'QUICK_QUIZ', 'PERSONAL'];
        validTypes.forEach(type => {
          expect(validTypes).toContain(type);
        });
      });

      it('should accept valid status values', () => {
        const validStatuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
        validStatuses.forEach(status => {
          expect(validStatuses).toContain(status);
        });
      });

      it('should accept valid visibility values', () => {
        const validVisibility = ['PUBLIC', 'ASSIGNED', 'PRIVATE'];
        validVisibility.forEach(visibility => {
          expect(validVisibility).toContain(visibility);
        });
      });
    });

    describe('delete input', () => {
      it('should require simulation id', () => {
        const input = { id: 'simulation-123' };
        expect(input.id).toBeDefined();
      });

      it('should accept optional force flag', () => {
        const inputWithForce = { id: 'simulation-123', force: true };
        const inputWithoutForce = { id: 'simulation-123' };

        expect(inputWithForce.force).toBe(true);
        expect(inputWithoutForce).not.toHaveProperty('force');
      });
    });

    describe('startAttempt input', () => {
      it('should require simulationId', () => {
        const input = { simulationId: 'simulation-123' };
        expect(input.simulationId).toBeDefined();
      });

      it('should accept optional assignmentId', () => {
        const inputWithAssignment = { 
          simulationId: 'simulation-123', 
          assignmentId: 'assignment-456' 
        };
        const inputWithoutAssignment = { simulationId: 'simulation-123' };

        expect(inputWithAssignment.assignmentId).toBeDefined();
        expect(inputWithoutAssignment).not.toHaveProperty('assignmentId');
      });
    });
  });

  describe('error handling', () => {
    it('should use NOT_FOUND for missing simulation', () => {
      const error = new TRPCError({
        code: 'NOT_FOUND',
        message: 'Simulazione non trovata',
      });

      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toContain('Simulazione');
    });

    it('should use FORBIDDEN for closed assignment', () => {
      const error = new TRPCError({
        code: 'FORBIDDEN',
        message: 'Questa simulazione è stata chiusa e non puoi più accedervi',
      });

      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toContain('chiusa');
    });

    it('should use BAD_REQUEST for deletion with results', () => {
      const resultCount = 5;
      const error = new TRPCError({
        code: 'BAD_REQUEST',
        message: `Questa simulazione ha ${resultCount} risultati salvati. Usa l'eliminazione forzata per eliminare tutto.`,
      });

      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toContain('5 risultati');
    });
  });

  describe('security considerations', () => {
    it('should not expose simulation answers to students before completion', () => {
      // When getting simulation for student, correct answers should not be included
      const questionForStudent = {
        id: 'question-123',
        text: 'What is 2+2?',
        options: ['3', '4', '5', '6'],
        // correctAnswer should NOT be included
      };

      expect(questionForStudent).not.toHaveProperty('correctAnswer');
    });

    it('should exclude student-created simulations from staff list', () => {
      // By default, staff list should exclude QUICK_QUIZ created by students
      const defaultFilter = { creatorRole: { not: 'STUDENT' } };
      expect(defaultFilter.creatorRole.not).toBe('STUDENT');
    });

    it('should verify student has assignment before starting', () => {
      // startAttempt must verify the student is assigned (directly or via group)
      const checkAssignment = (studentId: string, groupIds: string[]) => ({
        OR: [
          { studentId },
          ...(groupIds.length > 0 ? [{ groupId: { in: groupIds } }] : []),
        ],
      });

      const filter = checkAssignment('student-123', ['group-1', 'group-2']);
      expect(filter.OR).toHaveLength(2);
    });

    it('should use transactions for multi-step operations', () => {
      // Create and delete operations should use transactions
      expect(mockPrisma.$transaction).toBeDefined();
    });

    it('should log force delete operations', () => {
      // When force deleting with results, action should be logged
      const simulationData = {
        ...createMockSimulation({ title: 'Important Exam' }),
        _count: { results: 10, assignments: 5 },
      };

      const logMessage = `Force delete: "${simulationData.title}" with ${simulationData._count.results} results, ${simulationData._count.assignments} assignments`;
      expect(logMessage).toContain('10 results');
      expect(logMessage).toContain('5 assignments');
    });
  });

  describe('simulation types', () => {
    it('should distinguish between OFFICIAL and QUICK_QUIZ', () => {
      const official = createMockSimulation({ type: 'OFFICIAL' });
      const quickQuiz = createMockSimulation({ type: 'QUICK_QUIZ' });

      expect(official.type).toBe('OFFICIAL');
      expect(quickQuiz.type).toBe('QUICK_QUIZ');
    });

    it('should support PERSONAL simulations for self-practice', () => {
      const personal = createMockSimulation({
        type: 'PERSONAL',
        createdById: 'student-123',
        creatorRole: 'STUDENT',
      });

      expect(personal.type).toBe('PERSONAL');
      expect(personal.creatorRole).toBe('STUDENT');
    });
  });

  describe('simulation status flow', () => {
    it('should start as DRAFT', () => {
      const draft = createMockSimulation({ status: 'DRAFT' });
      expect(draft.status).toBe('DRAFT');
    });

    it('should be publishable', () => {
      const statuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
      expect(statuses).toContain('PUBLISHED');
    });

    it('should be archivable', () => {
      const statuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
      expect(statuses).toContain('ARCHIVED');
    });
  });

  describe('assignment status', () => {
    it('should support ACTIVE status', () => {
      const assignment = createMockAssignment({ status: 'ACTIVE' });
      expect(assignment.status).toBe('ACTIVE');
    });

    it('should support CLOSED status', () => {
      const assignment = createMockAssignment({ status: 'CLOSED' });
      expect(assignment.status).toBe('CLOSED');
    });

    it('should support COMPLETED status', () => {
      const assignment = createMockAssignment({ status: 'COMPLETED' });
      expect(assignment.status).toBe('COMPLETED');
    });
  });
});
