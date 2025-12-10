'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { firebaseAuth } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { colors } from '@/lib/theme/colors';
import { trpc } from '@/lib/trpc/client';
import { 
  Users, 
  FileText, 
  BookOpen, 
  ClipboardList, 
  BarChart3, 
  Bell,
  LogOut,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  Send
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Fetch pending students data
  const { data: pendingContract } = trpc.contracts.getStudentsPendingContract.useQuery();
  const { data: pendingSignature } = trpc.contracts.getStudentsPendingSignature.useQuery();
  const { data: pendingActivation } = trpc.contracts.getContractsPendingActivation.useQuery();
  const { data: notifications } = trpc.contracts.getAdminNotifications.useQuery({ unreadOnly: true, limit: 5 });

  const handleLogout = async () => {
    await firebaseAuth.logout();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className={`w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin`}></div>
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
      title: 'Domande',
      description: 'Gestisci la banca dati delle domande',
      icon: BookOpen,
      href: '/admin/domande',
      color: 'bg-green-500',
    },
    {
      title: 'Simulazioni',
      description: 'Crea e gestisci le simulazioni',
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-bold`}>
            Dashboard Admin
          </h1>
          <p className={`mt-2 ${colors.text.secondary}`}>
            Benvenuto, {user?.name}!
          </p>
        </div>
        <button
          onClick={handleLogout}
          className={`px-4 py-2 ${colors.background.secondary} rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors`}
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Pending Contract */}
        <Link 
          href="/admin/studenti?status=pending_contract"
          className={`${colors.background.card} rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border-l-4 border-amber-500`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${colors.status.warning.softBg} flex items-center justify-center`}>
                <Send className={`w-5 h-5 ${colors.status.warning.text}`} />
              </div>
              <div>
                <p className={`text-sm ${colors.text.secondary}`}>In attesa contratto</p>
                <p className="text-2xl font-bold">{pendingContract?.length || 0}</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 ${colors.text.muted}`} />
          </div>
        </Link>

        {/* Pending Signature */}
        <Link 
          href="/admin/studenti?status=pending_signature"
          className={`${colors.background.card} rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border-l-4 border-blue-500`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${colors.status.info.softBg} flex items-center justify-center`}>
                <Clock className={`w-5 h-5 ${colors.status.info.text}`} />
              </div>
              <div>
                <p className={`text-sm ${colors.text.secondary}`}>In attesa firma</p>
                <p className="text-2xl font-bold">{pendingSignature?.length || 0}</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 ${colors.text.muted}`} />
          </div>
        </Link>

        {/* Pending Activation */}
        <Link 
          href="/admin/studenti?status=pending_activation"
          className={`${colors.background.card} rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border-l-4 border-green-500`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${colors.status.success.softBg} flex items-center justify-center`}>
                <CheckCircle className={`w-5 h-5 ${colors.status.success.text}`} />
              </div>
              <div>
                <p className={`text-sm ${colors.text.secondary}`}>Da attivare</p>
                <p className="text-2xl font-bold">{pendingActivation?.length || 0}</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 ${colors.text.muted}`} />
          </div>
        </Link>
      </div>

      {/* Main Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {dashboardCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`${colors.background.card} p-6 rounded-xl shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 group`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center text-white`}>
                <card.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold group-hover:text-red-600 transition-colors">
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
              <ChevronRight className={`w-5 h-5 ${colors.text.muted} group-hover:translate-x-1 transition-transform`} />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Notifications */}
      {notifications && notifications.length > 0 && (
        <div className={`${colors.background.card} rounded-xl shadow-sm p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifiche Recenti
            </h2>
            <Link href="/admin/notifiche" className={`text-sm ${colors.primary.text} hover:underline`}>
              Vedi tutte
            </Link>
          </div>
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                className={`p-4 rounded-lg ${notification.isUrgent ? colors.status.warning.softBg : colors.background.secondary} flex items-start gap-3`}
              >
                {notification.isUrgent && (
                  <AlertTriangle className={`w-5 h-5 ${colors.status.warning.text} flex-shrink-0 mt-0.5`} />
                )}
                <div>
                  <p className="font-medium">{notification.title}</p>
                  <p className={`text-sm ${colors.text.secondary}`}>{notification.message}</p>
                  <p className={`text-xs ${colors.text.muted} mt-1`}>
                    {new Intl.DateTimeFormat('it-IT', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(notification.createdAt))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
