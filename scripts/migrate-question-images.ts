/**
 * Migrazione immagini domande: copia i file da __uploads/ a questions/images/
 * all'interno dello stesso bucket di produzione, genera una signed URL e la
 * salva su imageUrl in PostgreSQL.
 *
 * Il bucket viene derivato automaticamente dal service account (project_id.appspot.com).
 *
 * Usage:
 *   npx tsx scripts/migrate-question-images.ts             # dry-run
 *   npx tsx scripts/migrate-question-images.ts --run       # esecuzione reale
 *   npx tsx scripts/migrate-question-images.ts --run --limit=50
 *   npx tsx scripts/migrate-question-images.ts --verbose
 */

import { config } from 'dotenv';
import { resolve, extname } from 'path';
config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '../.env.local') }); // no override — .env DATABASE_URL wins

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// require() after dotenv so DATABASE_URL is set before PrismaClient initializes
// eslint-disable-next-line @typescript-eslint/no-require-imports
const prisma = (require('../lib/prisma/client') as typeof import('../lib/prisma/client')).default;

// ── CLI flags ──────────────────────────────────────────────────────────────
const DRY_RUN = !process.argv.includes('--run');
const LIMIT   = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '0');
const VERBOSE = process.argv.includes('--verbose');

// ── Firebase init ──────────────────────────────────────────────────────────
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
  console.error('❌ No Firebase credentials found.');
  process.exit(1);
}

// Derive the production bucket from the service account's project_id
const projectId = serviceAccount.project_id as string;
const bucketName = `${projectId}.appspot.com`;

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount), storageBucket: bucketName });
}

const bucket = getStorage().bucket();

// ── Helpers ────────────────────────────────────────────────────────────────

function cleanPath(raw: string): string {
  return raw.replace(/^\//, '').replace(/\/\/+/g, '/');
}

/** Returns the storage path if found, null otherwise. Tries with and without schools/leonardo/ prefix. */
async function findFile(rawPath: string): Promise<string | null> {
  const clean = cleanPath(rawPath);
  for (const candidate of [`schools/leonardo/${clean}`, clean]) {
    const [exists] = await bucket.file(candidate).exists();
    if (exists) return candidate;
  }
  return null;
}

async function signedUrl(storagePath: string): Promise<string> {
  const [url] = await bucket.file(storagePath).getSignedUrl({
    action: 'read',
    expires: '01-01-2099',
  });
  return url;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🖼️  Question image migration  [${DRY_RUN ? 'DRY-RUN — no writes' : '⚠️  LIVE RUN'}]\n`);
  console.log(`   Bucket: ${bucketName}\n`);

  // Fetch all questions that have any image field set, then filter in memory
  // to avoid Prisma quirks with NOT + startsWith combinations in OR clauses.
  const allWithImage = await prisma.question.findMany({
    where: {
      OR: [
        { imageUrl: { not: null } },
        { imageStoragePath: { not: null } },
      ],
    },
    select: { id: true, imageStoragePath: true, imageUrl: true },
  });

  // Keep only those whose imageUrl is a relative path (not yet a full http URL)
  const allNeedsMigration = allWithImage.filter(
    q => (q.imageUrl && !q.imageUrl.startsWith('http')) ||
         (q.imageStoragePath && (!q.imageUrl || !q.imageUrl.startsWith('http'))),
  );

  const questions = LIMIT > 0 ? allNeedsMigration.slice(0, LIMIT) : allNeedsMigration;

  console.log(`📚 Domande da migrare: ${questions.length}${LIMIT ? ` (limit ${LIMIT})` : ''}\n`);

  let migrated = 0, fileMissing = 0, errors = 0;

  for (const q of questions) {
    const rawPath = (q.imageUrl && !q.imageUrl.startsWith('http')
      ? q.imageUrl
      : q.imageStoragePath)!;

    const sourcePath = await findFile(rawPath);

    if (!sourcePath) {
      console.log(`  ❌ ${q.id} — file non trovato: ${rawPath}`);
      fileMissing++;
      continue;
    }

    const ext = extname(cleanPath(rawPath)) || '.png';
    const destPath = `questions/images/${q.id}${ext}`;

    if (DRY_RUN) {
      console.log(`  [DRY-RUN] ${q.id}`);
      console.log(`            ${sourcePath}`);
      console.log(`         → ${destPath}`);
      migrated++;
      continue;
    }

    try {
      await bucket.file(sourcePath).copy(bucket.file(destPath));
      const newUrl = await signedUrl(destPath);
      await prisma.question.update({
        where: { id: q.id },
        data: { imageUrl: newUrl },
      });
      if (VERBOSE) console.log(`  ✅ ${q.id} → ${destPath}`);
      migrated++;
    } catch (e) {
      console.error(`  ❌ ${q.id} — error:`, e);
      errors++;
    }
  }

  console.log(`
📊 Results:
   Migrated    : ${migrated}
   File missing: ${fileMissing}
   Errors      : ${errors}
`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
