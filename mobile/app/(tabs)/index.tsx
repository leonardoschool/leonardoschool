/**
 * Leonardo School Mobile - Dashboard Screen
 * 
 * Schermata principale dello studente con overview.
 * Dati caricati dalle API tRPC reali.
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Text, Heading3, Caption } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { useThemedColors } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/theme/colors';
import { spacing, layout } from '../../lib/theme/spacing';

export default function DashboardScreen() {
  const themedColors = useThemedColors();
  const { user } = useAuthStore();
  
  // Fetch stats from API
  const { 
    data: statsData, 
    isLoading: statsLoading, 
    refetch: refetchStats,
    isRefetching: statsRefetching,
  } = trpc.students.getMyStats.useQuery(undefined, {
    enabled: !!user,
  });

  // Fetch pending simulations count
  const {
    data: simulationsData,
    isLoading: simulationsLoading,
    refetch: refetchSimulations,
    isRefetching: simulationsRefetching,
  } = trpc.simulations.getAvailableSimulations.useQuery(
    { page: 1, pageSize: 10, status: 'pending' },
    { enabled: !!user }
  );

  const isLoading = statsLoading || simulationsLoading;
  const isRefetching = statsRefetching || simulationsRefetching;

  const onRefresh = async () => {
    await Promise.all([refetchStats(), refetchSimulations()]);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  };

  const firstName = user?.name?.split(' ')[0] || 'Studente';

  // Define type for recent results
  interface RecentResult {
    id: string;
    simulationId: string;
    simulationTitle: string;
    simulationType: string;
    totalScore: number | null;
    percentageScore: number | null;
    startedAt: Date;
    completedAt: Date | null;
  }

  // Calculate stats from API data
  const stats = {
    totalSimulations: statsData?.overview?.totalSimulations || 0,
    averageScore: Math.round(statsData?.overview?.avgScore || 0),
    lastScore: statsData?.recentResults?.[0]?.percentageScore 
      ? Math.round(statsData.recentResults[0].percentageScore) 
      : 0,
    pendingSimulations: simulationsData?.pagination?.total || 0,
  };

  const recentResults: RecentResult[] = statsData?.recentResults || [];

  // Get subject progress from subjectStats
  const subjectProgress = Object.entries(statsData?.subjectStats || {}).map(([subject, data]) => ({
    subject,
    percentage: Math.round((data as { avg?: number }).avg || 0),
  })).slice(0, 5);

  if (!user) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary.main}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text variant="bodySmall" color="muted">{getGreeting()}</Text>
            <Heading3>{firstName} 👋</Heading3>
          </View>
          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: themedColors.backgroundSecondary }]}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="settings-outline" size={22} color={themedColors.text} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Caption style={styles.loadingText}>Caricamento dati...</Caption>
          </View>
        ) : (
          <>
            {/* Stats Cards */}
            <View style={styles.statsGrid}>
              <Card variant="elevated" style={styles.statCard}>
                <LinearGradient
                  colors={[colors.primary.main, colors.primary.dark]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={styles.statContent}>
                  <Ionicons name="trophy-outline" size={24} color="#FFFFFF" />
                  <Text variant="h3" style={styles.statValue}>{stats.averageScore}%</Text>
                  <Caption style={styles.statLabel}>Media Punteggio</Caption>
                </View>
              </Card>

              <Card variant="outlined" style={styles.statCard}>
                <View style={styles.statContent}>
                  <Ionicons name="document-text-outline" size={24} color={colors.primary.main} />
                  <Text variant="h3" style={styles.statValueDark}>{stats.totalSimulations}</Text>
                  <Caption>Simulazioni Completate</Caption>
                </View>
              </Card>

              <Card variant="outlined" style={styles.statCard}>
                <View style={styles.statContent}>
                  <Ionicons name="time-outline" size={24} color={colors.status.warning.main} />
                  <Text variant="h3" style={styles.statValueDark}>{stats.pendingSimulations}</Text>
                  <Caption>In Attesa</Caption>
                </View>
              </Card>

              <Card variant="outlined" style={styles.statCard}>
                <View style={styles.statContent}>
                  <Ionicons name="trending-up-outline" size={24} color={colors.status.success.main} />
                  <Text variant="h3" style={styles.statValueDark}>{stats.lastScore}%</Text>
                  <Caption>Ultimo Test</Caption>
                </View>
              </Card>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Heading3 style={styles.sectionTitle}>Azioni Rapide</Heading3>
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary.main }]}
                  onPress={() => router.push('/(tabs)/simulations')}
                >
                  <Ionicons name="play-circle" size={28} color="#FFFFFF" />
                  <Text variant="buttonSmall" style={styles.actionButtonText}>
                    Nuova Simulazione
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: themedColors.backgroundSecondary }]}
                  onPress={() => router.push('/(tabs)/statistics')}
                >
                  <Ionicons name="analytics" size={28} color={colors.primary.main} />
                  <Text variant="buttonSmall" color="primary">
                    Vedi Statistiche
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Subject Progress */}
            {subjectProgress.length > 0 && (
              <View style={styles.section}>
                <Heading3 style={styles.sectionTitle}>Progresso per Materia</Heading3>
                <Card variant="outlined" padding="md">
                  {subjectProgress.map((item, index) => (
                    <View key={item.subject} style={[styles.progressItem, index > 0 && styles.progressItemBorder]}>
                      <View style={styles.progressHeader}>
                        <Text variant="body">{item.subject}</Text>
                        <Text variant="bodySmall" color="muted">{item.percentage}%</Text>
                      </View>
                      <View style={[styles.progressBar, { backgroundColor: themedColors.border }]}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${item.percentage}%`,
                              backgroundColor: colors.primary.main,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </Card>
              </View>
            )}

            {/* Recent Simulations */}
            {recentResults.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Heading3 style={styles.sectionTitle}>Simulazioni Recenti</Heading3>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/statistics')}>
                    <Text variant="bodySmall" style={{ color: colors.primary.main }}>
                      Vedi tutte
                    </Text>
                  </TouchableOpacity>
                </View>

                {recentResults.slice(0, 3).map((result) => (
                  <Card
                    key={result.id}
                    variant="outlined"
                    padding="md"
                    style={styles.simulationCard}
                    onPress={() => router.push(`/simulation/result/${result.simulationId}`)}
                  >
                    <View style={styles.simulationHeader}>
                      <View style={styles.simulationInfo}>
                        <Text variant="body" numberOfLines={1}>{result.simulationTitle}</Text>
                        <Caption>
                          {result.completedAt 
                            ? new Date(result.completedAt).toLocaleDateString('it-IT')
                            : 'In corso'}
                        </Caption>
                      </View>
                      <View style={styles.simulationScore}>
                        <Text
                          variant="h4"
                          style={{
                            color: (result.percentageScore || 0) >= 70
                              ? colors.status.success.main
                              : (result.percentageScore || 0) >= 50
                              ? colors.status.warning.main
                              : colors.status.error.main,
                          }}
                        >
                          {Math.round(result.percentageScore || 0)}%
                        </Text>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            )}

            {/* Empty state */}
            {stats.totalSimulations === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="school-outline" size={64} color={themedColors.textMuted} />
                <Text variant="h4" style={styles.emptyTitle}>Inizia il tuo percorso!</Text>
                <Caption style={styles.emptyText}>
                  Non hai ancora completato nessuna simulazione.{'\n'}
                  Inizia subito a prepararti per il TOLC!
                </Caption>
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: colors.primary.main }]}
                  onPress={() => router.push('/(tabs)/simulations')}
                >
                  <Text variant="button" style={{ color: '#FFFFFF' }}>
                    Inizia Ora
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
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
    paddingHorizontal: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[2],
    marginBottom: spacing[6],
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: layout.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  statCard: {
    width: '47%',
    aspectRatio: 1.3,
    overflow: 'hidden',
  },
  statContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[1],
  },
  statValue: {
    color: '#FFFFFF',
    marginTop: spacing[1],
  },
  statValueDark: {
    marginTop: spacing[1],
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: layout.borderRadius.xl,
  },
  actionButtonText: {
    color: '#FFFFFF',
  },
  progressItem: {
    paddingVertical: spacing[3],
  },
  progressItemBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  simulationCard: {
    marginBottom: spacing[2],
  },
  simulationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  simulationInfo: {
    flex: 1,
    marginRight: spacing[3],
  },
  simulationScore: {
    alignItems: 'flex-end',
  },
  bottomSpacer: {
    height: spacing[8],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[16],
  },
  loadingText: {
    marginTop: spacing[3],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[6],
  },
  emptyTitle: {
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  emptyButton: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: layout.borderRadius.lg,
  },
});
