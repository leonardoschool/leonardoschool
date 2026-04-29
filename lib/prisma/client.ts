// Prisma Client Singleton
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma adapter for PostgreSQL.
// IMPORTANT: pass a PoolConfig (not a pg.Pool instance) because @prisma/adapter-pg
// uses `instanceof pg.Pool` which fails when there are duplicate pg installs in the
// dependency tree (adapter has its own nested pg). Passing a Pool object as config
// would cause pg to serialize methods/objects as startup parameters, leading to
// `ERR_INVALID_ARG_TYPE: Received an instance of Object` in the wire protocol.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

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
