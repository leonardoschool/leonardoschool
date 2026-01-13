'use client';

import { use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { PageLoader } from '@/components/ui/loaders';
import { useAuth } from '@/lib/hooks/useAuth';
import { isStaff } from '@/lib/permissions';
import { AssignmentStatistics } from '@/components/simulazioni';
import {
  ArrowLeft,
  BarChart3,
  ShieldX,
  Award,
} from 'lucide-react';

/**
 * Assignment Statistics Page
 * Shows detailed statistics for a specific assignment (group or individual)
 * Query params: assignmentId, groupId
 */
export default function AssignmentStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const assignmentId = searchParams.get('assignmentId') || undefined;
  const groupId = searchParams.get('groupId') || undefined;

  // Check authorization
  const userRole = user?.role;
  const hasAccess = userRole && isStaff(userRole);

  // Fetch simulation basic info
  const { data: simulation, isLoading } = trpc.simulations.getSimulation.useQuery(
    { id },
    { enabled: hasAccess }
  );

  // Authorization check
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShieldX className={`w-16 h-16 mx-auto mb-4 ${colors.text.muted}`} />
          <h2 className={`text-xl font-semibold ${colors.text.primary} mb-2`}>Accesso negato</h2>
          <p className={colors.text.muted}>Non hai i permessi per visualizzare questa pagina.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className={`mt-4 px-4 py-2 rounded-lg ${colors.primary.gradient} text-white`}
          >
            Torna alla dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <PageLoader />;
  }

  if (!simulation) {
    return (
      <div className="p-6">
        <div className={`text-center py-12 ${colors.text.muted}`}>Simulazione non trovata</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/simulazioni"
          className={`inline-flex items-center gap-2 text-sm ${colors.text.muted} hover:${colors.text.primary} mb-4`}
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alle simulazioni
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${colors.primary.gradient}`}>
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${colors.text.primary}`}>Statistiche Assegnazione</h1>
              <p className={colors.text.muted}>{simulation.title}</p>
            </div>
          </div>
          {/* Links */}
          <div className="flex items-center gap-2">
            <Link
              href={`/simulazioni/${id}/statistiche`}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border.light} ${colors.text.secondary} hover:bg-gray-100 dark:hover:bg-gray-800`}
            >
              <BarChart3 className="w-4 h-4" />
              Statistiche Template
            </Link>
            <Link
              href={`/simulazioni/${id}/classifica?${assignmentId ? `assignmentId=${assignmentId}` : groupId ? `groupId=${groupId}` : ''}`}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-600 text-white font-medium hover:opacity-90 shadow-lg`}
            >
              <Award className="w-4 h-4" />
              Classifica
            </Link>
          </div>
        </div>
      </div>

      {/* Assignment Statistics */}
      <AssignmentStatistics 
        simulationId={id} 
        assignmentId={assignmentId}
        groupId={groupId}
      />
    </div>
  );
}
