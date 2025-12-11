/**
 * Shared transformer for tRPC client and server
 * This ensures type consistency between client and server
 * 
 * @see https://trpc.io/docs/server/data-transformers
 * @see https://github.com/blitz-js/superjson#recipes
 */
import superjson from 'superjson';

export const transformer = superjson;
