'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageLoader } from '@/components/ui/loaders';
import dynamic from 'next/dynamic';

const StudentStatisticheContent = dynamic(
  () => import('./StudentStatisticheContent'),
  { loading: () => <PageLoader /> }
);

const AdminStatisticheContent = dynamic(
  () => import('./AdminStatisticheContent'),
  { loading: () => <PageLoader /> }
);

/**
 * Pagina Statistiche (Admin, Collaborator and Student)
 * Admin sees platform-wide statistics
 * Students see their personal statistics
 */
export default function StatistichePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const userRole = user?.role;

  useEffect(() => {
    if (!loading && userRole !== 'STUDENT' && userRole !== 'ADMIN' && userRole !== 'COLLABORATOR') {
      router.replace('/dashboard');
    }
  }, [loading, userRole, router]);

  if (loading || (userRole !== 'STUDENT' && userRole !== 'ADMIN' && userRole !== 'COLLABORATOR')) {
    return <PageLoader />;
  }

  if (userRole === 'ADMIN' || userRole === 'COLLABORATOR') {
    return <AdminStatisticheContent />;
  }

  return <StudentStatisticheContent />;
}
