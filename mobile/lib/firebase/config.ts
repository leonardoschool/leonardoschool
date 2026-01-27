/**
 * Leonardo School Mobile - Firebase Configuration
 * 
 * Usa Firebase Web SDK compatibile con Expo.
 * Configurato con persistenza AsyncStorage per mantenere lo stato auth tra le sessioni.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { 
  initializeAuth,
  getAuth,
  type Auth,
} from 'firebase/auth';
// @ts-expect-error - getReactNativePersistence esiste in firebase/auth per React Native ma i tipi non lo espongono
import { getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configurazione Firebase (stessa della webapp)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Debug: log Firebase config in development
if (__DEV__) {
  console.log('[Firebase Config] API Key:', firebaseConfig.apiKey?.substring(0, 10) + '...');
  console.log('[Firebase Config] Project ID:', firebaseConfig.projectId);
  console.log('[Firebase Config] Auth Domain:', firebaseConfig.authDomain);
}

// Inizializza Firebase con persistenza AsyncStorage per React Native
let app: FirebaseApp;
let auth: Auth;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  // Usa initializeAuth con persistenza AsyncStorage per mantenere lo stato auth
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} else {
  app = getApp();
  // Se l'app è già inizializzata, usa getAuth
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
