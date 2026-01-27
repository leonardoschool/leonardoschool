/**
 * Leonardo School Mobile - Firebase Auth
 * 
 * Usa Firebase Web SDK per compatibilità con Expo Go e production builds.
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  updatePassword as firebaseUpdatePassword,
  verifyBeforeUpdateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { auth } from './config';

export type FirebaseUser = User;
export { UserCredential };

export const firebaseAuth = {
  /**
   * Get current Firebase Auth instance
   */
  get auth() {
    return auth;
  },

  /**
   * Get current user
   */
  get currentUser(): FirebaseUser | null {
    return auth.currentUser;
  },

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
   */
  logout: async (): Promise<void> => {
    return await signOut(auth);
  },

  /**
   * Send password reset email
   */
  resetPassword: async (email: string): Promise<void> => {
    return await sendPasswordResetEmail(auth, email);
  },

  /**
   * Send email verification to current user
   */
  sendVerificationEmail: async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Nessun utente autenticato');
    return await sendEmailVerification(user);
  },

  /**
   * Reload current user data
   */
  reloadUser: async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Nessun utente autenticato');
    return await user.reload();
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: { displayName?: string; photoURL?: string }): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Nessun utente autenticato');
    return await updateProfile(user, data);
  },

  /**
   * Get ID token for API authentication
   */
  getIdToken: async (forceRefresh?: boolean): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken(forceRefresh);
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChanged: (callback: (user: FirebaseUser | null) => void) => {
    return auth.onAuthStateChanged(callback);
  },

  /**
   * Listen to ID token changes (for token refresh)
   */
  onIdTokenChanged: (callback: (user: FirebaseUser | null) => void) => {
    return auth.onIdTokenChanged(callback);
  },

  /**
   * Check if email is verified
   */
  isEmailVerified: (): boolean => {
    const user = auth.currentUser;
    return user?.emailVerified ?? false;
  },

  /**
   * Delete current user account
   */
  deleteAccount: async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Nessun utente autenticato');
    return await user.delete();
  },

  /**
   * Re-authenticate user (needed before sensitive operations)
   */
  reauthenticate: async (email: string, password: string): Promise<UserCredential> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Nessun utente autenticato');
    
    const credential = EmailAuthProvider.credential(email, password);
    return await reauthenticateWithCredential(user, credential);
  },

  /**
   * Update email (requires recent authentication)
   */
  updateEmail: async (newEmail: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Nessun utente autenticato');
    return await verifyBeforeUpdateEmail(user, newEmail);
  },

  /**
   * Update password (requires recent authentication)
   */
  updatePassword: async (newPassword: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Nessun utente autenticato');
    return await firebaseUpdatePassword(user, newPassword);
  },
};

export default firebaseAuth;
