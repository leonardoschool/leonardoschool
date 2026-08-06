/**
 * Backfill of the per-question answer statistics.
 *
 * The `Question.times*` / `avgCorrectRate` columns have existed since the initial
 * schema and were never written: the question page has been showing "N/A" for its
 * whole life. This recomputes them from every eligible attempt.
 *
 * It calls the very same function the nightly cron calls, so there is no second
 * implementation to keep in step — and because that function is a full recompute, it
 * is safe to run repeatedly.
 *
 * Usage:
 *   pnpm backfill:question-stats:dry     # Read everything, write nothing
 *   pnpm backfill:question-stats         # Write the statistics
 *   pnpm backfill:question-stats -- --propose   # …and compute proposals too
 *
 * `--propose` never changes a difficulty: it only fills the review queue.
 *
 * Env is loaded via `tsx --env-file .env` in the package.json script.
 */

import prisma from '../lib/prisma/client';
import { runQuestionCalibration } from '../server/services/questionCalibrationService';

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const withProposals = args.includes('--propose');

  const mode = isDryRun ? 'DRY_RUN' : withProposals ? 'PROPOSE' : 'STATS_ONLY';
  console.log(`[Backfill] Modalità: ${mode}`);
  if (isDryRun) console.log('[Backfill] Nessuna scrittura: solo lettura e conteggi.\n');

  const startedAt = Date.now();
  const summary = await runQuestionCalibration(prisma, {
    mode,
    trigger: 'MANUAL',
    // A manual run is an explicit act: it should not be silenced by the weekly gate.
    forceProposals: withProposals,
  });

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`Risultati esaminati:        ${summary.resultsScanned}`);
  console.log(`Risposte conteggiate:       ${summary.answersScanned}`);
  console.log(`  riesposizioni scartate:   ${summary.repeatExposuresExcluded}`);
  console.log(`  non raggiunte scartate:   ${summary.notReachedExcluded}`);
  console.log(`Domande con statistiche:    ${summary.questionsWithStats}`);
  console.log(`Domande aggiornate:         ${summary.statsUpdated}`);
  console.log(`Distribuzione attuale:      ${JSON.stringify(summary.distributionBefore)}`);

  if (mode === 'PROPOSE') {
    console.log(`\nProposte create:            ${summary.proposalsCreated}`);
    console.log(`Distribuzione se accettate: ${JSON.stringify(summary.distributionAfter)}`);
    console.log(`Domande da verificare:      ${summary.qualityFlagged}`);
    console.log('Scartate:');
    for (const [reason, count] of Object.entries(summary.skipped)) {
      if (count > 0) console.log(`  ${reason.padEnd(16)} ${count}`);
    }
    if (summary.isAnomalous) {
      console.log(`\n⚠️  Esecuzione marcata ANOMALA (${summary.anomalyReason}).`);
      console.log(`   Proposte calcolate e scartate: ${summary.proposalsComputed}`);
      console.log(`     più difficili:            ${summary.proposalsHarder}`);
      console.log(`     più facili:               ${summary.proposalsEasier}`);
      console.log('   Nessuna proposta pubblicata: il movimento richiesto non sembra calibrazione.');
      console.log('   Rieseguire su una materia per volta con questionCalibration.runNow');
      console.log('   (mode PROPOSE, forceProposals, questionIds ristretti).');
    }
  }

  if (summary.errors.length > 0) {
    console.log('\nErrori:');
    summary.errors.forEach((error) => console.log(`  - ${error}`));
  }

  console.log(`\nDurata: ${seconds}s (runId: ${summary.runId ?? 'nessuno'})`);
}

main()
  .catch((error) => {
    console.error('[Backfill] Errore:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
