'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
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
  TrendingUp,
  Calendar,
  Activity,
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, loading } = useAuth();

  // Fetch pending students data
  const { data: pendingContract } = trpc.contracts.getStudentsPendingContract.useQuery();
  const { data: pendingSignature } = trpc.contracts.getStudentsPendingSignature.useQuery();
  const { data: pendingActivation } = trpc.contracts.getContractsPendingActivation.useQuery();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className={`w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto`}></div>
          <p className={`mt-4 ${colors.text.secondary}`}>Caricamento...</p>
        </div>
      </div>
    );
  }

  const dashboardCards = [
    {
      title: 'Gestione Studenti',
      description: 'Visualizza, gestisci contratti e attiva account',
      icon: Users,
      href: '/admin/studenti',
      color: 'bg-blue-500',
      stats: pendingContract?.length ? `${pendingContract.length} in attesa` : undefined,
    },
    {
      title: 'Template Contratti',
      description: 'Crea e modifica template contratti',
      icon: FileText,
      href: '/admin/contratti',
      color: 'bg-purple-500',
    },
    {
      title: 'Materiale Didattico',
      description: 'Gestisci PDF, video e risorse per gli studenti',
      icon: FolderOpen,
      href: '/admin/materiali',
      color: 'bg-teal-500',
    },
    {
      title: 'Banca Domande',
      description: 'Gestisci la banca dati delle domande',
      icon: BookOpen,
      href: '/admin/domande',
      color: 'bg-green-500',
    },
    {
      title: 'Simulazioni',
      description: 'Crea e gestisci le simulazioni d\'esame',
      icon: ClipboardList,
      href: '/admin/simulazioni',
      color: 'bg-amber-500',
    },
    {
      title: 'Statistiche',
      description: 'Analisi e report dei risultati',
      icon: BarChart3,
      href: '/admin/statistiche',
      color: 'bg-rose-500',
    },
  ];

  // Quick stats
  const quickStats = [
    {
      label: 'In attesa contratto',
      value: pendingContract?.length || 0,
      icon: Send,
      color: colors.status.warning,
      href: '/admin/studenti?status=pending_contract',
    },
    {
      label: 'In attesa firma',
      value: pendingSignature?.length || 0,
      icon: Clock,
      color: colors.status.info,
      href: '/admin/studenti?status=pending_signature',
    },
    {
      label: 'Da attivare',
      value: pendingActivation?.length || 0,
      icon: CheckCircle,
      color: colors.status.success,
      href: '/admin/studenti?status=pending_activation',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className={`${colors.background.card} rounded-2xl shadow-xl p-6 sm:p-8`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${colors.text.primary}`}>
              Benvenuto, {user?.name?.split(' ')[0]}! 👋
            </h1>
            <p className={`mt-2 ${colors.text.secondary}`}>
              Ecco un riepilogo della situazione attuale.
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
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickStats.map((stat, index) => (
          <Link
            key={index}
            href={stat.href}
            className={`${colors.background.card} rounded-xl p-5 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 group`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${stat.color.softBg} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color.text}`} />
                </div>
                <div>
                  <p className={`text-sm ${colors.text.secondary}`}>{stat.label}</p>
                  <p className={`text-2xl font-bold ${colors.text.primary}`}>{stat.value}</p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 ${colors.text.muted} group-hover:translate-x-1 transition-transform`} />
            </div>
          </Link>
        ))}
      </div>

      {/* Main Cards Grid */}
      <div>
        <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
          <Activity className="w-5 h-5" />
          Gestione Piattaforma
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {dashboardCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`${colors.background.card} p-6 rounded-xl shadow-md hover:shadow-xl transition-all hover:-translate-y-1 group`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center text-white flex-shrink-0`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-semibold ${colors.text.primary} group-hover:text-red-600 transition-colors`}>
                    {card.title}
                  </h3>
                  <p className={`text-sm ${colors.text.secondary} mt-1`}>
                    {card.description}
                  </p>
                  {card.stats && (
                    <p className={`text-sm ${colors.status.warning.text} font-medium mt-2`}>
                      {card.stats}
                    </p>
                  )}
                </div>
                <ChevronRight className={`w-5 h-5 ${colors.text.muted} group-hover:translate-x-1 transition-transform flex-shrink-0`} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`${colors.background.card} rounded-xl shadow-md p-6`}>
        <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
          <TrendingUp className="w-5 h-5" />
          Azioni Rapide
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/admin/studenti?action=assign"
            className={`p-4 rounded-xl border-2 border-dashed ${colors.border.primary} hover:border-red-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-center group`}
          >
            <Send className={`w-6 h-6 mx-auto mb-2 ${colors.text.muted} group-hover:text-red-600`} />
            <p className={`text-sm font-medium ${colors.text.secondary} group-hover:text-gray-900 dark:group-hover:text-gray-100`}>
              Assegna Contratto
            </p>
          </Link>
          <Link
            href="/admin/materiali?action=upload"
            className={`p-4 rounded-xl border-2 border-dashed ${colors.border.primary} hover:border-red-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-center group`}
          >
            <FolderOpen className={`w-6 h-6 mx-auto mb-2 ${colors.text.muted} group-hover:text-red-600`} />
            <p className={`text-sm font-medium ${colors.text.secondary} group-hover:text-gray-900 dark:group-hover:text-gray-100`}>
              Carica Materiale
            </p>
          </Link>
          <Link
            href="/admin/domande?action=create"
            className={`p-4 rounded-xl border-2 border-dashed ${colors.border.primary} hover:border-red-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-center group`}
          >
            <BookOpen className={`w-6 h-6 mx-auto mb-2 ${colors.text.muted} group-hover:text-red-600`} />
            <p className={`text-sm font-medium ${colors.text.secondary} group-hover:text-gray-900 dark:group-hover:text-gray-100`}>
              Nuova Domanda
            </p>
          </Link>
          <Link
            href="/admin/simulazioni?action=create"
            className={`p-4 rounded-xl border-2 border-dashed ${colors.border.primary} hover:border-red-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-center group`}
          >
            <ClipboardList className={`w-6 h-6 mx-auto mb-2 ${colors.text.muted} group-hover:text-red-600`} />
            <p className={`text-sm font-medium ${colors.text.secondary} group-hover:text-gray-900 dark:group-hover:text-gray-100`}>
              Nuova Simulazione
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
