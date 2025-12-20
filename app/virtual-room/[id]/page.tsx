'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
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
  Radio,
  Ban
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useApiError } from '@/lib/hooks/useApiError';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVirtualRoomSSE, VirtualRoomData } from '@/lib/hooks/useVirtualRoomSSE';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Participant = any;

interface ParticipantCardProps {
  participant: Participant;
  totalQuestions: number;
  onSendMessage: (participantId: string) => void;
  onKickParticipant: (participantId: string, studentName: string) => void;
  sessionStatus: string;
}

function ParticipantCard({ participant, totalQuestions, onSendMessage, onKickParticipant, sessionStatus }: ParticipantCardProps) {
  const progressPercent = totalQuestions > 0 
    ? Math.round(((participant.answeredCount || 0) / totalQuestions) * 100)
    : 0;

  const isCompleted = !!participant.completedAt;
  const isConnected = participant.isConnected;
  const hasStarted = !!participant.startedAt;
  const isReady = participant.isReady;
  const isKicked = participant.isKicked;

  // Se espulso, mostra uno stato speciale
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
              <p className="text-sm text-red-600 dark:text-red-400">
                ✕ Espulso
              </p>
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
    <div className={`relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] shadow-lg ${
      isCompleted 
        ? 'bg-gradient-to-br from-emerald-100 to-green-50 dark:from-emerald-500/30 dark:to-green-600/20 border-2 border-emerald-400 dark:border-emerald-400/50 shadow-emerald-200 dark:shadow-emerald-500/20' 
        : isConnected 
          ? `${colors.background.card} border-2 ${participant.unreadMessagesCount > 0 ? 'border-blue-500 dark:border-blue-400 animate-[shake_0.5s_ease-in-out_infinite] shadow-blue-300 dark:shadow-blue-500/30' : 'border-cyan-400 dark:border-cyan-400/40 hover:border-cyan-500 dark:hover:border-cyan-400/60 shadow-cyan-100 dark:shadow-cyan-500/10'}` 
          : `${colors.background.secondary} border-2 border-gray-300 dark:border-slate-600/30 opacity-60`
    }`}>
      {/* Glow effect for active participants */}
      {isConnected && !isCompleted && (
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 dark:from-cyan-400/10 via-purple-500/5 dark:via-purple-500/10 to-cyan-400/5 dark:to-cyan-400/10 animate-pulse" />
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
                : 'bg-gray-200 dark:bg-gray-700'
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
                <WifiOff className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              )}
            </div>
            
            <div>
              <h3 className={`font-semibold text-lg ${colors.text.primary}`}>
                {participant.studentName}
              </h3>
              <p className={`text-sm ${
                isCompleted 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : hasStarted 
                    ? 'text-cyan-600 dark:text-cyan-400' 
                    : isReady
                      ? 'text-green-600 dark:text-green-400'
                      : isConnected 
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-500'
              }`}>
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
            {/* Cheating alerts */}
            {participant.cheatingEventsCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-500/30 border-2 border-red-400 dark:border-red-500/60 rounded-full shadow-lg shadow-red-200 dark:shadow-red-500/20">
                <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-300" />
                <span className="text-sm font-bold text-red-600 dark:text-red-200">
                  {participant.cheatingEventsCount}
                </span>
              </div>
            )}

            {/* Chat button with unread indicator */}
            <button
              onClick={() => onSendMessage(participant.id)}
              className={`p-2 rounded-xl relative ${
                participant.unreadMessagesCount > 0
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-lg shadow-blue-500/30 animate-pulse'
                  : `${colors.background.hover} border ${colors.border.light} hover:border-gray-400 dark:hover:border-white/20 ${colors.text.muted} hover:${colors.text.primary}`
              } transition-all`}
              title={participant.unreadMessagesCount > 0 ? `${participant.unreadMessagesCount} nuovi messaggi` : 'Messaggi'}
            >
              <MessageSquare className="w-4 h-4" />
              {participant.unreadMessagesCount > 0 && (
                <>
                  {/* Red dot badge */}
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 items-center justify-center">
                      <span className="text-[9px] font-bold text-white">{participant.unreadMessagesCount}</span>
                    </span>
                  </span>
                </>
              )}
            </button>

            {/* Kick button */}
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

        {/* Progress bar - shown only during exam */}
        {sessionStatus === 'STARTED' && !isCompleted && hasStarted && (
          <div className={`mt-4 p-3 ${colors.background.secondary} rounded-xl border border-cyan-300 dark:border-cyan-500/20`}>
            <div className="flex justify-between text-xs font-medium mb-2">
              <span className="text-cyan-700 dark:text-cyan-300">Progresso: {participant.answeredCount}/{totalQuestions} risposte</span>
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

        {/* Result - shown after completion */}
        {participant.result && (
          <div className={`mt-4 pt-4 border-t ${colors.border.light}`}>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Punteggio', value: participant.result.totalScore.toFixed(2), color: colors.text.primary },
                { label: 'Corrette', value: participant.result.correctAnswers, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Errate', value: participant.result.wrongAnswers, color: 'text-red-600 dark:text-red-400' },
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

        {/* Recent cheating events */}
        {participant.recentCheatingEvents?.length > 0 && (
          <div className="mt-4 pt-4 border-t-2 border-red-300 dark:border-red-500/30">
            <p className="text-xs font-semibold text-red-600 dark:text-red-300 mb-3 flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              Eventi sospetti recenti
            </p>
            <div className="space-y-2">
              {participant.recentCheatingEvents.slice(0, 3).map((event: { id: string; eventType: string; createdAt: string }) => (
                <div key={event.id} className="text-xs text-red-700 dark:text-red-100 flex items-center gap-2 bg-red-50 dark:bg-red-500/20 border border-red-300 dark:border-red-500/40 rounded-lg px-3 py-2 shadow-lg shadow-red-100 dark:shadow-red-500/10">
                  <span className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
                  <span className="flex-1 font-medium">{event.eventType.replace(/_/g, ' ')}</span>
                  <span className={`${colors.text.muted} text-[10px]`}>
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
  const assignmentId = params.id as string; // The URL param is now assignmentId
  const { showSuccess } = useToast();
  const { handleMutationError } = useApiError();
  const { user } = useAuth();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showForceStartConfirm, setShowForceStartConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [kickConfirm, setKickConfirm] = useState<{ id: string; name: string } | null>(null);

  const isStudent = user?.role === 'STUDENT';
  const isStaff = user?.role === 'ADMIN' || user?.role === 'COLLABORATOR';

  // Student states
  const [participantId, setParticipantId] = useState<string | null>(null);
  
  // Track previous unread message counts to detect new messages
  const [previousUnreadCounts, setPreviousUnreadCounts] = useState<Record<string, number>>({});

  // Create or get session (Staff only) - now uses assignmentId
  const getOrCreateSession = trpc.virtualRoom.getOrCreateSession.useMutation({
    onSuccess: (data) => {
      setSessionId(data.session.id);
    },
    onError: handleMutationError,
  });

  // Student join session - now uses assignmentId
  const joinSession = trpc.virtualRoom.joinSession.useMutation({
    onSuccess: (data) => {
      setParticipantId(data.participantId);
      setSessionId(data.sessionId);
    },
    onError: handleMutationError,
  });

  // Student heartbeat
  const heartbeat = trpc.virtualRoom.heartbeat.useMutation();

  // Student set ready
  const setReady = trpc.virtualRoom.setReady.useMutation({
    onSuccess: () => {
      showSuccess('Pronto!', 'Hai confermato di essere pronto per iniziare.');
    },
    onError: handleMutationError,
  });

  // SSE connection for real-time updates - Staff only
  const [sseData, setSseData] = useState<VirtualRoomData | null>(null);
  
  // Memoize callback to prevent reconnections
  const handleSSEMessage = useCallback((data: VirtualRoomData) => {
    setSseData(data);
  }, []);
  
  const { isConnected: _sseConnected, reconnect: sseReconnect } = useVirtualRoomSSE({
    sessionId: sessionId,
    participantId: selectedParticipantId, // Include messages for selected participant
    enabled: !!sessionId && isStaff,
    onMessage: handleSSEMessage,
  });

  // Transform SSE data to match the old sessionState format for compatibility
  const sessionState = useMemo(() => {
    if (!sseData) return { data: null, isLoading: false, refetch: sseReconnect };
    return {
      data: {
        session: sseData.session,
        simulation: sseData.simulation,
        participants: sseData.participants,
        invitedStudents: sseData.invitedStudents,
        connectedCount: sseData.connectedCount,
        totalInvited: sseData.totalInvited,
        timeRemaining: sseData.timeRemaining,
      },
      isLoading: false,
      refetch: sseReconnect,
    };
  }, [sseData, sseReconnect]);

  // Get student session status (polling) - Student only - now uses assignmentId
  const studentStatus = trpc.virtualRoom.getStudentSessionStatus.useQuery(
    { assignmentId },
    {
      enabled: isStudent,
      refetchInterval: 1000, // Poll every 1 second for students
      staleTime: 800,
    }
  );

  // Sync student status data and handle session start
  useEffect(() => {
    const data = studentStatus.data;
    if (!data?.hasSession) return;
    
    // Check if kicked (use 'in' operator for type narrowing)
    if ('isKicked' in data && data.isKicked) {
      console.log('[Student] Kicked from session:', 'kickedReason' in data ? data.kickedReason : '');
      // Redirect to simulations with error message
      router.push(`/simulazioni?kicked=true`);
      return;
    }
    
    // Normal session handling
    if ('sessionId' in data && 'participantId' in data) {
      console.log('[Student] Session status update:', {
        sessionId: data.sessionId,
        status: data.status,
        participantId: data.participantId,
        isConnected: 'isConnected' in data ? data.isConnected : false,
      });
      setSessionId(data.sessionId ?? null);
      setParticipantId(data.participantId ?? null);

      // When session starts, redirect to test page
      if (data.status === 'STARTED' && isStudent && data.simulationId) {
        console.log('[Student] Session STARTED - Redirecting to test page');
        setTimeout(() => {
          router.push(`/simulazioni/${data.simulationId}?assignmentId=${assignmentId}`);
        }, 1500); // Small delay to show "La simulazione è iniziata!" message
      }

      // When session is completed/ended, redirect back to simulations
      if (data.status === 'COMPLETED' && isStudent) {
        console.log('[Student] Session COMPLETED - Redirecting to simulations');
        router.push('/simulazioni?sessionEnded=true');
      }
    }
  }, [studentStatus.data, isStudent, router, assignmentId]);

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
      showSuccess('Sessione terminata', 'La simulazione è stata conclusa. Tutti i partecipanti sono stati disconnessi.');
      // Redirect staff to simulations page after a brief delay
      setTimeout(() => {
        router.push('/simulazioni');
      }, 1500);
    },
    onError: handleMutationError,
  });

  // Send message mutation
  const sendMessage = trpc.virtualRoom.sendMessage.useMutation({
    onSuccess: () => {
      setMessageText('');
      // SSE will automatically receive the updated messages
    },
    onError: handleMutationError,
  });

  // Messages come from SSE data now - no need for separate polling
  const messagesFromSSE = useMemo(() => {
    return sseData?.messages || [];
  }, [sseData?.messages]);

  // Mark messages as read
  const markMessagesRead = trpc.virtualRoom.markMessagesRead.useMutation();

  // Mark messages as read when opening chat
  useEffect(() => {
    if (selectedParticipantId && messagesFromSSE.length > 0) {
      const unreadIds = messagesFromSSE
        .filter(m => !m.isRead && m.senderType === 'STUDENT')
        .map(m => m.id);
      if (unreadIds.length > 0) {
        markMessagesRead.mutate({ participantId: selectedParticipantId, messageIds: unreadIds });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParticipantId, messagesFromSSE]);

  // Kick participant mutation
  const kickParticipant = trpc.virtualRoom.kickParticipant.useMutation({
    onSuccess: (data) => {
      showSuccess('Studente espulso', data.message);
      setKickConfirm(null);
      sessionState.refetch();
    },
    onError: handleMutationError,
  });

  // Handler for kick button
  const handleKickParticipant = useCallback((participantId: string, studentName: string) => {
    setKickConfirm({ id: participantId, name: studentName });
  }, []);

  // Play notification sound when new messages arrive (Staff only)
  useEffect(() => {
    if (!isStaff || !sessionState.data?.participants) return;

    const currentCounts: Record<string, number> = {};
    let hasNewMessages = false;

    sessionState.data.participants.forEach((p: { id: string; unreadMessagesCount: number }) => {
      currentCounts[p.id] = p.unreadMessagesCount;
      
      // Check if this participant has more unread messages than before
      if (previousUnreadCounts[p.id] !== undefined && p.unreadMessagesCount > previousUnreadCounts[p.id]) {
        hasNewMessages = true;
      }
    });

    // Play sound if there are new messages
    if (hasNewMessages) {
      // Try to play MP3 file first, fallback to Web Audio API
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Fallback: Generate a pleasant notification sound using Web Audio API
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioContext = new AudioContextClass();
          
          // First beep (higher pitch)
          const oscillator1 = audioContext.createOscillator();
          const gainNode1 = audioContext.createGain();
          oscillator1.connect(gainNode1);
          gainNode1.connect(audioContext.destination);
          oscillator1.frequency.value = 800;
          oscillator1.type = 'sine';
          gainNode1.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator1.start(audioContext.currentTime);
          oscillator1.stop(audioContext.currentTime + 0.1);
          
          // Second beep (slightly lower pitch, delayed)
          const oscillator2 = audioContext.createOscillator();
          const gainNode2 = audioContext.createGain();
          oscillator2.connect(gainNode2);
          gainNode2.connect(audioContext.destination);
          oscillator2.frequency.value = 600;
          oscillator2.type = 'sine';
          gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime + 0.1);
          gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          oscillator2.start(audioContext.currentTime + 0.1);
          oscillator2.stop(audioContext.currentTime + 0.2);
        } catch (_error) {
          // Silently fail if Web Audio API is not supported
          console.log('Unable to play notification sound');
        }
      });
    }

    // Update the previous counts
    setPreviousUnreadCounts(currentCounts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState.data?.participants, isStaff]);

  // Initialize session on mount
  useEffect(() => {
    if (!user) return;
    
    if (isStaff && assignmentId && !sessionId) {
      getOrCreateSession.mutate({ assignmentId });
    }
    
    if (isStudent && assignmentId && !participantId) {
      joinSession.mutate({ assignmentId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId, user, isStaff, isStudent]);

  // Student heartbeat
  useEffect(() => {
    if (!isStudent || !participantId) return;

    const interval = setInterval(() => {
      heartbeat.mutate({ participantId });
    }, 10000); // Every 10 seconds

    // Send heartbeat on unmount/close
    return () => {
      clearInterval(interval);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`/api/trpc/virtualRoom.heartbeat`, JSON.stringify({ participantId }));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudent, participantId]);

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

  // Loading states
  if (!user || (isStaff && (getOrCreateSession.isPending || !sessionState.data)) || (isStudent && (joinSession.isPending || !studentStatus.data))) {
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

  // === STUDENT VIEW ===
  if (isStudent) {
    // Show loading if still fetching
    if (studentStatus.isLoading || !studentStatus.data) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-cyan-500 animate-spin" />
              <Zap className="absolute inset-0 m-auto w-8 h-8 text-cyan-400" />
            </div>
            <p className="mt-6 text-gray-400 text-lg">Connessione in corso...</p>
          </div>
        </div>
      );
    }

    // No session found
    if (!studentStatus.data.hasSession) {
      return (
        <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            {/* Icon */}
            <div className="w-24 h-24 rounded-full bg-orange-500/20 border-2 border-orange-500/30 flex items-center justify-center mx-auto mb-8">
              <XCircle className="w-12 h-12 text-orange-500" />
            </div>
            
            {/* Title */}
            <h2 className="text-3xl font-bold text-white mb-4">
              Sessione non trovata
            </h2>
            
            {/* Message */}
            <p className="text-gray-300 text-base mb-10 px-4">
              Non c&apos;è una sessione attiva per questa simulazione. Contatta il tuo docente o attendi che la sessione venga aperta.
            </p>
            
            {/* Back button */}
            <Button 
              onClick={() => router.back()}
              className="px-8 py-4 bg-white text-gray-900 hover:bg-gray-100 rounded-xl font-medium shadow-lg"
            >
              Torna indietro
            </Button>
          </div>
        </div>
      );
    }

    // Check if kicked (use 'in' operator for type narrowing)
    if ('isKicked' in studentStatus.data && studentStatus.data.isKicked) {
      const kickedReason = 'kickedReason' in studentStatus.data 
        ? (studentStatus.data.kickedReason as string) 
        : 'Sei stato espulso dalla sessione';
      return (
        <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            {/* Icon */}
            <div className="w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500/30 flex items-center justify-center mx-auto mb-8">
              <Shield className="w-12 h-12 text-red-500" />
            </div>
            
            {/* Title */}
            <h2 className="text-3xl font-bold text-white mb-4">
              Sessione Terminata
            </h2>
            
            {/* Status message */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <p className="text-red-400 font-semibold text-lg">
                Sei stato espulso dalla sessione
              </p>
            </div>
            
            {/* Reason */}
            <p className="text-gray-300 text-base mb-10 px-4">
              {kickedReason}
            </p>
            
            {/* Back button */}
            <Button 
              onClick={() => router.push('/simulazioni')}
              className="px-8 py-4 bg-white text-gray-900 hover:bg-gray-100 rounded-xl font-medium shadow-lg"
            >
              Torna alle simulazioni
            </Button>
          </div>
        </div>
      );
    }

    // Session found - type guard for non-kicked sessions
    if (!('simulation' in studentStatus.data) || !studentStatus.data.simulation) {
      return null;
    }

    const { status, simulation: simInfo, waitingMessage } = studentStatus.data;
    
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
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                  <Radio className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{simInfo?.title || 'TOLC-MED 2025'}</h1>
                  <p className="text-sm text-gray-400 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Virtual Room • Live
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.back()}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="max-w-2xl w-full mx-auto px-6">
            {status === 'WAITING' ? (
              // Waiting Room
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-center shadow-2xl">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-6">
                  <Wifi className="w-12 h-12 text-white" />
                </div>
                
                <h2 className="text-3xl font-bold text-white mb-3">Sei connesso alla stanza</h2>
                <p className="text-gray-400 text-lg mb-8">
                  {waitingMessage || 'Attendi che l\'esaminatore avvii la simulazione'}
                </p>

                {/* Details */}
                <div className="grid grid-cols-1 gap-4 mb-8">
                  <div className="bg-purple-900/30 border border-purple-500/30 rounded-2xl p-5">
                    <div className="flex items-center justify-center gap-3">
                      <Clock className="w-6 h-6 text-purple-400" />
                      <div>
                        <p className="text-sm text-purple-300">Durata</p>
                        <p className="text-xl font-bold text-white">{simInfo?.durationMinutes} minuti</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-900/30 border border-green-500/30 rounded-2xl p-5">
                    <div className="flex items-center justify-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                      <div>
                        <p className="text-sm text-green-300">Stato</p>
                        <p className="text-xl font-bold text-white">Pronto per iniziare</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ready Button */}
                {participantId && (
                  <Button
                    onClick={() => setReady.mutate({ participantId })}
                    disabled={setReady.isPending}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-xl text-lg"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Sono pronto
                  </Button>
                )}

                {/* Tips */}
                <div className="mt-8 bg-cyan-900/20 border border-cyan-500/20 rounded-2xl p-6">
                  <h3 className="flex items-center gap-2 text-cyan-400 font-semibold mb-3">
                    <Zap className="w-5 h-5" />
                    Suggerimenti
                  </h3>
                  <ul className="text-sm text-gray-300 space-y-2 text-left">
                    <li>• Assicurati di avere una connessione stabile</li>
                    <li>• Non chiudere questa finestra</li>
                    <li>• Il test inizierà automaticamente</li>
                    <li>• Il timer partirà per tutti contemporaneamente</li>
                  </ul>
                </div>

                {/* Waiting dots */}
                <div className="mt-8 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="ml-3 text-gray-400">In attesa dell&apos;avvio...</span>
                </div>
              </div>
            ) : status === 'STARTED' ? (
              // Session Started - Redirect to normal test interface
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-center shadow-2xl">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <Activity className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">La simulazione è iniziata!</h2>
                <p className="text-gray-400 text-lg mb-6">
                  Verrai reindirizzato all&apos;interfaccia del test...
                </p>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            ) : (
              // Session Completed
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-center shadow-2xl">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">Simulazione completata</h2>
                <p className="text-gray-400 text-lg mb-8">
                  Grazie per aver partecipato!
                </p>
                <Button
                  onClick={() => router.push('/simulazioni')}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                >
                  Torna alle simulazioni
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // === STAFF VIEW ===
  if (!sessionState.data) {
    return null;
  }

  const { session, simulation, participants, invitedStudents, connectedCount, totalInvited, timeRemaining } = sessionState.data;

  // Find not connected invited students
  const connectedStudentIds = new Set(participants.map(p => p.studentId));
  const notConnectedStudents = invitedStudents.filter(s => !connectedStudentIds.has(s.id));

  const allConnected = connectedCount >= totalInvited;
  const completedCount = participants.filter(p => p.completedAt).length;
  const readyCount = participants.filter(p => p.isReady && p.isConnected).length;

  return (
    <div className={`min-h-screen relative overflow-hidden ${colors.background.primary}`}>
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/5 dark:bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className={`relative z-10 ${colors.background.card} border-b ${colors.border.primary} shadow-sm`}>
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
                <h1 className={`text-xl font-bold ${colors.text.primary}`}>{simulation.title}</h1>
                <p className={`text-sm ${colors.text.muted} flex items-center gap-2`}>
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Virtual Room • Live
                </p>
              </div>
            </div>

            {/* Center: Timer & Stats (when started) */}
            {session.status === 'STARTED' && timeRemaining !== null && (
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
                {/* Timer (cyan/blue) */}
                <div className={`flex items-center gap-3 ${colors.background.card} shadow-lg border border-cyan-400 dark:border-cyan-500/40 rounded-2xl px-6 py-3`}>
                  <Clock className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  <span className={`text-3xl font-mono font-bold ${colors.text.primary} tracking-wider`}>
                    {formatTimeRemaining(timeRemaining)}
                  </span>
                </div>
              </div>
            )}

            {/* Right: Stats & Close */}
            <div className="flex items-center gap-3">
              {/* Connected counter */}
              <div className={`flex items-center gap-2 ${colors.background.secondary} border ${colors.border.primary} rounded-xl px-4 py-2`}>
                <Users className={`w-5 h-5 ${colors.text.muted}`} />
                <span className={`text-lg font-semibold ${colors.text.primary}`}>{connectedCount}</span>
                <span className={colors.text.muted}>/</span>
                <span className={colors.text.muted}>{totalInvited}</span>
              </div>

              {/* Ready counter - only show before session starts */}
              {session.status === 'WAITING' && (
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-500/10 border border-green-400 dark:border-green-500/30 rounded-xl px-4 py-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-lg font-semibold text-green-600 dark:text-green-400">{readyCount}</span>
                  <span className="text-sm text-green-500 dark:text-green-400/60">pronti</span>
                </div>
              )}

              {/* Live indicator */}
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-500/20 border border-red-400 dark:border-red-500/30 rounded-xl px-4 py-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">LIVE</span>
              </div>

              {/* Close button - shows confirmation */}
              <button
                onClick={() => setShowCloseConfirm(true)}
                className={`p-2 rounded-xl ${colors.background.hover} border ${colors.border.light} hover:border-gray-400 dark:hover:border-white/20 transition-all ${colors.text.muted} hover:${colors.text.primary}`}
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
          <div className={`mb-8 p-6 rounded-2xl border ${
            allConnected 
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-400 dark:border-emerald-500/30'
              : 'bg-amber-50 dark:bg-amber-500/10 border-amber-400 dark:border-amber-500/30'
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
                  <h2 className={`text-lg font-semibold ${allConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {allConnected 
                      ? 'Tutti gli studenti sono connessi!' 
                      : `In attesa di ${totalInvited - connectedCount} studenti`
                    }
                  </h2>
                  <p className={colors.text.secondary}>
                    {allConnected 
                      ? 'Puoi avviare la simulazione quando vuoi.'
                      : 'Puoi comunque avviare la simulazione senza tutti i partecipanti.'
                    }
                  </p>
                </div>
              </div>

              <Button
                onClick={() => setShowStartConfirm(true)}
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
          <div className="mb-8 p-6 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-400 dark:border-blue-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                  <Activity className="w-7 h-7 text-white animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    Simulazione in corso
                  </h2>
                  <p className={colors.text.secondary}>
                    Completati: {completedCount}/{participants.length} partecipanti
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => sseReconnect()}
                  className={`p-3 rounded-xl ${colors.background.hover} border ${colors.border.light} hover:border-gray-400 dark:hover:border-white/20 transition-all ${colors.text.muted} hover:${colors.text.primary}`}
                  title="Riconnetti"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <Button
                  onClick={handleEndSession}
                  disabled={endSession.isPending}
                  className="bg-red-50 dark:bg-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/30 text-red-600 dark:text-red-400 border border-red-400 dark:border-red-500/30 hover:border-red-500 dark:hover:border-red-500/50 px-6 py-3 rounded-xl transition-all"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Termina Sessione
                </Button>
              </div>
            </div>
          </div>
        )}

        {session.status === 'COMPLETED' && (
          <div className={`mb-8 p-6 rounded-2xl ${colors.background.card} border ${colors.border.primary}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
                    Sessione completata
                  </h2>
                  <p className={colors.text.secondary}>
                    {completedCount} studenti hanno completato la simulazione.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => router.push(`/simulazioni/${simulation.id}/classifica`)}
                className={`${colors.background.hover} hover:bg-gray-200 dark:hover:bg-white/20 ${colors.text.primary} border ${colors.border.primary} hover:border-gray-400 dark:hover:border-white/30 px-6 py-3 rounded-xl transition-all`}
              >
                Vedi Classifica
              </Button>
            </div>
          </div>
        )}

        {/* Not connected students (waiting state) */}
        {session.status === 'WAITING' && notConnectedStudents.length > 0 && (
          <div className="mb-8">
            <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
              <WifiOff className={`w-5 h-5 ${colors.text.muted}`} />
              Studenti non ancora connessi ({notConnectedStudents.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {notConnectedStudents.map(student => (
                <div 
                  key={student.id}
                  className={`px-4 py-2 ${colors.background.secondary} border ${colors.border.light} rounded-xl text-sm ${colors.text.muted}`}
                >
                  {student.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Participants Grid */}
        <div>
          <h2 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
            <Users className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
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
                  onKickParticipant={handleKickParticipant}
                  sessionStatus={session.status}
                />
              ))}
            </div>
          ) : (
            <div className={`text-center py-16 rounded-2xl ${colors.background.secondary} border ${colors.border.light}`}>
              <Users className={`w-12 h-12 ${colors.text.muted} mx-auto mb-4`} />
              <p className={colors.text.muted}>Nessun partecipante connesso</p>
              <p className="text-gray-500 text-sm mt-2">Gli studenti appariranno qui quando si connetteranno</p>
            </div>
          )}
        </div>
      </main>

      {/* Start Confirmation Modal - Inline version for popup window compatibility */}
      {showStartConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <Play className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-bold ${colors.text.primary}`}>Avvia Simulazione</h3>
                <p className={`mt-2 ${colors.text.secondary}`}>
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
                className={`flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-500 ${colors.text.primary} font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50`}
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
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-bold ${colors.text.primary}`}>Conferma Avvio Parziale</h3>
                <p className={`mt-2 ${colors.text.secondary}`}>
                  {`Non tutti gli studenti sono connessi (${connectedCount}/${totalInvited}). Sei sicuro di voler avviare la simulazione? Gli studenti non connessi non potranno partecipare.`}
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForceStartConfirm(false)}
                disabled={startSession.isPending}
                className={`flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-500 ${colors.text.primary} font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50`}
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

      {/* Chat Modal */}
      {selectedParticipantId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className={`font-semibold ${colors.text.primary}`}>Chat</h3>
                  <p className={`text-sm ${colors.text.muted}`}>
                    {participants.find(p => p.id === selectedParticipantId)?.studentName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedParticipantId(null);
                  setMessageText('');
                }}
                className={`p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${colors.text.muted} hover:text-gray-900 dark:hover:text-white`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[400px] bg-gray-50 dark:bg-gray-800/50">
              {messagesFromSSE.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <MessageSquare className={`w-10 h-10 ${colors.text.muted} mb-2`} />
                  <p className={`${colors.text.muted} text-sm`}>Nessun messaggio</p>
                  <p className={`${colors.text.muted} text-xs`}>Inizia una conversazione</p>
                </div>
              ) : (
                messagesFromSSE.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.senderType === 'ADMIN' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      msg.senderType === 'ADMIN'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-br-md'
                        : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-bl-md'
                    }`}>
                      <p className="text-sm break-words">{msg.message}</p>
                      <p className={`text-[10px] mt-1 ${
                        msg.senderType === 'ADMIN' ? 'text-white/70' : 'text-gray-400'
                      }`}>
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: it })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 dark:border-white/10 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && messageText.trim()) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Scrivi un messaggio..."
                  className={`flex-1 px-4 py-2.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl ${colors.text.primary} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm`}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessage.isPending}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 px-4"
                >
                  {sendMessage.isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kick Confirmation Modal */}
      {kickConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-500/20 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-red-200 dark:border-red-500/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className={`font-semibold ${colors.text.primary}`}>Conferma Espulsione</h3>
                <p className={`text-sm ${colors.text.muted}`}>Questa azione non può essere annullata</p>
              </div>
            </div>
            <div className="p-5">
              <p className={colors.text.secondary}>
                Stai per espellere <span className={`font-semibold ${colors.text.primary}`}>{kickConfirm.name}</span> dalla sessione.
              </p>
              <p className={`${colors.text.muted} text-sm mt-2`}>
                Lo studente non potrà più partecipare a questa simulazione e la sua sessione verrà terminata immediatamente.
              </p>
            </div>
            <div className="p-5 pt-0 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setKickConfirm(null)}
                className={`${colors.text.muted} hover:text-gray-900 dark:hover:text-white`}
              >
                Annulla
              </Button>
              <Button
                onClick={() => kickParticipant.mutate({ participantId: kickConfirm.id, reason: 'Espulso dall\'amministratore' })}
                disabled={kickParticipant.isPending}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 px-6"
              >
                <Ban className="w-4 h-4 mr-2" />
                {kickParticipant.isPending ? 'Espulsione...' : 'Espelli Studente'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Start Session Confirmation Modal */}
      {showStartConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-500/20 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-blue-200 dark:border-blue-500/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className={`font-semibold ${colors.text.primary}`}>Avviare la Simulazione?</h3>
                <p className={`text-sm ${colors.text.muted}`}>Il timer partirà per tutti contemporaneamente</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className={`p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20`}>
                <div className="flex items-center gap-3 mb-3">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className={`font-medium ${colors.text.primary}`}>Stato Connessioni</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={colors.text.muted}>Studenti connessi:</span>
                    <span className={`font-semibold ${allConnected ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {connectedCount}/{totalInvited}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={colors.text.muted}>Studenti pronti:</span>
                    <span className={`font-semibold ${colors.text.primary}`}>
                      {readyCount}/{connectedCount}
                    </span>
                  </div>
                </div>
              </div>
              
              {!allConnected && (
                <div className={`p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-start gap-2`}>
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Non tutti gli studenti invitati sono connessi. Puoi comunque avviare la simulazione.
                  </p>
                </div>
              )}
              
              <p className={colors.text.secondary}>
                Una volta avviata, il timer inizierà immediatamente per tutti i partecipanti connessi e non potrà essere messo in pausa.
              </p>
            </div>
            <div className="p-5 pt-0 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowStartConfirm(false)}
                className={`${colors.text.muted} hover:text-gray-900 dark:hover:text-white`}
              >
                Annulla
              </Button>
              <Button
                onClick={() => {
                  if (sessionId) {
                    startSession.mutate({ 
                      sessionId, 
                      forceStart: !allConnected 
                    });
                  }
                }}
                disabled={startSession.isPending}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 px-6"
              >
                <Play className="w-4 h-4 mr-2" />
                {startSession.isPending ? 'Avvio in corso...' : 'Avvia Ora'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Force Start Confirmation Modal (when not all students connected) */}
      {showForceStartConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-500/20 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-amber-200 dark:border-amber-500/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className={`font-semibold ${colors.text.primary}`}>Non tutti sono connessi</h3>
                <p className={`text-sm ${colors.text.muted}`}>Vuoi avviare comunque?</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className={`p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20`}>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Solo <span className="font-semibold">{connectedCount} su {totalInvited}</span> studenti invitati sono attualmente connessi.
                </p>
              </div>
              
              <p className={colors.text.secondary}>
                Gli studenti non connessi non potranno partecipare a questa simulazione. Sei sicuro di voler avviare comunque?
              </p>
            </div>
            <div className="p-5 pt-0 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowForceStartConfirm(false)}
                className={`${colors.text.muted} hover:text-gray-900 dark:hover:text-white`}
              >
                Annulla
              </Button>
              <Button
                onClick={() => {
                  if (sessionId) {
                    startSession.mutate({ 
                      sessionId, 
                      forceStart: true 
                    });
                  }
                  setShowForceStartConfirm(false);
                }}
                disabled={startSession.isPending}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 px-6"
              >
                <Play className="w-4 h-4 mr-2" />
                {startSession.isPending ? 'Avvio...' : 'Avvia Comunque'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Close Session Confirmation Modal */}
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className={`font-semibold ${colors.text.primary}`}>Chiudere la Virtual Room?</h3>
                <p className={`text-sm ${colors.text.muted}`}>Scegli come procedere</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <p className={colors.text.secondary}>
                {session.status === 'STARTED' 
                  ? 'La simulazione è in corso. Cosa vuoi fare?'
                  : 'Cosa vuoi fare con questa sessione?'
                }
              </p>
              
              {/* Option 1: End session and disconnect everyone */}
              <button
                onClick={() => {
                  setShowCloseConfirm(false);
                  if (sessionId) {
                    endSession.mutate({ sessionId });
                  }
                }}
                disabled={endSession.isPending}
                className="w-full p-4 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-600 dark:text-red-400">Termina sessione ed esci</p>
                    <p className={`text-sm ${colors.text.muted} mt-1`}>
                      Tutti gli studenti saranno disconnessi e la sessione verrà chiusa definitivamente.
                    </p>
                  </div>
                </div>
              </button>
              
              {/* Option 2: Just close the window (session stays active) */}
              <button
                onClick={() => {
                  setShowCloseConfirm(false);
                  router.push('/simulazioni');
                }}
                className="w-full p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <X className={`w-5 h-5 ${colors.text.muted} flex-shrink-0`} />
                  <div>
                    <p className={`font-medium ${colors.text.primary}`}>Solo esci (sessione attiva)</p>
                    <p className={`text-sm ${colors.text.muted} mt-1`}>
                      La sessione rimarrà attiva e potrai tornare in seguito. Gli studenti continueranno.
                    </p>
                  </div>
                </div>
              </button>
            </div>
            <div className="p-5 pt-0">
              <Button
                variant="ghost"
                onClick={() => setShowCloseConfirm(false)}
                className={`w-full ${colors.text.muted} hover:text-gray-900 dark:hover:text-white`}
              >
                Annulla
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
