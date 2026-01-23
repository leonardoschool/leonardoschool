'use client';

import { useEffect } from 'react';
import { auth } from '@/lib/firebase/config';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { PageLoader } from '@/components/ui/loaders';

// Import role-specific simulation pages (to be extracted into components later)
import AdminSimulationsContent from './AdminSimulationsContent';
import CollaboratorSimulationsContent from './CollaboratorSimulationsContent';
import StudentSimulationsContent from './StudentSimulationsContent';

export default function SimulazioniPage() {
  const { data: user, isLoading, error } = trpc.auth.me.useQuery();

  // Handle error or no user - sign out and redirect to login
  useEffect(() => {
    if (error || (!isLoading && !user)) {
      const handleLogout = async () => {
        try {
          // Solo signOut - i cookie vengono puliti dal listener onIdTokenChanged in useAuth
          // o direttamente qui per garantire pulizia
          await auth.signOut();
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        } catch (e) {
          console.error('Logout error:', e);
        }
        window.location.href = '/auth/login';
      };
      handleLogout();
    }
  }, [error, isLoading, user]);

  // Loading state
  if (isLoading || !user) {
    return <PageLoader />;
  }

  const role = user?.role;

  // Render role-specific content
  switch (role) {
    case 'ADMIN':
      return <AdminSimulationsContent />;
    
    case 'COLLABORATOR':
      return <CollaboratorSimulationsContent />;
    
    case 'STUDENT':
      return <StudentSimulationsContent />;
    
    default:
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className={`${colors.text.secondary}`}>Accesso non autorizzato</p>
          </div>
        </div>
      );
  }
}
