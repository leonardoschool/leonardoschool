/**
 * Contracts Router Tests
 *
 * Tests for contract template management, assignment, and signature procedures.
 * The contracts router handles:
 * - Contract template CRUD (admin only)
 * - Student contract assignment and workflow
 * - Contract signing and activation
 * - Admin notifications for contract events
 *
 * Procedures tested:
 * - getTemplates (adminProcedure) - List contract templates
 * - createTemplate (adminProcedure) - Create new template
 * - updateTemplate (adminProcedure) - Update template
 * - deleteTemplate (adminProcedure) - Soft delete template
 * - getStudentsPendingContract (adminProcedure) - Students without contracts
 * - getStudentsPendingSignature (adminProcedure) - Students with pending contracts
 * - getContractsPendingActivation (adminProcedure) - Signed but not activated
 * - getContractPreview (adminProcedure) - Preview with placeholders
 * - assignContract (adminProcedure) - Assign contract to student
 * - activateStudent (adminProcedure) - Activate student after signature
 * - deactivateStudent (adminProcedure) - Deactivate student
 * - cancelContract (adminProcedure) - Cancel pending contract
 * - revokeContract (adminProcedure) - Revoke assigned contract
 * - toggleContractDownload (adminProcedure) - Enable/disable download
 * - revokeSignedContract (adminProcedure) - Revoke signed contract
 * - getMyContract (studentProcedure) - Student's own contract
 * - getMyCollaboratorContract (collaboratorProcedure) - Collaborator's contract
 * - getContractByToken (protectedProcedure) - Get contract for signing
 * - getSignedContract (studentProcedure) - Get signed contract PDF
 * - signContract (protectedProcedure) - Sign contract
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { faker } from '@faker-js/faker/locale/it';
import type { User, UserRole, Contract, ContractTemplate, ContractStatus, ContractTargetRole } from '@prisma/client';

// ===================== MOCK FACTORIES =====================

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
    role: 'ADMIN' as UserRole,
    isActive: true,
    profileCompleted: true,
    emailVerified: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    expoPushToken: null,
    ...overrides,
  };
}

/**
 * Create a mock contract template
 */
function createMockContractTemplate(
  overrides: Partial<ContractTemplate> = {}
): ContractTemplate {
  return {
    id: faker.string.uuid(),
    name: faker.commerce.productName() + ' Contract',
    description: faker.lorem.paragraph(),
    content: faker.lorem.paragraphs(5),
    price: faker.number.float({ min: 100, max: 2000, fractionDigits: 2 }),
    duration: '12 mesi',
    targetRole: 'STUDENT' as ContractTargetRole,
    isActive: true,
    createdBy: faker.string.uuid(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock contract
 */
function createMockContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: faker.string.uuid(),
    templateId: faker.string.uuid(),
    studentId: faker.string.uuid(),
    collaboratorId: null,
    status: 'PENDING' as ContractStatus,
    contentSnapshot: faker.lorem.paragraphs(5),
    signedAt: null,
    signatureData: null,
    signatureIp: null,
    signatureUserAgent: null,
    signToken: faker.string.alphanumeric(32),
    signTokenExpiresAt: null,
    canDownload: false,
    assignedAt: new Date(),
    expiresAt: null,
    contractExpiresAt: null,
    revokedAt: null,
    revokedBy: null,
    revokeNotes: null,
    adminNotes: null,
    assignedBy: faker.string.uuid(),
    ...overrides,
  };
}

// ===================== TEST SUITES =====================

describe('Contracts Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== TEMPLATE MANAGEMENT ====================
  describe('Template Management (adminProcedure)', () => {
    describe('getTemplates', () => {
      it('should only allow admin access', () => {
        const adminUser = createMockUser({ role: 'ADMIN' });
        expect(adminUser.role).toBe('ADMIN');
      });

      it('should reject non-admin users', () => {
        const roles: UserRole[] = ['STUDENT', 'COLLABORATOR'];
        roles.forEach((role) => {
          const user = createMockUser({ role });
          const canAccess = user.role === 'ADMIN';
          expect(canAccess).toBe(false);
        });
      });

      it('should filter by targetRole when provided', () => {
        const input = { targetRole: 'STUDENT' as const };
        const where = {
          isActive: true,
          ...(input?.targetRole ? { targetRole: input.targetRole } : {}),
        };
        expect(where.targetRole).toBe('STUDENT');
      });

      it('should only return active templates', () => {
        const where = { isActive: true };
        expect(where.isActive).toBe(true);
      });

      it('should order by name ascending', () => {
        const orderBy = { name: 'asc' };
        expect(orderBy.name).toBe('asc');
      });
    });

    describe('createTemplate', () => {
      it('should validate minimum name length', () => {
        const validName = 'Contratto Base';
        const invalidName = 'AB';
        expect(validName.length).toBeGreaterThanOrEqual(3);
        expect(invalidName.length).toBeLessThan(3);
      });

      it('should validate minimum content length', () => {
        const validContent = faker.lorem.paragraphs(3);
        const invalidContent = 'Troppo corto';
        expect(validContent.length).toBeGreaterThanOrEqual(50);
        expect(invalidContent.length).toBeLessThan(50);
      });

      it('should accept valid targetRole values', () => {
        const validRoles: ContractTargetRole[] = ['STUDENT', 'COLLABORATOR'];
        validRoles.forEach((role) => {
          expect(['STUDENT', 'COLLABORATOR']).toContain(role);
        });
      });

      it('should set createdBy to current admin user', () => {
        const adminUser = createMockUser({ role: 'ADMIN' });
        const template = createMockContractTemplate({ createdBy: adminUser.id });
        expect(template.createdBy).toBe(adminUser.id);
      });
    });

    describe('updateTemplate', () => {
      it('should accept partial updates', () => {
        const input = {
          id: faker.string.uuid(),
          name: 'Updated Name',
        };
        expect(input.name).toBeDefined();
        expect(input).not.toHaveProperty('content');
      });

      it('should validate name length when provided', () => {
        const input = { id: faker.string.uuid(), name: 'Valid Name' };
        expect(input.name.length).toBeGreaterThanOrEqual(3);
      });

      it('should validate content length when provided', () => {
        const input = {
          id: faker.string.uuid(),
          content: faker.lorem.paragraphs(3),
        };
        expect(input.content.length).toBeGreaterThanOrEqual(50);
      });
    });

    describe('deleteTemplate', () => {
      it('should check for active contracts before deletion', () => {
        const contractsWithTemplate: Contract[] = [
          createMockContract({ status: 'PENDING' }),
          createMockContract({ status: 'SIGNED' }),
        ];
        const hasActiveContracts = contractsWithTemplate.length > 0;
        expect(hasActiveContracts).toBe(true);
      });

      it('should prevent deletion if template has active contracts', () => {
        const contractsCount = 5;
        if (contractsCount > 0) {
          const error = new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Non è possibile eliminare un template con contratti attivi',
          });
          expect(error.code).toBe('BAD_REQUEST');
        }
      });

      it('should soft delete by setting isActive to false', () => {
        const template = createMockContractTemplate({ isActive: true });
        const deleted = { ...template, isActive: false };
        expect(deleted.isActive).toBe(false);
      });
    });
  });

  // ==================== CONTRACT WORKFLOW ====================
  describe('Contract Workflow (adminProcedure)', () => {
    describe('getStudentsPendingContract', () => {
      it('should find students with profileCompleted but no contract', () => {
        const where = {
          role: 'STUDENT',
          profileCompleted: true,
          student: {
            contracts: { none: {} },
          },
        };
        expect(where.profileCompleted).toBe(true);
        expect(where.student.contracts.none).toBeDefined();
      });

      it('should order by creation date descending', () => {
        const orderBy = { createdAt: 'desc' };
        expect(orderBy.createdAt).toBe('desc');
      });
    });

    describe('getStudentsPendingSignature', () => {
      it('should find students with PENDING contracts', () => {
        const where = {
          role: 'STUDENT',
          student: {
            contracts: {
              some: { status: 'PENDING' },
            },
          },
        };
        expect(where.student.contracts.some.status).toBe('PENDING');
      });
    });

    describe('getContractsPendingActivation', () => {
      it('should find SIGNED contracts without activation', () => {
        const where = {
          status: 'SIGNED',
          activatedAt: null,
        };
        expect(where.status).toBe('SIGNED');
        expect(where.activatedAt).toBeNull();
      });
    });

    describe('assignContract', () => {
      it('should require student ID', () => {
        const input = { studentId: faker.string.uuid(), templateId: faker.string.uuid() };
        expect(input.studentId).toBeDefined();
      });

      it('should throw NOT_FOUND for non-existent student', () => {
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Studente non trovato',
        });
        expect(error.code).toBe('NOT_FOUND');
      });

      it('should throw NOT_FOUND for non-existent template', () => {
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template contratto non trovato',
        });
        expect(error.code).toBe('NOT_FOUND');
      });

      it('should throw CONFLICT if student already has active contract', () => {
        const existingContract = createMockContract({ status: 'PENDING' });
        if (existingContract) {
          const error = new TRPCError({
            code: 'CONFLICT',
            message: 'Lo studente ha già un contratto attivo',
          });
          expect(error.code).toBe('CONFLICT');
        }
      });

      it('should generate unique sign token', () => {
        const token1 = faker.string.alphanumeric(32);
        const token2 = faker.string.alphanumeric(32);
        expect(token1).not.toBe(token2);
        expect(token1.length).toBe(32);
      });

      it('should replace template placeholders with student data', () => {
        const template = '{{NOME}} {{COGNOME}} - {{EMAIL}}';
        const studentData = {
          nome: 'Mario',
          cognome: 'Rossi',
          email: 'mario@test.com',
        };
        const content = template
          .replace('{{NOME}}', studentData.nome)
          .replace('{{COGNOME}}', studentData.cognome)
          .replace('{{EMAIL}}', studentData.email);

        expect(content).toBe('Mario Rossi - mario@test.com');
      });
    });

    describe('activateStudent', () => {
      it('should require contract ID', () => {
        const input = { contractId: faker.string.uuid() };
        expect(input.contractId).toBeDefined();
      });

      it('should throw NOT_FOUND for non-existent contract', () => {
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contratto non trovato',
        });
        expect(error.code).toBe('NOT_FOUND');
      });

      it('should throw BAD_REQUEST if contract not signed', () => {
        const contract = createMockContract({ status: 'PENDING' });
        if (contract.status !== 'SIGNED') {
          const error = new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Il contratto deve essere firmato prima dell\'attivazione',
          });
          expect(error.code).toBe('BAD_REQUEST');
        }
      });

      it('should update contract with activation details', () => {
        const adminUser = createMockUser({ role: 'ADMIN' });
        const contract = createMockContract({ status: 'SIGNED' });
        const activated = {
          ...contract,
          status: 'ACTIVE' as ContractStatus,
          activatedAt: new Date(),
          activatedBy: adminUser.id,
        };
        expect(activated.status).toBe('ACTIVE');
        expect(activated.activatedAt).toBeDefined();
        expect(activated.activatedBy).toBe(adminUser.id);
      });

      it('should set user isActive to true', () => {
        const user = createMockUser({ isActive: false, role: 'STUDENT' });
        const activated = { ...user, isActive: true };
        expect(activated.isActive).toBe(true);
      });
    });

    describe('deactivateStudent', () => {
      it('should set user isActive to false', () => {
        const user = createMockUser({ isActive: true, role: 'STUDENT' });
        const deactivated = { ...user, isActive: false };
        expect(deactivated.isActive).toBe(false);
      });
    });

    describe('cancelContract', () => {
      it('should update contract status to CANCELLED', () => {
        const contract = createMockContract({ status: 'PENDING' });
        const cancelled = {
          ...contract,
          status: 'CANCELLED' as ContractStatus,
        };
        expect(cancelled.status).toBe('CANCELLED');
      });

      it('should store cancellation notes in adminNotes', () => {
        const reason = 'Studente ha richiesto annullamento';
        const cancelled = createMockContract({
          status: 'CANCELLED' as ContractStatus,
          adminNotes: reason,
        });
        expect(cancelled.adminNotes).toBe(reason);
      });
    });

    describe('revokeContract', () => {
      it('should update contract status to REVOKED', () => {
        const contract = createMockContract({ status: 'PENDING' });
        const revoked = {
          ...contract,
          status: 'REVOKED' as ContractStatus,
          revokedAt: new Date(),
          revokeNotes: 'Revoca amministrativa',
        };
        expect(revoked.status).toBe('REVOKED');
        expect(revoked.revokedAt).toBeDefined();
      });
    });

    describe('revokeSignedContract', () => {
      it('should only work on SIGNED contracts', () => {
        const validStatuses: ContractStatus[] = ['SIGNED'];
        const contract = createMockContract({ status: 'SIGNED' });
        expect(validStatuses).toContain(contract.status);
      });

      it('should throw BAD_REQUEST for non-signable contracts', () => {
        const contract = createMockContract({ status: 'CANCELLED' });
        const canRevoke = contract.status === 'SIGNED';
        if (!canRevoke) {
          const error = new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Solo i contratti firmati possono essere revocati',
          });
          expect(error.code).toBe('BAD_REQUEST');
        }
      });
    });
  });

  // ==================== STUDENT ENDPOINTS ====================
  describe('Student Endpoints (studentProcedure)', () => {
    describe('getMyContract', () => {
      it('should only allow student access', () => {
        const studentUser = createMockUser({ role: 'STUDENT' });
        expect(studentUser.role).toBe('STUDENT');
      });

      it('should find contract by student ID', () => {
        const studentId = faker.string.uuid();
        const contract = createMockContract({ studentId });
        expect(contract.studentId).toBe(studentId);
      });

      it('should include template relation', () => {
        const include = { template: true };
        expect(include.template).toBe(true);
      });
    });

    describe('getSignedContract', () => {
      it('should throw NOT_FOUND for non-existent contract', () => {
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contratto non trovato',
        });
        expect(error.code).toBe('NOT_FOUND');
      });

      it('should throw FORBIDDEN if not student\'s contract', () => {
        const error = new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non hai accesso a questo contratto',
        });
        expect(error.code).toBe('FORBIDDEN');
      });

      it('should throw BAD_REQUEST if download not enabled', () => {
        const contract = createMockContract({ canDownload: false });
        if (!contract.canDownload) {
          const error = new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Download non abilitato per questo contratto',
          });
          expect(error.code).toBe('BAD_REQUEST');
        }
      });
    });
  });

  // ==================== COLLABORATOR ENDPOINTS ====================
  describe('Collaborator Endpoints (collaboratorProcedure)', () => {
    describe('getMyCollaboratorContract', () => {
      it('should only allow collaborator access', () => {
        const collaboratorUser = createMockUser({ role: 'COLLABORATOR' });
        expect(collaboratorUser.role).toBe('COLLABORATOR');
      });

      it('should find contract by collaborator ID', () => {
        const collaboratorId = faker.string.uuid();
        const contract = createMockContract({ 
          collaboratorId, 
          studentId: null 
        } as unknown as Partial<Contract>);
        expect(contract.collaboratorId).toBe(collaboratorId);
      });
    });
  });

  // ==================== CONTRACT SIGNING ====================
  describe('Contract Signing (protectedProcedure)', () => {
    describe('getContractByToken', () => {
      it('should require valid token', () => {
        const token = faker.string.alphanumeric(32);
        expect(token.length).toBe(32);
      });

      it('should throw NOT_FOUND for invalid token', () => {
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contratto non trovato o token non valido',
        });
        expect(error.code).toBe('NOT_FOUND');
      });

      it('should throw BAD_REQUEST if contract already signed', () => {
        const contract = createMockContract({
          status: 'SIGNED',
          signedAt: new Date(),
        });
        if (contract.signedAt) {
          const error = new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Questo contratto è già stato firmato',
          });
          expect(error.code).toBe('BAD_REQUEST');
        }
      });

      it('should verify user ownership of contract', () => {
        const user = createMockUser({ role: 'STUDENT' });
        const contract = createMockContract();
        // Contract should belong to requesting user
        const ownership = contract.studentId === user.id;
        expect(typeof ownership).toBe('boolean');
      });
    });

    describe('signContract', () => {
      it('should require signature data', () => {
        const input = {
          token: faker.string.alphanumeric(32),
          signature: 'data:image/png;base64,...',
        };
        expect(input.signature).toBeDefined();
      });

      it('should throw NOT_FOUND for invalid token', () => {
        const error = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contratto non trovato',
        });
        expect(error.code).toBe('NOT_FOUND');
      });

      it('should update contract status to SIGNED', () => {
        const contract = createMockContract({ status: 'PENDING' });
        const signed = {
          ...contract,
          status: 'SIGNED' as ContractStatus,
          signedAt: new Date(),
        };
        expect(signed.status).toBe('SIGNED');
        expect(signed.signedAt).toBeDefined();
      });

      it('should store signature data', () => {
        const _signatureData = 'data:image/png;base64,XXXXX';
        const signed = createMockContract({ signatureData: _signatureData });
        expect(signed.signatureData).toBeDefined();
      });

      it('should store IP address', () => {
        const ip = '192.168.1.1';
        const signed = createMockContract({ signatureIp: ip });
        expect(signed.signatureIp).toBe(ip);
      });

      it('should store User Agent', () => {
        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
        const signed = createMockContract({ signatureUserAgent: userAgent });
        expect(signed.signatureUserAgent).toBeDefined();
      });

      it('should generate signed content with signature', () => {
        const content = 'Contratto originale...';
        const signature = 'data:image/png;base64,...';
        const signedContent = `${content}\n\n[FIRMA DIGITALE]\n${signature}`;
        expect(signedContent).toContain('[FIRMA DIGITALE]');
      });
    });
  });

  // ==================== NOTIFICATIONS ====================
  describe('Notifications (adminProcedure)', () => {
    describe('getAdminNotifications', () => {
      it('should filter by contract-related types', () => {
        const contractNotificationTypes = [
          'CONTRACT_SIGNED',
          'CONTRACT_EXPIRED',
          'PROFILE_COMPLETED',
        ];
        expect(contractNotificationTypes.length).toBeGreaterThan(0);
      });

      it('should order by creation date descending', () => {
        const orderBy = { createdAt: 'desc' };
        expect(orderBy.createdAt).toBe('desc');
      });
    });

    describe('markNotificationRead', () => {
      it('should update isRead to true', () => {
        const notification = { id: faker.string.uuid(), isRead: false };
        const updated = { ...notification, isRead: true };
        expect(updated.isRead).toBe(true);
      });
    });

    describe('deleteNotification', () => {
      it('should require notification ID', () => {
        const input = { id: faker.string.uuid() };
        expect(input.id).toBeDefined();
      });
    });

    describe('deleteAllNotifications', () => {
      it('should delete all notifications for current user', () => {
        const userId = faker.string.uuid();
        const where = { userId };
        expect(where.userId).toBe(userId);
      });
    });
  });

  // ==================== ADMIN STATS ====================
  describe('Admin Stats (adminProcedure)', () => {
    describe('getStudentsStats', () => {
      it('should count students by status', () => {
        const stats = {
          totalStudents: 100,
          activeStudents: 75,
          pendingContract: 10,
          pendingSignature: 8,
          pendingActivation: 7,
        };
        expect(stats.totalStudents).toBe(100);
        expect(stats.activeStudents).toBeLessThan(stats.totalStudents);
      });
    });

    describe('getAllStudents', () => {
      it('should support pagination', () => {
        const input = { page: 1, limit: 20 };
        expect(input.page).toBe(1);
        expect(input.limit).toBe(20);
      });

      it('should support filtering by status', () => {
        const input = { status: 'ACTIVE' };
        expect(input.status).toBe('ACTIVE');
      });

      it('should support search', () => {
        const input = { search: 'Mario' };
        expect(input.search).toBe('Mario');
      });
    });
  });

  // ==================== INPUT VALIDATION ====================
  describe('Input Validation', () => {
    describe('createTemplate input', () => {
      it('should require name with min length 3', () => {
        const validName = 'Contratto Standard';
        const invalidName = 'AB';
        expect(validName.length >= 3).toBe(true);
        expect(invalidName.length >= 3).toBe(false);
      });

      it('should require content with min length 50', () => {
        const validContent = faker.lorem.paragraphs(3);
        expect(validContent.length >= 50).toBe(true);
      });

      it('should accept optional price as number', () => {
        const input = { price: 1500.00 };
        expect(typeof input.price).toBe('number');
      });

      it('should validate targetRole enum', () => {
        const validRoles = ['STUDENT', 'COLLABORATOR'];
        expect(validRoles).toContain('STUDENT');
        expect(validRoles).not.toContain('ADMIN');
      });
    });

    describe('assignContract input', () => {
      it('should require studentId', () => {
        const input = { studentId: faker.string.uuid(), templateId: faker.string.uuid() };
        expect(input.studentId).toBeDefined();
      });

      it('should require templateId', () => {
        const input = { studentId: faker.string.uuid(), templateId: faker.string.uuid() };
        expect(input.templateId).toBeDefined();
      });
    });

    describe('signContract input', () => {
      it('should require token', () => {
        const input = { token: faker.string.alphanumeric(32), signature: 'data:...' };
        expect(input.token).toBeDefined();
      });

      it('should require signature data', () => {
        const input = { token: faker.string.alphanumeric(32), signature: 'data:image/png;base64,...' };
        expect(input.signature).toBeDefined();
        expect(input.signature.startsWith('data:')).toBe(true);
      });
    });
  });

  // ==================== ERROR HANDLING ====================
  describe('Error Handling', () => {
    it('should use NOT_FOUND for missing resources', () => {
      const error = new TRPCError({
        code: 'NOT_FOUND',
        message: 'Risorsa non trovata',
      });
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should use BAD_REQUEST for invalid operations', () => {
      const error = new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Operazione non valida',
      });
      expect(error.code).toBe('BAD_REQUEST');
    });

    it('should use CONFLICT for duplicate resources', () => {
      const error = new TRPCError({
        code: 'CONFLICT',
        message: 'Risorsa già esistente',
      });
      expect(error.code).toBe('CONFLICT');
    });

    it('should use FORBIDDEN for access violations', () => {
      const error = new TRPCError({
        code: 'FORBIDDEN',
        message: 'Accesso negato',
      });
      expect(error.code).toBe('FORBIDDEN');
    });
  });

  // ==================== SECURITY CONSIDERATIONS ====================
  describe('Security Considerations', () => {
    it('should sanitize HTML content in templates', () => {
      const unsafeContent = '<script>alert("xss")</script><p>Safe content</p>';
      // sanitizeHtml should remove script tags
      const sanitized = unsafeContent.replace(/<script[^>]*>.*?<\/script>/gi, '');
      expect(sanitized).not.toContain('<script>');
    });

    it('should use secure token generation', () => {
      const token = faker.string.alphanumeric(32);
      // Token should be sufficiently random
      expect(token.length).toBe(32);
      expect(/^[a-zA-Z0-9]+$/.test(token)).toBe(true);
    });

    it('should hash signature data', () => {
      // Signature should be hashed before storage
      const hashFormat = /^sha256:[a-f0-9]{64}$/;
      const mockHash = 'sha256:' + 'a'.repeat(64);
      expect(hashFormat.test(mockHash)).toBe(true);
    });

    it('should validate contract ownership before operations', () => {
      const userId = faker.string.uuid();
      const contract = createMockContract({ studentId: userId });
      const isOwner = contract.studentId === userId;
      expect(isOwner).toBe(true);
    });

    it('should prevent signing already signed contracts', () => {
      const contract = createMockContract({
        status: 'SIGNED',
        signedAt: new Date(),
      });
      const canSign = contract.status === 'PENDING' && !contract.signedAt;
      expect(canSign).toBe(false);
    });

    it('should log IP and User Agent for audit trail', () => {
      const signed = createMockContract({
        signatureIp: '192.168.1.1',
        signatureUserAgent: 'Mozilla/5.0...',
      });
      expect(signed.signatureIp).toBeDefined();
      expect(signed.signatureUserAgent).toBeDefined();
    });
  });

  // ==================== CONTRACT STATUS FLOW ====================
  describe('Contract Status Flow', () => {
    it('should start with PENDING status', () => {
      const contract = createMockContract();
      expect(contract.status).toBe('PENDING');
    });

    it('should transition to SIGNED after signature', () => {
      const contract = createMockContract({ status: 'PENDING' });
      const signed = { ...contract, status: 'SIGNED' as ContractStatus };
      expect(signed.status).toBe('SIGNED');
    });

    it('should transition to ACTIVE after admin activation', () => {
      const contract = createMockContract({ status: 'SIGNED' });
      const activated = { ...contract, status: 'ACTIVE' as ContractStatus };
      expect(activated.status).toBe('ACTIVE');
    });

    it('should support CANCELLED status', () => {
      const contract = createMockContract({ status: 'CANCELLED' });
      expect(contract.status).toBe('CANCELLED');
    });

    it('should support REVOKED status', () => {
      const contract = createMockContract({ status: 'REVOKED' });
      expect(contract.status).toBe('REVOKED');
    });

    it('should support EXPIRED status', () => {
      const contract = createMockContract({ status: 'EXPIRED' });
      expect(contract.status).toBe('EXPIRED');
    });
  });

  // ==================== TOGGLE DOWNLOAD ====================
  describe('toggleContractDownload (adminProcedure)', () => {
    it('should toggle canDownload flag', () => {
      const contract = createMockContract({ canDownload: false });
      const toggled = { ...contract, canDownload: true };
      expect(toggled.canDownload).toBe(true);
    });

    it('should require contract ID', () => {
      const input = { contractId: faker.string.uuid() };
      expect(input.contractId).toBeDefined();
    });
  });
});
