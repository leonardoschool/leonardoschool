/**
 * Leonardo School Mobile - Auth Store
 * 
 * Gestione stato autenticazione con Zustand.
 */

import { create } from 'zustand';
import { storage, secureStorage } from '../lib/storage';
import { config } from '../lib/config';
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
      
      // Check for stored token
      const token = await secureStorage.getAuthToken();
      if (!token) {
        set({ isLoading: false, isAuthenticated: false, isInitialized: true });
        return;
      }

      // Get stored user data
      const user = await storage.getUser<User>();
      if (!user) {
        // Token exists but no user data - clear token
        await secureStorage.deleteAuthToken();
        set({ isLoading: false, isAuthenticated: false, isInitialized: true });
        return;
      }

      // Restore state
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      });

      // Verify token with server in background (non-blocking)
      verifyTokenWithServer(token, user).catch((error) => {
        console.warn('[AuthStore] Token verification failed:', error);
      });

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
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      // Token invalid - logout user
      console.warn('[AuthStore] Token invalid, logging out');
      useAuthStore.getState().logout();
      return;
    }
    
    const data = await response.json();
    
    // Update user if data changed
    if (data.user && JSON.stringify(data.user) !== JSON.stringify(cachedUser)) {
      useAuthStore.getState().setUser(data.user);
      await storage.setUser(data.user);
    }
    
    // Update student profile if available
    if (data.studentProfile) {
      useAuthStore.getState().setStudentProfile(data.studentProfile);
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
