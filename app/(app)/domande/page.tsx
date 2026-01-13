'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isStaff } from '@/lib/permissions';
import { PageLoader } from '@/components/ui/loaders';

// Lazy load dei componenti specifici per ruolo
import dynamic from 'next/dynamic';

const AdminQuestionsContent = dynamic(
  () => import('./AdminQuestionsContent'),
  { loading: () => <PageLoader /> }
);

const CollaboratorQuestionsContent = dynamic(
  () => import('./CollaboratorQuestionsContent'),
  { loading: () => <PageLoader /> }
);

/**
 * Pagina Domande unificata (Staff only)
 * Admin ha full CRUD, collaboratori CRUD limitato alle proprie domande
 */
export default function DomandePage() {
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

  // Render based on role
  if (userRole === 'ADMIN') {
    return <AdminQuestionsContent />;
  }

  return <CollaboratorQuestionsContent />;
}
