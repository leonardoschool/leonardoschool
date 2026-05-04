'use client';

import { useEffect, useState } from 'react';
import { onIdTokenChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { trpc } from '@/lib/trpc/client';
import { getIsLoggingOut } from '@/lib/firebase/auth';

let lastSyncedUid: string | null = null;
let syncInFlightUid: string | null = null;
let syncInFlight: Promise<void> | null = null;
let logoutInFlight: Promise<void> | null = null;

async function syncAuthenticatedSession(user: FirebaseUser) {
  if (lastSyncedUid === user.uid) return;
  if (syncInFlight && syncInFlightUid === user.uid) return syncInFlight;

  syncInFlightUid = user.uid;
  syncInFlight = (async () => {
    const token = await user.getIdToken();
    const response = await fetch('/api/auth/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    });

    if (response.status === 404) {
      console.warn('[useAuth] User not found in database, signing out...');
      await auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });
      lastSyncedUid = null;
      globalThis.location.href = '/auth/login';
      return;
    }

    if (!response.ok) {
      throw new Error(`Auth session sync failed with status ${response.status}`);
    }

    lastSyncedUid = user.uid;
  })().finally(() => {
    if (syncInFlightUid === user.uid) {
      syncInFlightUid = null;
      syncInFlight = null;
    }
  });

  return syncInFlight;
}

async function syncSignedOutSession() {
  if (lastSyncedUid !== null && !getIsLoggingOut()) {
    logoutInFlight ??= fetch('/api/auth/logout', { method: 'POST' })
      .then(() => undefined)
      .finally(() => {
        logoutInFlight = null;
      });
    await logoutInFlight;
  }

  lastSyncedUid = null;
}

/**
 * Hook for Firebase auth state with cookie synchronization.
 * Use this only when you need to sync cookies (e.g., after login/logout).
 * For just reading user data, use trpc.auth.me.useQuery() directly.
 */
export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Get user data from database
  const { data: dbUser, isLoading: isLoadingUser } = trpc.auth.me.useQuery(undefined, {
    enabled: !!firebaseUser,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (user) => {
      setFirebaseUser(user);

      (async () => {
        try {
          if (user) {
            await syncAuthenticatedSession(user);
          } else {
            await syncSignedOutSession();
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
