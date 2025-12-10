'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { firebaseAuth } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { colors } from '@/lib/theme/colors';

export default function StudentDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await firebaseAuth.logout();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className={`text-3xl font-bold ${colors.neutral.textPrimary}`}>
            Dashboard Studente
          </h1>
          <p className={`mt-2 ${colors.neutral.textSecondary}`}>
            Benvenuto, {user?.name}!
          </p>
        </div>
        <button
          onClick={handleLogout}
          className={`px-4 py-2 ${colors.status.error.bg} ${colors.neutral.text.white} rounded-md hover:bg-red-700`}
        >
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${colors.effects.cardBackground} p-6 rounded-lg shadow`}>
          <h3 className="text-lg font-semibold mb-2">Simulazioni</h3>
          <p className={colors.neutral.textSecondary}>Le tue simulazioni di test</p>
        </div>

        <div className={`${colors.effects.cardBackground} p-6 rounded-lg shadow`}>
          <h3 className="text-lg font-semibold mb-2">Statistiche</h3>
          <p className={colors.neutral.textSecondary}>Analizza le tue performance</p>
        </div>

        <div className={`${colors.effects.cardBackground} p-6 rounded-lg shadow`}>
          <h3 className="text-lg font-semibold mb-2">Profilo</h3>
          <p className={colors.neutral.textSecondary}>Gestisci il tuo profilo</p>
        </div>
      </div>

      <div className={`mt-8 ${colors.status.info.bgLight} ${colors.status.info.border} rounded-lg p-6`}>
        <h2 className={`text-xl font-semibold ${colors.status.info.text} mb-2`}>
          🎉 Autenticazione Funzionante!
        </h2>
        <p className={colors.status.info.text}>
          Hai effettuato il login con successo. Questa è la dashboard studente protetta.
        </p>
        <div className={`mt-4 ${colors.effects.cardBackground} p-4 rounded ${colors.status.info.border}`}>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
