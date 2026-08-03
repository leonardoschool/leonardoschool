'use client';

// tRPC Provider for Client Components
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { httpBatchLink, httpLink, splitLink } from '@trpc/client';
import { TRPCClientError } from '@trpc/client';
import { useState, useEffect } from 'react';
import { transformer } from './transformer';
import { trpc } from './client';
import { firebaseAuth } from '@/lib/firebase/auth';
import { colors } from '@/lib/theme/colors';

/**
 * Ceiling on a single request. Without it a connection that stalls mid-flight
 * never settles — the browser's fetch has no timeout of its own — and a
 * mutation left pending forever freezes every piece of UI gated on it, with
 * nothing in the network tab to show for it.
 */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Bulk operations legitimately run for minutes — importing a whole PDF of
 * questions is the usual one — so they get the platform's own ceiling instead
 * of the interactive one, which they would otherwise trip on every large file.
 */
const SLOW_REQUEST_TIMEOUT_MS = 300_000;
const SLOW_PROCEDURE_PATTERN = /import|export|calibrat|bulk/i;

/**
 * Procedures that travel in an HTTP request of their own.
 *
 * Batching packs whatever calls happen to fire in the same tick into one
 * request, and that request only answers once *every* procedure in it has
 * finished. Submitting a simulation shares its moment with a heartbeat every
 * three seconds and an autosave every five, so a single slow co-passenger was
 * enough to hold back a submit that had already been written to the database:
 * the attempt was scored, the student saw a button spinning forever, and only
 * a reload revealed the test had gone through.
 */
const UNBATCHED_PROCEDURES = new Set(['simulations.submit']);

/**
 * Ceiling on the Firebase token refresh. The cached ID token is only valid for
 * an hour, so past that mark every request has to wait on a network refresh
 * before it can even be built: a refresh that hangs would hold the request
 * hostage indefinitely. Going ahead without the header instead produces a
 * clean 401 the UI can report and recover from.
 */
const TOKEN_TIMEOUT_MS = 8_000;

function timeoutSignal(url: string, existing: AbortSignal | null | undefined): AbortSignal | undefined {
  if (typeof AbortSignal.timeout !== 'function') return existing ?? undefined;
  // The batched procedure names travel in the path, so the budget can follow
  // what is actually being called
  const ms = SLOW_PROCEDURE_PATTERN.test(url) ? SLOW_REQUEST_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
  const timeout = AbortSignal.timeout(ms);
  if (!existing) return timeout;
  return typeof AbortSignal.any === 'function' ? AbortSignal.any([existing, timeout]) : existing;
}

async function getIdTokenWithTimeout(): Promise<string | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), TOKEN_TIMEOUT_MS);
    const settle = (token: string | null) => {
      clearTimeout(timer);
      resolve(token);
    };
    firebaseAuth.getIdToken().then(settle, () => settle(null));
  });
}

function isSessionInvalidatedError(error: unknown): boolean {
  return (
    error instanceof TRPCClientError &&
    (error.data as { httpStatus?: number } | undefined)?.httpStatus === 401 &&
    error.message === 'SESSIONE_TERMINATA'
  );
}

function isPermissionDeniedError(error: unknown): boolean {
  return (
    error instanceof TRPCClientError &&
    (error.data as { httpStatus?: number } | undefined)?.httpStatus === 403
  );
}

function dispatchSessionInvalidated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('session-invalidated'));
  }
}

function dispatchPermissionDenied() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('permission-denied'));
  }
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  // Wait for Firebase to be ready
  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(() => {
      setIsFirebaseReady(true);
    });
    
    // Set ready after a short timeout even if no user (for public pages)
    const timeout = setTimeout(() => setIsFirebaseReady(true), 1000);
    
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const [queryClient] = useState(() => new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (isSessionInvalidatedError(error)) dispatchSessionInvalidated();
        else if (isPermissionDeniedError(error)) dispatchPermissionDenied();
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (isSessionInvalidatedError(error)) dispatchSessionInvalidated();
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 10 * 1000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          const httpStatus = (error as { data?: { httpStatus?: number } })?.data?.httpStatus;
          // The server rejected the request itself — a wrong id, an attempt
          // already completed, a missing permission. Repeating it verbatim
          // cannot change the answer and only adds load at the worst moment.
          if (httpStatus !== undefined && httpStatus >= 400 && httpStatus < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        // React Query's default 'online' mode does not send a mutation at all
        // when the browser reports itself offline: it queues it and leaves it
        // pending. A student whose connection blipped would then sit on a
        // frozen "Consegna" button with no request ever leaving the tab, and
        // no error to act on. Better to try, fail loudly, and let them retry.
        networkMode: 'always',
      },
    },
  }));

  const [trpcClient] = useState(() => {
    const linkOptions = {
      url: typeof window !== 'undefined'
        ? `${window.location.origin}/api/trpc`
        : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/trpc`,
      // Transformer must match server config for proper serialization
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transformer: transformer as any,
      fetch(url: RequestInfo | URL, options?: RequestInit) {
        return fetch(url, {
          ...options,
          signal: timeoutSignal(String(url), options?.signal),
        });
      },
      // Add Firebase token to all requests
      async headers() {
        const freshToken = await getIdTokenWithTimeout();
        if (freshToken) {
          return {
            authorization: `Bearer ${freshToken}`,
          };
        }

        // No token available - request will proceed without auth
        return {};
      },
    };

    return trpc.createClient({
      links: [
        splitLink({
          condition: (op) => UNBATCHED_PROCEDURES.has(op.path),
          true: httpLink(linkOptions),
          false: httpBatchLink(linkOptions),
        }),
      ],
    });
  });

  // Show loading while waiting for Firebase
  if (!isFirebaseReady) {
    return (
      <div className={`min-h-screen ${colors.background.primary} flex items-center justify-center`}>
        <div className="text-center">
          <div className="flex justify-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
