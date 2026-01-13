'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useApiError } from '@/lib/hooks/useApiError';
import { Spinner } from '@/components/ui/loaders';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Clock, 
  CheckCircle, 
  Wifi, 
  MessageSquare,
  X,
  Radio,
  Shield,
  Timer,
  Sparkles,
  XCircle,
  Users,
  Send,
  AlertTriangle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// Student Chat Modal Component
interface StudentChatModalProps {
  participantId: string;
  onClose: () => void;
  onSendMessage: (message: string) => void;
  isSending: boolean;
}

function StudentChatModal({ participantId, onClose, onSendMessage, isSending }: StudentChatModalProps) {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get all messages for this participant
  const messagesQuery = trpc.virtualRoom.getMessages.useQuery(
    { participantId },
    { 
      refetchInterval: 3000, // Poll for new messages
    }
  );

  // Mark admin messages as read when opening chat
  const markMessagesRead = trpc.virtualRoom.markMessagesRead.useMutation();

  useEffect(() => {
    if (messagesQuery.data) {
      const unreadIds = messagesQuery.data
        .filter(m => !m.isRead && m.senderType === 'ADMIN')
        .map(m => m.id);
      if (unreadIds.length > 0) {
        markMessagesRead.mutate({ participantId, messageIds: unreadIds });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantId, messagesQuery.data]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesQuery.data]);

  const handleSend = () => {
    if (messageText.trim()) {
      onSendMessage(messageText.trim());
      setMessageText('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className={`font-semibold ${colors.text.primary}`}>Chat con l&apos;esaminatore</h3>
              <p className={`text-sm ${colors.text.muted}`}>Hai bisogno di aiuto? Scrivi qui</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${colors.text.muted} hover:text-gray-900 dark:hover:text-white`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[400px] bg-gray-50 dark:bg-gray-800/50">
          {messagesQuery.isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messagesQuery.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <MessageSquare className={`w-10 h-10 ${colors.text.muted} mb-2`} />
              <p className={`${colors.text.muted} text-sm`}>Nessun messaggio</p>
              <p className={`${colors.text.muted} text-xs`}>Scrivi un messaggio per contattare l&apos;esaminatore</p>
            </div>
          ) : (
            <>
              {messagesQuery.data?.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.senderType === 'STUDENT' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    msg.senderType === 'STUDENT'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-br-md'
                      : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-bl-md'
                  }`}>
                    <p className="text-sm break-words">{msg.message}</p>
                    <p className={`text-[10px] mt-1 ${
                      msg.senderType === 'STUDENT' ? 'text-white/70' : 'text-gray-400'
                    }`}>
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: it })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
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
                  handleSend();
                }
              }}
              placeholder="Scrivi un messaggio..."
              className={`flex-1 px-4 py-2.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl ${colors.text.primary} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm`}
              autoFocus
            />
            <Button
              onClick={handleSend}
              disabled={!messageText.trim() || isSending}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 px-4"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StudentWaitingRoomProps {
  assignmentId: string;
  simulationTitle: string;
  durationMinutes: number;
  onSessionStart: (actualStartAt: Date, participantId: string) => void;
  instructions?: string | null; // Optional instructions to show in waiting room
}

export default function StudentWaitingRoom({ 
  assignmentId, 
  simulationTitle,
  durationMinutes,
  onSessionStart,
  instructions,
}: StudentWaitingRoomProps) {
  const { showSuccess } = useToast();
  const { handleMutationError } = useApiError();

  const [participantId, setParticipantId] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [kickedReason, setKickedReason] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{
    id: string;
    message: string;
    createdAt: Date;
  }>>([]);
  const [showMessagePopup, setShowMessagePopup] = useState<string | null>(null);
  const [connectedCount, setConnectedCount] = useState(0);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [showContactModal, setShowContactModal] = useState(false);
  const router = useRouter();

  // Check session status first - uses assignmentId for session lookup
  const { data: sessionStatus, isLoading: isCheckingSession } = trpc.virtualRoom.getStudentSessionStatus.useQuery(
    { assignmentId },
    { 
      refetchInterval: participantId ? false : 5000,
    }
  );

  // Join session mutation
  const joinSession = trpc.virtualRoom.joinSession.useMutation({
    onSuccess: (data) => {
      setParticipantId(data.participantId);
      
      if (data.sessionStatus === 'STARTED' && data.actualStartAt) {
        onSessionStart(new Date(data.actualStartAt), data.participantId);
      }
    },
    onError: handleMutationError,
  });

  // Disconnect mutation (for when student closes browser)
  const disconnect = trpc.virtualRoom.disconnect.useMutation();

  // Set ready mutation
  const setReadyMutation = trpc.virtualRoom.setReady.useMutation({
    onSuccess: () => {
      setIsReady(true);
      showSuccess('Pronto!', 'Sei pronto per iniziare la simulazione.');
    },
    onError: handleMutationError,
  });

  // Heartbeat mutation
  const heartbeat = trpc.virtualRoom.heartbeat.useMutation({
    onSuccess: (data) => {
      // Check if participant was kicked
      if (data.isKicked) {
        const reason = 'kickedReason' in data ? data.kickedReason : 'Sei stato espulso dalla sessione';
        setKickedReason(reason || 'Sei stato espulso dalla sessione');
        setSessionEnded(true);
        return;
      }

      // Check if session was ended by admin
      if (data.sessionStatus === 'COMPLETED' || data.endedAt) {
        setSessionEnded(true);
        return;
      }

      if (data.sessionStatus === 'STARTED' && data.actualStartAt && participantId) {
        onSessionStart(new Date(data.actualStartAt), participantId);
      }

      // Sync isReady state from server
      if (data.isReady !== undefined) {
        setIsReady(data.isReady);
      }

      // Update connected count
      if ('connectedCount' in data && 'totalParticipants' in data) {
        setConnectedCount(data.connectedCount as number);
        setTotalParticipants(data.totalParticipants as number);
      }

      if (data.unreadMessages && data.unreadMessages.length > 0) {
        const mappedMessages = data.unreadMessages.map(m => ({
          id: m.id || '',
          message: m.message || '',
          createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
        }));
        
        // Play notification sound if this is a new message (not already in the list)
        const isNewMessage = data.unreadMessages.some(newMsg => 
          !messages.some(existingMsg => existingMsg.id === newMsg.id)
        );
        
        if (isNewMessage) {
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
            }
          });
        }
        
        setMessages(mappedMessages);
        if (data.unreadMessages[0]?.id) {
          setShowMessagePopup(data.unreadMessages[0].id);
        }
      }
    },
  });

  // Send message mutation (for replying)
  const sendMessage = trpc.virtualRoom.sendMessage.useMutation({
    onSuccess: () => {
      setReplyText('');
      showSuccess('Messaggio inviato', 'Il tuo messaggio è stato inviato.');
    },
    onError: handleMutationError,
  });

  // Mark messages as read mutation
  const markMessagesRead = trpc.virtualRoom.markMessagesRead.useMutation();

  // Join on mount (only if session exists) - uses assignmentId
  useEffect(() => {
    if (!participantId && !joinSession.isPending && !isJoining && sessionStatus?.hasSession) {
      setIsJoining(true);
      joinSession.mutate({ assignmentId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId, participantId, isJoining, sessionStatus?.hasSession]);

  // Heartbeat polling
  useEffect(() => {
    if (!participantId) return;

    const interval = setInterval(() => {
      heartbeat.mutate({ participantId });
    }, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantId]);

  // Handle browser close/navigate away - disconnect immediately
  useEffect(() => {
    if (!participantId) return;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery when page is closing
      navigator.sendBeacon(
        '/api/virtual-room/disconnect',
        JSON.stringify({ participantId })
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also disconnect on component unmount (navigation away)
      disconnect.mutate({ participantId });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantId]);

  // Handle ready click
  const handleReady = useCallback(() => {
    if (!participantId) return;
    setReadyMutation.mutate({ participantId });
  }, [participantId, setReadyMutation]);

  // Handle dismiss message
  const handleDismissMessage = useCallback((messageId: string) => {
    if (!participantId) return;
    markMessagesRead.mutate({ participantId, messageIds: [messageId] });
    setShowMessagePopup(null);
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, [participantId, markMessagesRead]);

  // Loading state - checking session
  if (isCheckingSession) {
    return (
      <div className={`min-h-screen ${colors.background.primary} flex items-center justify-center`}>
        <div className="text-center">
          <Spinner size="xl" variant="primary" className="mx-auto mb-6" />
          <p className={`${colors.text.muted} text-lg`}>Verifica stato stanza virtuale...</p>
        </div>
      </div>
    );
  }

  if (sessionEnded) {
    return (
      <div className={`min-h-screen ${colors.background.primary} flex items-center justify-center p-4`}>
        <div className="max-w-lg w-full">
          <div className={`${colors.background.card} border ${colors.border.primary} rounded-2xl p-8 text-center shadow-lg`}>
            {/* Icon */}
            <div className={`w-20 h-20 rounded-2xl ${kickedReason ? 'bg-red-100 dark:bg-red-500/20' : 'bg-gray-100 dark:bg-gray-500/20'} flex items-center justify-center mx-auto mb-6`}>
              <XCircle className={`w-10 h-10 ${kickedReason ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
            </div>

            <h2 className={`text-2xl font-bold ${colors.text.primary} mb-3`}>
              {kickedReason ? 'Sei stato espulso' : 'Sessione terminata'}
            </h2>
            <p className={`${colors.text.secondary} mb-8`}>
              {kickedReason 
                ? kickedReason 
                : 'La sessione è stata terminata dall\'esaminatore. Puoi chiudere questa finestra.'
              }
            </p>

            {/* Action button */}
            <Button
              onClick={() => router.push('/simulazioni')} // go to simulation
              className="w-full"
            >
              Chiudi finestra
            </Button>

            <p className={`${colors.text.muted} text-sm mt-4`}>
              Se la finestra non si chiude automaticamente, puoi chiuderla manualmente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Not active yet state
  if (!sessionStatus?.hasSession) {
    return (
      <div className={`min-h-screen ${colors.background.primary} flex items-center justify-center p-4`}>
        <div className="max-w-lg w-full">
          <div className={`${colors.background.card} border ${colors.border.primary} rounded-2xl p-8 text-center shadow-lg`}>
            {/* Icon */}
            <div className={`w-20 h-20 rounded-2xl ${colors.status.warning.bgLight} flex items-center justify-center mx-auto mb-6`}>
              <Clock className={`w-10 h-10 ${colors.status.warning.text}`} />
            </div>

            <h2 className={`text-2xl font-bold ${colors.text.primary} mb-3`}>
              Stanza Virtuale Non Ancora Attiva
            </h2>
            <p className={`${colors.text.secondary} mb-8`}>
              La sessione per <span className={`font-semibold ${colors.text.primary}`}>{simulationTitle}</span> non è ancora stata avviata.
            </p>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className={`${colors.background.secondary} rounded-xl p-4 text-left`}>
                <Timer className={`w-5 h-5 ${colors.status.warning.text} mb-2`} />
                <p className={`text-xs ${colors.text.muted} mb-1`}>Durata prevista</p>
                <p className={`text-lg font-semibold ${colors.text.primary}`}>{durationMinutes} min</p>
              </div>
              <div className={`${colors.background.secondary} rounded-xl p-4 text-left`}>
                <Shield className={`w-5 h-5 ${colors.status.info.text} mb-2`} />
                <p className={`text-xs ${colors.text.muted} mb-1`}>Stato</p>
                <p className={`text-lg font-semibold ${colors.status.warning.text}`}>In attesa</p>
              </div>
            </div>

            {/* Tips */}
            <div className={`${colors.background.secondary} rounded-xl p-5 text-left`}>
              <h3 className={`text-sm font-medium ${colors.text.primary} mb-3 flex items-center gap-2`}>
                <Sparkles className="w-4 h-4 text-purple-500" />
                Cosa fare
              </h3>
              <ul className={`text-sm ${colors.text.secondary} space-y-2`}>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                  Attendi che l&apos;admin attivi la stanza virtuale
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                  Questa pagina si aggiornerà automaticamente
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                  Non chiudere questa finestra
                </li>
              </ul>
            </div>

            {/* Auto refresh indicator */}
            <div className={`mt-6 flex items-center justify-center gap-2 text-sm ${colors.text.muted}`}>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Aggiornamento automatico ogni 5 secondi</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Connecting state
  if (!participantId) {
    return (
      <div className={`min-h-screen ${colors.background.primary} flex items-center justify-center`}>
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className={`absolute inset-0 rounded-full border-4 ${colors.border.primary} border-t-cyan-500 animate-spin`} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Wifi className="w-10 h-10 text-cyan-500" />
            </div>
          </div>
          <p className={`${colors.text.muted} text-lg`}>Connessione alla stanza virtuale...</p>
        </div>
      </div>
    );
  }

  // Connected - waiting for start
  return (
    <div className={`${colors.background.primary} flex flex-col`}>
      {/* Main Content - Centered */}
      <main className="flex-1 flex items-center justify-center p-4 lg:p-6">
        <div className="w-full max-w-3xl mx-auto">
          {/* Header with title - Clean, no background */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
                <Radio className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
            </div>
            <h1 className={`text-2xl lg:text-3xl font-bold ${colors.text.primary}`}>{simulationTitle}</h1>
          </div>

          {/* Main Card - Centered and unified */}
          <div className={`${colors.background.card} border ${colors.border.primary} rounded-3xl overflow-hidden shadow-xl`}>
            {/* Connection Status */}
            <div className="p-6 lg:p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg">
                <Wifi className="w-10 h-10 text-white" />
              </div>
              
              <h2 className={`text-2xl font-bold ${colors.text.primary} mb-2`}>
                Sei connesso alla stanza
              </h2>
              <p className={`${colors.text.secondary}`}>
                Attendi che l&apos;esaminatore avvii la simulazione
              </p>
            </div>

            {/* Info Pills - Horizontal centered */}
            <div className="px-6 lg:px-8 pb-6">
              <div className="flex flex-wrap justify-center gap-3">
                {/* Duration */}
                <div className={`flex items-center gap-3 px-5 py-3 ${colors.background.secondary} rounded-full`}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`font-bold ${colors.text.primary}`}>{durationMinutes}</span>
                    <span className={`text-sm ${colors.text.muted}`}>min</span>
                  </div>
                </div>
                {/* Connected Users Count */}
                <div className={`flex items-center gap-3 px-5 py-3 ${colors.background.secondary} rounded-full`}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`font-bold ${colors.text.primary}`}>{connectedCount}</span>
                    <span className={`text-sm ${colors.text.muted}`}>/ {totalParticipants} online</span>
                  </div>
                </div>

                {/* Waiting Animation */}
                <div className={`flex items-center gap-2 px-5 py-3 ${colors.background.secondary} rounded-full`}>
                  <div className="flex gap-1 justify-center items-center">
                    {[0, 1, 2].map(i => (
                      <div 
                        key={i}
                        className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                    <span className={`text-sm ${colors.text.muted}`}>In attesa...</span>  
                  </div>
                </div>
              </div>
            </div>

            {/* Ready Button */}
            {!isReady && (
              <div className="px-6 lg:px-8 pb-6">
                <Button
                  onClick={handleReady}
                  disabled={setReadyMutation.isPending}
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white py-4 text-lg font-semibold rounded-xl shadow-lg transition-all"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  {setReadyMutation.isPending ? 'Conferma...' : 'Sono pronto'}
                </Button>
              </div>
            )}

            {/* Instructions from admin - if provided */}
            {instructions && (
              <div className="px-6 lg:px-8 pb-4">
                <div className={`p-4 rounded-xl ${colors.background.secondary} border ${colors.border.light}`}>
                  <div className="flex items-start gap-3 mb-2">
                    <AlertTriangle className={`w-5 h-5 ${colors.text.primary} flex-shrink-0 mt-0.5`} />
                    <h3 className={`text-sm font-semibold ${colors.text.primary}`}>Istruzioni importanti</h3>
                  </div>
                  <div 
                    className={`text-sm ${colors.text.secondary} ml-8 prose prose-sm dark:prose-invert max-w-none`}
                    dangerouslySetInnerHTML={{ __html: instructions }}
                  />
                </div>
              </div>
            )}

            {/* Tips - Modern gradient style */}
            <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 dark:from-cyan-500/5 dark:via-blue-500/5 dark:to-purple-500/5 border-t border-cyan-500/20 dark:border-cyan-500/10 p-5 lg:p-6">
              <div className="flex justify-between gap-4 items-center">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-sm font-semibold ${colors.text.primary} mb-2`}>Suggerimenti</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                      <p className={`text-sm ${colors.text.secondary} flex items-center gap-2`}>
                        <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full flex-shrink-0" />
                        Connessione stabile
                      </p>
                      <p className={`text-sm ${colors.text.secondary} flex items-center gap-2`}>
                        <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full flex-shrink-0" />
                        Non chiudere la finestra
                      </p>
                      <p className={`text-sm ${colors.text.secondary} flex items-center gap-2`}>
                        <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full flex-shrink-0" />
                        Avvio automatico
                      </p>
                      <p className={`text-sm ${colors.text.secondary} flex items-center gap-2`}>
                        <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full flex-shrink-0" />
                        Timer sincronizzato
                      </p>
                    </div>
                  </div>
                </div>
                {/* Contact examiner button */}
                {participantId && (
                  <button
                    onClick={() => setShowContactModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-sm font-medium shadow-lg transition-all hover:scale-105 flex-shrink-0"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">Contatta esaminatore</span>
                    <span className="sm:hidden">Contatta</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Message Popup */}
      {showMessagePopup && participantId && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${colors.background.card} border ${colors.border.primary} rounded-2xl shadow-2xl w-full max-w-md overflow-hidden`}>
            <div className={`p-5 border-b ${colors.border.primary} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <h3 className={`font-semibold ${colors.text.primary}`}>Messaggio dall&apos;esaminatore</h3>
              </div>
              <button
                onClick={() => {
                  handleDismissMessage(showMessagePopup);
                  setReplyText('');
                }}
                className={`p-2 rounded-xl ${colors.background.hover} transition-colors ${colors.text.muted}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className={`${colors.background.secondary} rounded-xl p-4 mb-4`}>
                <p className={`${colors.text.secondary}`}>
                  {messages.find(m => m.id === showMessagePopup)?.message}
                </p>
              </div>
              
              {/* Reply input */}
              <div className="space-y-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Scrivi una risposta..."
                  className={`w-full px-4 py-3 ${colors.background.secondary} border ${colors.border.primary} rounded-xl ${colors.text.primary} placeholder:${colors.text.muted} focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none`}
                  rows={2}
                />
              </div>
            </div>
            <div className={`p-5 pt-0 flex gap-3 justify-end`}>
              <Button
                variant="ghost"
                onClick={() => {
                  handleDismissMessage(showMessagePopup);
                  setReplyText('');
                }}
                className={colors.text.muted}
              >
                Chiudi
              </Button>
              {replyText.trim() && (
                <Button
                  onClick={() => {
                    sendMessage.mutate({ 
                      participantId, 
                      message: replyText.trim() 
                    });
                    handleDismissMessage(showMessagePopup);
                  }}
                  disabled={sendMessage.isPending}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendMessage.isPending ? 'Invio...' : 'Rispondi'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contact Examiner Modal - Full Chat */}
      {showContactModal && participantId && (
        <StudentChatModal
          participantId={participantId}
          onClose={() => setShowContactModal(false)}
          onSendMessage={(message) => {
            sendMessage.mutate({ participantId, message });
          }}
          isSending={sendMessage.isPending}
        />
      )}
    </div>
  );
}
