// tRPC API Route Handler
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/trpc/routers';
import { createContext } from '@/server/trpc/context';

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
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`
            );
          }
        : undefined,
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
