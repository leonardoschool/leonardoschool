/**
 * Leonardo School Mobile - Gruppo Screen
 * 
 * Il mio gruppo: compagni di studio, informazioni gruppo.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text, Heading3, Caption } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { useThemedColors } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../lib/theme/colors';
import { DrawerMenu, AppHeader } from '../../components/navigation';
import { trpc } from '../../lib/trpc';

interface GroupMember {
  id: string;
  name: string;
  email: string;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  students: GroupMember[];
  _count?: {
    students: number;
  };
}

export default function GruppoScreen() {
  const themedColors = useThemedColors();
  const { user } = useAuthStore();
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Fetch my group
  const {
    data: groupData,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.groups.getMyGroup.useQuery(undefined, {
    enabled: !!user,
  });

  const group: Group | null = groupData as Group | null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (index: number) => {
    const avatarColors = [
      colors.primary.main,
      colors.status.info.main,
      colors.status.success.main,
      colors.status.warning.main,
      '#9333ea', // purple
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#f97316', // orange
    ];
    return avatarColors[index % avatarColors.length];
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={[]}>
      <AppHeader 
        title="Il Mio Gruppo" 
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
            <Text>Caricamento gruppo...</Text>
          </View>
        ) : !group ? (
          <Card variant="outlined" style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Ionicons name="people-outline" size={48} color={themedColors.textMuted} />
              <Heading3 style={{ marginTop: 16, textAlign: 'center' }}>
                Non sei ancora in un gruppo
              </Heading3>
              <Caption style={{ marginTop: 8, textAlign: 'center' }}>
                Verrai assegnato a un gruppo di studio dall&apos;amministrazione.
              </Caption>
            </View>
          </Card>
        ) : (
          <>
            {/* Group Info Card */}
            <Card variant="elevated" style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <View style={[styles.groupIconContainer, { backgroundColor: colors.primary.main }]}>
                  <Ionicons name="people" size={28} color="#FFFFFF" />
                </View>
                <View style={styles.groupInfo}>
                  <Heading3 style={{ color: themedColors.text }}>{group.name}</Heading3>
                  <Caption>
                    {group.students?.length || group._count?.students || 0} membri
                  </Caption>
                </View>
              </View>
              {group.description && (
                <Caption style={{ marginTop: 12, color: themedColors.textMuted }}>
                  {group.description}
                </Caption>
              )}
            </Card>

            {/* Members Section */}
            <View style={styles.sectionHeader}>
              <Heading3 style={{ color: themedColors.text }}>Compagni di Gruppo</Heading3>
            </View>

            {group.students?.map((member, index) => {
              const isCurrentUser = member.id === user?.id;
              return (
                <Card
                  key={member.id}
                  variant="outlined"
                  style={[
                    styles.memberCard,
                    isCurrentUser && { borderColor: colors.primary.main, borderWidth: 2 },
                  ]}
                >
                  <View style={styles.memberRow}>
                    <View style={[styles.memberAvatar, { backgroundColor: getAvatarColor(index) }]}>
                      <Text variant="body" style={styles.memberAvatarText}>
                        {getInitials(member.name)}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text variant="body" style={{ fontWeight: '600', color: themedColors.text }}>
                        {member.name}
                        {isCurrentUser && ' (Tu)'}
                      </Text>
                      <Caption>{member.email}</Caption>
                    </View>
                    {isCurrentUser && (
                      <View style={[styles.youBadge, { backgroundColor: `${colors.primary.main}20` }]}>
                        <Text variant="caption" style={{ color: colors.primary.main }}>
                          Tu
                        </Text>
                      </View>
                    )}
                  </View>
                </Card>
              );
            })}

            {(!group.students || group.students.length === 0) && (
              <Card variant="outlined" style={styles.emptyCard}>
                <View style={styles.emptyContent}>
                  <Caption style={{ textAlign: 'center' }}>
                    Nessun altro membro nel gruppo al momento.
                  </Caption>
                </View>
              </Card>
            )}
          </>
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
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCard: {
    marginTop: 20,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  groupCard: {
    marginBottom: 20,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfo: {
    flex: 1,
    marginLeft: 16,
  },
  sectionHeader: {
    marginBottom: 12,
    marginTop: 8,
  },
  memberCard: {
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  youBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
