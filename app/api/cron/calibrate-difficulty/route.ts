/**
 * Question Difficulty Calibration Cron Endpoint
 *
 * Recomputes the per-question answer statistics from every eligible attempt, and
 * (at most weekly) proposes difficulty changes for staff to confirm.
 *
 * It never writes `Question.difficulty`. Statistics and proposals are the only
 * outputs; a label changes because a human clicked accept in the review page.
 *
 * POST /api/cron/calibrate-difficulty
 * Headers: { "Authorization": "Bearer YOUR_CRON_SECRET" }
 * Body (optional): { "dryRun": true } | { "mode": "PROPOSE", "forceProposals": true }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { logApp } from '@/lib/logging/appLog';
import {
  runQuestionCalibration,
  type CalibrationMode,
} from '@/server/services/questionCalibrationService';

/**
 * The full recompute walks every completed attempt, which takes far longer than the
 * few seconds the other three crons need — and Vercel's default would cut it off
 * mid-scan. A truncated run is not harmful (the next one recomputes from scratch)
 * but it would never finish, so the limit is raised explicitly.
 */
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

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

interface CalibrationRequestBody {
  dryRun?: boolean;
  mode?: CalibrationMode;
  forceProposals?: boolean;
}

/**
 * Statistics every night, proposals at most weekly.
 *
 * A correct rate does not move in 24 hours, so re-proposing the same changes nightly
 * would turn the review queue into noise the staff learns to ignore. The weekly gate
 * itself lives in the service and is read from the run history, so this route simply
 * asks for PROPOSE and lets that decide.
 */
function resolveMode(body: CalibrationRequestBody): CalibrationMode {
  if (body.dryRun) return 'DRY_RUN';
  return body.mode ?? 'PROPOSE';
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let body: CalibrationRequestBody = {};
    try {
      body = (await request.json()) as CalibrationRequestBody;
    } catch {
      // No body or invalid JSON — use defaults
    }

    const mode = resolveMode(body);
    console.log('[Calibration] Starting run in mode', mode);

    const summary = await runQuestionCalibration(prisma, {
      mode,
      trigger: 'CRON',
      forceProposals: body.forceProposals,
    });

    console.log(
      `[Calibration] Done in ${summary.durationMs}ms: ${summary.resultsScanned} results, ` +
        `${summary.statsUpdated} questions updated, ${summary.proposalsCreated} proposals`
    );

    // The other crons log only failures. Here the healthy numbers are the whole
    // point: the run history is how anyone tells whether the calibration is sane,
    // and Vercel's log retention is too short to be that history.
    await logApp({
      source: 'CRON',
      level: summary.isAnomalous ? 'WARN' : 'INFO',
      // The refused batch is the whole content of the alert: a bare reason code says a
      // run was stopped without saying what it wanted to do, which leaves the reader
      // with nothing to act on.
      message: summary.isAnomalous
        ? `Calibrazione difficoltà marcata anomala: ${summary.anomalyReason} — ` +
          `${summary.proposalsComputed} proposte calcolate ` +
          `(${summary.proposalsHarder} più difficili, ${summary.proposalsEasier} più facili), ` +
          'nessuna pubblicata'
        : 'Calibrazione difficoltà completata',
      path: 'POST /api/cron/calibrate-difficulty',
      metadata: {
        runId: summary.runId,
        mode: summary.mode,
        resultsScanned: summary.resultsScanned,
        answersScanned: summary.answersScanned,
        questionsWithStats: summary.questionsWithStats,
        statsUpdated: summary.statsUpdated,
        proposalsCreated: summary.proposalsCreated,
        proposalsComputed: summary.proposalsComputed,
        proposalsHarder: summary.proposalsHarder,
        proposalsEasier: summary.proposalsEasier,
        qualityFlagged: summary.qualityFlagged,
        durationMs: summary.durationMs,
      },
    });

    return NextResponse.json({
      success: summary.errors.length === 0,
      message: summary.isAnomalous
        ? `Esecuzione anomala (${summary.anomalyReason}): ${summary.proposalsComputed} proposte calcolate, nessuna pubblicata.`
        : `Calibrazione completata: ${summary.statsUpdated} domande aggiornate, ${summary.proposalsCreated} proposte.`,
      ...summary,
    });
  } catch (error) {
    console.error('[Cron] Calibrate-difficulty failed:', error);
    await logApp({
      source: 'CRON',
      level: 'ERROR',
      message: 'Errore fatale nel cron calibrate-difficulty',
      error,
      path: 'POST /api/cron/calibrate-difficulty',
      statusCode: 500,
    });
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
