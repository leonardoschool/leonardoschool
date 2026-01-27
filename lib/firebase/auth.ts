// Firebase Auth Helper Functions
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
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
   * Send password reset email
   */
  resetPassword: async (email: string): Promise<void> => {
    return await sendPasswordResetEmail(auth, email);
  },

  /**
   * Send email verification
   */
  verifyEmail: async (user: FirebaseUser): Promise<void> => {
    return await sendEmailVerification(user);
  },

  /**
   * Send verification email to current user
   */
  sendVerificationEmail: async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Nessun utente autenticato');
    return await sendEmailVerification(user);
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
