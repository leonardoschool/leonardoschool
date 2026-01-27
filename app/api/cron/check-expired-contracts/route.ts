/**
 * Cron Job: Check Expired Contracts
 * 
 * This cron job runs periodically to:
 * 1. Find contracts that have expired (contractExpiresAt < now)
 * 2. Deactivate the associated user accounts
 * 3. Send notifications to users about contract expiration
 * 
 * Schedule: Run daily at 00:00 (midnight)
 * Vercel Cron: 0 0 * * *
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { logger } from '@/lib/utils/logger';

// Verify cron secret to prevent unauthorized access
const verifyCronSecret = (request: NextRequest): boolean => {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    logger.warn('[CheckExpiredContracts] CRON_SECRET not configured');
    return false;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
};

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    logger.warn('[CheckExpiredContracts] Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  logger.info('[CheckExpiredContracts] Starting expired contracts check...');

  try {
    const now = new Date();
    
    // Find all signed contracts that have expired
    const expiredContracts = await prisma.contract.findMany({
      where: {
        status: 'SIGNED',
        contractExpiresAt: {
          lt: now,
        },
      },
      include: {
        student: {
          include: { user: true },
        },
        collaborator: {
          include: { user: true },
        },
        template: true,
      },
    });

    logger.info(`[CheckExpiredContracts] Found ${expiredContracts.length} expired contracts`);

    let deactivatedCount = 0;
    const errors: string[] = [];

    for (const contract of expiredContracts) {
      try {
        const user = contract.student?.user || contract.collaborator?.user;
        if (!user) continue;

        // Skip if user is already deactivated
        if (!user.isActive) {
          logger.debug(`[CheckExpiredContracts] User ${user.id} already deactivated, skipping`);
          continue;
        }

        // Update contract status to EXPIRED
        await prisma.contract.update({
          where: { id: contract.id },
          data: { status: 'EXPIRED' },
        });

        // Deactivate the user account
        await prisma.user.update({
          where: { id: user.id },
          data: { isActive: false },
        });

        // Create a notification for the user
        await prisma.notification.create({
          data: {
            userId: user.id,
            title: 'Contratto scaduto',
            message: `Il tuo contratto "${contract.template.name}" è scaduto. Contatta l'amministrazione per rinnovarlo.`,
            type: 'CONTRACT_EXPIRED',
          },
        });

        logger.info(`[CheckExpiredContracts] Deactivated user ${user.id} (${user.email}) - contract ${contract.id} expired`);
        deactivatedCount++;
      } catch (contractError) {
        const errorMsg = `Failed to process contract ${contract.id}: ${contractError}`;
        logger.error(`[CheckExpiredContracts] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    const duration = Date.now() - startTime;
    logger.info(`[CheckExpiredContracts] Completed in ${duration}ms. Deactivated: ${deactivatedCount}, Errors: ${errors.length}`);

    return NextResponse.json({
      success: true,
      processed: expiredContracts.length,
      deactivated: deactivatedCount,
      errors: errors.length > 0 ? errors : undefined,
      durationMs: duration,
    });
  } catch (error) {
    logger.error('[CheckExpiredContracts] Fatal error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
