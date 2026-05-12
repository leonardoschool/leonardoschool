'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import { firebaseAuth } from '@/lib/firebase/auth';

export function SessionInvalidationHandler() {
  const { showError } = useToast();
  const handledRef = useRef(false);

  useEffect(() => {
    const handleSessionInvalidated = async () => {
      if (handledRef.current) return;
      handledRef.current = true;

      showError(
        'Sessione terminata',
        'Hai effettuato l\'accesso da un altro dispositivo. Sei stato disconnesso.'
      );

      setTimeout(async () => {
        await firebaseAuth.logout();
        globalThis.location.href = '/auth/login';
      }, 2000);
    };

    window.addEventListener('session-invalidated', handleSessionInvalidated);
    return () => window.removeEventListener('session-invalidated', handleSessionInvalidated);
  }, [showError]);

  return null;
}
