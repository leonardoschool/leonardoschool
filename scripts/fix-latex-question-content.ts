/**
 * Diagnostica + riparazione delle domande che mostrano LaTeX rosso.
 *
 * KaTeX gira con `throwOnError: false` (components/ui/RichTextRenderer.tsx): quando
 * incontra un comando inesistente non rompe la pagina, stampa il sorgente in rosso
 * (#cc0000). Allo studente arriva così una domanda con dentro `\righlefttarrows`.
 *
 * Le cause sono due e vanno tenute distinte:
 *  - CODICE: il normalizer collassava i `\\` separatori di riga dentro `\begin{array}`,
 *    fabbricando comandi inesistenti (`...20.10\\Orari` → `\Orari`). Risolto in
 *    shared/richText/latex.ts, NON serve toccare il DB per quei casi.
 *  - DATI: refusi nel sorgente importato (`\righlefttarrows` per `\rightleftharpoons`,
 *    `\newlinie` per `\newline`) e delimitatori sbilanciati (`\)` senza `\(`).
 *    Solo questi vengono riparati qui.
 *
 * MODALITÀ
 *   default (dry-run): elenca le domande rotte e le sostituzioni previste, nessuna scrittura.
 *   --run            : applica le sostituzioni.
 *   --dump           : stampa il testo grezzo attorno a ogni errore (per capire casi nuovi).
 *
 * Usage:
 *   pnpm tsx scripts/fix-latex-question-content.ts                 # dry-run su prod
 *   pnpm tsx scripts/fix-latex-question-content.ts --env=.env.test
 *   pnpm tsx scripts/fix-latex-question-content.ts --run
 */

import { config } from 'dotenv';
import { resolve, join } from 'path';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';

const ENV_FILE = process.argv.find(a => a.startsWith('--env='))?.split('=')[1] ?? '.env.production';
config({ path: resolve(__dirname, `../env/${ENV_FILE}`) });

import katex from 'katex';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { normalizeStoredRichText, sanitizeLatexForKatex } from '../shared/richText/latex';
import { renderRichTextHtml } from '../shared/richText/render';

const DRY_RUN = !process.argv.includes('--run');
const DUMP = process.argv.includes('--dump');

const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error(`❌ Nessun DATABASE_URL in env/${ENV_FILE}`);
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: dbUrl }) });

// ── Rilevamento ────────────────────────────────────────────────────────────
/**
 * Rende il testo come fa RichTextRenderer e restituisce i frammenti che KaTeX
 * ha stampato in rosso. Due forme di fallimento: comando ignoto (mathcolor #cc0000)
 * e parse dell'intero blocco fallito (span.katex-error).
 */
function findRedTokens(text: string | null | undefined): string[] {
  if (!text) return [];
  const processed = renderRichTextHtml(normalizeStoredRichText(text), (latex, displayMode) => {
    try {
      return katex
        .renderToString(sanitizeLatexForKatex(latex.trim()), { throwOnError: false, displayMode, strict: false })
        .replace(/\n/g, ' ');
    } catch {
      return '<span class="katex-error">[Errore LaTeX]</span>';
    }
  });

  const out: string[] = [];
  let m: RegExpExecArray | null;
  const reCmd = /mathcolor="#cc0000"><mtext>([\s\S]*?)<\/mtext>/g;
  while ((m = reCmd.exec(processed)) !== null) out.push(m[1].trim());
  const reBlock = /class="[^"]*katex-error[^"]*"[^>]*>([^<]*)</g;
  while ((m = reBlock.exec(processed)) !== null) out.push(m[1].trim().slice(0, 80));
  return out;
}

// ── Riparazioni (solo cause DATI) ──────────────────────────────────────────
interface Rule {
  readonly why: string;
  apply(text: string): string;
}

const RULES: Rule[] = [
  {
    why: '\\righlefttarrows → \\rightleftharpoons (refuso; freccia di equilibrio)',
    apply: t => t.replace(/\\righlefttarrows/g, '\\rightleftharpoons'),
  },
  {
    why: '\\newlinie → \\newline (refuso)',
    apply: t => t.replace(/\\newlinie/g, '\\newline'),
  },
  {
    // Su tastiera italiana '(' è shift+8: l'import ha perso lo shift.
    why: '\\8\\comando → \\(\\comando (delimitatore di apertura storpiato)',
    apply: t => t.replace(/\\8(?=\\[a-zA-Z])/g, '\\('),
  },
  {
    why: '(\\comando…\\) → \\(\\comando…\\) (apertura senza backslash)',
    apply: t => t.replace(/(?<!\\)\((\\[a-zA-Z][^()]*?)\\\)/g, '\\($1\\)'),
  },
  {
    why: '\\(\\newline) → \\(\\newline\\) (chiusura senza backslash)',
    apply: t => t.replace(/\\\(\\newline\)/g, '\\(\\newline\\)'),
  },
  {
    why: '\\(\\newline senza chiusura → \\(\\newline\\)',
    apply: t => t.replace(/\\\(\\newline(?=\n)/g, '\\(\\newline\\)'),
  },
  {
    why: '\\( doppia dentro la stessa formula → una sola apertura',
    apply: t => t.replace(/\\\(([^()]*?)\\\(/g, '\\($1'),
  },
  {
    why: '\\m / \\I → m / I (comandi inesistenti: sono variabili)',
    apply: t => t.replace(/\\m(?![a-zA-Z])/g, 'm').replace(/\\I(?![a-zA-Z])/g, 'I'),
  },
  {
    // L'esponente era troncato: ricostruito come x^2 in accordo con la risposta corretta
    // della stessa domanda (x^2 - 2x - 8 = 0) e con gli altri distrattori di secondo grado.
    why: 'x^ senza esponente → x^2',
    apply: t => t.replace(/x\^\\\)/g, 'x^2\\)'),
  },
  {
    why: '\\) orfano a inizio campo → aggiunta l\'apertura \\(',
    apply: t => {
      const close = t.indexOf('\\)');
      if (close === -1 || t.slice(0, close).includes('\\(')) return t;
      return `\\(${t}`;
    },
  },
];

function repair(text: string): { text: string; applied: string[] } {
  let out = text;
  const applied: string[] = [];
  for (const rule of RULES) {
    const next = rule.apply(out);
    if (next !== out) applied.push(rule.why);
    out = next;
  }
  return { text: out, applied };
}

// ── Main ───────────────────────────────────────────────────────────────────
function context(text: string, token: string): string {
  const needle = token.split(/\s/)[0];
  const idx = text.indexOf(needle);
  if (idx === -1) return '(token non trovato nel sorgente: prodotto dalla normalizzazione)';
  return JSON.stringify(text.slice(Math.max(0, idx - 90), idx + 130));
}

async function main() {
  console.log(`\n🔎 env/${ENV_FILE} — ${DRY_RUN ? 'DRY-RUN (nessuna scrittura)' : '⚠️  APPLICA MODIFICHE'}\n`);

  const questions = await prisma.question.findMany({
    select: {
      id: true,
      text: true,
      textLatex: true,
      description: true,
      status: true,
      answers: { select: { id: true, text: true, textLatex: true } },
    },
  });
  console.log(`Domande analizzate: ${questions.length}`);

  let brokenQuestions = 0;
  let repairedFields = 0;
  const stillBroken: string[] = [];
  // Ogni scrittura è preceduta dal salvataggio del valore originale: ripristinabile
  // riapplicando il file con una UPDATE una per una.
  const backup: { table: string; id: string; column: string; before: string; after: string }[] = [];

  for (const q of questions) {
    type Field = { table: 'question' | 'answer'; id: string; column: 'text' | 'textLatex' | 'description'; value: string };
    const fields: Field[] = [
      { table: 'question', id: q.id, column: 'text', value: q.text },
      ...(q.textLatex ? [{ table: 'question' as const, id: q.id, column: 'textLatex' as const, value: q.textLatex }] : []),
      ...(q.description ? [{ table: 'question' as const, id: q.id, column: 'description' as const, value: q.description }] : []),
      ...q.answers.flatMap(a => [
        { table: 'answer' as const, id: a.id, column: 'text' as const, value: a.text },
        ...(a.textLatex ? [{ table: 'answer' as const, id: a.id, column: 'textLatex' as const, value: a.textLatex }] : []),
      ]),
    ];

    let printedHeader = false;
    for (const f of fields) {
      const tokens = findRedTokens(f.value);
      if (!tokens.length) continue;

      if (!printedHeader) { brokenQuestions++; printedHeader = true; console.log(`\n── ${q.id} [${q.status}]`); }
      console.log(`   ${f.table}.${f.column}${f.table === 'answer' ? ` (${f.id})` : ''}: ${tokens.map(t => t.slice(0, 60)).join(' | ')}`);
      if (DUMP) console.log(`      ctx: ${context(f.value, tokens[0])}`);

      const { text: fixed, applied } = repair(f.value);
      if (fixed === f.value) { stillBroken.push(`${q.id} ${f.table}.${f.column}`); continue; }

      console.log(`      ✎ ${applied.join('; ')}`);
      const residual = findRedTokens(fixed);
      if (residual.length) console.log(`      ⚠️  residuo dopo fix: ${residual.map(t => t.slice(0, 40)).join(' | ')}`);
      repairedFields++;
      backup.push({ table: f.table, id: f.id, column: f.column, before: f.value, after: fixed });

      if (!DRY_RUN) {
        if (f.table === 'question') {
          await prisma.question.update({ where: { id: f.id }, data: { [f.column]: fixed } });
        } else {
          await prisma.questionAnswer.update({ where: { id: f.id }, data: { [f.column]: fixed } });
        }
      }
    }
  }

  if (!DRY_RUN && backup.length) {
    // Nome con timestamp: una seconda esecuzione non deve sovrascrivere il backup della prima.
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const path = join(tmpdir(), `latex-fix-backup-${ENV_FILE.replace(/^\./, '')}-${stamp}.json`);
    writeFileSync(path, JSON.stringify(backup, null, 2), 'utf8');
    console.log(`\n💾 Backup valori originali: ${path}`);
  }

  console.log(`\n─────────────────────────────`);
  console.log(`Domande con LaTeX rosso : ${brokenQuestions}`);
  console.log(`Campi riparabili        : ${repairedFields}${DRY_RUN ? ' (non scritti)' : ' (scritti)'}`);
  console.log(`Campi senza regola      : ${stillBroken.length}`);
  stillBroken.forEach(s => console.log(`  · ${s}`));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
