import { execFileSync } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';

// Read the Vercel signals from the REAL process environment BEFORE loading .env.
// Our `env/.env.*` files contain snapshots of VERCEL_*/VERCEL_ENV (pulled via
// `vercel env pull`), so `.env.production` literally has VERCEL_ENV="production".
// If we read them after dotenv, a local `pnpm env:prod && pnpm build` would look
// like a Vercel production build and migrate prod by accident. On a real Vercel
// build the platform injects these into process.env natively, so this stays correct.
const isVercel = !!process.env.VERCEL;
const vercelEnv = process.env.VERCEL_ENV;

// Load .env afterwards only to expose DATABASE_URL(_UNPOOLED) to migrate deploy.
// On Vercel there is no .env file and dotenv simply no-ops.
config({ path: resolve(__dirname, '../.env') });

// Auto-apply migrations ONLY during a Vercel production build. We skip otherwise to
// make it impossible to mutate a remote DB by accident:
//   - Not on Vercel (local `pnpm build`): a developer might have `env:prod` active; a
//     local build must never touch a remote database. Use `pnpm prisma:migrate` instead.
//   - Vercel preview/development builds: must never apply migrations to production.
if (!isVercel) {
  console.log('⏭️  prisma:deploy — non su Vercel, salto (in locale usa pnpm prisma:migrate).');
  process.exit(0);
}

if (vercelEnv !== 'production') {
  console.log(`⏭️  prisma:deploy — build Vercel "${vercelEnv}": salto (solo "production" applica le migrazioni).`);
  process.exit(0);
}

// Invoke the Prisma CLI through the current Node binary (both absolute paths) with an
// arguments array via execFileSync: no shell is spawned and nothing is resolved from
// PATH, so there is no command-injection surface.
const prismaCli = resolve(__dirname, '../node_modules/prisma/build/index.js');

try {
  // prisma.config.ts prefers DATABASE_URL_UNPOOLED (Neon direct connection) required for DDL.
  console.log('🚀 Applico le migrazioni pendenti su produzione (migrate deploy)...');
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy', '--config', './prisma/prisma.config.ts'], {
    stdio: 'inherit',
    cwd: resolve(__dirname, '..'),
  });
  console.log('✅ Migrazioni applicate con successo.');
} catch (error) {
  console.error('❌ Errore durante migrate deploy:', error);
  process.exit(1);
}
