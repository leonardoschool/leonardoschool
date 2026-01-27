'use client';

import Link from 'next/link';
import { colors } from '@/lib/theme/colors';
import { PageLoader, Spinner } from '@/components/ui/loaders';
import {
  ArrowLeft,
  AlertCircle,
  ShieldAlert,
  EyeOff,
  Maximize,
} from 'lucide-react';

/**
 * Loading state for simulation
 */
export function SimulationLoadingState() {
  return <PageLoader />;
}

/**
 * Kicked state - shown when student is expelled from Virtual Room session
 */
export function SimulationKickedState({ reason }: { reason: string | null }) {
  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500/30 flex items-center justify-center mx-auto mb-8">
          <ShieldAlert className="w-12 h-12 text-red-500" />
        </div>
        
        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-4">
          Sessione Terminata
        </h1>
        
        {/* Status message */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
          <p className="text-red-400 font-semibold text-lg">
            Sei stato espulso dalla sessione
          </p>
        </div>
        
        {/* Reason */}
        <p className="text-gray-300 text-base mb-10 px-4">
          {reason || 'La tua partecipazione a questa simulazione è stata terminata dall\'amministratore.'}
        </p>
        
        {/* Back button */}
        <Link
          href="/simulazioni"
          className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 hover:bg-gray-100 rounded-xl font-medium transition-colors shadow-lg"
        >
          <ArrowLeft className="w-5 h-5" />
          Torna alle simulazioni
        </Link>
      </div>
    </div>
  );
}

/**
 * Error state - shown when simulation fails to load
 */
export function SimulationErrorState({ errorMessage }: { errorMessage?: string }) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className={`text-center py-12 ${colors.background.card} rounded-xl border ${colors.border.light}`}>
        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-3" />
        <p className={`font-medium ${colors.text.primary}`}>
          {errorMessage || 'Simulazione non disponibile'}
        </p>
        <Link
          href="/simulazioni"
          className={`inline-flex items-center gap-2 mt-4 ${colors.primary.text}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alle simulazioni
        </Link>
      </div>
    </div>
  );
}

/**
 * Missing assignment ID for Virtual Room
 */
export function SimulationMissingAssignmentState() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className={`text-center py-12 ${colors.background.card} rounded-xl border ${colors.border.light}`}>
        <p className={colors.text.secondary}>Errore: manca l&apos;ID dell&apos;assegnazione per la Virtual Room.</p>
      </div>
    </div>
  );
}

/**
 * Anti-cheat warning overlay
 */
interface AntiCheatWarningOverlayProps {
  readonly isBlurred: boolean;
  readonly isFullscreen: boolean;
  readonly requireFullscreen: boolean;
  readonly onRequestFullscreen: () => void;
  readonly violationCount?: number;
}

export function AntiCheatWarningOverlay({ 
  isBlurred, 
  isFullscreen, 
  requireFullscreen,
  onRequestFullscreen,
  violationCount,
}: AntiCheatWarningOverlayProps) {
  // Don't show if no issues
  if (!isBlurred && (!requireFullscreen || isFullscreen)) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className={`max-w-md p-8 rounded-2xl ${colors.background.card} text-center`}>
        <EyeOff className="w-16 h-16 mx-auto text-orange-500 mb-4" />
        <h2 className={`text-xl font-bold ${colors.text.primary} mb-3`}>
          {isBlurred ? 'Torna alla simulazione!' : 'Schermo intero richiesto'}
        </h2>
        <p className={`${colors.text.secondary} mb-6`}>
          {isBlurred 
            ? 'Hai lasciato la finestra della simulazione. Questo evento è stato registrato.' 
            : 'Questa simulazione richiede la modalità schermo intero. Clicca il pulsante per continuare.'}
        </p>
        {requireFullscreen && !isFullscreen && (
          <button
            onClick={onRequestFullscreen}
            className={`flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg text-white ${colors.primary.bg} hover:opacity-90`}
          >
            <Maximize className="w-5 h-5" />
            Attiva schermo intero
          </button>
        )}
        {violationCount !== undefined && (
          <p className={`mt-4 text-sm ${colors.text.muted}`}>
            Violazioni: {violationCount}/10
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Loading button with spinner
 */
interface StartSimulationButtonProps {
  readonly onClick: () => void;
  readonly isLoading: boolean;
  readonly hasInProgressAttempt: boolean;
}

export function StartSimulationButton({
  onClick,
  isLoading,
  hasInProgressAttempt,
}: StartSimulationButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl ${colors.primary.gradient} text-white font-medium disabled:opacity-50`}
    >
      {isLoading ? <Spinner size="sm" variant="white" /> : null}
      {hasInProgressAttempt ? 'Riprendi Simulazione' : 'Inizia Simulazione'}
    </button>
  );
}
