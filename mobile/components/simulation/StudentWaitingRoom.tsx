/**
 * Leonardo School Mobile - Student Waiting Room
 * 
 * Sala d'attesa per simulazioni con Virtual Room.
 * Gestisce: join session, heartbeat, chat, ready status.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  Vibration,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

import { Text, Button, Card, PageLoader } from '../ui';
import { colors } from '../../lib/theme/colors';
import { spacing } from '../../lib/theme/spacing';
import { useTheme } from '../../contexts/ThemeContext';
import { trpc } from '../../lib/trpc';

// ==================== TYPES ====================

interface Message {
  id: string;
  message: string;
  senderType: 'ADMIN' | 'STUDENT';
  createdAt: Date;
  isRead: boolean;
}

interface StudentWaitingRoomProps {
  assignmentId: string;
  simulationTitle: string;
  durationMinutes: number;
  onSessionStart: (actualStartAt: Date, participantId: string) => void;
  instructions?: string | null;
}

// ==================== CHAT MODAL ====================

interface ChatModalProps {
  participantId: string;
  visible: boolean;
  onClose: () => void;
  onMessagesRead?: (messageIds: string[]) => void;
}

function ChatModal({ participantId, visible, onClose, onMessagesRead }: ChatModalProps) {
  const { themed } = useTheme();
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch messages
  const messagesQuery = trpc.virtualRoom.getMessages.useQuery(
    { participantId },
    { 
      enabled: visible,
      refetchInterval: visible ? 3000 : false,
    }
  );

  // Send message mutation
  const sendMessageMutation = trpc.virtualRoom.sendMessage.useMutation({
    onSuccess: () => {
      setMessageText('');
      setIsSending(false);
      messagesQuery.refetch();
    },
    onError: () => {
      setIsSending(false);
    },
  });

  // Mark messages as read
  const markMessagesRead = trpc.virtualRoom.markMessagesRead.useMutation();

  // Mark admin messages as read when modal opens
  useEffect(() => {
    if (visible && messagesQuery.data) {
      const unreadIds = (messagesQuery.data as Message[])
        .filter((m: Message) => !m.isRead && m.senderType === 'ADMIN')
        .map((m: Message) => m.id);
      if (unreadIds.length > 0) {
        markMessagesRead.mutate({ participantId, messageIds: unreadIds });
        // Notify parent about read messages
        onMessagesRead?.(unreadIds);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, messagesQuery.data, participantId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messagesQuery.data]);

  const handleSend = () => {
    if (!messageText.trim() || isSending) return;
    setIsSending(true);
    sendMessageMutation.mutate({
      participantId,
      message: messageText.trim(),
    });
  };

  if (!visible) return null;

  const messages: Message[] = (messagesQuery.data || []).map((m: Message) => ({
    ...m,
    createdAt: new Date(m.createdAt),
  }));

  return (
    <View style={styles.modalOverlay}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatModalContainer}
      >
        <View style={[styles.chatModal, { backgroundColor: themed(colors.background.card) }]}>
          {/* Header */}
          <View style={[styles.chatHeader, { borderBottomColor: themed(colors.border.primary) }]}>
            <View style={styles.chatHeaderLeft}>
              <View style={styles.chatIconContainer}>
                <Ionicons name="chatbubbles" size={20} color="#fff" />
              </View>
              <View>
                <Text variant="h6">Chat con l&apos;esaminatore</Text>
                <Text variant="caption" color="muted">Hai bisogno di aiuto?</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={themed(colors.text.secondary)} />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {messagesQuery.isLoading ? (
              <View style={styles.loadingContainer}>
                <PageLoader />
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.emptyMessages}>
                <Ionicons name="chatbubble-outline" size={48} color={themed(colors.text.muted)} />
                <Text variant="body" color="muted" style={{ marginTop: spacing[2] }}>
                  Nessun messaggio
                </Text>
                <Text variant="caption" color="muted">
                  Scrivi per contattare l&apos;esaminatore
                </Text>
              </View>
            ) : (
              messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubble,
                    msg.senderType === 'STUDENT' 
                      ? styles.studentMessage 
                      : [styles.adminMessage, { backgroundColor: themed(colors.background.secondary) }],
                  ]}
                >
                  <Text
                    variant="bodySmall"
                    style={{ color: msg.senderType === 'STUDENT' ? '#fff' : themed(colors.text.primary) }}
                  >
                    {msg.message}
                  </Text>
                  <Text
                    variant="caption"
                    style={{ 
                      color: msg.senderType === 'STUDENT' ? 'rgba(255,255,255,0.7)' : themed(colors.text.muted),
                      marginTop: 4,
                    }}
                  >
                    {formatDistanceToNow(msg.createdAt, { addSuffix: true, locale: it })}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          {/* Input */}
          <View style={[styles.inputContainer, { borderTopColor: themed(colors.border.primary) }]}>
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Scrivi un messaggio..."
              placeholderTextColor={themed(colors.text.muted)}
              style={[
                styles.textInput,
                { 
                  backgroundColor: themed(colors.background.secondary),
                  color: themed(colors.text.primary),
                },
              ]}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!messageText.trim() || isSending}
              style={[
                styles.sendButton,
                (!messageText.trim() || isSending) && styles.sendButtonDisabled,
              ]}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={messageText.trim() && !isSending ? '#fff' : 'rgba(255,255,255,0.5)'} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ==================== MAIN COMPONENT ====================

export default function StudentWaitingRoom({
  assignmentId,
  simulationTitle,
  durationMinutes,
  onSessionStart,
  instructions,
}: StudentWaitingRoomProps) {
  const { themed } = useTheme();
  const router = useRouter();

  // State
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [kickedReason, setKickedReason] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectedCount, setConnectedCount] = useState(0);
  const [totalParticipants, setTotalParticipants] = useState(0);

  // App state for background detection
  const appState = useRef(AppState.currentState);
  // Track message IDs we've already vibrated for
  const seenMessageIds = useRef<Set<string>>(new Set());

  // Check session status
  const { data: sessionStatus, isLoading: isCheckingSession } = trpc.virtualRoom.getStudentSessionStatus.useQuery(
    { assignmentId },
    { 
      refetchInterval: participantId ? false : 5000,
    }
  );

  // Join session mutation
  const joinSession = trpc.virtualRoom.joinSession.useMutation({
    onSuccess: (data: { participantId: string; sessionStatus?: string; actualStartAt?: string | Date }) => {
      setParticipantId(data.participantId);
      if (data.sessionStatus === 'STARTED' && data.actualStartAt) {
        onSessionStart(new Date(data.actualStartAt), data.participantId);
      }
    },
  });

  // Disconnect mutation
  const disconnect = trpc.virtualRoom.disconnect.useMutation();

  // Set ready mutation
  const setReadyMutation = trpc.virtualRoom.setReady.useMutation({
    onSuccess: () => {
      setIsReady(true);
      Vibration.vibrate(100);
    },
  });

  // Heartbeat response type
  interface HeartbeatResponse {
    isKicked?: boolean;
    kickedReason?: string;
    sessionStatus?: string;
    endedAt?: string | Date;
    actualStartAt?: string | Date;
    isReady?: boolean;
    connectedCount?: number;
    totalParticipants?: number;
    unreadMessages?: { id: string }[];
  }

  // Heartbeat mutation
  const heartbeat = trpc.virtualRoom.heartbeat.useMutation({
    onSuccess: (data: HeartbeatResponse) => {
      // Check if kicked
      if (data.isKicked) {
        const reason = data.kickedReason || 'Sei stato espulso dalla sessione';
        setKickedReason(reason);
        setSessionEnded(true);
        Vibration.vibrate([0, 200, 100, 200]);
        return;
      }

      // Check if session ended
      if (data.sessionStatus === 'COMPLETED' || data.endedAt) {
        setSessionEnded(true);
        return;
      }

      // Check if session started
      if (data.sessionStatus === 'STARTED' && data.actualStartAt && participantId) {
        onSessionStart(new Date(data.actualStartAt), participantId);
      }

      // Sync ready state
      if (data.isReady !== undefined) {
        setIsReady(data.isReady);
      }

      // Update counts
      if (data.connectedCount !== undefined && data.totalParticipants !== undefined) {
        setConnectedCount(data.connectedCount);
        setTotalParticipants(data.totalParticipants);
      }

      // Handle unread messages - only update count if chat is not open
      if (data.unreadMessages && data.unreadMessages.length > 0) {
        // Check if there are any truly NEW messages we haven't seen
        const newMessageIds = data.unreadMessages
          .map(m => m.id)
          .filter(id => !seenMessageIds.current.has(id));
        
        // Only vibrate if there are new messages AND chat is not open
        if (newMessageIds.length > 0 && !showChat) {
          Vibration.vibrate(100);
          // Add new IDs to seen set
          newMessageIds.forEach(id => seenMessageIds.current.add(id));
        }
        
        // Only update unread count from server if chat is closed
        if (!showChat) {
          setUnreadCount(data.unreadMessages.length);
        }
      } else {
        setUnreadCount(0);
      }
    },
  });

  // Join on mount
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

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        // App going to background - could disconnect here if needed
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (participantId) {
        disconnect.mutate({ participantId });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantId]);

  // Handle ready click
  const handleReady = useCallback(() => {
    if (!participantId) return;
    setReadyMutation.mutate({ participantId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantId]);

  // Handle opening chat - reset unread count
  const handleOpenChat = useCallback(() => {
    setShowChat(true);
    setUnreadCount(0);
  }, []);

  // ==================== RENDER ====================

  // Loading state
  if (isCheckingSession) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themed(colors.background.primary) }]} edges={['top']}>
        <View style={styles.centerContent}>
          <PageLoader />
          <Text variant="body" color="muted" style={{ marginTop: spacing[4] }}>
            Verifica stato stanza virtuale...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Session ended state
  if (sessionEnded) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themed(colors.background.primary) }]} edges={['top']}>
        <View style={styles.centerContent}>
          <Card style={styles.endedCard}>
            <View style={[
              styles.iconCircle,
              { backgroundColor: kickedReason ? colors.status.error.light : colors.neutral[200] }
            ]}>
              <Ionicons 
                name={kickedReason ? 'close-circle' : 'time'} 
                size={40} 
                color={kickedReason ? colors.status.error.main : colors.neutral[600]} 
              />
            </View>
            <Text variant="h4" align="center" style={{ marginTop: spacing[4] }}>
              {kickedReason ? 'Sei stato espulso' : 'Sessione terminata'}
            </Text>
            <Text variant="body" color="muted" align="center" style={{ marginTop: spacing[2] }}>
              {kickedReason || 'La sessione è stata terminata dall\'esaminatore.'}
            </Text>
            <Button
              onPress={() => router.push('/simulations')}
              style={{ marginTop: spacing[6] }}
            >
              Torna alle simulazioni
            </Button>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  // Session not active yet
  if (!sessionStatus?.hasSession) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themed(colors.background.primary) }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.mainCard}>
            {/* Icon */}
            <View style={[styles.iconCircle, { backgroundColor: colors.status.warning.light }]}>
              <Ionicons name="time-outline" size={40} color={colors.status.warning.main} />
            </View>

            <Text variant="h4" align="center" style={{ marginTop: spacing[4] }}>
              Stanza Virtuale Non Attiva
            </Text>
            <Text variant="body" color="muted" align="center" style={{ marginTop: spacing[2] }}>
              La sessione per{' '}
              <Text variant="h6">{simulationTitle}</Text>
              {' '}non è ancora stata avviata.
            </Text>

            {/* Info cards */}
            <View style={styles.infoRow}>
              <View style={[styles.infoCard, { backgroundColor: themed(colors.background.secondary) }]}>
                <Ionicons name="timer-outline" size={20} color={colors.status.warning.main} />
                <Text variant="caption" color="muted" style={{ marginTop: spacing[1] }}>Durata</Text>
                <Text variant="h6">{durationMinutes} min</Text>
              </View>
              <View style={[styles.infoCard, { backgroundColor: themed(colors.background.secondary) }]}>
                <Ionicons name="shield-outline" size={20} color={colors.status.info.main} />
                <Text variant="caption" color="muted" style={{ marginTop: spacing[1] }}>Stato</Text>
                <Text variant="h6" style={{ color: colors.status.warning.main }}>In attesa</Text>
              </View>
            </View>

            {/* Tips */}
            <View style={[styles.tipsContainer, { backgroundColor: themed(colors.background.secondary) }]}>
              <View style={styles.tipsHeader}>
                <Ionicons name="sparkles" size={16} color="#9333EA" />
                <Text variant="label" style={{ marginLeft: spacing[2] }}>Cosa fare</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: '#9333EA' }]} />
                <Text variant="bodySmall" color="muted">Attendi che l&apos;admin attivi la stanza</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: '#9333EA' }]} />
                <Text variant="bodySmall" color="muted">La pagina si aggiornerà automaticamente</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: '#9333EA' }]} />
                <Text variant="bodySmall" color="muted">Non chiudere l&apos;app</Text>
              </View>
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Main waiting room (session active, waiting for start)
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themed(colors.background.primary) }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.mainCard}>
          {/* Header with animation */}
          <View style={styles.headerSection}>
            <View style={[styles.iconCircle, { backgroundColor: colors.status.success.light }]}>
              <Ionicons name="radio" size={32} color={colors.status.success.main} />
            </View>
            <Text variant="h4" align="center" style={{ marginTop: spacing[3] }}>
              Stanza Virtuale Attiva
            </Text>
            <Text variant="body" color="muted" align="center" style={{ marginTop: spacing[2] }}>
              {simulationTitle}
            </Text>
          </View>

          {/* Connection status */}
          <View style={[styles.statusBar, { backgroundColor: themed(colors.background.secondary) }]}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: colors.status.success.main }]} />
              <Text variant="bodySmall" color="muted">Connesso</Text>
            </View>
            {totalParticipants > 0 && (
              <View style={styles.statusItem}>
                <Ionicons name="people-outline" size={16} color={themed(colors.text.muted)} />
                <Text variant="bodySmall" color="muted" style={{ marginLeft: 4 }}>
                  {connectedCount}/{totalParticipants}
                </Text>
              </View>
            )}
          </View>

          {/* Ready status */}
          <View style={styles.readySection}>
            {isReady ? (
              <View style={[styles.readyBadge, { backgroundColor: colors.status.success.light }]}>
                <Ionicons name="checkmark-circle" size={24} color={colors.status.success.main} />
                <Text variant="h6" style={{ color: colors.status.success.main, marginLeft: spacing[2] }}>
                  Sei pronto!
                </Text>
              </View>
            ) : (
              <Button
                onPress={handleReady}
                loading={setReadyMutation.isPending}
                leftIcon={<Ionicons name="checkmark-circle" size={20} color="#fff" />}
                style={{ width: '100%' }}
              >
                Sono Pronto
              </Button>
            )}
            <Text variant="caption" color="muted" align="center" style={{ marginTop: spacing[2] }}>
              {isReady 
                ? "Attendi che l'esaminatore avvii la simulazione"
                : "Clicca quando sei pronto per iniziare"}
            </Text>
          </View>

          {/* Instructions */}
          {instructions && (
            <View style={[styles.instructionsContainer, { backgroundColor: themed(colors.background.secondary) }]}>
              <View style={styles.instructionsHeader}>
                <Ionicons name="information-circle" size={20} color={colors.status.info.main} />
                <Text variant="label" style={{ marginLeft: spacing[2] }}>Istruzioni</Text>
              </View>
              <Text variant="bodySmall" color="muted" style={{ marginTop: spacing[2] }}>
                {instructions}
              </Text>
            </View>
          )}

          {/* Chat button */}
          <TouchableOpacity
            style={[styles.chatButton, { backgroundColor: themed(colors.background.secondary) }]}
            onPress={handleOpenChat}
          >
            <View style={styles.chatButtonContent}>
              <Ionicons name="chatbubbles-outline" size={24} color={colors.status.info.main} />
              <View style={{ marginLeft: spacing[3], flex: 1 }}>
                <Text variant="h6">Chat con l&apos;esaminatore</Text>
                <Text variant="caption" color="muted">Hai bisogno di aiuto?</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={themed(colors.text.muted)} />
            </View>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text variant="caption" style={{ color: '#fff', fontWeight: 'bold' }}>
                  {unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Card>
      </ScrollView>

      {/* Chat Modal */}
      {participantId && (
        <ChatModal
          participantId={participantId}
          visible={showChat}
          onClose={() => setShowChat(false)}
          onMessagesRead={(messageIds) => {
            // Add read message IDs to seenMessageIds so they don't trigger vibration again
            messageIds.forEach(id => seenMessageIds.current.add(id));
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  scrollContent: {
    padding: spacing[4],
  },
  mainCard: {
    padding: spacing[6],
    alignItems: 'center',
  },
  endedCard: {
    padding: spacing[6],
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: 20,
    marginBottom: spacing[4],
    gap: spacing[4],
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  readySection: {
    width: '100%',
    alignItems: 'center',
    marginVertical: spacing[4],
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
    width: '100%',
  },
  infoCard: {
    flex: 1,
    padding: spacing[4],
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  tipsContainer: {
    width: '100%',
    padding: spacing[4],
    borderRadius: 12,
    marginTop: spacing[4],
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing[2],
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    marginRight: spacing[2],
  },
  instructionsContainer: {
    width: '100%',
    padding: spacing[4],
    borderRadius: 12,
    marginTop: spacing[4],
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatButton: {
    width: '100%',
    padding: spacing[4],
    borderRadius: 12,
    marginTop: spacing[4],
  },
  chatButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.status.error.main,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  // Chat Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  chatModalContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    paddingHorizontal: spacing[4],
  },
  chatModal: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.status.info.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  closeButton: {
    padding: spacing[2],
  },
  messagesContainer: {
    maxHeight: 300,
  },
  messagesContent: {
    padding: spacing[4],
  },
  loadingContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMessages: {
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
  messageBubble: {
    maxWidth: '80%',
    padding: spacing[3],
    borderRadius: 16,
    marginBottom: spacing[2],
  },
  studentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.status.info.main,
    borderBottomRightRadius: 4,
  },
  adminMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderTopWidth: 1,
    gap: spacing[2],
  },
  textInput: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: 12,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.status.info.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
