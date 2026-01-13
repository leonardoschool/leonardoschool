// Firebase Admin SDK Configuration (Server-side only)
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getStorage, Storage } from 'firebase-admin/storage';

let adminApp: App;
let adminAuth: Auth;
let adminStorage: Storage;

function initAdmin() {
  if (getApps().length === 0) {
    try {
      const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
      );

      adminApp = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error);
      throw new Error('Firebase Admin initialization failed');
    }
  } else {
    adminApp = getApps()[0]!;
  }

  adminAuth = getAuth(adminApp);
  adminStorage = getStorage(adminApp);
}

// Initialize on module load (server-side only)
if (typeof window === 'undefined') {
  initAdmin();
}

export { adminApp, adminAuth, adminStorage };
