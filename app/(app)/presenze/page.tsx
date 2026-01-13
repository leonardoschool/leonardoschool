'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isStaff } from '@/lib/permissions';
import { PageLoader } from '@/components/ui/loaders';
import PresenzePageContent from '@/components/presenze/PresenzePageContent';

/**
 * Pagina Presenze unificata (Staff only)
 * Admin vede tutti gli eventi, collaboratori solo i propri
 */
export default function PresenzePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const userRole = user?.role;

  useEffect(() => {
    if (!loading && !isStaff(userRole)) {
      router.replace('/dashboard');
    }
  }, [loading, userRole, router]);

  if (loading) {
    return <PageLoader />;
  }

  if (!isStaff(userRole)) {
    return <PageLoader />;
  }

  // Admin sees all events, collaborators only see their own
  const onlyMyEvents = userRole === 'COLLABORATOR';

  return <PresenzePageContent onlyMyEvents={onlyMyEvents} />;
}
