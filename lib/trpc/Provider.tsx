'use client';

// tRPC Provider for Client Components
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { useState, useEffect } from 'react';
import { createTrpcLinks } from './links';
import { trpc } from './client';
import { firebaseAuth } from '@/lib/firebase/auth';
import { colors } from '@/lib/theme/colors';

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

  const [trpcClient] = useState(() => trpc.createClient({ links: createTrpcLinks() }));

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
