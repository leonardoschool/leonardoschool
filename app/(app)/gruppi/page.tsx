'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isAdmin, isCollaborator } from '@/lib/permissions';
import { PageLoader } from '@/components/ui/loaders';
import dynamic from 'next/dynamic';

const AdminGruppiContent = dynamic(
  () => import('./AdminGruppiContent'),
  { loading: () => <PageLoader /> }
);

const CollaboratorGruppiContent = dynamic(
  () => import('./CollaboratorGruppiContent'),
  { loading: () => <PageLoader /> }
);

/**
 * Pagina Gruppi (Admin e Collaboratori)
 * - Admin: gestione completa dei gruppi
 * - Collaboratori: visualizzazione gruppi dove sono referenti o partecipanti
 */
export default function GruppiPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const userRole = user?.role;

  useEffect(() => {
    if (!loading && !isAdmin(userRole) && !isCollaborator(userRole)) {
      router.replace('/dashboard');
    }
  }, [loading, userRole, router]);

  if (loading || (!isAdmin(userRole) && !isCollaborator(userRole))) {
    return <PageLoader />;
  }

  // Admin vede la gestione completa
  if (isAdmin(userRole)) {
    return <AdminGruppiContent />;
  }

  // Collaboratore vede i suoi gruppi
  return <CollaboratorGruppiContent />;
}
