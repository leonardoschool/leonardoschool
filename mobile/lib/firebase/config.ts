/**
 * Leonardo School Mobile - Firebase Configuration
 * 
 * Configurazione Firebase per React Native usando @react-native-firebase.
 * La configurazione nativa viene letta da:
 * - iOS: GoogleService-Info.plist
 * - Android: google-services.json
 * 
 * Questi file devono essere posizionati nelle cartelle native dopo `expo prebuild`.
 */

import firebase from '@react-native-firebase/app';

// Firebase viene inizializzato automaticamente tramite i file di configurazione nativi.
// Non serve inizializzazione manuale come nella versione web.

/**
 * Check if Firebase is properly configured
 */
export function isFirebaseConfigured(): boolean {
  try {
    // Firebase app should be auto-initialized
    const apps = firebase.apps;
    return apps.length > 0;
  } catch {
    console.warn('[Firebase] Firebase not configured. Make sure to add GoogleService-Info.plist (iOS) and google-services.json (Android)');
    return false;
  }
}

/**
 * Get Firebase app instance
 */
export function getFirebaseApp() {
  return firebase.app();
}

export default firebase;
