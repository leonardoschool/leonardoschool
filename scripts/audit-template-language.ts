/**
 * Diagnostica: quali template di simulazione hanno sezioni SENZA lingua impostata?
 *
 * Una sezione con `language: null` vale "Tutte le lingue" e non applica alcun
 * filtro (`if (section.language) where.language = ...` in simulations.ts). Su una
 * banca dati quasi interamente italiana il risultato è un quiz misto IT/EN.
 *
 * È particolarmente grave sui template di AUTOESERCITAZIONE: in quella modalità
 * il modale studente NON mostra il selettore lingua, quindi lo studente subisce
 * il misto senza avere alcun modo di correggerlo — ed è la firma della
 * segnalazione "ho scelto italiano ma escono domande in inglese".
 *
 * SOLA LETTURA: non scrive nulla, mai.
 *
 * Usage:
 *   pnpm tsx scripts/audit-template-language.ts                  # produzione
 *   pnpm tsx scripts/audit-template-language.ts --env=.env.test  # ambiente di test
 */

import { config } from 'dotenv';
import { resolve } from 'path';

const ENV_FILE = process.argv.find((a) => a.startsWith('--env='))?.split('=')[1] ?? '.env.production';
config({ path: resolve(__dirname, `../env/${ENV_FILE}`) });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error(`❌ Nessun DATABASE_URL in env/${ENV_FILE}`);
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: dbUrl }) });

interface SectionLike {
  name?: unknown;
  language?: unknown;
  questionCount?: unknown;
}

function parseSections(raw: unknown): SectionLike[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is SectionLike => typeof s === 'object' && s !== null);
}

async function main() {
  console.log(`\n🔎 Audit lingua delle sezioni dei template  [SOLA LETTURA]  env=${ENV_FILE}\n`);

  const templates = await prisma.simulationTemplate.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      isSelfPracticeTemplate: true,
      sections: true,
      _count: { select: { templateAssignments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  let totalSections = 0;
  let sectionsWithoutLanguage = 0;
  const affected: Array<{
    id: string; title: string; status: string; selfPractice: boolean;
    assignments: number; missing: string[]; totalSections: number;
  }> = [];

  for (const t of templates) {
    const sections = parseSections(t.sections);
    totalSections += sections.length;
    const missing = sections
      .filter((s) => s.language !== 'IT' && s.language !== 'EN')
      .map((s, i) => (typeof s.name === 'string' && s.name ? s.name : `sezione ${i + 1}`));
    sectionsWithoutLanguage += missing.length;
    if (missing.length > 0) {
      affected.push({
        id: t.id,
        title: t.title ?? '(senza titolo)',
        status: t.status,
        selfPractice: t.isSelfPracticeTemplate,
        assignments: t._count.templateAssignments,
        missing,
        totalSections: sections.length,
      });
    }
  }

  console.log('📊 Riepilogo');
  console.log(`   Template totali:                    ${templates.length}`);
  console.log(`   Sezioni totali:                     ${totalSections}`);
  console.log(`   Sezioni SENZA lingua (= nessun filtro): ${sectionsWithoutLanguage}`);
  console.log(`   Template coinvolti:                 ${affected.length}`);

  // I template di autoesercitazione pubblicati e assegnati sono quelli che gli
  // studenti eseguono davvero, e senza poter scegliere la lingua.
  const critical = affected.filter(
    (t) => t.selfPractice && t.status === 'PUBLISHED' && t.assignments > 0
  );
  console.log(`\n🔴 CRITICI (autoesercitazione, pubblicati e assegnati): ${critical.length}`);
  for (const t of critical) {
    console.log(`   - [${t.id}] "${t.title}" — ${t.missing.length}/${t.totalSections} sezioni senza lingua, ${t.assignments} assegnazioni`);
    console.log(`       sezioni: ${t.missing.join(', ')}`);
  }

  const others = affected.filter((t) => !critical.includes(t));
  console.log(`\n🟡 Altri template coinvolti (non autoesercitazione, o non pubblicati/assegnati): ${others.length}`);
  for (const t of others.slice(0, 30)) {
    const kind = t.selfPractice ? 'autoeserc.' : 'simulazione';
    console.log(`   - [${t.id}] "${t.title}" (${kind}, ${t.status}, ${t.assignments} assegnaz.) — ${t.missing.length}/${t.totalSections} sezioni`);
  }
  if (others.length > 30) console.log(`   ... e altri ${others.length - 30}`);

  await auditSimulations();

  console.log('\nℹ️  Nessuna modifica scritta. La correzione si fa dall\'editor');
  console.log('   impostando la lingua sulle sezioni elencate (campo "Lingua").\n');
}

/**
 * Le SIMULAZIONI hanno una copia propria delle sezioni. `updateQuestions` la
 * riscriveva con una whitelist che perdeva `language`: da lì una sezione nata
 * "solo italiano" ricominciava a servire domande inglesi. La perdita è stata
 * tappata, ma le righe già danneggiate non sono mai state riparate.
 */
async function auditSimulations() {
  const simulations = await prisma.simulation.findMany({
    select: { id: true, title: true, status: true, sections: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  let totalSections = 0;
  let missingSections = 0;
  const affected: Array<{ id: string; title: string; status: string; missing: number; total: number }> = [];

  for (const s of simulations) {
    const sections = parseSections(s.sections);
    totalSections += sections.length;
    const missing = sections.filter((x) => x.language !== 'IT' && x.language !== 'EN').length;
    missingSections += missing;
    if (missing > 0) {
      affected.push({
        id: s.id,
        title: s.title ?? '(senza titolo)',
        status: s.status,
        missing,
        total: sections.length,
      });
    }
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('📊 SIMULAZIONI (copia propria delle sezioni)');
  console.log(`   Simulazioni totali:                 ${simulations.length}`);
  console.log(`   Sezioni totali:                     ${totalSections}`);
  console.log(`   Sezioni SENZA lingua:               ${missingSections}`);
  console.log(`   Simulazioni coinvolte:              ${affected.length}`);

  const live = affected.filter((s) => s.status === 'PUBLISHED' || s.status === 'IN_PROGRESS');
  console.log(`\n🔴 Fra queste, pubblicate o in corso: ${live.length}`);

  // La domanda che conta davvero: le domande GIÀ assegnate sono miste?
  // Il filtro perso agisce solo alla rigenerazione, quindi una simulazione può
  // avere sezioni senza lingua ed essere comunque tutta italiana.
  console.log('\n--- Lingua delle domande effettivamente assegnate ---');
  let mixedCount = 0;
  for (const s of live) {
    const rows = await prisma.simulationQuestion.findMany({
      where: { simulationId: s.id },
      select: { question: { select: { language: true } } },
    });
    let it = 0;
    let en = 0;
    for (const r of rows) {
      if (r.question?.language === 'EN') en++;
      else if (r.question?.language === 'IT') it++;
    }
    const mixed = it > 0 && en > 0;
    if (mixed) mixedCount++;
    const flag = mixed ? '🔴 MISTA' : '   ok   ';
    console.log(`   ${flag}  "${s.title}" (${s.status}) — ${it} IT / ${en} EN`);
  }
  console.log(`\n>>> Simulazioni con domande di ENTRAMBE le lingue: ${mixedCount} su ${live.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
