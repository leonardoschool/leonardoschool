import { describe, it, expect } from 'vitest';
import {
  CAPABILITIES,
  CAPABILITY_KEYS,
  getDefaultCapabilities,
  isDefaultEnabled,
  isValidCapability,
} from '@/lib/permissions/capabilities';
import { subjectForUser, resolveCapabilitiesForUser } from '@/lib/permissions/resolve';

describe('capability catalog', () => {
  it('has unique keys', () => {
    const keys = CAPABILITIES.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('validates known and rejects unknown keys', () => {
    expect(isValidCapability('simulations.correctOpenAnswers')).toBe(true);
    expect(isValidCapability('does.not.exist')).toBe(false);
  });

  it('defaults mirror the pre-existing behavior', () => {
    // Tutor corrects open answers, secretary does not (was hardcoded in simulations.ts).
    expect(isDefaultEnabled('COLLABORATOR_TUTOR', 'simulations.correctOpenAnswers')).toBe(true);
    expect(isDefaultEnabled('COLLABORATOR_SECRETARY', 'simulations.correctOpenAnswers')).toBe(false);
    // Question feedback was tutor-only.
    expect(isDefaultEnabled('COLLABORATOR_TUTOR', 'questions.reviewFeedback')).toBe(true);
    expect(isDefaultEnabled('COLLABORATOR_SECRETARY', 'questions.reviewFeedback')).toBe(false);
    // Publishing questions was admin-only, so no collaborator holds it by default.
    expect(isDefaultEnabled('COLLABORATOR_TUTOR', 'questions.publish')).toBe(false);
    expect(isDefaultEnabled('COLLABORATOR_SECRETARY', 'questions.publish')).toBe(false);
    // Students do not touch staff surfaces.
    expect(isDefaultEnabled('STUDENT', 'questions.manage')).toBe(false);
    // Students do hold their own-area capabilities.
    expect(isDefaultEnabled('STUDENT', 'student.takeSimulations')).toBe(true);
  });

  it('getDefaultCapabilities returns only the enabled keys for a subject', () => {
    const tutor = getDefaultCapabilities('COLLABORATOR_TUTOR');
    expect(tutor.has('simulations.correctOpenAnswers')).toBe(true);
    expect(tutor.has('questions.publish')).toBe(false);
  });
});

describe('subjectForUser', () => {
  it('maps roles and collaborator kinds', () => {
    expect(subjectForUser(null)).toBeNull();
    expect(subjectForUser({ role: 'ADMIN' })).toBe('ADMIN');
    expect(subjectForUser({ role: 'STUDENT' })).toBe('STUDENT');
    expect(subjectForUser({ role: 'COLLABORATOR', collaborator: { kind: 'TUTOR' } })).toBe('COLLABORATOR_TUTOR');
    expect(subjectForUser({ role: 'COLLABORATOR', collaborator: { kind: 'SECRETARY' } })).toBe('COLLABORATOR_SECRETARY');
    // A collaborator without a resolvable kind (missing record) is fail-closed: no subject.
    expect(subjectForUser({ role: 'COLLABORATOR' })).toBeNull();
    expect(subjectForUser({ role: 'COLLABORATOR', collaborator: { kind: null } })).toBeNull();
  });
});

describe('resolveCapabilitiesForUser', () => {
  it('grants every capability to ADMIN without reading the DB', async () => {
    const caps = await resolveCapabilitiesForUser({ role: 'ADMIN' });
    expect(caps.size).toBe(CAPABILITY_KEYS.length);
    for (const key of CAPABILITY_KEYS) expect(caps.has(key)).toBe(true);
  });

  it('grants nothing to an unauthenticated user', async () => {
    const caps = await resolveCapabilitiesForUser(null);
    expect(caps.size).toBe(0);
  });
});
