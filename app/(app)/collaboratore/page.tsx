'use client';

import { useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { auth } from '@/lib/firebase/config';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { 
  BookOpen, 
  FolderOpen, 
  Users, 
  BarChart3,
  TrendingUp,
  Clock,
  FileText,
  CheckCircle,
  PenTool,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

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

export default function CollaboratorDashboard() {
  const { data: user, isLoading: userLoading, error: userError } = trpc.auth.me.useQuery();
  
  // Get collaborator's contract
  const { data: contractData, isLoading: contractLoading } = trpc.contracts.getMyCollaboratorContract.useQuery(
    undefined,
    { 
      enabled: !!user && user.role === 'COLLABORATOR',
      retry: false,
    }
  );

  // Cast contract to include template info
  const contract = contractData as ContractWithTemplate | null | undefined;

  // Handle error or no user - sign out and redirect to login
  useEffect(() => {
    if (userError || (!userLoading && !user)) {
      const handleLogout = async () => {
        try {
          await auth.signOut();
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
          console.error('Logout error:', e);
        } finally {
          window.location.href = '/auth/login';
        }
      };
      handleLogout();
    }
  }, [userError, userLoading, user]);

  // Loading state
  if (userLoading || contractLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className={`mt-4 ${colors.text.secondary}`}>Caricamento...</p>
        </div>
      </div>
    );
  }

  // Determine account status
  const isActive = user?.isActive;
  const hasPendingContract = contract?.status === 'PENDING';
  const hasSignedContract = contract?.status === 'SIGNED';
  const hasNoContract = !contract;

  // Show waiting/action page if:
  // 1. Account not active, OR
  // 2. Has a pending contract (needs to sign it)
  // Show normal dashboard if:
  // 1. Account is active AND (has signed contract OR no contract at all)
  const showWaitingPage = !isActive || hasPendingContract;
  
  if (showWaitingPage) {
    return (
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className={`${colors.background.card} rounded-2xl p-6 mb-8 border ${colors.border.primary}`}>
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full ${colors.primary.bg} flex items-center justify-center text-white text-2xl font-bold`}>
                {user?.name?.charAt(0).toUpperCase() || 'C'}
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${colors.text.primary}`}>
                  Ciao, {user?.name?.split(' ')[0] || 'Collaboratore'}! 👋
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

  // Full dashboard for active collaborators with signed contract
  const statsCards = [
    {
      title: 'Domande',
      value: '---',
      icon: BookOpen,
      href: '/collaboratore/domande',
      color: 'bg-blue-500',
      description: 'Gestisci le domande dei test',
    },
    {
      title: 'Materiali',
      value: '---',
      icon: FolderOpen,
      href: '/collaboratore/materiali',
      color: 'bg-green-500',
      description: 'Gestisci i materiali didattici',
    },
    {
      title: 'Studenti',
      value: '---',
      icon: Users,
      href: '/collaboratore/studenti',
      color: 'bg-purple-500',
      description: 'Visualizza gli studenti',
    },
    {
      title: 'Statistiche',
      value: '---',
      icon: BarChart3,
      href: '/collaboratore/statistiche',
      color: 'bg-amber-500',
      description: 'Analizza le performance',
    },
  ];

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className={`${colors.background.card} rounded-2xl p-6 mb-8 border ${colors.border.primary}`}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full ${colors.primary.bg} flex items-center justify-center text-white text-2xl font-bold`}>
              {user?.name?.charAt(0).toUpperCase() || 'C'}
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${colors.text.primary}`}>
                Benvenuto, {user?.name?.split(' ')[0] || 'Collaboratore'}! 🤝
              </h1>
              <p className={colors.text.secondary}>
                Pannello di controllo collaboratore
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className={`${colors.background.card} rounded-xl p-6 border ${colors.border.primary} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all hover:shadow-lg group`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.color} text-white`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <TrendingUp className={`w-5 h-5 ${colors.text.muted} group-hover:text-green-500 transition-colors`} />
              </div>
              <h3 className={`text-lg font-semibold ${colors.text.primary} mb-1`}>
                {card.title}
              </h3>
              <p className={`text-sm ${colors.text.secondary}`}>
                {card.description}
              </p>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className={`${colors.background.card} rounded-2xl p-6 border ${colors.border.primary}`}>
          <h2 className={`text-xl font-semibold ${colors.text.primary} mb-4`}>
            Azioni Rapide
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/collaboratore/domande/nuova"
              className={`flex items-center gap-3 p-4 rounded-lg border ${colors.border.primary} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
            >
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className={`font-medium ${colors.text.primary}`}>Nuova Domanda</p>
                <p className={`text-xs ${colors.text.secondary}`}>Aggiungi domanda test</p>
              </div>
            </Link>
            
            <Link
              href="/collaboratore/materiali"
              className={`flex items-center gap-3 p-4 rounded-lg border ${colors.border.primary} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
            >
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <p className={`font-medium ${colors.text.primary}`}>Carica Materiale</p>
                <p className={`text-xs ${colors.text.secondary}`}>Upload nuovo file</p>
              </div>
            </Link>
            
            <Link
              href="/collaboratore/studenti"
              className={`flex items-center gap-3 p-4 rounded-lg border ${colors.border.primary} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
            >
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className={`font-medium ${colors.text.primary}`}>Vedi Studenti</p>
                <p className={`text-xs ${colors.text.secondary}`}>Lista studenti attivi</p>
              </div>
            </Link>
            
            <Link
              href="/collaboratore/statistiche"
              className={`flex items-center gap-3 p-4 rounded-lg border ${colors.border.primary} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
            >
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className={`font-medium ${colors.text.primary}`}>Statistiche</p>
                <p className={`text-xs ${colors.text.secondary}`}>Visualizza report</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Info Box */}
        <div className={`mt-8 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800`}>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Pannello Collaboratore
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Hai accesso alla gestione di domande, materiali e statistiche. 
                Per questioni relative ai contratti o ai dati sensibili degli studenti, 
                contatta l&apos;amministratore.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
