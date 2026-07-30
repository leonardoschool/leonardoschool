/**
 * Gate for the "not reached" detector, to be run BEFORE switching it on.
 *
 * The detector assumes that `timeSpent === 0` on a blank answer means the student
 * never got to that question. If some client path fails to record time for
 * questions the student actually read, the detector would drop real omissions from
 * the denominator and make every question look easier than it is — the mirror image
 * of the drift this feature exists to prevent, and the more dangerous one because
 * nobody complains when questions get easier.
 *
 * So this script does not decide anything. It reports the three numbers that say
 * whether the signal can be trusted:
 *
 *  1. Answers the student DID give with `timeSpent === 0`. If this is more than a
 *     rounding error, the field is unreliable and the detector must stay off.
 *  2. How many blanks the detector would exclude, and what share of all blanks
 *     that is. A large share means a large intervention on the statistics.
 *  3. Whether zero-time answers cluster in a few attempts (a client bug on one
 *     path) or are spread evenly (a systemic issue).
 *
 * Usage:
 *   pnpm audit:timespent
 *   pnpm audit:timespent --since=2026-07-30   (only attempts completed after a fix)
 *
 * Env is loaded via `tsx --env-file .env` in the package.json script.
 */

import prisma from '../lib/prisma/client';
import { parseResultAnswers, classifyAnswerOutcome } from '../server/trpc/routers/simulations.helpers';
import {
  CALIBRATION_RESULT_WHERE,
  detectNotReached,
  type CalibrationAnswer,
} from '../server/services/questionCalibration.helpers';

const PAGE_SIZE = 200;
const TIME_LIMIT_SLACK_SECONDS = 30;
/** Above this share of answered-with-zero-time, the field cannot be trusted. */
const UNRELIABLE_THRESHOLD = 0.02;

/**
 * Attempts submitted before the client recorded per-question time cannot be repaired,
 * so a verdict over all of history stays negative for ever. `--since` is how the
 * decision gets re-taken on data collected after a fix.
 */
function parseSince(): Date | null {
  const flag = process.argv.find((arg) => arg.startsWith('--since='));
  if (!flag) return null;
  const value = new Date(flag.slice('--since='.length));
  if (Number.isNaN(value.getTime())) {
    throw new Error(`--since non è una data valida: ${flag}`);
  }
  return value;
}

async function main() {
  console.log('[Audit] Affidabilità di timeSpent per il rilevatore "non raggiunte"\n');
  const since = parseSince();
  if (since) console.log(`Solo i tentativi completati dal ${since.toISOString()}\n`);

  let cursor: string | undefined;
  let results = 0;
  let answers = 0;
  let answeredWithZeroTime = 0;
  let blanks = 0;
  let blanksWithZeroTime = 0;
  let wouldExclude = 0;
  let paperResults = 0;
  let timedOutResults = 0;
  const attemptsWithZeroTimeAnswers = new Set<string>();
  // Where the zeros sit tells you which client path to fix. All answers of an
  // attempt at zero is a whole path that never records time; a single zero on the
  // last question is time lost at submit.
  let attemptsAllZero = 0;
  let attemptsPartialZero = 0;
  let zerosInAllZeroAttempts = 0;
  let zerosOnLastAnswered = 0;
  let zerosOnTimedOutAttempts = 0;

  for (;;) {
    const page = await prisma.simulationResult.findMany({
      where: since
        ? { ...CALIBRATION_RESULT_WHERE, completedAt: { not: null, gte: since } }
        : CALIBRATION_RESULT_WHERE,
      select: {
        id: true,
        durationSeconds: true,
        answers: true,
        simulation: {
          select: { durationMinutes: true, isPaperBased: true, hasSections: true, sections: true },
        },
      },
      orderBy: { id: 'asc' },
      take: PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (page.length === 0) break;

    for (const result of page) {
      results += 1;
      if (result.simulation.isPaperBased) {
        paperResults += 1;
        continue; // no timings by design
      }

      const positions = sectionPositions(result.simulation);
      const parsed = parseResultAnswers(result.answers);
      const calibrationAnswers: CalibrationAnswer[] = parsed.map((answer, index) => {
        const position = positions.get(answer.questionId);
        return {
          questionId: answer.questionId,
          answerId: answer.answerId,
          answerText: answer.answerText,
          isCorrect: answer.isCorrect,
          timeSpent: answer.timeSpent,
          order: position?.order ?? index,
          sectionIndex: position?.sectionIndex ?? null,
        };
      });

      const ranOutOfTime = hitTimeLimit(result.durationSeconds, result.simulation.durationMinutes);
      if (ranOutOfTime) timedOutResults += 1;

      let answeredHere = 0;
      let zeroHere = 0;
      let lastAnsweredIndex = -1;
      const zeroIndexes: number[] = [];

      calibrationAnswers.forEach((answer, index) => {
        answers += 1;
        const outcome = classifyAnswerOutcome(answer);
        if (outcome === 'blank') {
          blanks += 1;
          if (answer.timeSpent === 0) blanksWithZeroTime += 1;
          return;
        }
        answeredHere += 1;
        lastAnsweredIndex = index;
        if (answer.timeSpent === 0) {
          // The student answered, yet no time was recorded: this is the signal
          // that would poison the detector.
          answeredWithZeroTime += 1;
          zeroHere += 1;
          zeroIndexes.push(index);
          attemptsWithZeroTimeAnswers.add(result.id);
        }
      });

      if (answeredHere > 0 && zeroHere > 0) {
        if (zeroHere === answeredHere) {
          attemptsAllZero += 1;
          zerosInAllZeroAttempts += zeroHere;
        } else {
          attemptsPartialZero += 1;
        }
        if (zeroIndexes.includes(lastAnsweredIndex)) zerosOnLastAnswered += 1;
        if (ranOutOfTime) zerosOnTimedOutAttempts += zeroHere;
      }

      wouldExclude += detectNotReached(calibrationAnswers, {
        isPaperBased: false,
        ranOutOfTime,
      }).size;
    }

    cursor = page[page.length - 1].id;
    if (page.length < PAGE_SIZE) break;
  }

  const answeredTotal = answers - blanks;
  const zeroTimeShare = answeredTotal > 0 ? answeredWithZeroTime / answeredTotal : 0;
  const blankExclusionShare = blanks > 0 ? wouldExclude / blanks : 0;

  console.log(`Risultati esaminati:            ${results}`);
  console.log(`  di cui cartacei (esclusi):    ${paperResults}`);
  console.log(`  di cui a tempo scaduto:       ${timedOutResults}`);
  console.log(`Risposte totali:                ${answers}`);
  console.log(`  date dallo studente:          ${answeredTotal}`);
  console.log(`  in bianco:                    ${blanks} (${blanksWithZeroTime} con tempo 0)\n`);

  console.log('--- Segnale 1: risposte DATE con tempo 0 (deve essere quasi zero)');
  console.log(`  ${answeredWithZeroTime} su ${answeredTotal} = ${(zeroTimeShare * 100).toFixed(2)}%`);
  console.log(`  concentrate in ${attemptsWithZeroTimeAnswers.size} tentativi distinti\n`);

  console.log('--- Dove si concentrano gli zeri (dice quale percorso client riparare)');
  console.log(`  tentativi con TUTTE le risposte a zero: ${attemptsAllZero} (${zerosInAllZeroAttempts} zeri)`);
  console.log(`  tentativi con solo alcune a zero:       ${attemptsPartialZero}`);
  console.log(`  tentativi il cui zero cade sull'ULTIMA risposta data: ${zerosOnLastAnswered}`);
  console.log(`  zeri in tentativi finiti a tempo scaduto: ${zerosOnTimedOutAttempts}\n`);

  console.log('--- Segnale 2: quante bianche verrebbero escluse');
  console.log(`  ${wouldExclude} su ${blanks} bianche = ${(blankExclusionShare * 100).toFixed(2)}%\n`);

  const reliable = zeroTimeShare <= UNRELIABLE_THRESHOLD;
  if (!reliable) {
    console.log('❌ ESITO: timeSpent NON è affidabile.');
    console.log(
      `   Oltre il ${(UNRELIABLE_THRESHOLD * 100).toFixed(0)}% delle risposte date non registra tempo:`
    );
    console.log('   il rilevatore escluderebbe bianche vere e ammorbidirebbe ogni domanda.');
    console.log('   Lasciare CALIBRATION.notReachedDetection = false e indagare il client.');
    if (!since) {
      console.log('\n   Nota: questo verdetto include tutto lo storico, comprese le consegne');
      console.log('   precedenti alle correzioni del tracciamento tempo — che non sono');
      console.log('   recuperabili. Per decidere sui dati nuovi: pnpm audit:timespent --since=AAAA-MM-GG');
    }
  } else if (answers === 0) {
    console.log('⚠️  ESITO: nessun dato da valutare. Rieseguire quando ci sono simulazioni svolte.');
  } else {
    console.log('✅ ESITO: timeSpent sembra affidabile.');
    console.log('   Si può valutare CALIBRATION.notReachedDetection = true, tenendo presente');
    console.log(`   che inciderebbe sul ${(blankExclusionShare * 100).toFixed(1)}% delle risposte in bianco.`);
  }
}

type SimulationForPositions = {
  hasSections: boolean;
  sections: unknown;
};

function sectionPositions(
  simulation: SimulationForPositions
): Map<string, { order: number; sectionIndex: number | null }> {
  const positions = new Map<string, { order: number; sectionIndex: number | null }>();
  if (!simulation.hasSections || !Array.isArray(simulation.sections)) return positions;
  simulation.sections.forEach((rawSection, sectionIndex) => {
    const section = rawSection as { questionIds?: unknown };
    if (!Array.isArray(section?.questionIds)) return;
    section.questionIds.forEach((questionId, order) => {
      if (typeof questionId === 'string') positions.set(questionId, { order, sectionIndex });
    });
  });
  return positions;
}

function hitTimeLimit(durationSeconds: number | null, durationMinutes: number): boolean {
  if (!durationSeconds || durationMinutes <= 0) return false;
  return durationSeconds >= durationMinutes * 60 - TIME_LIMIT_SLACK_SECONDS;
}

main()
  .catch((error) => {
    console.error('[Audit] Errore:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
