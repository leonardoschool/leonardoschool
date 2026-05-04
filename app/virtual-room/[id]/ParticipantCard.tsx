'use client';

import { colors } from '@/lib/theme/colors';
import {
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Wifi,
  WifiOff,
  Shield,
  Ban,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

const CHEATING_EVENT_LABELS: Record<string, string> = {
  TAB_CHANGE: 'Cambio scheda/finestra',
  WINDOW_BLUR: 'Finestra in background',
  FULLSCREEN_EXIT: 'Uscita dal fullscreen',
  PAGE_RELOAD: 'Tentativo di ricaricamento pagina',
  COPY_ATTEMPT: 'Tentativo di copia',
  PASTE_ATTEMPT: 'Tentativo di incolla',
  RIGHT_CLICK: 'Click destro',
  DEVTOOLS_OPEN: 'Strumenti sviluppatore aperti',
  SCREENSHOT_ATTEMPT: 'Tentativo di screenshot',
  KEYBOARD_SHORTCUT: 'Scorciatoia da tastiera bloccata',
  MULTIPLE_MONITORS: 'Monitor multipli rilevati',
  DISCONNECTION: 'Disconnessione sospetta',
  OTHER: 'Altro evento sospetto',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any, sonarjs/redundant-type-aliases
type Participant = any;

export interface ParticipantCardProps {
  participant: Participant;
  totalQuestions: number;
  onSendMessage: (participantId: string) => void;
  onKickParticipant: (participantId: string, studentName: string) => void;
  sessionStatus: string;
}

export function ParticipantCard({
  participant,
  totalQuestions,
  onSendMessage,
  onKickParticipant,
  sessionStatus,
}: ParticipantCardProps) {
  const progressPercent =
    totalQuestions > 0 ? Math.round(((participant.answeredCount || 0) / totalQuestions) * 100) : 0;

  const isCompleted = !!participant.completedAt;
  const isConnected = participant.isConnected;
  const hasStarted = !!participant.startedAt;
  const isReady = participant.isReady;
  const isKicked = participant.isKicked;

  if (isKicked) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-500/40 opacity-75">
        <div className="relative p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20">
              <Ban className="w-5 h-5 text-red-500 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-red-700 dark:text-red-300 text-lg line-through">
                {participant.studentName}
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400">✕ Espulso</p>
            </div>
          </div>
          {participant.kickedReason && (
            <p className="mt-3 text-xs text-red-500/70 dark:text-red-400/70 italic">
              Motivo: {participant.kickedReason}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] shadow-lg ${
        isCompleted
          ? 'bg-gradient-to-br from-emerald-100 to-green-50 dark:from-emerald-500/30 dark:to-green-600/20 border-2 border-emerald-400 dark:border-emerald-400/50 shadow-emerald-200 dark:shadow-emerald-500/20'
          : isConnected
            ? `${colors.background.card} border-2 ${participant.unreadMessagesCount > 0 ? 'border-blue-500 dark:border-blue-400 animate-[shake_0.5s_ease-in-out_infinite] shadow-blue-300 dark:shadow-blue-500/30' : 'border-cyan-400 dark:border-cyan-400/40 hover:border-cyan-500 dark:hover:border-cyan-400/60 shadow-cyan-100 dark:shadow-cyan-500/10'}`
            : `${colors.background.secondary} border-2 border-gray-300 dark:border-slate-600/30 opacity-60`
      }`}
    >
      {isConnected && !isCompleted && (
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 dark:from-cyan-400/10 via-purple-500/5 dark:via-purple-500/10 to-cyan-400/5 dark:to-cyan-400/10 animate-pulse" />
      )}

      <div className="relative p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`relative flex items-center justify-center w-10 h-10 rounded-xl ${
                isConnected
                  ? isReady
                    ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                    : 'bg-gradient-to-br from-emerald-400 to-green-500'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              {isConnected ? (
                <>
                  {isReady ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <Wifi className="w-5 h-5 text-white" />
                  )}
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full" />
                </>
              ) : (
                <WifiOff className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              )}
            </div>

            <div>
              <h3 className={`font-semibold text-lg ${colors.text.primary}`}>{participant.studentName}</h3>
              <p
                className={`text-sm ${
                  isCompleted
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : hasStarted
                      ? 'text-cyan-600 dark:text-cyan-400'
                      : isReady
                        ? 'text-green-600 dark:text-green-400'
                        : isConnected
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-gray-500'
                }`}
              >
                {isCompleted
                  ? '✓ Completato'
                  : hasStarted
                    ? 'In corso...'
                    : isReady
                      ? '✓ Pronto'
                      : isConnected
                        ? 'In attesa'
                        : 'Disconnesso'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {participant.cheatingEventsCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-500/30 border-2 border-red-400 dark:border-red-500/60 rounded-full shadow-lg shadow-red-200 dark:shadow-red-500/20">
                <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-300" />
                <span className="text-sm font-bold text-red-600 dark:text-red-200">
                  {participant.cheatingEventsCount}
                </span>
              </div>
            )}

            <button
              onClick={() => onSendMessage(participant.id)}
              className={`p-2 rounded-xl relative ${
                participant.unreadMessagesCount > 0
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-lg shadow-blue-500/30 animate-pulse'
                  : `${colors.background.hover} border ${colors.border.light} hover:border-gray-400 dark:hover:border-white/20 ${colors.text.muted} hover:${colors.text.primary}`
              } transition-all`}
              title={
                participant.unreadMessagesCount > 0
                  ? `${participant.unreadMessagesCount} nuovi messaggi`
                  : 'Messaggi'
              }
            >
              <MessageSquare className="w-4 h-4" />
              {participant.unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 items-center justify-center">
                    <span className="text-[9px] font-bold text-white">{participant.unreadMessagesCount}</span>
                  </span>
                </span>
              )}
            </button>

            {!isCompleted && (
              <button
                onClick={() => onKickParticipant(participant.id, participant.studentName)}
                className="p-2 rounded-xl bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-300 dark:border-red-500/20 hover:border-red-400 dark:hover:border-red-500/40 transition-all text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                title="Espelli studente"
              >
                <Ban className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {sessionStatus === 'STARTED' && !isCompleted && hasStarted && (
          <div
            className={`mt-4 p-3 ${colors.background.secondary} rounded-xl border border-cyan-300 dark:border-cyan-500/20`}
          >
            <div className="flex justify-between text-xs font-medium mb-2">
              <span className="text-cyan-700 dark:text-cyan-300">
                Progresso: {participant.answeredCount}/{totalQuestions} risposte
              </span>
              <span className="font-mono text-cyan-600 dark:text-cyan-200 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700/50 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-500 ease-out shadow-lg shadow-cyan-500/50"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {participant.result && (
          <div className={`mt-4 pt-4 border-t ${colors.border.light}`}>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Punteggio', value: participant.result.totalScore.toFixed(2), color: colors.text.primary },
                {
                  label: 'Corrette',
                  value: participant.result.correctAnswers,
                  color: 'text-emerald-600 dark:text-emerald-400',
                },
                {
                  label: 'Errate',
                  value: participant.result.wrongAnswers,
                  color: 'text-red-600 dark:text-red-400',
                },
                { label: 'Non date', value: participant.result.blankAnswers, color: colors.text.muted },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <p className={`text-xs ${colors.text.muted} mb-1`}>{item.label}</p>
                  <p className={`font-bold text-lg ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {participant.recentCheatingEvents?.length > 0 && (
          <div className="mt-4 pt-4 border-t-2 border-red-300 dark:border-red-500/30">
            <p className="text-xs font-semibold text-red-600 dark:text-red-300 mb-3 flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              Eventi sospetti recenti
            </p>
            <div className="space-y-2">
              {participant.recentCheatingEvents
                .slice(0, 3)
                .map(
                  (event: { id: string; eventType: string; description?: string | null; createdAt: string }) => (
                    <div
                      key={event.id}
                      className="text-xs text-red-700 dark:text-red-100 flex items-start gap-2 bg-red-50 dark:bg-red-500/20 border border-red-300 dark:border-red-500/40 rounded-lg px-3 py-2 shadow-lg shadow-red-100 dark:shadow-red-500/10"
                    >
                      <span className="w-2 h-2 mt-0.5 shrink-0 bg-red-500 dark:bg-red-400 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
                      <span className="flex-1 min-w-0">
                        <span className="font-semibold block">
                          {CHEATING_EVENT_LABELS[event.eventType] ?? event.eventType.replace(/_/g, ' ')}
                        </span>
                        {event.description && (
                          <span className="text-red-600/80 dark:text-red-300/80 font-normal">
                            {event.description}
                          </span>
                        )}
                      </span>
                      <span className={`${colors.text.muted} text-[10px] shrink-0`}>
                        {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true, locale: it })}
                      </span>
                    </div>
                  )
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
