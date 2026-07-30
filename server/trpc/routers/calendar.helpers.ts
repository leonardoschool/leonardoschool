import type { Prisma } from '@prisma/client';
import type { EventEmailData, InviteeData } from '@/lib/email/eventEmails';

type InvitationUser = { id: string; email: string | null; name: string | null } | null;
type GroupMember = {
  student: { user: InvitationUser } | null;
  collaborator: { user: InvitationUser } | null;
};
type InvitationWithTarget = {
  user?: InvitationUser;
  group?: { members: GroupMember[] } | null;
};

/** Deduplicates all users reachable from a set of event invitations (direct + group members). */
export function resolveInvitees(
  invitations: InvitationWithTarget[]
): (InviteeData & { id: string })[] {
  const invitees: (InviteeData & { id: string })[] = [];
  const seen = new Set<string>();

  const push = (user: InvitationUser) => {
    if (!user?.id || seen.has(user.id)) return;
    invitees.push({ id: user.id, email: user.email ?? '', name: user.name ?? 'Utente' });
    seen.add(user.id);
  };

  for (const inv of invitations) {
    push(inv.user ?? null);
    if (inv.group?.members) {
      for (const m of inv.group.members) {
        push(m.student?.user ?? null);
        push(m.collaborator?.user ?? null);
      }
    }
  }

  return invitees;
}

type EventForEmail = {
  id: string;
  title: string;
  description?: string | null;
  type: EventEmailData['type'];
  startDate: Date | null;
  endDate: Date | null;
  isAllDay: boolean;
  locationType: EventEmailData['locationType'];
  locationDetails?: string | null;
  onlineLink?: string | null;
  createdBy?: { name: string | null } | null;
};

/** Maps a Prisma calendar event to the EventEmailData shape. */
export function buildEventEmailData(event: EventForEmail): EventEmailData | null {
  if (!event.startDate || !event.endDate) return null;
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    type: event.type,
    startDate: event.startDate,
    endDate: event.endDate,
    isAllDay: event.isAllDay,
    locationType: event.locationType,
    locationDetails: event.locationDetails,
    onlineLink: event.onlineLink,
    createdByName: event.createdBy?.name ?? 'Staff',
  };
}

// ==================== EVENT VISIBILITY ====================

type EventWhereCondition = Prisma.CalendarEventWhereInput;

export interface CollaboratorEventVisibility {
  /** The collaborator's own user id */
  userId: string;
  /** Groups the collaborator is a member of */
  groupIds: string[];
  /** `events.viewAll` — read every class event, including other collaborators' */
  canViewAllClassEvents: boolean;
  /** `events.manageAll` / `attendance.manageAll` — cross-ownership, no restriction at all */
  seesEveryEvent: boolean;
}

/**
 * The set of events a collaborator is allowed to see, as Prisma OR conditions.
 * Returns `null` when no restriction applies (cross-ownership capabilities, or ADMIN).
 *
 * Shared by the event list and the calendar stats: while these were two separate
 * copies of the same rule, a change to one silently gave the cards a different
 * count from the calendar underneath them.
 */
export function buildCollaboratorEventVisibility(
  visibility: CollaboratorEventVisibility
): EventWhereCondition[] | null {
  if (visibility.seesEveryEvent) return null;

  const conditions: EventWhereCondition[] = [
    { isPublic: true },
    { createdById: visibility.userId },
    { invitations: { some: { userId: visibility.userId } } },
  ];

  if (visibility.canViewAllClassEvents) {
    // Any event tied to a class is shared staff-wide. Events with no class
    // invited stay private to their creator, so a personal appointment a
    // collaborator put in the calendar is not exposed to colleagues.
    conditions.push({ invitations: { some: { groupId: { not: null } } } });
    return conditions;
  }

  if (visibility.groupIds.length > 0) {
    conditions.push({ invitations: { some: { groupId: { in: visibility.groupIds } } } });
  }

  return conditions;
}
