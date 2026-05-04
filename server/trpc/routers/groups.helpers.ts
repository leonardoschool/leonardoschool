import { TRPCError } from '@trpc/server';
import { PrismaClient } from '@prisma/client';
import { notifications } from '@/lib/notifications/notificationHelpers';

export function uniqueReferenceIds(ids: Array<string | null | undefined> = []): string[] {
  return Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
}

export function parseLegacyReference(value: string | null | undefined): {
  collaboratorIds: string[];
  adminIds: string[];
} {
  if (!value) return { collaboratorIds: [], adminIds: [] };
  if (value.startsWith('admin:')) {
    return { collaboratorIds: [], adminIds: [value.replace('admin:', '')] };
  }
  return { collaboratorIds: [value], adminIds: [] };
}

export async function validateReferenceIds(
  prisma: PrismaClient,
  studentIds: string[],
  collaboratorIds: string[],
  adminIds: string[]
): Promise<void> {
  if (studentIds.length > 0) {
    const count = await prisma.student.count({ where: { id: { in: studentIds } } });
    if (count !== studentIds.length) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Uno o più studenti di riferimento non sono stati trovati',
      });
    }
  }
  if (collaboratorIds.length > 0) {
    const count = await prisma.collaborator.count({ where: { id: { in: collaboratorIds } } });
    if (count !== collaboratorIds.length) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Uno o più collaboratori di riferimento non sono stati trovati',
      });
    }
  }
  if (adminIds.length > 0) {
    const count = await prisma.admin.count({ where: { id: { in: adminIds } } });
    if (count !== adminIds.length) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Uno o più amministratori di riferimento non sono stati trovati',
      });
    }
  }
}

type UpdateInput = {
  referenceStudentId?: string | null;
  referenceCollaboratorId?: string | null;
  referenceStudentIds?: string[];
  referenceCollaboratorIds?: string[];
  referenceAdminIds?: string[];
};

export function resolveUpdateReferenceIds(input: UpdateInput): {
  studentIds: string[] | undefined;
  collaboratorIds: string[] | undefined;
  adminIds: string[] | undefined;
} {
  const legacy = parseLegacyReference(input.referenceCollaboratorId);

  const studentIds =
    input.referenceStudentIds !== undefined
      ? uniqueReferenceIds(input.referenceStudentIds)
      : input.referenceStudentId !== undefined
        ? uniqueReferenceIds([input.referenceStudentId])
        : undefined;

  const collaboratorIds =
    input.referenceCollaboratorIds !== undefined
      ? uniqueReferenceIds(input.referenceCollaboratorIds)
      : input.referenceCollaboratorId !== undefined
        ? uniqueReferenceIds(legacy.collaboratorIds)
        : undefined;

  const adminIds =
    input.referenceAdminIds !== undefined
      ? uniqueReferenceIds(input.referenceAdminIds)
      : input.referenceCollaboratorId !== undefined
        ? uniqueReferenceIds(legacy.adminIds)
        : undefined;

  return { studentIds, collaboratorIds, adminIds };
}

type ExistingRefs = {
  referenceStudentId: string | null;
  referenceCollaboratorId: string | null;
  referenceAdminId: string | null;
  referenceStudents: { studentId: string }[];
  referenceCollaborators: { collaboratorId: string }[];
  referenceAdmins: { adminId: string }[];
};

type UpdatedGroup = {
  id: string;
  name: string;
  referenceStudents: { studentId: string; student: { user: { id: string } } }[];
  referenceCollaborators: { collaboratorId: string; collaborator: { user: { id: string } } }[];
  referenceAdmins: { adminId: string; admin: { user: { id: string } } }[];
};

export async function notifyNewReferents(
  prisma: PrismaClient,
  group: UpdatedGroup,
  existing: ExistingRefs
): Promise<void> {
  const existingStudentIds = new Set(
    uniqueReferenceIds([existing.referenceStudentId, ...existing.referenceStudents.map((r) => r.studentId)])
  );
  const existingCollaboratorIds = new Set(
    uniqueReferenceIds([
      existing.referenceCollaboratorId,
      ...existing.referenceCollaborators.map((r) => r.collaboratorId),
    ])
  );
  const existingAdminIds = new Set(
    uniqueReferenceIds([existing.referenceAdminId, ...existing.referenceAdmins.map((r) => r.adminId)])
  );

  const newReferents = [
    ...group.referenceCollaborators
      .filter((r) => !existingCollaboratorIds.has(r.collaboratorId))
      .map((r) => r.collaborator.user.id),
    ...group.referenceAdmins
      .filter((r) => !existingAdminIds.has(r.adminId))
      .map((r) => r.admin.user.id),
    ...group.referenceStudents
      .filter((r) => !existingStudentIds.has(r.studentId))
      .map((r) => r.student.user.id),
  ];

  await Promise.all(
    newReferents.map((recipientUserId) =>
      notifications
        .groupReferentAssigned(prisma, { recipientUserId, groupId: group.id, groupName: group.name })
        .catch((err: unknown) => console.error('[Groups] Failed to send referent notification:', err))
    )
  );
}
