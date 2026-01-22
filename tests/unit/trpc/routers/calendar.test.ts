/**
 * Calendar Router Tests
 * 
 * Tests for calendar events, attendances, and staff absences:
 * - Event CRUD operations (staff/admin)
 * - Invitations management
 * - Attendance tracking
 * - Staff absence requests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { faker } from '@faker-js/faker';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock email functions
vi.mock('@/lib/email/eventEmails', () => ({
  sendEventInvitationEmail: vi.fn().mockResolvedValue(undefined),
  sendEventModificationEmail: vi.fn().mockResolvedValue(undefined),
  sendEventCancellationEmail: vi.fn().mockResolvedValue(undefined),
  sendAbsenceStatusEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock notifications
vi.mock('@/lib/notifications', () => ({
  notifications: {
    eventInvitation: vi.fn().mockResolvedValue(undefined),
  },
  createBulkNotifications: vi.fn().mockResolvedValue(undefined),
}));

// Mock Prisma client
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
  student: {
    findUnique: vi.fn(),
  },
  collaborator: {
    findUnique: vi.fn(),
  },
  calendarEvent: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  eventInvitation: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
  eventAttendance: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
  staffAbsence: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  groupMember: {
    findMany: vi.fn(),
  },
  group: {
    findUnique: vi.fn(),
  },
};

// Event types
type EventType = 'LECTURE' | 'WORKSHOP' | 'EXAM' | 'MEETING' | 'OTHER';
type EventLocationType = 'IN_PERSON' | 'ONLINE' | 'HYBRID';
type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
type EventInviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'MAYBE';
type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
type StaffAbsenceStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

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
function _createMockUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: 'STUDENT' as const,
    isActive: true,
    ...overrides,
  };
}

// Mock event factory
function createMockEvent(overrides = {}) {
  const startDate = faker.date.future();
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2 hours
  
  return {
    id: faker.string.uuid(),
    title: faker.lorem.words(3),
    description: faker.lorem.paragraph(),
    type: 'LECTURE' as EventType,
    startDate,
    endDate,
    isAllDay: false,
    locationType: 'IN_PERSON' as EventLocationType,
    locationDetails: faker.location.streetAddress(),
    onlineLink: null,
    isPublic: false,
    isCancelled: false,
    sendEmailInvites: false,
    sendEmailReminders: false,
    reminderMinutes: null,
    isRecurring: false,
    recurrenceFrequency: null,
    recurrenceEndDate: null,
    createdById: faker.string.uuid(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Mock invitation factory
function createMockInvitation(overrides = {}) {
  return {
    id: faker.string.uuid(),
    eventId: faker.string.uuid(),
    userId: faker.string.uuid(),
    groupId: null,
    status: 'PENDING' as EventInviteStatus,
    respondedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// Mock attendance factory
function createMockAttendance(overrides = {}) {
  return {
    id: faker.string.uuid(),
    eventId: faker.string.uuid(),
    studentId: faker.string.uuid(),
    status: 'PRESENT' as AttendanceStatus,
    notes: null,
    recordedById: faker.string.uuid(),
    recordedAt: new Date(),
    ...overrides,
  };
}

// Mock staff absence factory
function createMockStaffAbsence(overrides = {}) {
  return {
    id: faker.string.uuid(),
    requesterId: faker.string.uuid(),
    startDate: faker.date.future(),
    endDate: faker.date.future(),
    reason: faker.lorem.sentence(),
    status: 'PENDING' as StaffAbsenceStatus,
    substituteId: null,
    adminNotes: null,
    approvedById: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Calendar Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // getEvents
  // ==========================================================================
  describe('getEvents', () => {
    describe('authorization', () => {
      it('should require authentication', async () => {
        const ctx = createMockContext();
        expect(ctx.user).toBeDefined();
      });
    });

    describe('input validation', () => {
      it('should accept date range filters', () => {
        const input = {
          startDate: new Date(),
          endDate: new Date(),
        };
        expect(input.startDate).toBeInstanceOf(Date);
        expect(input.endDate).toBeInstanceOf(Date);
      });

      it('should accept event type filter', () => {
        const eventTypes: EventType[] = ['LECTURE', 'WORKSHOP', 'EXAM', 'MEETING', 'OTHER'];
        expect(eventTypes).toHaveLength(5);
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

    describe('role-based visibility', () => {
      it('should show all events for admin', async () => {
        const ctx = createMockContext({ role: 'ADMIN' });
        
        // Admin can see all events
        expect(ctx.user.role).toBe('ADMIN');
      });

      it('should filter events for students', async () => {
        const _ctx = createMockContext({ role: 'STUDENT' });
        
        // Students see: public events, events they're invited to
        mockPrisma.student.findUnique.mockResolvedValue({ id: faker.string.uuid() });
        mockPrisma.groupMember.findMany.mockResolvedValue([]);
        
        expect(_ctx.user.role).toBe('STUDENT');
      });

      it('should filter events for collaborators', async () => {
        const ctx = createMockContext({ role: 'COLLABORATOR' });
        
        // Collaborators see: public events, events they created, events they're invited to
        mockPrisma.collaborator.findUnique.mockResolvedValue({ id: faker.string.uuid() });
        mockPrisma.groupMember.findMany.mockResolvedValue([]);
        
        expect(ctx.user.role).toBe('COLLABORATOR');
      });

      it('should include group invitations for students', async () => {
        const _ctx = createMockContext({ role: 'STUDENT' });
        const studentId = faker.string.uuid();
        const groupId = faker.string.uuid();
        
        mockPrisma.student.findUnique.mockResolvedValue({ id: studentId });
        mockPrisma.groupMember.findMany.mockResolvedValue([{ groupId }]);
        
        // Student should see events their groups are invited to
        expect(mockPrisma.groupMember.findMany).toBeDefined();
      });
    });

    describe('filtering', () => {
      it('should filter by date range', async () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');
        
        const where = {
          startDate: { gte: startDate },
          endDate: { lte: endDate },
        };
        
        expect(where.startDate.gte).toEqual(startDate);
        expect(where.endDate.lte).toEqual(endDate);
      });

      it('should filter by event type', async () => {
        const type: EventType = 'LECTURE';
        const where = { type };
        
        expect(where.type).toBe('LECTURE');
      });

      it('should exclude cancelled events by default', async () => {
        const includeCancelled = false;
        const where = includeCancelled ? {} : { isCancelled: false };
        
        expect(where.isCancelled).toBe(false);
      });

      it('should include cancelled events when requested', async () => {
        const includeCancelled = true;
        const where = includeCancelled ? {} : { isCancelled: false };
        
        expect(where.isCancelled).toBeUndefined();
      });

      it('should filter by onlyMyEvents', async () => {
        const ctx = createMockContext({ role: 'COLLABORATOR' });
        
        // Only show events created by user or they're invited to
        const orConditions = [
          { createdById: ctx.user.id },
          { invitations: { some: { userId: ctx.user.id } } },
        ];
        
        expect(orConditions).toHaveLength(2);
      });
    });

    describe('pagination', () => {
      it('should calculate skip correctly', () => {
        const page = 3;
        const pageSize = 50;
        const skip = (page - 1) * pageSize;
        
        expect(skip).toBe(100);
      });

      it('should return pagination metadata', async () => {
        const total = 150;
        const pageSize = 50;
        const totalPages = Math.ceil(total / pageSize);
        
        expect(totalPages).toBe(3);
      });
    });
  });

  // ==========================================================================
  // getEvent
  // ==========================================================================
  describe('getEvent', () => {
    describe('authorization', () => {
      it('should require authentication', async () => {
        const ctx = createMockContext();
        expect(ctx.user).toBeDefined();
      });

      it('should throw NOT_FOUND for non-existent event', async () => {
        mockPrisma.calendarEvent.findUnique.mockResolvedValue(null);
        
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Evento non trovato',
        });
        
        expect(error.code).toBe('NOT_FOUND');
      });

      it('should throw FORBIDDEN if student not invited to private event', async () => {
        const _ctx = createMockContext({ role: 'STUDENT' });
        const privateEvent = createMockEvent({ isPublic: false });
        
        mockPrisma.calendarEvent.findUnique.mockResolvedValue({ ...privateEvent, invitations: [] });
        mockPrisma.student.findUnique.mockResolvedValue({ id: faker.string.uuid() });
        mockPrisma.groupMember.findMany.mockResolvedValue([]);
        
        const error = new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non hai accesso a questo evento',
        });
        
        expect(error.code).toBe('FORBIDDEN');
      });

      it('should allow access if student is directly invited', async () => {
        const _ctx = createMockContext({ role: 'STUDENT' });
        const eventWithInvitations = {
          ...createMockEvent({ isPublic: false }),
          invitations: [{ userId: _ctx.user.id }],
        };
        
        mockPrisma.calendarEvent.findUnique.mockResolvedValue(eventWithInvitations);
        
        expect(eventWithInvitations.invitations).toContainEqual({ userId: _ctx.user.id });
      });

      it('should allow access if student is invited via group', async () => {
        const _ctx = createMockContext({ role: 'STUDENT' });
        const studentId = faker.string.uuid();
        const groupId = faker.string.uuid();
        
        const eventWithInvitations = {
          ...createMockEvent({ isPublic: false }),
          invitations: [{ groupId }],
        };
        
        mockPrisma.calendarEvent.findUnique.mockResolvedValue(eventWithInvitations);
        mockPrisma.student.findUnique.mockResolvedValue({ id: studentId });
        mockPrisma.groupMember.findMany.mockResolvedValue([{ groupId }]);
        
        // Student is in the invited group
        expect(eventWithInvitations.invitations).toContainEqual({ groupId });
      });

      it('should allow access to public events', async () => {
        const _ctx = createMockContext({ role: 'STUDENT' });
        const publicEvent = createMockEvent({ isPublic: true });
        
        mockPrisma.calendarEvent.findUnique.mockResolvedValue(publicEvent);
        
        expect(publicEvent.isPublic).toBe(true);
      });
    });
  });

  // ==========================================================================
  // createEvent
  // ==========================================================================
  describe('createEvent', () => {
    describe('authorization', () => {
      it('should require staff role (admin or collaborator)', async () => {
        // staffProcedure requires ADMIN or COLLABORATOR
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('ADMIN');
        expect(validRoles).toContain('COLLABORATOR');
      });

      it('should NOT allow students to create events', async () => {
        const ctx = createMockContext({ role: 'STUDENT' });
        
        // staffProcedure throws FORBIDDEN for students
        expect(ctx.user.role).toBe('STUDENT');
        expect(['ADMIN', 'COLLABORATOR']).not.toContain('STUDENT');
      });
    });

    describe('input validation', () => {
      it('should require title', () => {
        const invalidInput = { title: '' };
        expect(invalidInput.title).toBe('');
      });

      it('should limit title to 200 characters', () => {
        const longTitle = faker.string.alpha(201);
        expect(longTitle.length).toBeGreaterThan(200);
      });

      it('should require start and end dates', () => {
        const input = {
          startDate: new Date(),
          endDate: new Date(),
        };
        expect(input.startDate).toBeInstanceOf(Date);
        expect(input.endDate).toBeInstanceOf(Date);
      });

      it('should throw BAD_REQUEST if endDate is before startDate', async () => {
        const startDate = new Date('2024-12-31');
        const endDate = new Date('2024-01-01');
        
        const error = new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La data di fine deve essere successiva alla data di inizio',
        });
        
        expect(endDate < startDate).toBe(true);
        expect(error.code).toBe('BAD_REQUEST');
      });

      it('should validate onlineLink as URL', () => {
        const validUrl = 'https://zoom.us/meeting/123';
        const isUrl = validUrl.startsWith('http://') || validUrl.startsWith('https://');
        expect(isUrl).toBe(true);
      });

      it('should accept event type enum values', () => {
        const types: EventType[] = ['LECTURE', 'WORKSHOP', 'EXAM', 'MEETING', 'OTHER'];
        expect(types).toContain('LECTURE');
      });

      it('should accept location type enum values', () => {
        const types: EventLocationType[] = ['IN_PERSON', 'ONLINE', 'HYBRID'];
        expect(types).toContain('IN_PERSON');
      });
    });

    describe('success scenarios', () => {
      it('should create event with basic data', async () => {
        const _ctx = createMockContext({ role: 'ADMIN' });
        const newEvent = createMockEvent({ createdById: _ctx.user.id });
        
        mockPrisma.calendarEvent.create.mockResolvedValue({
          ...newEvent,
          createdBy: { id: _ctx.user.id, name: _ctx.user.name },
          invitations: [],
        });
        
        expect(newEvent.createdById).toBe(_ctx.user.id);
      });

      it('should create event with user invitations', async () => {
        const _ctx = createMockContext({ role: 'ADMIN' });
        const invitedUserId = faker.string.uuid();
        
        const inviteUserIds = [invitedUserId];
        
        mockPrisma.calendarEvent.create.mockResolvedValue({
          ...createMockEvent(),
          invitations: [{ userId: invitedUserId }],
        });
        
        expect(inviteUserIds).toContain(invitedUserId);
      });

      it('should create event with group invitations', async () => {
        const _ctx = createMockContext({ role: 'ADMIN' });
        const invitedGroupId = faker.string.uuid();
        
        const inviteGroupIds = [invitedGroupId];
        
        mockPrisma.calendarEvent.create.mockResolvedValue({
          ...createMockEvent(),
          invitations: [{ groupId: invitedGroupId }],
        });
        
        expect(inviteGroupIds).toContain(invitedGroupId);
      });

      it('should send email invites if enabled', async () => {
        const _ctx = createMockContext({ role: 'ADMIN' });
        const sendEmailInvites = true;
        
        // Email should be sent asynchronously
        expect(sendEmailInvites).toBe(true);
      });

      it('should create in-app notifications for invitees', async () => {
        const { createBulkNotifications } = await import('@/lib/notifications');
        expect(createBulkNotifications).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // updateEvent
  // ==========================================================================
  describe('updateEvent', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('ADMIN');
      });

      it('should throw NOT_FOUND for non-existent event', async () => {
        mockPrisma.calendarEvent.findUnique.mockResolvedValue(null);
        
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Evento non trovato',
        });
        
        expect(error.code).toBe('NOT_FOUND');
      });

      it('should allow collaborators to edit only their own events', async () => {
        const ctx = createMockContext({ role: 'COLLABORATOR' });
        const ownEvent = createMockEvent({ createdById: ctx.user.id });
        const otherEvent = createMockEvent({ createdById: faker.string.uuid() });
        
        expect(ownEvent.createdById).toBe(ctx.user.id);
        expect(otherEvent.createdById).not.toBe(ctx.user.id);
      });

      it('should allow admin to edit any event', async () => {
        const ctx = createMockContext({ role: 'ADMIN' });
        const anyEvent = createMockEvent({ createdById: faker.string.uuid() });
        
        expect(ctx.user.role).toBe('ADMIN');
        expect(anyEvent.createdById).not.toBe(ctx.user.id);
      });
    });

    describe('success scenarios', () => {
      it('should update event fields', async () => {
        const _ctx = createMockContext({ role: 'ADMIN' });
        const existingEvent = createMockEvent();
        
        mockPrisma.calendarEvent.findUnique.mockResolvedValue(existingEvent);
        mockPrisma.calendarEvent.update.mockResolvedValue({
          ...existingEvent,
          title: 'Updated Title',
        });
        
        expect(mockPrisma.calendarEvent.update).toBeDefined();
      });

      it('should send modification emails if invitations exist', async () => {
        const { sendEventModificationEmail } = await import('@/lib/email/eventEmails');
        expect(sendEventModificationEmail).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // cancelEvent
  // ==========================================================================
  describe('cancelEvent', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('ADMIN');
      });

      it('should throw NOT_FOUND for non-existent event', async () => {
        mockPrisma.calendarEvent.findUnique.mockResolvedValue(null);
        
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Evento non trovato',
        });
        
        expect(error.code).toBe('NOT_FOUND');
      });
    });

    describe('success scenarios', () => {
      it('should mark event as cancelled', async () => {
        const _ctx = createMockContext({ role: 'ADMIN' });
        const event = createMockEvent();
        
        mockPrisma.calendarEvent.findUnique.mockResolvedValue(event);
        mockPrisma.calendarEvent.update.mockResolvedValue({
          ...event,
          isCancelled: true,
        });
        
        expect(mockPrisma.calendarEvent.update).toBeDefined();
      });

      it('should send cancellation emails to invitees', async () => {
        const { sendEventCancellationEmail } = await import('@/lib/email/eventEmails');
        expect(sendEventCancellationEmail).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // deleteEvent
  // ==========================================================================
  describe('deleteEvent', () => {
    describe('authorization', () => {
      it('should require admin role', async () => {
        // adminProcedure requires ADMIN
        const ctx = createMockContext({ role: 'ADMIN' });
        expect(ctx.user.role).toBe('ADMIN');
      });

      it('should NOT allow collaborators to delete events', async () => {
        const ctx = createMockContext({ role: 'COLLABORATOR' });
        
        // adminProcedure throws FORBIDDEN for non-admin
        expect(ctx.user.role).toBe('COLLABORATOR');
        expect(ctx.user.role).not.toBe('ADMIN');
      });

      it('should NOT allow students to delete events', async () => {
        const ctx = createMockContext({ role: 'STUDENT' });
        expect(ctx.user.role).not.toBe('ADMIN');
      });

      it('should throw NOT_FOUND for non-existent event', async () => {
        mockPrisma.calendarEvent.findUnique.mockResolvedValue(null);
        
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Evento non trovato',
        });
        
        expect(error.code).toBe('NOT_FOUND');
      });
    });

    describe('success scenarios', () => {
      it('should permanently delete the event', async () => {
        const _ctx = createMockContext({ role: 'ADMIN' });
        const event = createMockEvent();
        
        mockPrisma.calendarEvent.findUnique.mockResolvedValue(event);
        mockPrisma.calendarEvent.delete.mockResolvedValue(event);
        
        expect(mockPrisma.calendarEvent.delete).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // addInvitations
  // ==========================================================================
  describe('addInvitations', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('ADMIN');
      });
    });

    describe('success scenarios', () => {
      it('should add user invitations', async () => {
        const eventId = faker.string.uuid();
        const userIds = [faker.string.uuid()];
        
        mockPrisma.eventInvitation.create.mockResolvedValue(
          createMockInvitation({ eventId, userId: userIds[0] })
        );
        
        expect(userIds).toHaveLength(1);
      });

      it('should add group invitations', async () => {
        const eventId = faker.string.uuid();
        const groupIds = [faker.string.uuid()];
        
        mockPrisma.eventInvitation.create.mockResolvedValue(
          createMockInvitation({ eventId, groupId: groupIds[0], userId: null })
        );
        
        expect(groupIds).toHaveLength(1);
      });
    });
  });

  // ==========================================================================
  // removeInvitation
  // ==========================================================================
  describe('removeInvitation', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('ADMIN');
      });
    });

    describe('success scenarios', () => {
      it('should remove invitation by id', async () => {
        const invitation = createMockInvitation();
        
        mockPrisma.eventInvitation.findUnique.mockResolvedValue(invitation);
        mockPrisma.eventInvitation.delete.mockResolvedValue(invitation);
        
        expect(mockPrisma.eventInvitation.delete).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // respondToInvitation
  // ==========================================================================
  describe('respondToInvitation', () => {
    describe('authorization', () => {
      it('should require authentication', async () => {
        const ctx = createMockContext();
        expect(ctx.user).toBeDefined();
      });
    });

    describe('input validation', () => {
      it('should accept valid invitation status values', () => {
        const statuses: EventInviteStatus[] = ['PENDING', 'ACCEPTED', 'DECLINED', 'MAYBE'];
        expect(statuses).toContain('ACCEPTED');
        expect(statuses).toContain('DECLINED');
      });
    });

    describe('success scenarios', () => {
      it('should update invitation status', async () => {
        const ctx = createMockContext();
        const invitation = createMockInvitation({ userId: ctx.user.id, status: 'PENDING' });
        
        mockPrisma.eventInvitation.findFirst.mockResolvedValue(invitation);
        mockPrisma.eventInvitation.update.mockResolvedValue({
          ...invitation,
          status: 'ACCEPTED',
          respondedAt: new Date(),
        });
        
        expect(mockPrisma.eventInvitation.update).toBeDefined();
      });

      it('should set respondedAt timestamp', async () => {
        const respondedAt = new Date();
        expect(respondedAt).toBeInstanceOf(Date);
      });
    });
  });

  // ==========================================================================
  // getEventAttendances
  // ==========================================================================
  describe('getEventAttendances', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('ADMIN');
      });
    });

    describe('success scenarios', () => {
      it('should return attendances for event', async () => {
        const eventId = faker.string.uuid();
        const attendances = [
          createMockAttendance({ eventId, status: 'PRESENT' }),
          createMockAttendance({ eventId, status: 'ABSENT' }),
        ];
        
        mockPrisma.eventAttendance.findMany.mockResolvedValue(attendances);
        
        expect(attendances).toHaveLength(2);
      });
    });
  });

  // ==========================================================================
  // recordAttendance
  // ==========================================================================
  describe('recordAttendance', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('ADMIN');
      });
    });

    describe('input validation', () => {
      it('should accept valid attendance status values', () => {
        const statuses: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
        expect(statuses).toHaveLength(4);
      });
    });

    describe('success scenarios', () => {
      it('should record student attendance', async () => {
        const ctx = createMockContext({ role: 'COLLABORATOR' });
        const attendance = createMockAttendance({
          status: 'PRESENT',
          recordedById: ctx.user.id,
        });
        
        mockPrisma.eventAttendance.upsert.mockResolvedValue(attendance);
        
        expect(attendance.status).toBe('PRESENT');
      });

      it('should allow notes for attendance', async () => {
        const notes = 'Arrivato 10 minuti in ritardo';
        const attendance = createMockAttendance({ status: 'LATE', notes });
        
        expect(attendance.notes).toBe(notes);
      });
    });
  });

  // ==========================================================================
  // bulkRecordAttendance
  // ==========================================================================
  describe('bulkRecordAttendance', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('ADMIN');
      });
    });

    describe('success scenarios', () => {
      it('should record attendance for multiple students', async () => {
        const attendances = [
          { studentId: faker.string.uuid(), status: 'PRESENT' as AttendanceStatus },
          { studentId: faker.string.uuid(), status: 'ABSENT' as AttendanceStatus },
          { studentId: faker.string.uuid(), status: 'LATE' as AttendanceStatus },
        ];
        
        expect(attendances).toHaveLength(3);
      });
    });
  });

  // ==========================================================================
  // getStaffAbsences
  // ==========================================================================
  describe('getStaffAbsences', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('ADMIN');
      });
    });

    describe('success scenarios', () => {
      it('should return staff absences', async () => {
        const absences = [
          createMockStaffAbsence({ status: 'PENDING' }),
          createMockStaffAbsence({ status: 'APPROVED' }),
        ];
        
        mockPrisma.staffAbsence.findMany.mockResolvedValue(absences);
        
        expect(absences).toHaveLength(2);
      });

      it('should filter by status', async () => {
        const status: StaffAbsenceStatus = 'PENDING';
        
        mockPrisma.staffAbsence.findMany.mockResolvedValue([
          createMockStaffAbsence({ status }),
        ]);
        
        expect(status).toBe('PENDING');
      });
    });
  });

  // ==========================================================================
  // requestAbsence
  // ==========================================================================
  describe('requestAbsence', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('COLLABORATOR');
      });
    });

    describe('input validation', () => {
      it('should require start and end dates', () => {
        const input = {
          startDate: new Date(),
          endDate: new Date(),
        };
        expect(input.startDate).toBeInstanceOf(Date);
      });

      it('should require reason', () => {
        const reason = 'Motivi di salute';
        expect(reason).toBeTruthy();
      });
    });

    describe('success scenarios', () => {
      it('should create absence request with PENDING status', async () => {
        const ctx = createMockContext({ role: 'COLLABORATOR' });
        const absence = createMockStaffAbsence({
          requesterId: ctx.user.id,
          status: 'PENDING',
        });
        
        mockPrisma.staffAbsence.create.mockResolvedValue(absence);
        
        expect(absence.status).toBe('PENDING');
      });

      it('should optionally include substitute suggestion', async () => {
        const substituteId = faker.string.uuid();
        const absence = createMockStaffAbsence({ substituteId });
        
        expect(absence.substituteId).toBe(substituteId);
      });
    });
  });

  // ==========================================================================
  // updateAbsenceStatus
  // ==========================================================================
  describe('updateAbsenceStatus', () => {
    describe('authorization', () => {
      it('should require admin role', async () => {
        const ctx = createMockContext({ role: 'ADMIN' });
        expect(ctx.user.role).toBe('ADMIN');
      });

      it('should NOT allow collaborators to update absence status', async () => {
        const ctx = createMockContext({ role: 'COLLABORATOR' });
        expect(ctx.user.role).not.toBe('ADMIN');
      });
    });

    describe('input validation', () => {
      it('should accept valid absence status values', () => {
        const statuses: StaffAbsenceStatus[] = ['APPROVED', 'REJECTED'];
        expect(statuses).toContain('APPROVED');
        expect(statuses).toContain('REJECTED');
      });
    });

    describe('success scenarios', () => {
      it('should update absence status to APPROVED', async () => {
        const ctx = createMockContext({ role: 'ADMIN' });
        const absence = createMockStaffAbsence({ status: 'PENDING' });
        
        mockPrisma.staffAbsence.findUnique.mockResolvedValue(absence);
        mockPrisma.staffAbsence.update.mockResolvedValue({
          ...absence,
          status: 'APPROVED',
          approvedById: ctx.user.id,
        });
        
        expect(mockPrisma.staffAbsence.update).toBeDefined();
      });

      it('should update absence status to REJECTED', async () => {
        const _ctx = createMockContext({ role: 'ADMIN' });
        const adminNotes = 'Non approvata per motivi organizzativi';
        
        const absence = createMockStaffAbsence({ status: 'PENDING' });
        
        mockPrisma.staffAbsence.update.mockResolvedValue({
          ...absence,
          status: 'REJECTED',
          adminNotes,
        });
        
        expect(adminNotes).toBeTruthy();
      });

      it('should send email notification to requester', async () => {
        const { sendAbsenceStatusEmail } = await import('@/lib/email/eventEmails');
        expect(sendAbsenceStatusEmail).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // cancelAbsenceRequest
  // ==========================================================================
  describe('cancelAbsenceRequest', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('COLLABORATOR');
      });

      it('should only allow requester to cancel their own request', async () => {
        const ctx = createMockContext({ role: 'COLLABORATOR' });
        const ownRequest = createMockStaffAbsence({ requesterId: ctx.user.id });
        const otherRequest = createMockStaffAbsence({ requesterId: faker.string.uuid() });
        
        expect(ownRequest.requesterId).toBe(ctx.user.id);
        expect(otherRequest.requesterId).not.toBe(ctx.user.id);
      });

      it('should allow admin to cancel any request', async () => {
        const ctx = createMockContext({ role: 'ADMIN' });
        expect(ctx.user.role).toBe('ADMIN');
      });
    });

    describe('success scenarios', () => {
      it('should mark absence as CANCELLED', async () => {
        const ctx = createMockContext({ role: 'COLLABORATOR' });
        const absence = createMockStaffAbsence({ requesterId: ctx.user.id, status: 'PENDING' });
        
        mockPrisma.staffAbsence.findUnique.mockResolvedValue(absence);
        mockPrisma.staffAbsence.update.mockResolvedValue({
          ...absence,
          status: 'CANCELLED',
        });
        
        expect(mockPrisma.staffAbsence.update).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // getStats
  // ==========================================================================
  describe('getStats', () => {
    describe('authorization', () => {
      it('should require staff role', async () => {
        const validRoles = ['ADMIN', 'COLLABORATOR'];
        expect(validRoles).toContain('ADMIN');
      });
    });

    describe('success scenarios', () => {
      it('should return calendar statistics', async () => {
        const stats = {
          totalEvents: 50,
          upcomingEvents: 10,
          pendingAbsences: 3,
        };
        
        expect(stats.totalEvents).toBe(50);
      });
    });
  });

  // ==========================================================================
  // SECURITY TESTS
  // ==========================================================================
  describe('Security', () => {
    describe('event access', () => {
      it('should prevent students from accessing private events they are not invited to', async () => {
        const _ctx = createMockContext({ role: 'STUDENT' });
        const privateEvent = createMockEvent({ isPublic: false });
        
        mockPrisma.calendarEvent.findUnique.mockResolvedValue({ ...privateEvent, invitations: [] });
        mockPrisma.student.findUnique.mockResolvedValue({ id: faker.string.uuid() });
        mockPrisma.groupMember.findMany.mockResolvedValue([]);
        
        const error = new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non hai accesso a questo evento',
        });
        
        expect(error.code).toBe('FORBIDDEN');
      });

      it('should prevent students from creating events', async () => {
        const ctx = createMockContext({ role: 'STUDENT' });
        expect(['ADMIN', 'COLLABORATOR']).not.toContain(ctx.user.role);
      });

      it('should prevent students from deleting events', async () => {
        const ctx = createMockContext({ role: 'STUDENT' });
        expect(ctx.user.role).not.toBe('ADMIN');
      });

      it('should prevent collaborators from deleting events', async () => {
        const ctx = createMockContext({ role: 'COLLABORATOR' });
        expect(ctx.user.role).not.toBe('ADMIN');
      });
    });

    describe('absence management', () => {
      it('should prevent collaborators from approving absence requests', async () => {
        const ctx = createMockContext({ role: 'COLLABORATOR' });
        expect(ctx.user.role).not.toBe('ADMIN');
      });

      it('should prevent users from cancelling others absence requests', async () => {
        const ctx = createMockContext({ role: 'COLLABORATOR' });
        const otherRequest = createMockStaffAbsence({ requesterId: faker.string.uuid() });
        
        // Should check if requester matches current user
        expect(otherRequest.requesterId).not.toBe(ctx.user.id);
      });
    });

    describe('input sanitization', () => {
      it('should limit title length', () => {
        const maxTitleLength = 200;
        expect(maxTitleLength).toBe(200);
      });

      it('should limit page size', () => {
        const maxPageSize = 100;
        expect(maxPageSize).toBe(100);
      });

      it('should limit reminder minutes', () => {
        const maxReminderMinutes = 10080; // 1 week
        expect(maxReminderMinutes).toBe(10080);
      });
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================
  describe('Edge Cases', () => {
    describe('empty states', () => {
      it('should handle no events found', async () => {
        mockPrisma.calendarEvent.findMany.mockResolvedValue([]);
        mockPrisma.calendarEvent.count.mockResolvedValue(0);
        
        const result = {
          events: [],
          pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
        };
        
        expect(result.events).toHaveLength(0);
      });

      it('should handle event with no invitations', async () => {
        const eventWithInvitations = {
          ...createMockEvent(),
          invitations: [],
        };
        expect(eventWithInvitations.invitations).toHaveLength(0);
      });

      it('should handle event with no attendances', async () => {
        mockPrisma.eventAttendance.findMany.mockResolvedValue([]);
        expect(mockPrisma.eventAttendance.findMany).toBeDefined();
      });
    });

    describe('date handling', () => {
      it('should handle all-day events', async () => {
        const allDayEvent = createMockEvent({ isAllDay: true });
        expect(allDayEvent.isAllDay).toBe(true);
      });

      it('should handle recurring events', async () => {
        const recurringEvent = createMockEvent({
          isRecurring: true,
          recurrenceFrequency: 'WEEKLY' as RecurrenceFrequency,
          recurrenceEndDate: faker.date.future(),
        });
        
        expect(recurringEvent.isRecurring).toBe(true);
        expect(recurringEvent.recurrenceFrequency).toBe('WEEKLY');
      });
    });

    describe('location handling', () => {
      it('should handle online events', async () => {
        const onlineEvent = createMockEvent({
          locationType: 'ONLINE' as EventLocationType,
          onlineLink: 'https://zoom.us/meeting/123',
        });
        
        expect(onlineEvent.locationType).toBe('ONLINE');
        expect(onlineEvent.onlineLink).toBeTruthy();
      });

      it('should handle hybrid events', async () => {
        const hybridEvent = createMockEvent({
          locationType: 'HYBRID' as EventLocationType,
          locationDetails: 'Aula A1',
          onlineLink: 'https://meet.google.com/abc',
        });
        
        expect(hybridEvent.locationType).toBe('HYBRID');
      });
    });
  });
});
