/**
 * Leonardo School Mobile - Statistics Screen
 * 
 * Statistiche e progressi dello studente.
 * Dati caricati dalle API tRPC reali.
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader, DrawerMenu } from '../../components/navigation';

import { Text, Heading3, Caption } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { useThemedColors } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/theme/colors';
import { spacing, layout } from '../../lib/theme/spacing';

const _SCREEN_WIDTH = Dimensions.get('window').width;

type Period = 'week' | 'month' | 'all';

export default function StatisticsScreen() {
  const themedColors = useThemedColors();
  const { user } = useAuthStore();
  const [period, setPeriod] = useState<Period>('month');
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Fetch detailed stats from API
  const {
    data: statsData,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.students.getDetailedStats.useQuery(undefined, {
    enabled: !!user,
  });

  const onRefresh = async () => {
    await refetch();
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'trending-up';
      case 'down': return 'trending-down';
      default: return 'remove';
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return colors.status.success.main;
      case 'down': return colors.status.error.main;
      default: return themedColors.textMuted;
    }
  };

  // Simple chart rendering (bar chart)
  const trendData = statsData?.trendData || [];
  const chartHeight = 120;
  const maxScore = trendData.length > 0 
    ? Math.max(...trendData.map((d: { score: number }) => d.score)) 
    : 100;

  // Subject stats
  interface SubjectStat {
    subjectId: string;
    subjectName: string;
    subjectColor: string;
    total: number;
    correct: number;
    wrong: number;
    blank: number;
    avgScore: number;
    trend: 'up' | 'down' | 'stable';
  }
  const subjectStats: SubjectStat[] = statsData?.subjectStats || [];

  // Overview data
  const overview = statsData?.overview || {
    totalSimulations: 0,
    totalQuestions: 0,
    avgPercentage: 0,
    bestScore: 0,
  };

  if (!user) return null;

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
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['week', 'month', 'all'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.periodButton,
                {
                  backgroundColor: period === p ? colors.primary.main : themedColors.backgroundSecondary,
                },
              ]}
              onPress={() => setPeriod(p)}
            >
              <Text
                variant="buttonSmall"
                style={{ color: period === p ? '#FFFFFF' : themedColors.text }}
              >
                {p === 'week' ? 'Settimana' : p === 'month' ? 'Mese' : 'Tutto'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Caption style={styles.loadingText}>Caricamento statistiche...</Caption>
          </View>
        ) : overview.totalSimulations === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={64} color={themedColors.textMuted} />
            <Text variant="h4" style={styles.emptyTitle}>Nessuna statistica disponibile</Text>
            <Caption style={styles.emptyText}>
              Completa almeno una simulazione per vedere le tue statistiche.
            </Caption>
          </View>
        ) : (
          <>
            {/* Overview Cards */}
            <View style={styles.overviewGrid}>
              <Card variant="outlined" style={styles.overviewCard}>
                <Ionicons name="trophy" size={24} color={colors.status.warning.main} />
                <Text variant="h3" style={styles.overviewValue}>
                  {Math.round(overview.avgPercentage)}%
                </Text>
                <Caption>Media Generale</Caption>
              </Card>

              <Card variant="outlined" style={styles.overviewCard}>
                <Ionicons name="document-text" size={24} color={colors.primary.main} />
                <Text variant="h3" style={styles.overviewValue}>{overview.totalSimulations}</Text>
                <Caption>Simulazioni</Caption>
              </Card>

              <Card variant="outlined" style={styles.overviewCard}>
                <Ionicons name="checkmark-circle" size={24} color={colors.status.success.main} />
                <Text variant="h3" style={styles.overviewValue}>{overview.totalQuestions}</Text>
                <Caption>Domande Totali</Caption>
              </Card>

              <Card variant="outlined" style={styles.overviewCard}>
                <Ionicons name="star" size={24} color={colors.status.info.main} />
                <Text variant="h3" style={styles.overviewValue}>
                  {Math.round(overview.bestScore)}%
                </Text>
                <Caption>Miglior Punteggio</Caption>
              </Card>
            </View>

            {/* Progress Chart */}
            {trendData.length > 0 && (
              <View style={styles.section}>
                <Heading3 style={styles.sectionTitle}>Andamento Punteggi</Heading3>
                <Card variant="outlined" padding="md">
                  <View style={[styles.chart, { height: chartHeight }]}>
                    {trendData.slice(-5).map((point: { score: number; date: string }, index: number) => {
                      const barHeight = (point.score / maxScore) * chartHeight * 0.8;
                      const dateLabel = point.date 
                        ? new Date(point.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
                        : '';
                      return (
                        <View key={index} style={styles.chartBar}>
                          <View
                            style={[
                              styles.bar,
                              {
                                height: barHeight,
                                backgroundColor: colors.primary.main,
                              },
                            ]}
                          />
                          <Caption style={styles.barLabel}>{dateLabel}</Caption>
                          <Caption style={styles.barValue}>{Math.round(point.score)}%</Caption>
                        </View>
                      );
                    })}
                  </View>
                </Card>
              </View>
            )}

            {/* Subject Stats */}
            {subjectStats.length > 0 && (
              <View style={styles.section}>
                <Heading3 style={styles.sectionTitle}>Statistiche per Materia</Heading3>
                
                {subjectStats.map((stat) => (
                  <Card
                    key={stat.subjectId}
                    variant="outlined"
                    padding="md"
                    style={styles.subjectCard}
                  >
                    <View style={styles.subjectHeader}>
                      <View style={styles.subjectInfo}>
                        <View
                          style={[
                            styles.subjectDot,
                            { backgroundColor: stat.subjectColor || colors.primary.main },
                          ]}
                        />
                        <Text variant="h5">{stat.subjectName}</Text>
                      </View>
                      <View style={styles.trendContainer}>
                        <Ionicons
                          name={getTrendIcon(stat.trend) as keyof typeof Ionicons.glyphMap}
                          size={16}
                          color={getTrendColor(stat.trend)}
                        />
                        <Text
                          variant="h4"
                          style={{ color: stat.subjectColor || colors.primary.main }}
                        >
                          {Math.round(stat.avgScore)}%
                        </Text>
                      </View>
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

                    <View style={styles.subjectStats}>
                      <View style={styles.subjectStat}>
                        <Caption>Domande</Caption>
                        <Text variant="body">{stat.total}</Text>
                      </View>
                      <View style={styles.subjectStat}>
                        <Caption>Corrette</Caption>
                        <Text variant="body" style={{ color: colors.status.success.main }}>
                          {stat.correct}
                        </Text>
                      </View>
                      <View style={styles.subjectStat}>
                        <Caption>Errate</Caption>
                        <Text variant="body" style={{ color: colors.status.error.main }}>
                          {stat.wrong}
                        </Text>
                      </View>
                    </View>
                  </Card>
                ))}
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
  periodSelector: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing[2.5],
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  overviewCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: spacing[4],
    gap: spacing[2],
  },
  overviewValue: {
    marginTop: spacing[1],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    marginBottom: spacing[3],
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
    width: 24,
    borderRadius: layout.borderRadius.sm,
    marginBottom: spacing[1],
  },
  barLabel: {
    fontSize: 10,
    marginTop: spacing[1],
  },
  barValue: {
    fontSize: 10,
    fontWeight: '600',
  },
  subjectCard: {
    marginBottom: spacing[3],
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  subjectDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing[3],
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  subjectStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  subjectStat: {
    alignItems: 'center',
    gap: spacing[0.5],
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
});
