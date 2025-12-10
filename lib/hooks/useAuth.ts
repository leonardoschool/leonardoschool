'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { trpc } from '@/lib/trpc/client';

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Get user data from database
  const { data: dbUser, isLoading: isLoadingUser } = trpc.auth.me.useQuery(undefined, {
    enabled: !!firebaseUser,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      
      // Store token in cookie for middleware
      if (user) {
        user.getIdToken().then((token) => {
          document.cookie = `auth-token=${token}; path=/; max-age=3600`;
        });
      } else {
        document.cookie = 'auth-token=; path=/; max-age=0';
        document.cookie = 'user-role=; path=/; max-age=0';
        document.cookie = 'profile-completed=; path=/; max-age=0';
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Update role and profileCompleted cookies when user data is loaded
  useEffect(() => {
    if (dbUser) {
      document.cookie = `user-role=${dbUser.role}; path=/; max-age=3600`;
      document.cookie = `profile-completed=${dbUser.profileCompleted}; path=/; max-age=3600`;
    }
  }, [dbUser]);

  return {
    firebaseUser,
    user: dbUser,
    loading: loading || isLoadingUser,
    isAuthenticated: !!firebaseUser,
  };
}
