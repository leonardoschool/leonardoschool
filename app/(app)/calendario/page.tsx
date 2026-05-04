'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { PageLoader } from '@/components/ui/loaders';

// Lazy load dei componenti specifici per ruolo
import dynamic from 'next/dynamic';

const AdminCalendarContent = dynamic(
  () => import('./AdminCalendarContent'),
  { loading: () => <PageLoader /> }
);

const CollaboratorCalendarContent = dynamic(
  () => import('./CollaboratorCalendarContent'),
  { loading: () => <PageLoader /> }
);

const StudentCalendarContent = dynamic(
  () => import('./StudentCalendarContent'),
  { loading: () => <PageLoader /> }
);

/**
 * Pagina Calendario unificata
 * Renderizza il componente appropriato basato sul ruolo utente
 */
export default function CalendarioPage() {
  const { user, loading } = useAuth();
  const userRole = user?.role;

  if (loading) {
    return <PageLoader />;
  }

  // Render based on role
  switch (userRole) {
    case 'ADMIN':
      return <AdminCalendarContent />;
    case 'COLLABORATOR':
      return <CollaboratorCalendarContent />;
    case 'STUDENT':
      return <StudentCalendarContent />;
    default:
      return <PageLoader />;
  }
}
