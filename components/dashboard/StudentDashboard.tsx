'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import SelfPracticeModal from '@/components/student/SelfPracticeModal';
import {
  Zap,
  BookOpen,
  FolderOpen,
  BarChart3,
  Calendar,
  MessageSquare,
  PenTool,
  CheckCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Users,
  ExternalLink,
  TrendingUp,
  Target,
  GraduationCap,
  AlertTriangle,
} from 'lucide-react';

// Dynamic imports for SSR safety
const MiniCalendar = dynamic(
  () => import('./MiniCalendar'),
  { ssr: false, loading: () => <WidgetSkeleton /> }
);
const MiniStatsChart = dynamic(
  () => import('./MiniStatsChart'),
  { ssr: false, loading: () => <WidgetSkeleton /> }
);

/**
 * Widget Skeleton for loading states
 */
function WidgetSkeleton() {
  return (
    <div className={`${colors.background.card} rounded-2xl p-5 animate-pulse`}>
      <div className="h-6 w-32 bg-gray-200 dark:bg-slate-700 rounded mb-4" />
      <div className="space-y-3">
        <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded-xl" />
        <div className="h-16 bg-gray-200 dark:bg-slate-700 rounded-xl" />
      </div>
    </div>
  );
}

interface UserData {
  id?: string;
  name?: string;
  email?: string;
  isActive?: boolean;
  student?: {
    phone?: string | null;
    fiscalCode?: string | null;
    dateOfBirth?: string | null;
    address?: string | null;
    postalCode?: string | null;
    city?: string | null;
    province?: string | null;
  } | null;
}

interface StudentDashboardProps {
  user: UserData;
}

/**
 * StudentDashboard - Modern, engaging dashboard for students
 * Features: Contract alerts, self-practice CTA, mini calendar, stats chart, quick links
 */
export function StudentDashboard({ user }: StudentDashboardProps) {
  const [showSelfPracticeModal, setShowSelfPracticeModal] = useState(false);

  // Get student's contract
  const { data: contract, isLoading: contractLoading } = trpc.contracts.getMyContract.useQuery(
    undefined,
    { enabled: !!user?.student, retry: false }
  );

  // Get parent data requirement status
  const { data: parentDataReq } = trpc.students.getParentDataRequirement.useQuery(undefined, {
    enabled: !!user?.student,
  });

  // Get calendar events for the next month
  const dateRange = useMemo(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);
    return { start, end };
  }, []);

  const { data: eventsData, isLoading: eventsLoading } = trpc.calendar.getEvents.useQuery(
    {
      startDate: dateRange.start,
      endDate: dateRange.end,
      includeInvitations: true,
      includeCancelled: false,
      onlyMyEvents: true,
    },
    { enabled: !!user?.isActive }
  );

  // Get student stats
  const { data: statsData, isLoading: statsLoading } = trpc.students.getDetailedStats.useQuery(
    undefined,
    { enabled: !!user?.isActive }
  );

  // Transform events for mini calendar
  const calendarEvents = useMemo(() => {
    return (eventsData?.events || []).map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type || 'OTHER',
      startDate: new Date(e.startDate!),
      endDate: new Date(e.endDate!),
      isAllDay: e.isAllDay || false,
      locationType: e.locationType || 'IN_PERSON',
      locationDetails: e.locationDetails,
      onlineLink: e.onlineLink,
    }));
  }, [eventsData]);

  // First name for greeting
  const firstName = user?.name?.split(' ')[0] || 'Studente';

  // Time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  }, []);

  // Contract status info
  const getContractAlert = () => {
    if (contractLoading) return null;

    // Check if parent data is required (highest priority - blocks account)
    if (parentDataReq?.required && parentDataReq?.requestedByAdmin) {
      return {
        type: 'parent-data',
        title: 'Account Bloccato - Dati Genitore Richiesti',
        description: 'L\'amministrazione ha richiesto l\'inserimento dei dati del genitore/tutore legale. Completa i dati per sbloccare l\'account.',
        action: '/profilo?section=genitore',
        actionLabel: 'Compila dati',
        icon: AlertTriangle,
      };
    }
    
    if (contract?.status === 'PENDING') {
      return {
        type: 'pending',
        title: 'Contratto da Firmare',
        description: 'Ti è stato assegnato un contratto. Firmalo per completare l\'iscrizione.',
        action: `/contratto/${contract.signToken}`,
        actionLabel: 'Firma ora',
        icon: PenTool,
      };
    }

    if (!contract && !user?.isActive) {
      return {
        type: 'waiting',
        title: 'In Attesa di Contratto',
        description: 'Il tuo profilo è completo. L\'amministrazione ti assegnerà presto un contratto.',
        icon: Clock,
      };
    }

    if (contract?.status === 'SIGNED' && !user?.isActive) {
      return {
        type: 'activation',
        title: 'In Attesa di Attivazione',
        description: 'Hai firmato il contratto. Il tuo account verrà attivato a breve.',
        icon: CheckCircle,
      };
    }

    return null;
  };

  const contractAlert = getContractAlert();

  // Quick links configuration
  const quickLinks = [
    {
      href: '/simulazioni',
      icon: BookOpen,
      label: 'Simulazioni',
      description: 'Esercitati con i test',
      color: 'bg-blue-500',
    },
    {
      href: '/materiali',
      icon: FolderOpen,
      label: 'Materiali',
      description: 'PDF, video e risorse',
      color: 'bg-teal-500',
    },
    {
      href: '/statistiche',
      icon: BarChart3,
      label: 'Statistiche',
      description: 'Analizza il progresso',
      color: 'bg-purple-500',
    },
    {
      href: '/calendario',
      icon: Calendar,
      label: 'Calendario',
      description: 'Lezioni e appuntamenti',
      color: 'bg-amber-500',
    },
    {
      href: '/messaggi',
      icon: MessageSquare,
      label: 'Messaggi',
      description: 'Chat con i docenti',
      color: 'bg-green-500',
    },
    {
      href: '/gruppo',
      icon: Users,
      label: 'Il mio Gruppo',
      description: 'Compagni di studio',
      color: 'bg-pink-500',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${colors.text.primary}`}>
            {greeting}, <span className={colors.primary.text}>{firstName}</span>! 👋
          </h1>
          <p className={`mt-1 ${colors.text.secondary}`}>
            {user?.isActive 
              ? 'Cosa vuoi fare oggi? Continua il tuo percorso di preparazione.'
              : 'Benvenuto! Completa i passaggi per attivare il tuo account.'}
          </p>
        </div>
        {user?.isActive && (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${colors.status.success.softBg} ${colors.status.success.text}`}>
              <GraduationCap className="w-4 h-4" />
              Account Attivo
            </span>
          </div>
        )}
      </div>

      {/* Contract Alert - Show only when there's a pending action */}
      {contractAlert && (
        <div className={`rounded-2xl p-5 border ${
          contractAlert.type === 'pending' 
            ? `bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800`
            : contractAlert.type === 'parent-data'
            ? `bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-red-300 dark:border-red-800 border-2`
            : `${colors.status.warning.bgLight} ${colors.status.warning.border}`
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              contractAlert.type === 'pending' 
                ? 'bg-blue-100 dark:bg-blue-900/50' 
                : contractAlert.type === 'parent-data'
                ? 'bg-red-100 dark:bg-red-900/50'
                : colors.status.warning.softBg
            }`}>
              <contractAlert.icon className={`w-6 h-6 ${
                contractAlert.type === 'pending' 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : contractAlert.type === 'parent-data'
                  ? 'text-red-600 dark:text-red-400'
                  : colors.status.warning.text
              }`} />
            </div>
            <div className="flex-1">
              <h2 className={`text-lg font-semibold ${contractAlert.type === 'parent-data' ? 'text-red-700 dark:text-red-300' : colors.text.primary}`}>
                {contractAlert.type === 'parent-data' && '⚠️ '}{contractAlert.title}
              </h2>
              <p className={`mt-0.5 ${colors.text.secondary}`}>
                {contractAlert.description}
              </p>
              {contractAlert.action && (
                <a
                  href={contractAlert.action}
                  className={`inline-flex items-center gap-2 mt-3 px-5 py-2.5 rounded-xl ${
                    contractAlert.type === 'parent-data' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : colors.primary.gradient
                  } text-white font-medium shadow-lg hover:shadow-xl transition-all`}
                >
                  {contractAlert.type === 'parent-data' ? <AlertTriangle className="w-4 h-4" /> : <PenTool className="w-4 h-4" />}
                  {contractAlert.actionLabel}
                  <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Only show when active */}
      {user?.isActive && (
        <>
          {/* Self-Practice CTA - Hero Button */}
          <button
            onClick={() => setShowSelfPracticeModal(true)}
            className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 sm:p-8 hover:shadow-2xl transition-all duration-300"
          >
            {/* Animated background effect */}
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
            
            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                    Autoesercitazione
                    <Sparkles className="w-5 h-5 text-yellow-300" />
                  </h3>
                  <p className="text-white/90 text-sm sm:text-base mt-1">
                    Crea quiz personalizzati con materie, difficoltà e domande a scelta
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/20 backdrop-blur-sm text-white font-medium group-hover:bg-white/30 transition-colors">
                <span>Inizia ora</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>

          {/* Two-Column Layout: Calendar & Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mini Calendar */}
            <MiniCalendar 
              events={calendarEvents} 
              isLoading={eventsLoading} 
            />

            {/* Mini Stats Chart */}
            <MiniStatsChart 
              overview={statsData?.overview}
              trendData={statsData?.trendData}
              isLoading={statsLoading}
            />
          </div>

          {/* Quick Links Grid */}
          <div>
            <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
              <Target className="w-5 h-5" />
              Accesso Rapido
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${colors.background.card} rounded-xl p-4 ${colors.effects.shadow.md} hover:shadow-lg transition-all group border ${colors.border.primary} hover:border-transparent`}
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${link.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <link.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h3 className={`font-semibold ${colors.text.primary} text-sm sm:text-base`}>
                    {link.label}
                  </h3>
                  <p className={`text-xs ${colors.text.muted} mt-0.5 hidden sm:block`}>
                    {link.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* Motivation Section */}
          {statsData?.overview && statsData.overview.totalSimulations > 0 && (
            <div className={`${colors.background.card} rounded-2xl p-5 sm:p-6 ${colors.effects.shadow.lg} border ${colors.border.primary}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${colors.background.secondary} flex items-center justify-center flex-shrink-0`}>
                  <TrendingUp className={`w-6 h-6 ${colors.primary.text}`} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${colors.text.primary}`}>
                    {statsData.overview.improvement > 0 
                      ? '📈 Stai migliorando!' 
                      : statsData.overview.totalSimulations >= 5 
                        ? '💪 Continua così!' 
                        : '🚀 Ottimo inizio!'}
                  </h3>
                  <p className={`${colors.text.secondary} text-sm mt-1`}>
                    {statsData.overview.improvement > 0 
                      ? `Hai migliorato del ${statsData.overview.improvement.toFixed(1)}% rispetto alle prime simulazioni. Fantastico progresso!`
                      : statsData.overview.totalSimulations >= 5
                        ? `Hai completato ${statsData.overview.totalSimulations} simulazioni con una media del ${statsData.overview.averageScore.toFixed(1)}%. Continua ad esercitarti!`
                        : `Hai già completato ${statsData.overview.totalSimulations} simulazioni. Continua per vedere il tuo trend!`}
                  </p>
                </div>
                <Link
                  href="/simulazioni"
                  className={`px-4 py-2 rounded-xl ${colors.primary.gradient} text-white text-sm font-medium flex items-center gap-2 flex-shrink-0`}
                >
                  Nuova simulazione
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {/* Inactive User - Waiting State */}
      {!user?.isActive && !contractAlert && (
        <div className={`${colors.background.card} rounded-2xl p-8 text-center ${colors.effects.shadow.lg}`}>
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <Clock className={`w-8 h-8 ${colors.text.muted}`} />
          </div>
          <h2 className={`text-xl font-bold ${colors.text.primary} mb-2`}>
            Account in Attesa
          </h2>
          <p className={`${colors.text.secondary} max-w-md mx-auto`}>
            Il tuo account è in attesa di attivazione. Riceverai una notifica quando sarà tutto pronto.
          </p>
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

export default StudentDashboard;
