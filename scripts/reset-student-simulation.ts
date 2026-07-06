/**
 * Reset a student's simulation attempt so they can re-enter (e.g. after losing
 * connection in a Virtual Room and being wrongly auto-submitted).
 *
 * Dry-run by default: prints the affected records without changing anything.
 * Add APPLY=1 to actually perform the reset.
 *
 * Usage:
 *   STUDENT_EMAIL="mario.rossi@example.com" SIM_TITLE="TOLC Biologia" pnpm tsx scripts/reset-student-simulation.ts
 *   STUDENT_EMAIL="..." SIM_TITLE="..." APPLY=1 pnpm tsx scripts/reset-student-simulation.ts
 *
 * Options:
 *   FRESH=1     -> delete the SimulationResult (student restarts from scratch)
 *                 default keeps it and only clears completedAt (student resumes with saved answers)
 *   REOPEN=1    -> reopen a COMPLETED/ended SimulationSession (status=STARTED, endedAt=null)
 *
 * NOTE: run against the correct env first: `pnpm env:current` / `pnpm env:prod`.
 */

import { config } from 'dotenv';
import { resolve } from 'node:path';
config({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter, log: ['error', 'warn'] });

const STUDENT_EMAIL = process.env.STUDENT_EMAIL;
const SIM_TITLE = process.env.SIM_TITLE;
const APPLY = process.env.APPLY === '1';
const FRESH = process.env.FRESH === '1';
const REOPEN = process.env.REOPEN === '1';

async function main() {
  if (!STUDENT_EMAIL || !SIM_TITLE) {
    throw new Error('Set STUDENT_EMAIL and SIM_TITLE env vars.');
  }

  const user = await prisma.user.findFirst({
    where: { email: STUDENT_EMAIL },
    include: { student: true },
  });
  if (!user?.student) throw new Error(`No student found for email ${STUDENT_EMAIL}`);
  const studentId = user.student.id;

  const simulation = await prisma.simulation.findFirst({
    where: { title: SIM_TITLE },
    select: { id: true, title: true, isRepeatable: true, accessType: true },
  });
  if (!simulation) throw new Error(`No simulation found with title "${SIM_TITLE}"`);

  const results = await prisma.simulationResult.findMany({
    where: { simulationId: simulation.id, studentId },
    select: { id: true, startedAt: true, completedAt: true, assignmentId: true, correctAnswers: true, totalQuestions: true },
    orderBy: { startedAt: 'desc' },
  });

  const participants = await prisma.simulationSessionParticipant.findMany({
    where: { studentId, session: { simulationId: simulation.id } },
    include: { session: { select: { id: true, status: true, endedAt: true, assignmentId: true } } },
  });

  console.log('\n=== CURRENT STATE ===');
  console.log('Student :', user.email, '->', studentId);
  console.log('Simulation:', simulation.title, `(repeatable=${simulation.isRepeatable}, accessType=${simulation.accessType})`);
  console.log('\nSimulationResult(s):');
  console.table(results);
  console.log('SessionParticipant(s):');
  console.table(participants.map(p => ({
    id: p.id, sessionId: p.sessionId, sessionStatus: p.session.status, sessionEndedAt: p.session.endedAt,
    isKicked: p.isKicked, completedAt: p.completedAt, isConnected: p.isConnected, disconnectedAt: p.disconnectedAt,
  })));

  if (!APPLY) {
    console.log('\n[DRY-RUN] Nothing changed. Re-run with APPLY=1 to reset.');
    console.log(`Options: FRESH=${FRESH ? 1 : 0} (delete result), REOPEN=${REOPEN ? 1 : 0} (reopen session)`);
    return;
  }

  await prisma.$transaction(async tx => {
    // 1. SimulationResult
    if (FRESH) {
      const del = await tx.simulationResult.deleteMany({ where: { simulationId: simulation.id, studentId } });
      console.log(`\nDeleted ${del.count} SimulationResult(s).`);
    } else {
      const upd = await tx.simulationResult.updateMany({
        where: { simulationId: simulation.id, studentId, completedAt: { not: null } },
        data: { completedAt: null },
      });
      console.log(`\nCleared completedAt on ${upd.count} SimulationResult(s).`);
    }

    // 2. SessionParticipant
    for (const p of participants) {
      await tx.simulationSessionParticipant.update({
        where: { id: p.id },
        data: {
          isKicked: false,
          kickedAt: null,
          kickedReason: null,
          completedAt: null,
          disconnectedAt: null,
          ...(FRESH ? { resultId: null } : {}),
        },
      });
    }
    console.log(`Reset ${participants.length} SessionParticipant(s).`);

    // 3. Session (only if requested)
    if (REOPEN) {
      const sessionIds = [...new Set(participants.map(p => p.sessionId))];
      for (const sid of sessionIds) {
        await tx.simulationSession.update({
          where: { id: sid },
          data: { status: 'STARTED', endedAt: null },
        });
      }
      console.log(`Reopened ${sessionIds.length} session(s).`);
    }
  });

  console.log('\nDone. The student can now re-enter.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
