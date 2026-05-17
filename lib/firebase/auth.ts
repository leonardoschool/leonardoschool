// Firebase Auth Helper Functions
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
  UserCredential,
} from 'firebase/auth';
import { auth } from './config';

// Flag to prevent duplicate logout API calls - exported for useAuth hook
let isLoggingOut = false;
export const getIsLoggingOut = () => isLoggingOut;

export const firebaseAuth = {
  /**
   * Login with email and password
   */
  login: async (email: string, password: string): Promise<UserCredential> => {
    return await signInWithEmailAndPassword(auth, email, password);
  },

  /**
   * Register new user with email and password
   */
  register: async (
    email: string,
    password: string,
    displayName?: string
  ): Promise<UserCredential> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }

    return userCredential;
  },

  /**
   * Logout current user
   * Note: Uses a flag to prevent duplicate /api/auth/logout calls
   * when onIdTokenChanged listener in useAuth also triggers
   */
  logout: async (): Promise<void> => {
    // Prevent duplicate logout calls
    if (isLoggingOut) {
      return await signOut(auth);
    }
    
    isLoggingOut = true;
    
    try {
      // 1. Clear localStorage
      localStorage.removeItem('user');
      
      // 2. Sign out from Firebase first (this triggers onIdTokenChanged)
      await signOut(auth);
      
      // 3. Clear server-side cookies (in case useAuth listener isn't mounted)
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      // Reset flag after a short delay to allow for any race conditions
      setTimeout(() => {
        isLoggingOut = false;
      }, 1000);
    }
  },

  /**
   * Send password reset email via custom Nodemailer flow
   */
  resetPassword: async (email: string): Promise<void> => {
    await fetch('/api/auth/send-reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Send email verification via custom Nodemailer flow
   */
  verifyEmail: async (user: FirebaseUser): Promise<void> => {
    const token = await user.getIdToken();
    const response = await fetch('/api/auth/send-verification-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(data.error ?? 'Errore nell\'invio dell\'email di verifica');
    }
  },

  /**
   * Send verification email to current user via custom Nodemailer flow
   */
  sendVerificationEmail: async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Nessun utente autenticato');
    const token = await user.getIdToken();
    const response = await fetch('/api/auth/send-verification-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(data.error ?? 'Errore nell\'invio dell\'email di verifica');
    }
  },

  /**
   * Update user profile
   */
  updateUserProfile: async (user: FirebaseUser, data: { displayName?: string; photoURL?: string }): Promise<void> => {
    return await updateProfile(user, data);
  },

  /**
   * Get current user
   */
  getCurrentUser: (): FirebaseUser | null => {
    return auth.currentUser;
  },

  /**
   * Get Firebase ID Token for API calls
   */
  getIdToken: async (forceRefresh = false): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken(forceRefresh);
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChanged: (callback: (user: FirebaseUser | null) => void) => {
    return firebaseOnAuthStateChanged(auth, callback);
  },
};
