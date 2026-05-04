/**
 * Database Cleanup Service
 * 
 * This service handles periodic cleanup of old/unnecessary data to reduce database size and costs.
 * Should be called periodically via cron job (recommended: daily at night).
 * 
 * Usage:
 * - Via API: POST /api/cron/cleanup (with secret key)
 * - Via script: pnpm run cleanup
 */

import type { PrismaClient } from '@prisma/client';

export interface CleanupResult {
  success: boolean;
  timestamp: Date;
  duration: number; // milliseconds
  results: {
    [key: string]: {
      deleted: number;
      error?: string;
    };
  };
  totalDeleted: number;
  errors: string[];
}

export interface CleanupOptions {
  // Notifications
  notificationsReadDays?: number;      // Default: 30 - Delete read notifications older than X days
  notificationsUnreadDays?: number;    // Default: 90 - Delete unread notifications older than X days
  notificationsArchivedDays?: number;  // Default: 7 - Delete archived notifications older than X days
  
  // Admin Notifications (legacy)
  adminNotificationsReadDays?: number;  // Default: 30
  adminNotificationsUnreadDays?: number; // Default: 60
  
  // Alerts
  alertsExpiredDays?: number;           // Default: 7 - Delete expired alerts
  alertsReadDays?: number;              // Default: 30 - Delete read alerts
  
  // Contact Requests & Job Applications
  contactRequestsProcessedDays?: number; // Default: 180 - Delete processed requests
  jobApplicationsRejectedDays?: number;  // Default: 365 - Delete rejected applications
  
  // Question Feedback
  feedbackResolvedDays?: number;        // Default: 90 - Delete resolved feedback
  
  // Question Versions (keep last N per question)
  questionVersionsToKeep?: number;      // Default: 10 - Keep last N versions per question
  
  // Messages
  messagesArchivedDays?: number;        // Default: 90 - Delete archived conversations older than X days
  messagesOldDays?: number;             // Default: 365 - Delete all conversations older than X days
  
  // Session data (Virtual Room - these can grow fast!)
  sessionEventsDays?: number;           // Default: 90 - Delete cheating events after X days
  sessionMessagesDays?: number;         // Default: 30 - Delete session messages after X days
  completedSessionsDays?: number;       // Default: 180 - Delete completed/cancelled sessions after X days
  
  // Calendar & Events
  oldCalendarEventsDays?: number;       // Default: 365 - Delete old non-recurring events
  oldStaffAbsencesDays?: number;        // Default: 365 - Delete old confirmed/rejected absences
  
  // Dry run mode (log but don't delete)
  dryRun?: boolean;
}

const DEFAULT_OPTIONS: Required<CleanupOptions> = {
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
  // Session data (Virtual Room) - cleanup more aggressively as this grows fast
  sessionEventsDays: 90,
  sessionMessagesDays: 30,
  completedSessionsDays: 180,
  // Calendar & Events
  oldCalendarEventsDays: 365,
  oldStaffAbsencesDays: 365,
  dryRun: false,
};

// Type for cleanup task functions
type CleanupTaskFn = (prisma: PrismaClient, opts: Required<CleanupOptions>) => Promise<number>;

// Define all cleanup tasks with their names and functions
interface CleanupTask {
  name: string;
  fn: CleanupTaskFn;
}

const CLEANUP_TASKS: CleanupTask[] = [
  { name: 'notifications', fn: cleanupNotifications },
  { name: 'adminNotifications', fn: cleanupAdminNotifications },
  { name: 'alerts', fn: cleanupAlerts },
  { name: 'contactRequests', fn: cleanupContactRequests },
  { name: 'jobApplications', fn: cleanupJobApplications },
  { name: 'questionFeedback', fn: cleanupQuestionFeedback },
  { name: 'questionVersions', fn: cleanupQuestionVersions },
  { name: 'messages', fn: cleanupMessages },
  { name: 'sessionCheatingEvents', fn: cleanupSessionCheatingEvents },
  { name: 'sessionMessages', fn: cleanupSessionMessages },
  { name: 'simulationSessions', fn: cleanupSimulationSessions },
  { name: 'calendarEvents', fn: cleanupOldCalendarEvents },
  { name: 'staffAbsences', fn: cleanupOldStaffAbsences },
];

/**
 * Execute a single cleanup task with error handling
 */
async function executeCleanupTask(
  task: CleanupTask,
  prisma: PrismaClient,
  opts: Required<CleanupOptions>,
  results: CleanupResult['results'],
  errors: string[]
): Promise<number> {
  try {
    const count = await task.fn(prisma, opts);
    results[task.name] = { deleted: count };
    return count;
  } catch (error) {
    const msg = `${task.name} cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    errors.push(msg);
    results[task.name] = { deleted: 0, error: msg };
    return 0;
  }
}

/**
 * Run all cleanup tasks
 */
export async function runCleanup(
  prisma: PrismaClient,
  options?: CleanupOptions
): Promise<CleanupResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: CleanupResult['results'] = {};
  const errors: string[] = [];
  let totalDeleted = 0;

  console.log(`[Cleanup] Starting database cleanup at ${new Date().toISOString()}`);
  if (opts.dryRun) {
    console.log('[Cleanup] DRY RUN MODE - No data will be deleted');
  }

  // Execute all cleanup tasks sequentially
  for (const task of CLEANUP_TASKS) {
    const count = await executeCleanupTask(task, prisma, opts, results, errors);
    totalDeleted += count;
  }

  const duration = Date.now() - startTime;
  console.log(`[Cleanup] Completed in ${duration}ms. Total deleted: ${totalDeleted}`);

  return {
    success: errors.length === 0,
    timestamp: new Date(),
    duration,
    results,
    totalDeleted,
    errors,
  };
}

// ==================== Individual Cleanup Functions ====================

async function cleanupNotifications(
  prisma: PrismaClient,
  opts: Required<CleanupOptions>
): Promise<number> {
  const now = new Date();
  const readCutoff = new Date(now.getTime() - opts.notificationsReadDays * 24 * 60 * 60 * 1000);
  const unreadCutoff = new Date(now.getTime() - opts.notificationsUnreadDays * 24 * 60 * 60 * 1000);
  const archivedCutoff = new Date(now.getTime() - opts.notificationsArchivedDays * 24 * 60 * 60 * 1000);

  if (opts.dryRun) {
    const count = await prisma.notification.count({
      where: {
        OR: [
          { isRead: true, isArchived: false, createdAt: { lt: readCutoff } },
          { isRead: false, isArchived: false, createdAt: { lt: unreadCutoff } },
          { isArchived: true, createdAt: { lt: archivedCutoff } },
        ],
      },
    });
    console.log(`[Cleanup] Would delete ${count} notifications`);
    return 0;
  }

  const result = await prisma.notification.deleteMany({
    where: {
      OR: [
        { isRead: true, isArchived: false, createdAt: { lt: readCutoff } },
        { isRead: false, isArchived: false, createdAt: { lt: unreadCutoff } },
        { isArchived: true, createdAt: { lt: archivedCutoff } },
      ],
    },
  });

  console.log(`[Cleanup] Deleted ${result.count} notifications`);
  return result.count;
}

async function cleanupAdminNotifications(
  prisma: PrismaClient,
  opts: Required<CleanupOptions>
): Promise<number> {
  // AdminNotification is a legacy model that uses JSON for read status.
  // We simply delete old notifications based on creation date.
  const cutoff = new Date(Date.now() - opts.adminNotificationsUnreadDays * 24 * 60 * 60 * 1000);

  if (opts.dryRun) {
    const count = await prisma.adminNotification.count({
      where: {
        createdAt: { lt: cutoff },
      },
    });
    console.log(`[Cleanup] Would delete ${count} admin notifications`);
    return 0;
  }

  const result = await prisma.adminNotification.deleteMany({
    where: {
      createdAt: { lt: cutoff },
    },
  });

  console.log(`[Cleanup] Deleted ${result.count} admin notifications`);
  return result.count;
}

async function cleanupAlerts(
  prisma: PrismaClient,
  opts: Required<CleanupOptions>
): Promise<number> {
  const now = new Date();
  const expiredCutoff = new Date(now.getTime() - opts.alertsExpiredDays * 24 * 60 * 60 * 1000);
  const readCutoff = new Date(now.getTime() - opts.alertsReadDays * 24 * 60 * 60 * 1000);

  if (opts.dryRun) {
    const count = await prisma.alert.count({
      where: {
        OR: [
          { expiresAt: { lt: expiredCutoff } },
          { isRead: true, createdAt: { lt: readCutoff } },
        ],
      },
    });
    console.log(`[Cleanup] Would delete ${count} alerts`);
    return 0;
  }

  const result = await prisma.alert.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: expiredCutoff } },
        { isRead: true, createdAt: { lt: readCutoff } },
      ],
    },
  });

  console.log(`[Cleanup] Deleted ${result.count} alerts`);
  return result.count;
}

async function cleanupContactRequests(
  prisma: PrismaClient,
  opts: Required<CleanupOptions>
): Promise<number> {
  const cutoff = new Date(Date.now() - opts.contactRequestsProcessedDays * 24 * 60 * 60 * 1000);

  if (opts.dryRun) {
    const count = await prisma.contactRequest.count({
      where: {
        status: { in: ['REPLIED', 'ARCHIVED'] },
        createdAt: { lt: cutoff },
      },
    });
    console.log(`[Cleanup] Would delete ${count} contact requests`);
    return 0;
  }

  const result = await prisma.contactRequest.deleteMany({
    where: {
      status: { in: ['REPLIED', 'ARCHIVED'] },
      createdAt: { lt: cutoff },
    },
  });

  console.log(`[Cleanup] Deleted ${result.count} contact requests`);
  return result.count;
}

async function cleanupJobApplications(
  prisma: PrismaClient,
  opts: Required<CleanupOptions>
): Promise<number> {
  const cutoff = new Date(Date.now() - opts.jobApplicationsRejectedDays * 24 * 60 * 60 * 1000);

  if (opts.dryRun) {
    const count = await prisma.jobApplication.count({
      where: {
        status: 'REJECTED',
        createdAt: { lt: cutoff },
      },
    });
    console.log(`[Cleanup] Would delete ${count} job applications`);
    return 0;
  }

  const result = await prisma.jobApplication.deleteMany({
    where: {
      status: 'REJECTED',
      createdAt: { lt: cutoff },
    },
  });

  console.log(`[Cleanup] Deleted ${result.count} job applications`);
  return result.count;
}

async function cleanupQuestionFeedback(
  prisma: PrismaClient,
  opts: Required<CleanupOptions>
): Promise<number> {
  const cutoff = new Date(Date.now() - opts.feedbackResolvedDays * 24 * 60 * 60 * 1000);

  if (opts.dryRun) {
    const count = await prisma.questionFeedback.count({
      where: {
        status: { in: ['FIXED', 'REJECTED'] },
        createdAt: { lt: cutoff },
      },
    });
    console.log(`[Cleanup] Would delete ${count} question feedbacks`);
    return 0;
  }

  const result = await prisma.questionFeedback.deleteMany({
    where: {
      status: { in: ['FIXED', 'REJECTED'] },
      createdAt: { lt: cutoff },
    },
  });

  console.log(`[Cleanup] Deleted ${result.count} question feedbacks`);
  return result.count;
}

async function cleanupQuestionVersions(
  prisma: PrismaClient,
  opts: Required<CleanupOptions>
): Promise<number> {
  // This is more complex - we need to keep the last N versions per question
  // First, get all questions with more than N versions
  const questionsWithManyVersions = await prisma.questionVersion.groupBy({
    by: ['questionId'],
    _count: { questionId: true },
    having: {
      questionId: {
        _count: { gt: opts.questionVersionsToKeep },
      },
    },
  });

  if (questionsWithManyVersions.length === 0) {
    console.log('[Cleanup] No question versions to clean up');
    return 0;
  }

  let totalDeleted = 0;

  for (const { questionId } of questionsWithManyVersions) {
    // Get the IDs of versions to keep (most recent N)
    const versionsToKeep = await prisma.questionVersion.findMany({
      where: { questionId },
      orderBy: { version: 'desc' },
      take: opts.questionVersionsToKeep,
      select: { id: true },
    });

    const keepIds = versionsToKeep.map(v => v.id);

    if (opts.dryRun) {
      const count = await prisma.questionVersion.count({
        where: {
          questionId,
          id: { notIn: keepIds },
        },
      });
      console.log(`[Cleanup] Would delete ${count} versions for question ${questionId}`);
      continue;
    }

    const result = await prisma.questionVersion.deleteMany({
      where: {
        questionId,
        id: { notIn: keepIds },
      },
    });

    totalDeleted += result.count;
  }

  console.log(`[Cleanup] Deleted ${totalDeleted} question versions`);
  return totalDeleted;
}

/**
 * Clean up old messages and conversations
 * - Archived conversations older than X days
 * - All conversations older than Y days (regardless of archive status)
 */
async function cleanupMessages(
  prisma: PrismaClient,
  opts: Required<CleanupOptions>
): Promise<number> {
  const now = new Date();
  const archivedCutoff = new Date(now.getTime() - opts.messagesArchivedDays * 24 * 60 * 60 * 1000);
  const oldCutoff = new Date(now.getTime() - opts.messagesOldDays * 24 * 60 * 60 * 1000);

  // Find conversations to delete:
  // 1. Archived conversations older than messagesArchivedDays
  // 2. Any conversations older than messagesOldDays
  const conversationsToDelete = await prisma.conversation.findMany({
    where: {
      OR: [
        // Archived and old enough
        {
          participants: {
            every: {
              isArchived: true,
            },
          },
          updatedAt: { lt: archivedCutoff },
        },
        // Very old (regardless of archive status) - based on last activity
        {
          updatedAt: { lt: oldCutoff },
        },
      ],
    },
    select: { id: true },
  });

  if (conversationsToDelete.length === 0) {
    console.log('[Cleanup] No messages/conversations to clean up');
    return 0;
  }

  const conversationIds = conversationsToDelete.map(c => c.id);

  if (opts.dryRun) {
    const messageCount = await prisma.message.count({
      where: { conversationId: { in: conversationIds } },
    });
    console.log(`[Cleanup] Would delete ${conversationIds.length} conversations with ${messageCount} messages`);
    return 0;
  }

  // Delete in transaction: messages first, then participants, then conversations
  const result = await prisma.$transaction(async (tx) => {
    // Delete messages
    const deletedMessages = await tx.message.deleteMany({
      where: { conversationId: { in: conversationIds } },
    });

    // Delete conversation participants
    await tx.conversationParticipant.deleteMany({
      where: { conversationId: { in: conversationIds } },
    });

    // Delete conversations
    await tx.conversation.deleteMany({
      where: { id: { in: conversationIds } },
    });

    return deletedMessages.count;
  });

  console.log(`[Cleanup] Deleted ${conversationIds.length} conversations with ${result} messages`);
  return result;
}

/**
 * Clean up session cheating events from completed sessions
 * These can grow very fast during simulations
 */
async function cleanupSessionCheatingEvents(
  prisma: PrismaClient,
  opts: Required<CleanupOptions>
): Promise<number> {
  const cutoff = new Date(Date.now() - opts.sessionEventsDays * 24 * 60 * 60 * 1000);

  if (opts.dryRun) {
    const count = await prisma.sessionCheatingEvent.count({
      where: {
        createdAt: { lt: cutoff },
      },
    });
    console.log(`[Cleanup] Would delete ${count} session cheating events`);
    return 0;
  }

  const result = await prisma.sessionCheatingEvent.deleteMany({
    where: {
      createdAt: { lt: cutoff },
    },
  });

  console.log(`[Cleanup] Deleted ${result.count} session cheating events`);
  return result.count;
}

/**
 * Clean up session messages from Virtual Room
 * These are transient messages during simulation and can be cleaned up quickly
 */
async function cleanupSessionMessages(
  prisma: PrismaClient,
  opts: Required<CleanupOptions>
): Promise<number> {
  const cutoff = new Date(Date.now() - opts.sessionMessagesDays * 24 * 60 * 60 * 1000);

  if (opts.dryRun) {
    const count = await prisma.sessionMessage.count({
      where: {
        createdAt: { lt: cutoff },
      },
    });
    console.log(`[Cleanup] Would delete ${count} session messages`);
    return 0;
  }

  const result = await prisma.sessionMessage.deleteMany({
    where: {
      createdAt: { lt: cutoff },
    },
  });

  console.log(`[Cleanup] Deleted ${result.count} session messages`);
  return result.count;
}

/**
 * Clean up completed/cancelled simulation sessions
 * The participants and related data cascade delete
 */
async function cleanupSimulationSessions(
  prisma: PrismaClient,
  opts: Required<CleanupOptions>
): Promise<number> {
  const cutoff = new Date(Date.now() - opts.completedSessionsDays * 24 * 60 * 60 * 1000);

  if (opts.dryRun) {
    const count = await prisma.simulationSession.count({
      where: {
        status: { in: ['COMPLETED', 'CANCELLED'] },
        updatedAt: { lt: cutoff },
      },
    });
    console.log(`[Cleanup] Would delete ${count} simulation sessions`);
    return 0;
  }

  // First count participants that will be deleted (for logging)
  const participantCount = await prisma.simulationSessionParticipant.count({
    where: {
      session: {
        status: { in: ['COMPLETED', 'CANCELLED'] },
        updatedAt: { lt: cutoff },
      },
    },
  });

  const result = await prisma.simulationSession.deleteMany({
    where: {
      status: { in: ['COMPLETED', 'CANCELLED'] },
      updatedAt: { lt: cutoff },
    },
  });

  console.log(`[Cleanup] Deleted ${result.count} simulation sessions (${participantCount} participants cascaded)`);
  return result.count;
}

/**
 * Clean up old calendar events that are past and not recurring
 * Keeps recurring parent events but cleans up old single events
 */
async function cleanupOldCalendarEvents(
  prisma: PrismaClient,
  opts: Required<CleanupOptions>
): Promise<number> {
  const cutoff = new Date(Date.now() - opts.oldCalendarEventsDays * 24 * 60 * 60 * 1000);

  if (opts.dryRun) {
    const count = await prisma.calendarEvent.count({
      where: {
        endDate: { lt: cutoff },
        isRecurring: false,
        parentEventId: null, // Not a child of recurring event
        simulation: null, // Not linked to a simulation (those should be kept longer)
      },
    });
    console.log(`[Cleanup] Would delete ${count} old calendar events`);
    return 0;
  }

  // Delete invitations first (cascade should handle this, but be explicit)
  await prisma.eventInvitation.deleteMany({
    where: {
      event: {
        endDate: { lt: cutoff },
        isRecurring: false,
        parentEventId: null,
        simulation: null,
      },
    },
  });

  const result = await prisma.calendarEvent.deleteMany({
    where: {
      endDate: { lt: cutoff },
      isRecurring: false,
      parentEventId: null,
      simulation: null,
    },
  });

  console.log(`[Cleanup] Deleted ${result.count} old calendar events`);
  return result.count;
}

/**
 * Clean up old staff absences that have been resolved
 */
async function cleanupOldStaffAbsences(
  prisma: PrismaClient,
  opts: Required<CleanupOptions>
): Promise<number> {
  const cutoff = new Date(Date.now() - opts.oldStaffAbsencesDays * 24 * 60 * 60 * 1000);

  if (opts.dryRun) {
    const count = await prisma.staffAbsence.count({
      where: {
        status: { in: ['CONFIRMED', 'REJECTED', 'CANCELLED'] },
        endDate: { lt: cutoff },
      },
    });
    console.log(`[Cleanup] Would delete ${count} old staff absences`);
    return 0;
  }

  const result = await prisma.staffAbsence.deleteMany({
    where: {
      status: { in: ['CONFIRMED', 'REJECTED', 'CANCELLED'] },
      endDate: { lt: cutoff },
    },
  });

  console.log(`[Cleanup] Deleted ${result.count} old staff absences`);
  return result.count;
}

// ==================== Utility Functions ====================

/**
 * Get database size statistics (for monitoring)
 */
export async function getDatabaseStats(prisma: PrismaClient): Promise<{
  tableCounts: Record<string, number>;
  estimatedCleanable: Record<string, number>;
}> {
  const [
    notifications,
    adminNotifications,
    alerts,
    contactRequests,
    jobApplications,
    questionFeedback,
    questionVersions,
    messages,
    simulationResults,
    sessionCheatingEvents,
    sessionMessages,
    simulationSessions,
    calendarEvents,
    staffAbsences,
  ] = await Promise.all([
    prisma.notification.count(),
    prisma.adminNotification.count(),
    prisma.alert.count(),
    prisma.contactRequest.count(),
    prisma.jobApplication.count(),
    prisma.questionFeedback.count(),
    prisma.questionVersion.count(),
    prisma.message.count(),
    prisma.simulationResult.count(),
    prisma.sessionCheatingEvent.count(),
    prisma.sessionMessage.count(),
    prisma.simulationSession.count(),
    prisma.calendarEvent.count(),
    prisma.staffAbsence.count(),
  ]);

  // Estimate cleanable (items that match default cleanup criteria)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const oneHundredEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const [
    cleanableNotifications,
    cleanableAdminNotifications,
    cleanableAlerts,
    cleanableContactRequests,
    cleanableFeedback,
    cleanableSessionEvents,
    cleanableSessionMessages,
    cleanableSessions,
    cleanableCalendarEvents,
    cleanableAbsences,
  ] = await Promise.all([
    prisma.notification.count({
      where: {
        OR: [
          { isRead: true, createdAt: { lt: thirtyDaysAgo } },
          { isRead: false, createdAt: { lt: ninetyDaysAgo } },
        ],
      },
    }),
    prisma.adminNotification.count({
      where: {
        createdAt: { lt: ninetyDaysAgo },
      },
    }),
    prisma.alert.count({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { isRead: true, createdAt: { lt: thirtyDaysAgo } },
        ],
      },
    }),
    prisma.contactRequest.count({
      where: {
        status: { in: ['REPLIED', 'ARCHIVED'] },
        createdAt: { lt: ninetyDaysAgo },
      },
    }),
    prisma.questionFeedback.count({
      where: {
        status: { in: ['FIXED', 'REJECTED'] },
        createdAt: { lt: ninetyDaysAgo },
      },
    }),
    prisma.sessionCheatingEvent.count({
      where: {
        createdAt: { lt: ninetyDaysAgo },
      },
    }),
    prisma.sessionMessage.count({
      where: {
        createdAt: { lt: thirtyDaysAgo },
      },
    }),
    prisma.simulationSession.count({
      where: {
        status: { in: ['COMPLETED', 'CANCELLED'] },
        updatedAt: { lt: oneHundredEightyDaysAgo },
      },
    }),
    prisma.calendarEvent.count({
      where: {
        endDate: { lt: oneYearAgo },
        isRecurring: false,
        parentEventId: null,
        simulation: null,
      },
    }),
    prisma.staffAbsence.count({
      where: {
        status: { in: ['CONFIRMED', 'REJECTED', 'CANCELLED'] },
        endDate: { lt: oneYearAgo },
      },
    }),
  ]);

  return {
    tableCounts: {
      notifications,
      adminNotifications,
      alerts,
      contactRequests,
      jobApplications,
      questionFeedback,
      questionVersions,
      messages,
      simulationResults,
      sessionCheatingEvents,
      sessionMessages,
      simulationSessions,
      calendarEvents,
      staffAbsences,
    },
    estimatedCleanable: {
      notifications: cleanableNotifications,
      adminNotifications: cleanableAdminNotifications,
      alerts: cleanableAlerts,
      contactRequests: cleanableContactRequests,
      questionFeedback: cleanableFeedback,
      sessionCheatingEvents: cleanableSessionEvents,
      sessionMessages: cleanableSessionMessages,
      simulationSessions: cleanableSessions,
      calendarEvents: cleanableCalendarEvents,
      staffAbsences: cleanableAbsences,
    },
  };
}
