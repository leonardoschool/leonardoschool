/**
 * Repair of the attempts left inconsistent by a question edited before v1.20.0.
 *
 * Until then, changing which option was correct — or what it was worth — moved only
 * the question. An attempt already consegnato kept the verdict it earned under the
 * old rules, so a student could read "Corretta" next to the penalty from the old key.
 * The edit also dropped and recreated the answer rows, orphaning the `answerId` the
 * attempt had stored, which is why "La tua risposta" disappeared from the review page.
 *
 * From v1.20.0 both are handled the moment the question is saved. This script exists
 * for the damage done before that, and as the recovery path if an automatic re-grade
 * ever fails (the router logs and swallows it, so a failure does not roll back the
 * question fix itself).
 *
 * It calls the very same service the router calls, so there is no second
 * implementation to keep in step, and that service is idempotent: an attempt already
 * consistent is left untouched, so this is safe to run repeatedly.
 *
 * Usage:
 *   pnpm fix:stale-verdicts:dry            # Read everything, write nothing
 *   pnpm fix:stale-verdicts                # Apply the current rules to past attempts
 *   pnpm fix:stale-verdicts -- --question <id>   # Limit to one question
 *
 * Env is loaded via `tsx --env-file .env` in the package.json script — switch with
 * `pnpm env:prod` first when repairing production.
 */

import prisma from '../lib/prisma/client';
import { regradeChoiceQuestionResults } from '../server/services/choiceRegrade';

/** Questions handled per round-trip, so a large bank does not land in memory at once. */
const QUESTION_BATCH_SIZE = 200;

type Totals = { scanned: number; withChanges: number; attempts: number; students: Set<string> };

async function collectQuestionIds(onlyQuestionId: string | null): Promise<string[]> {
  if (onlyQuestionId) return [onlyQuestionId];

  const ids: string[] = [];
  let cursor: string | undefined;

  for (;;) {
    const batch = await prisma.question.findMany({
      where: { type: { not: 'OPEN_TEXT' }, simulationQuestions: { some: {} } },
      orderBy: { id: 'asc' },
      take: QUESTION_BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true },
    });

    if (batch.length === 0) return ids;
    ids.push(...batch.map(q => q.id));
    cursor = batch.at(-1)?.id;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const questionFlag = args.indexOf('--question');
  const onlyQuestionId = questionFlag !== -1 ? args[questionFlag + 1] ?? null : null;

  console.log(`[FixVerdicts] Modalità: ${isDryRun ? 'DRY_RUN' : 'APPLY'}`);
  if (isDryRun) {
    console.log('[FixVerdicts] Nessuna scrittura: viene solo contato cosa cambierebbe.\n');
  }
  if (onlyQuestionId) console.log(`[FixVerdicts] Limitato alla domanda ${onlyQuestionId}\n`);

  const questionIds = await collectQuestionIds(onlyQuestionId);
  console.log(`Domande da esaminare: ${questionIds.length}\n`);

  const totals: Totals = { scanned: 0, withChanges: 0, attempts: 0, students: new Set() };
  const startedAt = Date.now();

  for (const questionId of questionIds) {
    totals.scanned += 1;

    const report = await regradeChoiceQuestionResults(prisma, questionId, { dryRun: isDryRun });

    if (report.updatedResults === 0) continue;

    totals.withChanges += 1;
    totals.attempts += report.updatedResults;
    for (const studentId of report.affectedStudentIds) totals.students.add(studentId);

    console.log(
      `  ${questionId}  ${String(report.updatedResults).padStart(4)} tentativi  ` +
        `${report.affectedStudentIds.length} studenti`
    );
  }

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\nDomande esaminate:        ${totals.scanned}`);
  console.log(`Domande con disallineamenti: ${totals.withChanges}`);
  console.log(`Tentativi ${isDryRun ? 'da riallineare' : 'riallineati'}:  ${totals.attempts}`);
  console.log(`Studenti coinvolti:       ${totals.students.size}`);
  console.log(`Durata:                   ${seconds}s`);

  if (isDryRun && totals.attempts > 0) {
    console.log('\nRilancia senza --dry-run per applicare.');
  }
}

main()
  .catch((error) => {
    console.error('[FixVerdicts] Errore:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
