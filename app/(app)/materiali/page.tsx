'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { PageLoader } from '@/components/ui/loaders';

// Lazy load dei componenti specifici per ruolo
import dynamic from 'next/dynamic';

const AdminMaterialsContent = dynamic(
  () => import('./AdminMaterialsContent'),
  { loading: () => <PageLoader /> }
);

const CollaboratorMaterialsContent = dynamic(
  () => import('./CollaboratorMaterialsContent'),
  { loading: () => <PageLoader /> }
);

const StudentMaterialsContent = dynamic(
  () => import('./StudentMaterialsContent'),
  { loading: () => <PageLoader /> }
);

/**
 * Pagina Materiali unificata
 * Renderizza il componente appropriato basato sul ruolo utente
 */
export default function MaterialiPage() {
  const { user, loading } = useAuth();
  const userRole = user?.role;

  if (loading) {
    return <PageLoader />;
  }

  // Render based on role
  switch (userRole) {
    case 'ADMIN':
      return <AdminMaterialsContent />;
    case 'COLLABORATOR':
      return <CollaboratorMaterialsContent />;
    case 'STUDENT':
      return <StudentMaterialsContent />;
    default:
      return <PageLoader />;
  }
}
