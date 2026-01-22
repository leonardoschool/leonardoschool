/**
 * Leonardo School Mobile - Messaggi Screen
 * 
 * Chat con docenti e staff.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text, Heading3, Caption } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { useThemedColors } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../lib/theme/colors';
import { DrawerMenu, AppHeader } from '../../components/navigation';
import { trpc } from '../../lib/trpc';

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    name: string;
    role: string;
  };
  lastMessage: {
    id: string;
    content: string;
    createdAt: Date | string;
    isFromMe: boolean;
  } | null;
  unreadCount: number;
}

export default function MessaggiScreen() {
  const themedColors = useThemedColors();
  const { user } = useAuthStore();
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Fetch conversations
  const {
    data: conversationsData,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.messages.getConversations.useQuery(undefined, {
    enabled: !!user,
  });

  const conversations: Conversation[] = (conversationsData || []) as Conversation[];

  const formatTime = (date: Date | string) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return messageDate.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffDays === 1) {
      return 'Ieri';
    } else if (diffDays < 7) {
      return messageDate.toLocaleDateString('it-IT', { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short',
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

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; color: string }> = {
      ADMIN: { label: 'Admin', color: colors.primary.main },
      COLLABORATOR: { label: 'Docente', color: colors.status.info.main },
      STUDENT: { label: 'Studente', color: colors.status.success.main },
    };
    return roleMap[role] || { label: role, color: themedColors.textMuted };
  };

  const handleConversationPress = (conversation: Conversation) => {
    // Navigate to conversation detail
    router.push({
      pathname: '/(tabs)/messaggi/[id]' as never,
      params: { id: conversation.id },
    });
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const hasUnread = item.unreadCount > 0;
    const roleBadge = getRoleBadge(item.otherUser.role);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleConversationPress(item)}
      >
        <Card
          variant="outlined"
          style={[
            styles.conversationCard,
            hasUnread && { borderLeftWidth: 3, borderLeftColor: colors.primary.main },
          ]}
        >
          <View style={styles.conversationRow}>
            {/* Avatar */}
            <View style={[styles.avatar, { backgroundColor: roleBadge.color }]}>
              <Text variant="body" style={styles.avatarText}>
                {getInitials(item.otherUser.name)}
              </Text>
            </View>

            {/* Content */}
            <View style={styles.conversationContent}>
              <View style={styles.conversationHeader}>
                <Text
                  variant="body"
                  style={[
                    styles.userName,
                    { color: themedColors.text },
                    hasUnread && { fontWeight: '700' },
                  ]}
                  numberOfLines={1}
                >
                  {item.otherUser.name}
                </Text>
                {item.lastMessage && (
                  <Caption style={{ color: hasUnread ? colors.primary.main : themedColors.textMuted }}>
                    {formatTime(item.lastMessage.createdAt)}
                  </Caption>
                )}
              </View>
              <View style={styles.roleRow}>
                <View style={[styles.roleBadge, { backgroundColor: `${roleBadge.color}20` }]}>
                  <Text variant="caption" style={{ color: roleBadge.color }}>
                    {roleBadge.label}
                  </Text>
                </View>
              </View>
              {item.lastMessage && (
                <Text
                  variant="bodySmall"
                  style={[
                    styles.lastMessage,
                    { color: hasUnread ? themedColors.text : themedColors.textMuted },
                    hasUnread && { fontWeight: '500' },
                  ]}
                  numberOfLines={1}
                >
                  {item.lastMessage.isFromMe ? 'Tu: ' : ''}
                  {item.lastMessage.content}
                </Text>
              )}
            </View>

            {/* Unread Badge */}
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text variant="caption" style={styles.unreadText}>
                  {item.unreadCount > 9 ? '9+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={[]}>
      <AppHeader 
        title="Messaggi" 
        onMenuPress={() => setDrawerVisible(true)} 
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text>Caricamento conversazioni...</Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Card variant="outlined" style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Ionicons name="chatbubbles-outline" size={48} color={themedColors.textMuted} />
              <Heading3 style={{ marginTop: 16, textAlign: 'center' }}>
                Nessuna conversazione
              </Heading3>
              <Caption style={{ marginTop: 8, textAlign: 'center' }}>
                Le conversazioni con i docenti e lo staff appariranno qui.
              </Caption>
            </View>
          </Card>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.primary.main}
            />
          }
        />
      )}

      <DrawerMenu
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        currentRoute="/messaggi"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  },
  emptyCard: {
    marginTop: 20,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  conversationCard: {
    marginBottom: 10,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  conversationContent: {
    flex: 1,
    marginLeft: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    flex: 1,
    fontWeight: '600',
  },
  roleRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lastMessage: {
    marginTop: 4,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
