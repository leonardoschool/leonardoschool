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
    // Neon: schema changes (migrate/db push) must run over the DIRECT, non-pooled
    // connection — DDL is unreliable through the PgBouncer pooler. Vercel/Neon exposes
    // it as DATABASE_URL_UNPOOLED. Fall back to DATABASE_URL locally (Docker has no
    // separate pooler). This only affects the Prisma CLI; the app runtime keeps using
    // the pooled DATABASE_URL via lib/prisma/client.ts.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  },
});
