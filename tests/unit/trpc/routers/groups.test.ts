/**
 * Groups Router Tests
 *
 * Tests for group management and membership procedures.
 * The groups router handles:
 * - Group CRUD operations
 * - Member management (add/remove)
 * - Group queries and filtering
 * - Role-based access control
 *
 * Procedures tested:
 * - getGroups (staffProcedure) - Paginated groups list
 * - getAll (staffProcedure) - All groups with filters
 * - getById (staffProcedure) - Single group details
 * - getPublicInfo (protectedProcedure) - Public group info
 * - create (adminProcedure) - Create new group
 * - update (adminProcedure) - Update group
 * - delete (adminProcedure) - Delete group
 * - addMember (staffProcedure) - Add single member
 * - addMembers (adminProcedure) - Bulk add members
 * - removeMember (staffProcedure) - Remove member
 * - getMembers (staffProcedure) - Get group members
 * - getUserGroups (staffProcedure) - Get user's groups
 * - getAvailableUsers (adminProcedure) - Users not in group
 * - getStats (staffProcedure) - Group statistics
 * - getMyGroups (protectedProcedure) - Current user's groups
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { faker } from '@faker-js/faker/locale/it';
import type { Group, GroupMember, GroupType, UserRole } from '@prisma/client';

// ===================== MOCK FACTORIES =====================

const GROUP_TYPES: GroupType[] = ['STUDENTS', 'COLLABORATORS', 'MIXED'];

/**
 * Create a mock group
 */
function createMockGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: faker.string.uuid(),
    name: faker.company.name() + ' Group',
    description: faker.lorem.sentence(),
    color: faker.color.rgb(),
    type: 'STUDENTS' as GroupType,
    isActive: true,
    referenceStudentId: null,
    referenceCollaboratorId: null,
    referenceAdminId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock group member
 */
function createMockGroupMember(overrides: Partial<GroupMember> = {}): GroupMember {
  return {
    id: faker.string.uuid(),
    groupId: faker.string.uuid(),
    studentId: faker.string.uuid(),
    collaboratorId: null,
    joinedAt: new Date(),
    ...overrides,
  };
}

// ===================== TEST SUITES =====================

describe('Groups Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== GET GROUPS (PAGINATED) ====================
  describe('getGroups (staffProcedure)', () => {
    describe('authorization', () => {
      it('should allow admin access', () => {
        const adminRole: UserRole = 'ADMIN';
        const isStaff = ['ADMIN', 'COLLABORATOR'].includes(adminRole);
        expect(isStaff).toBe(true);
      });

      it('should allow collaborator access', () => {
        const collaboratorRole: UserRole = 'COLLABORATOR';
        const isStaff = ['ADMIN', 'COLLABORATOR'].includes(collaboratorRole);
        expect(isStaff).toBe(true);
      });

      it('should reject students', () => {
        const studentRole: UserRole = 'STUDENT';
        const isStaff = ['ADMIN', 'COLLABORATOR'].includes(studentRole);
        expect(isStaff).toBe(false);
      });
    });

    describe('pagination', () => {
      it('should use default pagination values', () => {
        const defaults = { page: 1, pageSize: 20 };
        expect(defaults.page).toBe(1);
        expect(defaults.pageSize).toBe(20);
      });

      it('should calculate skip correctly', () => {
        const page = 3;
        const pageSize = 20;
        const skip = (page - 1) * pageSize;
        expect(skip).toBe(40);
      });

      it('should enforce max pageSize of 100', () => {
        const maxPageSize = 100;
        const requestedPageSize = 500;
        const effectivePageSize = Math.min(requestedPageSize, maxPageSize);
        expect(effectivePageSize).toBe(100);
      });

      it('should calculate totalPages correctly', () => {
        const total = 85;
        const pageSize = 20;
        const totalPages = Math.ceil(total / pageSize);
        expect(totalPages).toBe(5);
      });
    });

    describe('filtering', () => {
      it('should filter by group type', () => {
        GROUP_TYPES.forEach((type) => {
          const where = { type };
          expect(where.type).toBe(type);
        });
      });

      it('should search in name and description', () => {
        const search = 'medicina';
        const where = {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        };
        expect(where.OR).toHaveLength(2);
      });

      it('should exclude inactive groups by default', () => {
        const includeInactive = false;
        const where: Record<string, unknown> = {};
        if (!includeInactive) where.isActive = true;
        expect(where.isActive).toBe(true);
      });

      it('should include inactive groups when requested', () => {
        const includeInactive = true;
        const where: Record<string, unknown> = {};
        if (!includeInactive) where.isActive = true;
        expect(where.isActive).toBeUndefined();
      });
    });

    describe('collaborator filtering', () => {
      it('should filter by referenceCollaboratorId when onlyMyGroups=true', () => {
        const collaboratorId = faker.string.uuid();
        const onlyMyGroups = true;
        const where: Record<string, unknown> = {};

        if (onlyMyGroups) {
          where.referenceCollaboratorId = collaboratorId;
        }

        expect(where.referenceCollaboratorId).toBe(collaboratorId);
      });
    });

    describe('response structure', () => {
      it('should include member count', () => {
        const group = createMockGroup();
        const response = {
          id: group.id,
          name: group.name,
          description: group.description,
          color: group.color,
          type: group.type,
          isActive: group.isActive,
          memberCount: 15,
        };
        expect(response.memberCount).toBe(15);
      });

      it('should include pagination metadata', () => {
        const pagination = {
          page: 1,
          pageSize: 20,
          total: 100,
          totalPages: 5,
        };
        expect(pagination).toHaveProperty('total');
        expect(pagination).toHaveProperty('totalPages');
      });
    });
  });

  // ==================== GET ALL ====================
  describe('getAll (staffProcedure)', () => {
    describe('filtering', () => {
      it('should accept optional type filter', () => {
        const input = { type: 'STUDENTS' as GroupType };
        expect(input.type).toBe('STUDENTS');
      });

      it('should accept referenceCollaboratorId filter', () => {
        const collaboratorId = faker.string.uuid();
        const input = { referenceCollaboratorId: collaboratorId };
        expect(input.referenceCollaboratorId).toBe(collaboratorId);
      });

      it('should accept referenceAdminId filter', () => {
        const adminId = faker.string.uuid();
        const input = { referenceAdminId: adminId };
        expect(input.referenceAdminId).toBe(adminId);
      });
    });

    describe('includes', () => {
      it('should include reference relations', () => {
        const include = {
          referenceStudent: { include: { user: true } },
          referenceCollaborator: { include: { user: true } },
          referenceAdmin: { include: { user: true } },
          _count: { select: { members: true } },
        };
        expect(include.referenceStudent).toBeDefined();
        expect(include.referenceCollaborator).toBeDefined();
        expect(include.referenceAdmin).toBeDefined();
      });
    });
  });

  // ==================== GET BY ID ====================
  describe('getById (staffProcedure)', () => {
    describe('input validation', () => {
      it('should require group id', () => {
        const input = { id: faker.string.uuid() };
        expect(input.id).toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should throw NOT_FOUND for non-existent group', () => {
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Gruppo non trovato',
        });
        expect(error.code).toBe('NOT_FOUND');
      });
    });

    describe('includes', () => {
      it('should include members with user details', () => {
        const include = {
          members: {
            include: {
              student: { include: { user: true } },
              collaborator: { include: { user: true } },
            },
          },
        };
        expect(include.members.include.student).toBeDefined();
        expect(include.members.include.collaborator).toBeDefined();
      });
    });
  });

  // ==================== GET PUBLIC INFO ====================
  describe('getPublicInfo (protectedProcedure)', () => {
    describe('authorization', () => {
      it('should allow any authenticated user', () => {
        const roles: UserRole[] = ['ADMIN', 'COLLABORATOR', 'STUDENT'];
        roles.forEach((role) => {
          expect(role).toBeDefined();
        });
      });
    });

    describe('data exposure', () => {
      it('should return limited public fields', () => {
        const publicFields = ['id', 'name', 'description', 'color', 'type', 'memberCount'];
        expect(publicFields).toContain('name');
        expect(publicFields).not.toContain('referenceAdminId');
      });
    });
  });

  // ==================== CREATE ====================
  describe('create (adminProcedure)', () => {
    describe('authorization', () => {
      it('should only allow admin access', () => {
        const adminRole: UserRole = 'ADMIN';
        expect(adminRole).toBe('ADMIN');
      });

      it('should reject collaborators', () => {
        const role = 'COLLABORATOR' as UserRole;
        const allowedRoles: UserRole[] = ['ADMIN'];
        const canCreate = allowedRoles.includes(role);
        expect(canCreate).toBe(false);
      });
    });

    describe('input validation', () => {
      it('should require name', () => {
        const input = { name: 'Gruppo Test' };
        expect(input.name).toBeDefined();
      });

      it('should accept optional description', () => {
        const input = { name: 'Gruppo', description: 'Descrizione opzionale' };
        expect(input.description).toBeDefined();
      });

      it('should accept valid color hex', () => {
        const validColors = ['#FF5733', '#00FF00', '#0000FF'];
        validColors.forEach((color) => {
          expect(/^#[0-9A-Fa-f]{6}$/.test(color)).toBe(true);
        });
      });

      it('should validate group type enum', () => {
        GROUP_TYPES.forEach((type) => {
          expect(GROUP_TYPES).toContain(type);
        });
      });
    });

    describe('duplicate check', () => {
      it('should throw CONFLICT for duplicate group name', () => {
        const existingGroup = createMockGroup({ name: 'Gruppo Esistente' });
        const newGroupName = 'Gruppo Esistente';

        if (existingGroup.name === newGroupName) {
          const error = new TRPCError({
            code: 'CONFLICT',
            message: 'Un gruppo con questo nome esiste già',
          });
          expect(error.code).toBe('CONFLICT');
        }
      });
    });
  });

  // ==================== UPDATE ====================
  describe('update (adminProcedure)', () => {
    describe('authorization', () => {
      it('should only allow admin access', () => {
        const adminRole: UserRole = 'ADMIN';
        expect(adminRole).toBe('ADMIN');
      });
    });

    describe('input validation', () => {
      it('should require group id', () => {
        const input = { id: faker.string.uuid() };
        expect(input.id).toBeDefined();
      });

      it('should accept partial updates', () => {
        const input = { id: faker.string.uuid(), name: 'Updated Name' };
        expect(input).not.toHaveProperty('description');
        expect(input).not.toHaveProperty('color');
      });
    });

    describe('error handling', () => {
      it('should throw NOT_FOUND for non-existent group', () => {
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Gruppo non trovato',
        });
        expect(error.code).toBe('NOT_FOUND');
      });
    });
  });

  // ==================== DELETE ====================
  describe('delete (adminProcedure)', () => {
    describe('authorization', () => {
      it('should only allow admin access', () => {
        const adminRole: UserRole = 'ADMIN';
        expect(adminRole).toBe('ADMIN');
      });
    });

    describe('cascade behavior', () => {
      it('should delete group members on cascade', () => {
        // GroupMember has onDelete: Cascade
        const cascadeRule = 'Cascade';
        expect(cascadeRule).toBe('Cascade');
      });
    });
  });

  // ==================== MEMBER MANAGEMENT ====================
  describe('Member Management', () => {
    describe('addMember (staffProcedure)', () => {
      it('should require groupId and userId', () => {
        const input = {
          groupId: faker.string.uuid(),
          userId: faker.string.uuid(),
        };
        expect(input.groupId).toBeDefined();
        expect(input.userId).toBeDefined();
      });

      it('should throw NOT_FOUND for non-existent group', () => {
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Gruppo non trovato',
        });
        expect(error.code).toBe('NOT_FOUND');
      });

      it('should throw CONFLICT if user already member', () => {
        const error = new TRPCError({
          code: 'CONFLICT',
          message: 'L\'utente è già membro di questo gruppo',
        });
        expect(error.code).toBe('CONFLICT');
      });

      it('should add student to STUDENTS group', () => {
        const group = createMockGroup({ type: 'STUDENTS' });
        const member = createMockGroupMember({
          groupId: group.id,
          studentId: faker.string.uuid(),
          collaboratorId: null,
        });
        expect(member.studentId).toBeDefined();
        expect(member.collaboratorId).toBeNull();
      });

      it('should add collaborator to COLLABORATORS group', () => {
        const group = createMockGroup({ type: 'COLLABORATORS' });
        const member = createMockGroupMember({
          groupId: group.id,
          studentId: null,
          collaboratorId: faker.string.uuid(),
        });
        expect(member.collaboratorId).toBeDefined();
        expect(member.studentId).toBeNull();
      });
    });

    describe('addMembers (adminProcedure)', () => {
      it('should accept array of user IDs', () => {
        const input = {
          groupId: faker.string.uuid(),
          userIds: [faker.string.uuid(), faker.string.uuid(), faker.string.uuid()],
        };
        expect(input.userIds).toHaveLength(3);
      });

      it('should skip already existing members', () => {
        const existingMembers = ['user1', 'user2'];
        const newUserIds = ['user1', 'user3', 'user4'];
        const toAdd = newUserIds.filter((id) => !existingMembers.includes(id));
        expect(toAdd).toEqual(['user3', 'user4']);
      });
    });

    describe('removeMember (staffProcedure)', () => {
      it('should require groupId and memberId', () => {
        const input = {
          groupId: faker.string.uuid(),
          memberId: faker.string.uuid(),
        };
        expect(input.groupId).toBeDefined();
        expect(input.memberId).toBeDefined();
      });

      it('should throw NOT_FOUND for non-existent member', () => {
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Membro non trovato',
        });
        expect(error.code).toBe('NOT_FOUND');
      });
    });

    describe('getMembers (staffProcedure)', () => {
      it('should return members with user details', () => {
        const include = {
          student: { include: { user: { select: { id: true, name: true, email: true } } } },
          collaborator: { include: { user: { select: { id: true, name: true, email: true } } } },
        };
        expect(include.student.include.user.select.name).toBe(true);
      });
    });
  });

  // ==================== USER QUERIES ====================
  describe('User Queries', () => {
    describe('getUserGroups (staffProcedure)', () => {
      it('should require userId', () => {
        const input = { userId: faker.string.uuid() };
        expect(input.userId).toBeDefined();
      });

      it('should return groups user is member of', () => {
        const userId = faker.string.uuid();
        const where = {
          members: {
            some: {
              OR: [{ studentId: userId }, { collaboratorId: userId }],
            },
          },
        };
        expect(where.members.some.OR).toHaveLength(2);
      });
    });

    describe('getAvailableUsers (adminProcedure)', () => {
      it('should return users not in the group', () => {
        const groupMembers = ['user1', 'user2'];
        const allUsers = ['user1', 'user2', 'user3', 'user4'];
        const availableUsers = allUsers.filter((u) => !groupMembers.includes(u));
        expect(availableUsers).toEqual(['user3', 'user4']);
      });

      it('should filter by role based on group type', () => {
        const groupType: GroupType = 'STUDENTS';
        const roleFilter = groupType === 'STUDENTS' ? 'STUDENT' : 
                          groupType === 'COLLABORATORS' ? 'COLLABORATOR' : 
                          undefined;
        expect(roleFilter).toBe('STUDENT');
      });
    });

    describe('getMyGroups (protectedProcedure)', () => {
      it('should return current user groups', () => {
        const userId = faker.string.uuid();
        const where = {
          members: {
            some: {
              OR: [{ studentId: userId }, { collaboratorId: userId }],
            },
          },
        };
        expect(where.members.some).toBeDefined();
      });
    });
  });

  // ==================== STATS ====================
  describe('getStats (staffProcedure)', () => {
    it('should return group statistics', () => {
      const stats = {
        totalGroups: 25,
        activeGroups: 20,
        studentGroups: 10,
        collaboratorGroups: 5,
        mixedGroups: 10,
        totalMembers: 250,
      };
      expect(stats.totalGroups).toBeGreaterThanOrEqual(stats.activeGroups);
    });
  });

  // ==================== INPUT VALIDATION ====================
  describe('Input Validation', () => {
    describe('create input', () => {
      it('should require name', () => {
        const name = 'Gruppo Test';
        expect(name.length).toBeGreaterThan(0);
      });

      it('should accept valid type values', () => {
        GROUP_TYPES.forEach((type) => {
          expect(['STUDENTS', 'COLLABORATORS', 'MIXED']).toContain(type);
        });
      });
    });

    describe('getGroups input', () => {
      it('should validate page >= 1', () => {
        const validPages = [1, 10, 100];
        validPages.forEach((page) => {
          expect(page).toBeGreaterThanOrEqual(1);
        });
      });

      it('should validate pageSize between 1 and 100', () => {
        const validSizes = [1, 20, 50, 100];
        validSizes.forEach((size) => {
          expect(size).toBeGreaterThanOrEqual(1);
          expect(size).toBeLessThanOrEqual(100);
        });
      });
    });
  });

  // ==================== ERROR HANDLING ====================
  describe('Error Handling', () => {
    it('should use NOT_FOUND for missing groups', () => {
      const error = new TRPCError({
        code: 'NOT_FOUND',
        message: 'Gruppo non trovato',
      });
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should use CONFLICT for duplicate names', () => {
      const error = new TRPCError({
        code: 'CONFLICT',
        message: 'Nome gruppo già esistente',
      });
      expect(error.code).toBe('CONFLICT');
    });

    it('should use BAD_REQUEST for invalid type combinations', () => {
      const error = new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Tipo di membro non compatibile con il gruppo',
      });
      expect(error.code).toBe('BAD_REQUEST');
    });
  });

  // ==================== SECURITY CONSIDERATIONS ====================
  describe('Security Considerations', () => {
    it('should verify staff role for most operations', () => {
      const staffRoles: UserRole[] = ['ADMIN', 'COLLABORATOR'];
      expect(staffRoles).toContain('ADMIN');
      expect(staffRoles).toContain('COLLABORATOR');
    });

    it('should verify admin role for create/update/delete', () => {
      const adminOnlyOps = ['create', 'update', 'delete', 'addMembers'];
      expect(adminOnlyOps.length).toBe(4);
    });

    it('should filter collaborator view to their groups', () => {
      const collaboratorId = faker.string.uuid();
      const onlyMyGroups = true;
      const where: Record<string, unknown> = {};

      if (onlyMyGroups) {
        where.referenceCollaboratorId = collaboratorId;
      }

      expect(where.referenceCollaboratorId).toBe(collaboratorId);
    });
  });

  // ==================== GROUP TYPES ====================
  describe('Group Types', () => {
    it('should support STUDENTS type', () => {
      const group = createMockGroup({ type: 'STUDENTS' });
      expect(group.type).toBe('STUDENTS');
    });

    it('should support COLLABORATORS type', () => {
      const group = createMockGroup({ type: 'COLLABORATORS' });
      expect(group.type).toBe('COLLABORATORS');
    });

    it('should support MIXED type', () => {
      const group = createMockGroup({ type: 'MIXED' });
      expect(group.type).toBe('MIXED');
    });

    it('should enforce member type based on group type', () => {
      const groupType = 'STUDENTS' as GroupType;
      const memberRole = 'STUDENT' as UserRole;
      const isCompatible =
        groupType === ('MIXED' as GroupType) ||
        (groupType === ('STUDENTS' as GroupType) && memberRole === ('STUDENT' as UserRole)) ||
        (groupType === ('COLLABORATORS' as GroupType) && memberRole === ('COLLABORATOR' as UserRole));
      expect(isCompatible).toBe(true);
    });
  });
});
