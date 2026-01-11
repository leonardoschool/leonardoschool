/**
 * Leonardo School Mobile - Simulation Result Screen
 * 
 * Schermata risultati dopo aver completato una simulazione.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text, Heading3, Caption } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { PageLoader } from '../../../components/ui/Loader';
import { useThemedColors } from '../../../contexts/ThemeContext';
import { colors, getLegacySubjectColor, getLegacySubjectName } from '../../../lib/theme/colors';
import type { LegacySubject } from '../../../lib/theme/colors';
import { spacing } from '../../../lib/theme/spacing';

const _SCREEN_WIDTH = Dimensions.get('window').width;

// Mock result data - in produzione questi dati vengono dall'API con colori dinamici
const mockResult = {
  simulationId: '1',
  simulationTitle: 'TOLC-MED 2026 Preparazione',
  completedAt: '2026-01-12T14:30:00',
  duration: 78 * 60, // 78 minutes in seconds
  totalQuestions: 50,
  correctAnswers: 38,
  wrongAnswers: 8,
  unanswered: 4,
  score: 32.5,
  maxScore: 50,
  percentile: 75,
  passed: true,
  subjectResults: [
    { subject: 'BIOLOGIA' as LegacySubject, correct: 12, wrong: 2, unanswered: 1, total: 15 },
    { subject: 'CHIMICA' as LegacySubject, correct: 10, wrong: 3, unanswered: 2, total: 15 },
    { subject: 'MATEMATICA' as LegacySubject, correct: 8, wrong: 1, unanswered: 1, total: 10 },
    { subject: 'FISICA' as LegacySubject, correct: 5, wrong: 2, unanswered: 0, total: 7 },
    { subject: 'LOGICA' as LegacySubject, correct: 3, wrong: 0, unanswered: 0, total: 3 },
  ],
};

export default function SimulationResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const themedColors = useThemedColors();
  const [isLoading, setIsLoading] = useState(true);
  const [result, _setResult] = useState(mockResult);

  useEffect(() => {
    const loadResults = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsLoading(false);
    };
    loadResults();
  }, [id]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins} min`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 75) return colors.status.success.main;
    if (percentage >= 50) return colors.status.warning.main;
    return colors.status.error.main;
  };

  const scorePercentage = (result.score / result.maxScore) * 100;

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header/Title */}
        <View style={styles.header}>
          <Text variant="h4" align="center">{result.simulationTitle}</Text>
          <Caption align="center">
            Completata il {new Date(result.completedAt).toLocaleDateString('it-IT', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Caption>
        </View>

        {/* Main Score Card */}
        <Card variant="elevated" style={styles.scoreCard}>
          <View style={styles.scoreCircle}>
            <View
              style={[
                styles.scoreCircleInner,
                { borderColor: getScoreColor(scorePercentage) },
              ]}
            >
              <Text variant="h1" style={{ color: getScoreColor(scorePercentage) }}>
                {result.score.toFixed(1)}
              </Text>
              <Caption>/ {result.maxScore}</Caption>
            </View>
          </View>

          <View style={styles.scoreDetails}>
            <Badge
              variant={result.passed ? 'success' : 'error'}
              size="md"
            >
              {result.passed ? 'Superato' : 'Non Superato'}
            </Badge>
            <Caption align="center">
              Percentile: {result.percentile}° | Durata: {formatDuration(result.duration)}
            </Caption>
          </View>
        </Card>

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <Card variant="outlined" style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.status.success.light }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.status.success.main} />
            </View>
            <Text variant="h4">{result.correctAnswers}</Text>
            <Caption>Corrette</Caption>
          </Card>

          <Card variant="outlined" style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.status.error.light }]}>
              <Ionicons name="close-circle" size={20} color={colors.status.error.main} />
            </View>
            <Text variant="h4">{result.wrongAnswers}</Text>
            <Caption>Errate</Caption>
          </Card>

          <Card variant="outlined" style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.neutral[200] }]}>
              <Ionicons name="help-circle" size={20} color={colors.neutral[500]} />
            </View>
            <Text variant="h4">{result.unanswered}</Text>
            <Caption>Senza risposta</Caption>
          </Card>
        </View>

        {/* Subject Results */}
        <View style={styles.section}>
          <Heading3 style={styles.sectionTitle}>Risultati per Materia</Heading3>
          
          {result.subjectResults.map((subjectResult) => {
            const percentage = (subjectResult.correct / subjectResult.total) * 100;
            const subjectColor = getLegacySubjectColor(subjectResult.subject);

            return (
              <Card
                key={subjectResult.subject}
                variant="outlined"
                style={styles.subjectCard}
              >
                <View style={styles.subjectHeader}>
                  <View style={styles.subjectInfo}>
                    <View
                      style={[
                        styles.subjectDot,
                        { backgroundColor: subjectColor },
                      ]}
                    />
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      {getLegacySubjectName(subjectResult.subject)}
                    </Text>
                  </View>
                  <Text
                    variant="body"
                    style={{ color: getScoreColor(percentage), fontWeight: '600' }}
                  >
                    {subjectResult.correct}/{subjectResult.total}
                  </Text>
                </View>

                {/* Progress Bar */}
                <View style={[styles.progressBar, { backgroundColor: themedColors.backgroundSecondary }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${percentage}%`,
                        backgroundColor: subjectColor,
                      },
                    ]}
                  />
                </View>

                <View style={styles.subjectStats}>
                  <Caption>
                    ✓ {subjectResult.correct} corrette
                  </Caption>
                  <Caption>
                    ✗ {subjectResult.wrong} errate
                  </Caption>
                  <Caption>
                    - {subjectResult.unanswered} saltate
                  </Caption>
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={[styles.footer, { backgroundColor: themedColors.card, borderTopColor: themedColors.border }]}>
        <Button
          variant="outline"
          size="md"
          onPress={() => router.push('/(tabs)/simulations')}
          style={{ flex: 1 }}
        >
          Altre Simulazioni
        </Button>
        <Button
          variant="primary"
          size="md"
          onPress={() => router.push('/(tabs)')}
          style={{ flex: 1 }}
        >
          Vai alla Home
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing[4],
    gap: spacing[5],
  },
  header: {
    gap: spacing[1],
    paddingTop: spacing[2],
  },
  scoreCard: {
    alignItems: 'center',
    gap: spacing[4],
    paddingVertical: spacing[6],
  },
  scoreCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCircleInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreDetails: {
    alignItems: 'center',
    gap: spacing[2],
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[4],
    gap: spacing[2],
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    gap: spacing[3],
  },
  sectionTitle: {
    marginBottom: spacing[1],
  },
  subjectCard: {
    gap: spacing[3],
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  subjectStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[4],
    borderTopWidth: 1,
  },
});
