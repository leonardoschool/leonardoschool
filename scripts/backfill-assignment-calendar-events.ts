/**
 * One-off backfill: link existing SimulationAssignment rows to their calendar
 * event via the new `calendarEventId` FK.
 *
 * Assignments created before the FK existed have no link, so moving their dates
 * (from the Assegnazioni list or the calendar) can't stay in sync. This script
 * matches each unlinked assignment to its SIMULATION event using the same fuzzy
 * criteria the deletion path uses (event type + simulation title + an invitation
 * to the same student/group), disambiguating by start date when several events
 * match. Going forward, new assignments get the FK at creation time.
 *
 * Usage:
 *   pnpm backfill:assignment-events         # Apply the links
 *   pnpm backfill:assignment-events:dry     # Preview, write nothing
 *
 * Env is loaded via `tsx --env-file .env` in the package.json script (see
 * normalize-simulation-event-titles.ts for why dotenv-in-file doesn't work here).
 */

import prisma from '../lib/prisma/client';

const LEGACY_PREFIXES = ['TOLC: ', 'Simulazione: '];

function candidateTitles(title: string): string[] {
  return [title, ...LEGACY_PREFIXES.map((p) => `${p}${title}`)];
}

async function main() {
  const isDryRun = process.argv.slice(2).includes('--dry-run');

  console.log(`🔗 Backfilling assignment → calendar event links${isDryRun ? ' (dry run)' : ''}\n`);

  const assignments = await prisma.simulationAssignment.findMany({
    where: { calendarEventId: null },
    select: {
      id: true,
      groupId: true,
      startDate: true,
      student: { select: { userId: true } },
      simulation: { select: { title: true, calendarEventId: true } },
    },
  });

  let linked = 0;
  let ambiguous = 0;
  let unmatched = 0;

  for (const assignment of assignments) {
    const userId = assignment.student?.userId ?? null;
    const { groupId } = assignment;
    if (!userId && !groupId) {
      unmatched++;
      continue;
    }

    const invitationFilter = groupId
      ? { some: { groupId } }
      : { some: { userId: userId! } };

    const candidates = await prisma.calendarEvent.findMany({
      where: {
        type: 'SIMULATION',
        title: { in: candidateTitles(assignment.simulation.title) },
        // Never link to the simulation's own scheduled event (shared bare title).
        ...(assignment.simulation.calendarEventId
          ? { id: { not: assignment.simulation.calendarEventId } }
          : {}),
        invitations: invitationFilter,
      },
      select: { id: true, startDate: true },
    });

    if (candidates.length === 0) {
      unmatched++;
      continue;
    }

    // Disambiguate multiple matches by exact start-date equality with the
    // assignment; skip if still not uniquely resolvable to avoid mislinking.
    let match = candidates[0];
    if (candidates.length > 1) {
      const byDate = assignment.startDate
        ? candidates.filter((c) => c.startDate.getTime() === assignment.startDate!.getTime())
        : [];
      if (byDate.length === 1) {
        match = byDate[0];
      } else {
        ambiguous++;
        console.log(
          `  ⚠️  assignment ${assignment.id} ("${assignment.simulation.title}") matched ${candidates.length} events — skipped (ambiguous)`,
        );
        continue;
      }
    }

    console.log(`  assignment ${assignment.id}  ->  event ${match.id}`);
    if (!isDryRun) {
      await prisma.simulationAssignment.update({
        where: { id: assignment.id },
        data: { calendarEventId: match.id },
      });
    }
    linked++;
  }

  console.log(
    `\n${isDryRun ? 'Would link' : 'Linked'} ${linked} assignment(s). ` +
      `Ambiguous: ${ambiguous}, unmatched: ${unmatched} (of ${assignments.length} unlinked).`,
  );
}

main()
  .catch((error) => {
    console.error('❌ Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
