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
