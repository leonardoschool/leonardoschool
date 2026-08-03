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
  
  // A failure here signs the student out and throws them to the login page, so
  // it has to be a settled fact rather than a lost race. Past its first hour the
  // Firebase token is renewed over the network, and under the load of a full
  // exam room that renewal can miss its window: without these retries a single
  // transient 401 ends a simulation in progress. The global policy gives up on
  // a 401 immediately, which is right everywhere except here.
  const { data: user, isLoading, error } = trpc.auth.me.useQuery(undefined, {
    retry: (failureCount) => failureCount < 3,
    retryDelay: (failureCount) => Math.min(1000 * 2 ** failureCount, 5000),
  });

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
