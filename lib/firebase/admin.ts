// Firebase Admin SDK Configuration (Server-side only)
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getStorage, Storage } from 'firebase-admin/storage';

let adminApp: App | undefined;
let adminAuth: Auth | undefined;
let adminStorage: Storage | undefined;
let initialized = false;

function initAdmin() {
  // Skip initialization during build or if already initialized
  if (initialized || process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  if (getApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    // Skip if no valid service account key
    if (!serviceAccountKey || serviceAccountKey === '{}') {
      console.warn('Firebase Admin: No service account key provided, skipping initialization');
      return;
    }

    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      
      // Validate required fields
      if (!serviceAccount.project_id || !serviceAccount.private_key) {
        console.warn('Firebase Admin: Invalid service account, skipping initialization');
        return;
      }

      adminApp = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error);
      // Don't throw during build - just skip initialization
      return;
    }
  } else {
    adminApp = getApps()[0]!;
  }

  adminAuth = getAuth(adminApp);
  adminStorage = getStorage(adminApp);
  initialized = true;
}

// Lazy initialization getters
export function getAdminAuth(): Auth {
  if (!adminAuth) {
    initAdmin();
  }
  if (!adminAuth) {
    throw new Error('Firebase Admin Auth not initialized. Check FIREBASE_SERVICE_ACCOUNT_KEY env var.');
  }
  return adminAuth;
}

export function getAdminStorage(): Storage {
  if (!adminStorage) {
    initAdmin();
  }
  if (!adminStorage) {
    throw new Error('Firebase Admin Storage not initialized. Check FIREBASE_SERVICE_ACCOUNT_KEY env var.');
  }
  return adminStorage;
}

export function getAdminApp(): App {
  if (!adminApp) {
    initAdmin();
  }
  if (!adminApp) {
    throw new Error('Firebase Admin App not initialized. Check FIREBASE_SERVICE_ACCOUNT_KEY env var.');
  }
  return adminApp;
}

// Legacy exports for backward compatibility (use getters instead)
export { adminApp, adminAuth, adminStorage };
