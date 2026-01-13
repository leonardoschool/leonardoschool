#!/usr/bin/env node
/**
 * Script per switchare ambiente (copia file .env appropriato)
 * 
 * Uso:
 *   pnpm env:local     → Sviluppo con Docker
 *   pnpm env:test      → Test con Neon DB
 *   pnpm env:prod      → Produzione
 *   pnpm env:current   → Mostra ambiente attivo
 */

import { copyFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const ENV_DIR = join(ROOT, 'env');
const TARGET = join(ROOT, '.env');

const ENVIRONMENTS = {
  local: join(ENV_DIR, '.env.local'),
  test: join(ENV_DIR, '.env.test'),
  prod: join(ENV_DIR, '.env.production'),
  production: join(ENV_DIR, '.env.production'),
};

const ENV_COLORS = {
  local: '\x1b[32m',      // Green
  test: '\x1b[33m',       // Yellow
  prod: '\x1b[31m',       // Red
  production: '\x1b[31m', // Red
};

const RESET = '\x1b[0m';

function getCurrentEnv(): string | null {
  if (!existsSync(TARGET)) return null;
  
  const content = readFileSync(TARGET, 'utf-8');
  
  if (content.includes('localhost:5433')) return 'local';
  if (content.includes('AMBIENTE: TEST')) return 'test';
  if (content.includes('AMBIENTE: PRODUZIONE')) return 'prod';
  if (content.includes('neon.tech') && content.includes('NODE_ENV=production')) return 'test';
  
  return 'unknown';
}

function showCurrent(): void {
  const current = getCurrentEnv();
  
  if (!current) {
    console.log('\n⚠️  Nessun ambiente attivo (.env non esiste)');
    console.log('   Esegui: pnpm env:local\n');
    return;
  }
  
  const color = ENV_COLORS[current as keyof typeof ENV_COLORS] || '';
  console.log(`\n📍 Ambiente attivo: ${color}${current.toUpperCase()}${RESET}\n`);
  
  // Show key info
  const content = readFileSync(TARGET, 'utf-8');
  const dbMatch = content.match(/DATABASE_URL="([^"]+)"/);
  const appUrlMatch = content.match(/NEXT_PUBLIC_APP_URL=([^\n]+)/);
  
  if (dbMatch) {
    const db = dbMatch[1];
    if (db.includes('localhost')) {
      console.log('   Database: Docker locale (localhost:5433)');
    } else if (db.includes('neon.tech')) {
      console.log('   Database: Neon PostgreSQL (cloud)');
    } else {
      console.log(`   Database: ${db.substring(0, 50)}...`);
    }
  }
  
  if (appUrlMatch) {
    console.log(`   App URL: ${appUrlMatch[1]}`);
  }
  
  // Show email config
  const smtpHostMatch = content.match(/^SMTP_HOST="([^"]+)"/m);
  if (smtpHostMatch) {
    console.log(`   Email: ✅ SMTP configurato (${smtpHostMatch[1]})`);
  } else {
    console.log('   Email: ⚠️  SMTP non configurato');
  }
  
  console.log('');
}

function switchEnv(env: string): void {
  const source = ENVIRONMENTS[env as keyof typeof ENVIRONMENTS];
  
  if (!source) {
    console.error(`\n❌ Ambiente "${env}" non riconosciuto`);
    console.log('\n   Ambienti disponibili:');
    console.log('   - local      Sviluppo locale (Docker)');
    console.log('   - test       Test/Staging (Neon)');
    console.log('   - prod       Produzione\n');
    process.exit(1);
  }
  
  if (!existsSync(source)) {
    console.error(`\n❌ File ${source} non trovato`);
    console.log(`   Crea il file in env/.env.${env}\n`);
    process.exit(1);
  }
  
  try {
    copyFileSync(source, TARGET);
    
    const color = ENV_COLORS[env as keyof typeof ENV_COLORS] || '';
    console.log(`\n✅ Ambiente switchato a: ${color}${env.toUpperCase()}${RESET}`);
    
    // Show warnings for production
    if (env === 'prod' || env === 'production') {
      console.log('\n   ⚠️  ATTENZIONE: Stai usando l\'ambiente di PRODUZIONE!');
      console.log('   ⚠️  Le modifiche impatteranno gli utenti reali.\n');
    }
    
    showCurrent();
    
    console.log('💡 Ricorda di riavviare il server: pnpm dev\n');
    
  } catch (error) {
    console.error(`\n❌ Errore durante lo switch: ${error}\n`);
    process.exit(1);
  }
}

// Main
const arg = process.argv[2];

if (!arg || arg === 'current' || arg === 'status') {
  showCurrent();
} else {
  switchEnv(arg);
}
