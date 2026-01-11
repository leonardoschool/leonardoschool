/**
 * Leonardo School Mobile - Firebase Configuration
 * 
 * Usa Firebase Web SDK compatibile con Expo con persistenza AsyncStorage.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { 
  initializeAuth,
  getAuth,
  type Auth,
} from 'firebase/auth';
// @ts-expect-error - getReactNativePersistence is available in react-native bundle
import { getReactNativePersistence } from '@firebase/auth/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configurazione Firebase (stessa della webapp)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyAJuY3uYvBZrr4KdJQGxI5j_Zq9XQS8f9o",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "leonardo-school-1cd72.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "leonardo-school-1cd72",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "leonardo-school-1cd72.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abcdef123456",
};

// Inizializza Firebase con persistenza per React Native
let app: FirebaseApp;
let auth: Auth;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  // Inizializza Auth con persistenza AsyncStorage
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} else {
  app = getApp();
  auth = getAuth(app);
}

/**
 * Check if Firebase is properly configured
 */
export function isFirebaseConfigured(): boolean {
  try {
    const apps = getApps();
    return apps.length > 0;
  } catch {
    console.warn('[Firebase] Firebase not configured');
    return false;
  }
}

/**
 * Get Firebase app instance
 */
export function getFirebaseApp() {
  return app;
}

export { auth };
export default app;
