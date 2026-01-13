'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { colors } from '@/lib/theme/colors';
import { trpc } from '@/lib/trpc/client';
import { PageLoader } from '@/components/ui/loaders';
import { 
  Users, 
  BookOpen, 
  ClipboardList, 
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Euro,
  GraduationCap,
  UserCheck,
  Target,
  CheckCircle,
  XCircle,
  MinusCircle,
  ChevronRight,
  Sparkles,
  Award,
  Briefcase,
  Eye,
} from 'lucide-react';
import {
  AreaChart,
  BarChart as BarChartComponent,
  LineChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Type for admin platform stats data
type AdminPlatformStats = {
  overview: {
    totalUsers: number;
    totalStudents: number;
    totalCollaborators: number;
    totalAdmins: number;
    activeUsers: number;
    newUsersThisMonth: number;
    newUsersLastMonth: number;
    userGrowthPercent: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growthPercent: number;
    byMonth: Array<{ month: string; revenue: number; contracts: number }>;
  };
  simulations: {
    total: number;
    totalResults: number;
    completedThisMonth: number;
    avgScore: number;
  };
  questions: {
    total: number;
    published: number;
    draft: number;
  };
  charts: {
    userGrowth: Array<{ month: string; students: number }>;
    revenueByMonth: Array<{ month: string; revenue: number; contracts: number }>;
    activityByMonth: Array<{ month: string; simulations: number; questions: number; materials: number }>;
    subjectPerformance: Array<{
      subject: string;
      correct: number;
      wrong: number;
      blank: number;
      total: number;
      successRate: number;
    }>;
  };
  collaborators: Array<{
    id: string;
    userId: string;
    name: string | null;
    email: string;
    isActive: boolean;
    groups: string[];
    questionsCreated: number;
    materialsCreated: number;
    simulationsCreated: number;
    totalActivity: number;
  }>;
  students: Array<{
    id: string;
    matricola: string;
    name: string | null;
    email: string;
    isActive: boolean;
    totalSimulations: number;
    avgScore: number;
    totalCorrect: number;
    totalWrong: number;
    totalBlank: number;
    lastActivity: Date | string | null;
  }>;
};

type TabType = 'overview' | 'students' | 'collaborators';

/**
 * Admin Statistics Content - Comprehensive Platform Analytics
 */
export default function AdminStatisticheContent() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Fetch comprehensive platform statistics
  const { data, isLoading, error } = trpc.users.getAdminPlatformStats.useQuery();

  if (isLoading) {
    return <PageLoader />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className={`text-center ${colors.text.secondary}`}>
          <p>Errore nel caricamento delle statistiche</p>
          <p className="text-sm mt-2">{error?.message || 'Dati non disponibili'}</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as const, label: 'Panoramica', icon: BarChart3 },
    { id: 'students' as const, label: 'Studenti', icon: GraduationCap },
    { id: 'collaborators' as const, label: 'Collaboratori', icon: Briefcase },
  ];

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-xl ${colors.primary.softBg}`}>
              <BarChart3 className={`w-6 h-6 ${colors.primary.text}`} />
            </div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${colors.text.primary}`}>
              Statistiche Piattaforma
            </h1>
          </div>
          <p className={`mt-2 ${colors.text.secondary}`}>
            Panoramica completa delle metriche e performance della piattaforma
          </p>
        </div>

        {/* Tab Navigation */}
        <div className={`${colors.background.card} rounded-xl p-1.5 border ${colors.border.primary} inline-flex gap-1 w-full sm:w-auto overflow-x-auto`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap flex-1 sm:flex-none justify-center
                ${activeTab === tab.id 
                  ? `${colors.primary.bg} text-white shadow-lg` 
                  : `${colors.text.secondary} hover:${colors.text.primary} hover:bg-gray-100 dark:hover:bg-slate-700`
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab data={data as unknown as AdminPlatformStats} />}
        {activeTab === 'students' && <StudentsTab data={data as unknown as AdminPlatformStats} />}
        {activeTab === 'collaborators' && <CollaboratorsTab data={data as unknown as AdminPlatformStats} />}
      </div>
    </div>
  );
}

// ============ OVERVIEW TAB ============
function OverviewTab({ data }: { data: AdminPlatformStats }) {
  const { overview, revenue, simulations, questions, charts } = data;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Utenti Totali"
          value={overview.totalUsers}
          subValue={`${overview.activeUsers} attivi`}
          trend={overview.userGrowthPercent}
          color="blue"
        />
        <StatCard
          icon={Euro}
          label="Ricavi Totali"
          value={`€${revenue.total.toLocaleString('it-IT')}`}
          subValue={`€${revenue.thisMonth.toLocaleString('it-IT')} questo mese`}
          trend={revenue.growthPercent}
          color="green"
        />
        <StatCard
          icon={ClipboardList}
          label="Simulazioni"
          value={simulations.total}
          subValue={`${simulations.totalResults} completate`}
          trend={null}
          color="purple"
        />
        <StatCard
          icon={BookOpen}
          label="Domande"
          value={questions.total}
          subValue={`${questions.published} pubblicate`}
          trend={null}
          color="orange"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <ChartCard title="Crescita Studenti" icon={TrendingUp}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.userGrowth}>
                <defs>
                  <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={1}
                />
                <YAxis 
                  tick={{ fill: '#94A3B8', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [value, 'Nuovi studenti']}
                  labelFormatter={(label) => `Mese: ${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="students" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorStudents)"
                  name="Studenti"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Revenue Chart */}
        <ChartCard title="Ricavi Mensili" icon={Euro}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChartComponent data={charts.revenueByMonth}>
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: '#94A3B8', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#94A3B8', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `€${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [`€${value.toLocaleString('it-IT')}`, 'Ricavi']}
                />
                <Bar 
                  dataKey="revenue" 
                  fill="#10B981" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChartComponent>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Activity & Subject Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Trends */}
        <ChartCard title="Attività Mensile" icon={Activity}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.activityByMonth}>
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: '#94A3B8', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#94A3B8', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line type="monotone" dataKey="simulations" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: '#8B5CF6' }} name="Simulazioni" />
                <Line type="monotone" dataKey="questions" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} name="Domande" />
                <Line type="monotone" dataKey="materials" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} name="Materiali" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Subject Performance */}
        <ChartCard title="Performance per Materia" icon={Target}>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {charts.subjectPerformance.map((subject) => (
              <SubjectBar key={subject.subject} subject={subject} />
            ))}
            {charts.subjectPerformance.length === 0 && (
              <p className={`text-center py-8 ${colors.text.muted}`}>
                Nessun dato disponibile
              </p>
            )}
          </div>
        </ChartCard>
      </div>

      {/* User Distribution */}
      <div className={`${colors.background.card} rounded-xl border ${colors.border.primary} p-6`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-2 rounded-lg ${colors.primary.softBg}`}>
            <PieChart className={`w-5 h-5 ${colors.primary.text}`} />
          </div>
          <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Distribuzione Utenti</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <UserDistributionCard
            label="Studenti"
            value={overview.totalStudents}
            total={overview.totalUsers}
            color="bg-blue-500"
            icon={GraduationCap}
          />
          <UserDistributionCard
            label="Collaboratori"
            value={overview.totalCollaborators}
            total={overview.totalUsers}
            color="bg-purple-500"
            icon={Briefcase}
          />
          <UserDistributionCard
            label="Amministratori"
            value={overview.totalAdmins}
            total={overview.totalUsers}
            color="bg-pink-500"
            icon={UserCheck}
          />
        </div>
      </div>

      {/* Performance Summary */}
      <div className={`${colors.background.card} rounded-xl border ${colors.border.primary} p-6`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-2 rounded-lg ${colors.primary.softBg}`}>
            <Sparkles className={`w-5 h-5 ${colors.primary.text}`} />
          </div>
          <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Metriche di Performance</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <MetricCard
            label="Media Punteggio"
            value={`${simulations.avgScore}%`}
            description="Punteggio medio simulazioni completate"
            icon={Award}
            color="text-amber-500"
          />
          <MetricCard
            label="Simulazioni Completate"
            value={simulations.totalResults.toLocaleString('it-IT')}
            description="Totale simulazioni svolte dagli studenti"
            icon={CheckCircle}
            color="text-green-500"
          />
          <MetricCard
            label="Questo Mese"
            value={simulations.completedThisMonth.toLocaleString('it-IT')}
            description="Simulazioni completate questo mese"
            icon={Calendar}
            color="text-blue-500"
          />
        </div>
      </div>
    </div>
  );
}

// ============ STUDENTS TAB ============
function StudentsTab({ data }: { data: AdminPlatformStats }) {
  const { students, charts } = data;
  const [sortBy, setSortBy] = useState<'avgScore' | 'totalSimulations' | 'totalWrong'>('avgScore');

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      if (sortBy === 'avgScore') return b.avgScore - a.avgScore;
      if (sortBy === 'totalSimulations') return b.totalSimulations - a.totalSimulations;
      return b.totalWrong - a.totalWrong;
    });
  }, [students, sortBy]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStat 
          label="Studenti Totali" 
          value={students.length} 
          icon={GraduationCap}
          color="blue"
        />
        <QuickStat 
          label="Studenti Attivi" 
          value={students.filter(s => s.isActive).length} 
          icon={UserCheck}
          color="green"
        />
        <QuickStat 
          label="Media Generale" 
          value={`${students.length > 0 ? (students.reduce((sum, s) => sum + s.avgScore, 0) / students.length).toFixed(1) : 0}%`} 
          icon={Target}
          color="purple"
        />
        <QuickStat 
          label="Simulazioni Totali" 
          value={students.reduce((sum, s) => sum + s.totalSimulations, 0)} 
          icon={ClipboardList}
          color="orange"
        />
      </div>

      {/* Subject Performance Chart */}
      <ChartCard title="Difficoltà per Materia" icon={XCircle}>
        <p className={`text-sm ${colors.text.muted} mb-4`}>
          Materie ordinate per tasso di successo (dal più basso al più alto)
        </p>
        <div className="space-y-3">
          {charts.subjectPerformance.length > 0 ? (
            charts.subjectPerformance.slice(0, 6).map((subject) => (
              <SubjectDetailBar key={subject.subject} subject={subject} />
            ))
          ) : (
            <p className={`text-center py-8 ${colors.text.muted}`}>
              Nessun dato disponibile. Le statistiche verranno mostrate quando gli studenti completeranno le simulazioni.
            </p>
          )}
        </div>
      </ChartCard>

      {/* Students Table */}
      <div className={`${colors.background.card} rounded-xl border ${colors.border.primary} overflow-hidden`}>
        <div className="p-4 border-b ${colors.border.primary}">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${colors.primary.softBg}`}>
                <GraduationCap className={`w-5 h-5 ${colors.primary.text}`} />
              </div>
              <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Dettaglio Studenti</h2>
            </div>
            <div className="flex gap-2">
              <SortButton 
                active={sortBy === 'avgScore'} 
                onClick={() => setSortBy('avgScore')}
                label="Punteggio"
              />
              <SortButton 
                active={sortBy === 'totalSimulations'} 
                onClick={() => setSortBy('totalSimulations')}
                label="Simulazioni"
              />
              <SortButton 
                active={sortBy === 'totalWrong'} 
                onClick={() => setSortBy('totalWrong')}
                label="Errori"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${colors.background.secondary}`}>
              <tr>
                <th className={`text-left px-4 py-3 text-sm font-medium ${colors.text.secondary}`}>Studente</th>
                <th className={`text-center px-4 py-3 text-sm font-medium ${colors.text.secondary} hidden sm:table-cell`}>Stato</th>
                <th className={`text-center px-4 py-3 text-sm font-medium ${colors.text.secondary}`}>Simulazioni</th>
                <th className={`text-center px-4 py-3 text-sm font-medium ${colors.text.secondary}`}>Media</th>
                <th className={`text-center px-4 py-3 text-sm font-medium ${colors.text.secondary} hidden md:table-cell`}>Corrette</th>
                <th className={`text-center px-4 py-3 text-sm font-medium ${colors.text.secondary} hidden md:table-cell`}>Errate</th>
                <th className={`text-center px-4 py-3 text-sm font-medium ${colors.text.secondary} hidden lg:table-cell`}>Non date</th>
                <th className={`text-right px-4 py-3 text-sm font-medium ${colors.text.secondary}`}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {sortedStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className={`font-medium ${colors.text.primary}`}>{student.name || 'N/A'}</p>
                      <p className={`text-sm ${colors.text.muted}`}>{student.matricola}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      student.isActive 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {student.isActive ? 'Attivo' : 'Inattivo'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-center font-medium ${colors.text.primary}`}>
                    {student.totalSimulations}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${getScoreColor(student.avgScore)}`}>
                      {student.avgScore}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {student.totalCorrect}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      {student.totalWrong}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <span className={`${colors.text.muted}`}>
                      {student.totalBlank}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link 
                      href={`/utenti?search=${encodeURIComponent(student.email)}`}
                      className={`inline-flex items-center gap-1 text-sm ${colors.primary.text} hover:underline`}
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Vedi profilo</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {students.length === 0 && (
          <div className={`text-center py-12 ${colors.text.muted}`}>
            <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nessuno studente trovato</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ COLLABORATORS TAB ============
function CollaboratorsTab({ data }: { data: AdminPlatformStats }) {
  const { collaborators } = data;
  const [sortBy, setSortBy] = useState<'totalActivity' | 'questionsCreated' | 'simulationsCreated'>('totalActivity');

  const sortedCollaborators = useMemo(() => {
    return [...collaborators].sort((a, b) => {
      if (sortBy === 'totalActivity') return b.totalActivity - a.totalActivity;
      if (sortBy === 'questionsCreated') return b.questionsCreated - a.questionsCreated;
      return b.simulationsCreated - a.simulationsCreated;
    });
  }, [collaborators, sortBy]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStat 
          label="Collaboratori" 
          value={collaborators.length} 
          icon={Briefcase}
          color="purple"
        />
        <QuickStat 
          label="Attivi" 
          value={collaborators.filter(c => c.isActive).length} 
          icon={UserCheck}
          color="green"
        />
        <QuickStat 
          label="Domande Create" 
          value={collaborators.reduce((sum, c) => sum + c.questionsCreated, 0)} 
          icon={BookOpen}
          color="blue"
        />
        <QuickStat 
          label="Simulazioni Create" 
          value={collaborators.reduce((sum, c) => sum + c.simulationsCreated, 0)} 
          icon={ClipboardList}
          color="orange"
        />
      </div>

      {/* Collaborators Cards */}
      <div className={`${colors.background.card} rounded-xl border ${colors.border.primary} overflow-hidden`}>
        <div className="p-4 border-b ${colors.border.primary}">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30`}>
                <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className={`text-lg font-semibold ${colors.text.primary}`}>Attività Collaboratori</h2>
            </div>
            <div className="flex gap-2">
              <SortButton 
                active={sortBy === 'totalActivity'} 
                onClick={() => setSortBy('totalActivity')}
                label="Attività"
              />
              <SortButton 
                active={sortBy === 'questionsCreated'} 
                onClick={() => setSortBy('questionsCreated')}
                label="Domande"
              />
              <SortButton 
                active={sortBy === 'simulationsCreated'} 
                onClick={() => setSortBy('simulationsCreated')}
                label="Simulazioni"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {sortedCollaborators.map((collab, index) => (
            <CollaboratorCard key={collab.id} collaborator={collab} rank={index + 1} />
          ))}
        </div>

        {collaborators.length === 0 && (
          <div className={`text-center py-12 ${colors.text.muted}`}>
            <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nessun collaboratore trovato</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ HELPER COMPONENTS ============

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  trend,
  color 
}: { 
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subValue?: string;
  trend: number | null;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  };

  return (
    <div className={`${colors.background.card} rounded-xl border ${colors.border.primary} p-4 sm:p-6`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== null && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {trend >= 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
      <p className={`text-2xl sm:text-3xl font-bold ${colors.text.primary}`}>
        {typeof value === 'number' ? value.toLocaleString('it-IT') : value}
      </p>
      <p className={`text-sm ${colors.text.muted} mt-1`}>{label}</p>
      {subValue && (
        <p className={`text-xs ${colors.text.secondary} mt-1`}>{subValue}</p>
      )}
    </div>
  );
}

function ChartCard({ 
  title, 
  icon: Icon, 
  children 
}: { 
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className={`${colors.background.card} rounded-xl border ${colors.border.primary} p-6`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${colors.primary.softBg}`}>
          <Icon className={`w-5 h-5 ${colors.primary.text}`} />
        </div>
        <h2 className={`text-lg font-semibold ${colors.text.primary}`}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SubjectBar({ subject }: { 
  subject: { subject: string; successRate: number; correct: number; wrong: number; blank: number; total: number } 
}) {
  const subjectNames: Record<string, string> = {
    'BIOLOGIA': 'Biologia',
    'CHIMICA': 'Chimica',
    'FISICA': 'Fisica',
    'MATEMATICA': 'Matematica',
    'LOGICA': 'Logica',
    'CULTURA_GENERALE': 'Cultura Generale',
  };

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className={`text-sm font-medium ${colors.text.primary}`}>
          {subjectNames[subject.subject] || subject.subject}
        </span>
        <span className={`text-sm font-medium ${getScoreColor(subject.successRate)}`}>
          {subject.successRate}%
        </span>
      </div>
      <div className={`h-2 rounded-full ${colors.background.secondary}`}>
        <div 
          className={`h-full rounded-full transition-all duration-500 ${getBarColor(subject.successRate)}`}
          style={{ width: `${subject.successRate}%` }}
        />
      </div>
    </div>
  );
}

function SubjectDetailBar({ subject }: { 
  subject: { subject: string; successRate: number; correct: number; wrong: number; blank: number; total: number } 
}) {
  const subjectNames: Record<string, string> = {
    'BIOLOGIA': 'Biologia',
    'CHIMICA': 'Chimica',
    'FISICA': 'Fisica',
    'MATEMATICA': 'Matematica',
    'LOGICA': 'Logica',
    'CULTURA_GENERALE': 'Cultura Generale',
  };

  return (
    <div className={`p-3 rounded-lg ${colors.background.secondary}`}>
      <div className="flex justify-between items-center mb-2">
        <span className={`font-medium ${colors.text.primary}`}>
          {subjectNames[subject.subject] || subject.subject}
        </span>
        <span className={`text-sm font-bold ${getScoreColor(subject.successRate)}`}>
          {subject.successRate}% successo
        </span>
      </div>
      <div className="flex gap-4 text-sm">
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <CheckCircle className="w-3.5 h-3.5" /> {subject.correct}
        </span>
        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <XCircle className="w-3.5 h-3.5" /> {subject.wrong}
        </span>
        <span className={`flex items-center gap-1 ${colors.text.muted}`}>
          <MinusCircle className="w-3.5 h-3.5" /> {subject.blank}
        </span>
      </div>
    </div>
  );
}

function UserDistributionCard({
  label,
  value,
  total,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  
  return (
    <div className="text-center">
      <div className={`w-16 h-16 mx-auto rounded-full ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      <p className={`text-2xl font-bold ${colors.text.primary}`}>{value}</p>
      <p className={`text-sm ${colors.text.muted}`}>{label}</p>
      <p className={`text-xs ${colors.text.secondary}`}>{percentage}% del totale</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="text-center">
      <Icon className={`w-8 h-8 mx-auto mb-2 ${color}`} />
      <p className={`text-2xl font-bold ${colors.text.primary}`}>{value}</p>
      <p className={`font-medium ${colors.text.secondary} mt-1`}>{label}</p>
      <p className={`text-xs ${colors.text.muted} mt-1`}>{description}</p>
    </div>
  );
}

function QuickStat({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  };

  return (
    <div className={`${colors.background.card} rounded-xl border ${colors.border.primary} p-4`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className={`text-xl font-bold ${colors.text.primary}`}>
            {typeof value === 'number' ? value.toLocaleString('it-IT') : value}
          </p>
          <p className={`text-sm ${colors.text.muted}`}>{label}</p>
        </div>
      </div>
    </div>
  );
}

function SortButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? `${colors.primary.bg} text-white`
          : `${colors.background.secondary} ${colors.text.secondary} hover:${colors.text.primary}`
      }`}
    >
      {label}
    </button>
  );
}

function CollaboratorCard({
  collaborator,
  rank,
}: {
  collaborator: {
    id: string;
    userId: string;
    name: string | null;
    email: string;
    isActive: boolean;
    groups: string[];
    questionsCreated: number;
    materialsCreated: number;
    simulationsCreated: number;
    totalActivity: number;
  };
  rank: number;
}) {
  return (
    <div className={`${colors.background.secondary} rounded-xl p-4 border ${colors.border.primary}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${colors.primary.bg} flex items-center justify-center text-white font-bold`}>
            {collaborator.name?.[0] || 'C'}
          </div>
          <div>
            <p className={`font-medium ${colors.text.primary}`}>{collaborator.name || 'N/A'}</p>
            <p className={`text-xs ${colors.text.muted} truncate max-w-[150px]`}>{collaborator.email}</p>
          </div>
        </div>
        {rank <= 3 && (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            rank === 1 ? 'bg-amber-100 text-amber-600' :
            rank === 2 ? 'bg-gray-200 text-gray-600' :
            'bg-orange-100 text-orange-600'
          }`}>
            <Award className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div>
          <p className={`text-lg font-bold text-blue-600 dark:text-blue-400`}>{collaborator.questionsCreated}</p>
          <p className={`text-xs ${colors.text.muted}`}>Domande</p>
        </div>
        <div>
          <p className={`text-lg font-bold text-green-600 dark:text-green-400`}>{collaborator.materialsCreated}</p>
          <p className={`text-xs ${colors.text.muted}`}>Materiali</p>
        </div>
        <div>
          <p className={`text-lg font-bold text-purple-600 dark:text-purple-400`}>{collaborator.simulationsCreated}</p>
          <p className={`text-xs ${colors.text.muted}`}>Simulazioni</p>
        </div>
      </div>

      {collaborator.groups.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {collaborator.groups.slice(0, 2).map((group) => (
            <span 
              key={group} 
              className={`text-xs px-2 py-0.5 rounded-full ${colors.background.card} ${colors.text.secondary}`}
            >
              {group}
            </span>
          ))}
          {collaborator.groups.length > 2 && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${colors.background.card} ${colors.text.muted}`}>
              +{collaborator.groups.length - 2}
            </span>
          )}
        </div>
      )}

      <Link 
        href={`/utenti?search=${encodeURIComponent(collaborator.email)}`}
        className={`mt-3 flex items-center justify-center gap-1 text-sm ${colors.primary.text} hover:underline`}
      >
        Vedi profilo <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

// Utility functions
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  if (score >= 40) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function getBarColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-amber-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}
