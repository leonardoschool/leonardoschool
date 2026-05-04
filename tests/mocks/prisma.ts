/**
 * Prisma Mock
 * Flexible mock for Prisma Client that works without generated types
 * Uses DeepMockProxy pattern for complete mocking
 */

import { vi, type Mock } from 'vitest';

// ==================== Mock Data Factories ====================
// These create test data that matches the Prisma schema

export type MockUser = {
  id: string;
  firebaseUid: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'COLLABORATOR' | 'STUDENT';
  isActive: boolean;
  profileCompleted: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  expoPushToken: string | null;
};

export type MockStudent = {
  id: string;
  userId: string;
  matricola: string | null;
  fiscalCode: string | null;
  dateOfBirth: Date | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  enrollmentDate: Date;
  graduationYear: number | null;
  requiresParentData: boolean;
  parentDataRequestedAt: Date | null;
  parentDataRequestedById: string | null;
};

export type MockCollaborator = {
  id: string;
  userId: string;
  fiscalCode: string | null;
  dateOfBirth: Date | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  specializations: string[];
  bio: string | null;
  maxWeeklyHours: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MockGroup = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  type: 'STANDARD' | 'CUSTOM';
  isActive: boolean;
  referenceStudentId: string | null;
  referenceCollaboratorId: string | null;
  referenceAdminId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MockNotification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string; // NotificationType enum value
  isRead: boolean;
  readAt: Date | null;
  actionUrl: string | null;
  data: unknown;
  channel: 'IN_APP' | 'EMAIL' | 'BOTH';
  emailSent: boolean;
  emailSentAt: Date | null;
  createdAt: Date;
};

export type MockSimulation = {
  id: string;
  title: string;
  description: string | null;
  type: 'OFFICIAL' | 'PRACTICE' | 'CUSTOM' | 'QUICK_QUIZ';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  visibility: 'PRIVATE' | 'GROUP' | 'PUBLIC';
  accessType: 'OPEN' | 'ROOM';
  durationMinutes: number;
  passingScore: number | null;
  maxAttempts: number | null;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showResults: boolean;
  showCorrectAnswers: boolean;
  antiCheatEnabled: boolean;
  createdById: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// Factory functions
export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: 'user-1',
  firebaseUid: 'firebase-uid-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'STUDENT',
  isActive: true,
  profileCompleted: true,
  emailVerified: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  lastLoginAt: new Date('2024-01-15'),
  expoPushToken: null,
  ...overrides,
});

export const createMockStudent = (overrides: Partial<MockStudent> = {}): MockStudent => ({
  id: 'student-1',
  userId: 'user-1',
  matricola: 'STU-2024-001',
  fiscalCode: 'RSSMRA85M01H501Z',
  dateOfBirth: new Date('1985-08-01'),
  phone: '+39 333 123 4567',
  address: 'Via Roma 1',
  city: 'Roma',
  province: 'RM',
  postalCode: '00100',
  enrollmentDate: new Date('2024-01-01'),
  graduationYear: 2026,
  requiresParentData: false,
  parentDataRequestedAt: null,
  parentDataRequestedById: null,
  ...overrides,
});

export const createMockCollaborator = (overrides: Partial<MockCollaborator> = {}): MockCollaborator => ({
  id: 'collaborator-1',
  userId: 'user-2',
  fiscalCode: 'VRDBLN80A01F205X',
  dateOfBirth: new Date('1980-01-01'),
  phone: '+39 333 987 6543',
  address: 'Via Milano 10',
  city: 'Milano',
  province: 'MI',
  postalCode: '20100',
  specializations: ['Matematica', 'Fisica'],
  bio: 'Docente esperto',
  maxWeeklyHours: 40,
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  ...overrides,
});

export const createMockGroup = (overrides: Partial<MockGroup> = {}): MockGroup => ({
  id: 'group-1',
  name: 'Gruppo Alpha',
  description: 'Gruppo di test',
  color: '#4F46E5',
  type: 'STANDARD',
  isActive: true,
  referenceStudentId: null,
  referenceCollaboratorId: 'collaborator-1',
  referenceAdminId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  ...overrides,
});

export const createMockNotification = (overrides: Partial<MockNotification> = {}): MockNotification => ({
  id: 'notification-1',
  userId: 'user-1',
  title: 'Test Notification',
  message: 'This is a test notification',
  type: 'GENERAL',
  isRead: false,
  readAt: null,
  actionUrl: null,
  data: null,
  channel: 'IN_APP',
  emailSent: false,
  emailSentAt: null,
  createdAt: new Date('2024-01-15'),
  ...overrides,
});

export const createMockSimulation = (overrides: Partial<MockSimulation> = {}): MockSimulation => ({
  id: 'simulation-1',
  title: 'Test Simulation',
  description: 'A test simulation',
  type: 'PRACTICE',
  status: 'PUBLISHED',
  visibility: 'PRIVATE',
  accessType: 'OPEN',
  durationMinutes: 60,
  passingScore: 60,
  maxAttempts: 3,
  shuffleQuestions: true,
  shuffleAnswers: true,
  showResults: true,
  showCorrectAnswers: false,
  antiCheatEnabled: true,
  createdById: 'user-1',
  publishedAt: new Date('2024-01-10'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  ...overrides,
});

// ==================== Prisma Mock Implementation ====================

type MockedFunction = Mock<(...args: unknown[]) => unknown>;

interface MockModel {
  findUnique: MockedFunction;
  findFirst: MockedFunction;
  findMany: MockedFunction;
  create: MockedFunction;
  createMany: MockedFunction;
  update: MockedFunction;
  updateMany: MockedFunction;
  upsert: MockedFunction;
  delete: MockedFunction;
  deleteMany: MockedFunction;
  count: MockedFunction;
  aggregate: MockedFunction;
  groupBy: MockedFunction;
}

const createMockModel = (): MockModel => ({
  findUnique: vi.fn().mockResolvedValue(null),
  findFirst: vi.fn().mockResolvedValue(null),
  findMany: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockImplementation(async ({ data }) => ({ id: 'new-id', ...data })),
  createMany: vi.fn().mockResolvedValue({ count: 0 }),
  update: vi.fn().mockImplementation(async ({ data, where }) => ({ ...where, ...data })),
  updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  upsert: vi.fn().mockImplementation(async ({ create }) => create),
  delete: vi.fn().mockResolvedValue(null),
  deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  count: vi.fn().mockResolvedValue(0),
  aggregate: vi.fn().mockResolvedValue({}),
  groupBy: vi.fn().mockResolvedValue([]),
});

// Main Prisma mock object
export const prismaMock = {
  // Models
  user: createMockModel(),
  student: createMockModel(),
  collaborator: createMockModel(),
  admin: createMockModel(),
  parentGuardian: createMockModel(),
  group: createMockModel(),
  groupMembership: createMockModel(),
  contract: createMockModel(),
  contractTemplate: createMockModel(),
  material: createMockModel(),
  notification: createMockModel(),
  notificationPreference: createMockModel(),
  message: createMockModel(),
  conversation: createMockModel(),
  conversationParticipant: createMockModel(),
  simulation: createMockModel(),
  simulationAssignment: createMockModel(),
  simulationResult: createMockModel(),
  simulationSession: createMockModel(),
  question: createMockModel(),
  questionOption: createMockModel(),
  questionTag: createMockModel(),
  questionFeedback: createMockModel(),
  jobApplication: createMockModel(),
  contactRequest: createMockModel(),
  attendance: createMockModel(),
  customAttendanceStatus: createMockModel(),
  calendarEvent: createMockModel(),
  eventInvitation: createMockModel(),
  staffAbsence: createMockModel(),
  alert: createMockModel(),
  studentStats: createMockModel(),
  sessionMessage: createMockModel(),
  cheatingEvent: createMockModel(),

  // Transaction support
  $transaction: vi.fn().mockImplementation(async <T>(
    fn: (tx: typeof prismaMock) => Promise<T>
  ): Promise<T> => {
    return await fn(prismaMock);
  }),

  // Connection methods
  $connect: vi.fn().mockResolvedValue(undefined),
  $disconnect: vi.fn().mockResolvedValue(undefined),

  // Raw queries
  $queryRaw: vi.fn().mockResolvedValue([]),
  $queryRawUnsafe: vi.fn().mockResolvedValue([]),
  $executeRaw: vi.fn().mockResolvedValue(0),
  $executeRawUnsafe: vi.fn().mockResolvedValue(0),
};

// Type for the mock
export type PrismaMock = typeof prismaMock;

// Mock the Prisma module
vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

vi.mock('@/lib/prisma/client', () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

// ==================== Helper Functions ====================

/**
 * Reset all Prisma mocks to their default state
 */
export const resetPrismaMocks = (): void => {
  const models = Object.keys(prismaMock).filter(
    (key) => !key.startsWith('$') && typeof prismaMock[key as keyof typeof prismaMock] === 'object'
  );

  for (const modelName of models) {
    const model = prismaMock[modelName as keyof typeof prismaMock] as MockModel;
    if (model && typeof model === 'object') {
      Object.values(model).forEach((method) => {
        if (typeof method === 'function' && 'mockClear' in method) {
          (method as MockedFunction).mockClear();
        }
      });
    }
  }

  prismaMock.$transaction.mockClear();
  prismaMock.$connect.mockClear();
  prismaMock.$disconnect.mockClear();
  prismaMock.$queryRaw.mockClear();
  prismaMock.$executeRaw.mockClear();
};

/**
 * Configure a model to return specific data
 */
export const mockPrismaModel = <T>(
  model: MockModel,
  operation: keyof MockModel,
  data: T
): void => {
  (model[operation] as MockedFunction).mockResolvedValue(data);
};

/**
 * Configure a model operation to throw an error
 */
export const mockPrismaError = (
  model: MockModel,
  operation: keyof MockModel,
  error: Error
): void => {
  (model[operation] as MockedFunction).mockRejectedValue(error);
};

export default prismaMock;
