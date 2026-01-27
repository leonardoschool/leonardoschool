/**
 * Vitest Setup File
 * This file runs before each test file
 */

// Extend globalThis for React 19 test environment
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Configure React 19 test environment - MUST be before any React imports
// This fixes "React.act is not a function" error
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Extend Vitest matchers with Testing Library matchers
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';

expect.extend(matchers);

// Cleanup after each test (unmount React components)
afterEach(() => {
  cleanup();
});

// Mock environment variables for testing
vi.stubEnv('NODE_ENV', 'test');
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
vi.stubEnv('FIREBASE_SERVICE_ACCOUNT_KEY', JSON.stringify({
  type: 'service_account',
  project_id: 'test-project',
  private_key_id: 'test-key-id',
  private_key: '-----BEGIN RSA PRIVATE KEY-----\nMIIBOgIBAAJBALRiMLABc\n-----END RSA PRIVATE KEY-----\n',
  client_email: 'test@test-project.iam.gserviceaccount.com',
  client_id: '123456789',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
}));
vi.stubEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'test-project.appspot.com');

// Mock Firebase Admin SDK (must be before any imports that use it)
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
  cert: vi.fn(() => ({})),
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    verifyIdToken: vi.fn().mockResolvedValue({
      uid: 'test-uid',
      email: 'test@example.com',
      email_verified: true,
    }),
    getUser: vi.fn().mockResolvedValue({
      uid: 'test-uid',
      email: 'test@example.com',
      emailVerified: true,
    }),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    setCustomUserClaims: vi.fn(),
  })),
}));

vi.mock('firebase-admin/storage', () => ({
  getStorage: vi.fn(() => ({
    bucket: vi.fn(() => ({
      file: vi.fn(() => ({
        save: vi.fn(),
        delete: vi.fn(),
        getSignedUrl: vi.fn().mockResolvedValue(['https://storage.test/file']),
      })),
    })),
  })),
}));

// Mock the admin module itself
vi.mock('@/lib/firebase/admin', () => {
  const mockAuth = {
    verifyIdToken: vi.fn().mockResolvedValue({
      uid: 'test-uid',
      email: 'test@example.com',
      email_verified: true,
    }),
    getUser: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    setCustomUserClaims: vi.fn(),
  };
  
  const mockStorage = {
    bucket: vi.fn(() => ({
      file: vi.fn(() => ({
        save: vi.fn(),
        delete: vi.fn(),
        getSignedUrl: vi.fn().mockResolvedValue(['https://storage.test/file']),
      })),
    })),
  };
  
  return {
    adminApp: {},
    adminAuth: mockAuth,
    adminStorage: mockStorage,
    getAdminAuth: vi.fn(() => mockAuth),
    getAdminStorage: vi.fn(() => mockStorage),
    getAdminApp: vi.fn(() => ({})),
  };
});

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// Mock Next.js headers
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(),
    getAll: vi.fn(),
  }),
  headers: () => new Headers(),
}));

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Console warnings filter (optional - remove noisy warnings in tests)
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  // Filter out specific warnings if needed
  const message = args[0];
  if (typeof message === 'string' && message.includes('ReactDOM.render')) {
    return;
  }
  originalWarn(...args);
};
