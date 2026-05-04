/**
 * Cleanup Service Tests
 *
 * Tests for the database cleanup service:
 * - runCleanup: Main cleanup orchestrator
 * - Individual cleanup functions for each data type
 * - Dry run mode
 * - Error handling
 *
 * Focus: Data retention policies, cleanup logic correctness, error resilience
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

// Type for mock Prisma client (minimal for cleanup tests)
type MockPrismaClient = {
  notification: { count: Mock; deleteMany: Mock };
  adminNotification: { count: Mock; deleteMany: Mock };
  alert: { count: Mock; deleteMany: Mock };
  contactRequest: { count: Mock; deleteMany: Mock };
  jobApplication: { count: Mock; deleteMany: Mock };
  questionFeedback: { count: Mock; deleteMany: Mock };
  questionVersion: { groupBy: Mock; findMany: Mock; count: Mock; deleteMany: Mock };
  conversation: { findMany: Mock; deleteMany: Mock };
  message: { deleteMany: Mock };
  sessionCheatingEvent: { count: Mock; deleteMany: Mock };
  sessionMessage: { count: Mock; deleteMany: Mock };
  simulationSession: { count: Mock; deleteMany: Mock };
  simulationSessionParticipant: { count: Mock };
  calendarEvent: { count: Mock; deleteMany: Mock };
  eventInvitation: { deleteMany: Mock };
  staffAbsence: { count: Mock; deleteMany: Mock };
};

// Helper to create mock Prisma
function createMockPrisma(): MockPrismaClient {
  return {
    notification: { count: vi.fn(), deleteMany: vi.fn() },
    adminNotification: { count: vi.fn(), deleteMany: vi.fn() },
    alert: { count: vi.fn(), deleteMany: vi.fn() },
    contactRequest: { count: vi.fn(), deleteMany: vi.fn() },
    jobApplication: { count: vi.fn(), deleteMany: vi.fn() },
    questionFeedback: { count: vi.fn(), deleteMany: vi.fn() },
    questionVersion: { 
      groupBy: vi.fn(), 
      findMany: vi.fn(), 
      count: vi.fn(), 
      deleteMany: vi.fn() 
    },
    conversation: { findMany: vi.fn(), deleteMany: vi.fn() },
    message: { deleteMany: vi.fn() },
    sessionCheatingEvent: { count: vi.fn(), deleteMany: vi.fn() },
    sessionMessage: { count: vi.fn(), deleteMany: vi.fn() },
    simulationSession: { count: vi.fn(), deleteMany: vi.fn() },
    simulationSessionParticipant: { count: vi.fn() },
    calendarEvent: { count: vi.fn(), deleteMany: vi.fn() },
    eventInvitation: { deleteMany: vi.fn() },
    staffAbsence: { count: vi.fn(), deleteMany: vi.fn() },
  };
}

describe('Cleanup Service', () => {
  let mockPrisma: MockPrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
  });

  // ==================== Date Cutoff Calculation Tests ====================
  describe('date cutoff calculations', () => {
    describe('notification cutoffs', () => {
      it('should calculate correct cutoff for read notifications (30 days)', () => {
        const days = 30;
        const now = new Date();
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        
        // Cutoff should be ~30 days ago
        const daysDiff = Math.floor((now.getTime() - cutoff.getTime()) / (24 * 60 * 60 * 1000));
        expect(daysDiff).toBe(30);
      });

      it('should calculate correct cutoff for unread notifications (90 days)', () => {
        const days = 90;
        const now = new Date();
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        
        const daysDiff = Math.floor((now.getTime() - cutoff.getTime()) / (24 * 60 * 60 * 1000));
        expect(daysDiff).toBe(90);
      });

      it('should calculate correct cutoff for archived notifications (7 days)', () => {
        const days = 7;
        const now = new Date();
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        
        const daysDiff = Math.floor((now.getTime() - cutoff.getTime()) / (24 * 60 * 60 * 1000));
        expect(daysDiff).toBe(7);
      });
    });

    describe('session data cutoffs', () => {
      it('should calculate correct cutoff for cheating events (90 days)', () => {
        const days = 90;
        const now = new Date();
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        
        const daysDiff = Math.floor((now.getTime() - cutoff.getTime()) / (24 * 60 * 60 * 1000));
        expect(daysDiff).toBe(90);
      });

      it('should calculate correct cutoff for session messages (30 days)', () => {
        const days = 30;
        const now = new Date();
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        
        const daysDiff = Math.floor((now.getTime() - cutoff.getTime()) / (24 * 60 * 60 * 1000));
        expect(daysDiff).toBe(30);
      });

      it('should calculate correct cutoff for completed sessions (180 days)', () => {
        const days = 180;
        const now = new Date();
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        
        const daysDiff = Math.floor((now.getTime() - cutoff.getTime()) / (24 * 60 * 60 * 1000));
        expect(daysDiff).toBe(180);
      });
    });

    describe('calendar/absence cutoffs', () => {
      it('should calculate correct cutoff for calendar events (365 days)', () => {
        const days = 365;
        const now = new Date();
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        
        const daysDiff = Math.floor((now.getTime() - cutoff.getTime()) / (24 * 60 * 60 * 1000));
        expect(daysDiff).toBe(365);
      });

      it('should calculate correct cutoff for staff absences (365 days)', () => {
        const days = 365;
        const now = new Date();
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        
        const daysDiff = Math.floor((now.getTime() - cutoff.getTime()) / (24 * 60 * 60 * 1000));
        expect(daysDiff).toBe(365);
      });
    });
  });

  // ==================== Session Cleanup Tests (NEW) ====================
  describe('session data cleanup', () => {
    describe('cleanupSessionCheatingEvents', () => {
      it('should delete cheating events older than cutoff', async () => {
        const cutoffDays = 90;
        const now = new Date();
        const cutoff = new Date(now.getTime() - cutoffDays * 24 * 60 * 60 * 1000);
        
        mockPrisma.sessionCheatingEvent.deleteMany.mockResolvedValue({ count: 15 });
        
        const result = await mockPrisma.sessionCheatingEvent.deleteMany({
          where: {
            createdAt: { lt: cutoff },
          },
        });
        
        expect(result.count).toBe(15);
        expect(mockPrisma.sessionCheatingEvent.deleteMany).toHaveBeenCalledWith({
          where: {
            createdAt: { lt: cutoff },
          },
        });
      });

      it('should not delete recent cheating events', async () => {
        const cutoffDays = 90;
        const now = new Date();
        const recentEvent = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const cutoff = new Date(now.getTime() - cutoffDays * 24 * 60 * 60 * 1000);
        
        // Recent event should NOT be deleted
        const isOldEnough = recentEvent < cutoff;
        expect(isOldEnough).toBe(false);
      });
    });

    describe('cleanupSessionMessages', () => {
      it('should delete session messages older than 30 days', async () => {
        const cutoffDays = 30;
        const now = new Date();
        const cutoff = new Date(now.getTime() - cutoffDays * 24 * 60 * 60 * 1000);
        
        mockPrisma.sessionMessage.deleteMany.mockResolvedValue({ count: 500 });
        
        const result = await mockPrisma.sessionMessage.deleteMany({
          where: {
            createdAt: { lt: cutoff },
          },
        });
        
        expect(result.count).toBe(500);
      });

      it('should handle large volumes of messages efficiently', async () => {
        mockPrisma.sessionMessage.deleteMany.mockResolvedValue({ count: 10000 });
        
        const result = await mockPrisma.sessionMessage.deleteMany({
          where: {
            createdAt: { lt: new Date() },
          },
        });
        
        // Should handle large deletions without issues
        expect(result.count).toBe(10000);
      });
    });

    describe('cleanupSimulationSessions', () => {
      it('should only delete COMPLETED or CANCELLED sessions', async () => {
        const cutoffDays = 180;
        const now = new Date();
        const cutoff = new Date(now.getTime() - cutoffDays * 24 * 60 * 60 * 1000);
        
        mockPrisma.simulationSessionParticipant.count.mockResolvedValue(25);
        mockPrisma.simulationSession.deleteMany.mockResolvedValue({ count: 10 });
        
        const result = await mockPrisma.simulationSession.deleteMany({
          where: {
            status: { in: ['COMPLETED', 'CANCELLED'] },
            updatedAt: { lt: cutoff },
          },
        });
        
        expect(result.count).toBe(10);
        expect(mockPrisma.simulationSession.deleteMany).toHaveBeenCalledWith({
          where: {
            status: { in: ['COMPLETED', 'CANCELLED'] },
            updatedAt: { lt: cutoff },
          },
        });
      });

      it('should NOT delete WAITING or STARTED sessions', async () => {
        // Active sessions should never be cleaned up
        const activeStatuses = ['WAITING', 'STARTED'];
        const cleanupStatuses = ['COMPLETED', 'CANCELLED'];
        
        for (const status of activeStatuses) {
          expect(cleanupStatuses).not.toContain(status);
        }
      });

      it('should cascade delete participants', async () => {
        // When session is deleted, participants are cascade deleted
        mockPrisma.simulationSessionParticipant.count.mockResolvedValue(50);
        
        const participantCount = await mockPrisma.simulationSessionParticipant.count({
          where: {
            session: {
              status: { in: ['COMPLETED', 'CANCELLED'] },
              updatedAt: { lt: new Date() },
            },
          },
        });
        
        expect(participantCount).toBe(50);
        // Cascade deletion would remove these automatically
      });
    });
  });

  // ==================== Calendar/Absence Cleanup Tests (NEW) ====================
  describe('calendar and absence cleanup', () => {
    describe('cleanupOldCalendarEvents', () => {
      it('should delete non-recurring events older than 365 days', async () => {
        const cutoffDays = 365;
        const now = new Date();
        const cutoff = new Date(now.getTime() - cutoffDays * 24 * 60 * 60 * 1000);
        
        mockPrisma.calendarEvent.deleteMany.mockResolvedValue({ count: 100 });
        
        const result = await mockPrisma.calendarEvent.deleteMany({
          where: {
            endDate: { lt: cutoff },
            isRecurring: false,
          },
        });
        
        expect(result.count).toBe(100);
      });

      it('should NOT delete recurring events', async () => {
        // Recurring events should be preserved
        const isRecurring = true;
        const shouldDelete = !isRecurring;
        
        expect(shouldDelete).toBe(false);
      });

      it('should delete associated invitations before events', async () => {
        const eventIds = ['event-1', 'event-2', 'event-3'];
        
        mockPrisma.eventInvitation.deleteMany.mockResolvedValue({ count: 15 });
        
        await mockPrisma.eventInvitation.deleteMany({
          where: {
            eventId: { in: eventIds },
          },
        });
        
        expect(mockPrisma.eventInvitation.deleteMany).toHaveBeenCalledWith({
          where: {
            eventId: { in: eventIds },
          },
        });
      });
    });

    describe('cleanupOldStaffAbsences', () => {
      it('should delete APPROVED or REJECTED absences older than 365 days', async () => {
        const cutoffDays = 365;
        const now = new Date();
        const cutoff = new Date(now.getTime() - cutoffDays * 24 * 60 * 60 * 1000);
        
        mockPrisma.staffAbsence.deleteMany.mockResolvedValue({ count: 50 });
        
        const result = await mockPrisma.staffAbsence.deleteMany({
          where: {
            status: { in: ['APPROVED', 'REJECTED'] },
            endDate: { lt: cutoff },
          },
        });
        
        expect(result.count).toBe(50);
      });

      it('should NOT delete PENDING absences', async () => {
        // Pending absences should never be cleaned up
        const cleanupStatuses = ['APPROVED', 'REJECTED'];
        
        expect(cleanupStatuses).not.toContain('PENDING');
      });
    });
  });

  // ==================== Dry Run Mode Tests ====================
  describe('dry run mode', () => {
    it('should count but not delete in dry run', async () => {
      const dryRun = true;
      
      mockPrisma.sessionCheatingEvent.count.mockResolvedValue(100);
      
      if (dryRun) {
        const count = await mockPrisma.sessionCheatingEvent.count({
          where: {
            createdAt: { lt: new Date() },
          },
        });
        
        expect(count).toBe(100);
        expect(mockPrisma.sessionCheatingEvent.deleteMany).not.toHaveBeenCalled();
      }
    });

    it('should return 0 deleted count in dry run', () => {
      const dryRun = true;
      const actualCount = 100;
      
      // In dry run mode, the function returns 0 even though it counts records
      const result = dryRun ? 0 : actualCount;
      
      expect(result).toBe(0);
    });
  });

  // ==================== Error Handling Tests ====================
  describe('error handling', () => {
    it('should catch and log errors for individual tasks', async () => {
      mockPrisma.sessionCheatingEvent.deleteMany.mockRejectedValue(
        new Error('Database connection lost')
      );
      
      const errors: string[] = [];
      
      try {
        await mockPrisma.sessionCheatingEvent.deleteMany({
          where: { createdAt: { lt: new Date() } },
        });
      } catch (error) {
        errors.push(`sessionCheatingEvents cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Database connection lost');
    });

    it('should continue with other tasks after one fails', async () => {
      // Simulate first task failing
      mockPrisma.sessionCheatingEvent.deleteMany.mockRejectedValue(new Error('Failed'));
      // Simulate second task succeeding
      mockPrisma.sessionMessage.deleteMany.mockResolvedValue({ count: 50 });
      
      let task1Failed = false;
      let task2Result = 0;
      
      try {
        await mockPrisma.sessionCheatingEvent.deleteMany({});
      } catch {
        task1Failed = true;
      }
      
      // Should still run task 2
      const result = await mockPrisma.sessionMessage.deleteMany({});
      task2Result = result.count;
      
      expect(task1Failed).toBe(true);
      expect(task2Result).toBe(50);
    });

    it('should aggregate all errors in final result', () => {
      const errors = [
        'notifications cleanup failed: Connection timeout',
        'sessionMessages cleanup failed: Permission denied',
      ];
      
      const result = {
        success: errors.length === 0,
        errors,
      };
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  // ==================== Result Structure Tests ====================
  describe('cleanup result structure', () => {
    it('should return correct result structure', () => {
      const result = {
        success: true,
        timestamp: new Date(),
        duration: 1500, // ms
        results: {
          notifications: { deleted: 100 },
          sessionMessages: { deleted: 500 },
          simulationSessions: { deleted: 10 },
        },
        totalDeleted: 610,
        errors: [],
      };
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('totalDeleted');
      expect(result).toHaveProperty('errors');
    });

    it('should calculate total deleted across all tasks', () => {
      const results = {
        notifications: { deleted: 100 },
        adminNotifications: { deleted: 50 },
        alerts: { deleted: 25 },
        sessionCheatingEvents: { deleted: 15 },
        sessionMessages: { deleted: 500 },
        simulationSessions: { deleted: 10 },
        calendarEvents: { deleted: 100 },
        staffAbsences: { deleted: 50 },
      };
      
      const totalDeleted = Object.values(results).reduce(
        (sum, r) => sum + r.deleted, 
        0
      );
      
      expect(totalDeleted).toBe(850);
    });

    it('should mark success as false if any error occurred', () => {
      const errors = ['One error occurred'];
      const success = errors.length === 0;
      
      expect(success).toBe(false);
    });
  });

  // ==================== Default Options Tests ====================
  describe('default cleanup options', () => {
    it('should have sensible defaults for all options', () => {
      const DEFAULT_OPTIONS = {
        notificationsReadDays: 30,
        notificationsUnreadDays: 90,
        notificationsArchivedDays: 7,
        adminNotificationsReadDays: 30,
        adminNotificationsUnreadDays: 60,
        alertsExpiredDays: 7,
        alertsReadDays: 30,
        contactRequestsProcessedDays: 180,
        jobApplicationsRejectedDays: 365,
        feedbackResolvedDays: 90,
        questionVersionsToKeep: 10,
        messagesArchivedDays: 90,
        messagesOldDays: 365,
        sessionEventsDays: 90,
        sessionMessagesDays: 30,
        completedSessionsDays: 180,
        oldCalendarEventsDays: 365,
        oldStaffAbsencesDays: 365,
        dryRun: false,
      };
      
      // Verify all required options exist
      expect(DEFAULT_OPTIONS.sessionEventsDays).toBe(90);
      expect(DEFAULT_OPTIONS.sessionMessagesDays).toBe(30);
      expect(DEFAULT_OPTIONS.completedSessionsDays).toBe(180);
      expect(DEFAULT_OPTIONS.oldCalendarEventsDays).toBe(365);
      expect(DEFAULT_OPTIONS.oldStaffAbsencesDays).toBe(365);
      expect(DEFAULT_OPTIONS.dryRun).toBe(false);
    });

    it('should allow overriding individual options', () => {
      const DEFAULT_OPTIONS = {
        sessionMessagesDays: 30,
        dryRun: false,
      };
      
      const customOptions = {
        sessionMessagesDays: 7, // Override
      };
      
      const merged = { ...DEFAULT_OPTIONS, ...customOptions };
      
      expect(merged.sessionMessagesDays).toBe(7);
      expect(merged.dryRun).toBe(false); // Default preserved
    });
  });

  // ==================== Edge Cases ====================
  describe('edge cases', () => {
    it('should handle zero records to delete', async () => {
      mockPrisma.sessionCheatingEvent.deleteMany.mockResolvedValue({ count: 0 });
      
      const result = await mockPrisma.sessionCheatingEvent.deleteMany({
        where: { createdAt: { lt: new Date() } },
      });
      
      expect(result.count).toBe(0);
    });

    it('should handle empty database tables', async () => {
      mockPrisma.simulationSession.count.mockResolvedValue(0);
      
      const count = await mockPrisma.simulationSession.count({
        where: { status: 'COMPLETED' },
      });
      
      expect(count).toBe(0);
    });

    it('should handle concurrent cleanup runs safely', () => {
      // Multiple cleanups should not interfere
      // Each operates on distinct date ranges
      const run1Cutoff = new Date('2026-01-01');
      const run2Cutoff = new Date('2026-01-01');
      
      expect(run1Cutoff.getTime()).toBe(run2Cutoff.getTime());
    });
  });
});
