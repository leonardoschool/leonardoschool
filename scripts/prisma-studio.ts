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
  console.log('🚀 Avvio Prisma Studio...');
  console.log(`📊 Database: ${databaseUrl}\n`);
  
  // Con Prisma 7, specifichiamo --config con il path corretto
  execSync('prisma studio --config ./prisma/prisma.config.ts', {
    stdio: 'inherit',
    cwd: resolve(__dirname, '..'),
  });
} catch (error) {
  console.error('\n❌ Errore durante l\'avvio di Prisma Studio:', error);
  process.exit(1);
}
