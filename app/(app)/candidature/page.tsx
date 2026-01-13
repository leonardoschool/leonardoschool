'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isAdmin } from '@/lib/permissions';
import { PageLoader } from '@/components/ui/loaders';
import dynamic from 'next/dynamic';

const AdminCandidatureContent = dynamic(
  () => import('./AdminCandidatureContent'),
  { loading: () => <PageLoader /> }
);

/**
 * Pagina Candidature (Admin only)
 */
export default function CandidaturePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const userRole = user?.role;

  useEffect(() => {
    if (!loading && !isAdmin(userRole)) {
      router.replace('/dashboard');
    }
  }, [loading, userRole, router]);

  if (loading || !isAdmin(userRole)) {
    return <PageLoader />;
  }

  return <AdminCandidatureContent />;
}
