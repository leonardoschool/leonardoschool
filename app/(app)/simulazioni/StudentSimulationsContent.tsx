'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { PageLoader } from '@/components/ui/loaders';
import CustomSelect from '@/components/ui/CustomSelect';
import Link from 'next/link';
import SelfPracticeModal from '@/components/student/SelfPracticeModal';
import {
  Filter,
  Clock,
  Target,
  Award,
  FileText,
  ChevronLeft,
  ChevronRight,
  Play,
  CheckCircle,
  AlertCircle,
  Calendar,
  Zap,
  BarChart3,
  RefreshCw,
  Shield,
  Lock,
} from 'lucide-react';
import type { SimulationType } from '@/lib/validations/simulationValidation';

// Type labels (escluso OFFICIAL che ha filtro separato)
const typeLabels: Record<SimulationType, string> = {
  OFFICIAL: 'Ufficiale',
  PRACTICE: 'Esercitazione',
  CUSTOM: 'Personalizzata',
  QUICK_QUIZ: 'Quiz Veloce',
};

// Filtro tipi (senza OFFICIAL per evitare confusione con filtro "Ufficiale")
const filterTypeLabels: Partial<Record<SimulationType, string>> = {
  PRACTICE: 'Esercitazione',
  CUSTOM: 'Personalizzata',
  QUICK_QUIZ: 'Quiz Veloce',
};

// Type colors
const typeColors: Record<SimulationType, string> = {
  OFFICIAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  PRACTICE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  CUSTOM: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  QUICK_QUIZ: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

// Status colors
const studentStatusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  available: { 
    bg: 'bg-green-100 dark:bg-green-900/30', 
    text: 'text-green-700 dark:text-green-300',
    icon: <Play className="w-4 h-4" />,
  },
  in_progress: { 
    bg: 'bg-blue-100 dark:bg-blue-900/30', 
    text: 'text-blue-700 dark:text-blue-300',
    icon: <Clock className="w-4 h-4" />,
  },
  completed: { 
    bg: 'bg-gray-100 dark:bg-gray-700', 
    text: 'text-gray-700 dark:text-gray-300',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  expired: { 
    bg: 'bg-red-100 dark:bg-red-900/30', 
    text: 'text-red-700 dark:text-red-300',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  not_started: { 
    bg: 'bg-yellow-100 dark:bg-yellow-900/30', 
    text: 'text-yellow-700 dark:text-yellow-300',
    icon: <Calendar className="w-4 h-4" />,
  },
  closed: { 
    bg: 'bg-red-100 dark:bg-red-900/30', 
    text: 'text-red-700 dark:text-red-300',
    icon: <Lock className="w-4 h-4" />,
  },
};

const studentStatusLabels: Record<string, string> = {
  available: 'Disponibile',
  in_progress: 'In corso',
  completed: 'Completata',
  expired: 'Scaduta',
  not_started: 'Non iniziata',
  closed: 'Chiusa',
};

export default function StudentSimulationsContent() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'assigned' | 'self'>('assigned');

  // Filters state
  const [type, setType] = useState<SimulationType | ''>('');
  const [status, setStatus] = useState<string>('');
  const [isOfficial, setIsOfficial] = useState<boolean | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  // Self practice modal state
  const [showSelfPracticeModal, setShowSelfPracticeModal] = useState(false);

  // Reset page when changing tabs
  const handleTabChange = (tab: 'assigned' | 'self') => {
    setActiveTab(tab);
    setPage(1);
    setType('');
    setStatus('');
    setIsOfficial('');
  };

  // Fetch simulations based on active tab
  const { data: simulationsData, isLoading } = trpc.simulations.getAvailableSimulations.useQuery({
    page,
    pageSize,
    type: type || undefined,
    status: status as 'available' | 'in_progress' | 'completed' | 'expired' | undefined || undefined,
    isOfficial: isOfficial === '' ? undefined : isOfficial,
    // Filter by self-created or assigned
    selfCreated: activeTab === 'self' ? true : undefined,
    assignedToMe: activeTab === 'assigned' ? true : undefined,
  });

  // Fetch student results for stats
  const { data: resultsData } = trpc.simulations.getMyResults.useQuery({ pageSize: 50 });

  // Format date with time
  const formatDateTime = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    if (minutes === 0) return 'Illimitato';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (isLoading) {
    return <PageLoader />;
  }

  const simulations = simulationsData?.simulations ?? [];
  const pagination = simulationsData?.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 };

  // Calculate stats
  const completedCount = resultsData?.results?.length ?? 0;
  const avgScore = completedCount > 0 
    ? (resultsData?.results?.reduce((sum, r) => sum + (r.totalScore ?? 0), 0) ?? 0) / completedCount 
    : 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${colors.text.primary}`}>Le mie simulazioni</h1>
        <p className={`mt-1 text-sm ${colors.text.muted}`}>
          Test, esercitazioni e quiz disponibili per te
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className={`flex flex-col sm:flex-row gap-2 sm:gap-0 p-1 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <button
            onClick={() => handleTabChange('assigned')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'assigned'
                ? `${colors.primary.bg} text-white shadow-md`
                : `${colors.text.secondary} hover:${colors.background.hover}`
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-5 h-5" />
              <span>Simulazioni Assegnate</span>
            </div>
          </button>
          <button
            onClick={() => handleTabChange('self')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'self'
                ? `${colors.primary.bg} text-white shadow-md`
                : `${colors.text.secondary} hover:${colors.background.hover}`
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-5 h-5" />
              <span>Le mie Autoesercitazioni</span>
            </div>
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className={`grid gap-4 mb-6 ${activeTab === 'self' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
        <div className={`p-4 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${colors.text.primary}`}>{pagination.total}</p>
              <p className={`text-sm ${colors.text.muted}`}>
                {activeTab === 'assigned' ? 'Assegnate' : 'Create'}
              </p>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${colors.text.primary}`}>{completedCount}</p>
              <p className={`text-sm ${colors.text.muted}`}>Completate</p>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl ${colors.background.card} border ${colors.border.light}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${colors.text.primary}`}>{avgScore.toFixed(1)}</p>
              <p className={`text-sm ${colors.text.muted}`}>Punteggio medio</p>
            </div>
          </div>
        </div>
        
        {/* Quiz Veloce button - solo nella tab autoesercitazioni */}
        {activeTab === 'self' && (
          <button
            onClick={() => setShowSelfPracticeModal(true)}
            className={`p-4 rounded-xl ${colors.primary.softBg} border border-red-200 dark:border-red-800 hover:shadow-md transition-shadow text-left w-full`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${colors.primary.bg}`}>
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className={`font-semibold ${colors.text.primary}`}>Quiz Veloce</p>
                <p className={`text-sm ${colors.text.muted}`}>Inizia subito →</p>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className={`rounded-xl p-4 mb-6 ${colors.background.card} border ${colors.border.light}`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border.light} ${colors.background.hover} ${colors.text.secondary}`}
          >
            <Filter className="w-4 h-4" />
            Filtri
            {(type || status || (activeTab === 'assigned' && isOfficial !== '')) && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {[type, status, activeTab === 'assigned' && isOfficial !== ''].filter(Boolean).length}
              </span>
            )}
          </button>
          
          {/* Quick filters - diversi per tab */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatus(status === 'available' ? '' : 'available')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                status === 'available' 
                  ? 'bg-green-500 text-white' 
                  : `${colors.background.hover} ${colors.text.secondary}`
              }`}
            >
              Disponibili
            </button>
            <button
              onClick={() => setStatus(status === 'in_progress' ? '' : 'in_progress')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                status === 'in_progress' 
                  ? 'bg-blue-500 text-white' 
                  : `${colors.background.hover} ${colors.text.secondary}`
              }`}
            >
              In corso
            </button>
            
            {/* Filtro "Ufficiali" solo per simulazioni assegnate */}
            {activeTab === 'assigned' && (
              <button
                onClick={() => setIsOfficial(isOfficial === true ? '' : true)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isOfficial === true 
                    ? 'bg-red-500 text-white' 
                    : `${colors.background.hover} ${colors.text.secondary}`
                }`}
              >
                <Award className="w-3 h-3 inline mr-1" />
                Ufficiali
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className={`grid grid-cols-1 ${activeTab === 'assigned' ? 'sm:grid-cols-3' : 'sm:grid-cols-1'} gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700`}>
            {/* Filtro Tipo solo per simulazioni assegnate */}
            {activeTab === 'assigned' && (
              <CustomSelect
                label="Tipo"
                value={type}
                onChange={(v) => setType(v as SimulationType | '')}
                options={[
                  { value: '', label: 'Tutti' },
                  ...Object.entries(filterTypeLabels).map(([value, label]) => ({ value, label })),
                ]}
              />
            )}
            <CustomSelect
              label="Stato"
              value={status}
              onChange={(v) => setStatus(v)}
              options={[
                { value: '', label: 'Tutti' },
                { value: 'available', label: 'Disponibili' },
                { value: 'in_progress', label: 'In corso' },
                { value: 'completed', label: 'Completate' },
                ...(activeTab === 'assigned' ? [{ value: 'expired', label: 'Scadute' }] : []),
              ]}
            />
            
            {/* Filtro Ufficiale solo per simulazioni assegnate */}
            {activeTab === 'assigned' && (
              <CustomSelect
                label="Ufficiale"
                value={isOfficial === '' ? '' : isOfficial ? 'true' : 'false'}
                onChange={(v) => setIsOfficial(v === '' ? '' : v === 'true')}
                options={[
                  { value: '', label: 'Tutti' },
                  { value: 'true', label: 'Solo Ufficiali' },
                  { value: 'false', label: 'Non Ufficiali' },
                ]}
              />
            )}
          </div>
        )}
      </div>

      {/* Simulations grid */}
      {simulations.length === 0 ? (
        <div className={`text-center py-12 ${colors.background.card} rounded-xl border ${colors.border.light}`}>
          <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          {activeTab === 'assigned' ? (
            <>
              <p className={`font-medium ${colors.text.primary} mb-1`}>Nessuna simulazione assegnata</p>
              <p className={`text-sm ${colors.text.muted}`}>
                I tuoi collaboratori non ti hanno ancora assegnato simulazioni
              </p>
            </>
          ) : (
            <>
              <p className={`font-medium ${colors.text.primary} mb-1`}>Nessuna autoesercitazione creata</p>
              <p className={`text-sm ${colors.text.muted} mb-4`}>
                Crea il tuo primo quiz veloce per iniziare a esercitarti
              </p>
              <button
                onClick={() => setShowSelfPracticeModal(true)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${colors.primary.bg} text-white hover:opacity-90 transition-opacity`}
              >
                <Zap className="w-4 h-4" />
                Crea Quiz Veloce
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {simulations.map((simulation) => {
            const statusInfo = studentStatusColors[simulation.studentStatus] || studentStatusColors.available;
            // Build URL with assignmentId if present
            const assignmentQuery = simulation.assignmentId ? `?assignmentId=${simulation.assignmentId}` : '';
            // Per simulazioni completate, vai direttamente ai risultati
            const href = simulation.studentStatus === 'completed' 
              ? `/simulazioni/${simulation.id}/risultato${assignmentQuery}`
              : `/simulazioni/${simulation.id}${assignmentQuery}`;
            
            // Determine if it's a single date or date range
            const hasStartDate = !!simulation.startDate;
            const hasEndDate = !!simulation.endDate;
            const isSingleDate = hasStartDate && hasEndDate && 
              new Date(simulation.startDate!).toDateString() === new Date(simulation.endDate!).toDateString();
            
            // Check if the simulation is disabled (closed, expired, not started)
            const isDisabled = ['closed', 'expired', 'not_started'].includes(simulation.studentStatus);
            
            // Use combination of id and assignmentId as unique key
            const cardKey = simulation.assignmentId 
              ? `${simulation.id}-${simulation.assignmentId}` 
              : simulation.id;
            
            return (
              <Link
                key={cardKey}
                href={href}
                className={`block p-5 rounded-xl ${colors.background.card} border ${colors.border.light} ${isDisabled ? 'opacity-75 cursor-not-allowed pointer-events-none' : 'hover:shadow-lg transition-all group'}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {simulation.isOfficial && (
                      <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
                        <Award className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </div>
                    )}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[simulation.type as SimulationType]}`}>
                      {typeLabels[simulation.type as SimulationType]}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                    {statusInfo.icon}
                    {studentStatusLabels[simulation.studentStatus]}
                  </div>
                </div>

                {/* Title */}
                <h3 className={`font-semibold ${colors.text.primary} group-hover:${colors.primary.text} transition-colors line-clamp-2 mb-3`}>
                  {simulation.title}
                </h3>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                  <div className={`flex items-center gap-1.5 ${colors.text.muted}`}>
                    <Target className="w-4 h-4" />
                    <span>{simulation._count.questions} domande</span>
                  </div>
                  {simulation.durationMinutes > 0 && (
                    <div className={`flex items-center gap-1.5 ${colors.text.muted}`}>
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(simulation.durationMinutes)}</span>
                    </div>
                  )}
                </div>

                {/* Info badges */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {/* Repeatable badge */}
                  {simulation.isRepeatable && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      <RefreshCw className="w-3 h-3" />
                      Ripetibile
                    </span>
                  )}
                  {/* Anti-cheat badge */}
                  {simulation.enableAntiCheat && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                      <Shield className="w-3 h-3" />
                      Anti-cheat
                    </span>
                  )}
                </div>

                {/* Date/Time info */}
                {(hasStartDate || hasEndDate) && (
                  <div className={`mt-3 pt-3 border-t ${colors.border.light}`}>
                    {isSingleDate ? (
                      // Single date: show date and time
                      <p className={`text-xs ${colors.text.muted}`}>
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {formatDateTime(simulation.startDate)} - {formatDateTime(simulation.endDate)}
                      </p>
                    ) : (
                      // Date range: show availability window
                      <div className="space-y-1">
                        {hasStartDate && (
                          <p className={`text-xs ${colors.text.muted}`}>
                            <Calendar className="w-3 h-3 inline mr-1" />
                            Dal: {formatDateTime(simulation.startDate)}
                          </p>
                        )}
                        {hasEndDate && (
                          <p className={`text-xs ${colors.text.muted}`}>
                            <Clock className="w-3 h-3 inline mr-1" />
                            Al: {formatDateTime(simulation.endDate)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* CTA */}
                <div className={`mt-4 pt-3 border-t ${colors.border.light}`}>
                  {simulation.studentStatus === 'available' && (
                    <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg ${colors.primary.bg} text-white font-medium group-hover:shadow-md transition-all`}>
                      <Play className="w-4 h-4" />
                      <span>Inizia simulazione</span>
                    </div>
                  )}
                  {simulation.studentStatus === 'in_progress' && (
                    <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 dark:bg-blue-600 text-white font-medium group-hover:shadow-md transition-all`}>
                      <Play className="w-4 h-4" />
                      <span>Continua simulazione</span>
                    </div>
                  )}
                  {simulation.studentStatus === 'completed' && (
                    <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-600 dark:bg-gray-700 text-white font-medium group-hover:shadow-md transition-all`}>
                      <BarChart3 className="w-4 h-4" />
                      <span>Vedi risultati</span>
                    </div>
                  )}
                  {simulation.studentStatus === 'expired' && (
                    <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-medium cursor-not-allowed`}>
                      <AlertCircle className="w-4 h-4" />
                      <span>Scaduta</span>
                    </div>
                  )}
                  {simulation.studentStatus === 'not_started' && (
                    <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 font-medium cursor-not-allowed`}>
                      <Calendar className="w-4 h-4" />
                      <span>Non ancora attiva</span>
                    </div>
                  )}
                  {simulation.studentStatus === 'closed' && (
                    <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-medium cursor-not-allowed`}>
                      <Lock className="w-4 h-4" />
                      <span>Chiusa</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className={`mt-6 flex items-center justify-center gap-2`}>
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className={`p-2 rounded-lg ${colors.background.hover} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className={`px-4 py-2 ${colors.text.secondary}`}>
            Pagina {pagination.page} di {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
            disabled={page === pagination.totalPages}
            className={`p-2 rounded-lg ${colors.background.hover} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Self Practice Modal */}
      <SelfPracticeModal
        isOpen={showSelfPracticeModal}
        onClose={() => setShowSelfPracticeModal(false)}
      />
    </div>
  );
}
