'use client';

import Link from 'next/link';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import {
  ArrowLeft,
  Clock,
  Target,
  Play,
  Award,
  Shield,
  Users,
  CalendarPlus,
} from 'lucide-react';

interface SimulationStartScreenProps {
  simulation: {
    title?: string;
    description?: string | null;
    totalQuestions?: number;
    durationMinutes?: number;
    correctPoints?: number;
    wrongPoints?: number;
    blankPoints?: number;
    isOfficial?: boolean;
    enableAntiCheat?: boolean;
    forceFullscreen?: boolean;
    hasInProgressAttempt?: boolean;
    startDate?: Date | string | null;
  };
  id: string;
  isVirtualRoom: boolean;
  onStart: () => void;
  isPending: boolean;
}

/**
 * Start screen for non-virtual room simulations
 */
export default function SimulationStartScreen({
  simulation,
  id,
  isVirtualRoom,
  onStart,
  isPending,
}: SimulationStartScreenProps) {
  // Extract values with defaults
  const title = simulation.title ?? 'Simulazione';
  const totalQuestions = simulation.totalQuestions ?? 0;
  const durationMinutes = simulation.durationMinutes ?? 0;
  const correctPoints = simulation.correctPoints ?? 1;
  const wrongPoints = simulation.wrongPoints ?? 0;
  const blankPoints = simulation.blankPoints ?? 0;
  const isOfficial = simulation.isOfficial ?? false;
  const enableAntiCheat = simulation.enableAntiCheat ?? false;
  const forceFullscreen = simulation.forceFullscreen ?? false;
  const hasInProgressAttempt = simulation.hasInProgressAttempt ?? false;
  const startDate = simulation.startDate ? new Date(simulation.startDate) : null;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-2xl mx-auto">
      <Link
        href="/simulazioni"
        className={`inline-flex items-center gap-2 text-sm ${colors.text.muted} hover:${colors.text.primary} mb-6`}
      >
        <ArrowLeft className="w-4 h-4" />
        Torna alle simulazioni
      </Link>

      <div className={`rounded-xl p-8 ${colors.background.card} border ${colors.border.light} text-center`}>
        {/* Virtual Room indicator */}
        {isVirtualRoom && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium mb-4 mr-2">
            <Users className="w-4 h-4" />
            Stanza Virtuale
          </div>
        )}
        
        {isOfficial && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium mb-4">
            <Award className="w-4 h-4" />
            Simulazione Ufficiale
          </div>
        )}

        <h1 className={`text-2xl font-bold ${colors.text.primary} mb-2`}>{title}</h1>
        {simulation.description && (
          <p className={`${colors.text.secondary} mb-6`}>{simulation.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className={`p-4 rounded-lg ${colors.background.secondary}`}>
            <Target className="w-6 h-6 mx-auto text-gray-500 mb-2" />
            <p className={`text-2xl font-bold ${colors.text.primary}`}>{totalQuestions}</p>
            <p className={`text-sm ${colors.text.muted}`}>Domande</p>
          </div>
          <div className={`p-4 rounded-lg ${colors.background.secondary}`}>
            <Clock className="w-6 h-6 mx-auto text-gray-500 mb-2" />
            <p className={`text-2xl font-bold ${colors.text.primary}`}>
              {durationMinutes > 0 ? `${durationMinutes} min` : '∞'}
            </p>
            <p className={`text-sm ${colors.text.muted}`}>Tempo</p>
          </div>
        </div>

        <div className={`mb-8 text-left p-4 rounded-lg ${colors.background.secondary}`}>
          <h3 className={`font-medium ${colors.text.primary} mb-3`}>Punteggio:</h3>
          <ul className={`space-y-1 text-sm ${colors.text.secondary}`}>
            <li>✓ Risposta corretta: <span className="font-medium text-green-600">+{correctPoints}</span></li>
            <li>✗ Risposta errata: <span className="font-medium text-red-600">{wrongPoints}</span></li>
            <li>○ Non risposta: <span className="font-medium">{blankPoints}</span></li>
          </ul>
        </div>

        {/* Anti-cheat warning */}
        {enableAntiCheat && (
          <div className="mb-4 p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-left">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-800 dark:text-orange-300 mb-1">
                  Protezione Anti-Cheat Attiva
                </h4>
                <p className="text-sm text-orange-700 dark:text-orange-400">
                  Durante questa simulazione verranno monitorati:
                </p>
                <ul className="text-sm text-orange-600 dark:text-orange-400 mt-2 space-y-1">
                  <li>• Cambio finestra/tab del browser</li>
                  <li>• Apertura strumenti sviluppatore</li>
                  <li>• Tentativi di copia/incolla</li>
                  {forceFullscreen && <li>• Uscita dalla modalità schermo intero</li>}
                </ul>
                {forceFullscreen && (
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-300 mt-3">
                    ⚠️ Sarà richiesta la modalità schermo intero
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {hasInProgressAttempt && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Hai un tentativo in corso. Cliccando &quot;Inizia&quot; riprenderai da dove ti eri fermato.
            </p>
          </div>
        )}

        {/* Calendar download for scheduled simulations */}
        {startDate && (
          <a
            href={`/api/simulations/${id}/calendar`}
            download
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 mb-3 rounded-lg border ${colors.border.light} ${colors.text.secondary} hover:${colors.background.secondary} transition-colors`}
          >
            <CalendarPlus className="w-5 h-5" />
            Aggiungi al Calendario
          </a>
        )}

        <button
          onClick={onStart}
          disabled={isPending}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white ${colors.primary.bg} hover:opacity-90 disabled:opacity-50 text-lg font-medium`}
        >
          {isPending ? (
            <Spinner size="sm" variant="white" />
          ) : (
            <Play className="w-5 h-5" />
          )}
          {hasInProgressAttempt ? 'Riprendi Simulazione' : 'Inizia Simulazione'}
        </button>
      </div>
    </div>
  );
}
