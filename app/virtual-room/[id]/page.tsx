'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import Button from '@/components/ui/Button';
import { 
  Users, 
  Play, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  MessageSquare,
  Wifi,
  WifiOff,
  Send,
  RefreshCw,
  X,
  Zap,
  Shield,
  Activity,
  Radio
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useApiError } from '@/lib/hooks/useApiError';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Participant = any;

interface ParticipantCardProps {
  participant: Participant;
  totalQuestions: number;
  onSendMessage: (participantId: string) => void;
  sessionStatus: string;
}

function ParticipantCard({ participant, totalQuestions, onSendMessage, sessionStatus }: ParticipantCardProps) {
  const progressPercent = totalQuestions > 0 
    ? Math.round(((participant.answeredCount || 0) / totalQuestions) * 100)
    : 0;

  const isCompleted = !!participant.completedAt;
  const isConnected = participant.isConnected;
  const hasStarted = !!participant.startedAt;
  const isReady = participant.isReady;

  return (
    <div className={`relative overflow-hidden rounded-2xl backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] ${
      isCompleted 
        ? 'bg-gradient-to-br from-emerald-500/20 to-green-600/10 border border-emerald-500/30' 
        : isConnected 
          ? 'bg-white/5 border border-white/10 hover:border-white/20' 
          : 'bg-white/[0.02] border border-white/5 opacity-60'
    }`}>
      {/* Glow effect for active participants */}
      {isConnected && !isCompleted && (
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5 animate-pulse" />
      )}
      
      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Connection indicator */}
            <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl ${
              isConnected 
                ? isReady 
                  ? 'bg-gradient-to-br from-green-400 to-emerald-500' 
                  : 'bg-gradient-to-br from-emerald-400 to-green-500' 
                : 'bg-gray-700'
            }`}>
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
                <WifiOff className="w-5 h-5 text-gray-400" />
              )}
            </div>
            
            <div>
              <h3 className="font-semibold text-white text-lg">
                {participant.studentName}
              </h3>
              <p className={`text-sm ${
                isCompleted 
                  ? 'text-emerald-400' 
                  : hasStarted 
                    ? 'text-cyan-400' 
                    : isReady
                      ? 'text-green-400'
                      : isConnected 
                        ? 'text-amber-400'
                        : 'text-gray-500'
              }`}>
                {isCompleted 
                  ? '✓ Completato' 
                  : hasStarted 
                    ? `Domanda ${participant.currentQuestionIndex + 1}/${totalQuestions}`
                    : isReady
                      ? '✓ Pronto'
                      : isConnected 
                        ? 'In attesa'
                        : 'Disconnesso'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Cheating alerts */}
            {participant.cheatingEventsCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-full">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">
                  {participant.cheatingEventsCount}
                </span>
              </div>
            )}

            {/* Unread messages indicator */}
            {participant.hasUnreadMessages && (
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/50" />
            )}

            {/* Message button */}
            <button
              onClick={() => onSendMessage(participant.id)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-gray-400 hover:text-white"
              title="Invia messaggio"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar - shown only during exam */}
        {sessionStatus === 'STARTED' && !isCompleted && hasStarted && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Progresso: {participant.answeredCount}/{totalQuestions} risposte</span>
              <span className="font-mono">{progressPercent}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Result - shown after completion */}
        {participant.result && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Punteggio', value: participant.result.totalScore.toFixed(2), color: 'text-white' },
                { label: 'Corrette', value: participant.result.correctAnswers, color: 'text-emerald-400' },
                { label: 'Errate', value: participant.result.wrongAnswers, color: 'text-red-400' },
                { label: 'Non date', value: participant.result.blankAnswers, color: 'text-gray-400' },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className={`font-bold text-lg ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent cheating events */}
        {participant.recentCheatingEvents?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-red-500/20">
            <p className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Eventi sospetti recenti
            </p>
            <div className="space-y-1.5">
              {participant.recentCheatingEvents.slice(0, 3).map((event: { id: string; eventType: string; createdAt: string }) => (
                <div key={event.id} className="text-xs text-gray-400 flex items-center gap-2 bg-red-500/10 rounded-lg px-2 py-1">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  <span className="flex-1">{event.eventType.replace(/_/g, ' ')}</span>
                  <span className="text-gray-500">
                    {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true, locale: it })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VirtualRoomPage() {
  const params = useParams();
  const router = useRouter();
  const simulationId = params.id as string;
  const { showSuccess } = useToast();
  const { handleMutationError } = useApiError();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showForceStartConfirm, setShowForceStartConfirm] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');

  // Create or get session
  const getOrCreateSession = trpc.virtualRoom.getOrCreateSession.useMutation({
    onSuccess: (data) => {
      setSessionId(data.session.id);
    },
    onError: handleMutationError,
  });

  // Get session state (polling)
  const sessionState = trpc.virtualRoom.getSessionState.useQuery(
    { sessionId: sessionId! },
    { 
      enabled: !!sessionId,
      refetchInterval: 3000,
    }
  );

  // Start session mutation
  const startSession = trpc.virtualRoom.startSession.useMutation({
    onSuccess: () => {
      setShowStartConfirm(false);
      showSuccess('Sessione avviata', 'La simulazione è iniziata per tutti i partecipanti.');
      sessionState.refetch();
    },
    onError: (error) => {
      setShowStartConfirm(false);
      if (error.message.includes('Solo') && error.message.includes('studenti sono connessi')) {
        setShowForceStartConfirm(true);
      } else {
        handleMutationError(error);
      }
    },
  });

  // End session mutation
  const endSession = trpc.virtualRoom.endSession.useMutation({
    onSuccess: () => {
      showSuccess('Sessione terminata', 'La simulazione è stata conclusa.');
      sessionState.refetch();
    },
    onError: handleMutationError,
  });

  // Send message mutation
  const sendMessage = trpc.virtualRoom.sendMessage.useMutation({
    onSuccess: () => {
      showSuccess('Messaggio inviato', 'Il messaggio è stato inviato allo studente.');
      setSelectedParticipantId(null);
      setMessageText('');
      sessionState.refetch();
    },
    onError: handleMutationError,
  });

  // Initialize session on mount
  useEffect(() => {
    if (simulationId && !sessionId) {
      getOrCreateSession.mutate({ simulationId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationId]);

  const handleStartSession = useCallback(() => {
    if (!sessionId) return;
    startSession.mutate({ sessionId, forceStart: false });
  }, [sessionId, startSession]);

  const handleForceStart = useCallback(() => {
    if (!sessionId) return;
    startSession.mutate({ sessionId, forceStart: true });
    setShowForceStartConfirm(false);
  }, [sessionId, startSession]);

  const handleEndSession = useCallback(() => {
    if (!sessionId) return;
    endSession.mutate({ sessionId });
  }, [sessionId, endSession]);

  const handleSendMessage = useCallback(() => {
    if (!selectedParticipantId || !messageText.trim()) return;
    sendMessage.mutate({ participantId: selectedParticipantId, message: messageText.trim() });
  }, [selectedParticipantId, messageText, sendMessage]);

  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (getOrCreateSession.isPending || !sessionState.data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-cyan-500 animate-spin" />
            <Zap className="absolute inset-0 m-auto w-8 h-8 text-cyan-400" />
          </div>
          <p className="mt-6 text-gray-400 text-lg">Inizializzazione Virtual Room...</p>
        </div>
      </div>
    );
  }

  const { session, simulation, participants, invitedStudents, connectedCount, totalInvited, timeRemaining } = sessionState.data;

  // Find not connected invited students
  const connectedStudentIds = new Set(participants.map(p => p.studentId));
  const notConnectedStudents = invitedStudents.filter(s => !connectedStudentIds.has(s.id));

  const allConnected = connectedCount >= totalInvited;
  const completedCount = participants.filter(p => p.completedAt).length;
  const readyCount = participants.filter(p => p.isReady && p.isConnected).length;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 backdrop-blur-xl bg-black/30 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo & Title */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                  <Radio className="w-6 h-6 text-white" />
                </div>
            
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{simulation.title}</h1>
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Virtual Room • Live
                </p>
              </div>
            </div>

            {/* Center: Timer (when started) */}
            {session.status === 'STARTED' && timeRemaining !== null && (
              <div className="absolute left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <span className="text-3xl font-mono font-bold text-white tracking-wider">
                    {formatTimeRemaining(timeRemaining)}
                  </span>
                </div>
              </div>
            )}

            {/* Right: Stats & Close */}
            <div className="flex items-center gap-3">
              {/* Connected counter */}
              <div className="flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-2">
                <Users className="w-5 h-5 text-gray-400" />
                <span className="text-lg font-semibold text-white">{connectedCount}</span>
                <span className="text-gray-500">/</span>
                <span className="text-gray-400">{totalInvited}</span>
              </div>

              {/* Ready counter - only show before session starts */}
              {session.status === 'WAITING' && (
                <div className="flex items-center gap-2 bg-green-500/10 backdrop-blur-xl border border-green-500/30 rounded-xl px-4 py-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-lg font-semibold text-green-400">{readyCount}</span>
                  <span className="text-sm text-green-400/60">pronti</span>
                </div>
              )}

              {/* Live indicator */}
              <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-red-400">LIVE</span>
              </div>

              {/* Close button */}
              <button
                onClick={() => window.close()}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-gray-400 hover:text-white"
                title="Chiudi"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-20 max-w-7xl mx-auto px-6 py-8">
        {/* Status Banner */}
        {session.status === 'WAITING' && (
          <div className={`mb-8 p-6 rounded-2xl backdrop-blur-xl border ${
            allConnected 
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-amber-500/10 border-amber-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  allConnected 
                    ? 'bg-gradient-to-br from-emerald-400 to-green-500'
                    : 'bg-gradient-to-br from-amber-400 to-orange-500'
                }`}>
                  {allConnected ? (
                    <CheckCircle className="w-7 h-7 text-white" />
                  ) : (
                    <AlertTriangle className="w-7 h-7 text-white" />
                  )}
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${allConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {allConnected 
                      ? 'Tutti gli studenti sono connessi!' 
                      : `In attesa di ${totalInvited - connectedCount} studenti`
                    }
                  </h2>
                  <p className="text-gray-400">
                    {allConnected 
                      ? 'Puoi avviare la simulazione quando vuoi.'
                      : 'Puoi comunque avviare la simulazione senza tutti i partecipanti.'
                    }
                  </p>
                </div>
              </div>

              <Button
                onClick={() => {
                  console.log('Button clicked!');
                  console.log('showStartConfirm before:', showStartConfirm);
                  setShowStartConfirm(true);
                  setTimeout(() => {
                    console.log('showStartConfirm after:', showStartConfirm);
                  }, 100);
                }}
                disabled={startSession.isPending}
                className="relative z-10 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white border-0 px-8 py-3 text-lg font-semibold rounded-xl shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 transition-all"
              >
                <Play className="w-5 h-5 mr-2" />
                Avvia Simulazione
              </Button>
            </div>
          </div>
        )}

        {session.status === 'STARTED' && (
          <div className="mb-8 p-6 rounded-2xl backdrop-blur-xl bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                  <Activity className="w-7 h-7 text-white animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-blue-400">
                    Simulazione in corso
                  </h2>
                  <p className="text-gray-400">
                    Completati: {completedCount}/{participants.length} partecipanti
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => sessionState.refetch()}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-gray-400 hover:text-white"
                  title="Aggiorna"
                >
                  <RefreshCw className={`w-5 h-5 ${sessionState.isFetching ? 'animate-spin' : ''}`} />
                </button>
                <Button
                  onClick={handleEndSession}
                  disabled={endSession.isPending}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 hover:border-red-500/50 px-6 py-3 rounded-xl transition-all"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Termina Sessione
                </Button>
              </div>
            </div>
          </div>
        )}

        {session.status === 'COMPLETED' && (
          <div className="mb-8 p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Sessione completata
                  </h2>
                  <p className="text-gray-400">
                    {completedCount} studenti hanno completato la simulazione.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => router.push(`/simulazioni/${simulationId}/classifica`)}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 px-6 py-3 rounded-xl transition-all"
              >
                Vedi Classifica
              </Button>
            </div>
          </div>
        )}

        {/* Not connected students (waiting state) */}
        {session.status === 'WAITING' && notConnectedStudents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <WifiOff className="w-5 h-5 text-gray-500" />
              Studenti non ancora connessi ({notConnectedStudents.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {notConnectedStudents.map(student => (
                <div 
                  key={student.id}
                  className="px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-sm text-gray-400"
                >
                  {student.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Participants Grid */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Partecipanti ({participants.length})
          </h2>
          {participants.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {participants.map(participant => (
                <ParticipantCard
                  key={participant.id}
                  participant={participant}
                  totalQuestions={simulation.totalQuestions}
                  onSendMessage={setSelectedParticipantId}
                  sessionStatus={session.status}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 rounded-2xl bg-white/5 border border-white/10">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Nessun partecipante connesso</p>
              <p className="text-gray-500 text-sm mt-2">Gli studenti appariranno qui quando si connetteranno</p>
            </div>
          )}
        </div>
      </main>

      {/* Start Confirmation Modal - Inline version for popup window compatibility */}
      {showStartConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="bg-gray-800 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <Play className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">Avvia Simulazione</h3>
                <p className="mt-2 text-gray-300">
                  {allConnected 
                    ? "Tutti gli studenti sono connessi. Vuoi avviare la simulazione? Il timer partirà per tutti contemporaneamente."
                    : `Solo ${connectedCount}/${totalInvited} studenti sono connessi. Vuoi avviare comunque? Gli studenti non connessi non potranno partecipare.`
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowStartConfirm(false)}
                disabled={startSession.isPending}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-500 text-white font-medium bg-gray-700 hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleStartSession}
                disabled={startSession.isPending}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {startSession.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Avvio...
                  </span>
                ) : (
                  'Avvia'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Force Start Confirmation - Inline version */}
      {showForceStartConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="bg-gray-800 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">Conferma Avvio Parziale</h3>
                <p className="mt-2 text-gray-300">
                  {`Non tutti gli studenti sono connessi (${connectedCount}/${totalInvited}). Sei sicuro di voler avviare la simulazione? Gli studenti non connessi non potranno partecipare.`}
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForceStartConfirm(false)}
                disabled={startSession.isPending}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-500 text-white font-medium bg-gray-700 hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleForceStart}
                disabled={startSession.isPending}
                className="flex-1 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {startSession.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Avvio...
                  </span>
                ) : (
                  'Avvia Comunque'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {selectedParticipantId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Invia Messaggio</h3>
                  <p className="text-sm text-gray-400">
                    {participants.find(p => p.id === selectedParticipantId)?.studentName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedParticipantId(null);
                  setMessageText('');
                }}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Scrivi il messaggio..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 resize-none h-32"
                autoFocus
              />
            </div>
            <div className="p-5 pt-0 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedParticipantId(null);
                  setMessageText('');
                }}
                className="text-gray-400 hover:text-white"
              >
                Annulla
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || sendMessage.isPending}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 px-6"
              >
                <Send className="w-4 h-4 mr-2" />
                Invia
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
