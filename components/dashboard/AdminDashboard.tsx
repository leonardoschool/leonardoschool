'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { colors } from '@/lib/theme/colors';
import { trpc } from '@/lib/trpc/client';
import { 
  Users, 
  FileText, 
  BookOpen, 
  ClipboardList, 
  BarChart3, 
  ChevronRight,
  Clock,
  CheckCircle,
  Send,
  FolderOpen,
  Calendar,
  Activity,
  GraduationCap,
  UserCheck,
  UserPlus,
  Mail,
  Briefcase,
  FileSignature,
  UsersRound,
  Tag,
  ClipboardCheck,
  UserMinus,
  AlertTriangle,
  Zap,
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
        <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded-xl" />
        <div className="h-16 bg-gray-200 dark:bg-slate-700 rounded-xl" />
      </div>
    </div>
  );
}

interface AdminDashboardProps {
  userName: string;
}

export function AdminDashboard({ userName }: AdminDashboardProps) {
  // Time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  }, []);

  // First name for greeting
  const firstName = userName?.split(' ')[0] || 'Admin';

  // Fetch user stats
  const { data: userStats } = trpc.users.getStats.useQuery({ role: 'ALL' });

  // Fetch job applications stats
  const { data: jobApplicationsStats } = trpc.jobApplications.getStats.useQuery();

  // Fetch contact requests stats
  const { data: contactRequestsStats } = trpc.contactRequests.getStats.useQuery();

  // Fetch calendar events for the next month
  const dateRange = useMemo(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);
    return { start, end };
  }, []);

  const { data: eventsData, isLoading: eventsLoading } = trpc.calendar.getEvents.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
    includeInvitations: true,
    includeCancelled: false,
  });

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

  // Platform overview stats
  const platformStats = [
    {
      label: 'Utenti Totali',
      value: userStats?.total || 0,
      icon: Users,
      color: 'bg-blue-500',
      href: '/utenti',
    },
    {
      label: 'Studenti',
      value: userStats?.students || 0,
      icon: GraduationCap,
      color: 'bg-green-500',
      href: '/utenti?role=STUDENT',
    },
    {
      label: 'Collaboratori',
      value: userStats?.collaborators || 0,
      icon: UserCheck,
      color: 'bg-purple-500',
      href: '/utenti?role=COLLABORATOR',
    },
    {
      label: 'Utenti Attivi',
      value: userStats?.active || 0,
      icon: Activity,
      color: 'bg-teal-500',
      href: '/utenti?status=active',
    },
  ];

  // Pending actions that need attention
  const pendingActions = [
    {
      label: 'Profili da completare',
      value: userStats?.pendingProfile || 0,
      icon: UserPlus,
      color: colors.status.warning,
      href: '/utenti?status=pending_profile',
      description: 'Utenti registrati ma senza profilo completo',
    },
    {
      label: 'In attesa contratto',
      value: userStats?.pendingContract || 0,
      icon: Send,
      color: colors.status.info,
      href: '/utenti?status=pending_contract',
      description: 'Profili completi in attesa di contratto',
    },
    {
      label: 'In attesa firma',
      value: userStats?.pendingSign || 0,
      icon: FileSignature,
      color: colors.status.warning,
      href: '/utenti?status=pending_sign',
      description: 'Contratti assegnati da firmare',
    },
    {
      label: 'Da attivare',
      value: userStats?.pendingActivation || 0,
      icon: CheckCircle,
      color: colors.status.success,
      href: '/utenti?status=pending_activation',
      description: 'Contratti firmati, pronti per attivazione',
    },
  ];

  // Other pending items
  const otherPending = [
    {
      label: 'Candidature',
      value: jobApplicationsStats?.pending || 0,
      icon: Briefcase,
      color: 'bg-amber-500',
      href: '/candidature',
      description: 'Nuove candidature da valutare',
    },
    {
      label: 'Richieste Contatto',
      value: contactRequestsStats?.pending || 0,
      icon: Mail,
      color: 'bg-pink-500',
      href: '/richieste',
      description: 'Richieste di informazioni in attesa',
    },
  ];

  // Management cards with icons
  const managementCards = [
    {
      title: 'Gestione Utenti',
      description: 'Visualizza, gestisci ruoli e contratti',
      icon: Users,
      href: '/utenti',
      color: 'bg-blue-500',
    },
    {
      title: 'Gruppi',
      description: 'Organizza studenti e collaboratori',
      icon: UsersRound,
      href: '/gruppi',
      color: 'bg-indigo-500',
    },
    {
      title: 'Template Contratti',
      description: 'Crea e modifica template',
      icon: FileText,
      href: '/contratti',
      color: 'bg-purple-500',
    },
  ];

  // Didattica cards
  const didatticaCards = [
    {
      title: 'Banca Domande',
      description: 'Gestisci la banca dati delle domande',
      icon: BookOpen,
      href: '/domande',
      color: 'bg-green-500',
    },
    {
      title: 'Tag',
      description: 'Organizza domande per argomento',
      icon: Tag,
      href: '/tags',
      color: 'bg-cyan-500',
    },
    {
      title: 'Materiale Didattico',
      description: 'PDF, video e risorse',
      icon: FolderOpen,
      href: '/materiali',
      color: 'bg-teal-500',
    },
    {
      title: 'Simulazioni',
      description: 'Crea e gestisci le simulazioni',
      icon: ClipboardList,
      href: '/simulazioni',
      color: 'bg-amber-500',
    },
  ];

  // Registro cards
  const registroCards = [
    {
      title: 'Registro Elettronico',
      description: 'Presenze e partecipazione',
      icon: ClipboardCheck,
      href: '/presenze',
      color: 'bg-emerald-500',
    },
    {
      title: 'Assenze Staff',
      description: 'Gestisci le assenze dei collaboratori',
      icon: UserMinus,
      href: '/assenze',
      color: 'bg-orange-500',
    },
    {
      title: 'Statistiche',
      description: 'Analisi e report dei risultati',
      icon: BarChart3,
      href: '/statistiche',
      color: 'bg-rose-500',
    },
  ];

  // Calculate total pending that need attention
  const totalPendingActions = (userStats?.pendingProfile || 0) + 
    (userStats?.pendingContract || 0) + 
    (userStats?.pendingSign || 0) + 
    (userStats?.pendingActivation || 0) +
    (jobApplicationsStats?.pending || 0) +
    (contactRequestsStats?.pending || 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${colors.text.primary}`}>
            {greeting}, <span className={colors.primary.text}>{firstName}</span>! 👋
          </h1>
          <p className={`mt-1 ${colors.text.secondary}`}>
            Ecco un riepilogo della situazione attuale della piattaforma.
          </p>
        </div>
        <div className={`flex items-center gap-2 text-sm ${colors.text.muted}`}>
          <Calendar className="w-4 h-4" />
          {new Date().toLocaleDateString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </div>
      </div>

      {/* Alert Banner - Show when there are pending actions */}
      {totalPendingActions > 0 && (
        <div className={`rounded-2xl p-5 border bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-100 dark:bg-amber-900/50`}>
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
                {totalPendingActions} azioni in sospeso
              </h2>
              <p className={`mt-0.5 ${colors.text.secondary}`}>
                Ci sono elementi che richiedono la tua attenzione.
              </p>
            </div>
            <Link
              href="/utenti"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl ${colors.primary.gradient} text-white font-medium shadow-lg hover:shadow-xl transition-all`}
            >
              <Zap className="w-4 h-4" />
              Gestisci ora
            </Link>
          </div>
        </div>
      )}

      {/* Platform Overview Stats */}
      <div>
        <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
          <BarChart3 className="w-5 h-5" />
          Panoramica Piattaforma
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {platformStats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className={`${colors.background.card} rounded-xl p-4 sm:p-5 ${colors.effects.shadow.md} hover:shadow-lg transition-all group border ${colors.border.primary} hover:border-transparent`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${stat.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs sm:text-sm ${colors.text.muted}`}>{stat.label}</p>
                  <p className={`text-xl sm:text-2xl font-bold ${colors.text.primary}`}>{stat.value}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Two-Column Layout: Pending Actions & Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Actions */}
        <div className={`${colors.background.card} rounded-2xl ${colors.effects.shadow.lg} overflow-hidden`}>
          <div className={`px-5 py-4 border-b ${colors.border.primary} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <Clock className={`w-5 h-5 ${colors.status.warning.text}`} />
              <h3 className={`font-semibold ${colors.text.primary}`}>Azioni in Attesa</h3>
            </div>
            <Link 
              href="/utenti" 
              className={`text-sm ${colors.primary.text} ${colors.primary.textHover} flex items-center gap-1`}
            >
              Vedi tutti
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="p-4 space-y-3">
            {pendingActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={`flex items-center justify-between p-3 rounded-xl ${colors.background.secondary} hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${action.color.softBg} flex items-center justify-center`}>
                    <action.icon className={`w-5 h-5 ${action.color.text}`} />
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${colors.text.primary}`}>{action.label}</p>
                    <p className={`text-xs ${colors.text.muted}`}>{action.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${action.value > 0 ? colors.text.primary : colors.text.muted}`}>
                    {action.value}
                  </span>
                  <ChevronRight className={`w-4 h-4 ${colors.text.muted} group-hover:translate-x-1 transition-transform`} />
                </div>
              </Link>
            ))}

            {/* Separator */}
            <div className={`border-t ${colors.border.primary} my-2`} />

            {/* Other pending */}
            {otherPending.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={`flex items-center justify-between p-3 rounded-xl ${colors.background.secondary} hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${colors.text.primary}`}>{action.label}</p>
                    <p className={`text-xs ${colors.text.muted}`}>{action.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {action.value > 0 && (
                    <span className={`min-w-[24px] h-6 px-2 rounded-full text-xs font-bold flex items-center justify-center ${colors.primary.gradient} text-white`}>
                      {action.value}
                    </span>
                  )}
                  <ChevronRight className={`w-4 h-4 ${colors.text.muted} group-hover:translate-x-1 transition-transform`} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Mini Calendar */}
        <MiniCalendar 
          events={calendarEvents} 
          isLoading={eventsLoading} 
        />
      </div>

      {/* Management Cards */}
      <div>
        <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
          <Activity className="w-5 h-5" />
          Gestione
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {managementCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`${colors.background.card} p-5 rounded-xl ${colors.effects.shadow.md} hover:shadow-lg transition-all group border ${colors.border.primary} hover:border-transparent`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center text-white flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold ${colors.text.primary} group-hover:${colors.primary.text} transition-colors`}>
                      {card.title}
                    </h3>
                  </div>
                  <p className={`text-sm ${colors.text.secondary} mt-1`}>
                    {card.description}
                  </p>
                </div>
                <ChevronRight className={`w-5 h-5 ${colors.text.muted} group-hover:translate-x-1 transition-transform flex-shrink-0`} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Didattica Cards */}
      <div>
        <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
          <BookOpen className="w-5 h-5" />
          Didattica
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {didatticaCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`${colors.background.card} p-4 rounded-xl ${colors.effects.shadow.md} hover:shadow-lg transition-all group border ${colors.border.primary} hover:border-transparent`}
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${card.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <card.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h3 className={`font-semibold ${colors.text.primary} text-sm sm:text-base`}>
                {card.title}
              </h3>
              <p className={`text-xs ${colors.text.muted} mt-1 hidden sm:block`}>
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Registro & Stats Cards */}
      <div>
        <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
          <ClipboardCheck className="w-5 h-5" />
          Registro & Statistiche
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {registroCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`${colors.background.card} p-5 rounded-xl ${colors.effects.shadow.md} hover:shadow-lg transition-all group border ${colors.border.primary} hover:border-transparent`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center text-white flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold ${colors.text.primary}`}>
                    {card.title}
                  </h3>
                  <p className={`text-sm ${colors.text.secondary} mt-1`}>
                    {card.description}
                  </p>
                </div>
                <ChevronRight className={`w-5 h-5 ${colors.text.muted} group-hover:translate-x-1 transition-transform flex-shrink-0`} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
