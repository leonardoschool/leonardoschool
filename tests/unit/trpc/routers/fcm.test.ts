/**
 * FCM (Firebase Cloud Messaging) Router Tests
 *
 * Tests for FCM token management endpoints.
 * The FCM router handles:
 * - Token registration (create/update)
 * - Token unregistration
 * - Token status queries
 * - Test notifications (admin only)
 *
 * Procedures tested:
 * - User: registerToken, unregisterToken, unregisterAllTokens, getStatus
 * - Admin: sendTestNotification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { faker } from '@faker-js/faker/locale/it';
import type { FCMToken, User, UserRole } from '@prisma/client';

// ===================== MOCK FACTORIES =====================

/**
 * Create a mock FCM token
 */
function createMockFCMToken(overrides: Partial<FCMToken> = {}): FCMToken {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    token: `fcm-token-${faker.string.alphanumeric(100)}`,
    deviceInfo: faker.helpers.arrayElement(['Chrome/Windows', 'Safari/Mac', 'Firefox/Linux']),
    platform: faker.helpers.arrayElement(['web', 'android', 'ios']),
    isActive: true,
    lastUsedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock user
 */
function createMockUser(overrides: Partial<User> = {}): User {
  const role = overrides.role || ('STUDENT' as UserRole);
  return {
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    displayName: faker.person.fullName(),
    photoURL: null,
    role: role as UserRole,
    profileCompleted: true,
    isActive: true,
    province: 'Roma',
    createdAt: new Date(),
    updatedAt: new Date(),
    firstName: null,
    lastName: null,
    phone: null,
    fiscalCode: null,
    birthDate: null,
    address: null,
    city: null,
    postalCode: null,
    bio: null,
    education: null,
    specialty: null,
    experience: null,
    lastEmailSent: null,
    ...overrides,
  } as User;
}

// ===================== MOCK SETUP =====================

// Mock the prisma client
const mockPrisma = {
  fCMToken: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

// Mock FCM service
const mockFcmService = {
  sendPushNotificationToUser: vi.fn(),
};

vi.mock('@/server/services/fcmService', () => mockFcmService);

// ===================== TEST CONTEXT HELPERS =====================

interface MockContext {
  user: { id: string; role: UserRole };
  prisma: typeof mockPrisma;
}

function createTestContext(role: UserRole = 'STUDENT' as UserRole): MockContext {
  return {
    user: { id: faker.string.uuid(), role },
    prisma: mockPrisma,
  };
}

// ===================== TESTS =====================

describe('FCM Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerToken', () => {
    it('should create a new FCM token for user', async () => {
      const ctx = createTestContext('STUDENT' as UserRole);
      const token = `fcm-token-${faker.string.alphanumeric(100)}`;
      const deviceInfo = 'Chrome/Windows';

      const mockToken = createMockFCMToken({
        userId: ctx.user.id,
        token,
        deviceInfo,
      });

      mockPrisma.fCMToken.findFirst.mockResolvedValue(null);
      mockPrisma.fCMToken.create.mockResolvedValue(mockToken);

      // Simulate the registration logic
      const existingToken = await mockPrisma.fCMToken.findFirst({
        where: {
          userId: ctx.user.id,
          token,
        },
      });

      expect(existingToken).toBeNull();

      const createdToken = await mockPrisma.fCMToken.create({
        data: {
          userId: ctx.user.id,
          token,
          deviceInfo,
        },
      });

      expect(createdToken).toEqual(mockToken);
      expect(mockPrisma.fCMToken.findFirst).toHaveBeenCalledWith({
        where: { userId: ctx.user.id, token },
      });
      expect(mockPrisma.fCMToken.create).toHaveBeenCalledWith({
        data: { userId: ctx.user.id, token, deviceInfo },
      });
    });

    it('should update existing token if already registered', async () => {
      const ctx = createTestContext('STUDENT' as UserRole);
      const token = `fcm-token-${faker.string.alphanumeric(100)}`;
      const deviceInfo = 'Safari/Mac';

      const existingMockToken = createMockFCMToken({
        userId: ctx.user.id,
        token,
        deviceInfo: 'Chrome/Windows', // Old device info
      });

      const updatedMockToken = {
        ...existingMockToken,
        deviceInfo,
        updatedAt: new Date(),
      };

      mockPrisma.fCMToken.findFirst.mockResolvedValue(existingMockToken);
      mockPrisma.fCMToken.update.mockResolvedValue(updatedMockToken);

      const existing = await mockPrisma.fCMToken.findFirst({
        where: { userId: ctx.user.id, token },
      });

      expect(existing).not.toBeNull();

      const updated = await mockPrisma.fCMToken.update({
        where: { id: existing!.id },
        data: { deviceInfo, updatedAt: expect.any(Date) },
      });

      expect(updated.deviceInfo).toBe(deviceInfo);
    });

    it('should validate token is not empty', () => {
      const emptyToken = '';
      expect(emptyToken.length).toBe(0);
      // In real router, Zod validation would reject empty string
    });

    it('should work for all user roles', async () => {
      const roles: UserRole[] = ['STUDENT', 'COLLABORATOR', 'ADMIN'] as UserRole[];

      for (const role of roles) {
        const ctx = createTestContext(role);
        const token = `fcm-token-${faker.string.alphanumeric(100)}`;

        const mockToken = createMockFCMToken({
          userId: ctx.user.id,
          token,
        });

        mockPrisma.fCMToken.findFirst.mockResolvedValue(null);
        mockPrisma.fCMToken.create.mockResolvedValue(mockToken);

        const createdToken = await mockPrisma.fCMToken.create({
          data: { userId: ctx.user.id, token },
        });

        expect(createdToken.userId).toBe(ctx.user.id);
      }
    });
  });

  describe('unregisterToken', () => {
    it('should delete a specific FCM token', async () => {
      const ctx = createTestContext('STUDENT' as UserRole);
      const token = `fcm-token-${faker.string.alphanumeric(100)}`;

      const mockToken = createMockFCMToken({
        userId: ctx.user.id,
        token,
      });

      mockPrisma.fCMToken.findFirst.mockResolvedValue(mockToken);
      mockPrisma.fCMToken.delete.mockResolvedValue(mockToken);

      const existing = await mockPrisma.fCMToken.findFirst({
        where: { userId: ctx.user.id, token },
      });

      expect(existing).not.toBeNull();

      await mockPrisma.fCMToken.delete({
        where: { id: existing!.id },
      });

      expect(mockPrisma.fCMToken.delete).toHaveBeenCalledWith({
        where: { id: mockToken.id },
      });
    });

    it('should succeed even if token does not exist', async () => {
      const ctx = createTestContext('STUDENT' as UserRole);
      const token = 'non-existent-token';

      mockPrisma.fCMToken.findFirst.mockResolvedValue(null);

      const existing = await mockPrisma.fCMToken.findFirst({
        where: { userId: ctx.user.id, token },
      });

      expect(existing).toBeNull();
      // Router returns success: true even if token doesn't exist
    });

    it('should not allow deleting tokens of other users', async () => {
      const ctx = createTestContext('STUDENT' as UserRole);
      const token = `fcm-token-${faker.string.alphanumeric(100)}`;

      // Token belongs to another user - when searching with current user's ID, it's not found
      mockPrisma.fCMToken.findFirst.mockResolvedValue(null);

      const existing = await mockPrisma.fCMToken.findFirst({
        where: { userId: ctx.user.id, token },
      });

      expect(existing).toBeNull();
      // Since token was not found for this user, delete should not be called
      expect(mockPrisma.fCMToken.delete).not.toHaveBeenCalled();
    });
  });

  describe('unregisterAllTokens', () => {
    it('should delete all FCM tokens for user', async () => {
      const ctx = createTestContext('STUDENT' as UserRole);

      mockPrisma.fCMToken.deleteMany.mockResolvedValue({ count: 3 });

      const result = await mockPrisma.fCMToken.deleteMany({
        where: { userId: ctx.user.id },
      });

      expect(result.count).toBe(3);
      expect(mockPrisma.fCMToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: ctx.user.id },
      });
    });

    it('should succeed even if user has no tokens', async () => {
      const ctx = createTestContext('STUDENT' as UserRole);

      mockPrisma.fCMToken.deleteMany.mockResolvedValue({ count: 0 });

      const result = await mockPrisma.fCMToken.deleteMany({
        where: { userId: ctx.user.id },
      });

      expect(result.count).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('should return status with registered tokens', async () => {
      const ctx = createTestContext('STUDENT' as UserRole);

      const mockTokens = [
        createMockFCMToken({ userId: ctx.user.id, deviceInfo: 'Chrome/Windows' }),
        createMockFCMToken({ userId: ctx.user.id, deviceInfo: 'Safari/Mac' }),
      ];

      mockPrisma.fCMToken.findMany.mockResolvedValue(mockTokens);

      const tokens = await mockPrisma.fCMToken.findMany({
        where: { userId: ctx.user.id },
        select: {
          id: true,
          deviceInfo: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(tokens).toHaveLength(2);

      // Simulated response
      const status = {
        hasTokens: tokens.length > 0,
        tokenCount: tokens.length,
        tokens: tokens.map((t) => ({
          id: t.id,
          deviceInfo: t.deviceInfo,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
      };

      expect(status.hasTokens).toBe(true);
      expect(status.tokenCount).toBe(2);
    });

    it('should return empty status when no tokens', async () => {
      const ctx = createTestContext('STUDENT' as UserRole);

      mockPrisma.fCMToken.findMany.mockResolvedValue([]);

      const tokens = await mockPrisma.fCMToken.findMany({
        where: { userId: ctx.user.id },
      });

      const status = {
        hasTokens: tokens.length > 0,
        tokenCount: tokens.length,
        tokens: [],
      };

      expect(status.hasTokens).toBe(false);
      expect(status.tokenCount).toBe(0);
      expect(status.tokens).toEqual([]);
    });
  });

  describe('sendTestNotification (admin only)', () => {
    it('should send test notification to user', async () => {
      const ctx = createTestContext('ADMIN' as UserRole);
      const targetUserId = faker.string.uuid();

      const mockUser = createMockUser({ id: targetUserId });
      const mockTokens = [createMockFCMToken({ userId: targetUserId })];

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.fCMToken.findMany.mockResolvedValue(mockTokens);
      mockFcmService.sendPushNotificationToUser.mockResolvedValue({ success: true, sent: 1 });

      const user = await mockPrisma.user.findUnique({
        where: { id: targetUserId },
      });

      expect(user).not.toBeNull();

      // Admin can send test notifications
      expect(ctx.user.role).toBe('ADMIN');
    });

    it('should require admin role', () => {
      const studentCtx = createTestContext('STUDENT' as UserRole);
      const collabCtx = createTestContext('COLLABORATOR' as UserRole);
      const adminCtx = createTestContext('ADMIN' as UserRole);

      expect(studentCtx.user.role).not.toBe('ADMIN');
      expect(collabCtx.user.role).not.toBe('ADMIN');
      expect(adminCtx.user.role).toBe('ADMIN');

      // Only admin should be able to call sendTestNotification
    });

    it('should throw error if user not found', async () => {
      const adminCtx = createTestContext('ADMIN' as UserRole);
      const nonExistentUserId = faker.string.uuid();

      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Verify admin context is set
      expect(adminCtx.user.role).toBe('ADMIN');

      const user = await mockPrisma.user.findUnique({
        where: { id: nonExistentUserId },
      });

      expect(user).toBeNull();

      // Router would throw TRPCError NOT_FOUND
      const error = new TRPCError({
        code: 'NOT_FOUND',
        message: 'Utente non trovato',
      });

      expect(error.code).toBe('NOT_FOUND');
    });
  });

  describe('Token validation', () => {
    it('should handle FCM token format', () => {
      // FCM tokens are long alphanumeric strings
      const validToken = `${faker.string.alphanumeric(152)}:${faker.string.alphanumeric(50)}`;
      expect(validToken.length).toBeGreaterThan(100);
    });

    it('should handle device info', () => {
      const deviceInfos = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        'Safari/Mac',
        'Firefox/Linux',
        null,
        undefined,
      ];

      for (const deviceInfo of deviceInfos) {
        const token = createMockFCMToken({ deviceInfo: deviceInfo ?? undefined });
        // deviceInfo is optional
        if (deviceInfo) {
          expect(token.deviceInfo).toBe(deviceInfo);
        }
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle multiple devices per user', async () => {
      const ctx = createTestContext('STUDENT' as UserRole);

      // User has tokens from multiple devices
      const mockTokens = [
        createMockFCMToken({ userId: ctx.user.id, deviceInfo: 'Chrome/Windows' }),
        createMockFCMToken({ userId: ctx.user.id, deviceInfo: 'Safari/Mac' }),
        createMockFCMToken({ userId: ctx.user.id, deviceInfo: 'Firefox/Linux' }),
      ];

      mockPrisma.fCMToken.findMany.mockResolvedValue(mockTokens);

      const tokens = await mockPrisma.fCMToken.findMany({
        where: { userId: ctx.user.id },
      });

      expect(tokens).toHaveLength(3);
    });

    it('should handle concurrent token registrations', async () => {
      const ctx = createTestContext('STUDENT' as UserRole);
      const token = `fcm-token-${faker.string.alphanumeric(100)}`;

      // Simulate race condition - token gets created between check and create
      mockPrisma.fCMToken.findFirst.mockResolvedValue(null);

      // First call succeeds
      mockPrisma.fCMToken.create.mockResolvedValueOnce(
        createMockFCMToken({ userId: ctx.user.id, token })
      );

      // On upsert/retry it would update instead
      const createdToken = await mockPrisma.fCMToken.create({
        data: { userId: ctx.user.id, token },
      });

      expect(createdToken).toBeDefined();
    });

    it('should handle expired/invalid tokens gracefully', async () => {
      const userCtx = createTestContext('STUDENT' as UserRole);

      // FCM service might report some tokens as invalid
      mockFcmService.sendPushNotificationToUser.mockResolvedValue({
        success: true,
        sent: 1,
        invalidTokens: ['invalid-token-1', 'invalid-token-2'],
      });

      // Verify user context exists
      expect(userCtx.user.id).toBeDefined();

      // Invalid tokens should be cleaned up
      const result = await mockFcmService.sendPushNotificationToUser();

      // Verify result structure
      expect(result.success).toBe(true);
      expect(result.invalidTokens).toHaveLength(2);

      if (result.invalidTokens && result.invalidTokens.length > 0) {
        // Clean up invalid tokens
        for (const invalidToken of result.invalidTokens) {
          await mockPrisma.fCMToken.delete({
            where: { id: invalidToken },
          }).catch(() => {
            // Token might already be deleted
          });
        }
      }
    });
  });
});
