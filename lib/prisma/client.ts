// Prisma Client Singleton
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Create PostgreSQL connection pool
const pool = globalForPrisma.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.pool = pool;
}

// Create Prisma adapter for PostgreSQL
const adapter = new PrismaPg(pool);

// Log configuration:
// - Development: only errors and warnings (query logging is too verbose)
// - Production: only errors
// To enable query logging in dev, set LOG_PRISMA_QUERIES=true
const shouldLogQueries = process.env.LOG_PRISMA_QUERIES === 'true';

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' 
      ? (shouldLogQueries ? ['query', 'error', 'warn'] : ['error', 'warn'])
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
