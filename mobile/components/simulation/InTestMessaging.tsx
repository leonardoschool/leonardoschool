/**
 * Leonardo School Mobile - In-Test Messaging
 * 
 * Chat component durante la simulazione per comunicare con l'esaminatore.
 * Ottimizzato per UX mobile con gestione tastiera, animazioni e accessibilità.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StyleSheet,
  Keyboard,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

import { Text, PageLoader } from '../ui';
import { colors } from '../../lib/theme/colors';
import { spacing } from '../../lib/theme/spacing';
import { useTheme } from '../../contexts/ThemeContext';
import { trpc } from '../../lib/trpc';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ==================== TYPES ====================

interface Message {
  id: string;
  senderType: 'ADMIN' | 'STUDENT';
  message: string;
  createdAt: Date;
  isRead: boolean;
}

interface InTestMessagingProps {
  readonly participantId: string;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly unreadCount: number;
  readonly onUnreadChange: (count: number) => void;
}

// ==================== MESSAGING BUTTON ====================

interface MessagingButtonProps {
  readonly onPress: () => void;
  readonly unreadCount: number;
}

export function MessagingButton({ onPress, unreadCount }: MessagingButtonProps) {
  return (
    <View>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={styles.messagingButton}
        accessibilityLabel={unreadCount > 0 ? `Chat con esaminatore, ${unreadCount} messaggi non letti` : 'Chat con esaminatore'}
        accessibilityRole="button"
      >
        <Ionicons name="chatbubbles" size={24} color="#fff" />
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ==================== MESSAGE BUBBLE ====================

interface MessageBubbleProps {
  readonly message: Message;
  readonly isStudent: boolean;
  readonly themedCardBg: string;
  readonly themedTextPrimary: string;
  readonly themedTextMuted: string;
}

function MessageBubble({ message, isStudent, themedCardBg, themedTextPrimary, themedTextMuted }: MessageBubbleProps) {
  return (
    <View
      style={[
        styles.messageBubble,
        isStudent ? styles.studentBubble : [styles.adminBubble, { backgroundColor: themedCardBg }],
      ]}
    >
      {!isStudent && (
        <View style={styles.adminLabel}>
          <Ionicons name="shield-checkmark" size={12} color={colors.primary.main} />
          <Text variant="caption" style={{ color: colors.primary.main, marginLeft: 4, fontWeight: '600' }}>
            Esaminatore
          </Text>
        </View>
      )}
      <Text
        style={[
          styles.messageText,
          { color: isStudent ? '#fff' : themedTextPrimary },
        ]}
      >
        {message.message}
      </Text>
      <Text
        style={[
          styles.messageTime,
          { color: isStudent ? 'rgba(255,255,255,0.7)' : themedTextMuted },
        ]}
      >
        {formatDistanceToNow(message.createdAt, { addSuffix: true, locale: it })}
      </Text>
    </View>
  );
}

// ==================== EMPTY STATE ====================

interface EmptyStateProps {
  readonly themedTertiaryBg: string;
  readonly themedTextMuted: string;
}

function EmptyState({ themedTertiaryBg, themedTextMuted }: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: themedTertiaryBg }]}>
        <Ionicons name="chatbubbles-outline" size={32} color={themedTextMuted} />
      </View>
      <Text variant="body" color="muted" style={styles.emptyTitle}>
        Nessun messaggio
      </Text>
      <Text variant="caption" color="muted" style={styles.emptySubtitle}>
        Scrivi per contattare l&apos;esaminatore se hai bisogno di assistenza
      </Text>
    </View>
  );
}

// ==================== MESSAGES CONTENT ====================

interface MessagesContentProps {
  readonly isLoading: boolean;
  readonly messages: Message[];
  readonly themedCardBg: string;
  readonly themedTextPrimary: string;
  readonly themedTextMuted: string;
  readonly themedTertiaryBg: string;
}

function MessagesContent({
  isLoading,
  messages,
  themedCardBg,
  themedTextPrimary,
  themedTextMuted,
  themedTertiaryBg,
}: MessagesContentProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <PageLoader />
      </View>
    );
  }
  
  if (messages.length === 0) {
    return (
      <EmptyState 
        themedTertiaryBg={themedTertiaryBg}
        themedTextMuted={themedTextMuted}
      />
    );
  }
  
  return (
    <>
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isStudent={msg.senderType === 'STUDENT'}
          themedCardBg={themedCardBg}
          themedTextPrimary={themedTextPrimary}
          themedTextMuted={themedTextMuted}
        />
      ))}
    </>
  );
}

// ==================== MAIN COMPONENT ====================

export default function InTestMessaging({
  participantId,
  isOpen,
  onClose,
  unreadCount,
  onUnreadChange,
}: InTestMessagingProps) {
  const { themed, colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Pre-compute themed colors
  const themedColors = useMemo(() => ({
    bgPrimary: themed(colors.background.primary),
    bgSecondary: themed(colors.background.secondary),
    bgCard: themed(colors.background.card),
    bgTertiary: themed(colors.background.tertiary),
    textPrimary: themed(colors.text.primary),
    textSecondary: themed(colors.text.secondary),
    textMuted: themed(colors.text.muted),
    borderPrimary: themed(colors.border.primary),
  }), [themed]);
  
  // Handle keyboard events
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Fetch messages - polling for near real-time (2 seconds for good balance)
  const messagesQuery = trpc.virtualRoom.getMessages.useQuery(
    { participantId },
    {
      enabled: !!participantId && isOpen,
      refetchInterval: isOpen ? 2000 : false, // 2 seconds - still responsive, 4x less queries
      staleTime: 1500,
    }
  );

  // Send message mutation with optimistic update
  const sendMessage = trpc.virtualRoom.sendMessage.useMutation({
    onMutate: (variables: { participantId: string; message: string }) => {
      if (!variables || typeof variables !== 'object') return;
      const messageText = variables.message || '';
      if (!messageText) return;

      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        senderType: 'STUDENT',
        message: messageText,
        createdAt: new Date(),
        isRead: true,
      };
      setMessages((prev) => [...prev, optimisticMessage]);
      setNewMessage('');
      
      // Scroll to bottom after adding message
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
    },
    onSuccess: () => {
      setIsSending(false);
      messagesQuery.refetch();
    },
    onError: () => {
      setIsSending(false);
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
    },
  });

  // Mark messages as read mutation
  const markAsRead = trpc.virtualRoom.markMessagesRead.useMutation({
    onSuccess: () => {
      onUnreadChange(0);
      messagesQuery.refetch();
    },
  });

  // Update messages when query data changes
  useEffect(() => {
    if (messagesQuery.data) {
      const serverMessages = messagesQuery.data.map((m: Message) => ({
        id: m.id,
        senderType: m.senderType,
        message: m.message,
        createdAt: new Date(m.createdAt),
        isRead: m.isRead,
      }));

      // Helper to check if optimistic message was confirmed by server
      const isMessageConfirmed = (optMsg: Message, serverList: Message[]) => {
        return serverList.some((serverMsg) =>
          serverMsg.senderType === optMsg.senderType &&
          serverMsg.message === optMsg.message &&
          Math.abs(serverMsg.createdAt.getTime() - optMsg.createdAt.getTime()) < 30000
        );
      };

      setMessages((prev) => {
        const optimisticMessages = prev.filter((m) => m.id.startsWith('temp-'));
        const stillPendingOptimistic = optimisticMessages.filter(
          (optMsg) => !isMessageConfirmed(optMsg, serverMessages)
        );
        return [...serverMessages, ...stillPendingOptimistic];
      });

      const unread = serverMessages.filter(
        (m: Message) => m.senderType === 'ADMIN' && !m.isRead
      ).length;
      onUnreadChange(unread);
    }
  }, [messagesQuery.data, onUnreadChange]);

  // Mark admin messages as read when opening
  useEffect(() => {
    if (isOpen && participantId && unreadCount > 0 && !markAsRead.isPending) {
      markAsRead.mutate({ participantId });
    }
  }, [isOpen, participantId, unreadCount, markAsRead]);

  // Track previous message count to detect new messages
  const prevMessageCount = useRef(0);

  // Scroll to bottom only when modal opens or new message arrives
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      // Only scroll if it's initial open or new messages arrived
      if (prevMessageCount.current === 0 || messages.length > prevMessageCount.current) {
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
      prevMessageCount.current = messages.length;
    }
    
    // Reset count when modal closes
    if (!isOpen) {
      prevMessageCount.current = 0;
    }
  }, [messages.length, isOpen]);

  const handleSend = useCallback(() => {
    if (!newMessage.trim() || isSending) return;
    const messageToSend = newMessage.trim();
    setIsSending(true);
    sendMessage.mutate({
      participantId,
      message: messageToSend,
    });
  }, [newMessage, isSending, participantId, sendMessage]);
  
  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const isDark = colorScheme === 'dark';

  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        
        {/* Chat Container */}
        <View
          style={[
            styles.chatContainer,
            {
              backgroundColor: themedColors.bgPrimary,
              paddingBottom: Math.max(insets.bottom, keyboardHeight > 0 ? 0 : spacing[3]),
            },
          ]}
        >
          <SafeAreaView edges={['top']} style={styles.safeArea}>
            {/* Header */}
            <View
              style={[
                styles.header,
                {
                  backgroundColor: themedColors.bgCard,
                  borderBottomColor: themedColors.borderPrimary,
                },
              ]}
            >
              <View style={styles.headerLeft}>
                <View style={styles.headerIcon}>
                  <Ionicons name="chatbubbles" size={20} color="#fff" />
                </View>
                <View>
                  <Text variant="h6" style={{ fontWeight: '600' }}>Chat Esaminatore</Text>
                  <Text variant="caption" color="muted">
                    Rispondiamo il prima possibile
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                style={[styles.closeButton, { backgroundColor: themedColors.bgSecondary }]}
                accessibilityLabel="Chiudi chat"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={20} color={themedColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Messages List */}
            <ScrollView
              ref={scrollViewRef}
              style={[styles.messagesList, { backgroundColor: themedColors.bgSecondary }]}
              contentContainerStyle={styles.messagesContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <MessagesContent
                isLoading={messagesQuery.isLoading}
                messages={messages}
                themedCardBg={themedColors.bgCard}
                themedTextPrimary={themedColors.textPrimary}
                themedTextMuted={themedColors.textMuted}
                themedTertiaryBg={themedColors.bgTertiary}
              />
            </ScrollView>

            {/* Input Area */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
            >
              <View
                style={[
                  styles.inputArea,
                  {
                    backgroundColor: themedColors.bgCard,
                    borderTopColor: themedColors.borderPrimary,
                  },
                ]}
              >
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: themedColors.bgSecondary,
                      borderColor: isDark ? themedColors.borderPrimary : 'transparent',
                    },
                  ]}
                >
                  <TextInput
                    ref={inputRef}
                    value={newMessage}
                    onChangeText={setNewMessage}
                    placeholder="Scrivi un messaggio..."
                    placeholderTextColor={themedColors.textMuted}
                    style={[styles.textInput, { color: themedColors.textPrimary }]}
                    multiline
                    maxLength={500}
                    textAlignVertical="center"
                    returnKeyType="send"
                    onSubmitEditing={handleSend}
                  />
                </View>
                
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!newMessage.trim() || isSending}
                  style={[
                    styles.sendButton,
                    (!newMessage.trim() || isSending) && styles.sendButtonDisabled,
                  ]}
                  accessibilityLabel="Invia messaggio"
                  accessibilityRole="button"
                >
                  {isSending ? (
                    <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255,255,255,0.7)" />
                  ) : (
                    <Ionicons
                      name="send"
                      size={18}
                      color={newMessage.trim() ? '#fff' : 'rgba(255,255,255,0.5)'}
                    />
                  )}
                </TouchableOpacity>
              </View>
              
              {/* Helper Text */}
              <View style={[styles.helperTextContainer, { backgroundColor: themedColors.bgCard }]}>
                <Ionicons name="information-circle-outline" size={14} color={themedColors.textMuted} />
                <Text variant="caption" color="muted" style={styles.helperText}>
                  L&apos;esaminatore può vedere i tuoi messaggi
                </Text>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  // Messaging Button
  messagingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.status.error.main,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  chatContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    minHeight: SCREEN_HEIGHT * 0.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  safeArea: {
    flex: 1,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Messages List
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing[4],
    paddingBottom: spacing[2],
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
    minHeight: 200,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  emptyTitle: {
    marginBottom: spacing[1],
    fontWeight: '500',
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 18,
  },
  
  // Message Bubble
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    marginBottom: spacing[2],
  },
  studentBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary.main,
    borderBottomRightRadius: 4,
  },
  adminBubble: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderBottomLeftRadius: 4,
  },
  adminLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  
  // Input Area
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing[3],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    borderTopWidth: 1,
    gap: spacing[2],
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: spacing[4],
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === 'ios' ? spacing[2] : spacing[1],
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  
  // Helper Text
  helperTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  helperText: {
    fontSize: 11,
  },
});
