/**
 * Leonardo School Mobile - Firebase Auth
 * 
 * Wrapper per l'autenticazione Firebase su React Native.
 * Usa @react-native-firebase/auth per l'SDK nativo.
 */

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

export type FirebaseUser = FirebaseAuthTypes.User;
export type UserCredential = FirebaseAuthTypes.UserCredential;

export const firebaseAuth = {
  /**
   * Get current Firebase Auth instance
   */
  get auth() {
    return auth();
  },

  /**
   * Get current user
   */
  get currentUser(): FirebaseUser | null {
    return auth().currentUser;
  },

  /**
   * Login with email and password
   */
  login: async (email: string, password: string): Promise<UserCredential> => {
    return await auth().signInWithEmailAndPassword(email, password);
  },

  /**
   * Register new user with email and password
   */
  register: async (
    email: string,
    password: string,
    displayName?: string
  ): Promise<UserCredential> => {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);

    if (displayName && userCredential.user) {
      await userCredential.user.updateProfile({ displayName });
    }

    return userCredential;
  },

  /**
   * Logout current user
   */
  logout: async (): Promise<void> => {
    return await auth().signOut();
  },

  /**
   * Send password reset email
   */
  resetPassword: async (email: string): Promise<void> => {
    return await auth().sendPasswordResetEmail(email);
  },

  /**
   * Send email verification to current user
   */
  sendVerificationEmail: async (): Promise<void> => {
    const user = auth().currentUser;
    if (!user) throw new Error('Nessun utente autenticato');
    return await user.sendEmailVerification();
  },

  /**
   * Reload current user data
   */
  reloadUser: async (): Promise<void> => {
    const user = auth().currentUser;
    if (!user) throw new Error('Nessun utente autenticato');
    return await user.reload();
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: { displayName?: string; photoURL?: string }): Promise<void> => {
    const user = auth().currentUser;
    if (!user) throw new Error('Nessun utente autenticato');
    return await user.updateProfile(data);
  },

  /**
   * Get ID token for API authentication
   */
  getIdToken: async (forceRefresh?: boolean): Promise<string | null> => {
    const user = auth().currentUser;
    if (!user) return null;
    return await user.getIdToken(forceRefresh);
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChanged: (callback: (user: FirebaseUser | null) => void) => {
    return auth().onAuthStateChanged(callback);
  },

  /**
   * Listen to ID token changes (for token refresh)
   */
  onIdTokenChanged: (callback: (user: FirebaseUser | null) => void) => {
    return auth().onIdTokenChanged(callback);
  },

  /**
   * Check if email is verified
   */
  isEmailVerified: (): boolean => {
    const user = auth().currentUser;
    return user?.emailVerified ?? false;
  },

  /**
   * Delete current user account
   */
  deleteAccount: async (): Promise<void> => {
    const user = auth().currentUser;
    if (!user) throw new Error('Nessun utente autenticato');
    return await user.delete();
  },

  /**
   * Re-authenticate user (needed before sensitive operations)
   */
  reauthenticate: async (email: string, password: string): Promise<UserCredential> => {
    const user = auth().currentUser;
    if (!user) throw new Error('Nessun utente autenticato');
    
    const credential = auth.EmailAuthProvider.credential(email, password);
    return await user.reauthenticateWithCredential(credential);
  },

  /**
   * Update email (requires recent authentication)
   */
  updateEmail: async (newEmail: string): Promise<void> => {
    const user = auth().currentUser;
    if (!user) throw new Error('Nessun utente autenticato');
    // Note: verifyBeforeUpdateEmail is recommended over updateEmail
    return await user.verifyBeforeUpdateEmail(newEmail);
  },

  /**
   * Update password (requires recent authentication)
   */
  updatePassword: async (newPassword: string): Promise<void> => {
    const user = auth().currentUser;
    if (!user) throw new Error('Nessun utente autenticato');
    return await user.updatePassword(newPassword);
  },
};

export default firebaseAuth;
