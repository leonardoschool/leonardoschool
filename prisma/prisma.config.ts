import { config } from 'dotenv';
import { resolve } from 'path';
import { defineConfig } from 'prisma/config';

// Carica esplicitamente il file .env dalla root del progetto
config({ path: resolve(__dirname, '../.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL not found in environment variables');
}

export default defineConfig({
  schema: resolve(__dirname, 'schema.prisma'),
  migrations: {
    path: resolve(__dirname, 'migrations'),
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
