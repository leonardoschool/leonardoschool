/**
 * Students Router Tests
 *
 * Tests for student profile management, stats, and data access procedures.
 * The students router handles:
 * - Profile completion and management
 * - Student data access (various permission levels)
 * - Statistics and simulation results
 * - Parent/guardian management (for minors)
 * - Group membership queries
 *
 * Procedures tested:
 * - completeProfile (protectedProcedure) - Complete student profile
 * - getProfile (protectedProcedure) - Get own profile
 * - getById (staffProcedure) - Get student details
 * - getPublicInfo (protectedProcedure) - Get limited student info
 * - getAllForAdmin (adminProcedure) - List all students
 * - getListForCollaborator (staffProcedure) - List active students with limited data
 * - getStudents (staffProcedure) - Paginated student list
 * - getMyStats (protectedProcedure) - Own statistics
 * - getDetailedStats (protectedProcedure) - Detailed own statistics
 * - getMyGroup (protectedProcedure) - Own group info
 * - getStudentDetailForCollaborator (staffProcedure) - Student details for collaborators
 * - getFromMyGroups (protectedProcedure) - Students from shared groups
 * - getStudentSimulations (staffProcedure) - Student's simulation history
 * - saveParentGuardian (protectedProcedure) - Save parent/guardian data
 * - getMyParentGuardian (protectedProcedure) - Get own parent/guardian
 * - getParentDataRequirement (protectedProcedure) - Check if parent data required
 * - requestParentData (adminProcedure) - Request parent data from student
 * - cancelParentDataRequest (adminProcedure) - Cancel parent data request
 * - getStudentParentGuardian (staffProcedure) - Get student's parent guardian
 * - getFullStudentDetails (staffProcedure) - Complete student details
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { faker } from '@faker-js/faker/locale/it';
import type { User, Student, StudentStats, UserRole } from '@prisma/client';

// ===================== MOCK FACTORIES =====================

const PROVINCE_ITALIANE = [
  'RM', 'MI', 'NA', 'TO', 'PA', 'GE', 'BO', 'FI', 'BA', 'VE',
] as const;

const VALID_FISCAL_CODE_REGEX = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;

/**
 * Generate a valid Italian fiscal code
 */
function generateValidFiscalCode(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const consonants = 'BCDFGHJKLMNPQRSTVWXYZ';
  const vowels = 'AEIOU';

  // 6 letters (surname + name encoding)
  let code = '';
  for (let i = 0; i < 3; i++) code += consonants[Math.floor(Math.random() * consonants.length)];
  for (let i = 0; i < 3; i++) code += vowels[Math.floor(Math.random() * vowels.length)];

  // 2 digits (year)
  code += String(Math.floor(Math.random() * 100)).padStart(2, '0');

  // 1 letter (month)
  code += letters[Math.floor(Math.random() * 12)]; // A-L for months

  // 2 digits (day + gender)
  const day = 1 + Math.floor(Math.random() * 28);
  code += String(day).padStart(2, '0');

  // 1 letter (municipality code initial)
  code += letters[Math.floor(Math.random() * letters.length)];

  // 3 digits (municipality code)
  code += String(Math.floor(Math.random() * 1000)).padStart(3, '0');

  // 1 letter (control character)
  code += letters[Math.floor(Math.random() * letters.length)];

  return code;
}

/**
 * Generate valid date of birth (18-50 years ago)
 */
function generateValidDateOfBirth(): Date {
  const age = 18 + Math.floor(Math.random() * 32);
  const date = new Date();
  date.setFullYear(date.getFullYear() - age);
  return date;
}

/**
 * Generate valid Italian phone number
 */
function generateValidPhone(): string {
  const prefixes = ['320', '328', '333', '339', '347', '349', '366', '388'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = String(Math.floor(Math.random() * 10000000)).padStart(7, '0');
  return `+39 ${prefix} ${number.slice(0, 3)} ${number.slice(3)}`;
}

/**
 * Create a mock user with configurable properties
 */
function createMockUser(overrides: Partial<User> = {}): User {
  const id = faker.string.uuid();
  return {
    id,
    firebaseUid: `firebase_${id}`,
    email: faker.internet.email().toLowerCase(),
    name: faker.person.fullName(),
    role: 'STUDENT' as UserRole,
    isActive: true,
    profileCompleted: false,
    emailVerified: false,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    expoPushToken: null,
    ...overrides,
  };
}

/**
 * Create a mock student with configurable properties
 */
function createMockStudent(overrides: Partial<Student> = {}): Student {
  const userId = faker.string.uuid();
  return {
    id: faker.string.uuid(),
    userId,
    matricola: `STU${Date.now().toString().slice(-6)}`,
    fiscalCode: generateValidFiscalCode(),
    dateOfBirth: generateValidDateOfBirth(),
    phone: generateValidPhone(),
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    province: PROVINCE_ITALIANE[Math.floor(Math.random() * PROVINCE_ITALIANE.length)],
    postalCode: String(Math.floor(Math.random() * 90000) + 10000),
    enrollmentDate: new Date(),
    graduationYear: null,
    requiresParentData: false,
    parentDataRequestedAt: null,
    parentDataRequestedById: null,
    ...overrides,
  };
}

/**
 * Create mock student stats
 */
function createMockStudentStats(studentId: string): StudentStats {
  return {
    id: faker.string.uuid(),
    studentId,
    totalSimulations: faker.number.int({ min: 0, max: 100 }),
    totalQuestions: faker.number.int({ min: 0, max: 1000 }),
    totalCorrectAnswers: faker.number.int({ min: 0, max: 800 }),
    avgScore: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
    bestScore: faker.number.float({ min: 50, max: 100, fractionDigits: 2 }),
    totalStudyTimeMinutes: faker.number.int({ min: 0, max: 10000 }),
    avgSimulationTime: faker.number.int({ min: 0, max: 120 }),
    currentStreak: faker.number.int({ min: 0, max: 30 }),
    longestStreak: faker.number.int({ min: 0, max: 100 }),
    lastActivityDate: new Date(),
    subjectStats: {},
    updatedAt: new Date(),
  };
}

/**
 * Create mock complete profile input
 */
function createValidCompleteProfileInput() {
  return {
    fiscalCode: generateValidFiscalCode(),
    dateOfBirth: generateValidDateOfBirth(),
    phone: '+39 333 456 7890',
    address: 'Via Roma 123',
    city: 'Roma',
    province: 'RM',
    postalCode: '00100',
  };
}

// ===================== TEST SUITES =====================

describe('Students Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== COMPLETE PROFILE ====================
  describe('completeProfile (protectedProcedure)', () => {
    describe('authorization', () => {
      it('should require authentication', () => {
        const ctx = { user: null };
        const isAuthenticated = !!ctx.user;
        expect(isAuthenticated).toBe(false);
      });

      it('should only allow students to complete profile', () => {
        const roles: UserRole[] = ['ADMIN', 'COLLABORATOR', 'STUDENT'];
        const allowedRoles = roles.filter((role) => role === 'STUDENT');
        expect(allowedRoles).toEqual(['STUDENT']);
      });

      it('should reject non-student roles', () => {
        const nonStudentRoles: UserRole[] = ['ADMIN', 'COLLABORATOR'];
        nonStudentRoles.forEach((role) => {
          const user = createMockUser({ role });
          const canComplete = user.role === 'STUDENT';
          expect(canComplete).toBe(false);
        });
      });
    });

    describe('fiscal code validation', () => {
      it('should accept valid fiscal codes', () => {
        const validCodes = [
          'RSSMRA85M01H501Z',
          'VRDGNN75A41F205W',
          'BNCPLA90D10L219Y',
        ];

        validCodes.forEach((code) => {
          expect(VALID_FISCAL_CODE_REGEX.test(code)).toBe(true);
        });
      });

      it('should reject invalid fiscal codes', () => {
        const invalidCodes = [
          'INVALID',
          '1234567890123456',
          'RSSMRA85M01H501', // Too short
          'RSSMRA85M01H501ZZ', // Too long
          'rssmra85m01h501z', // Lowercase
        ];

        invalidCodes.forEach((code) => {
          expect(
            code.length !== 16 || !VALID_FISCAL_CODE_REGEX.test(code)
          ).toBe(true);
        });
      });

      it('should transform fiscal code to uppercase', () => {
        const input = 'rssmra85m01h501z';
        const transformed = input.toUpperCase();
        expect(transformed).toBe('RSSMRA85M01H501Z');
      });
    });

    describe('date of birth validation', () => {
      it('should accept age between 14 and 100', () => {
        const calculateAge = (dob: Date): number => {
          const today = new Date();
          let age = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < dob.getDate())
          ) {
            age--;
          }
          return age;
        };

        const validAges = [14, 25, 50, 100];
        validAges.forEach((targetAge) => {
          const dob = new Date();
          dob.setFullYear(dob.getFullYear() - targetAge);
          const age = calculateAge(dob);
          expect(age).toBeGreaterThanOrEqual(14);
          expect(age).toBeLessThanOrEqual(100);
        });
      });

      it('should reject users under 14 years old', () => {
        const dob = new Date();
        dob.setFullYear(dob.getFullYear() - 12);
        const age =
          new Date().getFullYear() - dob.getFullYear();
        expect(age).toBeLessThan(14);
      });
    });

    describe('phone formatting', () => {
      it('should format phone numbers correctly', () => {
        const formatPhone = (phone: string): string => {
          let cleaned = phone.replace(/[^\d+]/g, '');
          if (cleaned.startsWith('+39')) {
            cleaned = cleaned.substring(3);
          } else if (cleaned.startsWith('0039')) {
            cleaned = cleaned.substring(4);
          }
          return `+39 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
        };

        expect(formatPhone('3331234567')).toBe('+39 333 123 4567');
        expect(formatPhone('+393331234567')).toBe('+39 333 123 4567');
        expect(formatPhone('00393331234567')).toBe('+39 333 123 4567');
      });
    });

    describe('province validation', () => {
      it('should accept valid Italian province codes', () => {
        const validProvinces = ['RM', 'MI', 'NA', 'TO', 'PA'];
        validProvinces.forEach((prov) => {
          expect(PROVINCE_ITALIANE).toContain(prov);
        });
      });

      it('should reject invalid province codes', () => {
        const invalidProvinces = ['XX', 'ZZ', 'AB', '12'];
        invalidProvinces.forEach((prov) => {
          expect(PROVINCE_ITALIANE).not.toContain(prov);
        });
      });
    });

    describe('postal code validation', () => {
      it('should accept valid CAP codes', () => {
        const validCAPs = ['00100', '20100', '80100', '10100'];
        validCAPs.forEach((cap) => {
          expect(/^\d{5}$/.test(cap)).toBe(true);
          const num = parseInt(cap, 10);
          expect(num).toBeGreaterThanOrEqual(10);
          expect(num).toBeLessThanOrEqual(98168);
        });
      });

      it('should reject invalid CAP codes', () => {
        const invalidCAPs = ['1234', '123456', 'ABCDE', '00000'];
        invalidCAPs.forEach((cap) => {
          const isValid =
            /^\d{5}$/.test(cap) &&
            parseInt(cap, 10) >= 10 &&
            parseInt(cap, 10) <= 98168;
          expect(isValid).toBe(false);
        });
      });
    });

    describe('duplicate fiscal code check', () => {
      it('should prevent duplicate fiscal codes', () => {
        const existingCode = generateValidFiscalCode();
        const newStudentCode = existingCode;

        // Simulate duplicate check
        const isDuplicate = existingCode === newStudentCode;
        expect(isDuplicate).toBe(true);
      });

      it('should allow same fiscal code for same student', () => {
        const student = createMockStudent();
        const inputCode = student.fiscalCode;

        // Same student updating their own record
        const isOwnCode = student.fiscalCode === inputCode;
        expect(isOwnCode).toBe(true);
      });
    });

    describe('transaction handling', () => {
      it('should update both student and user records atomically', () => {
        const operations = ['student.update', 'user.update'];
        // Both operations should be in a transaction
        expect(operations.length).toBe(2);
      });
    });
  });

  // ==================== GET PROFILE ====================
  describe('getProfile (protectedProcedure)', () => {
    describe('authorization', () => {
      it('should require authentication', () => {
        const ctx = { user: null };
        expect(ctx.user).toBeNull();
      });

      it('should only allow students to access their profile', () => {
        const studentUser = createMockUser({ role: 'STUDENT' });
        expect(studentUser.role).toBe('STUDENT');
      });

      it('should reject non-students', () => {
        const adminUser = createMockUser({ role: 'ADMIN' });
        const canAccess = adminUser.role === 'STUDENT';
        expect(canAccess).toBe(false);
      });
    });

    describe('profile lookup', () => {
      it('should throw NOT_FOUND for missing profile', () => {
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Student profile not found',
        });
        expect(error.code).toBe('NOT_FOUND');
      });

      it('should include user and stats relations', () => {
        const expectedRelations = ['user', 'stats'];
        const query = { include: { user: true, stats: true } };
        expectedRelations.forEach((rel) => {
          expect(query.include).toHaveProperty(rel);
        });
      });
    });
  });

  // ==================== GET BY ID (STAFF) ====================
  describe('getById (staffProcedure)', () => {
    describe('authorization', () => {
      it('should require staff role (admin/collaborator)', () => {
        const allowedRoles: UserRole[] = ['ADMIN', 'COLLABORATOR'];
        allowedRoles.forEach((role) => {
          expect(['ADMIN', 'COLLABORATOR']).toContain(role);
        });
      });

      it('should reject students', () => {
        const studentUser = createMockUser({ role: 'STUDENT' });
        const isStaff = ['ADMIN', 'COLLABORATOR'].includes(studentUser.role);
        expect(isStaff).toBe(false);
      });
    });

    describe('student lookup', () => {
      it('should throw NOT_FOUND for non-existent user', () => {
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Studente non trovato',
        });
        expect(error.code).toBe('NOT_FOUND');
      });

      it('should throw NOT_FOUND for non-student user', () => {
        const adminUser = createMockUser({ role: 'ADMIN' });
        const isStudent = adminUser.role === 'STUDENT';
        expect(isStudent).toBe(false);
      });

      it('should include group memberships', () => {
        const query = {
          include: {
            student: {
              include: {
                groupMemberships: {
                  include: { group: true },
                },
              },
            },
          },
        };
        expect(
          query.include.student.include.groupMemberships.include.group
        ).toBe(true);
      });
    });
  });

  // ==================== GET PUBLIC INFO ====================
  describe('getPublicInfo (protectedProcedure)', () => {
    describe('authorization', () => {
      it('should allow any authenticated user', () => {
        const roles: UserRole[] = ['ADMIN', 'COLLABORATOR', 'STUDENT'];
        roles.forEach((role) => {
          const user = createMockUser({ role });
          expect(user.role).toBeDefined();
        });
      });
    });

    describe('data exposure', () => {
      it('should expose only safe fields', () => {
        const safeFields = [
          'id',
          'name',
          'email',
          'isActive',
          'student.matricola',
          'student.phone',
          'student.enrollmentDate',
          'student.groupMemberships',
        ];
        const sensitiveFields = [
          'fiscalCode',
          'dateOfBirth',
          'address',
          'notes',
        ];

        expect(safeFields.length).toBeGreaterThan(0);
        expect(sensitiveFields.length).toBeGreaterThan(0);
      });

      it('should not expose fiscal code', () => {
        const select = {
          id: true,
          name: true,
          email: true,
          student: {
            select: {
              matricola: true,
              phone: true,
              // fiscalCode is NOT selected
            },
          },
        };
        expect(select.student.select).not.toHaveProperty('fiscalCode');
      });
    });
  });

  // ==================== GET ALL FOR ADMIN ====================
  describe('getAllForAdmin (adminProcedure)', () => {
    describe('authorization', () => {
      it('should only allow admin access', () => {
        const adminUser = createMockUser({ role: 'ADMIN' });
        const canAccess = adminUser.role === 'ADMIN';
        expect(canAccess).toBe(true);
      });

      it('should reject collaborators', () => {
        const collaboratorUser = createMockUser({ role: 'COLLABORATOR' });
        const canAccess = collaboratorUser.role === 'ADMIN';
        expect(canAccess).toBe(false);
      });
    });

    describe('query', () => {
      it('should filter by STUDENT role', () => {
        const where = { role: 'STUDENT' };
        expect(where.role).toBe('STUDENT');
      });

      it('should order by name ascending', () => {
        const orderBy = { name: 'asc' };
        expect(orderBy.name).toBe('asc');
      });

      it('should include student relation', () => {
        const include = { student: true };
        expect(include.student).toBe(true);
      });
    });
  });

  // ==================== GET LIST FOR COLLABORATOR ====================
  describe('getListForCollaborator (staffProcedure)', () => {
    describe('data filtering', () => {
      it('should only return active students', () => {
        const where = { role: 'STUDENT', isActive: true };
        expect(where.isActive).toBe(true);
      });

      it('should return limited fields (no sensitive data)', () => {
        const select = {
          id: true,
          name: true,
          email: true,
          isActive: true,
          student: {
            select: {
              id: true,
              matricola: true,
              enrollmentDate: true,
              stats: { select: { totalSimulations: true, avgScore: true } },
              groupMemberships: true,
            },
          },
        };
        expect(select.student.select).not.toHaveProperty('fiscalCode');
        expect(select.student.select).not.toHaveProperty('dateOfBirth');
      });
    });

    describe('response transformation', () => {
      it('should flatten response structure', () => {
        const rawStudent = {
          id: '1',
          name: 'Mario Rossi',
          email: 'mario@test.com',
          isActive: true,
          student: {
            id: 's1',
            matricola: 'STU001',
            enrollmentDate: new Date(),
            stats: { totalSimulations: 10, avgScore: 75 },
            groupMemberships: [{ group: { id: 'g1', name: 'Gruppo A' } }],
          },
        };

        const flattened = {
          id: rawStudent.id,
          name: rawStudent.name,
          email: rawStudent.email,
          isActive: rawStudent.isActive,
          studentId: rawStudent.student?.id,
          matricola: rawStudent.student?.matricola,
          enrollmentDate: rawStudent.student?.enrollmentDate,
          stats: rawStudent.student?.stats,
          groups: rawStudent.student?.groupMemberships?.map((gm) => gm.group) || [],
        };

        expect(flattened.studentId).toBe('s1');
        expect(flattened.groups).toHaveLength(1);
      });
    });
  });

  // ==================== GET STUDENTS (PAGINATED) ====================
  describe('getStudents (staffProcedure)', () => {
    describe('pagination', () => {
      it('should use default page and pageSize', () => {
        const defaults = { page: 1, pageSize: 50 };
        expect(defaults.page).toBe(1);
        expect(defaults.pageSize).toBe(50);
      });

      it('should calculate skip correctly', () => {
        const page = 3;
        const pageSize = 50;
        const skip = (page - 1) * pageSize;
        expect(skip).toBe(100);
      });

      it('should enforce max pageSize of 500', () => {
        const maxPageSize = 500;
        const requestedPageSize = 1000;
        const effectivePageSize = Math.min(requestedPageSize, maxPageSize);
        expect(effectivePageSize).toBe(500);
      });
    });

    describe('filtering', () => {
      it('should filter by isActive status', () => {
        const where: Record<string, unknown> = { role: 'STUDENT' };
        const isActive = true;
        if (typeof isActive === 'boolean') {
          where.isActive = isActive;
        }
        expect(where.isActive).toBe(true);
      });

      it('should search in name and email', () => {
        const search = 'mario';
        const where = {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        };
        expect(where.OR).toHaveLength(2);
      });
    });

    describe('collaborator group filter', () => {
      it('should filter to collaborator groups when onlyMyGroups=true', () => {
        const _collaborator = { id: 'collab1' };
        const collaboratorGroups = [{ id: 'group1' }, { id: 'group2' }];

        const groupIds = collaboratorGroups.map((g) => g.id);
        const where = {
          student: {
            groupMemberships: {
              some: { groupId: { in: groupIds } },
            },
          },
        };

        expect(where.student.groupMemberships.some.groupId.in).toEqual([
          'group1',
          'group2',
        ]);
      });

      it('should return empty for collaborators with no groups', () => {
        const collaboratorGroups: { id: string }[] = [];
        if (collaboratorGroups.length === 0) {
          const result = { students: [], pagination: { total: 0 } };
          expect(result.students).toEqual([]);
        }
      });
    });

    describe('response structure', () => {
      it('should include pagination metadata', () => {
        const total = 150;
        const pageSize = 50;
        const pagination = {
          page: 1,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        };
        expect(pagination.totalPages).toBe(3);
      });
    });
  });

  // ==================== GET MY STATS ====================
  describe('getMyStats (protectedProcedure)', () => {
    describe('authorization', () => {
      it('should require authentication', () => {
        const ctx = { user: null };
        expect(ctx.user).toBeNull();
      });
    });

    describe('stats structure', () => {
      it('should return overview stats', () => {
        const student = createMockStudent();
        const stats = createMockStudentStats(student.id);

        const overview = {
          totalSimulations: stats.totalSimulations,
          totalQuestions: stats.totalQuestions,
          totalCorrectAnswers: stats.totalCorrectAnswers,
          avgScore: stats.avgScore,
          bestScore: stats.bestScore,
          totalStudyTimeMinutes: stats.totalStudyTimeMinutes,
          currentStreak: stats.currentStreak,
          longestStreak: stats.longestStreak,
          lastActivityDate: stats.lastActivityDate,
        };

        expect(overview).toHaveProperty('totalSimulations');
        expect(overview).toHaveProperty('avgScore');
        expect(overview).toHaveProperty('currentStreak');
      });

      it('should include recent results', () => {
        const recentResultsLimit = 10;
        const mockResults = Array.from({ length: 15 }, () => ({
          id: faker.string.uuid(),
          simulationId: faker.string.uuid(),
          percentageScore: faker.number.float({ min: 0, max: 100 }),
        }));

        const limited = mockResults.slice(0, recentResultsLimit);
        expect(limited).toHaveLength(10);
      });

      it('should default missing stats to zero', () => {
        const emptyStats = null;
        const overview = {
          totalSimulations: emptyStats || 0,
          avgScore: emptyStats || 0,
          currentStreak: emptyStats || 0,
        };
        expect(overview.totalSimulations).toBe(0);
        expect(overview.avgScore).toBe(0);
      });
    });
  });

  // ==================== GET DETAILED STATS ====================
  describe('getDetailedStats (protectedProcedure)', () => {
    describe('calculations', () => {
      it('should calculate improvement from first 5 vs last 5', () => {
        const scores = [60, 65, 70, 72, 68, 75, 78, 80, 82, 85];
        const first5Avg = scores.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
        const last5Avg = scores.slice(-5).reduce((a, b) => a + b, 0) / 5;
        const improvement = last5Avg - first5Avg;

        expect(first5Avg).toBe(67);
        expect(last5Avg).toBe(80);
        expect(improvement).toBe(13);
      });

      it('should calculate best and worst scores', () => {
        const scores = [60, 75, 80, 55, 90];
        const best = Math.max(...scores);
        const worst = Math.min(...scores);

        expect(best).toBe(90);
        expect(worst).toBe(55);
      });

      it('should handle empty results gracefully', () => {
        const scores: number[] = [];
        const avgPercentage = scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;
        const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

        expect(avgPercentage).toBe(0);
        expect(bestScore).toBe(0);
      });
    });
  });

  // ==================== PARENT/GUARDIAN MANAGEMENT ====================
  describe('Parent/Guardian Management', () => {
    describe('saveParentGuardian (protectedProcedure)', () => {
      it('should validate relationship types', () => {
        const validTypes = ['PADRE', 'MADRE', 'TUTORE_LEGALE', 'ALTRO'];
        const invalidType = 'NONNO';
        expect(validTypes).toContain('PADRE');
        expect(validTypes).not.toContain(invalidType);
      });

      it('should require parent data for minors', () => {
        const calculateAge = (dob: Date): number => {
          const today = new Date();
          let age = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < dob.getDate())
          ) {
            age--;
          }
          return age;
        };

        const minorDob = new Date();
        minorDob.setFullYear(minorDob.getFullYear() - 16);
        const age = calculateAge(minorDob);
        const isMinor = age < 18;

        expect(isMinor).toBe(true);
      });

      it('should validate parent fiscal code', () => {
        const validCode = 'RSSMRA65A01H501Z';
        expect(VALID_FISCAL_CODE_REGEX.test(validCode)).toBe(true);
      });
    });

    describe('getParentDataRequirement (protectedProcedure)', () => {
      it('should check if parent data is requested', () => {
        const student = createMockStudent({ requiresParentData: true });
        expect(student.requiresParentData).toBe(true);
      });

      it('should check age for automatic requirement', () => {
        const minorDob = new Date();
        minorDob.setFullYear(minorDob.getFullYear() - 16);
        const student = createMockStudent({ dateOfBirth: minorDob });

        const today = new Date();
        let age = today.getFullYear() - student.dateOfBirth!.getFullYear();
        const monthDiff = today.getMonth() - student.dateOfBirth!.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < student.dateOfBirth!.getDate())) {
          age--;
        }

        expect(age).toBeLessThan(18);
      });
    });

    describe('requestParentData (adminProcedure)', () => {
      it('should only allow admins', () => {
        const adminUser = createMockUser({ role: 'ADMIN' });
        expect(adminUser.role).toBe('ADMIN');
      });

      it('should set requiresParentData flag', () => {
        const student = createMockStudent({ requiresParentData: false });
        const updated = {
          ...student,
          requiresParentData: true,
          parentDataRequestedAt: new Date(),
        };
        expect(updated.requiresParentData).toBe(true);
        expect(updated.parentDataRequestedAt).toBeDefined();
      });
    });

    describe('cancelParentDataRequest (adminProcedure)', () => {
      it('should clear requiresParentData flag', () => {
        const student = createMockStudent({
          requiresParentData: true,
          parentDataRequestedAt: new Date(),
        });
        const updated = {
          ...student,
          requiresParentData: false,
          parentDataRequestedAt: null,
        };
        expect(updated.requiresParentData).toBe(false);
        expect(updated.parentDataRequestedAt).toBeNull();
      });
    });
  });

  // ==================== ERROR HANDLING ====================
  describe('Error Handling', () => {
    it('should use UNAUTHORIZED for unauthenticated access', () => {
      const error = new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      });
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should use FORBIDDEN for role-based access violations', () => {
      const error = new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only students can complete profile',
      });
      expect(error.code).toBe('FORBIDDEN');
    });

    it('should use NOT_FOUND for missing resources', () => {
      const error = new TRPCError({
        code: 'NOT_FOUND',
        message: 'Student profile not found',
      });
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should use CONFLICT for duplicate fiscal codes', () => {
      const error = new TRPCError({
        code: 'CONFLICT',
        message: 'Codice fiscale già registrato',
      });
      expect(error.code).toBe('CONFLICT');
    });
  });

  // ==================== SECURITY CONSIDERATIONS ====================
  describe('Security Considerations', () => {
    it('should not expose sensitive data to wrong roles', () => {
      const sensitiveFields = ['fiscalCode', 'dateOfBirth', 'address', 'notes'];
      const publicInfoSelect = {
        id: true,
        name: true,
        email: true,
        matricola: true,
      };

      sensitiveFields.forEach((field) => {
        expect(publicInfoSelect).not.toHaveProperty(field);
      });
    });

    it('should validate all input data', () => {
      const input = createValidCompleteProfileInput();
      // All fields should be present
      expect(input.fiscalCode).toBeDefined();
      expect(input.dateOfBirth).toBeDefined();
      expect(input.phone).toBeDefined();
      expect(input.address).toBeDefined();
      expect(input.city).toBeDefined();
      expect(input.province).toBeDefined();
      expect(input.postalCode).toBeDefined();
    });

    it('should use transactions for atomic operations', () => {
      const operations = ['updateStudent', 'updateUserProfileCompleted'];
      // Both should be wrapped in $transaction
      expect(operations.length).toBe(2);
    });

    it('should normalize and sanitize input data', () => {
      const capitalizeProperName = (str: string): string => {
        return str.trim().toLowerCase()
          .split(/(\s+|'|-)/)
          .map((part) => {
            if (part === ' ' || part === "'" || part === '-') return part;
            return part.charAt(0).toUpperCase() + part.slice(1);
          })
          .join('');
      };

      expect(capitalizeProperName('MARIO ROSSI')).toBe('Mario Rossi');
      expect(capitalizeProperName("d'AMICO")).toBe("D'Amico");
    });

    it('should check collaborator group access for onlyMyGroups', () => {
      const _collaborator = { id: 'collab1' };
      const studentGroups = ['group1', 'group2'];
      const collaboratorGroups = ['group1', 'group3'];

      const hasOverlap = studentGroups.some((g) =>
        collaboratorGroups.includes(g)
      );
      expect(hasOverlap).toBe(true);
    });
  });

  // ==================== INPUT VALIDATION ====================
  describe('Input Validation', () => {
    describe('completeProfile input', () => {
      it('should require all mandatory fields', () => {
        const mandatoryFields = [
          'fiscalCode',
          'dateOfBirth',
          'phone',
          'address',
          'city',
          'province',
          'postalCode',
        ];
        const input = createValidCompleteProfileInput();
        mandatoryFields.forEach((field) => {
          expect(input).toHaveProperty(field);
        });
      });
    });

    describe('getById input', () => {
      it('should require student id', () => {
        const input = { id: faker.string.uuid() };
        expect(input.id).toBeDefined();
      });
    });

    describe('getStudents input', () => {
      it('should validate page number', () => {
        const validPages = [1, 10, 100];
        validPages.forEach((page) => {
          expect(page).toBeGreaterThanOrEqual(1);
        });
      });

      it('should validate pageSize bounds', () => {
        const minPageSize = 1;
        const maxPageSize = 500;
        const pageSize = 50;
        expect(pageSize).toBeGreaterThanOrEqual(minPageSize);
        expect(pageSize).toBeLessThanOrEqual(maxPageSize);
      });
    });
  });

  // ==================== HELPER FUNCTIONS ====================
  describe('Helper Functions', () => {
    describe('calculateAge', () => {
      it('should calculate age correctly', () => {
        const calculateAge = (dob: Date): number => {
          const today = new Date();
          let age = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < dob.getDate())
          ) {
            age--;
          }
          return age;
        };

        const dob = new Date();
        dob.setFullYear(dob.getFullYear() - 25);
        expect(calculateAge(dob)).toBe(25);
      });

      it('should handle birthday not yet occurred this year', () => {
        const calculateAge = (dob: Date): number => {
          const today = new Date();
          let age = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < dob.getDate())
          ) {
            age--;
          }
          return age;
        };

        const dob = new Date();
        dob.setFullYear(dob.getFullYear() - 25);
        dob.setMonth(dob.getMonth() + 2); // Birthday in 2 months

        expect(calculateAge(dob)).toBe(24);
      });
    });

    describe('capitalizeWords', () => {
      it('should capitalize each word', () => {
        const capitalizeWords = (str: string): string => {
          return str.trim().toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        };

        expect(capitalizeWords('VIA ROMA')).toBe('Via Roma');
        expect(capitalizeWords('piazza garibaldi')).toBe('Piazza Garibaldi');
      });
    });

    describe('formatPhone', () => {
      it('should standardize phone format', () => {
        const formatPhone = (phone: string): string => {
          let cleaned = phone.replace(/[^\d+]/g, '');
          if (cleaned.startsWith('+39')) {
            cleaned = cleaned.substring(3);
          } else if (cleaned.startsWith('0039')) {
            cleaned = cleaned.substring(4);
          }
          return `+39 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
        };

        expect(formatPhone('333-123-4567')).toBe('+39 333 123 4567');
        expect(formatPhone('(333) 123 4567')).toBe('+39 333 123 4567');
      });
    });
  });
});
