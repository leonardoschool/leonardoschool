'use client';

import { colors } from '@/lib/theme/colors';
import { trpc } from '@/lib/trpc/client';
import { PageLoader } from '@/components/ui/loaders';
import { 
  Users, 
  BookOpen, 
  ClipboardList, 
  Calendar,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

/**
 * Admin Statistics Content
 * Shows platform-wide statistics and analytics
 */
export default function AdminStatisticheContent() {
  // Fetch platform statistics
  const { data: userStats, isLoading: userStatsLoading } = trpc.users.getStats.useQuery({});
  const { data: questions } = trpc.questions.getAll.useQuery({ page: 1, limit: 1 });
  const { data: simulations } = trpc.simulations.getAll.useQuery({ page: 1, limit: 1 });

  if (userStatsLoading) {
    return <PageLoader />;
  }

  // Default values if stats not available
  const stats = {
    totalUsers: userStats?.total || 0,
    totalStudents: userStats?.students || 0,
    totalCollaborators: userStats?.collaborators || 0,
    totalQuestions: questions?.total || 0,
    totalSimulations: simulations?.total || 0,
    activeUsers: userStats?.active || 0,
  };

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-2xl sm:text-3xl font-bold ${colors.text.primary}`}>
            Statistiche Piattaforma
          </h1>
          <p className={`mt-2 ${colors.text.secondary}`}>
            Panoramica delle statistiche e metriche della piattaforma
          </p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Utenti Totali"
            value={stats.totalUsers || 0}
            trend="+12%"
            trendUp={true}
          />
          <StatCard
            icon={BookOpen}
            label="Domande"
            value={stats.totalQuestions || 0}
            trend="+5%"
            trendUp={true}
          />
          <StatCard
            icon={ClipboardList}
            label="Simulazioni"
            value={stats.totalSimulations || 0}
            trend="+8%"
            trendUp={true}
          />
          <StatCard
            icon={Calendar}
            label="Utenti Attivi"
            value={stats.activeUsers || 0}
            trend="+3%"
            trendUp={true}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Distribution */}
          <div className={`${colors.background.card} rounded-xl shadow border ${colors.border.primary} p-6`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2 rounded-lg ${colors.primary.softBg}`}>
                <PieChart className={`w-5 h-5 ${colors.primary.text}`} />
              </div>
              <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Distribuzione Utenti</h2>
            </div>
            <div className="space-y-4">
              <DistributionBar
                label="Studenti"
                value={stats.totalStudents || 0}
                total={stats.totalUsers || 1}
                color="bg-blue-500"
              />
              <DistributionBar
                label="Collaboratori"
                value={stats.totalCollaborators || 0}
                total={stats.totalUsers || 1}
                color="bg-purple-500"
              />
              <DistributionBar
                label="Amministratori"
                value={(stats.totalUsers || 0) - (stats.totalStudents || 0) - (stats.totalCollaborators || 0)}
                total={stats.totalUsers || 1}
                color="bg-pink-500"
              />
            </div>
          </div>

          {/* Activity Overview */}
          <div className={`${colors.background.card} rounded-xl shadow border ${colors.border.primary} p-6`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2 rounded-lg ${colors.primary.softBg}`}>
                <Activity className={`w-5 h-5 ${colors.primary.text}`} />
              </div>
              <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Attività Recenti</h2>
            </div>
            <div className="space-y-4">
              <ActivityItem
                label="Nuove registrazioni questa settimana"
                value="12"
                icon={Users}
              />
              <ActivityItem
                label="Simulazioni completate oggi"
                value="45"
                icon={ClipboardList}
              />
              <ActivityItem
                label="Domande aggiunte questa settimana"
                value="23"
                icon={BookOpen}
              />
              <ActivityItem
                label="Eventi programmati"
                value="8"
                icon={Calendar}
              />
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className={`${colors.background.card} rounded-xl shadow border ${colors.border.primary} p-6`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-lg ${colors.primary.softBg}`}>
              <BarChart3 className={`w-5 h-5 ${colors.primary.text}`} />
            </div>
            <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Metriche di Performance</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <MetricCard
              label="Tasso completamento simulazioni"
              value="87%"
              description="Degli studenti completano le simulazioni assegnate"
            />
            <MetricCard
              label="Media punteggio"
              value="72.5"
              description="Punteggio medio delle simulazioni completate"
            />
            <MetricCard
              label="Tempo medio risposta"
              value="45s"
              description="Tempo medio per rispondere a una domanda"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  trendUp 
}: { 
  icon: React.ComponentType<{ className?: string }>, 
  label: string, 
  value: number,
  trend: string,
  trendUp: boolean
}) {
  return (
    <div className={`${colors.background.card} rounded-xl shadow border ${colors.border.primary} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colors.primary.softBg}`}>
          <Icon className={`w-6 h-6 ${colors.primary.text}`} />
        </div>
        <div className={`flex items-center gap-1 text-sm ${trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          <TrendingUp className={`w-4 h-4 ${trendUp ? '' : 'rotate-180'}`} />
          {trend}
        </div>
      </div>
      <p className={`text-3xl font-bold ${colors.text.primary}`}>{value.toLocaleString('it-IT')}</p>
      <p className={`text-sm ${colors.text.muted} mt-1`}>{label}</p>
    </div>
  );
}

function DistributionBar({ 
  label, 
  value, 
  total, 
  color 
}: { 
  label: string, 
  value: number, 
  total: number,
  color: string
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className={`text-sm ${colors.text.primary}`}>{label}</span>
        <span className={`text-sm ${colors.text.muted}`}>{value} ({percentage}%)</span>
      </div>
      <div className={`h-2 rounded-full ${colors.background.secondary}`}>
        <div 
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function ActivityItem({ 
  label, 
  value, 
  icon: Icon 
}: { 
  label: string, 
  value: string, 
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className={`flex items-center justify-between py-2 border-b ${colors.border.primary} last:border-0`}>
      <div className="flex items-center gap-3">
        <Icon className={`w-4 h-4 ${colors.icon.secondary}`} />
        <span className={`text-sm ${colors.text.secondary}`}>{label}</span>
      </div>
      <span className={`text-lg font-semibold ${colors.primary.text}`}>{value}</span>
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  description 
}: { 
  label: string, 
  value: string, 
  description: string 
}) {
  return (
    <div className="text-center">
      <p className={`text-3xl font-bold ${colors.primary.text}`}>{value}</p>
      <p className={`font-medium ${colors.text.primary} mt-1`}>{label}</p>
      <p className={`text-xs ${colors.text.muted} mt-1`}>{description}</p>
    </div>
  );
}
