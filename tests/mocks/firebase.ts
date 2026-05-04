/**
 * Firebase Mock
 * Complete mock of Firebase Auth and Admin SDK for testing
 */

import { vi } from 'vitest';

// Mock Firebase User
export const mockFirebaseUser = {
  uid: 'test-user-uid-123',
  email: 'test@example.com',
  emailVerified: true,
  displayName: 'Test User',
  photoURL: null,
  phoneNumber: null,
  isAnonymous: false,
  tenantId: null,
  providerData: [],
  metadata: {
    creationTime: '2024-01-01T00:00:00.000Z',
    lastSignInTime: '2024-01-15T10:30:00.000Z',
  },
  getIdToken: vi.fn().mockResolvedValue('mock-id-token'),
  getIdTokenResult: vi.fn().mockResolvedValue({
    token: 'mock-id-token',
    claims: {},
    signInProvider: 'password',
    expirationTime: new Date(Date.now() + 3600000).toISOString(),
    issuedAtTime: new Date().toISOString(),
    authTime: new Date().toISOString(),
  }),
  reload: vi.fn().mockResolvedValue(undefined),
  toJSON: vi.fn().mockReturnValue({}),
  delete: vi.fn().mockResolvedValue(undefined),
};

// Mock Firebase Auth
export const mockAuth = {
  currentUser: null as typeof mockFirebaseUser | null,
  onAuthStateChanged: vi.fn((callback: (user: typeof mockFirebaseUser | null) => void) => {
    callback(mockAuth.currentUser);
    return vi.fn(); // unsubscribe function
  }),
  onIdTokenChanged: vi.fn((callback: (user: typeof mockFirebaseUser | null) => void) => {
    callback(mockAuth.currentUser);
    return vi.fn();
  }),
  signOut: vi.fn().mockResolvedValue(undefined),
  updateCurrentUser: vi.fn().mockResolvedValue(undefined),
};

// Mock signInWithEmailAndPassword
export const mockSignInWithEmailAndPassword = vi.fn().mockImplementation(
  async (_auth: unknown, email: string, _password: string) => {
    return {
      user: { ...mockFirebaseUser, email },
      providerId: 'password',
      operationType: 'signIn',
    };
  }
);

// Mock createUserWithEmailAndPassword
export const mockCreateUserWithEmailAndPassword = vi.fn().mockImplementation(
  async (_auth: unknown, email: string, _password: string) => {
    return {
      user: { ...mockFirebaseUser, email, uid: `new-user-${Date.now()}` },
      providerId: 'password',
      operationType: 'signUp',
    };
  }
);

// Mock sendEmailVerification
export const mockSendEmailVerification = vi.fn().mockResolvedValue(undefined);

// Mock sendPasswordResetEmail
export const mockSendPasswordResetEmail = vi.fn().mockResolvedValue(undefined);

// Mock updateProfile
export const mockUpdateProfile = vi.fn().mockResolvedValue(undefined);

// Mock signOut
export const mockSignOut = vi.fn().mockResolvedValue(undefined);

// Firebase module mock
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => mockAuth),
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
  signOut: mockSignOut,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
  sendEmailVerification: mockSendEmailVerification,
  updateProfile: mockUpdateProfile,
  onAuthStateChanged: mockAuth.onAuthStateChanged,
  onIdTokenChanged: mockAuth.onIdTokenChanged,
}));

// Mock Firebase config
vi.mock('@/lib/firebase/config', () => ({
  app: {},
  auth: mockAuth,
}));

// Firebase Admin mock
export const mockAdminAuth = {
  verifyIdToken: vi.fn().mockImplementation(async (token: string) => {
    if (token === 'invalid-token') {
      throw new Error('Invalid token');
    }
    return {
      uid: mockFirebaseUser.uid,
      email: mockFirebaseUser.email,
      email_verified: mockFirebaseUser.emailVerified,
    };
  }),
  getUser: vi.fn().mockResolvedValue(mockFirebaseUser),
  createUser: vi.fn().mockResolvedValue(mockFirebaseUser),
  updateUser: vi.fn().mockResolvedValue(mockFirebaseUser),
  deleteUser: vi.fn().mockResolvedValue(undefined),
  setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
};

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => mockAdminAuth),
}));

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  cert: vi.fn(),
}));

// Helper functions to control mock behavior
export const mockHelpers = {
  setCurrentUser: (user: typeof mockFirebaseUser | null) => {
    mockAuth.currentUser = user;
  },
  
  clearMocks: () => {
    mockAuth.currentUser = null;
    mockSignInWithEmailAndPassword.mockClear();
    mockCreateUserWithEmailAndPassword.mockClear();
    mockSendEmailVerification.mockClear();
    mockSendPasswordResetEmail.mockClear();
    mockUpdateProfile.mockClear();
    mockSignOut.mockClear();
    mockAdminAuth.verifyIdToken.mockClear();
  },
  
  simulateAuthError: (error: Error) => {
    mockSignInWithEmailAndPassword.mockRejectedValueOnce(error);
  },
  
  simulateInvalidCredentials: () => {
    const error = new Error('Firebase: Error (auth/invalid-credential).');
    (error as { code?: string }).code = 'auth/invalid-credential';
    mockSignInWithEmailAndPassword.mockRejectedValueOnce(error);
  },
  
  simulateUserNotFound: () => {
    const error = new Error('Firebase: Error (auth/user-not-found).');
    (error as { code?: string }).code = 'auth/user-not-found';
    mockSignInWithEmailAndPassword.mockRejectedValueOnce(error);
  },
  
  simulateEmailAlreadyInUse: () => {
    const error = new Error('Firebase: Error (auth/email-already-in-use).');
    (error as { code?: string }).code = 'auth/email-already-in-use';
    mockCreateUserWithEmailAndPassword.mockRejectedValueOnce(error);
  },
};

const firebaseMocks = {
  mockFirebaseUser,
  mockAuth,
  mockAdminAuth,
  mockHelpers,
};

export default firebaseMocks;
