'use client';

import { use, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase/config';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { PageLoader } from '@/components/ui/loaders';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

// Role-specific content components
import StaffSimulationDetailContent from './StaffSimulationDetailContent';
import StudentSimulationExecutionContent from './StudentSimulationExecutionContent';

/**
 * Unified Simulation Detail Page
 * - Staff (Admin/Collaborator): View simulation details, stats, can edit/publish/delete
 * - Student: Execute the simulation (quiz interface)
 */
export default function SimulationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const assignmentId = searchParams.get('assignmentId');
  
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
    return <PageLoader />;
  }

  const role = user?.role;

  // Render role-specific content
  switch (role) {
    case 'ADMIN':
    case 'COLLABORATOR':
      return <StaffSimulationDetailContent id={id} role={role} />;
    
    case 'STUDENT':
      return <StudentSimulationExecutionContent id={id} assignmentId={assignmentId} />;
    
    default:
      return (
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className={`text-center py-12 ${colors.background.card} rounded-xl border ${colors.border.light}`}>
            <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className={`${colors.text.secondary}`}>Accesso non autorizzato</p>
            <Link
              href="/dashboard"
              className={`inline-flex items-center gap-2 mt-4 ${colors.primary.text}`}
            >
              Torna alla dashboard
            </Link>
          </div>
        </div>
      );
  }
}
