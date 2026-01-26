/**
 * Leonardo School Mobile - Conversation Detail Screen
 * 
 * Chat view for a specific conversation.
 * Matches webapp MessagesPageContent chat functionality.
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text, Caption } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { useThemedColors } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../lib/theme/colors';
import { trpc } from '../../lib/trpc';

// Interface matching API response from getMessages
interface Message {
  id: string;
  content: string;
  createdAt: Date | string;
  senderId: string;
  senderName: string;
  senderRole: string;
  isEdited: boolean;
  isMine: boolean;
}

export default function ConversationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const themedColors = useThemedColors();
  const { user } = useAuthStore();
  const [newMessage, setNewMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const utils = trpc.useUtils();

  // Fetch messages for this conversation
  const {
    data: messagesData,
    isLoading,
    refetch,
  } = trpc.messages.getMessages.useQuery(
    { conversationId: id || '' },
    { 
      enabled: !!id && !!user,
      refetchInterval: 10000, // Poll every 10 seconds
      staleTime: 0, // Always consider data stale
      refetchOnMount: 'always', // Always refetch when component mounts
      refetchOnWindowFocus: true, // Refetch when app comes to foreground
    }
  );

  // Send message mutation
  const sendMessageMutation = trpc.messages.sendMessage.useMutation({
    onSuccess: () => {
      setNewMessage('');
      refetch();
      // Also refresh conversations list
      utils.messages.getConversations.invalidate();
    },
    onError: (error: { message?: string }) => {
      Alert.alert('Errore', error.message || 'Impossibile inviare il messaggio');
    },
  });

  // Archive toggle mutation
  const toggleArchiveMutation = trpc.messages.toggleArchive.useMutation({
    onSuccess: (data: { isArchived: boolean }) => {
      Alert.alert(
        data.isArchived ? 'Archiviata' : 'Ripristinata',
        data.isArchived 
          ? 'La conversazione è stata archiviata.' 
          : 'La conversazione è stata ripristinata.'
      );
      utils.messages.getConversations.invalidate();
      if (data.isArchived) {
        router.back();
      }
    },
    onError: (error: { message?: string }) => {
      Alert.alert('Errore', error.message || 'Impossibile archiviare la conversazione');
    },
  });

  // Mark conversation as read mutation
  const markAsReadMutation = trpc.messages.markAsRead.useMutation({
    onSuccess: () => {
      // Refresh conversations list to update unread count
      utils.messages.getConversations.invalidate();
    },
  });

  // Refetch messages when screen is focused (coming back from navigation or app foreground)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Also refetch when app comes back from background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        refetch();
      }
    });
    return () => subscription.remove();
  }, [refetch]);

  // Mark conversation as read when opening
  useEffect(() => {
    if (id && messagesData?.messages && messagesData.messages.length > 0) {
      markAsReadMutation.mutate({ conversationId: id });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, messagesData?.messages?.length]);

  // Scroll to bottom when messages load or new message arrives
  useEffect(() => {
    if (messagesData?.messages && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messagesData?.messages]);

  const messages = useMemo(() => {
    return messagesData?.messages || [];
  }, [messagesData]);

  const conversation = messagesData?.conversation;
  const otherParticipants = conversation?.otherParticipants || [];
  const mainParticipant = otherParticipants[0];

  const handleSend = async () => {
    if (!newMessage.trim() || !id) return;

    await sendMessageMutation.mutateAsync({
      conversationId: id,
      content: newMessage.trim(),
    });
  };

  const handleArchive = () => {
    if (!id) return;

    Alert.alert(
      'Archivia conversazione',
      'Vuoi archiviare questa conversazione? Potrai sempre ripristinarla in seguito.',
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Archivia', 
          style: 'destructive',
          onPress: () => toggleArchiveMutation.mutate({ conversationId: id }),
        },
      ]
    );
  };

  const formatMessageTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Oggi';
    } else if (diffDays === 1) {
      return 'Ieri';
    } else {
      const isSameYear = d.getFullYear() === now.getFullYear();
      return d.toLocaleDateString('it-IT', { 
        day: 'numeric', 
        month: 'long',
        year: isSameYear ? undefined : 'numeric',
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    const roleColors: Record<string, string> = {
      ADMIN: colors.primary.main,
      COLLABORATOR: colors.status.info.main,
      STUDENT: colors.status.success.main,
    };
    return roleColors[role] || themedColors.textMuted;
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: Array<{ date: string; messages: Message[] }> = [];
    let currentDate = '';

    messages.forEach((msg: Message) => {
      const msgDate = formatMessageDate(msg.createdAt);
      if (msgDate === currentDate) {
        const lastGroup = groups.at(-1);
        if (lastGroup) {
          lastGroup.messages.push(msg);
        }
      } else {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      }
    });

    return groups;
  }, [messages]);

  const renderMessage = (message: Message) => {
    const isMe = message.isMine;
    const roleColor = getRoleColor(message.senderRole);

    return (
      <View 
        key={message.id}
        style={[
          styles.messageContainer,
          isMe ? styles.myMessage : styles.theirMessage,
        ]}
      >
        {!isMe && (
          <View style={[styles.messageAvatar, { backgroundColor: roleColor }]}>
            <Text variant="caption" style={styles.avatarText}>
              {getInitials(message.senderName)}
            </Text>
          </View>
        )}
        <View 
          style={[
            styles.messageBubble,
            isMe 
              ? { backgroundColor: colors.primary.main }
              : { backgroundColor: themedColors.card },
          ]}
        >
          {!isMe && (
            <Text 
              variant="caption" 
              style={[styles.senderName, { color: roleColor }]}
            >
              {message.senderName}
            </Text>
          )}
          <Text 
            variant="body" 
            style={{ color: isMe ? '#FFFFFF' : themedColors.text }}
          >
            {message.content}
          </Text>
          <Text 
            variant="caption" 
            style={[
              styles.messageTime,
              { color: isMe ? 'rgba(255,255,255,0.7)' : themedColors.textMuted },
            ]}
          >
            {formatMessageTime(message.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  const renderDateHeader = (date: string) => (
    <View style={styles.dateHeader}>
      <View style={[styles.datePill, { backgroundColor: themedColors.backgroundSecondary }]}>
        <Caption style={{ color: themedColors.textMuted }}>{date}</Caption>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: mainParticipant?.name || 'Chat',
          headerStyle: { backgroundColor: themedColors.background },
          headerTintColor: themedColors.text,
          headerRight: () => (
            <TouchableOpacity onPress={handleArchive} style={styles.headerButton}>
              <Ionicons name="archive-outline" size={22} color={themedColors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <SafeAreaView 
        style={[styles.container, { backgroundColor: themedColors.background }]} 
        edges={['bottom']}
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary.main} />
              <Text style={{ marginTop: 12, color: themedColors.textMuted }}>
                Caricamento messaggi...
              </Text>
            </View>
          )}
          {!isLoading && messages.length === 0 && (
            <View style={styles.emptyContainer}>
              <Card style={styles.emptyCard}>
                <View style={styles.emptyContent}>
                  <Ionicons name="chatbubble-outline" size={48} color={themedColors.textMuted} />
                  <Text style={{ marginTop: 16, textAlign: 'center', color: themedColors.textMuted }}>
                    Nessun messaggio ancora.{'\n'}Inizia la conversazione!
                  </Text>
                </View>
              </Card>
            </View>
          )}
          {!isLoading && messages.length > 0 && (
            <FlatList
              ref={flatListRef}
              data={groupedMessages}
              renderItem={({ item }) => (
                <View>
                  {renderDateHeader(item.date)}
                  {item.messages.map(renderMessage)}
                </View>
              )}
              keyExtractor={(item) => item.date}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />
          )}

          {/* Input Area */}
          <View style={[styles.inputContainer, { backgroundColor: themedColors.card, borderTopColor: themedColors.border }]}>
            <TextInput
              style={[
                styles.textInput,
                { 
                  backgroundColor: themedColors.input,
                  color: themedColors.text,
                  minHeight: 44,
                },
              ]}
              placeholder="Scrivi un messaggio..."
              placeholderTextColor={themedColors.textMuted}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={5000}
              scrollEnabled
              textAlignVertical="center"
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { 
                  backgroundColor: newMessage.trim() ? colors.primary.main : themedColors.border,
                },
              ]}
              onPress={handleSend}
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  headerButton: {
    padding: 8,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  datePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  theirMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  senderName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  messageTime: {
    marginTop: 4,
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 12,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 12,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
