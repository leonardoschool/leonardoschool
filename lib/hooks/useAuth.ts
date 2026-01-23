'use client';

import { useEffect, useState, useRef } from 'react';
import { onIdTokenChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { trpc } from '@/lib/trpc/client';
import { getIsLoggingOut } from '@/lib/firebase/auth';

/**
 * Hook for Firebase auth state with cookie synchronization.
 * Use this only when you need to sync cookies (e.g., after login/logout).
 * For just reading user data, use trpc.auth.me.useQuery() directly.
 */
export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const lastSyncedUid = useRef<string | null>(null);

  // Get user data from database
  const { data: dbUser, isLoading: isLoadingUser } = trpc.auth.me.useQuery(undefined, {
    enabled: !!firebaseUser,
  });

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (user) => {
      setFirebaseUser(user);

      (async () => {
        try {
          if (user) {
            // Only sync cookies if user changed (not on every token refresh)
            if (lastSyncedUid.current !== user.uid) {
              const token = await user.getIdToken();
              const response = await fetch('/api/auth/me', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
                cache: 'no-store',
              });
              
              // If user not found in database (404), sign out from Firebase
              if (response.status === 404) {
                console.warn('[useAuth] User not found in database, signing out...');
                await auth.signOut();
                await fetch('/api/auth/logout', { method: 'POST' });
                lastSyncedUid.current = null;
                globalThis.location.href = '/auth/login';
                return;
              }
              
              lastSyncedUid.current = user.uid;
            }
          } else {
            // Only call logout API if not already being handled by firebaseAuth.logout()
            if (lastSyncedUid.current !== null && !getIsLoggingOut()) {
              await fetch('/api/auth/logout', { method: 'POST' });
            }
            lastSyncedUid.current = null;
          }
        } catch (error) {
          console.error('[useAuth] Failed to synchronize auth session:', error);
        } finally {
          setLoading(false);
        }
      })();
    });

    return () => unsubscribe();
  }, []);

  return {
    firebaseUser,
    user: dbUser,
    loading: loading || isLoadingUser,
    isAuthenticated: !!firebaseUser,
    emailVerified: firebaseUser?.emailVerified ?? false,
  };
}
