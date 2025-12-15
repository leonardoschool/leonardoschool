'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isStaff } from '@/lib/permissions';
import { PageLoader } from '@/components/ui/loaders';

// Lazy load dei componenti specifici per ruolo
import dynamic from 'next/dynamic';

const AdminTagsContent = dynamic(
  () => import('./AdminTagsContent'),
  { loading: () => <PageLoader /> }
);

const CollaboratorTagsContent = dynamic(
  () => import('./CollaboratorTagsContent'),
  { loading: () => <PageLoader /> }
);

/**
 * Pagina Tags unificata (Staff only)
 * Admin ha full CRUD, collaboratori solo visualizzazione e creazione
 */
export default function TagsPage() {
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
    return <AdminTagsContent />;
  }

  return <CollaboratorTagsContent />;
}
