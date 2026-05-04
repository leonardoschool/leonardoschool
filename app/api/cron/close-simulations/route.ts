/**
 * Auto-Close Simulation Assignments Cron Endpoint
 *
 * Closes simulation ASSIGNMENTS (not templates) when:
 * 1. The assignment's endDate has passed
 * 2. All targeted students have completed it (for non-repeatable simulations)
 *
 * POST /api/cron/close-simulations
 * Headers: { "Authorization": "Bearer YOUR_CRON_SECRET" }
 * Body (optional): { "dryRun": true }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET not configured');
    return false;
  }
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  return token === cronSecret;
}

interface CloseAssignmentsOptions {
  dryRun?: boolean;
}

interface CloseAssignmentsResult {
  success: boolean;
  closedByDate: number;
  closedByCompletion: number;
  totalClosed: number;
  errors: string[];
  assignmentsClosed: string[];
}

type AssignmentWithTarget = {
  id: string;
  studentId: string | null;
  groupId: string | null;
  simulationId: string;
  simulation: { id: string; title: string };
  student: { id: string; user: { name: string } } | null;
  group: { id: string; name: string; members: { studentId: string }[] } | null;
};

function resolveAssignmentStudents(assignment: AssignmentWithTarget): {
  studentIds: string[];
  targetName: string;
} {
  if (assignment.studentId) {
    return {
      studentIds: [assignment.studentId],
      targetName: assignment.student?.user?.name ?? 'Student',
    };
  }
  if (assignment.groupId && assignment.group) {
    return {
      studentIds: assignment.group.members.map((m) => m.studentId),
      targetName: assignment.group.name,
    };
  }
  return { studentIds: [], targetName: 'Unknown' };
}

async function closeByExpirationDate(
  dryRun: boolean,
  result: CloseAssignmentsResult,
  now: Date
): Promise<void> {
  const expiredAssignments = await prisma.simulationAssignment.findMany({
    where: { status: 'ACTIVE', endDate: { not: null, lt: now } },
    select: {
      id: true,
      endDate: true,
      student: { select: { id: true, user: { select: { name: true } } } },
      group: { select: { id: true, name: true } },
      simulation: { select: { id: true, title: true } },
    },
  });

  console.log(`[CloseAssignments] Found ${expiredAssignments.length} assignments with expired endDate`);

  for (const assignment of expiredAssignments) {
    try {
      const targetName = assignment.student?.user?.name ?? assignment.group?.name ?? 'Unknown';
      if (!dryRun) {
        await prisma.simulationAssignment.update({
          where: { id: assignment.id },
          data: { status: 'CLOSED' },
        });
      }
      result.closedByDate++;
      result.assignmentsClosed.push(
        `${assignment.simulation.title} → ${targetName} (scaduta: ${assignment.endDate?.toISOString()})`
      );
      console.log(
        `[CloseAssignments] ${dryRun ? '[DRY RUN] Would close' : 'Closed'} "${assignment.simulation.title}" for ${targetName} - expired at ${assignment.endDate?.toISOString()}`
      );
    } catch (error) {
      const errorMsg = `Failed to close assignment ${assignment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      console.error(`[CloseAssignments] ${errorMsg}`);
    }
  }
}

async function closeByCompletion(dryRun: boolean, result: CloseAssignmentsResult): Promise<void> {
  const activeAssignments = await prisma.simulationAssignment.findMany({
    where: {
      status: 'ACTIVE',
      simulation: { isRepeatable: false, status: 'PUBLISHED' },
    },
    include: {
      simulation: { select: { id: true, title: true } },
      student: { select: { id: true, user: { select: { name: true } } } },
      group: {
        select: {
          id: true,
          name: true,
          members: { select: { studentId: true } },
        },
      },
    },
  });

  console.log(`[CloseAssignments] Checking ${activeAssignments.length} active assignments for completion`);

  for (const assignment of activeAssignments) {
    try {
      const { studentIds, targetName } = resolveAssignmentStudents(assignment);
      if (studentIds.length === 0) continue;

      const completedResults = await prisma.simulationResult.findMany({
        where: {
          simulationId: assignment.simulationId,
          studentId: { in: studentIds },
          completedAt: { not: null },
        },
        select: { studentId: true },
      });

      const completedSet = new Set(completedResults.map((r) => r.studentId));
      const allCompleted = studentIds.every((id) => completedSet.has(id));

      if (!allCompleted) continue;

      if (!dryRun) {
        await prisma.simulationAssignment.update({
          where: { id: assignment.id },
          data: { status: 'CLOSED' },
        });
      }
      result.closedByCompletion++;
      result.assignmentsClosed.push(
        `${assignment.simulation.title} → ${targetName} (tutti ${studentIds.length} studenti hanno completato)`
      );
      console.log(
        `[CloseAssignments] ${dryRun ? '[DRY RUN] Would close' : 'Closed'} "${assignment.simulation.title}" for ${targetName} - all ${studentIds.length} students completed`
      );
    } catch (error) {
      const errorMsg = `Failed to check/close assignment ${assignment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      console.error(`[CloseAssignments] ${errorMsg}`);
    }
  }
}

async function closeExpiredAssignments(dryRun = false): Promise<CloseAssignmentsResult> {
  const result: CloseAssignmentsResult = {
    success: true,
    closedByDate: 0,
    closedByCompletion: 0,
    totalClosed: 0,
    errors: [],
    assignmentsClosed: [],
  };

  const now = new Date();
  console.log(`[CloseAssignments] Starting auto-close check at ${now.toISOString()}`);

  try {
    await closeByExpirationDate(dryRun, result, now);
    await closeByCompletion(dryRun, result);

    result.totalClosed = result.closedByDate + result.closedByCompletion;
    result.success = result.errors.length === 0;
    console.log(
      `[CloseAssignments] Completed. Closed ${result.totalClosed} assignments (${result.closedByDate} by date, ${result.closedByCompletion} by completion)`
    );
  } catch (error) {
    result.success = false;
    const errorMsg = `Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push(errorMsg);
    console.error(`[CloseAssignments] ${errorMsg}`);
  }

  return result;
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let options: CloseAssignmentsOptions = {};
    try {
      const body = await request.json();
      options = body as CloseAssignmentsOptions;
    } catch {
      // No body or invalid JSON — use defaults
    }

    console.log('[Cron] Starting close-assignments with options:', options);
    const result = await closeExpiredAssignments(options.dryRun);

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Auto-close completed. Closed ${result.totalClosed} assignments.`
        : 'Auto-close completed with errors.',
      ...result,
    });
  } catch (error) {
    console.error('[Cron] Close-assignments failed:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Vercel Cron uses GET
export async function GET(request: NextRequest) {
  return POST(request);
}
