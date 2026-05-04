/**
 * Auto-Close Simulation Assignments Cron Endpoint
 * 
 * This endpoint automatically closes simulation ASSIGNMENTS (not templates) when:
 * 1. The assignment's endDate has passed
 * 2. All targeted students have completed it (for non-repeatable simulations)
 * 
 * Note: Simulations (templates) have statuses: DRAFT, PUBLISHED, ARCHIVED
 * Assignments have statuses: ACTIVE, CLOSED
 * 
 * Should be called periodically via cron service (e.g., every hour).
 * 
 * Security: Requires CRON_SECRET header to match environment variable.
 * 
 * Usage:
 * POST /api/cron/close-simulations
 * Headers: { "Authorization": "Bearer YOUR_CRON_SECRET" }
 * 
 * Optional body (JSON):
 * {
 *   "dryRun": true  // Log what would be closed without actually closing
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

// Verify cron secret
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  
  // If no secret is configured, reject all requests
  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET not configured');
    return false;
  }
  
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return false;
  }
  
  // Support both "Bearer TOKEN" and just "TOKEN"
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : authHeader;
    
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
    // 1. Close assignments with expired endDate
    const expiredAssignments = await prisma.simulationAssignment.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          not: null,
          lt: now,
        },
      },
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
        const targetName = assignment.student?.user?.name || assignment.group?.name || 'Unknown';
        if (!dryRun) {
          await prisma.simulationAssignment.update({
            where: { id: assignment.id },
            data: { status: 'CLOSED' },
          });
        }
        result.closedByDate++;
        result.assignmentsClosed.push(`${assignment.simulation.title} → ${targetName} (scaduta: ${assignment.endDate?.toISOString()})`);
        console.log(`[CloseAssignments] ${dryRun ? '[DRY RUN] Would close' : 'Closed'} "${assignment.simulation.title}" for ${targetName} - expired at ${assignment.endDate?.toISOString()}`);
      } catch (error) {
        const errorMsg = `Failed to close assignment ${assignment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(`[CloseAssignments] ${errorMsg}`);
      }
    }

    // 2. Close assignments for non-repeatable simulations where all targeted students have completed
    const activeAssignments = await prisma.simulationAssignment.findMany({
      where: {
        status: 'ACTIVE',
        simulation: {
          isRepeatable: false,
          status: 'PUBLISHED',
        },
      },
      include: {
        simulation: {
          select: {
            id: true,
            title: true,
          },
        },
        student: {
          select: {
            id: true,
            user: { select: { name: true } },
          },
        },
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
        // Get targeted student IDs for this assignment
        let targetedStudentIds: string[] = [];
        let targetName = 'Unknown';

        if (assignment.studentId) {
          // Direct student assignment
          targetedStudentIds = [assignment.studentId];
          targetName = assignment.student?.user?.name || 'Student';
        } else if (assignment.groupId && assignment.group) {
          // Group assignment - get all group members
          targetedStudentIds = assignment.group.members.map((m) => m.studentId);
          targetName = assignment.group.name;
        }

        if (targetedStudentIds.length === 0) {
          continue;
        }

        // Check how many have completed
        const completedResults = await prisma.simulationResult.findMany({
          where: {
            simulationId: assignment.simulationId,
            studentId: { in: targetedStudentIds },
            completedAt: { not: null },
          },
          select: { studentId: true },
        });

        const completedSet = new Set(completedResults.map((r) => r.studentId));
        const allCompleted = targetedStudentIds.every((id) => completedSet.has(id));

        if (allCompleted) {
          if (!dryRun) {
            await prisma.simulationAssignment.update({
              where: { id: assignment.id },
              data: { status: 'CLOSED' },
            });
          }
          result.closedByCompletion++;
          result.assignmentsClosed.push(
            `${assignment.simulation.title} → ${targetName} (tutti ${targetedStudentIds.length} studenti hanno completato)`
          );
          console.log(
            `[CloseAssignments] ${dryRun ? '[DRY RUN] Would close' : 'Closed'} "${assignment.simulation.title}" for ${targetName} - all ${targetedStudentIds.length} students completed`
          );
        }
      } catch (error) {
        const errorMsg = `Failed to check/close assignment ${assignment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(`[CloseAssignments] ${errorMsg}`);
      }
    }

    result.totalClosed = result.closedByDate + result.closedByCompletion;
    result.success = result.errors.length === 0;

    console.log(`[CloseAssignments] Completed. Closed ${result.totalClosed} assignments (${result.closedByDate} by date, ${result.closedByCompletion} by completion)`);
  } catch (error) {
    result.success = false;
    const errorMsg = `Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push(errorMsg);
    console.error(`[CloseAssignments] ${errorMsg}`);
  }

  return result;
}

export async function POST(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Parse optional options from body
    let options: CloseAssignmentsOptions = {};
    try {
      const body = await request.json();
      options = body as CloseAssignmentsOptions;
    } catch {
      // No body or invalid JSON - use defaults
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

// Also support GET for easy testing (Vercel Cron uses GET)
export async function GET(request: NextRequest) {
  return POST(request);
}
