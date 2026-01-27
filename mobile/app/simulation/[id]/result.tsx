/**
 * Leonardo School Mobile - Simulation Result Screen
 * 
 * Schermata risultati dopo aver completato una simulazione.
 * Dati caricati dalle API tRPC reali.
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text, Heading3, Caption, Body } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { PageLoader } from '../../../components/ui/Loader';
import { useThemedColors } from '../../../contexts/ThemeContext';
import { colors, getSubjectColor } from '../../../lib/theme/colors';
import { spacing } from '../../../lib/theme/spacing';
import { trpc } from '../../../lib/trpc';

const _SCREEN_WIDTH = Dimensions.get('window').width;

// Types for result data
interface SubjectResult {
  subject: string;
  correct: number;
  wrong: number;
  blank: number;
  total: number;
}

export default function SimulationResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const themedColors = useThemedColors();

  // Fetch result from API
  const { data: result, isLoading, error } = trpc.simulations.getResultDetails.useQuery(
    { simulationId: id || '' },
    { enabled: !!id }
  );

  // Fetch leaderboard data
  const { data: leaderboardData } = trpc.simulations.getLeaderboard.useQuery(
    { simulationId: id || '', limit: 20 },
    { enabled: !!id && !!result }
  );

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

  if (isLoading) {
    return <PageLoader />;
  }

  if (error || !result) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.status.error.main} />
          <Text variant="h5" color="muted">
            Risultato non disponibile
          </Text>
          <Body color="muted" align="center">
            {error?.message || 'Impossibile caricare i risultati della simulazione.'}
          </Body>
          <Button
            onPress={() => router.back()}
            style={{ marginTop: spacing[4] }}
          >
            Torna indietro
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const scorePercentage = result.totalScore > 0 
    ? (result.score / result.totalScore) * 100 
    : 0;

  // Parse subject scores from result
  const subjectResults: SubjectResult[] = [];
  if (result.subjectScores && typeof result.subjectScores === 'object') {
    const scores = result.subjectScores as Record<string, { correct: number; wrong: number; blank: number }>;
    Object.entries(scores).forEach(([subject, data]) => {
      subjectResults.push({
        subject,
        correct: data.correct || 0,
        wrong: data.wrong || 0,
        blank: data.blank || 0,
        total: (data.correct || 0) + (data.wrong || 0) + (data.blank || 0),
      });
    });
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
          <Text variant="h4" align="center">{result.simulation.title}</Text>
          {result.completedAt && (
            <Caption align="center">
              Completata il {new Date(result.completedAt).toLocaleDateString('it-IT', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Caption>
          )}
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
              <Caption>/ {result.totalScore}</Caption>
            </View>
          </View>

          <View style={styles.scoreDetails}>
            <Badge
              variant={result.passed ? 'success' : 'error'}
              size="md"
            >
              {result.passed ? 'Superato' : 'Non Superato'}
            </Badge>
            {result.simulation.passingScore && (
              <Caption align="center">
                Soglia di sufficienza: {result.simulation.passingScore} punti
              </Caption>
            )}
          </View>
        </Card>

        {/* Pending review banner */}
        {result.pendingOpenAnswers > 0 && (
          <Card variant="outlined" style={[styles.pendingBanner, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
            <View style={styles.pendingBannerContent}>
              <Ionicons name="create-outline" size={22} color="#D97706" />
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '600', color: '#92400E' }}>
                  {result.pendingOpenAnswers} {result.pendingOpenAnswers === 1 ? 'risposta aperta da valutare' : 'risposte aperte da valutare'}
                </Text>
                <Caption style={{ color: '#B45309' }}>
                  {result.simulation.showCorrectAnswers 
                    ? 'Vai alla revisione per valutare le tue risposte aperte.'
                    : 'Il punteggio finale verrà ricalcolato dopo la correzione.'
                  }
                </Caption>
              </View>
            </View>
          </Card>
        )}

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
              <Ionicons name="remove-circle" size={20} color={colors.neutral[500]} />
            </View>
            <Text variant="h4">{result.blankAnswers}</Text>
            <Caption>Non date</Caption>
          </Card>
        </View>

        {/* Time stat */}
        <Card variant="outlined" style={styles.timeCard}>
          <View style={[styles.statIcon, { backgroundColor: `${colors.primary.main}15` }]}>
            <Ionicons name="time" size={20} color={colors.primary.main} />
          </View>
          <Text variant="h4">{formatDuration(result.timeSpent)}</Text>
          <Caption>Tempo impiegato</Caption>
        </Card>

        {/* Score breakdown */}
        <Card variant="outlined" style={styles.scoreBreakdown}>
          <Text variant="body" style={{ fontWeight: '600', marginBottom: spacing[3] }}>
            Dettaglio punteggio:
          </Text>
          <View style={styles.scoreBreakdownRow}>
            <View style={styles.scoreBreakdownItem}>
              <Text variant="bodySmall" style={{ color: colors.status.success.main }}>
                {result.correctAnswers} corrette × +{result.simulation.correctPoints}
              </Text>
              <Text variant="body" style={{ color: colors.status.success.main, fontWeight: '600' }}>
                +{(result.correctAnswers * result.simulation.correctPoints).toFixed(2)}
              </Text>
            </View>
            <View style={styles.scoreBreakdownItem}>
              <Text variant="bodySmall" style={{ color: colors.status.error.main }}>
                {result.wrongAnswers} errate × {result.simulation.wrongPoints}
              </Text>
              <Text variant="body" style={{ color: colors.status.error.main, fontWeight: '600' }}>
                {(result.wrongAnswers * result.simulation.wrongPoints).toFixed(2)}
              </Text>
            </View>
            <View style={styles.scoreBreakdownItem}>
              <Text variant="bodySmall" color="muted">
                {result.blankAnswers} vuote × {result.simulation.blankPoints}
              </Text>
              <Text variant="body" color="muted" style={{ fontWeight: '600' }}>
                {(result.blankAnswers * result.simulation.blankPoints).toFixed(2)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Subject Results */}
        {subjectResults.length > 0 && (
          <View style={styles.section}>
            <Heading3 style={styles.sectionTitle}>Risultati per Materia</Heading3>
            
            {subjectResults.map((subjectResult: SubjectResult) => {
              const percentage = subjectResult.total > 0 
                ? (subjectResult.correct / subjectResult.total) * 100 
                : 0;
              const subjectColor = getSubjectColor(subjectResult.subject) || colors.primary.main;

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
                        {subjectResult.subject}
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
                    - {subjectResult.blank} saltate
                  </Caption>
                </View>
              </Card>
            );
          })}
        </View>
        )}

        {/* Leaderboard */}
        {leaderboardData && leaderboardData.leaderboard.length > 0 && (
          <View style={styles.section}>
            <View style={styles.leaderboardHeader}>
              <Ionicons name="trophy" size={20} color="#EAB308" />
              <Heading3 style={{ marginLeft: spacing[2] }}>Classifica</Heading3>
              <Caption style={{ marginLeft: spacing[2] }}>
                ({leaderboardData.totalParticipants} partecipanti)
              </Caption>
            </View>

            {leaderboardData.leaderboard.map((entry) => {
              const isCurrentUser = entry.isCurrentUser ?? false;
              const rank = entry.rank ?? 0;
              const totalScore = entry.totalScore ?? 0;
              const durationSeconds = entry.durationSeconds ?? 0;
              const studentName = leaderboardData.canSeeAllNames || isCurrentUser 
                ? (entry.studentName ?? 'Anonimo')
                : 'Partecipante';

              const getRankIcon = (r: number): string => {
                if (r === 1) return 'trophy';
                if (r === 2) return 'medal';
                if (r === 3) return 'star';
                return 'ellipse';
              };

              const getRankColor = (r: number): string => {
                if (r === 1) return '#EAB308';
                if (r === 2) return '#9CA3AF';
                if (r === 3) return '#D97706';
                return colors.neutral[400];
              };

              return (
                <Card
                  key={entry.studentId || `rank-${rank}`}
                  variant={isCurrentUser ? 'elevated' : 'outlined'}
                  style={[
                    styles.leaderboardEntry,
                    isCurrentUser && { backgroundColor: `${colors.primary.main}15`, borderColor: colors.primary.main },
                  ]}
                >
                  <View style={styles.leaderboardRank}>
                    {rank <= 3 ? (
                      <Ionicons
                        name={getRankIcon(rank) as keyof typeof Ionicons.glyphMap}
                        size={24}
                        color={getRankColor(rank)}
                      />
                    ) : (
                      <Text variant="body" style={{ fontWeight: '700', color: colors.neutral[500] }}>
                        #{rank}
                      </Text>
                    )}
                  </View>
                  <View style={styles.leaderboardInfo}>
                    <Text 
                      variant="body" 
                      style={{ fontWeight: '600', color: isCurrentUser ? colors.primary.main : undefined }}
                      numberOfLines={1}
                    >
                      {studentName}
                      {isCurrentUser && ' (Tu)'}
                    </Text>
                    {leaderboardData.canSeeAllNames && entry.studentMatricola && (
                      <Caption>Matricola: {entry.studentMatricola}</Caption>
                    )}
                  </View>
                  <View style={styles.leaderboardScore}>
                    <Text 
                      variant="body" 
                      style={{ fontWeight: '700', color: isCurrentUser ? colors.primary.main : undefined }}
                    >
                      {totalScore.toFixed(2)}
                    </Text>
                    <Caption>
                      {Math.floor(durationSeconds / 60)}:{(durationSeconds % 60).toString().padStart(2, '0')}
                    </Caption>
                  </View>
                </Card>
              );
            })}

            {!leaderboardData.canSeeAllNames && (
              <View style={styles.privacyNote}>
                <Ionicons name="information-circle" size={16} color={colors.neutral[500]} />
                <Caption style={{ flex: 1, marginLeft: spacing[2] }}>
                  I nomi degli altri partecipanti sono anonimi per proteggere la privacy.
                </Caption>
              </View>
            )}
          </View>
        )}
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
  pendingBanner: {
    padding: spacing[4],
  },
  pendingBannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingVertical: spacing[4],
  },
  scoreBreakdown: {
    padding: spacing[4],
    gap: spacing[2],
  },
  scoreBreakdownRow: {
    gap: spacing[2],
  },
  scoreBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  leaderboardRank: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardInfo: {
    flex: 1,
    marginHorizontal: spacing[3],
  },
  leaderboardScore: {
    alignItems: 'flex-end',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing[3],
    backgroundColor: colors.neutral[100],
    borderRadius: 12,
    marginTop: spacing[2],
  },
});
