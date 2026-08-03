/**
 * Diagnostica: domande la cui LINGUA ETICHETTATA non corrisponde al testo.
 *
 * Sostituisce il controllo lingua di fix-cineca-question-content.ts, che aveva
 * tre punti ciechi: guardava solo `question.text` (mai le risposte), girava solo
 * su SINGLE_CHOICE/MULTIPLE_CHOICE (le OPEN_TEXT non venivano mai controllate) e
 * si basava su ~26 parole di argomento biologico, quindi non vedeva una domanda
 * inglese di matematica o fisica.
 *
 * Qui il riconoscimento usa le PAROLE FUNZIONALI (articoli, preposizioni,
 * congiunzioni): sono le più frequenti in qualunque testo e non dipendono
 * dall'argomento. Un testo italiano è pieno di "di/che/il/la/per/con"; uno
 * inglese di "the/of/and/is/are". Il segnale è molto più netto.
 *
 * SOLA LETTURA: non scrive nulla, mai.
 *
 * Usage:
 *   pnpm tsx scripts/audit-question-language.ts
 *   pnpm tsx scripts/audit-question-language.ts --env=.env.test
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

// Parole funzionali: frequentissime e indipendenti dall'argomento.
// Escluse di proposito quelle ambigue fra le due lingue ("in", "a", "e", "no").
const IT_STOPWORDS = new Set([
  'di', 'che', 'il', 'la', 'le', 'lo', 'gli', 'un', 'una', 'uno', 'per', 'con',
  'non', 'del', 'dello', 'della', 'dei', 'degli', 'delle', 'nel', 'nella', 'nei',
  'sono', 'come', 'quale', 'quali', 'questo', 'questa', 'queste', 'questi',
  'alla', 'allo', 'agli', 'alle', 'dal', 'dalla', 'più', 'anche', 'se', 'ma',
  'sia', 'essere', 'viene', 'seguenti', 'seguente', 'rispetto', 'ciascun',
]);
const EN_STOPWORDS = new Set([
  'the', 'of', 'and', 'is', 'are', 'which', 'that', 'with', 'for', 'from',
  'this', 'these', 'those', 'following', 'what', 'was', 'were', 'have', 'has',
  'been', 'their', 'they', 'its', 'each', 'both', 'only', 'than', 'then',
  'when', 'where', 'while', 'about', 'into', 'between', 'because', 'does',
]);

/** Toglie i tag HTML sostituendoli con uno spazio (a indici, per evitare sonarjs/slow-regex). */
function stripTags(input: string): string {
  let result = '';
  let cursor = 0;
  let open = input.indexOf('<');
  while (open !== -1) {
    const close = input.indexOf('>', open);
    if (close === -1) break;
    result += input.slice(cursor, open) + ' ';
    cursor = close + 1;
    open = input.indexOf('<', cursor);
  }
  return result + input.slice(cursor);
}

function plainText(raw: string): string {
  // Classi negate senza quantificatori annidati: match lineare, nessun rischio ReDoS.
  const withoutImages = raw.replace(/\\includegraphics[^{]*\{[^}]*\}/g, ' ');
  return stripTags(withoutImages)
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}$\\]/g, ' ')
    .toLowerCase();
}

function score(text: string) {
  const words = plainText(text).split(/[^a-zàèéìòóùü]+/).filter(Boolean);
  let it = 0;
  let en = 0;
  for (const w of words) {
    if (IT_STOPWORDS.has(w)) it++;
    if (EN_STOPWORDS.has(w)) en++;
  }
  return { it, en, words: words.length };
}

async function main() {
  console.log(`\n🔎 Audit lingua delle domande  [SOLA LETTURA]  env=${ENV_FILE}\n`);

  const questions = await prisma.question.findMany({
    select: {
      id: true, text: true, language: true, type: true, status: true, source: true,
      subject: { select: { name: true } },
      answers: { select: { text: true } },
    },
  });
  console.log(`Domande esaminate: ${questions.length} (tutti i tipi, testo + risposte)\n`);

  const wrongLabel: Array<{ id: string; declared: string; it: number; en: number; extract: string; subject: string; status: string }> = [];
  const tooShort: string[] = [];

  for (const q of questions) {
    const blob = [q.text, ...q.answers.map((a) => a.text)].join(' \n ');
    const s = score(blob);

    // Testo troppo povero di parole funzionali (formule, tabelle): non decidibile.
    if (s.words < 8 || (s.it === 0 && s.en === 0)) { tooShort.push(q.id); continue; }

    const looksEnglish = s.en >= 3 && s.it === 0;
    const looksItalian = s.it >= 3 && s.en === 0;

    if ((q.language === 'IT' && looksEnglish) || (q.language === 'EN' && looksItalian)) {
      wrongLabel.push({
        id: q.id,
        declared: q.language,
        it: s.it,
        en: s.en,
        subject: q.subject?.name ?? 'senza materia',
        status: q.status,
        extract: plainText(q.text).replace(/\s+/g, ' ').trim().slice(0, 100),
      });
    }
  }

  const itButEn = wrongLabel.filter((w) => w.declared === 'IT');
  const enButIt = wrongLabel.filter((w) => w.declared === 'EN');

  console.log('📊 Esito');
  console.log(`   🔴 Etichettate IT ma il testo è INGLESE: ${itButEn.length}`);
  console.log(`   🟠 Etichettate EN ma il testo è ITALIANO: ${enButIt.length}`);
  console.log(`   ⚪ Non decidibili (formule/tabelle, poco testo): ${tooShort.length}`);

  const show = (label: string, rows: typeof wrongLabel) => {
    if (rows.length === 0) return;
    console.log(`\n--- ${label} ---`);
    for (const r of rows.slice(0, 40)) {
      console.log(`  [${r.id}] ${r.subject} · ${r.status} (it:${r.it} en:${r.en})`);
      console.log(`      ${r.extract}`);
    }
    if (rows.length > 40) console.log(`  ... e altre ${rows.length - 40}`);
  };

  show('Etichettate IT, testo inglese', itButEn);
  show('Etichettate EN, testo italiano', enButIt);

  if (wrongLabel.length > 0) {
    console.log('\n💡 Come correggerle: apri ciascuna domanda e cambia il campo "Lingua".');
    for (const r of wrongLabel) {
      console.log(`   /domande/${r.id}/modifica  →  ${r.declared} da correggere in ${r.declared === 'IT' ? 'EN' : 'IT'}`);
    }
    // NB: --fix-language di fix-cineca-question-content.ts NON serve qui. Rietichetta
    // solo IT→EN e solo per le domande che la sua euristica (26 parole, solo q.text)
    // riconosce: queste non le vede, e --only-ids non basta a forzarlo.
  }
  console.log('\nℹ️  Nessuna modifica scritta.\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
