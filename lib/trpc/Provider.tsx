'use client';

// tRPC Provider for Client Components
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState, useEffect } from 'react';
import { trpc } from './client';
import superjson from 'superjson';
import { firebaseAuth } from '@/lib/firebase/auth';
import { colors } from '@/lib/theme/colors';

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
    defaultOptions: {
      queries: {
        staleTime: 5 * 1000, // 5 seconds
        refetchOnWindowFocus: false,
        retry: (failureCount, error: any) => {
          // Don't retry on 401/403 errors
          if (error?.data?.httpStatus === 401 || error?.data?.httpStatus === 403) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/trpc`,
          transformer: superjson,
          // Add Firebase token to all requests
          async headers() {
            try {
              // Get fresh token from Firebase (works if user is logged in)
              const freshToken = await firebaseAuth.getIdToken();
              if (freshToken) {
                return {
                  authorization: `Bearer ${freshToken}`,
                };
              }
            } catch (error) {
              // Firebase not initialized or user not logged in
              console.debug('[tRPC] Could not get Firebase token');
            }
            
            // No token available - request will proceed without auth
            return {};
          },
        }),
      ],
    })
  );

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
