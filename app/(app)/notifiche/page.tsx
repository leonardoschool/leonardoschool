'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { PageLoader } from '@/components/ui/loaders';
import NotificationsPageContent from '@/components/notifications/NotificationsPageContent';
import { UserRole } from '@prisma/client';

/**
 * Pagina Notifiche unificata
 * Il componente NotificationsPageContent gestisce le differenze di visualizzazione per ruolo
 */
export default function NotifichePage() {
  const { user, loading } = useAuth();
  const userRole = user?.role;

  if (loading || !userRole) {
    return <PageLoader />;
  }

  return (
    <NotificationsPageContent userRole={userRole as UserRole} />
  );
}
