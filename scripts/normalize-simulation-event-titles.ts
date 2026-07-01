/**
 * One-off normalization: strip the legacy "TOLC: " / "Simulazione: " prefix from the titles of
 * existing SIMULATION calendar events.
 *
 * Since v1.1.1 new events are created with the bare simulation title, but events created before
 * that still carry the prefix in the DB and keep showing it on the calendar. This backfills them.
 *
 * Usage:
 *   pnpm normalize:sim-events            # Apply the rename
 *   pnpm normalize:sim-events:dry        # Preview what would change, write nothing
 *
 * Env is loaded via `tsx --env-file .env` in the package.json script (not dotenv here): an
 * `import` of the prisma client is hoisted above any in-file dotenv call, so the DB adapter would
 * otherwise be built before DATABASE_URL is set.
 */

import prisma from '../lib/prisma/client';

const LEGACY_PREFIXES = ['TOLC: ', 'Simulazione: '];

function stripLegacyPrefix(title: string): string | null {
  const prefix = LEGACY_PREFIXES.find((p) => title.startsWith(p));
  if (!prefix) return null;
  const stripped = title.slice(prefix.length).trim();
  // Guard against emptying the title (e.g. a title that is exactly "TOLC: ").
  return stripped.length > 0 && stripped !== title ? stripped : null;
}

async function main() {
  const isDryRun = process.argv.slice(2).includes('--dry-run');

  console.log(`🏷️  Normalizing SIMULATION calendar event titles${isDryRun ? ' (dry run)' : ''}\n`);

  const candidates = await prisma.calendarEvent.findMany({
    where: {
      type: 'SIMULATION',
      OR: LEGACY_PREFIXES.map((p) => ({ title: { startsWith: p } })),
    },
    select: { id: true, title: true },
  });

  let changed = 0;
  for (const event of candidates) {
    const newTitle = stripLegacyPrefix(event.title);
    if (!newTitle) continue;

    console.log(`  "${event.title}"  ->  "${newTitle}"`);
    if (!isDryRun) {
      await prisma.calendarEvent.update({ where: { id: event.id }, data: { title: newTitle } });
    }
    changed++;
  }

  console.log(
    `\n${isDryRun ? 'Would update' : 'Updated'} ${changed} event(s) (of ${candidates.length} matched).`,
  );
}

main()
  .catch((error) => {
    console.error('❌ Normalization failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
