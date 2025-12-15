'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageLoader } from '@/components/ui/loaders';
import dynamic from 'next/dynamic';

const StudentGruppoContent = dynamic(
  () => import('./StudentGruppoContent'),
  { loading: () => <PageLoader /> }
);

/**
 * Pagina Gruppo (Student only)
 */
export default function GruppoPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const userRole = user?.role;

  useEffect(() => {
    if (!loading && userRole !== 'STUDENT') {
      router.replace('/dashboard');
    }
  }, [loading, userRole, router]);

  if (loading || userRole !== 'STUDENT') {
    return <PageLoader />;
  }

  return <StudentGruppoContent />;
}
