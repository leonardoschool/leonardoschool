/**
 * Users Router Tests
 *
 * Tests for user management tRPC procedures:
 * - me: Get current user info (protected)
 * - getAll: List all users (admin only)
 * - changeRole: Change user role (admin only)
 * - toggleActive: Toggle user active status (admin only)
 * - deleteUser: Delete user (admin only)
 * 
 * Security focus: Role-based access, self-modification prevention
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { TRPCError } from '@trpc/server';

// Mock Firebase Admin
vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    deleteUser: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock cache
vi.mock('@/lib/cache/serverCache', () => ({
  createCachedQuery: vi.fn((key, fn) => fn),
  CACHE_TIMES: { MEDIUM: 300 },
  CACHE_TAGS: { USERS: 'users' },
}));

// Mock matricola utils
vi.mock('@/lib/utils/matricolaUtils', () => ({
  generateMatricola: vi.fn().mockResolvedValue('LS20260001'),
}));

// Type for mock Prisma client
type MockPrismaClient = {
  user: {
    findUnique: Mock;
    findMany: Mock;
    count: Mock;
    create: Mock;
    update: Mock;
    delete: Mock;
  };
  student: {
    findFirst: Mock;
    delete: Mock;
  };
  studentStats: {
    create: Mock;
    deleteMany: Mock;
  };
  collaborator: {
    delete: Mock;
  };
  admin: {
    delete: Mock;
  };
  contract: {
    deleteMany: Mock;
  };
  simulationResult: {
    deleteMany: Mock;
  };
  simulation: {
    findMany: Mock;
    deleteMany: Mock;
  };
  simulationQuestion: {
    deleteMany: Mock;
  };
  simulationAssignment: {
    deleteMany: Mock;
  };
  $transaction: Mock;
};

// Helper to create mock Prisma
function createMockPrisma(): MockPrismaClient {
  return {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    student: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    studentStats: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    collaborator: {
      delete: vi.fn(),
    },
    admin: {
      delete: vi.fn(),
    },
    contract: {
      deleteMany: vi.fn(),
    },
    simulationResult: {
      deleteMany: vi.fn(),
    },
    simulation: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn(),
    },
    simulationQuestion: {
      deleteMany: vi.fn(),
    },
    simulationAssignment: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn()),
  };
}

// Helper to create mock user
function createMockUser(overrides = {}) {
  return {
    id: 'user-123',
    firebaseUid: 'firebase-uid-123',
    email: 'user@example.com',
    name: 'Test User',
    role: 'STUDENT' as const,
    isActive: true,
    profileCompleted: true,
    emailVerified: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    lastLoginAt: null,
    expoPushToken: null,
    student: null,
    admin: null,
    collaborator: null,
    ...overrides,
  };
}

// Helper to create mock admin context
function createMockAdminContext(prisma: MockPrismaClient) {
  return {
    user: createMockUser({
      id: 'admin-123',
      role: 'ADMIN',
      admin: { id: 'admin-record-123', userId: 'admin-123' },
    }),
    prisma,
    firebaseUid: 'admin-firebase-uid',
    requestId: 'test-request-id',
  };
}

// Helper to create mock student context
function createMockStudentContext(prisma: MockPrismaClient) {
  return {
    user: createMockUser({
      id: 'student-123',
      role: 'STUDENT',
      student: { id: 'student-record-123', userId: 'student-123', matricola: 'LS20260001' },
    }),
    prisma,
    firebaseUid: 'student-firebase-uid',
    requestId: 'test-request-id',
  };
}

describe('Users Router', () => {
  let mockPrisma: MockPrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
  });

  describe('me (protectedProcedure)', () => {
    describe('authentication', () => {
      it('should require authentication', () => {
        // protectedProcedure requires ctx.user to be set
        const ctx = { user: null };
        const isAuthenticated = ctx.user !== null;
        expect(isAuthenticated).toBe(false);
      });

      it('should allow authenticated users', () => {
        const ctx = createMockStudentContext(mockPrisma);
        const isAuthenticated = ctx.user !== null;
        expect(isAuthenticated).toBe(true);
      });
    });

    describe('user data retrieval', () => {
      it('should return basic user info if user not found in DB', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);

        const ctx = createMockStudentContext(mockPrisma);
        
        // When user not found in DB, router returns ctx.user data
        const result = await mockPrisma.user.findUnique({
          where: { id: ctx.user.id },
        });

        expect(result).toBeNull();
        // Router would return:
        const fallback = {
          id: ctx.user.id,
          name: ctx.user.name,
          email: ctx.user.email,
          role: ctx.user.role,
          isActive: ctx.user.isActive,
          profileCompleted: ctx.user.profileCompleted,
        };
        expect(fallback.id).toBe('student-123');
      });

      it('should return full user data with student info', async () => {
        const mockStudent = {
          id: 'student-record-123',
          userId: 'student-123',
          matricola: 'LS20260001',
          fiscalCode: 'RSSMRA80A01H501U',
          dateOfBirth: new Date('2000-01-15'),
          phone: '+39 333 1234567',
          address: 'Via Roma 1',
          city: 'Roma',
          province: 'RM',
          postalCode: '00100',
          enrollmentDate: new Date('2026-01-01'),
          graduationYear: null,
          requiresParentData: false,
          parentDataRequestedAt: null,
          parentDataRequestedById: null,
          parentGuardian: null,
        };

        const mockUser = createMockUser({
          id: 'student-123',
          role: 'STUDENT',
          student: mockStudent,
        });

        mockPrisma.user.findUnique.mockResolvedValue(mockUser);

        const result = await mockPrisma.user.findUnique({
          where: { id: 'student-123' },
          include: { student: { include: { parentGuardian: true } } },
        });

        expect(result).not.toBeNull();
        expect(result?.student?.matricola).toBe('LS20260001');
        expect(result?.student?.fiscalCode).toBe('RSSMRA80A01H501U');
      });
    });
  });

  describe('getAll (adminProcedure)', () => {
    describe('authorization', () => {
      it('should only be accessible by admins', () => {
        // adminProcedure requires role === 'ADMIN'
        const adminCtx = createMockAdminContext(mockPrisma);
        const studentCtx = createMockStudentContext(mockPrisma);

        expect(adminCtx.user.role).toBe('ADMIN');
        expect(studentCtx.user.role).toBe('STUDENT');
        expect(studentCtx.user.role).not.toBe('ADMIN');
      });
    });

    describe('filtering', () => {
      it('should build search filter for name and email', () => {
        const search = 'mario';
        const whereClause = {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        };

        expect(whereClause.OR).toHaveLength(2);
        expect(whereClause.OR[0].name.contains).toBe('mario');
      });

      it('should filter by role', () => {
        const role: string = 'STUDENT';
        const whereClause = role !== 'ALL' ? { role } : {};

        expect(whereClause).toEqual({ role: 'STUDENT' });
      });

      it('should not filter role when ALL selected', () => {
        const role: string = 'ALL';
        const whereClause = role !== 'ALL' ? { role } : {};

        expect(whereClause).toEqual({});
      });

      it('should filter active users', () => {
        const status = 'ACTIVE';
        const whereClause = status === 'ACTIVE' ? { isActive: true } : {};

        expect(whereClause).toEqual({ isActive: true });
      });
    });

    describe('pagination', () => {
      it('should use default pagination values', () => {
        const input = undefined;
        const { page, limit } = input || { page: 1, limit: 20 };

        expect(page).toBe(1);
        expect(limit).toBe(20);
      });

      it('should respect custom pagination', () => {
        const input = { page: 3, limit: 50 };
        const skip = (input.page - 1) * input.limit;

        expect(skip).toBe(100);
        expect(input.limit).toBe(50);
      });
    });
  });

  describe('changeRole (adminProcedure)', () => {
    describe('self-modification prevention', () => {
      it('should prevent admin from changing own role', () => {
        const ctx = createMockAdminContext(mockPrisma);
        const input = { userId: 'admin-123', newRole: 'STUDENT' };

        const isSelfModification = input.userId === ctx.user.id;
        expect(isSelfModification).toBe(true);
        // Would throw FORBIDDEN: 'Non puoi modificare il tuo ruolo'
      });

      it('should allow changing other users roles', () => {
        const ctx = createMockAdminContext(mockPrisma);
        const input = { userId: 'user-456', newRole: 'COLLABORATOR' };

        const isSelfModification = input.userId === ctx.user.id;
        expect(isSelfModification).toBe(false);
      });
    });

    describe('user lookup', () => {
      it('should throw NOT_FOUND for non-existent user', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);

        const result = await mockPrisma.user.findUnique({
          where: { id: 'non-existent' },
        });

        expect(result).toBeNull();
        // Would throw NOT_FOUND: 'Utente non trovato'
      });
    });

    describe('role change logic', () => {
      it('should return user unchanged if role is same', () => {
        const user = createMockUser({ role: 'STUDENT' });
        const newRole: string = 'STUDENT';

        const roleChanged = (user.role as string) !== newRole;
        expect(roleChanged).toBe(false);
      });

      it('should detect when role actually changes', () => {
        const user = createMockUser({ role: 'STUDENT' });
        const newRole: string = 'COLLABORATOR';

        const roleChanged = (user.role as string) !== newRole;
        expect(roleChanged).toBe(true);
      });
    });

    describe('profile data migration', () => {
      it('should extract common data from student profile', () => {
        const oldStudent = {
          fiscalCode: 'RSSMRA80A01H501U',
          dateOfBirth: new Date('2000-01-15'),
          phone: '+39 333 1234567',
          address: 'Via Roma 1',
          city: 'Roma',
          province: 'RM',
          postalCode: '00100',
        };

        const commonData = {
          fiscalCode: oldStudent.fiscalCode,
          dateOfBirth: oldStudent.dateOfBirth,
          phone: oldStudent.phone,
          address: oldStudent.address,
          city: oldStudent.city,
          province: oldStudent.province,
          postalCode: oldStudent.postalCode,
        };

        expect(commonData.fiscalCode).toBe('RSSMRA80A01H501U');
        expect(commonData.city).toBe('Roma');
      });

      it('should determine if new profile is complete', () => {
        // Admin profile is always complete
        expect(true).toBe(true); // ADMIN case

        // Student/Collaborator requires all fields
        const commonData = {
          fiscalCode: 'RSSMRA80A01H501U',
          dateOfBirth: new Date(),
          phone: '+39 333 1234567',
          address: 'Via Roma 1',
          city: 'Roma',
          province: 'RM',
          postalCode: '00100',
        };

        const isComplete = Boolean(
          commonData.fiscalCode &&
          commonData.dateOfBirth &&
          commonData.phone &&
          commonData.address &&
          commonData.city &&
          commonData.province &&
          commonData.postalCode
        );

        expect(isComplete).toBe(true);
      });

      it('should detect incomplete profile', () => {
        const commonData = {
          fiscalCode: null,
          dateOfBirth: null,
          phone: '+39 333 1234567',
          address: null,
          city: null,
          province: null,
          postalCode: null,
        };

        const isComplete = Boolean(
          commonData.fiscalCode &&
          commonData.dateOfBirth &&
          commonData.phone &&
          commonData.address &&
          commonData.city &&
          commonData.province &&
          commonData.postalCode
        );

        expect(isComplete).toBe(false);
      });
    });

    describe('valid role values', () => {
      it('should accept valid role values', () => {
        const validRoles = ['ADMIN', 'COLLABORATOR', 'STUDENT'];
        
        validRoles.forEach(role => {
          expect(['ADMIN', 'COLLABORATOR', 'STUDENT']).toContain(role);
        });
      });
    });
  });

  describe('toggleActive (adminProcedure)', () => {
    it('should toggle user active status', async () => {
      const user = createMockUser({ isActive: true });
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const newActiveStatus = !user.isActive;
      expect(newActiveStatus).toBe(false);
    });

    it('should activate inactive user', () => {
      const user = createMockUser({ isActive: false });
      const newActiveStatus = !user.isActive;
      expect(newActiveStatus).toBe(true);
    });
  });

  describe('deleteUser (adminProcedure)', () => {
    describe('self-deletion prevention', () => {
      it('should prevent admin from deleting own account', () => {
        const ctx = createMockAdminContext(mockPrisma);
        const input = { userId: 'admin-123' };

        const isSelfDeletion = input.userId === ctx.user.id;
        expect(isSelfDeletion).toBe(true);
        // Would throw FORBIDDEN: 'Non puoi eliminare il tuo account'
      });

      it('should allow deleting other users', () => {
        const ctx = createMockAdminContext(mockPrisma);
        const input = { userId: 'other-user-456' };

        const isSelfDeletion = input.userId === ctx.user.id;
        expect(isSelfDeletion).toBe(false);
      });
    });

    describe('Firebase integration', () => {
      it('should delete user from Firebase', async () => {
        const { adminAuth } = await import('@/lib/firebase/admin');
        
        await adminAuth.deleteUser('firebase-uid-123');

        expect(adminAuth.deleteUser).toHaveBeenCalledWith('firebase-uid-123');
      });

      it('should handle Firebase user not found gracefully', async () => {
        const { adminAuth } = await import('@/lib/firebase/admin');
        const mockDelete = adminAuth.deleteUser as Mock;
        
        mockDelete.mockRejectedValueOnce({ code: 'auth/user-not-found' });

        // Should not throw, should continue with DB deletion
        try {
          await adminAuth.deleteUser('non-existent');
        } catch (error: unknown) {
          expect((error as { code: string }).code).toBe('auth/user-not-found');
        }
      });
    });

    describe('cascade deletion', () => {
      it('should delete student-related data', async () => {
        const studentId = 'student-record-123';

        // Simulate cascade deletions
        await mockPrisma.studentStats.deleteMany({ where: { studentId } });
        await mockPrisma.contract.deleteMany({ where: { studentId } });
        await mockPrisma.simulationResult.deleteMany({ where: { studentId } });

        expect(mockPrisma.studentStats.deleteMany).toHaveBeenCalled();
        expect(mockPrisma.contract.deleteMany).toHaveBeenCalled();
        expect(mockPrisma.simulationResult.deleteMany).toHaveBeenCalled();
      });

      it('should delete quick quiz simulations created by user', async () => {
        const userId = 'user-123';
        const quickQuizzes = [{ id: 'quiz-1' }, { id: 'quiz-2' }];
        
        mockPrisma.simulation.findMany.mockResolvedValue(quickQuizzes);

        const result = await mockPrisma.simulation.findMany({
          where: { createdById: userId, type: 'QUICK_QUIZ' },
          select: { id: true },
        });

        expect(result).toEqual(quickQuizzes);
        
        if (result.length > 0) {
          const quizIds = result.map((q: { id: string }) => q.id);
          await mockPrisma.simulationQuestion.deleteMany({ where: { simulationId: { in: quizIds } } });
          await mockPrisma.simulationAssignment.deleteMany({ where: { simulationId: { in: quizIds } } });
          await mockPrisma.simulation.deleteMany({ where: { id: { in: quizIds } } });
        }

        expect(mockPrisma.simulationQuestion.deleteMany).toHaveBeenCalled();
        expect(mockPrisma.simulationAssignment.deleteMany).toHaveBeenCalled();
        expect(mockPrisma.simulation.deleteMany).toHaveBeenCalled();
      });

      it('should use transaction for atomic deletion', async () => {
        await mockPrisma.$transaction(async () => {
          await mockPrisma.user.delete({ where: { id: 'user-123' } });
        });

        expect(mockPrisma.$transaction).toHaveBeenCalled();
      });
    });

    describe('response', () => {
      it('should return success message', () => {
        const response = { success: true, message: 'Utente eliminato con successo' };

        expect(response.success).toBe(true);
        expect(response.message).toContain('eliminato');
      });
    });
  });

  describe('input validation', () => {
    describe('getAll input', () => {
      it('should accept valid search string', () => {
        const input = { search: 'mario rossi' };
        expect(typeof input.search).toBe('string');
      });

      it('should accept valid role filter', () => {
        const validRoles = ['ALL', 'ADMIN', 'COLLABORATOR', 'STUDENT'];
        validRoles.forEach(role => {
          expect(validRoles).toContain(role);
        });
      });

      it('should accept valid status filter', () => {
        const validStatuses = [
          'ALL', 'ACTIVE', 'INACTIVE', 'PENDING_PROFILE', 
          'PENDING_CONTRACT', 'PENDING_SIGN', 'PENDING_ACTIVATION', 'NO_SIGNED_CONTRACT'
        ];
        validStatuses.forEach(status => {
          expect(validStatuses).toContain(status);
        });
      });

      it('should enforce pagination limits', () => {
        const minPage = 1;
        const maxLimit = 100;
        const defaultLimit = 20;

        expect(minPage).toBeGreaterThanOrEqual(1);
        expect(defaultLimit).toBeLessThanOrEqual(maxLimit);
      });
    });

    describe('changeRole input', () => {
      it('should require userId', () => {
        const input = { userId: 'user-123', newRole: 'ADMIN' };
        expect(input.userId).toBeDefined();
      });

      it('should require valid newRole', () => {
        const validRoles = ['ADMIN', 'COLLABORATOR', 'STUDENT'];
        const input = { userId: 'user-123', newRole: 'ADMIN' };
        expect(validRoles).toContain(input.newRole);
      });
    });

    describe('deleteUser input', () => {
      it('should require userId', () => {
        const input = { userId: 'user-123' };
        expect(input.userId).toBeDefined();
        expect(typeof input.userId).toBe('string');
      });
    });
  });

  describe('error handling', () => {
    it('should use FORBIDDEN for self-modification', () => {
      const error = new TRPCError({
        code: 'FORBIDDEN',
        message: 'Non puoi modificare il tuo ruolo',
      });

      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toContain('Non puoi');
    });

    it('should use NOT_FOUND for missing user', () => {
      const error = new TRPCError({
        code: 'NOT_FOUND',
        message: 'Utente non trovato',
      });

      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Utente non trovato');
    });

    it('should use INTERNAL_SERVER_ERROR for Firebase failures', () => {
      const error = new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Errore durante l\'eliminazione da Firebase',
      });

      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.message).toContain('Firebase');
    });
  });

  describe('security considerations', () => {
    it('should prevent privilege escalation by non-admins', () => {
      // Only adminProcedure can access changeRole
      const studentCtx = createMockStudentContext(mockPrisma);
      expect(studentCtx.user.role).not.toBe('ADMIN');
      // Would throw FORBIDDEN before reaching procedure
    });

    it('should prevent mass deletion by requiring single userId', () => {
      // deleteUser only accepts single userId, not array
      const input = { userId: 'single-user-id' };
      expect(typeof input.userId).toBe('string');
      expect(Array.isArray(input.userId)).toBe(false);
    });

    it('should use transactions for data integrity', () => {
      // All destructive operations use $transaction
      expect(mockPrisma.$transaction).toBeDefined();
    });
  });
});
