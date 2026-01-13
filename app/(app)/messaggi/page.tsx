'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { PageLoader } from '@/components/ui/loaders';
import MessagesPageContent from '@/components/messages/MessagesPageContent';
import { UserRole } from '@prisma/client';

/**
 * Pagina Messaggi unificata
 * Il componente MessagesPageContent gestisce le differenze di visualizzazione per ruolo
 */
export default function MessaggiPage() {
  const { user, loading } = useAuth();
  const userRole = user?.role;

  if (loading || !userRole) {
    return <PageLoader />;
  }

  return (
    <MessagesPageContent 
      basePath="" 
      userRole={userRole as UserRole} 
    />
  );
}
