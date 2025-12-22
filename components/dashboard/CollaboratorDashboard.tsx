'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { colors } from '@/lib/theme/colors';
import { trpc } from '@/lib/trpc/client';
import { 
  BookOpen, 
  FolderOpen, 
  Users, 
  BarChart3,
  Clock,
  FileText,
  CheckCircle,
  PenTool,
  ExternalLink,
  AlertTriangle,
  MessageSquare,
  Plus,
  Eye,
  TrendingUp,
  Award,
  GraduationCap,
  Zap,
  Target,
} from 'lucide-react';

// Dynamic import for mini calendar
const MiniCalendar = dynamic(
  () => import('./MiniCalendar'),
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
        <div className="h-16 bg-gray-200 dark:bg-slate-700 rounded-xl" />
        <div className="h-16 bg-gray-200 dark:bg-slate-700 rounded-xl" />
      </div>
    </div>
  );
}

type ContractWithTemplate = {
  id: string;
  status: 'PENDING' | 'SIGNED' | 'EXPIRED' | 'CANCELLED';
  signToken?: string | null;
  template: {
    name: string;
    description?: string | null;
    price?: number | null;
    duration?: string | null;
  };
};

interface CollaboratorDashboardProps {
  userName: string;
  userInitial: string;
  isActive: boolean;
}

export function CollaboratorDashboard({ userName, userInitial, isActive }: CollaboratorDashboardProps) {
  // Get collaborator's contract
  const { data: contractData, isLoading: contractLoading } = trpc.contracts.getMyCollaboratorContract.useQuery(
    undefined,
    { retry: false }
  );

  const contract = contractData as ContractWithTemplate | null | undefined;

  // Determine contract status
  const hasPendingContract = contract?.status === 'PENDING';
  const hasSignedContract = contract?.status === 'SIGNED';
  const hasNoContract = !contract && !contractLoading;

  // Get dashboard stats (only for active users)
  const { data: dashboardData, isLoading: statsLoading } = trpc.users.getCollaboratorDashboardStats.useQuery(
    undefined,
    { enabled: isActive }
  );

  // Get calendar events
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
    },
    { enabled: isActive }
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
  const firstName = userName?.split(' ')[0] || 'Collaboratore';

  // Time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  }, []);

  // Show waiting/action page if:
  // 1. Account not active, OR
  // 2. Has a pending contract (needs to sign it)
  const showWaitingPage = !isActive || hasPendingContract;
  
  if (showWaitingPage) {
    return (
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className={`${colors.background.card} rounded-2xl p-6 mb-8 border ${colors.border.primary}`}>
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full ${colors.primary.bg} flex items-center justify-center text-white text-2xl font-bold`}>
                {userInitial}
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${colors.text.primary}`}>
                  Ciao, {firstName}! 👋
                </h1>
                <p className={colors.text.secondary}>
                  Il tuo account è quasi pronto
                </p>
              </div>
            </div>
          </div>

          {/* Status Card */}
          <div className={`${colors.background.card} rounded-2xl overflow-hidden border ${colors.border.primary}`}>
            {/* No contract assigned yet */}
            {hasNoContract && (
              <div className="p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-10 h-10 text-amber-500" />
                </div>
                <h2 className={`text-xl font-bold ${colors.text.primary} mb-3`}>
                  In Attesa di Contratto
                </h2>
                <p className={`${colors.text.secondary} max-w-md mx-auto`}>
                  Il tuo profilo è completo. L&apos;amministrazione ti assegnerà presto un contratto 
                  di collaborazione. Riceverai una notifica via email.
                </p>
                <div className={`mt-6 p-4 rounded-lg ${colors.background.secondary} inline-flex items-center gap-2`}>
                  <FileText className={`w-5 h-5 ${colors.text.muted}`} />
                  <span className={colors.text.secondary}>Nessun contratto assegnato</span>
                </div>
              </div>
            )}

            {/* Contract pending signature */}
            {hasPendingContract && contract?.signToken && (
              <div className="p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <PenTool className="w-10 h-10 text-white" />
                </div>
                <h2 className={`text-xl font-bold ${colors.text.primary} mb-3`}>
                  Contratto da Firmare
                </h2>
                <p className={`${colors.text.secondary} max-w-md mx-auto mb-2`}>
                  Ti è stato assegnato il contratto <strong className={colors.text.primary}>&quot;{contract.template.name}&quot;</strong>.
                </p>
                <p className={`${colors.text.secondary} max-w-md mx-auto`}>
                  Firmalo per completare l&apos;attivazione del tuo account collaboratore.
                </p>
                
                {contract.template.price && (
                  <div className={`mt-4 inline-block px-4 py-2 rounded-lg ${colors.primary.softBg}`}>
                    <span className={`text-sm ${colors.text.secondary}`}>Compenso previsto: </span>
                    <span className={`font-bold ${colors.primary.text}`}>
                      {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(contract.template.price)}
                    </span>
                  </div>
                )}

                <div className="mt-8">
                  <a
                    href={`/contratto/${contract.signToken}`}
                    className={`inline-flex items-center gap-3 px-8 py-4 rounded-xl ${colors.primary.gradient} text-white font-semibold shadow-lg hover:shadow-xl transition-all text-lg`}
                  >
                    <PenTool className="w-6 h-6" />
                    Visualizza e Firma Contratto
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>
              </div>
            )}

            {/* Contract signed, waiting activation */}
            {hasSignedContract && !isActive && (
              <div className="p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h2 className={`text-xl font-bold ${colors.text.primary} mb-3`}>
                  Contratto Firmato ✓
                </h2>
                <p className={`${colors.text.secondary} max-w-md mx-auto`}>
                  Hai firmato il contratto con successo! Il tuo account verrà attivato 
                  a breve dall&apos;amministrazione. Riceverai una notifica via email.
                </p>
                <div className={`mt-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 inline-flex items-center gap-2`}>
                  <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-green-700 dark:text-green-300">In attesa di attivazione</span>
                </div>
              </div>
            )}

            {/* Progress Steps */}
            <div className={`px-4 sm:px-8 py-6 border-t ${colors.border.primary} ${colors.background.secondary}`}>
              <div className="flex items-center justify-center gap-2 sm:gap-4">
                {/* Step 1: Profile */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <span className={`text-xs sm:text-sm font-medium ${colors.text.primary}`}>Profilo</span>
                </div>
                
                <div className={`w-6 sm:w-12 h-0.5 ${hasSignedContract || hasPendingContract ? 'bg-green-500' : colors.border.primary}`} />
                
                {/* Step 2: Contract */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                    hasSignedContract 
                      ? 'bg-green-500' 
                      : hasPendingContract 
                        ? `${colors.primary.bg}` 
                        : colors.background.tertiary
                  }`}>
                    {hasSignedContract ? (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    ) : hasPendingContract ? (
                      <PenTool className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    ) : (
                      <FileText className={`w-4 h-4 sm:w-5 sm:h-5 ${colors.text.muted}`} />
                    )}
                  </div>
                  <span className={`text-xs sm:text-sm font-medium ${hasPendingContract ? colors.primary.text : colors.text.primary}`}>
                    Contratto
                  </span>
                </div>
                
                <div className={`w-6 sm:w-12 h-0.5 ${isActive ? 'bg-green-500' : colors.border.primary}`} />
                
                {/* Step 3: Activation */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-green-500' : colors.background.tertiary
                  }`}>
                    {isActive ? (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    ) : (
                      <Clock className={`w-4 h-4 sm:w-5 sm:h-5 ${colors.text.muted}`} />
                    )}
                  </div>
                  <span className={`text-xs sm:text-sm font-medium ${colors.text.primary}`}>Attivazione</span>
                </div>
              </div>
            </div>
          </div>

          {/* Help Box */}
          <div className={`mt-8 p-4 rounded-lg ${colors.background.card} border ${colors.border.primary}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 ${colors.text.muted} mt-0.5 flex-shrink-0`} />
              <div>
                <p className={`font-medium ${colors.text.primary}`}>
                  Hai bisogno di assistenza?
                </p>
                <p className={`text-sm ${colors.text.secondary} mt-1`}>
                  Se hai domande sul contratto o sull&apos;attivazione del tuo account, 
                  contatta l&apos;amministrazione all&apos;indirizzo{' '}
                  <a href="mailto:info@leonardoschool.it" className={colors.primary.text}>
                    info@leonardoschool.it
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // ACTIVE COLLABORATOR DASHBOARD
  // ============================================================

  const stats = dashboardData?.stats || {
    mySimulations: 0,
    myQuestions: 0,
    myMaterials: 0,
    totalStudents: 0,
  };

  // Stats cards configuration
  const statsCards = [
    {
      title: 'Simulazioni',
      value: stats.mySimulations,
      icon: Target,
      href: '/simulazioni',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500',
      lightBg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Domande',
      value: stats.myQuestions,
      icon: BookOpen,
      href: '/domande',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500',
      lightBg: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      title: 'Materiali',
      value: stats.myMaterials,
      icon: FolderOpen,
      href: '/materiali',
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-500',
      lightBg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      title: 'Studenti',
      value: stats.totalStudents,
      icon: Users,
      href: '/studenti',
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-500',
      lightBg: 'bg-amber-50 dark:bg-amber-900/20',
    },
  ];

  // Quick actions
  const quickActions = [
    {
      label: 'Nuova Simulazione',
      description: 'Crea un test',
      href: '/simulazioni/nuova',
      icon: Plus,
      color: 'bg-blue-500',
    },
    {
      label: 'Nuova Domanda',
      description: 'Aggiungi al database',
      href: '/domande',
      icon: BookOpen,
      color: 'bg-purple-500',
    },
    {
      label: 'Carica Materiale',
      description: 'PDF, video, risorse',
      href: '/materiali',
      icon: FolderOpen,
      color: 'bg-emerald-500',
    },
    {
      label: 'Vedi Studenti',
      description: 'Lista e progressi',
      href: '/studenti',
      icon: GraduationCap,
      color: 'bg-amber-500',
    },
    {
      label: 'Statistiche',
      description: 'Report e analytics',
      href: '/statistiche',
      icon: BarChart3,
      color: 'bg-pink-500',
    },
    {
      label: 'Messaggi',
      description: 'Chat con studenti',
      href: '/messaggi',
      icon: MessageSquare,
      color: 'bg-cyan-500',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${colors.primary.bg} flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-lg`}>
            {userInitial}
          </div>
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${colors.text.primary}`}>
              {greeting}, <span className={colors.primary.text}>{firstName}</span>! 🤝
            </h1>
            <p className={`mt-0.5 ${colors.text.secondary}`}>
              Ecco il riepilogo delle tue attività
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${colors.status.success.softBg} ${colors.status.success.text}`}>
            <Award className="w-4 h-4" />
            Collaboratore
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className={`${colors.background.card} rounded-2xl p-5 border ${colors.border.primary} hover:shadow-lg transition-all group`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className={`w-5 h-5 ${colors.text.muted} group-hover:text-green-500 transition-colors`} />
            </div>
            <p className={`text-3xl font-bold ${colors.text.primary}`}>
              {statsLoading ? '...' : card.value}
            </p>
            <p className={`text-sm ${colors.text.secondary} mt-1`}>
              {card.title}
            </p>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Simulations */}
        <div className={`${colors.background.card} rounded-2xl ${colors.effects.shadow.lg} overflow-hidden`}>
          <div className={`px-5 py-4 border-b ${colors.border.primary} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <Target className={`w-5 h-5 ${colors.primary.text}`} />
              <h3 className={`font-semibold ${colors.text.primary}`}>Simulazioni Recenti</h3>
            </div>
            <Link 
              href="/simulazioni" 
              className={`text-sm ${colors.primary.text} ${colors.primary.textHover} flex items-center gap-1`}
            >
              Vedi tutte
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
          
          <div className="p-5">
            {statsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 dark:bg-slate-700 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : dashboardData?.recentSimulations && dashboardData.recentSimulations.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.recentSimulations.map((sim) => (
                  <Link
                    key={sim.id}
                    href={`/simulazioni/${sim.id}`}
                    className={`block p-4 rounded-xl ${colors.background.secondary} ${colors.background.hover} transition-colors`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${colors.text.primary} truncate`}>
                          {sim.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            sim.status === 'PUBLISHED' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}>
                            {sim.status === 'PUBLISHED' ? 'Pubblicata' : 'Bozza'}
                          </span>
                          <span className={`text-xs ${colors.text.muted}`}>
                            {sim._count.results} risultati
                          </span>
                        </div>
                      </div>
                      <Eye className={`w-4 h-4 ${colors.icon.muted}`} />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className={`w-16 h-16 mx-auto rounded-2xl ${colors.background.secondary} flex items-center justify-center mb-4`}>
                  <Target className={`w-8 h-8 ${colors.text.muted}`} />
                </div>
                <p className={`${colors.text.secondary} mb-4`}>
                  Non hai ancora creato simulazioni
                </p>
                <Link
                  href="/simulazioni/nuova"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${colors.primary.gradient} text-white text-sm font-medium`}
                >
                  <Plus className="w-4 h-4" />
                  Crea la prima
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mini Calendar */}
        <MiniCalendar 
          events={calendarEvents} 
          isLoading={eventsLoading} 
        />
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
          <Zap className="w-5 h-5" />
          Azioni Rapide
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`${colors.background.card} rounded-xl p-4 ${colors.effects.shadow.md} hover:shadow-lg transition-all group border ${colors.border.primary} hover:border-transparent`}
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h3 className={`font-semibold ${colors.text.primary} text-sm sm:text-base`}>
                {action.label}
              </h3>
              <p className={`text-xs ${colors.text.muted} mt-0.5 hidden sm:block`}>
                {action.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className={`p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800`}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              Pannello Collaboratore Attivo
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Hai accesso alla gestione di simulazioni, domande, materiali e statistiche. 
              Per questioni relative ai contratti o ai dati sensibili degli studenti, 
              contatta l&apos;amministratore.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CollaboratorDashboard;
