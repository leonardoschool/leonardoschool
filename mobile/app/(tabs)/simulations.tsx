/**
 * Leonardo School Mobile - Simulations Screen
 * 
 * Lista simulazioni assegnate e disponibili.
 * Dati caricati dalle API tRPC reali.
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

import { Text, Body, Caption } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useThemedColors } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/theme/colors';
import { spacing, layout } from '../../lib/theme/spacing';

type TabFilter = 'all' | 'pending' | 'completed';

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
}

export default function SimulationsScreen() {
  const themedColors = useThemedColors();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  // Fetch simulations from API
  const {
    data: simulationsData,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.simulations.getAvailableSimulations.useQuery(
    { 
      page: 1, 
      pageSize: 50,
      status: activeTab === 'completed' ? 'completed' : activeTab === 'pending' ? 'pending' : undefined,
    },
    { enabled: !!user }
  );

  const onRefresh = async () => {
    await refetch();
  };

  // Get simulations from API response
  const simulations: Simulation[] = (simulationsData?.simulations || []) as Simulation[];

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      OFFICIAL: 'Ufficiale',
      PRACTICE: 'Pratica',
      CUSTOM: 'Personalizzata',
      QUICK_QUIZ: 'Quiz Rapido',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      OFFICIAL: colors.status.error.main,
      PRACTICE: colors.status.info.main,
      CUSTOM: colors.primary.main,
      QUICK_QUIZ: colors.status.success.main,
    };
    return colorMap[type] || colors.primary.main;
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

  const renderSimulationCard = (simulation: Simulation) => {
    const isCompleted = simulation.studentStatus === 'completed' || simulation.status === 'completed' || simulation.isCompleted;
    const attemptsUsed = simulation.attemptsUsed || 0;
    const isAvailable = !isCompleted && 
      (!simulation.maxAttempts || attemptsUsed < simulation.maxAttempts);
    
    const hasTimeWindow = simulation.startDate && simulation.endDate;
    const now = new Date();
    const isInTimeWindow = !hasTimeWindow || 
      (new Date(simulation.startDate!) <= now && new Date(simulation.endDate!) >= now);

    // Use unique key combining simulation id and assignment id
    const uniqueKey = simulation.assignmentId 
      ? `${simulation.id}-${simulation.assignmentId}` 
      : simulation.id;

    return (
      <Card
        key={uniqueKey}
        variant="outlined"
        padding="md"
        style={styles.simulationCard}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.typeContainer}>
            <View style={[styles.typeDot, { backgroundColor: getTypeColor(simulation.type) }]} />
            <Text variant="caption" color="muted">
              {getTypeLabel(simulation.type)}
            </Text>
          </View>
          {isCompleted && (
            <Badge variant="success" size="sm">Completata</Badge>
          )}
        </View>

        {/* Title */}
        <Text variant="h5" style={styles.cardTitle} numberOfLines={2}>
          {simulation.title}
        </Text>

        {/* Info row */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={16} color={themedColors.textMuted} />
            <Caption>{simulation.durationMinutes} min</Caption>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="help-circle-outline" size={16} color={themedColors.textMuted} />
            <Caption>{simulation.totalQuestions} domande</Caption>
          </View>
          {simulation.maxAttempts && (
            <View style={styles.infoItem}>
              <Ionicons name="repeat-outline" size={16} color={themedColors.textMuted} />
              <Caption>{attemptsUsed}/{simulation.maxAttempts}</Caption>
            </View>
          )}
        </View>

        {/* Time window */}
        {hasTimeWindow && (
          <View style={[styles.timeWindow, { backgroundColor: themedColors.backgroundSecondary }]}>
            <Ionicons name="calendar-outline" size={14} color={themedColors.textMuted} />
            <Caption>
              {formatDate(simulation.startDate!)} - {formatDate(simulation.endDate!)}
            </Caption>
          </View>
        )}

        {/* Action button */}
        <Button
          variant={isAvailable && isInTimeWindow ? 'primary' : 'secondary'}
          size="md"
          fullWidth
          disabled={!isAvailable || !isInTimeWindow}
          onPress={() => router.push(`/simulation/${simulation.id}`)}
          style={styles.actionButton}
        >
          {isCompleted
            ? 'Vedi Risultati'
            : !isInTimeWindow && hasTimeWindow
            ? 'Non ancora disponibile'
            : !isAvailable
            ? 'Tentativi esauriti'
            : 'Inizia Simulazione'
          }
        </Button>
      </Card>
    );
  };

  if (!user) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={['top']}>
      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: themedColors.border }]}>
        {(['all', 'pending', 'completed'] as TabFilter[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.tabActive,
              activeTab === tab && { borderBottomColor: colors.primary.main },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              variant="button"
              style={[
                styles.tabText,
                { color: activeTab === tab ? colors.primary.main : themedColors.textMuted },
              ]}
            >
              {tab === 'all' ? 'Tutte' : tab === 'pending' ? 'In Attesa' : 'Completate'}
            </Text>
          </TouchableOpacity>
        ))}
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
              Nessuna simulazione
            </Text>
            <Body color="muted" align="center">
              {activeTab === 'completed'
                ? 'Non hai ancora completato nessuna simulazione'
                : activeTab === 'pending'
                ? 'Non hai simulazioni in attesa'
                : 'Non ci sono simulazioni disponibili'}
            </Body>
          </View>
        ) : (
          simulations.map(renderSimulationCard)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: spacing[4],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[3],
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
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
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardTitle: {
    marginBottom: spacing[3],
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing[4],
    marginBottom: spacing[3],
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  timeWindow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: layout.borderRadius.md,
    marginBottom: spacing[3],
  },
  actionButton: {
    marginTop: spacing[1],
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
