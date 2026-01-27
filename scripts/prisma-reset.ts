/**
 * Script per resettare il database PostgreSQL e rifare il seed
 */

import { execSync } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';

// Carica variabili d'ambiente dal file .env
config({ path: resolve(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL non trovato nel file .env');
  process.exit(1);
}

try {
  console.log('🔄 Resetting database...\n');
  
  // Execute prisma db push with force reset
  console.log('📦 Running prisma db push --force-reset...');
  // eslint-disable-next-line sonarjs/no-os-command-from-path -- dev script, PATH is trusted
  execSync('npx prisma db push --force-reset', {
    stdio: 'inherit',
    cwd: resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  
  console.log('\n✅ Database reset complete!');
  console.log('\n🌱 Running seed...\n');
  
  // Execute seed
  // eslint-disable-next-line sonarjs/no-os-command-from-path -- dev script, PATH is trusted
  execSync('npx tsx scripts/seed.ts', {
    stdio: 'inherit',
    cwd: resolve(__dirname, '..'),
    env: { ...process.env }
  });
  
  console.log('\n✅ Reset and seed complete!\n');
} catch (error) {
  console.error('\n❌ Reset failed:', error);
  process.exit(1);
}
