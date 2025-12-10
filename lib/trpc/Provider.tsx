'use client';

// tRPC Provider for Client Components
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import { trpc } from './client';
import superjson from 'superjson';
import { firebaseAuth } from '@/lib/firebase/auth';

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 1000, // 5 seconds
        refetchOnWindowFocus: false,
      },
    },
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/trpc`,
          transformer: superjson,
          // Add Firebase token from cookie to all requests
          async headers() {
            // First try to get fresh token from Firebase
            const freshToken = await firebaseAuth.getIdToken();
            if (freshToken) {
              return {
                authorization: `Bearer ${freshToken}`,
              };
            }
            
            // Fallback to cookie
            const cookies = document.cookie.split(';');
            const authCookie = cookies.find(c => c.trim().startsWith('auth-token='));
            const token = authCookie?.split('=')[1];
            
            return {
              authorization: token ? `Bearer ${token}` : '',
            };
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
