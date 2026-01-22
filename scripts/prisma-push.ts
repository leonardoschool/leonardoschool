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
  console.log('🔄 Sincronizzazione schema Prisma con il database...\n');
  
  execSync(`prisma db push --url "${databaseUrl}"`, {
    stdio: 'inherit',
    cwd: resolve(__dirname, '..'),
  });
  
  console.log('\n✅ Schema sincronizzato con successo!');
} catch (error) {
  console.error('\n❌ Errore durante la sincronizzazione:', error);
  process.exit(1);
}
