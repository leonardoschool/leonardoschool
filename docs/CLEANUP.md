# Database Cleanup System

This document describes the database cleanup system used to reduce storage costs on Neon PostgreSQL.

## Overview

The cleanup system automatically removes old/unnecessary data from the database to:
- Reduce storage costs on Neon PostgreSQL
- Improve query performance
- Stay within Neon's free tier limits (or minimize paid tier costs)

## Cron Jobs Configuration

Configured in `vercel.json`:

| Endpoint | Schedule | Description |
|----------|----------|-------------|
| `/api/cron/cleanup` | `0 3 * * *` (3:00 AM daily) | Database cleanup |
| `/api/cron/check-expired-contracts` | `0 0 * * *` (midnight daily) | Mark expired contracts |
| `/api/cron/close-simulations` | `*/15 * * * *` (every 15 min) | Close expired simulations |

**⚠️ Important**: Add `CRON_SECRET` to your Vercel environment variables.

## Data Retention Policies

### High-Volume Tables (Aggressive Cleanup)

| Table | Retention | Notes |
|-------|-----------|-------|
| **SessionCheatingEvent** | 90 days | Virtual room anti-cheat logs |
| **SessionMessage** | 30 days | Virtual room chat messages |
| **Notification** (read) | 30 days | Read notifications |
| **Notification** (unread) | 90 days | Unread notifications |
| **Notification** (archived) | 7 days | Archived notifications |
| **Alert** (read) | 30 days | Read alerts |
| **Alert** (expired) | 7 days | Past expiration date |

### Medium-Volume Tables

| Table | Retention | Notes |
|-------|-----------|-------|
| **SimulationSession** | 180 days | Completed/cancelled sessions |
| **Message/Conversation** (archived) | 90 days | Archived conversations |
| **Message/Conversation** (all) | 365 days | All old conversations |
| **QuestionFeedback** | 90 days | Resolved (FIXED/REJECTED) feedback |
| **AdminNotification** | 60 days | Legacy admin notifications |

### Low-Volume Tables

| Table | Retention | Notes |
|-------|-----------|-------|
| **CalendarEvent** | 365 days | Non-recurring past events |
| **StaffAbsence** | 365 days | Confirmed/rejected/cancelled |
| **ContactRequest** | 180 days | Replied/archived requests |
| **JobApplication** | 365 days | Rejected applications |
| **QuestionVersion** | Keep last 10 | Per-question version history |

### ⚠️ Data NOT Deleted (Critical/Legal)

| Table | Reason |
|-------|--------|
| **SimulationResult** | Official test results for rankings |
| **Attendance** | Legal attendance records |
| **Contract** | Legal binding documents |
| **User/Student/Collaborator** | Account data |
| **Question/QuestionAnswer** | Educational content |

## Manual Usage

### Check Database Stats
```bash
pnpm cleanup:stats
```

### Preview Cleanup (Dry Run)
```bash
pnpm cleanup:dry
```

### Run Cleanup
```bash
pnpm cleanup
```

### Custom Retention via API
```bash
curl -X POST https://your-app.vercel.app/api/cron/cleanup \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "notificationsReadDays": 15,
    "sessionMessagesDays": 7
  }'
```

## Configuration Options

All options can be passed to the cleanup API:

```typescript
interface CleanupOptions {
  // Notifications
  notificationsReadDays?: number;      // Default: 30
  notificationsUnreadDays?: number;    // Default: 90
  notificationsArchivedDays?: number;  // Default: 7
  
  // Admin Notifications (legacy)
  adminNotificationsReadDays?: number;  // Default: 30
  adminNotificationsUnreadDays?: number; // Default: 60
  
  // Alerts
  alertsExpiredDays?: number;           // Default: 7
  alertsReadDays?: number;              // Default: 30
  
  // Contact Requests & Job Applications
  contactRequestsProcessedDays?: number; // Default: 180
  jobApplicationsRejectedDays?: number;  // Default: 365
  
  // Question Feedback
  feedbackResolvedDays?: number;        // Default: 90
  
  // Question Versions
  questionVersionsToKeep?: number;      // Default: 10
  
  // Messages
  messagesArchivedDays?: number;        // Default: 90
  messagesOldDays?: number;             // Default: 365
  
  // Session data (Virtual Room)
  sessionEventsDays?: number;           // Default: 90
  sessionMessagesDays?: number;         // Default: 30
  completedSessionsDays?: number;       // Default: 180
  
  // Calendar & Events
  oldCalendarEventsDays?: number;       // Default: 365
  oldStaffAbsencesDays?: number;        // Default: 365
  
  // Dry run mode
  dryRun?: boolean;                     // Default: false
}
```

## Monitoring

The cleanup job logs are available in Vercel Functions logs. Each run outputs:
- Total records deleted per table
- Duration
- Any errors encountered

Example output:
```
[Cleanup] Starting database cleanup at 2025-01-28T03:00:00.000Z
[Cleanup] Deleted 45 notifications
[Cleanup] Deleted 12 session messages
[Cleanup] Deleted 3 simulation sessions (8 participants cascaded)
[Cleanup] Completed in 1234ms. Total deleted: 60
```

## Neon-Specific Considerations

1. **Compute Auto-suspend**: Neon suspends compute after inactivity. The cron job will wake it up.
2. **Storage Billing**: Neon charges for storage per GB/month. Regular cleanup helps stay in free tier.
3. **Connection Limits**: Cleanup runs sequentially to avoid connection pool exhaustion.

## Adding New Cleanup Tasks

1. Add new options to `CleanupOptions` interface
2. Add defaults to `DEFAULT_OPTIONS`
3. Create a new cleanup function following the pattern
4. Add to `CLEANUP_TASKS` array
5. Update `getDatabaseStats` if needed
6. Update this documentation

## Troubleshooting

### Cleanup Not Running
1. Check `CRON_SECRET` is set in Vercel environment
2. Verify cron is configured in `vercel.json`
3. Check Vercel Functions logs for errors

### Too Much Data Being Deleted
Use `dryRun: true` first to preview changes:
```bash
curl -X POST .../api/cron/cleanup \
  -H "Authorization: Bearer ..." \
  -d '{"dryRun": true}'
```

### Cleanup Taking Too Long
The cleanup runs sequentially. If timing out:
1. Reduce retention periods to catch up initially
2. Consider running more frequently (twice daily)
3. Check for missing indexes on `createdAt` columns
