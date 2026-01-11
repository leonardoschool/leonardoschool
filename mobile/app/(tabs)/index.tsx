/**
 * Leonardo School Mobile - Dashboard Screen
 * 
 * Schermata principale dello studente con overview.
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Text, Heading3, Caption } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { LegacySubjectBadge } from '../../components/ui/Badge';
import { useThemedColors } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { colors, getLegacySubjectColor } from '../../lib/theme/colors';
import type { LegacySubject } from '../../lib/theme/colors';
import { spacing, layout } from '../../lib/theme/spacing';

// Mock data per la demo - in produzione questi dati vengono dall'API con colori dinamici
const mockStats = {
  totalSimulations: 15,
  averageScore: 72,
  lastScore: 78,
  pendingSimulations: 3,
};

const mockRecentSimulations = [
  { id: '1', title: 'TOLC-MED Simulazione #5', score: 78, date: '2026-01-10', subject: 'BIOLOGIA' as LegacySubject },
  { id: '2', title: 'Quiz Chimica Organica', score: 65, date: '2026-01-08', subject: 'CHIMICA' as LegacySubject },
  { id: '3', title: 'TOLC-MED Simulazione #4', score: 82, date: '2026-01-05', subject: 'FISICA' as LegacySubject },
];

const mockSubjectProgress = [
  { subject: 'BIOLOGIA' as LegacySubject, percentage: 75 },
  { subject: 'CHIMICA' as LegacySubject, percentage: 62 },
  { subject: 'FISICA' as LegacySubject, percentage: 58 },
  { subject: 'MATEMATICA' as LegacySubject, percentage: 80 },
  { subject: 'LOGICA' as LegacySubject, percentage: 70 },
];

export default function DashboardScreen() {
  const themedColors = useThemedColors();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // API Integration: Chiamare trpc.dashboard.getStats.query() quando disponibile
    // Per ora simula il refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  };

  const firstName = user?.name?.split(' ')[0] || 'Studente';

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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text variant="bodySmall" color="muted">{getGreeting()}</Text>
            <Heading3>{firstName} 👋</Heading3>
          </View>
          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: themedColors.backgroundSecondary }]}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={22} color={themedColors.text} />
          </TouchableOpacity>
        </View>

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
              <Text variant="h3" style={styles.statValue}>{mockStats.averageScore}%</Text>
              <Caption style={styles.statLabel}>Media Punteggio</Caption>
            </View>
          </Card>

          <Card variant="outlined" style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="document-text-outline" size={24} color={colors.primary.main} />
              <Text variant="h3" style={styles.statValueDark}>{mockStats.totalSimulations}</Text>
              <Caption>Simulazioni Completate</Caption>
            </View>
          </Card>

          <Card variant="outlined" style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="time-outline" size={24} color={colors.status.warning.main} />
              <Text variant="h3" style={styles.statValueDark}>{mockStats.pendingSimulations}</Text>
              <Caption>In Attesa</Caption>
            </View>
          </Card>

          <Card variant="outlined" style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="trending-up-outline" size={24} color={colors.status.success.main} />
              <Text variant="h3" style={styles.statValueDark}>{mockStats.lastScore}%</Text>
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
        <View style={styles.section}>
          <Heading3 style={styles.sectionTitle}>Progresso per Materia</Heading3>
          <Card variant="outlined" padding="md">
            {mockSubjectProgress.map((item, index) => (
              <View key={item.subject} style={[styles.progressItem, index > 0 && styles.progressItemBorder]}>
                <View style={styles.progressHeader}>
                  <LegacySubjectBadge subject={item.subject} size="sm" />
                  <Text variant="bodySmall" color="muted">{item.percentage}%</Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: themedColors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${item.percentage}%`,
                        backgroundColor: getLegacySubjectColor(item.subject),
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </Card>
        </View>

        {/* Recent Simulations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Heading3 style={styles.sectionTitle}>Simulazioni Recenti</Heading3>
            <TouchableOpacity onPress={() => router.push('/(tabs)/simulations')}>
              <Text variant="bodySmall" style={{ color: colors.primary.main }}>
                Vedi tutte
              </Text>
            </TouchableOpacity>
          </View>

          {mockRecentSimulations.map((sim) => (
            <Card
              key={sim.id}
              variant="outlined"
              padding="md"
              style={styles.simulationCard}
              onPress={() => router.push(`/simulation/result/${sim.id}`)}
            >
              <View style={styles.simulationHeader}>
                <View style={styles.simulationInfo}>
                  <Text variant="body" numberOfLines={1}>{sim.title}</Text>
                  <Caption>{new Date(sim.date).toLocaleDateString('it-IT')}</Caption>
                </View>
                <View style={styles.simulationScore}>
                  <Text
                    variant="h4"
                    style={{
                      color: sim.score >= 70
                        ? colors.status.success.main
                        : sim.score >= 50
                        ? colors.status.warning.main
                        : colors.status.error.main,
                    }}
                  >
                    {sim.score}%
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
});
