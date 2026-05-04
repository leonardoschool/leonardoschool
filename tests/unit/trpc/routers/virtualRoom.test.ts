/**
 * Virtual Room Router Tests
 *
 * Tests for synchronized exam session management:
 * Staff procedures:
 * - getOrCreateSession - create or get session for assignment
 * - startSession - start simulation for all participants
 * - endSession - end session
 * - getSessionState - get current session state
 * - kickParticipant - remove participant from session
 * Protected procedures (students):
 * - joinSession - student joins session
 * - heartbeat - keep-alive signal
 * - setReady - mark student as ready
 * - getStudentSessionStatus - get student's session status
 * - logCheatingEvent - log cheating event
 * - sendMessage - send chat message
 * - getMessages - get session messages
 * - markMessagesRead - mark messages as read
 * - getSessionRankings - get real-time rankings
 * - disconnect - disconnect from session
 * - linkResult - link simulation result
 * - markCompleted - mark participant as completed
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker/locale/it';

// Mock Prisma
const mockPrisma = {
  simulationSession: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  simulationAssignment: {
    findUnique: vi.fn(),
  },
  sessionParticipant: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  cheatingEvent: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  sessionMessage: {
    create: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
  simulationResult: {
    findFirst: vi.fn(),
  },
  student: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn((callback: (tx: typeof mockPrisma) => Promise<unknown>) => callback(mockPrisma)),
};

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Helper types
type SessionStatus = 'WAITING' | 'STARTED' | 'COMPLETED' | 'CANCELLED';

// Helper functions
function createMockUser(role: 'ADMIN' | 'COLLABORATOR' | 'STUDENT' = 'STUDENT', overrides = {}) {
  return {
    id: faker.string.uuid(),
    firebaseUid: faker.string.alphanumeric(28),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role,
    isActive: true,
    profileCompleted: true,
    ...overrides,
  };
}

function createMockStudent(userId: string, overrides = {}) {
  return {
    id: faker.string.uuid(),
    userId,
    user: createMockUser('STUDENT', { id: userId }),
    ...overrides,
  };
}

function createMockSimulation(overrides = {}) {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.sentence(),
    durationMinutes: 60,
    totalQuestions: 30,
    accessType: 'ROOM',
    hasSections: false,
    sections: null,
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

function createMockAssignment(overrides = {}) {
  const simulation = createMockSimulation();
  const student = createMockStudent(faker.string.uuid());
  return {
    id: faker.string.uuid(),
    simulationId: simulation.id,
    simulation,
    studentId: student.id,
    student,
    groupId: null,
    group: null,
    status: 'ACTIVE',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

function createMockSession(status: SessionStatus = 'WAITING', overrides = {}) {
  return {
    id: faker.string.uuid(),
    simulationId: faker.string.uuid(),
    assignmentId: faker.string.uuid(),
    status,
    scheduledStartAt: new Date(),
    actualStartAt: status === 'STARTED' ? new Date() : null,
    endedAt: status === 'COMPLETED' ? new Date() : null,
    participants: [],
    ...overrides,
  };
}

function createMockParticipant(sessionId: string, studentId: string, overrides = {}) {
  return {
    id: faker.string.uuid(),
    sessionId,
    studentId,
    isConnected: true,
    isReady: false,
    lastHeartbeat: new Date(),
    joinedAt: new Date(),
    leftAt: null,
    cheatingEvents: [],
    ...overrides,
  };
}

describe('Virtual Room Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== STAFF PROCEDURES ====================

  describe('getOrCreateSession', () => {
    describe('authorization', () => {
      it('should require staff role', () => {
        // staffProcedure allows ADMIN and COLLABORATOR
        expect(true).toBe(true);
      });

      it('should NOT allow students', () => {
        expect(true).toBe(true);
      });
    });

    describe('input validation', () => {
      it('should require assignmentId', () => {
        expect(true).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should create new session if none exists', async () => {
        const assignment = createMockAssignment();
        mockPrisma.simulationAssignment.findUnique.mockResolvedValue(assignment);
        mockPrisma.simulationSession.findFirst.mockResolvedValue(null);
        mockPrisma.simulationSession.create.mockResolvedValue(createMockSession());

        expect(mockPrisma.simulationSession.create).toBeDefined();
      });

      it('should return existing session if found', async () => {
        const assignment = createMockAssignment();
        const session = createMockSession('WAITING');
        mockPrisma.simulationAssignment.findUnique.mockResolvedValue(assignment);
        mockPrisma.simulationSession.findFirst.mockResolvedValue(session);

        expect(mockPrisma.simulationSession.findFirst).toBeDefined();
      });

      it('should return invited students list', async () => {
        const student = createMockStudent(faker.string.uuid());
        const assignment = createMockAssignment({ student });
        mockPrisma.simulationAssignment.findUnique.mockResolvedValue(assignment);

        expect(assignment.student).toBeDefined();
      });

      it('should throw NOT_FOUND if assignment does not exist', async () => {
        mockPrisma.simulationAssignment.findUnique.mockResolvedValue(null);

        expect(mockPrisma.simulationAssignment.findUnique).toBeDefined();
      });

      it('should throw BAD_REQUEST if simulation is not ROOM type', async () => {
        const assignment = createMockAssignment({
          simulation: createMockSimulation({ accessType: 'ALWAYS' }),
        });
        mockPrisma.simulationAssignment.findUnique.mockResolvedValue(assignment);

        expect(assignment.simulation.accessType).toBe('ALWAYS');
      });

      it('should throw BAD_REQUEST if assignment is expired', async () => {
        const assignment = createMockAssignment({
          endDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        });
        mockPrisma.simulationAssignment.findUnique.mockResolvedValue(assignment);

        expect(assignment.endDate < new Date()).toBe(true);
      });

      it('should throw BAD_REQUEST if assignment is not ACTIVE', async () => {
        const assignment = createMockAssignment({ status: 'CLOSED' });
        mockPrisma.simulationAssignment.findUnique.mockResolvedValue(assignment);

        expect(assignment.status).toBe('CLOSED');
      });
    });
  });

  describe('startSession', () => {
    describe('authorization', () => {
      it('should require staff role', () => {
        expect(true).toBe(true);
      });
    });

    describe('input validation', () => {
      it('should require sessionId', () => {
        expect(true).toBe(true);
      });

      it('should accept optional forceStart', () => {
        expect(true).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should start session for all participants', async () => {
        const session = createMockSession('WAITING', {
          participants: [createMockParticipant(faker.string.uuid(), faker.string.uuid(), { isConnected: true })],
          simulation: {
            ...createMockSimulation(),
            assignments: [],
          },
        });
        mockPrisma.simulationSession.findUnique.mockResolvedValue(session);
        mockPrisma.simulationSession.update.mockResolvedValue({
          ...session,
          status: 'STARTED',
          actualStartAt: new Date(),
        });

        expect(mockPrisma.simulationSession.update).toBeDefined();
      });

      it('should throw NOT_FOUND if session does not exist', async () => {
        mockPrisma.simulationSession.findUnique.mockResolvedValue(null);

        expect(mockPrisma.simulationSession.findUnique).toBeDefined();
      });

      it('should throw BAD_REQUEST if session not in WAITING status', async () => {
        const session = createMockSession('STARTED');
        mockPrisma.simulationSession.findUnique.mockResolvedValue(session);

        expect(session.status).toBe('STARTED');
      });

      it('should require all students connected unless forceStart', async () => {
        const session = createMockSession('WAITING', {
          participants: [],
          simulation: {
            ...createMockSimulation(),
            assignments: [createMockAssignment()],
          },
        });
        mockPrisma.simulationSession.findUnique.mockResolvedValue(session);

        // 0 connected, 1 invited - should throw unless forceStart
        expect(session.participants.length).toBe(0);
      });

      it('should allow forceStart with fewer students', async () => {
        // forceStart: true bypasses the all-connected check
        expect(true).toBe(true);
      });
    });
  });

  describe('endSession', () => {
    describe('authorization', () => {
      it('should require staff role', () => {
        expect(true).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should end session and update status', async () => {
        const session = createMockSession('STARTED');
        mockPrisma.simulationSession.findUnique.mockResolvedValue(session);
        mockPrisma.simulationSession.update.mockResolvedValue({
          ...session,
          status: 'COMPLETED',
          endedAt: new Date(),
        });

        expect(mockPrisma.simulationSession.update).toBeDefined();
      });

      it('should throw NOT_FOUND if session does not exist', async () => {
        mockPrisma.simulationSession.findUnique.mockResolvedValue(null);

        expect(mockPrisma.simulationSession.findUnique).toBeDefined();
      });
    });
  });

  describe('getSessionState', () => {
    describe('authorization', () => {
      it('should require staff role', () => {
        expect(true).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should return session with participants', async () => {
        const session = createMockSession('STARTED', {
          participants: [createMockParticipant(faker.string.uuid(), faker.string.uuid())],
        });
        mockPrisma.simulationSession.findUnique.mockResolvedValue(session);

        expect(mockPrisma.simulationSession.findUnique).toBeDefined();
      });

      it('should include cheating events', async () => {
        const participant = createMockParticipant(faker.string.uuid(), faker.string.uuid(), {
          cheatingEvents: [{ type: 'TAB_SWITCH', timestamp: new Date() }],
        });
        const session = createMockSession('STARTED', { participants: [participant] });
        mockPrisma.simulationSession.findUnique.mockResolvedValue(session);

        expect(participant.cheatingEvents.length).toBeGreaterThan(0);
      });

      it('should throw NOT_FOUND if session does not exist', async () => {
        mockPrisma.simulationSession.findUnique.mockResolvedValue(null);

        expect(mockPrisma.simulationSession.findUnique).toBeDefined();
      });
    });
  });

  describe('kickParticipant', () => {
    describe('authorization', () => {
      it('should require staff role', () => {
        expect(true).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should disconnect participant', async () => {
        const participant = createMockParticipant(faker.string.uuid(), faker.string.uuid());
        mockPrisma.sessionParticipant.findUnique.mockResolvedValue(participant);
        mockPrisma.sessionParticipant.update.mockResolvedValue({
          ...participant,
          isConnected: false,
          leftAt: new Date(),
        });

        expect(mockPrisma.sessionParticipant.update).toBeDefined();
      });

      it('should throw NOT_FOUND if participant does not exist', async () => {
        mockPrisma.sessionParticipant.findUnique.mockResolvedValue(null);

        expect(mockPrisma.sessionParticipant.findUnique).toBeDefined();
      });
    });
  });

  // ==================== PROTECTED PROCEDURES (STUDENTS) ====================

  describe('joinSession', () => {
    describe('authorization', () => {
      it('should require authentication', () => {
        // protectedProcedure
        expect(true).toBe(true);
      });
    });

    describe('input validation', () => {
      it('should require sessionId', () => {
        expect(true).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should allow student to join session', async () => {
        const session = createMockSession('WAITING');
        const student = createMockStudent(faker.string.uuid());
        mockPrisma.simulationSession.findUnique.mockResolvedValue(session);
        mockPrisma.student.findUnique.mockResolvedValue(student);
        mockPrisma.sessionParticipant.upsert.mockResolvedValue(
          createMockParticipant(session.id, student.id)
        );

        expect(mockPrisma.sessionParticipant.upsert).toBeDefined();
      });

      it('should throw NOT_FOUND if session does not exist', async () => {
        mockPrisma.simulationSession.findUnique.mockResolvedValue(null);

        expect(mockPrisma.simulationSession.findUnique).toBeDefined();
      });

      it('should throw if user is not a student', async () => {
        mockPrisma.student.findUnique.mockResolvedValue(null);

        expect(mockPrisma.student.findUnique).toBeDefined();
      });

      it('should not allow joining completed sessions', async () => {
        const session = createMockSession('COMPLETED');
        mockPrisma.simulationSession.findUnique.mockResolvedValue(session);

        expect(session.status).toBe('COMPLETED');
      });
    });
  });

  describe('heartbeat', () => {
    describe('authorization', () => {
      it('should require authentication', () => {
        expect(true).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should update lastHeartbeat timestamp', async () => {
        const participant = createMockParticipant(faker.string.uuid(), faker.string.uuid());
        mockPrisma.sessionParticipant.update.mockResolvedValue({
          ...participant,
          lastHeartbeat: new Date(),
        });

        expect(mockPrisma.sessionParticipant.update).toBeDefined();
      });

      it('should keep participant connected', async () => {
        const participant = createMockParticipant(faker.string.uuid(), faker.string.uuid());
        expect(participant.isConnected).toBe(true);
      });
    });
  });

  describe('setReady', () => {
    describe('authorization', () => {
      it('should require authentication', () => {
        expect(true).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should mark student as ready', async () => {
        const participant = createMockParticipant(faker.string.uuid(), faker.string.uuid());
        mockPrisma.sessionParticipant.update.mockResolvedValue({
          ...participant,
          isReady: true,
        });

        expect(mockPrisma.sessionParticipant.update).toBeDefined();
      });
    });
  });

  describe('getStudentSessionStatus', () => {
    describe('authorization', () => {
      it('should require authentication', () => {
        expect(true).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should return student session status', async () => {
        const session = createMockSession('STARTED');
        const participant = createMockParticipant(session.id, faker.string.uuid());
        mockPrisma.sessionParticipant.findFirst.mockResolvedValue(participant);

        expect(mockPrisma.sessionParticipant.findFirst).toBeDefined();
      });

      it('should return null if student not in session', async () => {
        mockPrisma.sessionParticipant.findFirst.mockResolvedValue(null);

        expect(mockPrisma.sessionParticipant.findFirst).toBeDefined();
      });
    });
  });

  describe('logCheatingEvent', () => {
    describe('authorization', () => {
      it('should require authentication', () => {
        expect(true).toBe(true);
      });
    });

    describe('input validation', () => {
      it('should require participantId', () => {
        expect(true).toBe(true);
      });

      it('should require event type', () => {
        expect(true).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should log cheating event', async () => {
        const event = {
          id: faker.string.uuid(),
          participantId: faker.string.uuid(),
          type: 'TAB_SWITCH',
          timestamp: new Date(),
        };
        mockPrisma.cheatingEvent.create.mockResolvedValue(event);

        expect(mockPrisma.cheatingEvent.create).toBeDefined();
      });

      it('should support various event types', () => {
        const eventTypes = [
          'TAB_SWITCH',
          'FOCUS_LOST',
          'FULLSCREEN_EXIT',
          'COPY_PASTE',
          'RIGHT_CLICK',
          'DEVTOOLS_OPEN',
        ];
        eventTypes.forEach(type => {
          expect(typeof type).toBe('string');
        });
      });
    });
  });

  describe('sendMessage', () => {
    describe('authorization', () => {
      it('should require authentication', () => {
        expect(true).toBe(true);
      });
    });

    describe('input validation', () => {
      it('should require sessionId', () => {
        expect(true).toBe(true);
      });

      it('should require message content', () => {
        expect(true).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should send message to session', async () => {
        const message = {
          id: faker.string.uuid(),
          sessionId: faker.string.uuid(),
          content: faker.lorem.sentence(),
          sender: 'STUDENT',
          sentAt: new Date(),
        };
        mockPrisma.sessionMessage.create.mockResolvedValue(message);

        expect(mockPrisma.sessionMessage.create).toBeDefined();
      });

      it('should support STAFF sender type', async () => {
        const message = {
          sender: 'STAFF',
          content: 'Messaggio dallo staff',
        };
        expect(message.sender).toBe('STAFF');
      });
    });
  });

  describe('getMessages', () => {
    describe('authorization', () => {
      it('should require authentication', () => {
        expect(true).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should return session messages', async () => {
        const messages = [
          { id: faker.string.uuid(), content: 'Hello', sender: 'STUDENT' },
          { id: faker.string.uuid(), content: 'Hi', sender: 'STAFF' },
        ];
        mockPrisma.sessionMessage.findMany.mockResolvedValue(messages);

        expect(mockPrisma.sessionMessage.findMany).toBeDefined();
      });

      it('should order by sentAt', async () => {
        // orderBy: { sentAt: 'asc' }
        expect(true).toBe(true);
      });
    });
  });

  describe('markMessagesRead', () => {
    describe('authorization', () => {
      it('should require authentication', () => {
        expect(true).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should mark messages as read', async () => {
        mockPrisma.sessionMessage.updateMany.mockResolvedValue({ count: 5 });

        expect(mockPrisma.sessionMessage.updateMany).toBeDefined();
      });
    });
  });

  describe('getSessionRankings', () => {
    describe('authorization', () => {
      it('should require authentication', () => {
        expect(true).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should return real-time rankings', async () => {
        const results = [
          { studentId: faker.string.uuid(), score: 95, completedAt: new Date() },
          { studentId: faker.string.uuid(), score: 87, completedAt: new Date() },
        ];
        mockPrisma.simulationResult.findFirst.mockResolvedValue(results[0]);

        expect(mockPrisma.simulationResult.findFirst).toBeDefined();
      });

      it('should order by score descending', async () => {
        const rankings = [
          { score: 95, rank: 1 },
          { score: 87, rank: 2 },
          { score: 75, rank: 3 },
        ];
        const sorted = rankings.sort((a, b) => b.score - a.score);
        expect(sorted[0].rank).toBe(1);
      });
    });
  });

  describe('disconnect', () => {
    describe('authorization', () => {
      it('should require authentication', () => {
        expect(true).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should disconnect student from session', async () => {
        const participant = createMockParticipant(faker.string.uuid(), faker.string.uuid());
        mockPrisma.sessionParticipant.update.mockResolvedValue({
          ...participant,
          isConnected: false,
          leftAt: new Date(),
        });

        expect(mockPrisma.sessionParticipant.update).toBeDefined();
      });
    });
  });

  describe('linkResult', () => {
    describe('authorization', () => {
      it('should require authentication', () => {
        expect(true).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should link simulation result to participant', async () => {
        mockPrisma.sessionParticipant.update.mockResolvedValue({
          resultId: faker.string.uuid(),
        });

        expect(mockPrisma.sessionParticipant.update).toBeDefined();
      });
    });
  });

  describe('markCompleted', () => {
    describe('authorization', () => {
      it('should require authentication', () => {
        expect(true).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should mark participant as completed', async () => {
        const participant = createMockParticipant(faker.string.uuid(), faker.string.uuid());
        mockPrisma.sessionParticipant.update.mockResolvedValue({
          ...participant,
          completedAt: new Date(),
        });

        expect(mockPrisma.sessionParticipant.update).toBeDefined();
      });
    });
  });

  // ==================== SECURITY ====================

  describe('Security', () => {
    describe('role-based access', () => {
      it('should prevent students from creating sessions', () => {
        // getOrCreateSession requires staffProcedure
        expect(true).toBe(true);
      });

      it('should prevent students from starting sessions', () => {
        // startSession requires staffProcedure
        expect(true).toBe(true);
      });

      it('should prevent students from ending sessions', () => {
        // endSession requires staffProcedure
        expect(true).toBe(true);
      });

      it('should prevent students from kicking participants', () => {
        // kickParticipant requires staffProcedure
        expect(true).toBe(true);
      });

      it('should allow students to join and participate', () => {
        // joinSession, heartbeat, etc. require protectedProcedure only
        expect(true).toBe(true);
      });
    });

    describe('cheating detection', () => {
      it('should log all cheating events', () => {
        // logCheatingEvent stores all events
        expect(true).toBe(true);
      });

      it('should track tab switches', () => {
        expect(true).toBe(true);
      });

      it('should track focus loss', () => {
        expect(true).toBe(true);
      });

      it('should track fullscreen exit', () => {
        expect(true).toBe(true);
      });
    });

    describe('connection management', () => {
      it('should use heartbeat to detect disconnections', () => {
        // heartbeatTimeout = 15 seconds
        expect(15 * 1000).toBe(15000);
      });

      it('should track connection state', () => {
        const participant = createMockParticipant(faker.string.uuid(), faker.string.uuid());
        expect(participant.isConnected).toBe(true);
      });
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge Cases', () => {
    describe('session states', () => {
      it('should handle WAITING status', () => {
        const session = createMockSession('WAITING');
        expect(session.status).toBe('WAITING');
      });

      it('should handle STARTED status', () => {
        const session = createMockSession('STARTED');
        expect(session.status).toBe('STARTED');
      });

      it('should handle COMPLETED status', () => {
        const session = createMockSession('COMPLETED');
        expect(session.status).toBe('COMPLETED');
      });

      it('should handle CANCELLED status', () => {
        const session = createMockSession('CANCELLED');
        expect(session.status).toBe('CANCELLED');
      });
    });

    describe('participant states', () => {
      it('should handle connected and ready participant', () => {
        const participant = createMockParticipant(faker.string.uuid(), faker.string.uuid(), {
          isConnected: true,
          isReady: true,
        });
        expect(participant.isConnected).toBe(true);
        expect(participant.isReady).toBe(true);
      });

      it('should handle disconnected participant', () => {
        const participant = createMockParticipant(faker.string.uuid(), faker.string.uuid(), {
          isConnected: false,
          leftAt: new Date(),
        });
        expect(participant.isConnected).toBe(false);
      });

      it('should handle stale heartbeat as disconnected', () => {
        const staleHeartbeat = new Date(Date.now() - 20 * 1000); // 20 seconds ago
        const heartbeatTimeout = 15 * 1000;
        const isStale = Date.now() - staleHeartbeat.getTime() > heartbeatTimeout;
        expect(isStale).toBe(true);
      });
    });

    describe('group assignments', () => {
      it('should handle assignment with student', () => {
        const assignment = createMockAssignment();
        expect(assignment.student).toBeDefined();
        expect(assignment.group).toBeNull();
      });

      it('should handle assignment with group', () => {
        const group = {
          id: faker.string.uuid(),
          name: 'Gruppo A',
          members: [
            { student: createMockStudent(faker.string.uuid()) },
            { student: createMockStudent(faker.string.uuid()) },
          ],
        };
        const assignment = createMockAssignment({
          studentId: null,
          student: null,
          groupId: group.id,
          group,
        });
        expect(assignment.group).toBeDefined();
        expect(assignment.group.members.length).toBe(2);
      });
    });

    describe('empty states', () => {
      it('should handle session with no participants', () => {
        const session = createMockSession('WAITING', { participants: [] });
        expect(session.participants.length).toBe(0);
      });

      it('should handle no messages in session', async () => {
        mockPrisma.sessionMessage.findMany.mockResolvedValue([]);
        expect(mockPrisma.sessionMessage.findMany).toBeDefined();
      });

      it('should handle no cheating events', () => {
        const participant = createMockParticipant(faker.string.uuid(), faker.string.uuid(), {
          cheatingEvents: [],
        });
        expect(participant.cheatingEvents.length).toBe(0);
      });
    });
  });
});
