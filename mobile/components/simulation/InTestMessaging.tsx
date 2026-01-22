/**
 * Leonardo School Mobile - In-Test Messaging
 * 
 * Chat component durante la simulazione per comunicare con l'esaminatore.
 * Adattato dalla webapp con ottimizzazioni per mobile.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

import { Text, PageLoader } from '../ui';
import { colors } from '../../lib/theme/colors';
import { spacing } from '../../lib/theme/spacing';
import { useTheme } from '../../contexts/ThemeContext';
import { trpc } from '../../lib/trpc';

// ==================== TYPES ====================

interface Message {
  id: string;
  senderType: 'ADMIN' | 'STUDENT';
  message: string;
  createdAt: Date;
  isRead: boolean;
}

interface InTestMessagingProps {
  participantId: string;
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
  onUnreadChange: (count: number) => void;
}

// ==================== MESSAGING BUTTON ====================

interface MessagingButtonProps {
  onPress: () => void;
  unreadCount: number;
}

export function MessagingButton({ onPress, unreadCount }: MessagingButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
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
      }}
    >
      <Ionicons name="chatbubbles" size={24} color="#fff" />
      {unreadCount > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: colors.status.error.main,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 4,
          }}
        >
          <Text variant="caption" style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
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
  const { themed } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Fetch messages - fast polling for near real-time
  const messagesQuery = trpc.virtualRoom.getMessages.useQuery(
    { participantId },
    {
      enabled: !!participantId,
      refetchInterval: 500, // Poll every 500ms for near real-time
      staleTime: 400,
    }
  );

  // Send message mutation with optimistic update
  const sendMessage = trpc.virtualRoom.sendMessage.useMutation({
    onMutate: (variables: { participantId: string; message: string }) => {
      // Optimistically add the message to the UI
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
    },
    onSuccess: () => {
      setIsSending(false);
      // Refetch to get the real message with proper ID
      messagesQuery.refetch();
    },
    onError: () => {
      setIsSending(false);
      // Remove the optimistic message on error
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
    },
  });

  // Mark messages as read mutation
  const markAsRead = trpc.virtualRoom.markMessagesRead.useMutation({
    onSuccess: () => {
      // Immediately update local unread count to 0
      onUnreadChange(0);
      // Refetch to sync with server
      messagesQuery.refetch();
    },
  });

  // Update messages when query data changes
  useEffect(() => {
    if (messagesQuery.data) {
      const serverMessages = messagesQuery.data.map((m: Message) => ({
        id: m.id,
        senderType: m.senderType as 'ADMIN' | 'STUDENT',
        message: m.message,
        createdAt: new Date(m.createdAt),
        isRead: m.isRead,
      }));

      // Merge server messages with optimistic messages (temp- prefixed)
      setMessages((prev) => {
        const optimisticMessages = prev.filter((m) => m.id.startsWith('temp-'));
        // Check if optimistic messages are now in server response
        const stillPendingOptimistic = optimisticMessages.filter((optMsg) => {
          return !serverMessages.some(
            (serverMsg: Message) =>
              serverMsg.senderType === optMsg.senderType &&
              serverMsg.message === optMsg.message &&
              Math.abs(serverMsg.createdAt.getTime() - optMsg.createdAt.getTime()) < 30000
          );
        });
        return [...serverMessages, ...stillPendingOptimistic];
      });

      // Update unread count
      const unread = serverMessages.filter(
        (m: Message) => m.senderType === 'ADMIN' && !m.isRead
      ).length;
      onUnreadChange(unread);
    }
  }, [messagesQuery.data, onUnreadChange]);

  // Mark admin messages as read when opening or when new messages arrive while open
  useEffect(() => {
    if (isOpen && participantId && unreadCount > 0 && !markAsRead.isPending) {
      markAsRead.mutate({ participantId });
    }
  }, [isOpen, participantId, unreadCount, markAsRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isOpen]);

  const handleSend = useCallback(() => {
    if (!newMessage.trim() || isSending) return;
    const messageToSend = newMessage.trim();
    setIsSending(true);
    sendMessage.mutate({
      participantId,
      message: messageToSend,
    });
  }, [newMessage, isSending, participantId, sendMessage]);

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ width: '100%' }}
        >
          <View
            style={{
              backgroundColor: themed(colors.background.card),
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '80%',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
                borderBottomWidth: 1,
                borderBottomColor: themed(colors.border.primary),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.primary.main,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: spacing[3],
                  }}
                >
                  <Ionicons name="chatbubbles" size={20} color="#fff" />
                </View>
                <Text variant="h6">Messaggi</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ padding: spacing[1] }}>
                <Ionicons
                  name="close"
                  size={24}
                  color={themed(colors.text.secondary)}
                />
              </TouchableOpacity>
            </View>

            {/* Messages list */}
            <ScrollView
              ref={scrollViewRef}
              style={{
                height: 250,
                backgroundColor: themed(colors.background.secondary),
              }}
              contentContainerStyle={{
                padding: spacing[4],
                flexGrow: 1,
              }}
              keyboardShouldPersistTaps="handled"
            >
              {messagesQuery.isLoading ? (
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: 200,
                  }}
                >
                  <PageLoader />
                </View>
              ) : messages.length === 0 ? (
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: 200,
                  }}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={48}
                    color={themed(colors.text.muted)}
                  />
                  <Text variant="body" color="muted" style={{ marginTop: spacing[2] }}>
                    Nessun messaggio
                  </Text>
                </View>
              ) : (
                messages.map((msg) => (
                  <View
                    key={msg.id}
                    style={{
                      maxWidth: '80%',
                      borderRadius: 12,
                      paddingHorizontal: spacing[3],
                      paddingVertical: spacing[2],
                      marginBottom: spacing[2],
                      alignSelf: msg.senderType === 'STUDENT' ? 'flex-end' : 'flex-start',
                      backgroundColor:
                        msg.senderType === 'STUDENT'
                          ? colors.primary.main
                          : themed(colors.background.card),
                      borderWidth: msg.senderType === 'ADMIN' ? 1 : 0,
                      borderColor: themed(colors.border.primary),
                      borderBottomRightRadius: msg.senderType === 'STUDENT' ? 4 : 12,
                      borderBottomLeftRadius: msg.senderType === 'ADMIN' ? 4 : 12,
                    }}
                  >
                    {msg.senderType === 'ADMIN' && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginBottom: 4,
                        }}
                      >
                        <Ionicons
                          name="shield"
                          size={12}
                          color={themed(colors.text.muted)}
                        />
                        <Text variant="caption" color="muted" style={{ marginLeft: 4 }}>
                          Esaminatore
                        </Text>
                      </View>
                    )}
                    <Text
                      variant="bodySmall"
                      style={{
                        color: msg.senderType === 'STUDENT' ? '#fff' : themed(colors.text.primary),
                      }}
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
                      {formatDistanceToNow(msg.createdAt, {
                        addSuffix: true,
                        locale: it,
                      })}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Input */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                padding: spacing[3],
                borderTopWidth: 1,
                borderTopColor: themed(colors.border.primary),
                gap: spacing[2],
              }}
            >
              <TextInput
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Scrivi un messaggio..."
                placeholderTextColor={themed(colors.text.muted)}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[2],
                  fontSize: 14,
                  maxHeight: 100,
                  backgroundColor: themed(colors.background.secondary),
                  color: themed(colors.text.primary),
                }}
                multiline
                maxLength={500}
                onSubmitEditing={handleSend}
                blurOnSubmit
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!newMessage.trim() || isSending}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.primary.main,
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: !newMessage.trim() || isSending ? 0.5 : 1,
                }}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={newMessage.trim() && !isSending ? '#fff' : 'rgba(255,255,255,0.5)'}
                />
              </TouchableOpacity>
            </View>

            {/* Helper text */}
            <View
              style={{
                paddingHorizontal: spacing[4],
                paddingBottom: spacing[4],
              }}
            >
              <Text variant="caption" color="muted" align="center">
                Usa questa chat per comunicare con l&apos;esaminatore
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
