/**
 * Leonardo School Mobile - New Message Screen
 * 
 * Schermata per inviare un nuovo messaggio.
 * Gli studenti possono contattare solo admin e collaboratori di riferimento.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text, Caption } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { useThemedColors } from '../contexts/ThemeContext';
import { colors } from '../lib/theme/colors';
import { AppHeader } from '../components/navigation';
import { trpc } from '../lib/trpc';
import { spacing, layout } from '../lib/theme/spacing';

interface ContactableUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function NewMessageScreen() {
  const themedColors = useThemedColors();
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Fetch contactable users
  const { data: users, isLoading: usersLoading } = trpc.messages.getContactableUsers.useQuery();

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter((u: ContactableUser) =>
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Create conversation mutation
  const createConversationMutation = trpc.messages.createConversation.useMutation({
    onError: (error: unknown) => {
      console.error('Error creating conversation:', error);
    },
  });

  const getRoleIcon = (role: string): keyof typeof Ionicons.glyphMap => {
    switch (role) {
      case 'ADMIN':
        return 'shield';
      case 'COLLABORATOR':
        return 'people';
      case 'STUDENT':
        return 'school';
      default:
        return 'person';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Admin';
      case 'COLLABORATOR':
        return 'Collaboratore';
      case 'STUDENT':
        return 'Studente';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return '#EF4444'; // red-500
      case 'COLLABORATOR':
        return '#3B82F6'; // blue-500
      case 'STUDENT':
        return '#10B981'; // green-500
      default:
        return themedColors.textMuted;
    }
  };

  const handleToggleRecipient = (userId: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSend = async () => {
    if (selectedRecipients.length === 0 || !subject.trim() || !content.trim()) {
      return;
    }

    setIsSending(true);
    try {
      // Send to all selected recipients
      for (const recipientId of selectedRecipients) {
        await createConversationMutation.mutateAsync({
          recipientId,
          subject: subject.trim(),
          content: content.trim(),
        });
      }
      
      // Navigate back to messages
      router.back();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const selectedUsers = users?.filter((u: ContactableUser) => selectedRecipients.includes(u.id)) || [];
  const canSend = selectedRecipients.length > 0 && subject.trim() && content.trim();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={[]}>
      <AppHeader
        title="Nuovo Messaggio"
        showBackButton
        onMenuPress={() => router.back()}
        rightActions={
          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSend || isSending}
            style={[
              styles.sendButton,
              { backgroundColor: canSend ? colors.primary.main : themedColors.border },
            ]}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Selected Recipients */}
          {selectedUsers.length > 0 && (
            <View style={styles.selectedSection}>
              <Caption style={{ marginBottom: spacing[2] }}>
                {selectedUsers.length} destinatar{selectedUsers.length === 1 ? 'io' : 'i'}
              </Caption>
              <View style={styles.selectedContainer}>
                {selectedUsers.map((user: ContactableUser) => (
                  <View
                    key={user.id}
                    style={[
                      styles.selectedChip,
                      { backgroundColor: `${getRoleColor(user.role)}15` },
                    ]}
                  >
                    <Ionicons
                      name={getRoleIcon(user.role)}
                      size={14}
                      color={getRoleColor(user.role)}
                    />
                    <Text variant="caption" style={{ color: getRoleColor(user.role) }}>
                      {user.name}
                    </Text>
                    <TouchableOpacity onPress={() => handleToggleRecipient(user.id)}>
                      <Ionicons name="close-circle" size={16} color={getRoleColor(user.role)} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Destinatari */}
          <View style={styles.section}>
            <Text variant="body" style={{ fontWeight: '600', marginBottom: spacing[3] }}>
              Destinatari
            </Text>

            {/* Search */}
            <View
              style={[
                styles.searchBar,
                { backgroundColor: themedColors.card, borderColor: themedColors.border },
              ]}
            >
              <Ionicons name="search" size={18} color={themedColors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: themedColors.text }]}
                placeholder="Cerca destinatari..."
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

            {/* Users List */}
            {usersLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary.main} />
              </View>
            )}
            {!usersLoading && filteredUsers.length === 0 && (
              <Card style={{ marginTop: spacing[3] }}>
                <View style={styles.emptyState}>
                  <Ionicons name="person-outline" size={48} color={themedColors.textMuted} />
                  <Text variant="body" style={{ marginTop: spacing[2], textAlign: 'center' }}>
                    {searchQuery ? 'Nessun utente trovato' : 'Nessun destinatario disponibile'}
                  </Text>
                </View>
              </Card>
            )}
            {!usersLoading && filteredUsers.length > 0 && (
              <View style={{ marginTop: spacing[3] }}>
                {filteredUsers.map((user: ContactableUser) => {
                  const isSelected = selectedRecipients.includes(user.id);
                  const roleColor = getRoleColor(user.role);

                  return (
                    <TouchableOpacity
                      key={user.id}
                      style={[
                        styles.userItem,
                        {
                          backgroundColor: isSelected
                            ? `${roleColor}10`
                            : themedColors.backgroundSecondary,
                          borderColor: isSelected ? roleColor : themedColors.border,
                        },
                      ]}
                      onPress={() => handleToggleRecipient(user.id)}
                    >
                      <View
                        style={[styles.userIcon, { backgroundColor: `${roleColor}20` }]}
                      >
                        <Ionicons name={getRoleIcon(user.role)} size={20} color={roleColor} />
                      </View>
                      <View style={styles.userInfo}>
                        <Text variant="body" style={{ fontWeight: '500' }}>
                          {user.name}
                        </Text>
                        <Caption>{getRoleLabel(user.role)}</Caption>
                      </View>
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={24}
                        color={isSelected ? roleColor : themedColors.textMuted}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Oggetto */}
          <View style={styles.section}>
            <Text variant="body" style={{ fontWeight: '600', marginBottom: spacing[2] }}>
              Oggetto
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themedColors.card,
                  borderColor: themedColors.border,
                  color: themedColors.text,
                },
              ]}
              placeholder="Scrivi l'oggetto del messaggio..."
              placeholderTextColor={themedColors.textMuted}
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          {/* Messaggio */}
          <View style={styles.section}>
            <Text variant="body" style={{ fontWeight: '600', marginBottom: spacing[2] }}>
              Messaggio
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: themedColors.card,
                  borderColor: themedColors.border,
                  color: themedColors.text,
                },
              ]}
              placeholder="Scrivi il tuo messaggio..."
              placeholderTextColor={themedColors.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: layout.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSection: {
    marginBottom: spacing[4],
  },
  selectedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: layout.borderRadius.full,
  },
  section: {
    marginBottom: spacing[6],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: layout.borderRadius.lg,
    borderWidth: 1,
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: layout.borderRadius.lg,
    borderWidth: 2,
    marginBottom: spacing[2],
  },
  userIcon: {
    width: 40,
    height: 40,
    borderRadius: layout.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  input: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: layout.borderRadius.lg,
    borderWidth: 1,
    fontSize: 15,
  },
  textArea: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: layout.borderRadius.lg,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 150,
  },
});
