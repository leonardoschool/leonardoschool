'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageLoader } from '@/components/ui/loaders';
import dynamic from 'next/dynamic';

const CollaboratorAssenzeContent = dynamic(
  () => import('./CollaboratorAssenzeContent'),
  { loading: () => <PageLoader /> }
);

/**
 * Pagina Le Mie Assenze (Collaborator only)
 */
export default function LeMieAssenzePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const userRole = user?.role;

  useEffect(() => {
    if (!loading && userRole !== 'COLLABORATOR') {
      router.replace('/dashboard');
    }
  }, [loading, userRole, router]);

  if (loading || userRole !== 'COLLABORATOR') {
    return <PageLoader />;
  }

  return <CollaboratorAssenzeContent />;
}
