// ==================== TYPES ====================

export type InvitedStudent = {
  id: string;
  userId: string;
  name: string;
  email: string;
};

type StudentMember = {
  id: string;
  userId: string;
  user?: { name: string; email: string } | null;
};

type Assignment = {
  student?: StudentMember | null;
  group?: { members: { student?: StudentMember | null }[] } | null;
};

type AssignmentScope<TAssignment extends Assignment = Assignment> = {
  assignment?: TAssignment | null;
  simulation?: { assignments?: TAssignment[] | null } | null;
};

export function getScopedAssignments<TAssignment extends Assignment>(
  scope: AssignmentScope<TAssignment>
): TAssignment[] {
  if (scope.assignment) {
    return [scope.assignment];
  }

  return scope.simulation?.assignments ?? [];
}

// ==================== INVITED STUDENTS ====================

/**
 * Extracts a deduplicated list of invited students from one or more assignments.
 * Handles both direct-student and group assignments.
 */
export function extractInvitedStudents(assignments: Assignment[]): InvitedStudent[] {
  const invitedStudents: InvitedStudent[] = [];
  const seenIds = new Set<string>();

  const push = (s: StudentMember) => {
    if (seenIds.has(s.id)) return;
    invitedStudents.push({
      id: s.id,
      userId: s.userId,
      name: s.user?.name ?? '',
      email: s.user?.email ?? '',
    });
    seenIds.add(s.id);
  };

  for (const assignment of assignments) {
    if (assignment.student) push(assignment.student);
    if (assignment.group) {
      for (const member of assignment.group.members) {
        if (member.student) push(member.student);
      }
    }
  }

  return invitedStudents;
}

type ParticipantWithStudent = {
  student?: StudentMember | null;
};

/**
 * Adds the students of existing session participants to the invited list.
 * Manually inserted students are participants of a room whose assignment does
 * not target them, so they would otherwise be missing from the invited list
 * (and from the connected/total counters).
 */
export function unionInvitedWithParticipants(
  invited: InvitedStudent[],
  participants: ParticipantWithStudent[]
): InvitedStudent[] {
  const seenIds = new Set(invited.map((s) => s.id));
  const merged = [...invited];

  for (const p of participants) {
    if (!p.student || seenIds.has(p.student.id)) continue;
    merged.push({
      id: p.student.id,
      userId: p.student.userId,
      name: p.student.user?.name ?? '',
      email: p.student.user?.email ?? '',
    });
    seenIds.add(p.student.id);
  }

  return merged;
}

/**
 * ID-set counterpart of unionInvitedWithParticipants: adds the studentIds of
 * existing session participants (e.g. manually inserted students) to a Set of
 * invited student IDs. Mutates and returns the same Set.
 */
export function addParticipantStudentIds(
  ids: Set<string>,
  participants: Array<{ studentId: string }>
): Set<string> {
  for (const p of participants) {
    ids.add(p.studentId);
  }
  return ids;
}

/**
 * Returns a Set of all invited student IDs across multiple assignments.
 * Used for counting/checking invitation status without building full objects.
 */
export function extractInvitedStudentIds(assignments: Assignment[]): Set<string> {
  const ids = new Set<string>();
  for (const assignment of assignments) {
    if (assignment.student) ids.add(assignment.student.id);
    if (assignment.group) {
      for (const member of assignment.group.members) {
        if (member.student) ids.add(member.student.id);
      }
    }
  }
  return ids;
}

// ==================== CONNECTION STATUS ====================

type ParticipantWithHeartbeat = {
  isConnected: boolean;
  lastHeartbeat: Date | null;
};

const HEARTBEAT_TIMEOUT_MS = 15_000;

/**
 * Returns true only if the participant is marked connected AND sent a heartbeat
 * within the last HEARTBEAT_TIMEOUT_MS milliseconds.
 */
export function isParticipantConnected(
  participant: ParticipantWithHeartbeat,
  timeoutMs = HEARTBEAT_TIMEOUT_MS
): boolean {
  return (
    participant.isConnected &&
    participant.lastHeartbeat !== null &&
    Date.now() - participant.lastHeartbeat.getTime() < timeoutMs
  );
}

// ==================== TIME REMAINING ====================

type SessionForTime = {
  status: string;
  actualStartAt: Date | null;
  simulation: { durationMinutes: number };
};

/**
 * Calculates remaining seconds for an in-progress session.
 * Returns null if the session has not started yet.
 */
export function calculateTimeRemaining(session: SessionForTime): number | null {
  if (session.status !== 'STARTED' || !session.actualStartAt) return null;
  const elapsedMs = Date.now() - session.actualStartAt.getTime();
  const totalMs = session.simulation.durationMinutes * 60 * 1000;
  return Math.max(0, Math.floor((totalMs - elapsedMs) / 1000));
}
