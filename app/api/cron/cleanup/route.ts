/**
 * Database Cleanup Cron Endpoint
 * 
 * This endpoint runs database cleanup tasks.
 * Should be called periodically via cron service (e.g., Vercel Cron, Railway Cron).
 * 
 * Security: Requires CRON_SECRET header to match environment variable.
 * 
 * Usage:
 * POST /api/cron/cleanup
 * Headers: { "Authorization": "Bearer YOUR_CRON_SECRET" }
 * 
 * Optional body (JSON):
 * {
 *   "dryRun": true,  // Log what would be deleted without actually deleting
 *   "notificationsReadDays": 30,  // Override default cleanup days
 *   ...
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { runCleanup, getDatabaseStats, type CleanupOptions } from '@/server/services/cleanupService';

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
    let options: CleanupOptions = {};
    try {
      const body = await request.json();
      options = body as CleanupOptions;
    } catch {
      // No body or invalid JSON - use defaults
    }

    console.log('[Cron] Starting cleanup with options:', options);
    
    const result = await runCleanup(prisma, options);
    
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Cleanup completed. Deleted ${result.totalDeleted} records.`
        : 'Cleanup completed with errors.',
      ...result,
    });
  } catch (error) {
    console.error('[Cron] Cleanup failed:', error);
    return NextResponse.json(
      { 
        error: 'Cleanup failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check database stats (also protected)
export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const stats = await getDatabaseStats(prisma);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...stats,
    });
  } catch (error) {
    console.error('[Cron] Stats failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get stats', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
