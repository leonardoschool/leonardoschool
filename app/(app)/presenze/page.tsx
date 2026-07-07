'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isStaff } from '@/lib/permissions';
import { usePermissions } from '@/lib/hooks/usePermissions';
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
  const { can, isLoading: permsLoading } = usePermissions();

  useEffect(() => {
    if (!loading && !isStaff(userRole)) {
      router.replace('/dashboard');
    }
  }, [loading, userRole, router]);

  if (loading || permsLoading) {
    return <PageLoader />;
  }

  if (!isStaff(userRole)) {
    return <PageLoader />;
  }

  // Admin sees all events; collaborators only their own — unless granted 'attendance.manageAll'.
  const onlyMyEvents = userRole === 'COLLABORATOR' && !can('attendance.manageAll');

  return <PresenzePageContent onlyMyEvents={onlyMyEvents} />;
}
