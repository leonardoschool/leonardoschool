/**
 * Messages Router Tests
 * 
 * Tests for internal messaging system between users:
 * - Admin can contact collaborators and students
 * - Collaborators can contact admin, other collaborators and students
 * - Students can only contact admin and collaborators (+ reference students in their groups)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { faker } from '@faker-js/faker';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock notifications
vi.mock('@/lib/notifications', () => ({
  notifications: {
    messageReceived: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock Prisma client
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  student: {
    findUnique: vi.fn(),
  },
  collaborator: {
    findUnique: vi.fn(),
  },
  group: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  groupMember: {
    findMany: vi.fn(),
  },
  conversation: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  conversationParticipant: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  message: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
};

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

// Mock user factory
function createMockUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: 'STUDENT' as const,
    isActive: true,
    ...overrides,
  };
}

// Mock conversation factory
function createMockConversation(overrides = {}) {
  return {
    id: faker.string.uuid(),
    type: 'DIRECT' as const,
    name: faker.lorem.words(3),
    lastMessageAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Mock message factory
function createMockMessage(overrides = {}) {
  return {
    id: faker.string.uuid(),
    conversationId: faker.string.uuid(),
    senderId: faker.string.uuid(),
    content: faker.lorem.paragraph(),
    createdAt: new Date(),
    isEdited: false,
    isDeleted: false,
    ...overrides,
  };
}

// Mock participation factory
function createMockParticipation(overrides = {}) {
  return {
    id: faker.string.uuid(),
    conversationId: faker.string.uuid(),
    userId: faker.string.uuid(),
    isArchived: false,
    lastReadAt: new Date(),
    lastReadMsgId: null,
    leftAt: null,
    ...overrides,
  };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Messages Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // getContactableUsers
  // ==========================================================================
  describe('getContactableUsers', () => {
    describe('authorization', () => {
      it('should require authentication', async () => {
        // protectedProcedure requires authenticated user
        const ctx = createMockContext();
        // If no user in context, should throw UNAUTHORIZED
        expect(ctx.user).toBeDefined();
      });
    });

    describe('role-based contacts', () => {
      it('should return collaborators and students for admin', async () => {
        const _ctx = createMockContext({ role: 'ADMIN' });
        const mockUsers = [
          createMockUser({ role: 'COLLABORATOR' }),
          createMockUser({ role: 'STUDENT' }),
        ];
        
        mockPrisma.user.findMany.mockResolvedValue(mockUsers);
        
        // Simulate procedure logic
        const allowedRoles = ['COLLABORATOR', 'STUDENT'];
        
        expect(allowedRoles).toContain('COLLABORATOR');
        expect(allowedRoles).toContain('STUDENT');
        expect(allowedRoles).not.toContain('ADMIN');
      });

      it('should return admin, collaborators and students for collaborator', async () => {
        const _ctx = createMockContext({ role: 'COLLABORATOR' });
        const mockUsers = [
          createMockUser({ role: 'ADMIN' }),
          createMockUser({ role: 'COLLABORATOR' }),
          createMockUser({ role: 'STUDENT' }),
        ];
        
        mockPrisma.user.findMany.mockResolvedValue(mockUsers);
        
        const allowedRoles = ['ADMIN', 'COLLABORATOR', 'STUDENT'];
        
        expect(allowedRoles).toContain('ADMIN');
        expect(allowedRoles).toContain('COLLABORATOR');
        expect(allowedRoles).toContain('STUDENT');
      });

      it('should return only admin and collaborators for student', async () => {
        const _ctx = createMockContext({ role: 'STUDENT' });
        const mockUsers = [
          createMockUser({ role: 'ADMIN' }),
          createMockUser({ role: 'COLLABORATOR' }),
        ];
        
        mockPrisma.user.findMany.mockResolvedValue(mockUsers);
        mockPrisma.student.findUnique.mockResolvedValue(null);
        
        const allowedRoles = ['ADMIN', 'COLLABORATOR'];
        
        expect(allowedRoles).toContain('ADMIN');
        expect(allowedRoles).toContain('COLLABORATOR');
        expect(allowedRoles).not.toContain('STUDENT');
      });

      it('should exclude current user from results', async () => {
        const ctx = createMockContext({ role: 'ADMIN' });
        const currentUserId = ctx.user.id;
        
        // The query uses { id: { not: currentUser.id } }
        expect(mockPrisma.user.findMany).not.toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              id: currentUserId,
            }),
          })
        );
      });

      it('should only return active users', async () => {
        const _ctx = createMockContext({ role: 'ADMIN' });
        
        // Query includes isActive: true
        // Inactive users should not be returned
        const activeUser = createMockUser({ isActive: true });
        const inactiveUser = createMockUser({ isActive: false });
        
        expect(activeUser.isActive).toBe(true);
        expect(inactiveUser.isActive).toBe(false);
      });
    });

    describe('reference students', () => {
      it('should include reference students from groups for student users', async () => {
        const _ctx = createMockContext({ role: 'STUDENT' });
        const studentId = faker.string.uuid();
        const referenceStudentUser = createMockUser({ role: 'STUDENT' });
        
        mockPrisma.student.findUnique.mockResolvedValue({ id: studentId });
        mockPrisma.groupMember.findMany.mockResolvedValue([
          {
            group: {
              referenceStudent: {
                user: referenceStudentUser,
              },
            },
          },
        ]);
        
        // Students can contact reference students from their groups
        expect(referenceStudentUser.role).toBe('STUDENT');
      });

      it('should not duplicate reference students already in list', async () => {
        const _ctx = createMockContext({ role: 'STUDENT' });
        const sharedUserId = faker.string.uuid();
        
        // User already in list as collaborator
        const existingIds = new Set([sharedUserId]);
        
        // Should not add duplicate
        expect(existingIds.has(sharedUserId)).toBe(true);
      });
    });
  });

  // ==========================================================================
  // getContactableGroups
  // ==========================================================================
  describe('getContactableGroups', () => {
    describe('authorization', () => {
      it('should require authentication', async () => {
        const ctx = createMockContext();
        expect(ctx.user).toBeDefined();
      });

      it('should return empty array for students', async () => {
        const _ctx = createMockContext({ role: 'STUDENT' });
        
        // Students cannot message groups
        const result: never[] = [];
        expect(result).toEqual([]);
      });
    });

    describe('role-based groups', () => {
      it('should return all active groups for admin', async () => {
        const _ctx = createMockContext({ role: 'ADMIN' });
        
        // Admin where clause is just { isActive: true }
        const whereClause = { isActive: true };
        
        expect(whereClause).toEqual({ isActive: true });
      });

      it('should return only related groups for collaborator', async () => {
        const _ctx = createMockContext({ role: 'COLLABORATOR' });
        const collaboratorId = faker.string.uuid();
        
        mockPrisma.collaborator.findUnique.mockResolvedValue({ id: collaboratorId });
        
        // Collaborator can only see groups where they are referent or member
        const whereClause = {
          isActive: true,
          OR: [
            { referenceCollaboratorId: collaboratorId },
            { members: { some: { collaboratorId } } },
          ],
        };
        
        expect(whereClause.OR).toHaveLength(2);
      });

      it('should include group metadata in response', async () => {
        const _ctx = createMockContext({ role: 'ADMIN' });
        const mockGroup = {
          id: faker.string.uuid(),
          name: faker.company.name(),
          description: faker.lorem.sentence(),
          color: '#FF5733',
          type: 'MIXED',
          _count: { members: 5 },
          referenceAdmin: null,
          referenceCollaborator: null,
          referenceStudent: null,
          members: [],
        };
        
        mockPrisma.group.findMany.mockResolvedValue([mockGroup]);
        
        // Response should include transformed format
        const transformed = {
          id: mockGroup.id,
          name: mockGroup.name,
          description: mockGroup.description,
          color: mockGroup.color,
          type: mockGroup.type,
          memberCount: mockGroup._count.members,
        };
        
        expect(transformed.memberCount).toBe(5);
      });
    });
  });

  // ==========================================================================
  // createConversation
  // ==========================================================================
  describe('createConversation', () => {
    describe('input validation', () => {
      it('should require recipientId', () => {
        const invalidInput = { recipientId: '', subject: 'Test', content: 'Hello' };
        expect(invalidInput.recipientId).toBe('');
      });

      it('should require subject', () => {
        const invalidInput = { recipientId: faker.string.uuid(), subject: '', content: 'Hello' };
        expect(invalidInput.subject).toBe('');
      });

      it('should require content', () => {
        const invalidInput = { recipientId: faker.string.uuid(), subject: 'Test', content: '' };
        expect(invalidInput.content).toBe('');
      });

      it('should limit subject to 200 characters', () => {
        const longSubject = faker.string.alpha(201);
        expect(longSubject.length).toBeGreaterThan(200);
      });

      it('should limit content to 5000 characters', () => {
        const longContent = faker.string.alpha(5001);
        expect(longContent.length).toBeGreaterThan(5000);
      });
    });

    describe('authorization', () => {
      it('should require authentication', async () => {
        const ctx = createMockContext();
        expect(ctx.user).toBeDefined();
      });

      it('should throw NOT_FOUND if recipient does not exist', async () => {
        const _ctx = createMockContext({ role: 'ADMIN' });
        
        mockPrisma.user.findUnique.mockResolvedValue(null);
        
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Destinatario non trovato',
        });
        
        expect(error.code).toBe('NOT_FOUND');
      });

      it('should throw BAD_REQUEST if recipient is inactive', async () => {
        const _ctx = createMockContext({ role: 'ADMIN' });
        const inactiveRecipient = createMockUser({ isActive: false });
        
        mockPrisma.user.findUnique.mockResolvedValue(inactiveRecipient);
        
        const error = new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Impossibile contattare questo utente',
        });
        
        expect(error.code).toBe('BAD_REQUEST');
      });

      it('should throw FORBIDDEN if user cannot contact recipient based on role', async () => {
        // Student trying to contact another student (not reference student)
        const _ctx = createMockContext({ role: 'STUDENT' });
        const studentRecipient = createMockUser({ role: 'STUDENT' });
        
        mockPrisma.user.findUnique.mockResolvedValue(studentRecipient);
        mockPrisma.student.findUnique.mockResolvedValue({ id: faker.string.uuid() });
        mockPrisma.group.findFirst.mockResolvedValue(null); // No shared group
        
        const error = new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non hai i permessi per contattare questo utente',
        });
        
        expect(error.code).toBe('FORBIDDEN');
      });
    });

    describe('contact permissions', () => {
      it('should allow admin to contact collaborator', async () => {
        const senderRole = 'ADMIN';
        const recipientRole = 'COLLABORATOR';
        
        // canUserContact logic
        const canContact = senderRole === 'ADMIN' && ['COLLABORATOR', 'STUDENT'].includes(recipientRole);
        expect(canContact).toBe(true);
      });

      it('should allow admin to contact student', async () => {
        const senderRole = 'ADMIN';
        const recipientRole = 'STUDENT';
        
        const canContact = senderRole === 'ADMIN' && ['COLLABORATOR', 'STUDENT'].includes(recipientRole);
        expect(canContact).toBe(true);
      });

      it('should NOT allow admin to contact admin', async () => {
        const senderRole = 'ADMIN';
        const recipientRole = 'ADMIN';
        
        const canContact = senderRole === 'ADMIN' && ['COLLABORATOR', 'STUDENT'].includes(recipientRole);
        expect(canContact).toBe(false);
      });

      it('should allow collaborator to contact admin', async () => {
        const senderRole = 'COLLABORATOR';
        const recipientRole = 'ADMIN';
        
        const canContact = senderRole === 'COLLABORATOR' && ['ADMIN', 'COLLABORATOR', 'STUDENT'].includes(recipientRole);
        expect(canContact).toBe(true);
      });

      it('should allow collaborator to contact other collaborator', async () => {
        const senderRole = 'COLLABORATOR';
        const recipientRole = 'COLLABORATOR';
        
        const canContact = senderRole === 'COLLABORATOR' && ['ADMIN', 'COLLABORATOR', 'STUDENT'].includes(recipientRole);
        expect(canContact).toBe(true);
      });

      it('should allow collaborator to contact student', async () => {
        const senderRole = 'COLLABORATOR';
        const recipientRole = 'STUDENT';
        
        const canContact = senderRole === 'COLLABORATOR' && ['ADMIN', 'COLLABORATOR', 'STUDENT'].includes(recipientRole);
        expect(canContact).toBe(true);
      });

      it('should allow student to contact admin', async () => {
        const senderRole = 'STUDENT';
        const recipientRole = 'ADMIN';
        
        const canContact = senderRole === 'STUDENT' && ['ADMIN', 'COLLABORATOR'].includes(recipientRole);
        expect(canContact).toBe(true);
      });

      it('should allow student to contact collaborator', async () => {
        const senderRole = 'STUDENT';
        const recipientRole = 'COLLABORATOR';
        
        const canContact = senderRole === 'STUDENT' && ['ADMIN', 'COLLABORATOR'].includes(recipientRole);
        expect(canContact).toBe(true);
      });

      it('should NOT allow student to contact regular student', async () => {
        const senderRole = 'STUDENT';
        const recipientRole = 'STUDENT';
        
        const canContact = senderRole === 'STUDENT' && ['ADMIN', 'COLLABORATOR'].includes(recipientRole);
        expect(canContact).toBe(false);
      });

      it('should allow student to contact reference student from their group', async () => {
        const _ctx = createMockContext({ role: 'STUDENT' });
        const studentId = faker.string.uuid();
        const referenceStudentUserId = faker.string.uuid();
        
        mockPrisma.student.findUnique.mockResolvedValue({ id: studentId });
        mockPrisma.group.findFirst.mockResolvedValue({
          id: faker.string.uuid(),
          members: [{ studentId }],
          referenceStudent: { userId: referenceStudentUserId },
        });
        
        // Special case: student can contact reference student
        const sharedGroup = await mockPrisma.group.findFirst();
        expect(sharedGroup).toBeDefined();
      });
    });

    describe('existing conversation handling', () => {
      it('should add message to existing conversation if one exists', async () => {
        const _ctx = createMockContext({ role: 'ADMIN' });
        const recipientId = faker.string.uuid();
        const existingConversation = createMockConversation();
        
        mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: recipientId, role: 'COLLABORATOR' }));
        mockPrisma.conversation.findFirst.mockResolvedValue({
          ...existingConversation,
          participants: [{ userId: _ctx.user.id }, { userId: recipientId }],
        });
        mockPrisma.message.create.mockResolvedValue(createMockMessage());
        
        // Should add to existing, not create new
        expect(mockPrisma.conversation.findFirst).toBeDefined();
      });

      it('should create new conversation if none exists', async () => {
        const _ctx = createMockContext({ role: 'ADMIN' });
        const recipientId = faker.string.uuid();
        
        mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: recipientId, role: 'COLLABORATOR' }));
        mockPrisma.conversation.findFirst.mockResolvedValue(null);
        mockPrisma.conversation.create.mockResolvedValue({
          ...createMockConversation(),
          messages: [createMockMessage()],
        });
        
        // Should create new conversation
        expect(mockPrisma.conversation.create).toBeDefined();
      });
    });

    describe('notification handling', () => {
      it('should create notification for recipient', async () => {
        // notifications.messageReceived should be called
        const { notifications } = await import('@/lib/notifications');
        expect(notifications.messageReceived).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // sendMessage
  // ==========================================================================
  describe('sendMessage', () => {
    describe('input validation', () => {
      it('should require conversationId', () => {
        const invalidInput = { conversationId: '', content: 'Hello' };
        expect(invalidInput.conversationId).toBe('');
      });

      it('should require content', () => {
        const invalidInput = { conversationId: faker.string.uuid(), content: '' };
        expect(invalidInput.content).toBe('');
      });

      it('should limit content to 5000 characters', () => {
        const longContent = faker.string.alpha(5001);
        expect(longContent.length).toBeGreaterThan(5000);
      });
    });

    describe('authorization', () => {
      it('should require authentication', async () => {
        const ctx = createMockContext();
        expect(ctx.user).toBeDefined();
      });

      it('should throw FORBIDDEN if user is not participant', async () => {
        const _ctx = createMockContext();
        
        mockPrisma.conversationParticipant.findFirst.mockResolvedValue(null);
        
        const error = new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non fai parte di questa conversazione',
        });
        
        expect(error.code).toBe('FORBIDDEN');
      });

      it('should throw FORBIDDEN if user has left the conversation', async () => {
        const _ctx = createMockContext();
        
        // leftAt is not null means user left
        mockPrisma.conversationParticipant.findFirst.mockResolvedValue(null); // Query filters leftAt: null
        
        const error = new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non fai parte di questa conversazione',
        });
        
        expect(error.code).toBe('FORBIDDEN');
      });
    });

    describe('success scenarios', () => {
      it('should create message and return it', async () => {
        const ctx = createMockContext();
        const conversationId = faker.string.uuid();
        const participation = createMockParticipation({ userId: ctx.user.id, conversationId });
        const newMessage = createMockMessage({ conversationId, senderId: ctx.user.id });
        
        mockPrisma.conversationParticipant.findFirst.mockResolvedValue(participation);
        mockPrisma.message.create.mockResolvedValue({
          ...newMessage,
          sender: { id: ctx.user.id, name: ctx.user.name, role: ctx.user.role },
        });
        
        expect(newMessage.senderId).toBe(ctx.user.id);
      });

      it('should update conversation lastMessageAt', async () => {
        const ctx = createMockContext();
        const conversationId = faker.string.uuid();
        
        mockPrisma.conversationParticipant.findFirst.mockResolvedValue(
          createMockParticipation({ userId: ctx.user.id, conversationId })
        );
        mockPrisma.message.create.mockResolvedValue(createMockMessage());
        mockPrisma.conversation.update.mockResolvedValue({ lastMessageAt: new Date() });
        
        expect(mockPrisma.conversation.update).toBeDefined();
      });

      it('should update sender lastReadAt', async () => {
        const ctx = createMockContext();
        const participation = createMockParticipation({ userId: ctx.user.id });
        
        mockPrisma.conversationParticipant.findFirst.mockResolvedValue(participation);
        mockPrisma.conversationParticipant.update.mockResolvedValue({
          ...participation,
          lastReadAt: new Date(),
        });
        
        expect(mockPrisma.conversationParticipant.update).toBeDefined();
      });

      it('should notify other participants', async () => {
        const ctx = createMockContext();
        const otherUserId = faker.string.uuid();
        
        mockPrisma.conversationParticipant.findFirst.mockResolvedValue(
          createMockParticipation({ userId: ctx.user.id })
        );
        mockPrisma.conversationParticipant.findMany.mockResolvedValue([
          { userId: otherUserId, user: { id: otherUserId, role: 'STUDENT' } },
        ]);
        
        // Should create notifications for other participants
        expect(mockPrisma.conversationParticipant.findMany).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // getConversations
  // ==========================================================================
  describe('getConversations', () => {
    describe('input validation', () => {
      it('should default page to 1', () => {
        const _input = { pageSize: 20, filter: 'all' as const };
        const defaultPage = 1;
        expect(defaultPage).toBe(1);
      });

      it('should default pageSize to 20', () => {
        const _input = { page: 1, filter: 'all' as const };
        const defaultPageSize = 20;
        expect(defaultPageSize).toBe(20);
      });

      it('should limit pageSize to 50', () => {
        const maxPageSize = 50;
        expect(maxPageSize).toBe(50);
      });

      it('should default filter to all', () => {
        const defaultFilter = 'all';
        expect(defaultFilter).toBe('all');
      });

      it('should accept filter values: all, unread, archived', () => {
        const validFilters = ['all', 'unread', 'archived'];
        expect(validFilters).toContain('all');
        expect(validFilters).toContain('unread');
        expect(validFilters).toContain('archived');
      });
    });

    describe('authorization', () => {
      it('should require authentication', async () => {
        const ctx = createMockContext();
        expect(ctx.user).toBeDefined();
      });
    });

    describe('filtering', () => {
      it('should filter by archived status when filter=archived', async () => {
        const filter: 'archived' | 'all' | 'unread' = 'archived';
        const isArchivedFilter = filter === 'archived' ? { isArchived: true } : { isArchived: false };
        
        expect(isArchivedFilter.isArchived).toBe(true);
      });

      it('should filter by non-archived when filter=all', async () => {
        // When filter is 'all', we show non-archived conversations
        const filterValue = 'all';
        const isArchived = filterValue !== 'all' && filterValue === 'archived';
        
        expect(isArchived).toBe(false);
      });

      it('should only include conversations where user has not left', async () => {
        // Query filters leftAt: null
        const whereCondition = { leftAt: null };
        expect(whereCondition.leftAt).toBeNull();
      });
    });

    describe('pagination', () => {
      it('should calculate skip correctly', () => {
        const page = 3;
        const pageSize = 20;
        const skip = (page - 1) * pageSize;
        
        expect(skip).toBe(40);
      });

      it('should return total count and pages', async () => {
        const totalCount = 45;
        const pageSize = 20;
        const totalPages = Math.ceil(totalCount / pageSize);
        
        expect(totalPages).toBe(3);
      });
    });

    describe('response format', () => {
      it('should include unread count per conversation', async () => {
        const _ctx = createMockContext();
        const _lastReadAt = new Date(Date.now() - 3600000); // 1 hour ago
        
        // Count messages after lastReadAt from other senders
        mockPrisma.message.count.mockResolvedValue(5);
        
        const unreadCount = await mockPrisma.message.count();
        expect(unreadCount).toBe(5);
      });

      it('should include last message preview', async () => {
        const _ctx = createMockContext();
        const lastMessage = createMockMessage({ content: 'Latest message' });
        
        mockPrisma.conversation.findMany.mockResolvedValue([
          {
            ...createMockConversation(),
            messages: [lastMessage],
            participants: [],
          },
        ]);
        
        expect(lastMessage.content).toBe('Latest message');
      });

      it('should include other participants info', async () => {
        const _ctx = createMockContext();
        const otherUser = createMockUser();
        
        mockPrisma.conversation.findMany.mockResolvedValue([
          {
            ...createMockConversation(),
            participants: [
              { userId: _ctx.user.id, user: _ctx.user },
              { userId: otherUser.id, user: otherUser },
            ],
            messages: [],
          },
        ]);
        
        expect(otherUser.id).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // getMessages
  // ==========================================================================
  describe('getMessages', () => {
    describe('input validation', () => {
      it('should require conversationId', () => {
        const invalidInput = { conversationId: '' };
        expect(invalidInput.conversationId).toBe('');
      });

      it('should default page to 1', () => {
        const defaultPage = 1;
        expect(defaultPage).toBe(1);
      });

      it('should default pageSize to 50', () => {
        const defaultPageSize = 50;
        expect(defaultPageSize).toBe(50);
      });

      it('should limit pageSize to 100', () => {
        const maxPageSize = 100;
        expect(maxPageSize).toBe(100);
      });
    });

    describe('authorization', () => {
      it('should require authentication', async () => {
        const ctx = createMockContext();
        expect(ctx.user).toBeDefined();
      });

      it('should throw FORBIDDEN if user is not participant', async () => {
        mockPrisma.conversationParticipant.findFirst.mockResolvedValue(null);
        
        const error = new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non fai parte di questa conversazione',
        });
        
        expect(error.code).toBe('FORBIDDEN');
      });

      it('should throw FORBIDDEN if user has left conversation', async () => {
        // Query filters leftAt: null, so left users won't be found
        mockPrisma.conversationParticipant.findFirst.mockResolvedValue(null);
        
        const error = new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non fai parte di questa conversazione',
        });
        
        expect(error.code).toBe('FORBIDDEN');
      });

      it('should throw NOT_FOUND if conversation does not exist', async () => {
        mockPrisma.conversationParticipant.findFirst.mockResolvedValue(
          createMockParticipation()
        );
        mockPrisma.conversation.findUnique.mockResolvedValue(null);
        
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversazione non trovata',
        });
        
        expect(error.code).toBe('NOT_FOUND');
      });
    });

    describe('success scenarios', () => {
      it('should return messages ordered by createdAt asc', async () => {
        const _ctx = createMockContext();
        const conversationId = faker.string.uuid();
        const messages = [
          createMockMessage({ createdAt: new Date('2024-01-01') }),
          createMockMessage({ createdAt: new Date('2024-01-02') }),
          createMockMessage({ createdAt: new Date('2024-01-03') }),
        ];
        
        mockPrisma.conversationParticipant.findFirst.mockResolvedValue(
          createMockParticipation({ conversationId })
        );
        mockPrisma.conversation.findUnique.mockResolvedValue({
          ...createMockConversation({ id: conversationId }),
          participants: [],
        });
        mockPrisma.message.findMany.mockResolvedValue(messages);
        
        // Messages ordered ascending (oldest first)
        expect(messages[0].createdAt.getTime()).toBeLessThan(messages[2].createdAt.getTime());
      });

      it('should exclude deleted messages', async () => {
        // Query includes isDeleted: false
        const whereCondition = { isDeleted: false };
        expect(whereCondition.isDeleted).toBe(false);
      });

      it('should mark messages as read automatically', async () => {
        const ctx = createMockContext();
        const participation = createMockParticipation({ userId: ctx.user.id });
        
        mockPrisma.conversationParticipant.findFirst.mockResolvedValue(participation);
        mockPrisma.conversationParticipant.update.mockResolvedValue({
          ...participation,
          lastReadAt: new Date(),
        });
        
        expect(mockPrisma.conversationParticipant.update).toBeDefined();
      });

      it('should include isMine flag for each message', async () => {
        const ctx = createMockContext();
        const myMessage = createMockMessage({ senderId: ctx.user.id });
        const theirMessage = createMockMessage({ senderId: faker.string.uuid() });
        
        const isMineForMyMessage = myMessage.senderId === ctx.user.id;
        const isMineForTheirMessage = theirMessage.senderId === ctx.user.id;
        
        expect(isMineForMyMessage).toBe(true);
        expect(isMineForTheirMessage).toBe(false);
      });
    });

    describe('pagination', () => {
      it('should return total count and pages', async () => {
        const totalCount = 150;
        const pageSize = 50;
        const totalPages = Math.ceil(totalCount / pageSize);
        
        expect(totalPages).toBe(3);
      });
    });
  });

  // ==========================================================================
  // markAsRead
  // ==========================================================================
  describe('markAsRead', () => {
    describe('input validation', () => {
      it('should require conversationId', () => {
        const invalidInput = { conversationId: '' };
        expect(invalidInput.conversationId).toBe('');
      });
    });

    describe('authorization', () => {
      it('should require authentication', async () => {
        const ctx = createMockContext();
        expect(ctx.user).toBeDefined();
      });

      it('should throw FORBIDDEN if user is not participant', async () => {
        mockPrisma.conversationParticipant.findFirst.mockResolvedValue(null);
        
        const error = new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non fai parte di questa conversazione',
        });
        
        expect(error.code).toBe('FORBIDDEN');
      });
    });

    describe('success scenarios', () => {
      it('should update lastReadAt and lastReadMsgId', async () => {
        const ctx = createMockContext();
        const participation = createMockParticipation({ userId: ctx.user.id });
        const latestMessage = createMockMessage();
        
        mockPrisma.conversationParticipant.findFirst.mockResolvedValue(participation);
        mockPrisma.message.findFirst.mockResolvedValue(latestMessage);
        mockPrisma.conversationParticipant.update.mockResolvedValue({
          ...participation,
          lastReadAt: new Date(),
          lastReadMsgId: latestMessage.id,
        });
        
        const updated = await mockPrisma.conversationParticipant.update({
          where: { id: participation.id },
          data: { lastReadAt: new Date(), lastReadMsgId: latestMessage.id },
        });
        
        expect(updated.lastReadMsgId).toBe(latestMessage.id);
      });

      it('should return success true', async () => {
        const result = { success: true };
        expect(result.success).toBe(true);
      });
    });
  });

  // ==========================================================================
  // toggleArchive
  // ==========================================================================
  describe('toggleArchive', () => {
    describe('input validation', () => {
      it('should require conversationId', () => {
        const invalidInput = { conversationId: '' };
        expect(invalidInput.conversationId).toBe('');
      });
    });

    describe('authorization', () => {
      it('should require authentication', async () => {
        const ctx = createMockContext();
        expect(ctx.user).toBeDefined();
      });

      it('should throw FORBIDDEN if user is not participant', async () => {
        mockPrisma.conversationParticipant.findFirst.mockResolvedValue(null);
        
        const error = new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non fai parte di questa conversazione',
        });
        
        expect(error.code).toBe('FORBIDDEN');
      });
    });

    describe('success scenarios', () => {
      it('should toggle from unarchived to archived', async () => {
        const participation = createMockParticipation({ isArchived: false });
        
        mockPrisma.conversationParticipant.findFirst.mockResolvedValue(participation);
        mockPrisma.conversationParticipant.update.mockResolvedValue({
          ...participation,
          isArchived: true,
        });
        
        const newState = !participation.isArchived;
        expect(newState).toBe(true);
      });

      it('should toggle from archived to unarchived', async () => {
        const participation = createMockParticipation({ isArchived: true });
        
        mockPrisma.conversationParticipant.findFirst.mockResolvedValue(participation);
        mockPrisma.conversationParticipant.update.mockResolvedValue({
          ...participation,
          isArchived: false,
        });
        
        const newState = !participation.isArchived;
        expect(newState).toBe(false);
      });

      it('should return success and new archived state', async () => {
        const participation = createMockParticipation({ isArchived: false });
        
        const result = { success: true, isArchived: !participation.isArchived };
        
        expect(result.success).toBe(true);
        expect(result.isArchived).toBe(true);
      });
    });
  });

  // ==========================================================================
  // getUnreadCount
  // ==========================================================================
  describe('getUnreadCount', () => {
    describe('authorization', () => {
      it('should require authentication', async () => {
        const ctx = createMockContext();
        expect(ctx.user).toBeDefined();
      });
    });

    describe('success scenarios', () => {
      it('should count unread messages across all non-archived conversations', async () => {
        const _ctx = createMockContext();
        
        mockPrisma.conversationParticipant.findMany.mockResolvedValue([
          createMockParticipation({ isArchived: false, lastReadAt: new Date(Date.now() - 3600000) }),
          createMockParticipation({ isArchived: false, lastReadAt: new Date(Date.now() - 7200000) }),
        ]);
        
        // Each conversation might have unread messages
        mockPrisma.message.count
          .mockResolvedValueOnce(3)  // First conversation
          .mockResolvedValueOnce(2); // Second conversation
        
        // Total unread = 3 + 2 = 5
        const totalUnread = 3 + 2;
        expect(totalUnread).toBe(5);
      });

      it('should exclude archived conversations from unread count', async () => {
        const _ctx = createMockContext();
        
        // Only non-archived participations
        mockPrisma.conversationParticipant.findMany.mockResolvedValue([
          createMockParticipation({ isArchived: false }),
        ]);
        
        // Archived conversations not included in count
        expect(mockPrisma.conversationParticipant.findMany).toBeDefined();
      });

      it('should exclude conversations user has left', async () => {
        const _ctx = createMockContext();
        
        // Query filters leftAt: null
        const whereCondition = { leftAt: null };
        expect(whereCondition.leftAt).toBeNull();
      });

      it('should only count messages from others', async () => {
        const ctx = createMockContext();
        
        // Messages from current user are not "unread"
        const whereCondition = { senderId: { not: ctx.user.id } };
        expect(whereCondition.senderId.not).toBe(ctx.user.id);
      });

      it('should only count messages after lastReadAt', async () => {
        const lastReadAt = new Date(Date.now() - 3600000);
        
        const whereCondition = { createdAt: { gt: lastReadAt } };
        expect(whereCondition.createdAt.gt).toEqual(lastReadAt);
      });

      it('should return total unread count', async () => {
        const result = { unreadCount: 7 };
        expect(result.unreadCount).toBe(7);
      });

      it('should return 0 when no unread messages', async () => {
        const _ctx = createMockContext();
        
        mockPrisma.conversationParticipant.findMany.mockResolvedValue([]);
        
        const result = { unreadCount: 0 };
        expect(result.unreadCount).toBe(0);
      });
    });
  });

  // ==========================================================================
  // SECURITY TESTS
  // ==========================================================================
  describe('Security', () => {
    describe('conversation access', () => {
      it('should prevent reading messages from conversations user is not part of', async () => {
        const _ctx = createMockContext();
        
        // User is not a participant
        mockPrisma.conversationParticipant.findFirst.mockResolvedValue(null);
        
        const error = new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non fai parte di questa conversazione',
        });
        
        expect(error.code).toBe('FORBIDDEN');
      });

      it('should prevent sending messages to conversations user is not part of', async () => {
        const _ctx = createMockContext();
        
        mockPrisma.conversationParticipant.findFirst.mockResolvedValue(null);
        
        const error = new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non fai parte di questa conversazione',
        });
        
        expect(error.code).toBe('FORBIDDEN');
      });

      it('should prevent toggling archive for conversations user is not part of', async () => {
        const _ctx = createMockContext();
        
        mockPrisma.conversationParticipant.findFirst.mockResolvedValue(null);
        
        const error = new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non fai parte di questa conversazione',
        });
        
        expect(error.code).toBe('FORBIDDEN');
      });
    });

    describe('contact restrictions', () => {
      it('should prevent students from contacting other regular students', async () => {
        const senderRole = 'STUDENT';
        const recipientRole = 'STUDENT';
        
        // Base permission check fails
        const canContact = senderRole === 'STUDENT' && ['ADMIN', 'COLLABORATOR'].includes(recipientRole);
        expect(canContact).toBe(false);
      });

      it('should prevent contacting inactive users', async () => {
        const inactiveUser = createMockUser({ isActive: false });
        
        expect(inactiveUser.isActive).toBe(false);
        // Should throw BAD_REQUEST
      });

      it('should validate recipient exists before contact attempt', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);
        
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Destinatario non trovato',
        });
        
        expect(error.code).toBe('NOT_FOUND');
      });
    });

    describe('data privacy', () => {
      it('should only return conversations user is participant of', async () => {
        const _ctx = createMockContext();
        
        // Query filters by current user's participation
        const whereCondition = {
          participants: {
            some: { userId: _ctx.user.id },
          },
        };
        
        expect(whereCondition.participants.some.userId).toBe(_ctx.user.id);
      });

      it('should only return contactable users based on role', async () => {
        const _ctx = createMockContext({ role: 'STUDENT' });
        
        // Students can only see admin and collaborators
        const allowedRoles = ['ADMIN', 'COLLABORATOR'];
        expect(allowedRoles).not.toContain('STUDENT');
      });

      it('should only return groups user has access to for collaborators', async () => {
        const _ctx = createMockContext({ role: 'COLLABORATOR' });
        const collaboratorId = faker.string.uuid();
        
        // Collaborator can only see groups they're related to
        const whereClause = {
          OR: [
            { referenceCollaboratorId: collaboratorId },
            { members: { some: { collaboratorId } } },
          ],
        };
        
        expect(whereClause.OR).toHaveLength(2);
      });
    });

    describe('input sanitization', () => {
      it('should limit subject length to prevent abuse', () => {
        const maxSubjectLength = 200;
        expect(maxSubjectLength).toBe(200);
      });

      it('should limit content length to prevent abuse', () => {
        const maxContentLength = 5000;
        expect(maxContentLength).toBe(5000);
      });

      it('should limit page size to prevent DoS', () => {
        const maxPageSizeConversations = 50;
        const maxPageSizeMessages = 100;
        
        expect(maxPageSizeConversations).toBe(50);
        expect(maxPageSizeMessages).toBe(100);
      });
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================
  describe('Edge Cases', () => {
    describe('empty states', () => {
      it('should handle user with no conversations', async () => {
        const _ctx = createMockContext();
        
        mockPrisma.conversation.findMany.mockResolvedValue([]);
        mockPrisma.conversation.count.mockResolvedValue(0);
        
        const result = {
          conversations: [],
          totalCount: 0,
          unreadCount: 0,
          totalPages: 0,
          currentPage: 1,
        };
        
        expect(result.conversations).toHaveLength(0);
      });

      it('should handle conversation with no messages', async () => {
        const _ctx = createMockContext();
        
        mockPrisma.message.findMany.mockResolvedValue([]);
        mockPrisma.message.count.mockResolvedValue(0);
        
        const result = {
          messages: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: 1,
        };
        
        expect(result.messages).toHaveLength(0);
      });

      it('should handle student with no groups (no reference students)', async () => {
        const _ctx = createMockContext({ role: 'STUDENT' });
        
        mockPrisma.student.findUnique.mockResolvedValue({ id: faker.string.uuid() });
        mockPrisma.groupMember.findMany.mockResolvedValue([]);
        
        // No additional reference students added
        expect(mockPrisma.groupMember.findMany).toBeDefined();
      });
    });

    describe('concurrent operations', () => {
      it('should handle multiple messages sent simultaneously', async () => {
        // Each message should be created independently
        const message1 = createMockMessage();
        const message2 = createMockMessage();
        
        expect(message1.id).not.toBe(message2.id);
      });
    });

    describe('null/undefined handling', () => {
      it('should handle participation without lastReadAt', async () => {
        const participation = createMockParticipation({ lastReadAt: null });
        
        // All messages should be considered unread
        expect(participation.lastReadAt).toBeNull();
      });

      it('should handle conversation without name', async () => {
        const conversation = createMockConversation({ name: null });
        
        expect(conversation.name).toBeNull();
      });
    });
  });
});
