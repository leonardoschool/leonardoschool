/**
 * Leonardo School Mobile - Statistics Screen
 * 
 * Statistiche e progressi dello studente.
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text, Heading3, Caption } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { SubjectBadge } from '../../components/ui/Badge';
import { useThemedColors } from '../../contexts/ThemeContext';
import { colors, getLegacySubjectColor, getLegacySubjectName } from '../../lib/theme/colors';
import type { LegacySubject } from '../../lib/theme/colors';
import { spacing, layout } from '../../lib/theme/spacing';

const _SCREEN_WIDTH = Dimensions.get('window').width;

// Mock data - in produzione questi dati vengono dall'API con colori dinamici
const mockOverview = {
  totalSimulations: 24,
  averageScore: 72,
  totalTime: 1840, // minutes
  bestSubject: 'MATEMATICA' as LegacySubject,
  worstSubject: 'FISICA' as LegacySubject,
};

const mockSubjectStats: Array<{
  subject: LegacySubject;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}> = [
  { subject: 'MATEMATICA', totalQuestions: 150, correctAnswers: 120, percentage: 80, trend: 'up' },
  { subject: 'BIOLOGIA', totalQuestions: 200, correctAnswers: 150, percentage: 75, trend: 'up' },
  { subject: 'LOGICA', totalQuestions: 100, correctAnswers: 70, percentage: 70, trend: 'stable' },
  { subject: 'CHIMICA', totalQuestions: 180, correctAnswers: 117, percentage: 65, trend: 'down' },
  { subject: 'FISICA', totalQuestions: 120, correctAnswers: 72, percentage: 60, trend: 'up' },
  { subject: 'CULTURA_GENERALE', totalQuestions: 80, correctAnswers: 52, percentage: 65, trend: 'stable' },
];

const mockProgressData = [
  { date: '01/01', score: 65 },
  { date: '05/01', score: 70 },
  { date: '08/01', score: 68 },
  { date: '10/01', score: 78 },
  { date: '11/01', score: 75 },
];

type Period = 'week' | 'month' | 'all';

export default function StatisticsScreen() {
  const themedColors = useThemedColors();
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('month');

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
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
  const maxScore = Math.max(...mockProgressData.map(d => d.score));
  const chartHeight = 120;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
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

        {/* Overview Cards */}
        <View style={styles.overviewGrid}>
          <Card variant="outlined" style={styles.overviewCard}>
            <Ionicons name="trophy" size={24} color={colors.status.warning.main} />
            <Text variant="h3" style={styles.overviewValue}>{mockOverview.averageScore}%</Text>
            <Caption>Media Generale</Caption>
          </Card>

          <Card variant="outlined" style={styles.overviewCard}>
            <Ionicons name="document-text" size={24} color={colors.primary.main} />
            <Text variant="h3" style={styles.overviewValue}>{mockOverview.totalSimulations}</Text>
            <Caption>Simulazioni</Caption>
          </Card>

          <Card variant="outlined" style={styles.overviewCard}>
            <Ionicons name="time" size={24} color={colors.status.info.main} />
            <Text variant="h3" style={styles.overviewValue}>{formatTime(mockOverview.totalTime)}</Text>
            <Caption>Tempo Totale</Caption>
          </Card>

          <Card variant="outlined" style={styles.overviewCard}>
            <Ionicons name="star" size={24} color={colors.status.success.main} />
            <View style={styles.overviewSubject}>
              <SubjectBadge subject={mockOverview.bestSubject} size="sm" />
            </View>
            <Caption>Miglior Materia</Caption>
          </Card>
        </View>

        {/* Progress Chart */}
        <View style={styles.section}>
          <Heading3 style={styles.sectionTitle}>Andamento Punteggi</Heading3>
          <Card variant="outlined" padding="md">
            <View style={[styles.chart, { height: chartHeight }]}>
              {mockProgressData.map((point, index) => {
                const barHeight = (point.score / maxScore) * chartHeight * 0.8;
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
                    <Caption style={styles.barLabel}>{point.date}</Caption>
                    <Caption style={styles.barValue}>{point.score}%</Caption>
                  </View>
                );
              })}
            </View>
          </Card>
        </View>

        {/* Subject Stats */}
        <View style={styles.section}>
          <Heading3 style={styles.sectionTitle}>Statistiche per Materia</Heading3>
          
          {mockSubjectStats.map((stat) => (
            <Card
              key={stat.subject}
              variant="outlined"
              padding="md"
              style={styles.subjectCard}
            >
              <View style={styles.subjectHeader}>
                <View style={styles.subjectInfo}>
                  <View
                    style={[
                      styles.subjectDot,
                      { backgroundColor: getLegacySubjectColor(stat.subject) },
                    ]}
                  />
                  <Text variant="h5">{getLegacySubjectName(stat.subject)}</Text>
                </View>
                <View style={styles.trendContainer}>
                  <Ionicons
                    name={getTrendIcon(stat.trend) as keyof typeof Ionicons.glyphMap}
                    size={16}
                    color={getTrendColor(stat.trend)}
                  />
                  <Text
                    variant="h4"
                    style={{ color: getLegacySubjectColor(stat.subject) }}
                  >
                    {stat.percentage}%
                  </Text>
                </View>
              </View>

              <View style={[styles.progressBar, { backgroundColor: themedColors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${stat.percentage}%`,
                      backgroundColor: getLegacySubjectColor(stat.subject),
                    },
                  ]}
                />
              </View>

              <View style={styles.subjectStats}>
                <View style={styles.subjectStat}>
                  <Caption>Domande</Caption>
                  <Text variant="body">{stat.totalQuestions}</Text>
                </View>
                <View style={styles.subjectStat}>
                  <Caption>Corrette</Caption>
                  <Text variant="body" style={{ color: colors.status.success.main }}>
                    {stat.correctAnswers}
                  </Text>
                </View>
                <View style={styles.subjectStat}>
                  <Caption>Errate</Caption>
                  <Text variant="body" style={{ color: colors.status.error.main }}>
                    {stat.totalQuestions - stat.correctAnswers}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>

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
  overviewSubject: {
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
});
