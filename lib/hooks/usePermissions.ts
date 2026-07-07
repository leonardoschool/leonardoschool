'use client';

import { useCallback, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';

/**
 * Client-side capability checks — the frontend mirror of the backend `assertCapability`.
 *
 * Reads the fine-grained capability set that `auth.me` resolves server-side (role +
 * collaborator kind, merged with the admin-configured override matrix) and exposes simple
 * predicates to show/hide actions and navigation. ADMIN always passes (fixed super-user).
 *
 * The backend remains the source of truth: hiding a button here is UX only, every gated
 * procedure re-checks the capability. While `auth.me` is still loading we report `isLoading`
 * so callers can avoid flicker (e.g. render nav optimistically until capabilities arrive).
 */
export function usePermissions() {
  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, { staleTime: 60 * 1000 });

  const isAdmin = user?.role === 'ADMIN';

  const capabilities = useMemo(
    () => new Set<string>(user?.capabilities ?? []),
    [user?.capabilities],
  );

  const can = useCallback(
    (capability: string): boolean => isAdmin || capabilities.has(capability),
    [isAdmin, capabilities],
  );

  const canAny = useCallback(
    (caps: readonly string[]): boolean => isAdmin || caps.some((c) => capabilities.has(c)),
    [isAdmin, capabilities],
  );

  const canAll = useCallback(
    (caps: readonly string[]): boolean => isAdmin || caps.every((c) => capabilities.has(c)),
    [isAdmin, capabilities],
  );

  return { can, canAny, canAll, isAdmin, capabilities, isLoading };
}

export default usePermissions;
