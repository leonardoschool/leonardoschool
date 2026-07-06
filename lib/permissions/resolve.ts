/**
 * Capability resolution: turns a user (role + collaborator kind) into the concrete set of
 * capabilities they hold, by merging the code-defined defaults with the DB override matrix.
 *
 * Design notes:
 * - ADMIN is a fixed super-user: it always holds every capability and never reads the matrix.
 * - The matrix is 3 subjects × N capabilities and changes rarely, so it is cached in-memory
 *   with a short TTL. On Vercel each lambda instance has its own cache, so after an admin edits
 *   the matrix the change propagates within the TTL (the admin write path should also call
 *   invalidatePermissionCache() to refresh the writing instance immediately).
 * - The DB stores only OVERRIDES; a missing row falls back to the capability's default, so an
 *   empty table reproduces the app's pre-existing behavior exactly.
 */

import { prisma } from '@/lib/prisma/client';
import {
  CAPABILITY_KEYS,
  getDefaultCapabilities,
  isValidCapability,
  type PermissionSubject,
} from './capabilities';

/** Minimal user shape needed to determine the permission subject. */
export interface CapabilityUser {
  role?: string | null;
  collaborator?: { kind?: string | null } | null;
}

export type ResolvedSubject = PermissionSubject | 'ADMIN';

/** Map a user onto its permission subject. Returns null for unauthenticated/unknown users. */
export function subjectForUser(user: CapabilityUser | null | undefined): ResolvedSubject | null {
  const role = user?.role;
  if (!role) return null;
  if (role === 'ADMIN') return 'ADMIN';
  if (role === 'STUDENT') return 'STUDENT';
  if (role === 'COLLABORATOR') {
    // Map explicitly. A collaborator with no resolvable kind (e.g. a missing Collaborator
    // record) yields null → no capabilities, rather than fail-open to the more privileged
    // TUTOR. Real collaborators always have a kind (schema default TUTOR), so this only
    // affects pathological/incomplete accounts, and does so in the safe (fail-closed) direction.
    const kind = user?.collaborator?.kind;
    if (kind === 'SECRETARY') return 'COLLABORATOR_SECRETARY';
    if (kind === 'TUTOR') return 'COLLABORATOR_TUTOR';
    return null;
  }
  return null;
}

type Matrix = Record<PermissionSubject, Set<string>>;

const CACHE_TTL_MS = 30_000;
let cachedMatrix: Matrix | null = null;
let cachedAt = 0;

function buildDefaultMatrix(): Matrix {
  return {
    STUDENT: getDefaultCapabilities('STUDENT'),
    COLLABORATOR_TUTOR: getDefaultCapabilities('COLLABORATOR_TUTOR'),
    COLLABORATOR_SECRETARY: getDefaultCapabilities('COLLABORATOR_SECRETARY'),
  };
}

async function loadMatrix(): Promise<Matrix> {
  if (cachedMatrix && Date.now() - cachedAt < CACHE_TTL_MS) return cachedMatrix;

  try {
    const matrix = buildDefaultMatrix();
    const overrides = await prisma.rolePermission.findMany();
    for (const row of overrides) {
      // Ignore stale keys left over from removed capabilities.
      if (!isValidCapability(row.capability)) continue;
      const set = matrix[row.subject];
      if (!set) continue;
      if (row.enabled) set.add(row.capability);
      else set.delete(row.capability);
    }
    cachedMatrix = matrix;
    cachedAt = Date.now();
    return matrix;
  } catch (error) {
    // The override store must never take down the app. On a transient failure we prefer the
    // last-known-good matrix (which still carries any admin *revocations*) over raw defaults —
    // caching defaults here would silently re-grant a revoked capability for a whole TTL. We do
    // NOT refresh cachedAt, so the next request retries the DB and recovery is immediate.
    console.error('[permissions] Capability matrix load failed, using last-known-good/defaults:', error);
    if (cachedMatrix) return cachedMatrix;
    // Never loaded yet (e.g. migration not applied): fall back to defaults so the app stays
    // usable. Not cached, so the real matrix is picked up as soon as the DB is reachable.
    return buildDefaultMatrix();
  }
}

/** Drop the in-memory cache so the next resolution reflects freshly written overrides. */
export function invalidatePermissionCache(): void {
  cachedMatrix = null;
  cachedAt = 0;
}

/**
 * The full set of capabilities a user holds. ADMIN gets everything; an unauthenticated or
 * unknown user gets an empty set. The returned Set is a fresh copy safe for the caller to keep.
 */
export async function resolveCapabilitiesForUser(
  user: CapabilityUser | null | undefined,
): Promise<Set<string>> {
  const subject = subjectForUser(user);
  if (subject === null) return new Set();
  if (subject === 'ADMIN') return new Set(CAPABILITY_KEYS);

  const matrix = await loadMatrix();
  return new Set(matrix[subject]);
}

/**
 * Whether a specific subject holds a capability under the effective (override-merged) matrix.
 * Useful to validate a *target* user (e.g. the collaborator picked as open-answer reviewer)
 * against the configurable matrix rather than a hardcoded kind check.
 */
export async function subjectHasCapability(
  subject: PermissionSubject,
  capability: string,
): Promise<boolean> {
  const matrix = await loadMatrix();
  return matrix[subject]?.has(capability) ?? false;
}

/**
 * Read the full override-merged matrix for the admin UI: for every subject and capability,
 * its effective enabled state. Does not include ADMIN (fixed super-user).
 */
export async function getEffectiveMatrix(): Promise<Record<PermissionSubject, Set<string>>> {
  const matrix = await loadMatrix();
  return {
    STUDENT: new Set(matrix.STUDENT),
    COLLABORATOR_TUTOR: new Set(matrix.COLLABORATOR_TUTOR),
    COLLABORATOR_SECRETARY: new Set(matrix.COLLABORATOR_SECRETARY),
  };
}
