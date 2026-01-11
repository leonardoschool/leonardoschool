/**
 * Leonardo School Mobile - tRPC Client
 * 
 * Client tRPC per comunicare con il backend Next.js.
 * 
 * NOTA: Per la compilazione standalone del progetto mobile, usiamo un placeholder
 * per AppRouter. In produzione, dovrai:
 * 1. Esportare solo i tipi AppRouter dal server in un file separato
 * 2. Pubblicare un pacchetto @leonardoschool/api-types
 * 3. O usare un monorepo tool come Turborepo
 */

import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import superjson from 'superjson';
import { config } from './config';
import { secureStorage } from './storage';

// Placeholder type for AppRouter
// In production, this should be imported from a shared types package:
// import type { AppRouter } from '@leonardoschool/api-types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AppRouter = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

// Create tRPC React hooks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const trpcReact = createTRPCReact<AppRouter>() as any;

// Export typed trpc for general use, but also raw for Provider access
export const trpc = trpcReact;

// Provider component for app layout
export const TRPCProvider = trpcReact.Provider;

// Create links with auth header
const createLinks = () => [
  httpBatchLink({
    url: config.api.trpcUrl,
    transformer: superjson,
    async headers() {
      const token = await secureStorage.getAuthToken();
      return {
        authorization: token ? `Bearer ${token}` : '',
        'x-platform': 'mobile',
      };
    },
    fetch(url, options) {
      return fetch(url, {
        ...options,
        credentials: 'include',
      });
    },
  }),
];

// Vanilla client for non-React usage
export const trpcClient = createTRPCClient<AppRouter>({
  links: createLinks(),
});

// Create tRPC client for React Query provider
export const createTRPCReactClient = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (trpc as any).createClient({
    links: createLinks(),
  });
};

// Error handling helper
export function isTRPCError(error: unknown): error is TRPCClientError<AppRouter> {
  return error instanceof TRPCClientError;
}

// Parse tRPC errors to user-friendly messages
export function parseTRPCError(error: unknown): string {
  if (isTRPCError(error)) {
    // Handle specific error codes
    switch (error.data?.code) {
      case 'UNAUTHORIZED':
        return 'Sessione scaduta. Effettua nuovamente il login.';
      case 'FORBIDDEN':
        return 'Non hai i permessi per questa azione.';
      case 'NOT_FOUND':
        return 'Risorsa non trovata.';
      case 'BAD_REQUEST':
        return error.message || 'Richiesta non valida.';
      case 'INTERNAL_SERVER_ERROR':
        return 'Errore del server. Riprova più tardi.';
      case 'TIMEOUT':
        return 'La richiesta ha impiegato troppo tempo. Riprova.';
      default:
        return error.message || 'Si è verificato un errore.';
    }
  }

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('Network request failed')) {
      return 'Connessione assente. Verifica la tua connessione internet.';
    }
    return error.message;
  }

  return 'Si è verificato un errore sconosciuto.';
}

export default trpc;
