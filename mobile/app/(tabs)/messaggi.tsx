/**
 * Leonardo School Mobile - Messaggi Screen
 * 
 * Chat con docenti e staff - allineato con webapp.
 * Supporta filtri (tutte/non lette/archiviate), ricerca e navigazione alla chat.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
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

// Filter types matching webapp
type ConversationFilter = 'all' | 'unread' | 'archived';

// Interface matching API response from server/trpc/routers/messages.ts
interface Conversation {
  id: string;
  type: 'DIRECT' | 'GROUP';
  name: string | null;
  isArchived: boolean;
  lastMessageAt: Date | string | null;
  unreadCount: number;
  lastMessage: {
    id: string;
    content: string;
    createdAt: Date | string;
    sender: {
      id: string;
      name: string;
    };
  } | null;
  otherParticipants: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
}

export default function MessaggiScreen() {
  const themedColors = useThemedColors();
  const { user } = useAuthStore();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch conversations with filter - matching webapp call
  const {
    data: conversationsData,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.messages.getConversations.useQuery(
    { filter, pageSize: 50 },
    { enabled: !!user }
  );

  // Extract conversations from response (API returns { conversations, totalCount, ... })
  const conversations = useMemo(() => {
    return conversationsData?.conversations || [];
  }, [conversationsData]);

  // Filter by search query and unread filter (matching webapp logic)
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv: Conversation) => {
      // Apply unread filter (archived is already handled by the API)
      if (filter === 'unread' && conv.unreadCount === 0) return false;
      
      // Apply search filter
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        conv.name?.toLowerCase().includes(query) ||
        conv.otherParticipants.some(p => 
          p.name.toLowerCase().includes(query) ||
          p.email.toLowerCase().includes(query)
        )
      );
    });
  }, [conversations, filter, searchQuery]);

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
      COLLABORATOR: { label: 'Collaboratore', color: colors.status.info.main },
      STUDENT: { label: 'Studente', color: colors.status.success.main },
    };
    return roleMap[role] || { label: role, color: themedColors.textMuted };
  };

  const handleConversationPress = (conversation: Conversation) => {
    router.push({
      pathname: '/conversation/[id]' as never,
      params: { id: conversation.id },
    });
  };

  const filterOptions: Array<{ value: ConversationFilter; label: string; icon: string }> = [
    { value: 'all', label: 'Tutte', icon: 'mail-outline' },
    { value: 'unread', label: 'Non lette', icon: 'mail-unread-outline' },
    { value: 'archived', label: 'Archiviate', icon: 'archive-outline' },
  ];

  const renderConversation = ({ item }: { item: Conversation }) => {
    const hasUnread = item.unreadCount > 0;
    const mainParticipant = item.otherParticipants[0];
    const roleBadge = getRoleBadge(mainParticipant?.role || '');

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
                {mainParticipant ? getInitials(mainParticipant.name) : '?'}
              </Text>
            </View>

            {/* Content */}
            <View style={styles.conversationContent}>
              <View style={styles.conversationHeader}>
                <View style={styles.nameRow}>
                  <Text
                    variant="body"
                    style={[
                      styles.userName,
                      { color: themedColors.text },
                      hasUnread && { fontWeight: '700' },
                    ]}
                    numberOfLines={1}
                  >
                    {mainParticipant?.name || 'Utente'}
                  </Text>
                  {item.otherParticipants.length > 1 && (
                    <Caption style={{ color: themedColors.textMuted, marginLeft: 4 }}>
                      +{item.otherParticipants.length - 1}
                    </Caption>
                  )}
                </View>
                {item.lastMessageAt && (
                  <Caption style={{ color: hasUnread ? colors.primary.main : themedColors.textMuted }}>
                    {formatTime(item.lastMessageAt)}
                  </Caption>
                )}
              </View>
              
              {/* Role Badge */}
              <View style={styles.roleRow}>
                <View style={[styles.roleBadge, { backgroundColor: `${roleBadge.color}20` }]}>
                  <Text variant="caption" style={{ color: roleBadge.color }}>
                    {roleBadge.label}
                  </Text>
                </View>
              </View>
              
              {/* Subject/Name */}
              {item.name && (
                <Text
                  variant="bodySmall"
                  style={[styles.subject, { color: themedColors.textSecondary }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
              )}
              
              {/* Last message preview */}
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
                  {item.lastMessage.sender.id !== mainParticipant?.id ? 'Tu: ' : ''}
                  {item.lastMessage.content.substring(0, 50)}
                  {item.lastMessage.content.length > 50 ? '...' : ''}
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

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: themedColors.card }]}>
        <View style={[styles.searchBar, { backgroundColor: themedColors.background }]}>
          <Ionicons name="search" size={18} color={themedColors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: themedColors.text }]}
            placeholder="Cerca conversazioni..."
            placeholderTextColor={themedColors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={themedColors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Filter Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterChip,
                filter === option.value
                  ? { backgroundColor: colors.primary.main }
                  : { backgroundColor: themedColors.background },
              ]}
              onPress={() => setFilter(option.value)}
            >
              <Ionicons
                name={option.icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={filter === option.value ? '#FFFFFF' : themedColors.textMuted}
              />
              <Text
                variant="caption"
                style={{
                  color: filter === option.value ? '#FFFFFF' : themedColors.textMuted,
                  marginLeft: 4,
                  fontWeight: filter === option.value ? '600' : '400',
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Unread Count Badge */}
      {conversationsData && conversationsData.unreadCount > 0 && (
        <View style={styles.unreadCountContainer}>
          <Caption style={{ color: themedColors.textMuted }}>
            {conversationsData.unreadCount} conversazion{conversationsData.unreadCount === 1 ? 'e' : 'i'} non lett{conversationsData.unreadCount === 1 ? 'a' : 'e'}
          </Caption>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={{ marginTop: 12, color: themedColors.textMuted }}>
            Caricamento conversazioni...
          </Text>
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Card variant="outlined" style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Ionicons 
                name={filter === 'archived' ? 'archive-outline' : filter === 'unread' ? 'mail-unread-outline' : 'chatbubbles-outline'} 
                size={48} 
                color={themedColors.textMuted} 
              />
              <Heading3 style={{ marginTop: 16, textAlign: 'center' }}>
                {filter === 'archived' 
                  ? 'Nessuna conversazione archiviata'
                  : filter === 'unread'
                    ? 'Nessun messaggio non letto'
                    : 'Nessuna conversazione'
                }
              </Heading3>
              <Caption style={{ marginTop: 8, textAlign: 'center' }}>
                {filter === 'all' 
                  ? 'Le conversazioni con i docenti e lo staff appariranno qui.'
                  : 'Cambia filtro per vedere altre conversazioni.'
                }
              </Caption>
            </View>
          </Card>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  unreadCountContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userName: {
    fontWeight: '600',
    flexShrink: 1,
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
  subject: {
    marginTop: 2,
    fontWeight: '500',
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
