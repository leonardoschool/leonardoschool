'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';

// A page can fire several capability-gated queries at once (e.g. list + stats + filters),
// each returning FORBIDDEN. Throttle so the user sees a single toast, not a burst.
const THROTTLE_MS = 4000;

/**
 * Surfaces a toast when a tRPC *query* is rejected with FORBIDDEN. Without it, capability-gated
 * list pages silently degrade to an empty state (the query error is swallowed by React Query),
 * which reads as "there is no data" instead of "you don't have access". Mutations are not handled
 * here — they already report via `handleMutationError` (useApiError), so covering them would
 * double up the toast.
 */
export function PermissionDeniedHandler() {
  const { showError } = useToast();
  const lastShownRef = useRef(0);

  useEffect(() => {
    const handlePermissionDenied = () => {
      const now = Date.now();
      if (now - lastShownRef.current < THROTTLE_MS) return;
      lastShownRef.current = now;

      showError(
        'Permesso negato',
        'Non hai i permessi necessari per questa sezione. Se pensi sia un errore, contatta un amministratore.'
      );
    };

    window.addEventListener('permission-denied', handlePermissionDenied);
    return () => window.removeEventListener('permission-denied', handlePermissionDenied);
  }, [showError]);

  return null;
}
