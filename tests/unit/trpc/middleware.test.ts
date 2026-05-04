/**
 * tRPC Middleware Tests
 *
 * Tests for authentication and authorization middleware:
 * - publicProcedure: No auth required
 * - protectedProcedure: Requires authentication
 * - adminProcedure: Requires ADMIN role
 * - collaboratorProcedure: Requires COLLABORATOR role
 * - staffProcedure: Requires ADMIN or COLLABORATOR role
 * - studentProcedure: Requires STUDENT role
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from '@/server/trpc/context';
import { User, UserRole, Student, Admin, Collaborator } from '@prisma/client';

// Mock request context
vi.mock('@/lib/utils/requestContext', () => ({
  runWithContext: (_ctx: unknown, fn: () => unknown) => fn(),
  initRequestContext: vi.fn(),
  generateRequestId: () => 'test-request-id',
}));

// Mock transformer
vi.mock('@/lib/trpc/transformer', () => ({
  transformer: {
    serialize: (v: unknown) => v,
    deserialize: (v: unknown) => v,
  },
}));

// Helper to create mock user
function createMockUser(
  role: UserRole,
  overrides: Partial<User> = {}
): User & { student?: Student | null; admin?: Admin | null; collaborator?: Collaborator | null } {
  return {
    id: 'test-user-id',
    firebaseUid: 'firebase-uid',
    email: 'test@example.com',
    name: 'Test User',
    role,
    profileCompleted: true,
    isActive: true,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    expoPushToken: null,
    student: role === 'STUDENT' ? { id: 'student-id', userId: 'test-user-id' } as Student : null,
    admin: role === 'ADMIN' ? { id: 'admin-id', userId: 'test-user-id' } as Admin : null,
    collaborator: role === 'COLLABORATOR' ? { id: 'collab-id', userId: 'test-user-id' } as Collaborator : null,
    ...overrides,
  };
}

// Helper to create mock context
function createMockContext(user: User | null = null): Context {
  return {
    user: user as Context['user'],
    prisma: {} as Context['prisma'],
    firebaseUid: user?.firebaseUid || null,
    requestId: 'test-request-id',
    requestContext: {
      requestId: 'test-request-id',
      userId: user?.id,
      userRole: user?.role,
      path: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      userAgent: 'test-agent',
      startTime: Date.now(),
    },
  };
}

// Create tRPC instance for testing
const t = initTRPC.context<Context>().create();

// Recreate middleware for testing (mirrors init.ts logic)
const withRequestContext = t.middleware(({ next }) => next());

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Not authenticated',
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const isCollaborator = t.middleware(({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== 'COLLABORATOR') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Collaborator access required',
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const isStaff = t.middleware(({ ctx, next }) => {
  if (!ctx.user || (ctx.user.role !== 'ADMIN' && ctx.user.role !== 'COLLABORATOR')) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Staff access required',
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const isStudent = t.middleware(({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== 'STUDENT') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Student access required',
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Create procedures for testing
const publicProcedure = t.procedure.use(withRequestContext);
const protectedProcedure = t.procedure.use(withRequestContext).use(isAuthed);
const adminProcedure = t.procedure.use(withRequestContext).use(isAdmin);
const collaboratorProcedure = t.procedure.use(withRequestContext).use(isCollaborator);
const staffProcedure = t.procedure.use(withRequestContext).use(isStaff);
const studentProcedure = t.procedure.use(withRequestContext).use(isStudent);

// Create test router
const testRouter = t.router({
  publicTest: publicProcedure.query(() => 'public success'),
  protectedTest: protectedProcedure.query(({ ctx }) => `protected: ${ctx.user.email}`),
  adminTest: adminProcedure.query(({ ctx }) => `admin: ${ctx.user.email}`),
  collaboratorTest: collaboratorProcedure.query(({ ctx }) => `collaborator: ${ctx.user.email}`),
  staffTest: staffProcedure.query(({ ctx }) => `staff: ${ctx.user.email}`),
  studentTest: studentProcedure.query(({ ctx }) => `student: ${ctx.user.email}`),
});

// Create caller for testing
const createCaller = t.createCallerFactory(testRouter);

describe('tRPC Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('publicProcedure', () => {
    it('should allow unauthenticated access', async () => {
      const caller = createCaller(createMockContext(null));
      const result = await caller.publicTest();
      expect(result).toBe('public success');
    });

    it('should allow authenticated access', async () => {
      const user = createMockUser('STUDENT');
      const caller = createCaller(createMockContext(user));
      const result = await caller.publicTest();
      expect(result).toBe('public success');
    });
  });

  describe('protectedProcedure', () => {
    it('should reject unauthenticated access', async () => {
      const caller = createCaller(createMockContext(null));
      await expect(caller.protectedTest()).rejects.toThrow(TRPCError);
      await expect(caller.protectedTest()).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      });
    });

    it('should allow STUDENT access', async () => {
      const user = createMockUser('STUDENT');
      const caller = createCaller(createMockContext(user));
      const result = await caller.protectedTest();
      expect(result).toBe('protected: test@example.com');
    });

    it('should allow COLLABORATOR access', async () => {
      const user = createMockUser('COLLABORATOR');
      const caller = createCaller(createMockContext(user));
      const result = await caller.protectedTest();
      expect(result).toBe('protected: test@example.com');
    });

    it('should allow ADMIN access', async () => {
      const user = createMockUser('ADMIN');
      const caller = createCaller(createMockContext(user));
      const result = await caller.protectedTest();
      expect(result).toBe('protected: test@example.com');
    });
  });

  describe('adminProcedure', () => {
    it('should reject unauthenticated access', async () => {
      const caller = createCaller(createMockContext(null));
      await expect(caller.adminTest()).rejects.toThrow(TRPCError);
      await expect(caller.adminTest()).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Admin access required',
      });
    });

    it('should reject STUDENT access', async () => {
      const user = createMockUser('STUDENT');
      const caller = createCaller(createMockContext(user));
      await expect(caller.adminTest()).rejects.toThrow(TRPCError);
      await expect(caller.adminTest()).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Admin access required',
      });
    });

    it('should reject COLLABORATOR access', async () => {
      const user = createMockUser('COLLABORATOR');
      const caller = createCaller(createMockContext(user));
      await expect(caller.adminTest()).rejects.toThrow(TRPCError);
      await expect(caller.adminTest()).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Admin access required',
      });
    });

    it('should allow ADMIN access', async () => {
      const user = createMockUser('ADMIN');
      const caller = createCaller(createMockContext(user));
      const result = await caller.adminTest();
      expect(result).toBe('admin: test@example.com');
    });
  });

  describe('collaboratorProcedure', () => {
    it('should reject unauthenticated access', async () => {
      const caller = createCaller(createMockContext(null));
      await expect(caller.collaboratorTest()).rejects.toThrow(TRPCError);
      await expect(caller.collaboratorTest()).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Collaborator access required',
      });
    });

    it('should reject STUDENT access', async () => {
      const user = createMockUser('STUDENT');
      const caller = createCaller(createMockContext(user));
      await expect(caller.collaboratorTest()).rejects.toThrow(TRPCError);
      await expect(caller.collaboratorTest()).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Collaborator access required',
      });
    });

    it('should reject ADMIN access', async () => {
      const user = createMockUser('ADMIN');
      const caller = createCaller(createMockContext(user));
      await expect(caller.collaboratorTest()).rejects.toThrow(TRPCError);
      await expect(caller.collaboratorTest()).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Collaborator access required',
      });
    });

    it('should allow COLLABORATOR access', async () => {
      const user = createMockUser('COLLABORATOR');
      const caller = createCaller(createMockContext(user));
      const result = await caller.collaboratorTest();
      expect(result).toBe('collaborator: test@example.com');
    });
  });

  describe('staffProcedure', () => {
    it('should reject unauthenticated access', async () => {
      const caller = createCaller(createMockContext(null));
      await expect(caller.staffTest()).rejects.toThrow(TRPCError);
      await expect(caller.staffTest()).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Staff access required',
      });
    });

    it('should reject STUDENT access', async () => {
      const user = createMockUser('STUDENT');
      const caller = createCaller(createMockContext(user));
      await expect(caller.staffTest()).rejects.toThrow(TRPCError);
      await expect(caller.staffTest()).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Staff access required',
      });
    });

    it('should allow COLLABORATOR access', async () => {
      const user = createMockUser('COLLABORATOR');
      const caller = createCaller(createMockContext(user));
      const result = await caller.staffTest();
      expect(result).toBe('staff: test@example.com');
    });

    it('should allow ADMIN access', async () => {
      const user = createMockUser('ADMIN');
      const caller = createCaller(createMockContext(user));
      const result = await caller.staffTest();
      expect(result).toBe('staff: test@example.com');
    });
  });

  describe('studentProcedure', () => {
    it('should reject unauthenticated access', async () => {
      const caller = createCaller(createMockContext(null));
      await expect(caller.studentTest()).rejects.toThrow(TRPCError);
      await expect(caller.studentTest()).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Student access required',
      });
    });

    it('should reject ADMIN access', async () => {
      const user = createMockUser('ADMIN');
      const caller = createCaller(createMockContext(user));
      await expect(caller.studentTest()).rejects.toThrow(TRPCError);
      await expect(caller.studentTest()).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Student access required',
      });
    });

    it('should reject COLLABORATOR access', async () => {
      const user = createMockUser('COLLABORATOR');
      const caller = createCaller(createMockContext(user));
      await expect(caller.studentTest()).rejects.toThrow(TRPCError);
      await expect(caller.studentTest()).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Student access required',
      });
    });

    it('should allow STUDENT access', async () => {
      const user = createMockUser('STUDENT');
      const caller = createCaller(createMockContext(user));
      const result = await caller.studentTest();
      expect(result).toBe('student: test@example.com');
    });
  });

  describe('security edge cases', () => {
    it('should not leak user information on auth failure', async () => {
      const caller = createCaller(createMockContext(null));
      try {
        await caller.protectedTest();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        // Error should not contain sensitive data
        expect(String(error)).not.toContain('password');
        expect(String(error)).not.toContain('token');
      }
    });

    it('should handle user with null role gracefully', async () => {
      const user = createMockUser('STUDENT');
      // Testing invalid state - assigning null to role
      (user as unknown as { role: null }).role = null;
      const caller = createCaller(createMockContext(user));
      
      // Should fail admin check
      await expect(caller.adminTest()).rejects.toThrow(TRPCError);
    });

    it('should handle user with undefined role gracefully', async () => {
      const user = createMockUser('STUDENT');
      // Testing invalid state - assigning undefined to role
      (user as unknown as { role: undefined }).role = undefined;
      const caller = createCaller(createMockContext(user));
      
      // Should fail staff check
      await expect(caller.staffTest()).rejects.toThrow(TRPCError);
    });

    it('should preserve user context through middleware chain', async () => {
      const user = createMockUser('ADMIN', { email: 'admin@test.com' });
      const caller = createCaller(createMockContext(user));
      const result = await caller.adminTest();
      expect(result).toBe('admin: admin@test.com');
    });

    it('should not allow role escalation', async () => {
      // User claims to be admin but is actually a student
      const user = createMockUser('STUDENT');
      const caller = createCaller(createMockContext(user));
      
      // Even if user somehow bypasses client checks, server should block
      await expect(caller.adminTest()).rejects.toThrow(TRPCError);
      await expect(caller.staffTest()).rejects.toThrow(TRPCError);
      await expect(caller.collaboratorTest()).rejects.toThrow(TRPCError);
    });
  });

  describe('TRPCError codes', () => {
    it('should use UNAUTHORIZED for missing auth', async () => {
      const caller = createCaller(createMockContext(null));
      try {
        await caller.protectedTest();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe('UNAUTHORIZED');
      }
    });

    it('should use FORBIDDEN for insufficient permissions', async () => {
      const user = createMockUser('STUDENT');
      const caller = createCaller(createMockContext(user));
      try {
        await caller.adminTest();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe('FORBIDDEN');
      }
    });
  });
});
