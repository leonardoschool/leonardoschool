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
  dryRun: false,
};

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

  // 1. Clean up Notifications
  try {
    const count = await cleanupNotifications(prisma, opts);
    results.notifications = { deleted: count };
    totalDeleted += count;
  } catch (error) {
    const msg = `Notifications cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    errors.push(msg);
    results.notifications = { deleted: 0, error: msg };
  }

  // 2. Clean up Admin Notifications (legacy)
  try {
    const count = await cleanupAdminNotifications(prisma, opts);
    results.adminNotifications = { deleted: count };
    totalDeleted += count;
  } catch (error) {
    const msg = `AdminNotifications cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    errors.push(msg);
    results.adminNotifications = { deleted: 0, error: msg };
  }

  // 3. Clean up Alerts
  try {
    const count = await cleanupAlerts(prisma, opts);
    results.alerts = { deleted: count };
    totalDeleted += count;
  } catch (error) {
    const msg = `Alerts cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    errors.push(msg);
    results.alerts = { deleted: 0, error: msg };
  }

  // 4. Clean up Contact Requests
  try {
    const count = await cleanupContactRequests(prisma, opts);
    results.contactRequests = { deleted: count };
    totalDeleted += count;
  } catch (error) {
    const msg = `ContactRequests cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    errors.push(msg);
    results.contactRequests = { deleted: 0, error: msg };
  }

  // 5. Clean up Job Applications
  try {
    const count = await cleanupJobApplications(prisma, opts);
    results.jobApplications = { deleted: count };
    totalDeleted += count;
  } catch (error) {
    const msg = `JobApplications cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    errors.push(msg);
    results.jobApplications = { deleted: 0, error: msg };
  }

  // 6. Clean up Question Feedback
  try {
    const count = await cleanupQuestionFeedback(prisma, opts);
    results.questionFeedback = { deleted: count };
    totalDeleted += count;
  } catch (error) {
    const msg = `QuestionFeedback cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    errors.push(msg);
    results.questionFeedback = { deleted: 0, error: msg };
  }

  // 7. Clean up Question Versions (keep last N)
  try {
    const count = await cleanupQuestionVersions(prisma, opts);
    results.questionVersions = { deleted: count };
    totalDeleted += count;
  } catch (error) {
    const msg = `QuestionVersions cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    errors.push(msg);
    results.questionVersions = { deleted: 0, error: msg };
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
  ]);

  // Estimate cleanable (items that match default cleanup criteria)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [
    cleanableNotifications,
    cleanableAdminNotifications,
    cleanableAlerts,
    cleanableContactRequests,
    cleanableFeedback,
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
    },
    estimatedCleanable: {
      notifications: cleanableNotifications,
      adminNotifications: cleanableAdminNotifications,
      alerts: cleanableAlerts,
      contactRequests: cleanableContactRequests,
      questionFeedback: cleanableFeedback,
    },
  };
}
