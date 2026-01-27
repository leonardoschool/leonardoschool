/**
 * Leonardo School Mobile - Simulations Screen
 * 
 * Lista simulazioni assegnate e autoesercitazioni.
 * Allineato alla webapp StudentSimulationsContent.
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

import { AppHeader, DrawerMenu } from '../../components/navigation';

import { Text, Body, Caption } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useThemedColors } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/theme/colors';
import { spacing, layout } from '../../lib/theme/spacing';

// Tab types matching webapp
type MainTab = 'assigned' | 'self';
type StatusFilter = 'all' | 'available' | 'in_progress' | 'completed';

// Type for simulation from API
interface Simulation {
  id: string;
  assignmentId?: string | null;
  title: string;
  type: string;
  durationMinutes: number;
  totalQuestions: number;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  maxAttempts?: number | null;
  status: 'pending' | 'completed' | 'in_progress';
  attemptsUsed?: number;
  isCompleted?: boolean;
  studentStatus?: string;
  isOfficial?: boolean;
  isRepeatable?: boolean;
  _count?: { questions: number };
}

// Status colors matching webapp
const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  available: { label: 'Disponibile', color: colors.status.success.main, icon: 'play-circle' },
  in_progress: { label: 'In corso', color: colors.status.info.main, icon: 'time' },
  completed: { label: 'Completata', color: '#6B7280', icon: 'checkmark-circle' },
  expired: { label: 'Scaduta', color: colors.status.error.main, icon: 'alert-circle' },
  not_started: { label: 'Non attiva', color: colors.status.warning.main, icon: 'calendar' },
  closed: { label: 'Chiusa', color: colors.status.error.main, icon: 'lock-closed' },
};

export default function SimulationsScreen() {
  const themedColors = useThemedColors();
  const { user } = useAuthStore();
  const [mainTab, setMainTab] = useState<MainTab>('assigned');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Fetch simulations based on active tab (matching webapp)
  const {
    data: simulationsData,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.simulations.getAvailableSimulations.useQuery(
    { 
      page: 1, 
      pageSize: 50,
      status: statusFilter === 'all' ? undefined : statusFilter as 'available' | 'in_progress' | 'completed',
      selfCreated: mainTab === 'self' ? true : undefined,
      assignedToMe: mainTab === 'assigned' ? true : undefined,
    },
    { enabled: !!user }
  );

  // Fetch student results for stats
  const { data: resultsData } = trpc.simulations.getMyResults.useQuery(
    { pageSize: 50 },
    { enabled: !!user }
  );

  const onRefresh = async () => {
    await refetch();
  };

  // Get simulations from API response
  const simulations: Simulation[] = (simulationsData?.simulations || []) as Simulation[];
  const pagination = simulationsData?.pagination;

  // Calculate stats (matching webapp)
  const stats = useMemo(() => {
    const completedCount = resultsData?.results?.length ?? 0;
    const avgScore = completedCount > 0 
      ? (resultsData?.results?.reduce((sum: number, r: { totalScore?: number | null }) => sum + (r.totalScore ?? 0), 0) ?? 0) / completedCount 
      : 0;
    return {
      total: pagination?.total || 0,
      completed: completedCount,
      avgScore: Math.round(avgScore),
    };
  }, [resultsData, pagination]);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      OFFICIAL: 'Ufficiale',
      PRACTICE: 'Esercitazione',
      CUSTOM: 'Personalizzata',
      QUICK_QUIZ: 'Quiz Veloce',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      OFFICIAL: colors.status.error.main,
      PRACTICE: colors.status.info.main,
      CUSTOM: '#8B5CF6',
      QUICK_QUIZ: colors.status.warning.main,
    };
    return colorMap[type] || colors.primary.main;
  };

  const formatDuration = (minutes: number) => {
    if (minutes === 0) return 'Illimitato';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDate = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleTabChange = (tab: MainTab) => {
    setMainTab(tab);
    setStatusFilter('all');
  };

  const renderSimulationCard = (simulation: Simulation) => {
    const status = simulation.studentStatus || 'available';
    const statusInfo = statusConfig[status] || statusConfig.available;
    const questionsCount = simulation._count?.questions || simulation.totalQuestions || 0;
    const isDisabled = ['closed', 'expired', 'not_started'].includes(status);
    
    const hasTimeWindow = simulation.startDate && simulation.endDate;

    const uniqueKey = simulation.assignmentId 
      ? `${simulation.id}-${simulation.assignmentId}` 
      : simulation.id;

    const assignmentQuery = simulation.assignmentId ? `?assignmentId=${simulation.assignmentId}` : '';
    const href = status === 'completed' 
      ? `/simulation/${simulation.id}/result${assignmentQuery}`
      : `/simulation/${simulation.id}${assignmentQuery}`;

    return (
      <Card
        key={uniqueKey}
        variant="outlined"
        padding="md"
        style={[styles.simulationCard, isDisabled && { opacity: 0.7 }]}
        onPress={isDisabled ? undefined : () => router.push(href as never)}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.badgesRow}>
            {simulation.isOfficial && (
              <View style={[styles.officialBadge, { backgroundColor: `${colors.status.error.main}20` }]}>
                <Ionicons name="ribbon" size={12} color={colors.status.error.main} />
              </View>
            )}
            <View style={[styles.typeBadge, { backgroundColor: `${getTypeColor(simulation.type)}20` }]}>
              <Text variant="caption" style={{ color: getTypeColor(simulation.type), fontWeight: '500' }}>
                {getTypeLabel(simulation.type)}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}20` }]}>
            <Ionicons name={statusInfo.icon as keyof typeof Ionicons.glyphMap} size={12} color={statusInfo.color} />
            <Text variant="caption" style={{ color: statusInfo.color, marginLeft: 4, fontWeight: '500' }}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text variant="body" style={[styles.cardTitle, { fontWeight: '600' }]} numberOfLines={2}>
          {simulation.title}
        </Text>

        {/* Stats row */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="help-circle-outline" size={16} color={themedColors.textMuted} />
            <Caption>{questionsCount} domande</Caption>
          </View>
          {simulation.durationMinutes > 0 && (
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={16} color={themedColors.textMuted} />
              <Caption>{formatDuration(simulation.durationMinutes)}</Caption>
            </View>
          )}
        </View>

        {/* Info badges */}
        <View style={styles.infoBadgesRow}>
          {simulation.isRepeatable && (
            <View style={[styles.infoBadge, { backgroundColor: `${colors.status.success.main}15` }]}>
              <Ionicons name="repeat" size={12} color={colors.status.success.main} />
              <Caption style={{ color: colors.status.success.main, marginLeft: 4 }}>Ripetibile</Caption>
            </View>
          )}
        </View>

        {/* Time window */}
        {hasTimeWindow && (
          <View style={[styles.timeWindow, { backgroundColor: themedColors.backgroundSecondary }]}>
            <Ionicons name="calendar-outline" size={14} color={themedColors.textMuted} />
            <Caption style={{ marginLeft: 6 }}>
              {formatDate(simulation.startDate!)} - {formatDate(simulation.endDate!)}
            </Caption>
          </View>
        )}

        {/* CTA Button */}
        <View style={styles.ctaContainer}>
          {status === 'available' && (
            <View style={[styles.ctaButton, { backgroundColor: colors.primary.main }]}>
              <Ionicons name="play" size={16} color="#FFFFFF" />
              <Text variant="buttonSmall" style={{ color: '#FFFFFF', marginLeft: 6 }}>Inizia</Text>
            </View>
          )}
          {status === 'in_progress' && (
            <View style={[styles.ctaButton, { backgroundColor: colors.status.info.main }]}>
              <Ionicons name="play" size={16} color="#FFFFFF" />
              <Text variant="buttonSmall" style={{ color: '#FFFFFF', marginLeft: 6 }}>Continua</Text>
            </View>
          )}
          {status === 'completed' && (
            <View style={[styles.ctaButton, { backgroundColor: themedColors.backgroundSecondary }]}>
              <Ionicons name="bar-chart" size={16} color={themedColors.text} />
              <Text variant="buttonSmall" style={{ color: themedColors.text, marginLeft: 6 }}>Risultati</Text>
            </View>
          )}
          {['expired', 'not_started', 'closed'].includes(status) && (
            <View style={[styles.ctaButton, { backgroundColor: `${statusInfo.color}15` }]}>
              <Ionicons name={statusInfo.icon as keyof typeof Ionicons.glyphMap} size={16} color={statusInfo.color} />
              <Text variant="buttonSmall" style={{ color: statusInfo.color, marginLeft: 6 }}>{statusInfo.label}</Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  if (!user) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={[]}>
      <AppHeader title="Simulazioni" onMenuPress={() => setDrawerVisible(true)} />
      
      {/* Main Tabs (Assegnate vs Autoesercitazioni) */}
      <View style={[styles.mainTabsContainer, { backgroundColor: themedColors.card }]}>
        <TouchableOpacity
          style={[
            styles.mainTab,
            mainTab === 'assigned' && [styles.mainTabActive, { backgroundColor: colors.primary.main }],
          ]}
          onPress={() => handleTabChange('assigned')}
        >
          <Ionicons 
            name="shield-outline" 
            size={18} 
            color={mainTab === 'assigned' ? '#FFFFFF' : themedColors.textMuted} 
          />
          <Text 
            variant="buttonSmall" 
            style={{ color: mainTab === 'assigned' ? '#FFFFFF' : themedColors.textMuted, marginLeft: 6 }}
          >
            Assegnate
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.mainTab,
            mainTab === 'self' && [styles.mainTabActive, { backgroundColor: colors.primary.main }],
          ]}
          onPress={() => handleTabChange('self')}
        >
          <Ionicons 
            name="flash-outline" 
            size={18} 
            color={mainTab === 'self' ? '#FFFFFF' : themedColors.textMuted} 
          />
          <Text 
            variant="buttonSmall" 
            style={{ color: mainTab === 'self' ? '#FFFFFF' : themedColors.textMuted, marginLeft: 6 }}
          >
            Autoesercitazioni
          </Text>
        </TouchableOpacity>
      </View>

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
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <Card variant="outlined" style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${colors.status.success.main}20` }]}>
              <Ionicons name="flag" size={18} color={colors.status.success.main} />
            </View>
            <Text variant="h4">{stats.total}</Text>
            <Caption>{mainTab === 'assigned' ? 'Assegnate' : 'Create'}</Caption>
          </Card>
          <Card variant="outlined" style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${colors.status.info.main}20` }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.status.info.main} />
            </View>
            <Text variant="h4">{stats.completed}</Text>
            <Caption>Completate</Caption>
          </Card>
          <Card variant="outlined" style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${colors.primary.main}20` }]}>
              <Ionicons name="bar-chart" size={18} color={colors.primary.main} />
            </View>
            <Text variant="h4">{stats.avgScore}</Text>
            <Caption>Media</Caption>
          </Card>
        </View>

        {/* Quick Quiz Button (solo in tab autoesercitazioni) */}
        {mainTab === 'self' && (
          <TouchableOpacity
            style={styles.quickQuizButton}
            onPress={() => router.push('/self-practice' as never)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[colors.primary.main, colors.primary.dark]}
              style={styles.quickQuizGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.quickQuizIcon}>
                <Ionicons name="flash" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.quickQuizText}>
                <Text variant="body" style={{ color: '#FFFFFF', fontWeight: '600' }}>Quiz Veloce</Text>
                <Caption style={{ color: 'rgba(255,255,255,0.8)' }}>Inizia subito →</Caption>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Quick Filters */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContainer}
        >
          {(['all', 'available', 'in_progress', 'completed'] as StatusFilter[]).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                statusFilter === filter 
                  ? { backgroundColor: colors.primary.main }
                  : { backgroundColor: themedColors.backgroundSecondary },
              ]}
              onPress={() => setStatusFilter(filter)}
            >
              <Text
                variant="caption"
                style={{
                  color: statusFilter === filter ? '#FFFFFF' : themedColors.textMuted,
                  fontWeight: statusFilter === filter ? '600' : '400',
                }}
              >
                {filter === 'all' ? 'Tutte' : 
                 filter === 'available' ? 'Disponibili' : 
                 filter === 'in_progress' ? 'In corso' : 'Completate'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Caption style={styles.loadingText}>Caricamento simulazioni...</Caption>
          </View>
        ) : simulations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="document-text-outline"
              size={64}
              color={themedColors.textMuted}
            />
            <Text variant="h5" color="muted" style={styles.emptyTitle}>
              {mainTab === 'assigned' ? 'Nessuna simulazione assegnata' : 'Nessuna autoesercitazione'}
            </Text>
            <Body color="muted" align="center">
              {mainTab === 'assigned'
                ? 'I tuoi collaboratori non ti hanno ancora assegnato simulazioni'
                : 'Crea il tuo primo quiz veloce per iniziare'}
            </Body>
            {mainTab === 'self' && (
              <Button
                variant="primary"
                onPress={() => router.push('/(tabs)/simulations' as never)}
                style={{ marginTop: spacing[4] }}
              >
                Crea Quiz Veloce
              </Button>
            )}
          </View>
        ) : (
          simulations.map(renderSimulationCard)
        )}
      </ScrollView>

      <DrawerMenu
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        currentRoute="/simulations"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainTabsContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
    padding: spacing[1],
    borderRadius: layout.borderRadius.xl,
  },
  mainTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: layout.borderRadius.lg,
  },
  mainTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  quickQuizButton: {
    marginBottom: spacing[4],
    borderRadius: layout.borderRadius.xl,
    overflow: 'hidden',
  },
  quickQuizGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
  },
  quickQuizIcon: {
    width: 44,
    height: 44,
    borderRadius: layout.borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickQuizText: {
    marginLeft: spacing[3],
  },
  filtersScroll: {
    marginBottom: spacing[4],
  },
  filtersContainer: {
    gap: spacing[2],
  },
  filterChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: layout.borderRadius.full,
  },
  simulationCard: {
    marginBottom: spacing[3],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  officialBadge: {
    width: 24,
    height: 24,
    borderRadius: layout.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: layout.borderRadius.full,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: layout.borderRadius.full,
  },
  cardTitle: {
    marginBottom: spacing[3],
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing[4],
    marginBottom: spacing[2],
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  infoBadgesRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: layout.borderRadius.full,
  },
  timeWindow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: layout.borderRadius.md,
    marginBottom: spacing[3],
  },
  ctaContainer: {
    marginTop: spacing[1],
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: layout.borderRadius.lg,
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[16],
    gap: spacing[3],
  },
  emptyTitle: {
    marginTop: spacing[2],
  },
});
