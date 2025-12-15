'use client';

import { useEffect } from 'react';
import { auth } from '@/lib/firebase/config';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { AdminDashboard, CollaboratorDashboard, StudentDashboard } from '@/components/dashboard';

export default function DashboardPage() {
  const { data: user, isLoading, error } = trpc.auth.me.useQuery();

  // Handle error or no user - sign out and redirect to login
  useEffect(() => {
    if (error || (!isLoading && !user)) {
      const handleLogout = async () => {
        try {
          await auth.signOut();
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
          console.error('Logout error:', e);
        } finally {
          window.location.href = '/auth/login';
        }
      };
      handleLogout();
    }
  }, [error, isLoading, user]);

  // Loading state
  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Spinner size="lg" />
          <p className={`mt-4 ${colors.text.secondary}`}>Caricamento...</p>
        </div>
      </div>
    );
  }

  // Get user name with fallback
  const userName = user?.name?.split(' ')[0] || 'Utente';
  const userInitial = user?.name?.charAt(0).toUpperCase() || 'U';
  const role = user?.role;

  // Render role-specific dashboard
  switch (role) {
    case 'ADMIN':
      return <AdminDashboard userName={userName} />;
    
    case 'COLLABORATOR':
      return (
        <CollaboratorDashboard 
          userName={userName} 
          userInitial={userInitial}
          isActive={user?.isActive ?? false}
        />
      );
    
    case 'STUDENT':
      return <StudentDashboard user={user} />;
    
    default:
      // Fallback - should not happen with proper auth
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className={`${colors.text.secondary}`}>Ruolo non riconosciuto</p>
          </div>
        </div>
      );
  }
}
