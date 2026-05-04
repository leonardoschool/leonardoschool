'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isAdmin } from '@/lib/permissions';
import { PageLoader } from '@/components/ui/loaders';

// Lazy load del componente admin
import dynamic from 'next/dynamic';

const AdminUtentiContent = dynamic(
  () => import('./AdminUtentiContent'),
  { loading: () => <PageLoader /> }
);

/**
 * Pagina Utenti (Admin only)
 */
export default function UtentiPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const userRole = user?.role;

  useEffect(() => {
    if (!loading && !isAdmin(userRole)) {
      router.replace('/dashboard');
    }
  }, [loading, userRole, router]);

  if (loading) {
    return <PageLoader />;
  }

  if (!isAdmin(userRole)) {
    return <PageLoader />;
  }

  return <AdminUtentiContent />;
}
