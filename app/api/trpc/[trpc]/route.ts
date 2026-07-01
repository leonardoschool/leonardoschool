// tRPC API Route Handler
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/trpc/routers';
import { createContext } from '@/server/trpc/context';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('tRPC');

const handler = async (req: Request) => {
  let requestId: string | undefined;
  
  // Handle tRPC request with custom response handler
  const response = await fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async (opts) => {
      const ctx = await createContext(opts);
      requestId = ctx.requestId; // Capture request ID from context
      return ctx;
    },
    // Always log server-side (dev and prod) so failures are never silent for us.
    // The raw message is sanitized before reaching the client (see errorFormatter in init.ts),
    // but the full detail must stay in the server logs for debugging.
    onError: ({ path, error }) => {
      log.error(
        `Failed on ${path ?? '<no-path>'} [${error.code}]: ${error.message}`,
        error.cause ?? ''
      );
    },
  });

  // Add request ID to response headers for client-side tracking
  if (requestId) {
    const headers = new Headers(response.headers);
    headers.set('x-request-id', requestId);
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
  
  return response;
};

export { handler as GET, handler as POST };
