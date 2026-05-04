/**
 * Leonardo School Mobile - Auth Store
 * 
 * Gestione stato autenticazione con Zustand.
 */

import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import { storage, secureStorage } from '../lib/storage';
import { config } from '../lib/config';
import { auth } from '../lib/firebase/config';
import type { User, StudentProfile, AuthState } from '../types';

interface AuthActions {
  // State setters
  setUser: (user: User | null) => void;
  setStudentProfile: (profile: StudentProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Auth actions
  login: (user: User, token: string, profile?: StudentProfile) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  updateProfile: (updates: Partial<StudentProfile>) => void;
  
  // Initialization
  initialize: () => Promise<void>;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  studentProfile: null,
  isLoading: true, // Start loading until initialized
  isAuthenticated: false,
  isInitialized: false,
  error: null,

  // State setters
  setUser: (user) => set({ 
    user, 
    isAuthenticated: !!user,
  }),
  
  setStudentProfile: (studentProfile) => set({ studentProfile }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),

  // Login action
  login: async (user, token, profile) => {
    try {
      // Store auth token securely
      await secureStorage.setAuthToken(token);
      
      // Store user data
      await storage.setUser(user);
      
      // Update state
      set({
        user,
        studentProfile: profile ?? null,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('[AuthStore] Login error:', error);
      set({ error: 'Errore durante il login.' });
      throw error;
    }
  },

  // Logout action
  logout: async () => {
    try {
      // Clear stored data
      await secureStorage.deleteAuthToken();
      await storage.deleteUser();
      
      // Reset state
      set({
        user: null,
        studentProfile: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('[AuthStore] Logout error:', error);
      // Still reset state even if storage clear fails
      set({
        user: null,
        studentProfile: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  // Update user
  updateUser: (updates) => {
    const { user } = get();
    if (user) {
      const updatedUser = { ...user, ...updates };
      set({ user: updatedUser });
      // Persist update
      storage.setUser(updatedUser).catch(console.error);
    }
  },

  // Update profile
  updateProfile: (updates) => {
    const { studentProfile } = get();
    if (studentProfile) {
      set({ studentProfile: { ...studentProfile, ...updates } });
    }
  },

  // Initialize from storage
  initialize: async () => {
    try {
      set({ isLoading: true });
      
      // Wait for Firebase to restore auth state from AsyncStorage
      const firebaseUser = await new Promise<typeof auth.currentUser>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(user);
        });
        // Timeout after 5 seconds
        setTimeout(() => resolve(auth.currentUser), 5000);
      });
      
      if (firebaseUser) {
        // Firebase has a user - get fresh token and verify with backend
        console.log('[AuthStore] Firebase user found:', firebaseUser.email);
        const freshToken = await firebaseUser.getIdToken(true); // force refresh
        
        // Get stored user data for initial render
        const cachedUser = await storage.getUser<User>();
        
        if (cachedUser) {
          // Show cached user immediately
          set({
            user: cachedUser,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
          });
          
          // Update token in secure storage
          await secureStorage.setAuthToken(freshToken);
          
          // Verify with server in background
          verifyTokenWithServer(freshToken, cachedUser).catch(console.warn);
        } else {
          // No cached user - verify with server now
          const response = await fetch(`${config.api.baseUrl}/api/auth/me`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: freshToken }),
          });
          
          if (response.ok) {
            const user = await response.json();
            await secureStorage.setAuthToken(freshToken);
            await storage.setUser(user);
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
            });
          } else {
            // Token/user invalid
            console.warn('[AuthStore] Backend rejected token');
            set({ isLoading: false, isAuthenticated: false, isInitialized: true });
          }
        }
      } else {
        // No Firebase user
        console.log('[AuthStore] No Firebase user found');
        await secureStorage.deleteAuthToken();
        await storage.deleteUser();
        set({ isLoading: false, isAuthenticated: false, isInitialized: true });
      }
    } catch (error) {
      console.error('[AuthStore] Initialize error:', error);
      set({ 
        isLoading: false, 
        isAuthenticated: false,
        isInitialized: true,
        error: 'Errore durante il caricamento della sessione.',
      });
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

/**
 * Verify token with backend and refresh user data if needed
 */
async function verifyTokenWithServer(token: string, cachedUser: User): Promise<void> {
  try {
    const response = await fetch(`${config.api.baseUrl}/api/auth/me`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    
    if (!response.ok) {
      // Token invalid - logout user
      console.warn('[AuthStore] Token invalid, logging out');
      useAuthStore.getState().logout();
      return;
    }
    
    // La risposta contiene i dati utente direttamente (non wrappati in .user)
    const user = await response.json();
    
    // Update user if data changed
    if (user && user.id && JSON.stringify(user) !== JSON.stringify(cachedUser)) {
      useAuthStore.getState().setUser(user);
      await storage.setUser(user);
    }
  } catch (error) {
    // Network error - keep cached data but log warning
    console.warn('[AuthStore] Could not verify token (network error):', error);
  }
}

// Selectors for common derived state
export const selectIsStudent = (state: AuthStore) => state.user?.role === 'STUDENT';
export const selectIsProfileComplete = (state: AuthStore) => state.user?.profileCompleted ?? false;
export const selectIsActive = (state: AuthStore) => state.user?.isActive ?? false;

export default useAuthStore;
