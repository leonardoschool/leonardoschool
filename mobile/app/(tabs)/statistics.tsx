/**
 * Leonardo School Mobile - Statistics Screen
 * 
 * Statistiche e progressi dello studente.
 * Allineato alla webapp StudentStatisticheContent.tsx
 */

import React, { useState } from 'react';
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

import { AppHeader, DrawerMenu } from '../../components/navigation';

import { Text, Body, Caption } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useThemedColors } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/theme/colors';
import { spacing, layout } from '../../lib/theme/spacing';

// Type labels
const TYPE_LABELS: Record<string, string> = {
  OFFICIAL: 'Ufficiali',
  PRACTICE: 'Pratica',
  CUSTOM: 'Personalizzate',
  QUICK_QUIZ: 'Quiz Veloci',
};

const TYPE_COLORS: Record<string, string> = {
  OFFICIAL: '#3B82F6',
  PRACTICE: '#22C55E',
  CUSTOM: '#a8012b',
  QUICK_QUIZ: '#F59E0B',
};

const SUBJECT_LABELS: Record<string, string> = {
  BIOLOGIA: 'Biologia',
  CHIMICA: 'Chimica',
  FISICA: 'Fisica',
  MATEMATICA: 'Matematica',
  LOGICA: 'Logica',
  CULTURA_GENERALE: 'Cultura Generale',
};

export default function StatisticsScreen() {
  const themedColors = useThemedColors();
  const { user } = useAuthStore();
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Fetch detailed stats from API (same as webapp)
  const {
    data: stats,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.students.getDetailedStats.useQuery(undefined, {
    enabled: !!user,
  });

  const onRefresh = async () => {
    await refetch();
  };

  if (!user) return null;

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={[]}>
        <AppHeader title="Statistiche" onMenuPress={() => setDrawerVisible(true)} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Caption style={styles.loadingText}>Caricamento statistiche...</Caption>
        </View>
        <DrawerMenu visible={drawerVisible} onClose={() => setDrawerVisible(false)} currentRoute="/statistics" />
      </SafeAreaView>
    );
  }

  // Empty state
  if (!stats || stats.overview.totalSimulations === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={[]}>
        <AppHeader title="Statistiche" onMenuPress={() => setDrawerVisible(true)} />
        <View style={styles.emptyState}>
          <LinearGradient
            colors={[colors.primary.main, colors.primary.dark]}
            style={styles.emptyIcon}
          >
            <Ionicons name="bar-chart" size={40} color="#FFFFFF" />
          </LinearGradient>
          <Text variant="h4" style={styles.emptyTitle}>
            Nessuna simulazione completata
          </Text>
          <Body color="muted" align="center" style={styles.emptyText}>
            Inizia a fare le simulazioni per vedere le tue statistiche e monitorare i tuoi progressi.
          </Body>
          <Button
            variant="primary"
            onPress={() => router.push('/(tabs)/simulations' as never)}
            style={styles.ctaButton}
          >
            <Ionicons name="flash" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            Inizia una simulazione
          </Button>
        </View>
        <DrawerMenu visible={drawerVisible} onClose={() => setDrawerVisible(false)} currentRoute="/statistics" />
      </SafeAreaView>
    );
  }

  const { 
    overview, 
    typeBreakdown, 
    trendData, 
    subjectStats, 
    bestSubject, 
    worstSubject, 
    achievements, 
    recentResults 
  } = stats;

  // Simple bar chart for trend
  const chartHeight = 100;
  const maxScore = trendData.length > 0 
    ? Math.max(...trendData.map((d: { score: number }) => d.score), 100) 
    : 100;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={[]}>
      <AppHeader title="Statistiche" onMenuPress={() => setDrawerVisible(true)} />
      
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
            <Text variant="h3">Le tue Statistiche</Text>
            <Caption style={{ marginTop: spacing[1] }}>
              Monitora i tuoi progressi
            </Caption>
          </View>
          <TouchableOpacity 
            style={styles.newSimButton}
            onPress={() => router.push('/(tabs)/simulations' as never)}
          >
            <LinearGradient
              colors={[colors.primary.main, colors.primary.dark]}
              style={styles.newSimGradient}
            >
              <Ionicons name="flash" size={16} color="#FFFFFF" />
              <Text variant="buttonSmall" style={{ color: '#FFFFFF', marginLeft: 6 }}>Nuova</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Main Stats Grid - 4 cards */}
        <View style={styles.mainStatsGrid}>
          <Card variant="outlined" style={styles.mainStatCard}>
            <View style={[styles.statIconContainer, { backgroundColor: `${colors.primary.main}20` }]}>
              <Ionicons name="flag" size={20} color={colors.primary.main} />
            </View>
            <Text variant="h2" style={styles.statValue}>{overview.totalSimulations}</Text>
            <Caption>Simulazioni</Caption>
          </Card>

          <Card variant="outlined" style={styles.mainStatCard}>
            <View style={[styles.statIconContainer, { backgroundColor: `${colors.status.success.main}20` }]}>
              <Ionicons name="trending-up" size={20} color={colors.status.success.main} />
            </View>
            <Text variant="h2" style={styles.statValue}>{overview.averageScore?.toFixed(1) || 0}%</Text>
            <View style={styles.improvementRow}>
              {overview.improvement >= 0 ? (
                <>
                  <Ionicons name="arrow-up" size={12} color={colors.status.success.main} />
                  <Caption style={{ color: colors.status.success.main }}>
                    +{overview.improvement?.toFixed(1) || 0}%
                  </Caption>
                </>
              ) : (
                <>
                  <Ionicons name="arrow-down" size={12} color={colors.status.error.main} />
                  <Caption style={{ color: colors.status.error.main }}>
                    {overview.improvement?.toFixed(1) || 0}%
                  </Caption>
                </>
              )}
            </View>
          </Card>

          <Card variant="outlined" style={styles.mainStatCard}>
            <View style={[styles.statIconContainer, { backgroundColor: `${colors.status.warning.main}20` }]}>
              <Ionicons name="trophy" size={20} color={colors.status.warning.main} />
            </View>
            <Text variant="h2" style={styles.statValue}>{overview.bestScore?.toFixed(1) || 0}%</Text>
            <Caption>Record</Caption>
          </Card>

          <Card variant="outlined" style={styles.mainStatCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#EF444420' }]}>
              <Ionicons name="flame" size={20} color="#EF4444" />
            </View>
            <Text variant="h2" style={styles.statValue}>{overview.currentStreak || 0}</Text>
            <Caption>Giorni</Caption>
          </Card>
        </View>

        {/* Secondary Stats - 6 items */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.secondaryStatsScroll}
          contentContainerStyle={styles.secondaryStatsContainer}
        >
          <View style={[styles.secondaryStat, { backgroundColor: themedColors.card }]}>
            <View style={styles.secondaryStatHeader}>
              <Ionicons name="checkmark-circle" size={14} color={colors.status.success.main} />
              <Caption>Corrette</Caption>
            </View>
            <Text variant="body" style={{ fontWeight: '700' }}>{overview.totalCorrect || 0}</Text>
          </View>
          <View style={[styles.secondaryStat, { backgroundColor: themedColors.card }]}>
            <View style={styles.secondaryStatHeader}>
              <Ionicons name="close-circle" size={14} color={colors.status.error.main} />
              <Caption>Errate</Caption>
            </View>
            <Text variant="body" style={{ fontWeight: '700' }}>{overview.totalWrong || 0}</Text>
          </View>
          <View style={[styles.secondaryStat, { backgroundColor: themedColors.card }]}>
            <View style={styles.secondaryStatHeader}>
              <Ionicons name="help-circle" size={14} color={themedColors.textMuted} />
              <Caption>Non date</Caption>
            </View>
            <Text variant="body" style={{ fontWeight: '700' }}>{overview.totalBlank || 0}</Text>
          </View>
          <View style={[styles.secondaryStat, { backgroundColor: themedColors.card }]}>
            <View style={styles.secondaryStatHeader}>
              <Ionicons name="time" size={14} color={colors.status.info.main} />
              <Caption>Tempo medio</Caption>
            </View>
            <Text variant="body" style={{ fontWeight: '700' }}>{overview.averageTime || 0}m</Text>
          </View>
          <View style={[styles.secondaryStat, { backgroundColor: themedColors.card }]}>
            <View style={styles.secondaryStatHeader}>
              <Ionicons name="calendar" size={14} color="#8B5CF6" />
              <Caption>Questo mese</Caption>
            </View>
            <Text variant="body" style={{ fontWeight: '700' }}>{overview.simulationsThisMonth || 0}</Text>
          </View>
          <View style={[styles.secondaryStat, { backgroundColor: themedColors.card }]}>
            <View style={styles.secondaryStatHeader}>
              <Ionicons name="hourglass" size={14} color="#6366F1" />
              <Caption>Tempo totale</Caption>
            </View>
            <Text variant="body" style={{ fontWeight: '700' }}>{overview.totalTimeSpent || 0}m</Text>
          </View>
        </ScrollView>

        {/* Score Trend Chart */}
        {trendData.length > 0 && (
          <Card variant="outlined" padding="md" style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Ionicons name="trending-up" size={18} color={themedColors.textMuted} />
              <Text variant="body" style={{ fontWeight: '600', marginLeft: spacing[2] }}>
                Andamento Punteggio
              </Text>
            </View>
            <View style={[styles.chart, { height: chartHeight }]}>
              {trendData.slice(-6).map((point: { score: number; date: string }, index: number) => {
                const barHeight = (point.score / maxScore) * chartHeight * 0.8;
                const dateLabel = point.date 
                  ? new Date(point.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
                  : '';
                return (
                  <View key={index} style={styles.chartBar}>
                    <Caption style={styles.barValue}>{Math.round(point.score)}%</Caption>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(barHeight, 4),
                          backgroundColor: colors.primary.main,
                        },
                      ]}
                    />
                    <Caption style={styles.barLabel}>{dateLabel}</Caption>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {/* Best/Worst Subject */}
        {(bestSubject || worstSubject) && (
          <View style={styles.subjectHighlights}>
            {bestSubject && (
              <Card variant="outlined" style={[styles.highlightCard, { borderLeftWidth: 4, borderLeftColor: colors.status.success.main }]}>
                <View style={styles.highlightHeader}>
                  <View style={[styles.highlightIcon, { backgroundColor: `${colors.status.success.main}20` }]}>
                    <Ionicons name="trending-up" size={16} color={colors.status.success.main} />
                  </View>
                  <View>
                    <Caption>Materia Migliore</Caption>
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      {SUBJECT_LABELS[bestSubject.subject] || bestSubject.subject}
                    </Text>
                  </View>
                </View>
                <View style={styles.highlightStats}>
                  <View style={styles.highlightStat}>
                    <Text variant="h4" style={{ color: colors.status.success.main }}>
                      {bestSubject.accuracy?.toFixed(1) || 0}%
                    </Text>
                    <Caption>Accuratezza</Caption>
                  </View>
                  <View style={styles.highlightStat}>
                    <Text variant="h4">{bestSubject.totalQuestions || 0}</Text>
                    <Caption>Domande</Caption>
                  </View>
                </View>
              </Card>
            )}
            {worstSubject && (
              <Card variant="outlined" style={[styles.highlightCard, { borderLeftWidth: 4, borderLeftColor: colors.status.error.main }]}>
                <View style={styles.highlightHeader}>
                  <View style={[styles.highlightIcon, { backgroundColor: `${colors.status.error.main}20` }]}>
                    <Ionicons name="trending-down" size={16} color={colors.status.error.main} />
                  </View>
                  <View>
                    <Caption>Da Migliorare</Caption>
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      {SUBJECT_LABELS[worstSubject.subject] || worstSubject.subject}
                    </Text>
                  </View>
                </View>
                <View style={styles.highlightStats}>
                  <View style={styles.highlightStat}>
                    <Text variant="h4" style={{ color: colors.status.error.main }}>
                      {worstSubject.accuracy?.toFixed(1) || 0}%
                    </Text>
                    <Caption>Accuratezza</Caption>
                  </View>
                  <View style={styles.highlightStat}>
                    <Text variant="h4">{worstSubject.totalQuestions || 0}</Text>
                    <Caption>Domande</Caption>
                  </View>
                </View>
              </Card>
            )}
          </View>
        )}

        {/* Subject Stats */}
        {subjectStats && subjectStats.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bar-chart" size={18} color={themedColors.textMuted} />
              <Text variant="body" style={{ fontWeight: '600', marginLeft: spacing[2] }}>
                Performance per Materia
              </Text>
            </View>
            {subjectStats.map((stat: {
              subjectId: string;
              subjectName: string;
              subjectColor: string;
              total: number;
              correct: number;
              wrong: number;
              avgScore: number;
            }) => (
              <Card key={stat.subjectId} variant="outlined" padding="sm" style={styles.subjectCard}>
                <View style={styles.subjectRow}>
                  <View style={styles.subjectInfo}>
                    <View style={[styles.subjectDot, { backgroundColor: stat.subjectColor || colors.primary.main }]} />
                    <Text variant="body" style={{ fontWeight: '500' }}>{stat.subjectName}</Text>
                  </View>
                  <Text variant="body" style={{ fontWeight: '700', color: stat.subjectColor || colors.primary.main }}>
                    {Math.round(stat.avgScore)}%
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: themedColors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(stat.avgScore, 100)}%`,
                        backgroundColor: stat.subjectColor || colors.primary.main,
                      },
                    ]}
                  />
                </View>
                <View style={styles.subjectMeta}>
                  <Caption>{stat.total} domande</Caption>
                  <Caption style={{ color: colors.status.success.main }}>{stat.correct} corrette</Caption>
                  <Caption style={{ color: colors.status.error.main }}>{stat.wrong} errate</Caption>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Achievements */}
        {achievements && achievements.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="ribbon" size={18} color={colors.status.warning.main} />
              <Text variant="body" style={{ fontWeight: '600', marginLeft: spacing[2] }}>
                Traguardi Raggiunti
              </Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.achievementsContainer}
            >
              {achievements.map((achievement: {
                icon: string;
                title: string;
                description: string;
                unlocked: boolean;
              }, index: number) => (
                <View 
                  key={index} 
                  style={[
                    styles.achievementCard, 
                    { 
                      backgroundColor: achievement.unlocked 
                        ? `${colors.status.warning.main}15` 
                        : themedColors.backgroundSecondary,
                      opacity: achievement.unlocked ? 1 : 0.5,
                    }
                  ]}
                >
                  <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                  <Text variant="caption" style={{ fontWeight: '600', textAlign: 'center' }}>
                    {achievement.title}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent Results */}
        {recentResults && recentResults.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time" size={18} color={themedColors.textMuted} />
              <Text variant="body" style={{ fontWeight: '600', marginLeft: spacing[2] }}>
                Ultime Simulazioni
              </Text>
              <TouchableOpacity 
                style={styles.seeAllButton}
                onPress={() => router.push('/(tabs)/simulations' as never)}
              >
                <Caption style={{ color: colors.primary.main }}>Vedi tutte</Caption>
                <Ionicons name="chevron-forward" size={14} color={colors.primary.main} />
              </TouchableOpacity>
            </View>
            {recentResults.slice(0, 5).map((result: {
              type: string;
              title: string;
              date: string;
              score: number;
              correct: number;
              total: number;
            }, index: number) => (
              <View 
                key={index} 
                style={[styles.resultItem, { backgroundColor: themedColors.backgroundSecondary }]}
              >
                <View style={[styles.resultDot, { backgroundColor: TYPE_COLORS[result.type] || colors.primary.main }]} />
                <View style={styles.resultInfo}>
                  <Text variant="body" style={{ fontWeight: '500' }} numberOfLines={1}>
                    {result.title || TYPE_LABELS[result.type] || result.type}
                  </Text>
                  <Caption>
                    {new Date(result.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                  </Caption>
                </View>
                <View style={styles.resultScore}>
                  <Text 
                    variant="body" 
                    style={{ 
                      fontWeight: '700',
                      color: result.score >= 70 
                        ? colors.status.success.main 
                        : result.score >= 50 
                          ? colors.status.warning.main 
                          : colors.status.error.main
                    }}
                  >
                    {result.score?.toFixed(1) || 0}%
                  </Text>
                  <Caption>{result.correct}/{result.total}</Caption>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Type Breakdown */}
        {typeBreakdown && typeBreakdown.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="medal" size={18} color={themedColors.textMuted} />
              <Text variant="body" style={{ fontWeight: '600', marginLeft: spacing[2] }}>
                Dettaglio per Tipo
              </Text>
            </View>
            <View style={styles.typeGrid}>
              {typeBreakdown.map((type: {
                type: string;
                count: number;
                averageScore: number;
              }, index: number) => (
                <View 
                  key={index} 
                  style={[styles.typeCard, { backgroundColor: themedColors.backgroundSecondary }]}
                >
                  <View style={styles.typeHeader}>
                    <View style={[styles.typeDot, { backgroundColor: TYPE_COLORS[type.type] || colors.primary.main }]} />
                    <Caption style={{ fontWeight: '600' }}>
                      {TYPE_LABELS[type.type] || type.type}
                    </Caption>
                  </View>
                  <View style={styles.typeStats}>
                    <View>
                      <Text variant="body" style={{ fontWeight: '700' }}>{type.count}</Text>
                      <Caption>Completate</Caption>
                    </View>
                    <View>
                      <Text variant="body" style={{ fontWeight: '700' }}>{type.averageScore?.toFixed(1) || 0}%</Text>
                      <Caption>Media</Caption>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: spacing[8] }} />
      </ScrollView>

      <DrawerMenu
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        currentRoute="/statistics"
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[6],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  emptyTitle: {
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing[6],
    paddingHorizontal: spacing[4],
  },
  ctaButton: {
    marginTop: spacing[2],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  newSimButton: {
    borderRadius: layout.borderRadius.lg,
    overflow: 'hidden',
  },
  newSimGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  mainStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  mainStatCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  statValue: {
    marginBottom: spacing[0.5],
  },
  improvementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  secondaryStatsScroll: {
    marginBottom: spacing[4],
    marginHorizontal: -spacing[4],
  },
  secondaryStatsContainer: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  secondaryStat: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: layout.borderRadius.lg,
    minWidth: 100,
  },
  secondaryStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[1],
  },
  chartCard: {
    marginBottom: spacing[4],
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 28,
    borderRadius: layout.borderRadius.sm,
  },
  barLabel: {
    fontSize: 9,
    marginTop: spacing[1],
  },
  barValue: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  subjectHighlights: {
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  highlightCard: {
    padding: spacing[4],
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  highlightIcon: {
    width: 36,
    height: 36,
    borderRadius: layout.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightStats: {
    flexDirection: 'row',
    gap: spacing[6],
  },
  highlightStat: {
    alignItems: 'flex-start',
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: spacing[0.5],
  },
  subjectCard: {
    marginBottom: spacing[2],
  },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  subjectDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing[2],
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  subjectMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  achievementsContainer: {
    gap: spacing[2],
    paddingBottom: spacing[2],
  },
  achievementCard: {
    width: 90,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
  },
  achievementIcon: {
    fontSize: 28,
    marginBottom: spacing[1],
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: layout.borderRadius.lg,
    marginBottom: spacing[2],
  },
  resultDot: {
    width: 3,
    height: 36,
    borderRadius: 2,
    marginRight: spacing[3],
  },
  resultInfo: {
    flex: 1,
  },
  resultScore: {
    alignItems: 'flex-end',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  typeCard: {
    width: '48%',
    padding: spacing[3],
    borderRadius: layout.borderRadius.lg,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  typeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
