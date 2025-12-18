// Prisma Client Singleton
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Log configuration:
// - Development: only errors and warnings (query logging is too verbose)
// - Production: only errors
// To enable query logging in dev, set LOG_PRISMA_QUERIES=true
const shouldLogQueries = process.env.LOG_PRISMA_QUERIES === 'true';

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? (shouldLogQueries ? ['query', 'error', 'warn'] : ['error', 'warn'])
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
