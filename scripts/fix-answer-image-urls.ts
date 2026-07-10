/**
 * Riparazione immagini domande/risposte (CINECA e legacy).
 *
 * Problema: le risposte importate da CINECA hanno imageUrl con un nome file "nudo"
 * (es. "24e80a.png") e/o un riferimento inline \includegraphics{24e80a.png} nel testo.
 * Il file reale vive in Storage come schools/leonardo/__uploads/<batch>/<id>/image.png
 * (dove <id> = nome senza estensione). Inoltre gli URL senza token rispondono 403,
 * quindi ogni riferimento relativo va convertito in una signed URL.
 *
 * Cosa fa:
 *  1. Indicizza i file sotto schools/leonardo/__uploads/ per <id> di cartella.
 *  2. Per ogni risposta/domanda con imageUrl relativo: risolve il file, genera una
 *     signed URL (scadenza 2099) e aggiorna imageUrl + imageStoragePath.
 *  3. Per i riferimenti inline \includegraphics{nome-nudo} nel testo di record SENZA
 *     imageUrl: riscrive il riferimento con la signed URL così il renderer lo mostra.
 *
 * Usage:
 *   pnpm tsx scripts/fix-answer-image-urls.ts                 # dry-run
 *   pnpm tsx scripts/fix-answer-image-urls.ts --run           # esecuzione reale
 *   pnpm tsx scripts/fix-answer-image-urls.ts --run --limit=20
 *   pnpm tsx scripts/fix-answer-image-urls.ts --env=.env.test
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ENV_FILE = process.argv.find(a => a.startsWith('--env='))?.split('=')[1] ?? '.env.production';
config({ path: resolve(__dirname, `../env/${ENV_FILE}`) });

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const DRY_RUN = !process.argv.includes('--run');
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '0');

// ── DB ─────────────────────────────────────────────────────────────────────
const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error(`❌ Nessun DATABASE_URL in env/${ENV_FILE}`);
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: dbUrl }) });

// ── Firebase ───────────────────────────────────────────────────────────────
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
  console.error('❌ Credenziali Firebase non trovate.');
  process.exit(1);
}
const bucketName = `${serviceAccount.project_id as string}.appspot.com`;
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount), storageBucket: bucketName });
}
const bucket = getStorage().bucket();

// ── Helpers ────────────────────────────────────────────────────────────────

const INCLUDE_RE = /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g;

function isRelativeRef(ref: string | null | undefined): ref is string {
  return !!ref && !/^(https?:|data:|blob:)/i.test(ref.trim());
}

/** "24e80a.png" → "24e80a" (chiave cartella nell'archivio __uploads). */
function shortIdOf(ref: string): string {
  const base = ref.trim().replace(/^\//, '').split('/').pop() ?? '';
  return base.replace(/\.[a-z0-9]+$/i, '');
}

async function signedUrl(path: string): Promise<string> {
  const [url] = await bucket.file(path).getSignedUrl({ action: 'read', expires: '01-01-2099' });
  return url;
}

async function main() {
  console.log(`\n🖼️  Fix immagini risposte/domande  [${DRY_RUN ? 'DRY-RUN' : '⚠️  LIVE RUN'}]  bucket=${bucketName}  env=${ENV_FILE}\n`);

  // 1) Indice dei file legacy: shortId (nome cartella) → path completi
  console.log('Indicizzo schools/leonardo/__uploads/ ...');
  const byShortId = new Map<string, string[]>();
  const byRelPath = new Set<string>();
  let pageToken: string | undefined = undefined;
  do {
    const resp = await bucket.getFiles({
      prefix: 'schools/leonardo/__uploads/',
      maxResults: 5000,
      pageToken,
      autoPaginate: false,
    }) as unknown as [Array<{ name: string }>, { pageToken?: string } | null];
    for (const f of resp[0]) {
      byRelPath.add(f.name);
      const parts = f.name.split('/');
      // .../<batch>/<shortId>/image.png → chiave = <shortId>
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

  /** Risolve un riferimento relativo a un path esistente in Storage, o null. */
  async function resolveRef(ref: string): Promise<string | null> {
    // Molti path legacy hanno slash doppi/tripli (batch mancante): normalizza
    const clean = ref.trim().replace(/^\//, '').replace(/\/{2,}/g, '/')
      // ref legacy con un solo underscore per la cartella di sistema
      .replace(/^_system\//, '__system/');
    // Path con slash: prova diretto e con prefisso schools/leonardo/
    for (const candidate of [clean, `schools/leonardo/${clean}`]) {
      if (byRelPath.has(candidate)) return candidate;
    }
    if (clean.includes('/')) {
      for (const candidate of [clean, `schools/leonardo/${clean}`]) {
        const [exists] = await bucket.file(candidate).exists();
        if (exists) return candidate;
      }
      // Il batch nel path può essere andato perso: cerca per id cartella (penultimo segmento)
      const parts = clean.split('/');
      const folderId = parts.length >= 2 ? parts[parts.length - 2] : '';
      const byFolder = folderId ? (byShortId.get(folderId) ?? []) : [];
      if (byFolder.length === 1) return byFolder[0];
      if (byFolder.length > 1) {
        console.log(`  ⚠️  ambiguo (${byFolder.length} candidati) per "${ref}": uso ${byFolder[0]}`);
        return byFolder[0];
      }
      return null;
    }
    // Nome nudo: cerca la cartella con quell'id
    const matches = byShortId.get(shortIdOf(clean)) ?? [];
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      console.log(`  ⚠️  ambiguo (${matches.length} candidati) per "${ref}": uso ${matches[0]}`);
      return matches[0];
    }
    return null;
  }

  const stats = { answersFixed: 0, answersTextFixed: 0, questionsFixed: 0, questionsTextFixed: 0, unresolved: 0 };
  const unresolvedRefs: string[] = [];

  // Cache signed URL per path (più risposte possono condividere lo stesso file)
  const signedCache = new Map<string, string>();
  async function signedFor(path: string): Promise<string> {
    let url = signedCache.get(path);
    if (!url) {
      url = await signedUrl(path);
      signedCache.set(path, url);
    }
    return url;
  }

  /**
   * Ripara un record (risposta o domanda): imageUrl relativo → signed URL;
   * riferimenti inline nudi nel testo → signed URL solo se il record resta senza imageUrl.
   */
  async function repairRecord(rec: { id: string; text: string; imageUrl: string | null; imageStoragePath: string | null }, kind: 'answer' | 'question') {
    const data: { imageUrl?: string; imageStoragePath?: string; text?: string } = {};

    let hasImageUrl = !!rec.imageUrl && !isRelativeRef(rec.imageUrl);
    if (isRelativeRef(rec.imageUrl)) {
      const path = await resolveRef(rec.imageUrl);
      if (path) {
        data.imageUrl = await signedFor(path);
        data.imageStoragePath = path;
        hasImageUrl = true;
      } else {
        stats.unresolved++;
        unresolvedRefs.push(`${kind} ${rec.id}: imageUrl "${rec.imageUrl}"`);
      }
    }

    // Riferimenti inline nel testo
    const refs = [...rec.text.matchAll(INCLUDE_RE)].map(m => m[1].trim());
    const bareRefs = refs.filter(isRelativeRef);
    if (bareRefs.length > 0 && !hasImageUrl) {
      let newText = rec.text;
      let replaced = false;
      for (const ref of bareRefs) {
        const path = await resolveRef(ref);
        if (path) {
          newText = newText.split(ref).join(await signedFor(path));
          replaced = true;
        } else {
          stats.unresolved++;
          unresolvedRefs.push(`${kind} ${rec.id}: inline "${ref}"`);
        }
      }
      if (replaced) data.text = newText;
    }

    if (Object.keys(data).length === 0) return;

    if (kind === 'answer') {
      if (data.text) stats.answersTextFixed++;
      if (data.imageUrl) stats.answersFixed++;
      if (!DRY_RUN) await prisma.questionAnswer.update({ where: { id: rec.id }, data });
    } else {
      if (data.text) stats.questionsTextFixed++;
      if (data.imageUrl) stats.questionsFixed++;
      if (!DRY_RUN) await prisma.question.update({ where: { id: rec.id }, data });
    }
  }

  // 2) Risposte con imageUrl relativo o riferimento inline nel testo
  const answers = await prisma.questionAnswer.findMany({
    where: {
      OR: [
        { AND: [{ imageUrl: { not: null } }, { NOT: { imageUrl: { startsWith: 'http' } } }, { NOT: { imageUrl: { startsWith: 'data:' } } }] },
        { text: { contains: 'includegraphics' } },
      ],
    },
    select: { id: true, text: true, imageUrl: true, imageStoragePath: true },
    ...(LIMIT > 0 ? { take: LIMIT } : {}),
  });
  console.log(`Risposte da esaminare: ${answers.length}`);
  for (const a of answers) await repairRecord(a, 'answer');

  // 3) Domande con imageUrl relativo o riferimento inline nel testo
  const questions = await prisma.question.findMany({
    where: {
      OR: [
        { AND: [{ imageUrl: { not: null } }, { NOT: { imageUrl: { startsWith: 'http' } } }, { NOT: { imageUrl: { startsWith: 'data:' } } }] },
        { text: { contains: 'includegraphics' } },
      ],
    },
    select: { id: true, text: true, imageUrl: true, imageStoragePath: true },
    ...(LIMIT > 0 ? { take: LIMIT } : {}),
  });
  console.log(`Domande da esaminare: ${questions.length}`);
  for (const q of questions) await repairRecord(q, 'question');

  console.log(`\n📊 Risultato [${DRY_RUN ? 'DRY-RUN' : 'LIVE'}]:
   Risposte:  imageUrl riparati ${stats.answersFixed}, testi riscritti ${stats.answersTextFixed}
   Domande:   imageUrl riparati ${stats.questionsFixed}, testi riscritti ${stats.questionsTextFixed}
   Irrisolti: ${stats.unresolved}`);
  if (unresolvedRefs.length) {
    console.log('\nRiferimenti irrisolti:');
    for (const r of unresolvedRefs.slice(0, 30)) console.log('  -', r);
    if (unresolvedRefs.length > 30) console.log(`  ... e altri ${unresolvedRefs.length - 30}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
