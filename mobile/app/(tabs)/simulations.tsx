/**
 * Leonardo School Mobile - Simulations Screen
 * 
 * Lista simulazioni assegnate e disponibili.
 */

import React, { useState } from 'react';
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

import { Text, Body, Caption } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, LegacySubjectBadge } from '../../components/ui/Badge';
import { useThemedColors } from '../../contexts/ThemeContext';
import { colors } from '../../lib/theme/colors';
import type { LegacySubject } from '../../lib/theme/colors';
import { spacing, layout } from '../../lib/theme/spacing';
import type { SimulationType } from '../../types';

// Mock data - in produzione i dati vengono dall'API con materie dinamiche
const mockSimulations: Array<{
  id: string;
  title: string;
  type: SimulationType;
  durationMinutes: number;
  totalQuestions: number;
  subjects: LegacySubject[];
  startDate?: string;
  endDate?: string;
  attemptsUsed: number;
  maxAttempts?: number;
  isCompleted: boolean;
}> = [
  {
    id: '1',
    title: 'TOLC-MED 2026 - Simulazione Ufficiale',
    type: 'OFFICIAL',
    durationMinutes: 90,
    totalQuestions: 50,
    subjects: ['BIOLOGIA', 'CHIMICA', 'FISICA', 'MATEMATICA', 'LOGICA'],
    startDate: '2026-01-10T09:00:00',
    endDate: '2026-01-15T23:59:00',
    attemptsUsed: 0,
    maxAttempts: 1,
    isCompleted: false,
  },
  {
    id: '2',
    title: 'Quiz Rapido - Chimica Organica',
    type: 'QUICK_QUIZ',
    durationMinutes: 15,
    totalQuestions: 10,
    subjects: ['CHIMICA'],
    attemptsUsed: 2,
    isCompleted: false,
  },
  {
    id: '3',
    title: 'Pratica Biologia Cellulare',
    type: 'PRACTICE',
    durationMinutes: 30,
    totalQuestions: 20,
    subjects: ['BIOLOGIA'],
    attemptsUsed: 1,
    isCompleted: true,
  },
  {
    id: '4',
    title: 'Simulazione Fisica + Matematica',
    type: 'CUSTOM',
    durationMinutes: 45,
    totalQuestions: 30,
    subjects: ['FISICA', 'MATEMATICA'],
    startDate: '2026-01-12T14:00:00',
    endDate: '2026-01-12T18:00:00',
    attemptsUsed: 0,
    maxAttempts: 2,
    isCompleted: false,
  },
];

type TabFilter = 'all' | 'pending' | 'completed';

export default function SimulationsScreen() {
  const themedColors = useThemedColors();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const filteredSimulations = mockSimulations.filter(sim => {
    if (activeTab === 'pending') return !sim.isCompleted;
    if (activeTab === 'completed') return sim.isCompleted;
    return true;
  });

  const getTypeLabel = (type: SimulationType) => {
    const labels: Record<SimulationType, string> = {
      OFFICIAL: 'Ufficiale',
      PRACTICE: 'Pratica',
      CUSTOM: 'Personalizzata',
      QUICK_QUIZ: 'Quiz Rapido',
    };
    return labels[type];
  };

  const getTypeColor = (type: SimulationType) => {
    const colorMap: Record<SimulationType, string> = {
      OFFICIAL: colors.status.error.main,
      PRACTICE: colors.status.info.main,
      CUSTOM: colors.primary.main,
      QUICK_QUIZ: colors.status.success.main,
    };
    return colorMap[type];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderSimulationCard = (simulation: typeof mockSimulations[0]) => {
    const isAvailable = !simulation.isCompleted && 
      (!simulation.maxAttempts || simulation.attemptsUsed < simulation.maxAttempts);
    
    const hasTimeWindow = simulation.startDate && simulation.endDate;
    const now = new Date();
    const isInTimeWindow = !hasTimeWindow || 
      (new Date(simulation.startDate!) <= now && new Date(simulation.endDate!) >= now);

    return (
      <Card
        key={simulation.id}
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
          {simulation.isCompleted && (
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
              <Caption>{simulation.attemptsUsed}/{simulation.maxAttempts}</Caption>
            </View>
          )}
        </View>

        {/* Subjects */}
        <View style={styles.subjectsRow}>
          {simulation.subjects.slice(0, 3).map((subject) => (
            <LegacySubjectBadge key={subject} subject={subject} size="sm" />
          ))}
          {simulation.subjects.length > 3 && (
            <Badge variant="default" size="sm">
              +{simulation.subjects.length - 3}
            </Badge>
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
          {simulation.isCompleted
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
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.main}
          />
        }
      >
        {filteredSimulations.length === 0 ? (
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
          filteredSimulations.map(renderSimulationCard)
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
  subjectsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1.5],
    marginBottom: spacing[3],
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
