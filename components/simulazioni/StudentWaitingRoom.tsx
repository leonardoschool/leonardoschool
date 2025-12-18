'use client';

import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc/client';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useApiError } from '@/lib/hooks/useApiError';
import { 
  Clock, 
  CheckCircle, 
  Wifi, 
  MessageSquare,
  X,
  Zap,
  Radio,
  Shield,
  Timer,
  Sparkles
} from 'lucide-react';

interface StudentWaitingRoomProps {
  simulationId: string;
  simulationTitle: string;
  durationMinutes: number;
  onSessionStart: (actualStartAt: Date, participantId: string) => void;
}

export default function StudentWaitingRoom({ 
  simulationId, 
  simulationTitle,
  durationMinutes,
  onSessionStart 
}: StudentWaitingRoomProps) {
  const { showSuccess } = useToast();
  const { handleMutationError } = useApiError();

  const [participantId, setParticipantId] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [messages, setMessages] = useState<Array<{
    id: string;
    message: string;
    createdAt: Date;
  }>>([]);
  const [showMessagePopup, setShowMessagePopup] = useState<string | null>(null);

  // Check session status first
  const { data: sessionStatus, isLoading: isCheckingSession } = trpc.virtualRoom.getStudentSessionStatus.useQuery(
    { simulationId },
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
      if (data.sessionStatus === 'STARTED' && data.actualStartAt && participantId) {
        onSessionStart(new Date(data.actualStartAt), participantId);
      }

      // Sync isReady state from server
      if (data.isReady !== undefined) {
        setIsReady(data.isReady);
      }

      if (data.unreadMessages && data.unreadMessages.length > 0) {
        const mappedMessages = data.unreadMessages.map(m => ({
          id: m.id || '',
          message: m.message || '',
          createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
        }));
        setMessages(mappedMessages);
        if (data.unreadMessages[0]?.id) {
          setShowMessagePopup(data.unreadMessages[0].id);
        }
      }
    },
  });

  // Mark messages as read mutation
  const markMessagesRead = trpc.virtualRoom.markMessagesRead.useMutation();

  // Join on mount (only if session exists)
  useEffect(() => {
    if (!participantId && !joinSession.isPending && !isJoining && sessionStatus?.hasSession) {
      setIsJoining(true);
      joinSession.mutate({ simulationId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationId, participantId, isJoining, sessionStatus?.hasSession]);

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
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
        </div>
        
        <div className="relative text-center">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-white/10 border-t-cyan-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className="w-10 h-10 text-cyan-400" />
            </div>
          </div>
          <p className="mt-8 text-gray-400 text-lg">Verifica stato stanza virtuale...</p>
        </div>
      </div>
    );
  }

  // Not active yet state
  if (!sessionStatus?.hasSession) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center p-4 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-lg w-full">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 text-center">
            {/* Icon */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl rotate-3" />
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl -rotate-3" />
              <div className="relative bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl w-full h-full flex items-center justify-center">
                <Clock className="w-12 h-12 text-white" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">
              Stanza Virtuale Non Ancora Attiva
            </h2>
            <p className="text-gray-400 mb-8">
              La sessione per <span className="text-white font-medium">{simulationTitle}</span> non è ancora stata avviata.
            </p>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left">
                <Timer className="w-5 h-5 text-amber-400 mb-2" />
                <p className="text-xs text-gray-500 mb-1">Durata prevista</p>
                <p className="text-lg font-semibold text-white">{durationMinutes} min</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left">
                <Shield className="w-5 h-5 text-cyan-400 mb-2" />
                <p className="text-xs text-gray-500 mb-1">Stato</p>
                <p className="text-lg font-semibold text-amber-400">In attesa</p>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-left">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Cosa fare
              </h3>
              <ul className="text-sm text-gray-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                  Attendi che l&apos;admin attivi la stanza virtuale
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                  Questa pagina si aggiornerà automaticamente
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                  Non chiudere questa finestra
                </li>
              </ul>
            </div>

            {/* Auto refresh indicator */}
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
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
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        </div>
        
        <div className="relative text-center">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-white/10 border-t-cyan-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Wifi className="w-10 h-10 text-cyan-400" />
            </div>
          </div>
          <p className="mt-8 text-gray-400 text-lg">Connessione alla stanza virtuale...</p>
        </div>
      </div>
    );
  }

  // Connected - waiting for start
  return (
    <div className="fixed inset-0 z-[9999] w-full bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex flex-col overflow-auto">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 backdrop-blur-xl bg-black/30 border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-5 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse" />
            </div>
            <h1 className="text-xl font-bold text-white">{simulationTitle}</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            {/* Connection Status */}
            <div className="p-8 text-center border-b border-white/10">
              {/* Main icon - simplified without ping animation overflow */}
              <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 relative">
                <Wifi className="w-12 h-12 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">
                Sei connesso alla stanza
              </h2>
              <p className="text-gray-400">
                Attendi che l&apos;esaminatore avvii la simulazione
              </p>
            </div>

            {/* Info Cards */}
            <div className="p-6 space-y-4">
              {/* Duration */}
              <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Durata</p>
                  <p className="text-lg font-semibold text-white">{durationMinutes} minuti</p>
                </div>
              </div>

              {/* Ready Status */}
              <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isReady 
                    ? 'bg-gradient-to-br from-emerald-400 to-green-500' 
                    : 'bg-white/10'
                }`}>
                  {isReady ? (
                    <CheckCircle className="w-6 h-6 text-white" />
                  ) : (
                    <Shield className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Stato</p>
                  <p className={`text-lg font-semibold ${isReady ? 'text-emerald-400' : 'text-gray-300'}`}>
                    {isReady ? 'Pronto per iniziare' : 'In attesa'}
                  </p>
                </div>
              </div>

              {/* Waiting Animation */}
              <div className="flex items-center justify-center gap-3 py-4">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div 
                      key={i}
                      className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <span className="text-gray-400 text-sm">In attesa dell&apos;avvio...</span>
              </div>
            </div>

            {/* Ready Button */}
            {!isReady && (
              <div className="p-6 pt-0">
                <Button
                  onClick={handleReady}
                  disabled={setReadyMutation.isPending}
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white border-0 py-4 text-lg font-semibold rounded-xl shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 transition-all"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Sono pronto
                </Button>
              </div>
            )}

            {/* Tips */}
            <div className="p-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-t border-white/10">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Suggerimenti
              </h3>
              <ul className="text-sm text-gray-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-2 flex-shrink-0" />
                  Assicurati di avere una connessione stabile
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-2 flex-shrink-0" />
                  Non chiudere questa finestra
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-2 flex-shrink-0" />
                  Il test inizierà automaticamente
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-2 flex-shrink-0" />
                  Il timer partirà per tutti contemporaneamente
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Message Popup */}
      {showMessagePopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-white">Messaggio dall&apos;esaminatore</h3>
              </div>
              <button
                onClick={() => handleDismissMessage(showMessagePopup)}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-300 text-lg">
                {messages.find(m => m.id === showMessagePopup)?.message}
              </p>
            </div>
            <div className="p-5 pt-0 flex justify-end">
              <Button
                onClick={() => handleDismissMessage(showMessagePopup)}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 px-8"
              >
                Ho capito
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
