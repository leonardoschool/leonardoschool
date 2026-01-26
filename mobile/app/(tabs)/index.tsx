/**
 * Leonardo School Mobile - Dashboard Screen
 * 
 * Schermata principale dello studente con overview.
 * Allineato alla webapp StudentDashboard.
 */

import React, { useState, useMemo } from 'react';
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
import { DrawerMenu, AppHeader } from '../../components/navigation';
import { MiniCalendar, MiniCalendarEvent } from '../../components/calendar';

export default function DashboardScreen() {
  const themedColors = useThemedColors();
  const { user } = useAuthStore();
  const [drawerVisible, setDrawerVisible] = useState(false);
  
  // Fetch detailed stats (same as webapp)
  const { 
    data: statsData, 
    isLoading: statsLoading, 
    refetch: refetchStats,
    isRefetching: statsRefetching,
  } = trpc.students.getDetailedStats.useQuery(undefined, {
    enabled: !!user?.isActive,
  });

  // Fetch contract status for non-active users
  const { 
    data: contract, 
    isLoading: contractLoading,
  } = trpc.contracts.getMyContract.useQuery(undefined, {
    enabled: !!user && !user.isActive,
    retry: false,
  });

  // Fetch pending simulations count
  const {
    data: simulationsData,
    isLoading: simulationsLoading,
    refetch: refetchSimulations,
    isRefetching: simulationsRefetching,
  } = trpc.simulations.getAvailableSimulations.useQuery(
    { page: 1, pageSize: 10, status: 'available' },
    { enabled: !!user?.isActive }
  );

  // Calculate date range for calendar events (current month + 30 days ahead)
  const calendarDateRange = useMemo(() => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date();
    end.setDate(end.getDate() + 60);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  }, []);

  // Fetch calendar events
  const {
    data: eventsData,
    isLoading: eventsLoading,
    refetch: refetchEvents,
    isRefetching: eventsRefetching,
  } = trpc.calendar.getEvents.useQuery(
    {
      startDate: calendarDateRange.start,
      endDate: calendarDateRange.end,
      onlyMyEvents: true,
      includeInvitations: true,
      includeCancelled: false,
    },
    { enabled: !!user?.isActive }
  );

  // Transform events for MiniCalendar
  const calendarEvents: MiniCalendarEvent[] = useMemo(() => {
    return (eventsData?.events || []).map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type || 'OTHER',
      startDate: new Date(e.startDate),
      endDate: new Date(e.endDate),
      isAllDay: e.isAllDay || false,
      locationType: e.locationType || 'IN_PERSON',
      locationDetails: e.locationDetails,
      onlineLink: e.onlineLink,
    }));
  }, [eventsData]);

  const isLoading = statsLoading || simulationsLoading || contractLoading || eventsLoading;
  const isRefetching = statsRefetching || simulationsRefetching || eventsRefetching;

  const onRefresh = async () => {
    await Promise.all([refetchStats(), refetchSimulations(), refetchEvents()]);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  };

  const firstName = user?.name?.split(' ')[0] || 'Studente';

  // Contract alert for non-active users (matching webapp)
  const getContractAlert = useMemo(() => {
    if (contractLoading || user?.isActive) return null;

    if (contract?.status === 'PENDING') {
      return {
        type: 'pending',
        title: 'Contratto da Firmare',
        description: 'Ti è stato assegnato un contratto. Firmalo per completare l\'iscrizione.',
        icon: 'create-outline' as const,
        color: colors.status.info.main,
      };
    }

    if (!contract && !user?.isActive) {
      return {
        type: 'waiting',
        title: 'In Attesa di Contratto',
        description: 'Il tuo profilo è completo. L\'amministrazione ti assegnerà presto un contratto.',
        icon: 'time-outline' as const,
        color: colors.status.warning.main,
      };
    }

    if (contract?.status === 'SIGNED' && !user?.isActive) {
      return {
        type: 'activation',
        title: 'In Attesa di Attivazione',
        description: 'Hai firmato il contratto. Il tuo account verrà attivato a breve.',
        icon: 'checkmark-circle-outline' as const,
        color: colors.status.success.main,
      };
    }

    return null;
  }, [contract, contractLoading, user?.isActive]);

  // Calculate stats from API data (matching webapp getDetailedStats response)
  const stats = useMemo(() => ({
    totalSimulations: statsData?.overview?.totalSimulations || 0,
    averageScore: Math.round(statsData?.overview?.averageScore || statsData?.overview?.avgPercentage || 0),
    lastScore: statsData?.recentResults?.[0]?.percentageScore 
      ? Math.round(statsData.recentResults[0].percentageScore) 
      : 0,
    pendingSimulations: simulationsData?.pagination?.total || 0,
    improvement: statsData?.overview?.improvement || 0,
  }), [statsData, simulationsData]);

  // Get subject progress from subjectBreakdown (getDetailedStats response)
  interface SubjectProgressItem {
    subject: string;
    percentage: number;
  }
  
  const subjectProgress: SubjectProgressItem[] = useMemo(() => {
    const breakdown = statsData?.subjectBreakdown || [];
    return breakdown.map((item: { subject: { name: string }; avgScore: number }) => ({
      subject: item.subject?.name || 'Sconosciuto',
      percentage: Math.round(item.avgScore || 0),
    })).slice(0, 5);
  }, [statsData?.subjectBreakdown]);

  if (!user) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={[]}>
      <AppHeader 
        title="Dashboard" 
        onMenuPress={() => setDrawerVisible(true)} 
      />
      
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
        {/* Contract Alert for non-active users */}
        {getContractAlert && (
          <Card variant="outlined" style={[styles.alertCard, { borderLeftWidth: 4, borderLeftColor: getContractAlert.color }]}>
            <View style={styles.alertContent}>
              <View style={[styles.alertIcon, { backgroundColor: `${getContractAlert.color}20` }]}>
                <Ionicons name={getContractAlert.icon} size={24} color={getContractAlert.color} />
              </View>
              <View style={styles.alertTextContainer}>
                <Text variant="body" style={{ fontWeight: '600' }}>{getContractAlert.title}</Text>
                <Caption style={{ marginTop: 2 }}>{getContractAlert.description}</Caption>
              </View>
            </View>
          </Card>
        )}

        {/* Welcome Header */}
        <View style={styles.header}>
          <View>
            <Text variant="bodySmall" color="muted">{getGreeting()}</Text>
            <Heading3>{firstName} 👋</Heading3>
          </View>
          {user.isActive && (
            <View style={[styles.activeBadge, { backgroundColor: `${colors.status.success.main}20` }]}>
              <Ionicons name="checkmark-circle" size={14} color={colors.status.success.main} />
              <Text variant="caption" style={{ color: colors.status.success.main, marginLeft: 4 }}>Attivo</Text>
            </View>
          )}
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

            {/* Self-Practice CTA - Hero Button (matching webapp) */}
            {user.isActive && (
              <TouchableOpacity
                style={styles.selfPracticeButton}
                onPress={() => router.push('/(tabs)/simulations')}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#4F46E5', '#7C3AED', '#DB2777']}
                  style={styles.selfPracticeContent}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.selfPracticeIcon}>
                    <Ionicons name="flash" size={28} color="#FFFFFF" />
                  </View>
                  <View style={styles.selfPracticeTextContainer}>
                    <Text variant="h4" style={{ color: '#FFFFFF' }}>
                      Autoesercitazione ✨
                    </Text>
                    <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.9)', marginTop: 2 }}>
                      Quiz personalizzati con materie e difficoltà
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Mini Calendar */}
            <View style={styles.section}>
              <MiniCalendar 
                events={calendarEvents} 
                isLoading={eventsLoading}
                showViewAllButton={true}
              />
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

            {/* Motivation Section (matching webapp) */}
            {stats.totalSimulations > 0 && (
              <Card variant="outlined" style={styles.motivationCard}>
                <View style={styles.motivationContent}>
                  <View style={[styles.motivationIcon, { backgroundColor: themedColors.backgroundSecondary }]}>
                    <Ionicons name="trending-up" size={24} color={colors.primary.main} />
                  </View>
                  <View style={styles.motivationTextContainer}>
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      {stats.improvement > 0 
                        ? '📈 Stai migliorando!' 
                        : stats.totalSimulations >= 5 
                          ? '💪 Continua così!' 
                          : '🚀 Ottimo inizio!'}
                    </Text>
                    <Caption style={{ marginTop: 2 }}>
                      {stats.improvement > 0 
                        ? `+${stats.improvement.toFixed(1)}% rispetto alle prime simulazioni!`
                        : stats.totalSimulations >= 5
                          ? `${stats.totalSimulations} simulazioni completate. Continua!`
                          : `Hai già ${stats.totalSimulations} simulazioni. Vai avanti!`}
                    </Caption>
                  </View>
                </View>
              </Card>
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

      <DrawerMenu
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        currentRoute="/"
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
  sectionTitle: {
    marginBottom: spacing[3],
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
  // Alert styles for contract status
  alertCard: {
    marginBottom: spacing[4],
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTextContainer: {
    flex: 1,
    marginLeft: spacing[3],
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: layout.borderRadius.full,
  },
  // Self practice button
  selfPracticeButton: {
    marginBottom: spacing[6],
    borderRadius: layout.borderRadius.xl,
    overflow: 'hidden',
  },
  selfPracticeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
  },
  selfPracticeIcon: {
    width: 48,
    height: 48,
    borderRadius: layout.borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfPracticeTextContainer: {
    flex: 1,
    marginLeft: spacing[3],
  },
  // Motivation section
  motivationCard: {
    marginBottom: spacing[6],
  },
  motivationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  motivationIcon: {
    width: 44,
    height: 44,
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  motivationTextContainer: {
    flex: 1,
    marginLeft: spacing[3],
  },
});
