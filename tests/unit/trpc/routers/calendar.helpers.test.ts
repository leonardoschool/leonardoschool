/**
 * Which calendar events a collaborator is allowed to see.
 *
 * The rule decides both the event list and the stats cards above it, so a change
 * here changes what colleagues can read about each other's calendars.
 */

import { describe, it, expect } from 'vitest';
import { buildCollaboratorEventVisibility } from '@/server/trpc/routers/calendar.helpers';

const BASE = {
  userId: 'user-1',
  groupIds: [] as string[],
  canViewAllClassEvents: false,
  seesEveryEvent: false,
};

/** Serialized conditions make "does the rule contain this clause?" readable. */
function clauses(result: ReturnType<typeof buildCollaboratorEventVisibility>): string[] {
  return (result ?? []).map((condition) => JSON.stringify(condition));
}

describe('buildCollaboratorEventVisibility', () => {
  it('applies no restriction when the collaborator manages every event', () => {
    expect(buildCollaboratorEventVisibility({ ...BASE, seesEveryEvent: true })).toBeNull();
  });

  it('always allows public events, own events and direct invitations', () => {
    const result = clauses(buildCollaboratorEventVisibility(BASE));

    expect(result).toContain(JSON.stringify({ isPublic: true }));
    expect(result).toContain(JSON.stringify({ createdById: 'user-1' }));
    expect(result).toContain(JSON.stringify({ invitations: { some: { userId: 'user-1' } } }));
  });

  describe('without events.viewAll', () => {
    it('adds only the classes the collaborator belongs to', () => {
      const result = clauses(
        buildCollaboratorEventVisibility({ ...BASE, groupIds: ['g1', 'g2'] })
      );

      expect(result).toContain(
        JSON.stringify({ invitations: { some: { groupId: { in: ['g1', 'g2'] } } } })
      );
    });

    it('does not open up every class event', () => {
      const result = clauses(
        buildCollaboratorEventVisibility({ ...BASE, groupIds: ['g1'] })
      );

      expect(result).not.toContain(
        JSON.stringify({ invitations: { some: { groupId: { not: null } } } })
      );
    });

    it('leaves out the group clause entirely when the collaborator has no classes', () => {
      expect(clauses(buildCollaboratorEventVisibility(BASE))).toHaveLength(3);
    });
  });

  describe('with events.viewAll', () => {
    it('opens every event that has a class invited', () => {
      const result = clauses(
        buildCollaboratorEventVisibility({ ...BASE, canViewAllClassEvents: true })
      );

      expect(result).toContain(
        JSON.stringify({ invitations: { some: { groupId: { not: null } } } })
      );
    });

    it('reaches other collaborators\' events only through a class invitation', () => {
      const result = buildCollaboratorEventVisibility({ ...BASE, canViewAllClassEvents: true });

      // Every clause that isn't "public" or "mine" requires an invitation, and the
      // broad one requires a non-null groupId. So a personal event a colleague put
      // in the calendar — not public, no class invited — stays out of reach.
      const ownershipFree = (result ?? []).filter(
        (condition) => !('isPublic' in condition) && !('createdById' in condition)
      );

      expect(ownershipFree).toEqual([
        { invitations: { some: { userId: 'user-1' } } },
        { invitations: { some: { groupId: { not: null } } } },
      ]);
    });

    it('makes the own-classes clause redundant rather than duplicating it', () => {
      const result = clauses(
        buildCollaboratorEventVisibility({ ...BASE, groupIds: ['g1'], canViewAllClassEvents: true })
      );

      expect(result).not.toContain(
        JSON.stringify({ invitations: { some: { groupId: { in: ['g1'] } } } })
      );
      expect(result).toHaveLength(4);
    });
  });
});
