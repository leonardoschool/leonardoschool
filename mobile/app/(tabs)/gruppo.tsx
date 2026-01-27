/**
 * Leonardo School Mobile - Gruppo Screen
 * 
 * Il mio gruppo: compagni di studio, informazioni gruppo.
 * Parità con webapp StudentGruppoContent.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Text, Heading3, Caption } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useThemedColors } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../lib/theme/colors';
import { spacing, layout } from '../../lib/theme/spacing';
import { DrawerMenu, AppHeader } from '../../components/navigation';
import { trpc } from '../../lib/trpc';

const groupTypeLabels: Record<string, string> = {
  STUDENTS: 'Studenti',
  COLLABORATORS: 'Collaboratori',
  MIXED: 'Misto',
};

interface GroupMember {
  memberId: string;
  name: string;
  email?: string;
  type: 'STUDENT' | 'COLLABORATOR';
  isCurrentUser: boolean;
  userId: string;
}

interface ReferenceUser {
  name: string;
  userId: string;
  isCurrentUser?: boolean;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  type: string;
  color?: string | null;
  totalMembers: number;
  joinedAt: Date | string;
  members: GroupMember[];
  referenceCollaborator?: ReferenceUser | null;
  referenceStudent?: ReferenceUser | null;
}

export default function GruppoScreen() {
  const themedColors = useThemedColors();
  const { user } = useAuthStore();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Fetch my groups - using students.getMyGroup like webapp
  const {
    data: groupsData,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.students.getMyGroup.useQuery(undefined, {
    enabled: !!user,
  });

  const groups: Group[] = (groupsData || []) as Group[];

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (index: number, type: 'STUDENT' | 'COLLABORATOR' = 'STUDENT') => {
    if (type === 'COLLABORATOR') return '#9333ea'; // purple for collaborators
    const avatarColors = [
      colors.primary.main,
      colors.status.info.main,
      colors.status.success.main,
      colors.status.warning.main,
      '#06b6d4', // cyan
      '#f97316', // orange
    ];
    return avatarColors[index % avatarColors.length];
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleMessageUser = (userId: string) => {
    router.push(`/(tabs)/messaggi?nuovo=${userId}` as never);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={[]}>
      <AppHeader 
        title={groups.length === 1 ? 'Il Mio Gruppo' : 'I Miei Gruppi'}
        onMenuPress={() => setDrawerVisible(true)} 
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary.main}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Caption style={{ marginTop: 12 }}>Caricamento gruppo...</Caption>
          </View>
        ) : groups.length === 0 ? (
          <Card variant="outlined" style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Ionicons name="people-outline" size={48} color={themedColors.textMuted} />
              <Heading3 style={{ marginTop: 16, textAlign: 'center' }}>
                Non fai parte di nessun gruppo
              </Heading3>
              <Caption style={{ marginTop: 8, textAlign: 'center' }}>
                Non sei ancora stato assegnato a un gruppo di studio.
              </Caption>
            </View>
          </Card>
        ) : (
          groups.map((group) => {
            const isExpanded = expandedGroups.has(group.id);
            
            // Sort members: current user first, then collaborators, then by name
            const sortedMembers = [...(group.members || [])].sort((a, b) => {
              if (a.isCurrentUser) return -1;
              if (b.isCurrentUser) return 1;
              if (a.type === 'COLLABORATOR' && b.type !== 'COLLABORATOR') return -1;
              if (a.type !== 'COLLABORATOR' && b.type === 'COLLABORATOR') return 1;
              return a.name.localeCompare(b.name);
            });

            return (
              <Card 
                key={group.id} 
                variant="outlined" 
                style={[
                  styles.groupCard,
                  group.color && { borderLeftWidth: 4, borderLeftColor: group.color },
                ]}
              >
                {/* Group Header - Clickable */}
                <TouchableOpacity 
                  activeOpacity={0.7}
                  onPress={() => toggleGroup(group.id)}
                >
                  <View style={styles.groupHeader}>
                    <View style={[styles.groupIconContainer, { backgroundColor: group.color || colors.primary.main }]}>
                      <Ionicons name="people" size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.groupInfo}>
                      <View style={styles.groupTitleRow}>
                        <Text variant="h4" style={{ flex: 1 }}>{group.name}</Text>
                        <Badge variant="default" size="sm">
                          {groupTypeLabels[group.type] || group.type}
                        </Badge>
                      </View>
                      {group.description && (
                        <Caption style={{ marginTop: 4 }} numberOfLines={2}>
                          {group.description}
                        </Caption>
                      )}
                    </View>
                    <Ionicons 
                      name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                      size={20} 
                      color={themedColors.textMuted} 
                    />
                  </View>

                  {/* Group Stats */}
                  <View style={styles.groupStats}>
                    <View style={styles.statItem}>
                      <Ionicons name="people-outline" size={14} color={themedColors.textMuted} />
                      <Caption>{group.totalMembers} partecipanti</Caption>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="calendar-outline" size={14} color={themedColors.textMuted} />
                      <Caption>Entrato il {formatDate(group.joinedAt)}</Caption>
                    </View>
                  </View>

                  {/* Reference Contacts */}
                  {(group.referenceCollaborator || group.referenceStudent) && (
                    <View style={styles.referencesContainer}>
                      {group.referenceCollaborator && (
                        <View style={[styles.referenceCard, styles.referenceCollaborator]}>
                          <View style={styles.referenceInfo}>
                            <View style={styles.referenceHeader}>
                              <Ionicons name="ribbon" size={14} color="#f59e0b" />
                              <Caption style={{ color: '#9333ea', fontSize: 11 }}>
                                Responsabile Collaboratore
                              </Caption>
                            </View>
                            <Text variant="body" style={{ fontWeight: '600', fontSize: 13 }}>
                              {group.referenceCollaborator.name}
                            </Text>
                          </View>
                          <TouchableOpacity 
                            style={styles.messageButton}
                            onPress={() => handleMessageUser(group.referenceCollaborator!.userId)}
                          >
                            <Ionicons name="chatbubble" size={16} color="#9333ea" />
                          </TouchableOpacity>
                        </View>
                      )}
                      
                      {group.referenceStudent && (
                        <View style={[styles.referenceCard, styles.referenceStudentCard]}>
                          <View style={styles.referenceInfo}>
                            <View style={styles.referenceHeader}>
                              <Ionicons name="ribbon" size={14} color="#f59e0b" />
                              <Caption style={{ color: colors.status.info.main, fontSize: 11 }}>
                                Responsabile Studenti
                              </Caption>
                            </View>
                            <Text variant="body" style={{ fontWeight: '600', fontSize: 13 }}>
                              {group.referenceStudent.name}
                              {group.referenceStudent.isCurrentUser && (
                                <Text style={{ color: colors.status.info.main, fontSize: 11 }}> (Tu)</Text>
                              )}
                            </Text>
                          </View>
                          {!group.referenceStudent.isCurrentUser && (
                            <TouchableOpacity 
                              style={[styles.messageButton, { backgroundColor: `${colors.status.info.main}15` }]}
                              onPress={() => handleMessageUser(group.referenceStudent!.userId)}
                            >
                              <Ionicons name="chatbubble" size={16} color={colors.status.info.main} />
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>

                {/* Expanded Members List */}
                {isExpanded && (
                  <View style={[styles.membersSection, { borderTopColor: themedColors.border }]}>
                    <View style={styles.membersSectionHeader}>
                      <Ionicons name="people" size={18} color={themedColors.textMuted} />
                      <Text variant="body" style={{ fontWeight: '600', marginLeft: 8 }}>
                        Tutti i Partecipanti ({group.totalMembers})
                      </Text>
                    </View>
                    
                    {sortedMembers.map((member, index) => (
                      <View 
                        key={member.memberId}
                        style={[
                          styles.memberRow,
                          member.isCurrentUser && styles.currentUserRow,
                          member.type === 'COLLABORATOR' && styles.collaboratorRow,
                        ]}
                      >
                        <View style={[
                          styles.memberAvatar, 
                          { backgroundColor: member.isCurrentUser 
                            ? 'rgba(255,255,255,0.2)' 
                            : getAvatarColor(index, member.type) 
                          }
                        ]}>
                          <Text 
                            variant="body" 
                            style={[
                              styles.memberAvatarText,
                              member.isCurrentUser && { color: '#FFFFFF' },
                            ]}
                          >
                            {getInitials(member.name)}
                          </Text>
                        </View>
                        <View style={styles.memberInfo}>
                          <View style={styles.memberNameRow}>
                            <Text 
                              variant="body" 
                              style={{ 
                                fontWeight: '600',
                                color: member.isCurrentUser ? '#FFFFFF' : themedColors.text,
                              }}
                            >
                              {member.name}
                            </Text>
                            {member.isCurrentUser && (
                              <View style={styles.youBadge}>
                                <Text style={styles.youBadgeText}>Tu</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.memberTypeRow}>
                            <Ionicons 
                              name={member.type === 'STUDENT' ? 'person-outline' : 'school-outline'} 
                              size={12} 
                              color={member.isCurrentUser ? 'rgba(255,255,255,0.7)' : themedColors.textMuted} 
                            />
                            <Caption style={{ 
                              marginLeft: 4, 
                              color: member.isCurrentUser ? 'rgba(255,255,255,0.7)' : themedColors.textMuted,
                            }}>
                              {member.type === 'STUDENT' ? 'Studente' : 'Collaboratore'}
                            </Caption>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>

      <DrawerMenu
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        currentRoute="/gruppo"
      />
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
  },
  emptyCard: {
    marginTop: spacing[4],
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[4],
  },
  groupCard: {
    marginBottom: spacing[4],
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  groupIconContainer: {
    width: 48,
    height: 48,
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfo: {
    flex: 1,
    marginLeft: spacing[3],
    marginRight: spacing[2],
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  groupStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    marginTop: spacing[3],
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  referencesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  referenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: layout.borderRadius.lg,
    flex: 1,
    minWidth: '45%',
  },
  referenceCollaborator: {
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.2)',
  },
  referenceStudentCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  referenceInfo: {
    flex: 1,
  },
  referenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[0.5],
  },
  messageButton: {
    width: 32,
    height: 32,
    borderRadius: layout.borderRadius.md,
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  membersSection: {
    borderTopWidth: 1,
    marginTop: spacing[4],
    paddingTop: spacing[4],
  },
  membersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: layout.borderRadius.lg,
    marginBottom: spacing[2],
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  currentUserRow: {
    backgroundColor: colors.primary.main,
  },
  collaboratorRow: {
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.2)',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  memberInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  memberTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[0.5],
  },
  youBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: spacing[3],
  },
  youBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});
