/**
 * Diagnostica + riparazione contenuti domande CINECA/legacy.
 *
 * Nasce dalle segnalazioni studenti: "parte mancante nella domanda", "non si
 * vedono le risposte", "è in inglese anche se ho messo italiano". Le domande
 * importate da Firestore/CINECA hanno tre problemi ricorrenti:
 *
 *  1. IMMAGINI multiple perse. Una domanda con DUE figure (es. tabella dati +
 *     legenda "Key") tiene una figura in `imageUrl` e l'altra inline nel testo
 *     come \includegraphics{nome-nudo.png}. Il renderer scarta i nomi nudi
 *     (darebbero un 403), quindi la seconda figura sparisce. Il vecchio script
 *     di riparazione NON toccava i riferimenti inline quando il record aveva
 *     già un imageUrl (guardia `!hasImageUrl`), perciò le domande a due figure
 *     restavano rotte. Qui i riferimenti inline vengono SEMPRE risolti, con
 *     deduplica: se puntano allo stesso file di imageUrl vengono rimossi (niente
 *     doppioni), se puntano a un file diverso vengono riscritti con signed URL.
 *
 *  2. IMMAGINI solo in imageStoragePath. Alcune risposte/domande hanno l'immagine
 *     solo come path Firebase (imageUrl nullo). Da v1.14.x il renderer applica il
 *     fallback (questionImageSource), ma lo script le riporta comunque per
 *     visibilità.
 *
 *  3. LINGUA mal etichettata. La migrazione non impostava `language`, quindi ogni
 *     domanda CINECA è rimasta sul default IT anche quando il testo è inglese.
 *     Le simulazioni "solo italiano" pescano così domande EN. Lo script segnala
 *     (e con --fix-language rietichetta) le domande IT il cui testo sembra inglese.
 *
 * MODALITÀ
 *   default (dry-run): solo diagnostica, NESSUNA scrittura su DB/Storage.
 *   --run            : applica le riparazioni immagini.
 *   --fix-language   : rietichetta come EN le domande IT che sembrano inglesi
 *                      (attivo solo insieme a --run).
 *
 * Usage:
 *   pnpm tsx scripts/fix-cineca-question-content.ts                    # diagnostica (dry-run) su prod
 *   pnpm tsx scripts/fix-cineca-question-content.ts --env=.env.test    # diagnostica su test
 *   pnpm tsx scripts/fix-cineca-question-content.ts --run              # ripara immagini (prod)
 *   pnpm tsx scripts/fix-cineca-question-content.ts --run --fix-language
 *   pnpm tsx scripts/fix-cineca-question-content.ts --run --limit=20
 *
 * NB: la risoluzione immagini richiede le credenziali Firebase (come lo storico
 * scripts/fix-answer-image-urls.ts). Se mancano, le sole verifiche su DB
 * (risposte placeholder, lingua, presenza di riferimenti inline) girano lo stesso.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ENV_FILE = process.argv.find(a => a.startsWith('--env='))?.split('=')[1] ?? '.env.production';
config({ path: resolve(__dirname, `../env/${ENV_FILE}`) });

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const DRY_RUN = !process.argv.includes('--run');
const FIX_LANGUAGE = process.argv.includes('--fix-language');
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '0');
// Rietichettatura lingua chirurgica: se valorizzato, --fix-language agisce SOLO su questi id.
const ONLY_IDS = new Set(
  (process.argv.find(a => a.startsWith('--only-ids='))?.split('=')[1] ?? '')
    .split(',').map(s => s.trim()).filter(Boolean)
);

// ── DB ─────────────────────────────────────────────────────────────────────
const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error(`❌ Nessun DATABASE_URL in env/${ENV_FILE}`);
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: dbUrl }) });

// ── Firebase (opzionale: senza credenziali si saltano le verifiche su Storage) ──
let bucket: ReturnType<ReturnType<typeof getStorage>['bucket']> | null = null;
let bucketName = '(nessuno)';
function initFirebase(): boolean {
  let serviceAccount: Record<string, unknown>;
  const credPath = join(process.cwd(), 'leonardo-school-service-account.json');
  if (existsSync(credPath)) {
    serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));
  } else if (process.env.FIREBASE_LEGACY_SERVICE_ACCOUNT_KEY) {
    serviceAccount = JSON.parse(process.env.FIREBASE_LEGACY_SERVICE_ACCOUNT_KEY);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    try { serviceAccount = JSON.parse(raw); }
    catch { serviceAccount = JSON.parse(raw.replace(/\r?\n/g, '\\n')); }
  } else {
    return false;
  }
  bucketName = `${serviceAccount.project_id as string}.appspot.com`;
  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount), storageBucket: bucketName });
  }
  bucket = getStorage().bucket();
  return true;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const INCLUDE_RE = /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g;

function isRelativeRef(ref: string | null | undefined): ref is string {
  return !!ref && !/^(https?:|data:|blob:)/i.test(ref.trim());
}

/** Escape per usare una stringa arbitraria dentro una RegExp. */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** RegExp ancorata che matcha \includegraphics[...]{ref} per un ref specifico. */
function includeRefRe(ref: string): RegExp {
  return new RegExp(`\\\\includegraphics(?:\\[[^\\]]*\\])?\\{${escapeRe(ref)}\\}`, 'g');
}

/** "24e80a.png" → "24e80a" (chiave cartella nell'archivio __uploads). */
function shortIdOf(ref: string): string {
  const base = ref.trim().replace(/^\//, '').split('/').pop() ?? '';
  return base.replace(/\.[a-z0-9]+$/i, '');
}

/** Rimuove i tag HTML (classe negata a match singolo → complessità lineare). */
function stripTags(s: string, replacement = ' '): string {
  // eslint-disable-next-line sonarjs/slow-regex -- pattern lineare, nessun rischio ReDoS
  return s.replace(/<[^>]+>/g, replacement);
}

/** Testo "pulito": via tag HTML, comandi LaTeX e includegraphics, per l'euristica lingua. */
function plainText(text: string): string {
  return stripTags(text.replace(INCLUDE_RE, ' '))
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}$\\]/g, ' ')
    .toLowerCase();
}

// Parole indicative della lingua tenute in Set (invece di grandi alternanze regex,
// che sforerebbero il limite di complessità di sonarjs — stesso approccio di MATH_CMDS in latex.ts).
const EN_WORDS = new Set([
  'which', 'the', 'following', 'shown', 'answer', 'answers', 'cell', 'cells',
  'question', 'these', 'does', 'not', 'correct', 'figure', 'table', 'amino',
  'acid', 'water', 'below', 'above', 'line', 'encloses', 'structure',
  'experiment', 'results', 'happen',
]);
const IT_WORDS = new Set([
  'domanda', 'figura', 'tabella', 'acqua', 'linea', 'struttura', 'delle',
  'degli', 'della', 'nella', 'sono', 'come', 'questo', 'questa', 'quale', 'quali',
]);
const IT_PREFIXES = ['seguent', 'mostrat', 'rispost', 'cellul', 'corrett', 'esperiment', 'risultat'];

function countLangHits(words: string[], exact: Set<string>, prefixes: readonly string[]): number {
  let hits = 0;
  for (const w of words) {
    if (exact.has(w) || prefixes.some((p) => w.startsWith(p))) hits++;
  }
  return hits;
}

/** Euristica grezza: il testo sembra inglese? (per SOLO segnalare, non è infallibile) */
function looksEnglish(text: string): boolean {
  const words = plainText(text).split(/\s+/).filter(Boolean);
  const en = countLangHits(words, EN_WORDS, []);
  const it = countLangHits(words, IT_WORDS, IT_PREFIXES);
  return en >= 3 && en > it * 2;
}

/** Le risposte sono tutti placeholder tipo "row 1", "riga 2", "A", ""? */
function isPlaceholderAnswerText(text: string): boolean {
  const t = stripTags(text, '').trim().toLowerCase();
  return t === '' || /^(row|riga)\s*\d+$/.test(t) || /^[a-e]$/.test(t);
}

async function signedUrl(path: string): Promise<string> {
  const [url] = await bucket!.file(path).getSignedUrl({ action: 'read', expires: '01-01-2099' });
  return url;
}

interface DbRecord {
  id: string;
  text: string;
  imageUrl: string | null;
  imageStoragePath: string | null;
}

async function main() {
  const hasFirebase = initFirebase();
  console.log(`\n🔎 Audit contenuti CINECA  [${DRY_RUN ? 'DRY-RUN / DIAGNOSTICA' : '⚠️  LIVE RUN'}]  env=${ENV_FILE}`);
  console.log(`   Storage Firebase: ${hasFirebase ? bucketName : 'NON disponibile (verifiche immagini saltate)'}\n`);

  // Indice file Storage (solo se Firebase disponibile) ------------------------
  const byShortId = new Map<string, string[]>();
  const byRelPath = new Set<string>();
  if (hasFirebase) {
    console.log('Indicizzo schools/leonardo/__uploads/ ...');
    let pageToken: string | undefined = undefined;
    do {
      const resp = await bucket!.getFiles({
        prefix: 'schools/leonardo/__uploads/',
        maxResults: 5000,
        pageToken,
        autoPaginate: false,
      }) as unknown as [Array<{ name: string }>, { pageToken?: string } | null];
      for (const f of resp[0]) {
        byRelPath.add(f.name);
        const parts = f.name.split('/');
        if (parts.length >= 2) {
          const key = parts[parts.length - 2];
          const list = byShortId.get(key) ?? [];
          list.push(f.name);
          byShortId.set(key, list);
        }
      }
      pageToken = (resp[1] || undefined)?.pageToken;
    } while (pageToken);
    console.log(`Indice pronto: ${byRelPath.size} file, ${byShortId.size} cartelle.\n`);
  }

  /** Risolve un riferimento relativo a un path esistente in Storage, o null. */
  async function resolveRef(ref: string): Promise<string | null> {
    if (!hasFirebase) return null;
    const clean = ref.trim().replace(/^\//, '').replace(/\/{2,}/g, '/').replace(/^_system\//, '__system/');
    for (const candidate of [clean, `schools/leonardo/${clean}`]) {
      if (byRelPath.has(candidate)) return candidate;
    }
    if (clean.includes('/')) {
      for (const candidate of [clean, `schools/leonardo/${clean}`]) {
        const [exists] = await bucket!.file(candidate).exists();
        if (exists) return candidate;
      }
      const parts = clean.split('/');
      const folderId = parts.length >= 2 ? parts[parts.length - 2] : '';
      const byFolder = folderId ? (byShortId.get(folderId) ?? []) : [];
      if (byFolder.length >= 1) return byFolder[0];
      return null;
    }
    const matches = byShortId.get(shortIdOf(clean)) ?? [];
    return matches.length >= 1 ? matches[0] : null;
  }

  // Backup dei valori PRIMA della modifica (solo in live run) → rollback possibile.
  const backups: Array<{ kind: 'answer' | 'question'; id: string; before: DbRecord }> = [];

  const signedCache = new Map<string, string>();
  async function signedFor(path: string): Promise<string> {
    let url = signedCache.get(path);
    if (!url) { url = await signedUrl(path); signedCache.set(path, url); }
    return url;
  }

  const stats = {
    imageUrlFixed: 0, inlineFixed: 0, inlineDeduped: 0, unresolved: 0,
    onlyStoragePath: 0, twoFigure: 0, placeholderQ: 0, langMismatch: 0, langFixed: 0,
  };
  const report = {
    unresolved: [] as string[],
    twoFigure: [] as string[],
    placeholder: [] as string[],
    langMismatch: [] as string[],
    onlyStoragePath: [] as string[],
  };

  /**
   * Ripara un record: imageUrl relativo → signed URL; riferimenti inline nudi →
   * signed URL SE puntano a un file diverso da imageUrl (due figure), altrimenti
   * rimossi (deduplica). Aggiorna gli stats sia in dry-run che in live.
   */
  async function repairRecord(rec: DbRecord, kind: 'answer' | 'question') {
    const data: { imageUrl?: string; imageStoragePath?: string; text?: string } = {};

    // 1) imageUrl relativo → risolvi
    let imageUrlPath: string | null = null;
    let hasHttpImageUrl = !!rec.imageUrl && !isRelativeRef(rec.imageUrl);
    if (isRelativeRef(rec.imageUrl)) {
      imageUrlPath = await resolveRef(rec.imageUrl);
      if (imageUrlPath) {
        data.imageUrl = await signedFor(imageUrlPath);
        data.imageStoragePath = imageUrlPath;
        hasHttpImageUrl = true;
        stats.imageUrlFixed++;
      } else {
        stats.unresolved++;
        report.unresolved.push(`${kind} ${rec.id}: imageUrl "${rec.imageUrl}"`);
      }
    } else if (rec.imageUrl) {
      // imageUrl è già un URL http: proviamo comunque a capire a quale file punta
      imageUrlPath = rec.imageStoragePath ?? null;
    }

    // 2) riferimenti inline: SEMPRE risolti, con deduplica sul file di imageUrl
    const bareRefs = [...rec.text.matchAll(INCLUDE_RE)].map(m => m[1].trim()).filter(isRelativeRef);
    if (bareRefs.length > 0) {
      let newText = rec.text;
      let changed = false;
      let keptDistinct = false;
      for (const ref of bareRefs) {
        const path = await resolveRef(ref);
        if (!path) {
          stats.unresolved++;
          report.unresolved.push(`${kind} ${rec.id}: inline "${ref}"`);
          continue;
        }
        if (imageUrlPath && path === imageUrlPath) {
          // stessa figura già in imageUrl → rimuovi il riferimento inline (no doppione)
          newText = newText.replace(includeRefRe(ref), '');
          changed = true;
          stats.inlineDeduped++;
        } else {
          // figura DIVERSA (es. tabella accanto alla legenda) → riscrivi con signed URL,
          // sostituendo SOLO dentro \includegraphics{} (ancorato: nomi generici come
          // "image.png" non toccano il testo in prosa).
          const url = await signedFor(path);
          newText = newText.replace(includeRefRe(ref), `\\includegraphics{${url}}`);
          changed = true;
          keptDistinct = true;
          stats.inlineFixed++;
        }
      }
      if (changed) data.text = newText;
      if (keptDistinct && hasHttpImageUrl) {
        stats.twoFigure++;
        report.twoFigure.push(`${kind} ${rec.id}`);
      }
    }

    if (!DRY_RUN && Object.keys(data).length > 0) {
      backups.push({ kind, id: rec.id, before: rec });
      if (kind === 'answer') await prisma.questionAnswer.update({ where: { id: rec.id }, data });
      else await prisma.question.update({ where: { id: rec.id }, data });
    }
  }

  const imageWhere = {
    OR: [
      { AND: [{ imageUrl: { not: null } }, { NOT: { imageUrl: { startsWith: 'http' } } }, { NOT: { imageUrl: { startsWith: 'data:' } } }] },
      { text: { contains: 'includegraphics' } },
    ],
  };

  // --- IMMAGINI: risposte -----------------------------------------------------
  const answers = await prisma.questionAnswer.findMany({
    where: imageWhere,
    select: { id: true, text: true, imageUrl: true, imageStoragePath: true },
    ...(LIMIT > 0 ? { take: LIMIT } : {}),
  });
  console.log(`Risposte con riferimenti immagine da esaminare: ${answers.length}`);
  for (const a of answers) await repairRecord(a, 'answer');

  // --- IMMAGINI: domande ------------------------------------------------------
  const questions = await prisma.question.findMany({
    where: imageWhere,
    select: { id: true, text: true, imageUrl: true, imageStoragePath: true },
    ...(LIMIT > 0 ? { take: LIMIT } : {}),
  });
  console.log(`Domande con riferimenti immagine da esaminare: ${questions.length}`);
  for (const q of questions) await repairRecord(q, 'question');

  // --- SOLO imageStoragePath (nessun imageUrl) -------------------------------
  const onlyStorage = await prisma.questionAnswer.count({
    where: { imageUrl: null, imageStoragePath: { not: null } },
  });
  const onlyStorageQ = await prisma.question.count({
    where: { imageUrl: null, imageStoragePath: { not: null } },
  });
  stats.onlyStoragePath = onlyStorage + onlyStorageQ;

  // --- RISPOSTE placeholder (domande a scelta i cui testi sono tutti "row N"/"A") ---
  const choiceQuestions = await prisma.question.findMany({
    where: { type: { in: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE'] } },
    select: {
      id: true, text: true, language: true, imageUrl: true, imageStoragePath: true,
      answers: { select: { text: true, imageUrl: true, imageStoragePath: true } },
    },
    ...(LIMIT > 0 ? { take: LIMIT } : {}),
  });
  for (const q of choiceQuestions) {
    const answersAllPlaceholder =
      q.answers.length > 0 &&
      q.answers.every(a => isPlaceholderAnswerText(a.text) && !a.imageUrl && !a.imageStoragePath);
    if (answersAllPlaceholder) {
      stats.placeholderQ++;
      report.placeholder.push(q.id);
    }
    // --- LINGUA: etichetta IT ma testo inglese ---
    if (q.language === 'IT' && looksEnglish(q.text)) {
      stats.langMismatch++;
      report.langMismatch.push(q.id);
      const inScope = ONLY_IDS.size === 0 || ONLY_IDS.has(q.id);
      if (!DRY_RUN && FIX_LANGUAGE && inScope) {
        await prisma.question.update({ where: { id: q.id }, data: { language: 'EN' } });
        stats.langFixed++;
      }
    }
  }

  // ── Backup (live run) ───────────────────────────────────────────────────────
  if (!DRY_RUN && backups.length > 0) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(process.cwd(), 'scripts', `.backup-cineca-${ENV_FILE.replace(/^\./, '')}-${stamp}.json`);
    writeFileSync(backupPath, JSON.stringify(backups, null, 2), 'utf8');
    console.log(`\n💾 Backup dei ${backups.length} record modificati salvato in: ${backupPath}`);
  }

  // ── Report ─────────────────────────────────────────────────────────────────
  const show = (label: string, ids: string[]) => {
    if (!ids.length) return;
    console.log(`\n${label} (${ids.length}):`);
    for (const id of ids.slice(0, 40)) console.log('  -', id);
    if (ids.length > 40) console.log(`  ... e altri ${ids.length - 40}`);
  };

  console.log(`\n📊 Esito [${DRY_RUN ? 'DRY-RUN' : 'LIVE'}]`);
  console.log(`   Immagini imageUrl risolte:         ${stats.imageUrlFixed}`);
  console.log(`   Riferimenti inline riscritti:      ${stats.inlineFixed}  (figure DISTINTE recuperate)`);
  console.log(`   Riferimenti inline deduplicati:    ${stats.inlineDeduped}`);
  console.log(`   Domande a DUE figure recuperate:   ${stats.twoFigure}   ← il caso "parte mancante" (es. Beetroot)`);
  console.log(`   Riferimenti IRRISOLTI (file assenti): ${stats.unresolved}  ← vanno ricaricati a mano`);
  console.log(`   Record con solo imageStoragePath:  ${stats.onlyStoragePath}  (ora coperti dal fallback renderer)`);
  console.log(`   Domande con risposte placeholder:  ${stats.placeholderQ}  ← verificare che l'immagine tabella sia presente`);
  console.log(`   Lingua IT ma testo inglese:        ${stats.langMismatch}${FIX_LANGUAGE && !DRY_RUN ? ` (rietichettate: ${stats.langFixed})` : ''}`);

  show('🔴 Riferimenti irrisolti (file non trovato in Storage)', report.unresolved);
  show('🟠 Domande "parte mancante" (due figure, tabella recuperata)', report.twoFigure);
  show('🟡 Domande con risposte placeholder', report.placeholder);
  show('🔵 Domande IT con testo probabilmente inglese', report.langMismatch);

  if (DRY_RUN) {
    console.log('\nℹ️  DRY-RUN: nessuna modifica scritta. Rilancia con --run per applicare le riparazioni immagini');
    console.log('   (aggiungi --fix-language per rietichettare le domande IT→EN individuate).');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
