/* eslint-disable @typescript-eslint/no-explicit-any */
import { TRPCError } from '@trpc/server';
import { sanitizeText } from '@/lib/utils/escapeHtml';
import { sanitizeHtml, validateContentLength } from '@/lib/utils/sanitizeHtml';

// ==================== TYPES ====================

export interface StudentWithUser {
  id: string;
  fiscalCode: string | null;
  dateOfBirth: Date | null;
  birthPlace: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    profileCompleted: boolean;
  };
  contracts: Array<{ status: string }>;
}

export interface CollaboratorWithUser {
  id: string;
  fiscalCode: string | null;
  dateOfBirth: Date | null;
  birthPlace: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    profileCompleted: boolean;
  };
  contracts: Array<{ status: string }>;
}

export interface ContractTargetResult {
  targetUser: StudentWithUser | CollaboratorWithUser;
  targetType: 'STUDENT' | 'COLLABORATOR';
  targetId: string;
}

export interface ContractWithRelations {
  id: string;
  studentId: string | null;
  collaboratorId: string | null;
  status: string;
  expiresAt: Date | null;
  template: {
    name: string;
    duration: string | null;
    price: number | null;
  };
  student: {
    id: string;
    user: { id: string; name: string; email: string };
  } | null;
  collaborator: {
    id: string;
    user: { id: string; name: string; email: string };
  } | null;
}

export interface SignerInfo {
  signerName: string;
  signerEmail: string;
  signerId: string;
  signerType: 'STUDENT' | 'COLLABORATOR';
}

// ==================== CONTRACT TARGET VALIDATION ====================

export async function validateStudentForContract(
  prisma: any,
  studentId: string
): Promise<ContractTargetResult> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: true,
      contracts: { where: { status: { in: ['PENDING', 'SIGNED'] } } },
    },
  });

  if (!student) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Studente non trovato' });
  }
  if (!student.user.profileCompleted) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Lo studente non ha ancora completato il profilo',
    });
  }
  if (student.contracts.length > 0) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Lo studente ha già un contratto attivo o in attesa',
    });
  }

  return { targetUser: student, targetType: 'STUDENT', targetId: studentId };
}

export async function validateCollaboratorForContract(
  prisma: any,
  collaboratorId: string
): Promise<ContractTargetResult> {
  const collaborator = await prisma.collaborator.findUnique({
    where: { id: collaboratorId },
    include: {
      user: true,
      contracts: { where: { status: { in: ['PENDING', 'SIGNED'] } } },
    },
  });

  if (!collaborator) {
    const byUserId = await prisma.collaborator.findUnique({ where: { userId: collaboratorId } });
    if (byUserId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `ID errato: hai passato l'userId, usa collaboratorId: "${byUserId.id}"`,
      });
    }
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Collaboratore con ID "${collaboratorId}" non trovato. Verifica che il record esista nella tabella collaborators.`,
    });
  }
  if (!collaborator.user.profileCompleted) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Il collaboratore non ha ancora completato il profilo',
    });
  }
  if (collaborator.contracts.length > 0) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Il collaboratore ha già un contratto attivo o in attesa',
    });
  }

  return { targetUser: collaborator, targetType: 'COLLABORATOR', targetId: collaboratorId };
}

export async function getContractTarget(
  prisma: any,
  studentId?: string,
  collaboratorId?: string
): Promise<ContractTargetResult> {
  if (studentId) return validateStudentForContract(prisma, studentId);
  if (!collaboratorId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Devi specificare studentId o collaboratorId',
    });
  }
  return validateCollaboratorForContract(prisma, collaboratorId);
}

export async function getActiveTemplate(prisma: any, templateId: string) {
  const template = await prisma.contractTemplate.findUnique({ where: { id: templateId } });
  if (!template?.isActive) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Template contratto non trovato o non attivo',
    });
  }
  return template;
}

// ==================== CONTRACT CONTENT ====================

export function prepareContractContent(
  customContent: string | undefined,
  templateContent: string,
  targetUser: StudentWithUser | CollaboratorWithUser,
  extras?: { startDate?: Date | null; endDate?: Date | null; compensation?: number | null }
): string {
  if (customContent) {
    const check = validateContentLength(customContent);
    if (!check.valid) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: check.message ?? 'Contenuto troppo lungo' });
    }
    // Sanitize first, then replace placeholders so {{DATA_ODIERNA}} and others are resolved
    const sanitized = sanitizeHtml(customContent);
    return generateContractContent(sanitized, targetUser, targetUser.user, extras);
  }
  return generateContractContent(templateContent, targetUser, targetUser.user, extras);
}

export function calculateContractExpiration(duration: string | null): Date | null {
  if (!duration) return null;

  const lower = duration.toLowerCase();
  const now = new Date();
  const num = (s: string) => {
    const m = /\d+/.exec(s);
    return m ? parseInt(m[0], 10) : 1;
  };

  if (lower.includes('anno') || lower.includes('anni')) {
    return new Date(now.setFullYear(now.getFullYear() + num(lower)));
  }
  if (lower.includes('mese') || lower.includes('mesi')) {
    return new Date(now.setMonth(now.getMonth() + num(lower)));
  }
  if (lower.includes('settiman')) {
    return new Date(now.setDate(now.getDate() + num(lower) * 7));
  }
  if (lower.includes('giorn')) {
    return new Date(now.setDate(now.getDate() + num(lower)));
  }
  return null;
}

export function generateContractContent(
  template: string,
  student: {
    fiscalCode: string | null;
    dateOfBirth: Date | null;
    birthPlace: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
  },
  user: { name: string; email: string },
  extras?: { startDate?: Date | null; endDate?: Date | null; compensation?: number | null }
): string {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const fmt = (d: Date | null | undefined) =>
    d ? d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

  const fullAddress = [
    sanitizeText(student.address),
    sanitizeText(student.city),
    student.province ? `(${sanitizeText(student.province)})` : '',
    sanitizeText(student.postalCode),
  ]
    .filter(Boolean)
    .join(', ');

  const formattedCompensation =
    extras?.compensation != null && !Number.isNaN(extras.compensation)
      ? extras.compensation.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '';

  return template
    .replaceAll('{{NOME_COMPLETO}}', sanitizeText(user.name))
    .replaceAll('{{EMAIL}}', sanitizeText(user.email))
    .replaceAll('{{CODICE_FISCALE}}', sanitizeText(student.fiscalCode))
    .replaceAll('{{DATA_NASCITA}}', sanitizeText(fmt(student.dateOfBirth)))
    .replaceAll('{{COMUNE_NASCITA}}', sanitizeText(student.birthPlace))
    .replaceAll('{{TELEFONO}}', sanitizeText(student.phone))
    .replaceAll('{{INDIRIZZO_COMPLETO}}', fullAddress)
    .replaceAll('{{INDIRIZZO}}', sanitizeText(student.address))
    .replaceAll('{{CITTA}}', sanitizeText(student.city))
    .replaceAll('{{PROVINCIA}}', sanitizeText(student.province))
    .replaceAll('{{CAP}}', sanitizeText(student.postalCode))
    .replaceAll('{{DATA_ODIERNA}}', sanitizeText(formattedDate))
    .replaceAll('{{ANNO}}', today.getFullYear().toString())
    .replaceAll('{{DATA_INIZIO}}', sanitizeText(fmt(extras?.startDate)))
    .replaceAll('{{DATA_FINE}}', sanitizeText(fmt(extras?.endDate)))
    .replaceAll('{{COMPENSO}}', sanitizeText(formattedCompensation));
}

// ==================== SIGNING VALIDATION ====================

export async function verifyStudentSigner(
  prisma: any,
  userId: string,
  contract: ContractWithRelations
): Promise<SignerInfo> {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student || contract.studentId !== student.id) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Non sei autorizzato a firmare questo contratto' });
  }
  return {
    signerName: contract.student?.user.name ?? '',
    signerEmail: contract.student?.user.email ?? '',
    signerId: student.id,
    signerType: 'STUDENT',
  };
}

export async function verifyCollaboratorSigner(
  prisma: any,
  userId: string,
  contract: ContractWithRelations
): Promise<SignerInfo> {
  const collaborator = await prisma.collaborator.findUnique({ where: { userId } });
  if (!collaborator || contract.collaboratorId !== collaborator.id) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Non sei autorizzato a firmare questo contratto' });
  }
  return {
    signerName: contract.collaborator?.user.name ?? '',
    signerEmail: contract.collaborator?.user.email ?? '',
    signerId: collaborator.id,
    signerType: 'COLLABORATOR',
  };
}

export async function getSignerInfo(
  prisma: any,
  userId: string,
  contract: ContractWithRelations
): Promise<SignerInfo> {
  if (contract.studentId) return verifyStudentSigner(prisma, userId, contract);
  if (contract.collaboratorId) return verifyCollaboratorSigner(prisma, userId, contract);
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Contratto non valido: nessun destinatario associato',
  });
}

export async function validateContractForSigning(
  prisma: any,
  contract: ContractWithRelations
): Promise<void> {
  if (contract.status !== 'PENDING') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Il contratto non è in stato di attesa firma',
    });
  }
  if (contract.expiresAt && contract.expiresAt < new Date()) {
    await prisma.contract.update({ where: { id: contract.id }, data: { status: 'EXPIRED' } });
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: "Il contratto è scaduto. Contatta l'amministrazione.",
    });
  }
}
