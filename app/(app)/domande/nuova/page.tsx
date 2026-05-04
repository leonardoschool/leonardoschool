'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isStaff } from '@/lib/permissions';
import { PageLoader } from '@/components/ui/loaders';
import QuestionForm from '@/components/admin/QuestionForm';

/**
 * Pagina Nuova Domanda unificata (Staff only)
 */
export default function NuovaDomandaPage() {
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

  return (
    <div className="p-6 sm:p-8 lg:p-10">
      <QuestionForm basePath="/domande" />
    </div>
  );
}
