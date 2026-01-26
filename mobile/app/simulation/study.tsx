/**
 * Leonardo School Mobile - Study Mode Page
 * 
 * Modalità lettura/studio delle domande.
 * Mostra le domande con le risposte corrette evidenziate.
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text, Button } from '../../components/ui';
import { PageLoader } from '../../components/ui/Loader';
import { RichTextWithLaTeX } from '../../components/ui/LaTeXRenderer';
import { colors } from '../../lib/theme/colors';
import { spacing } from '../../lib/theme/spacing';
import { useTheme } from '../../contexts/ThemeContext';
import { trpc } from '../../lib/trpc';

// Difficulty mapping
const difficultyConfig: Record<string, { label: string; color: string }> = {
  EASY: { label: 'Facile', color: colors.status.success.main },
  MEDIUM: { label: 'Media', color: colors.status.warning.main },
  HARD: { label: 'Difficile', color: colors.status.error.main },
};

export default function StudyModePage() {
  const router = useRouter();
  const { themed } = useTheme();
  const params = useLocalSearchParams<{ ids: string }>();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Parse question IDs from URL
  const questionIds = params.ids?.split(',').filter(Boolean) || [];
  
  // Fetch questions
  const { data: questions, isLoading } = trpc.questions.getByIds.useQuery(
    { ids: questionIds },
    { enabled: questionIds.length > 0 }
  );

  // Dynamic styles
  const dynamicStyles = {
    bg: themed({
      light: colors.background.primary.light,
      dark: colors.background.primary.dark,
    }),
    card: themed({
      light: colors.background.card.light,
      dark: colors.background.card.dark,
    }),
    border: themed({
      light: colors.border.primary.light,
      dark: colors.border.primary.dark,
    }),
    textPrimary: themed({
      light: colors.text.primary.light,
      dark: colors.text.primary.dark,
    }),
    secondary: themed({
      light: colors.background.secondary.light,
      dark: colors.background.secondary.dark,
    }),
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: dynamicStyles.bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <PageLoader />
      </SafeAreaView>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: dynamicStyles.bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={64} color={colors.text.muted.light} />
          <Text variant="body" color="muted" style={{ marginTop: spacing[4] }}>
            Nessuna domanda trovata
          </Text>
          <Button 
            onPress={() => router.replace('/self-practice')}
            style={{ marginTop: spacing[4] }}
          >
            Torna indietro
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const difficulty = difficultyConfig[currentQuestion.difficulty] || {
    label: currentQuestion.difficulty,
    color: colors.text.muted.light,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicStyles.bg }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: dynamicStyles.card, borderBottomColor: dynamicStyles.border }]}>
        <TouchableOpacity
          onPress={() => router.replace('/self-practice')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={dynamicStyles.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text variant="h6">📖 Modalità Studio</Text>
          <Text variant="caption" color="muted">
            {questions.length} domande
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Progress bar */}
      <View style={[styles.progressContainer, { backgroundColor: dynamicStyles.card }]}>
        <View style={styles.progressHeader}>
          <Text variant="caption" color="muted">
            Domanda {currentIndex + 1} di {questions.length}
          </Text>
          <Text variant="caption" style={{ fontWeight: '600' }}>
            {Math.round(progress)}%
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: dynamicStyles.secondary }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%`, backgroundColor: colors.primary.main },
            ]}
          />
        </View>
      </View>

      {/* Question content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Question card */}
        <View style={[styles.questionCard, { backgroundColor: dynamicStyles.card, borderColor: dynamicStyles.border }]}>
          {/* Tags */}
          <View style={styles.tagsContainer}>
            {currentQuestion.subject?.name && (
              <View style={[styles.tag, { backgroundColor: `${colors.primary.main}15` }]}>
                <Text variant="caption" style={{ color: colors.primary.main }}>
                  {currentQuestion.subject.name}
                </Text>
              </View>
            )}
            <View style={[styles.tag, { backgroundColor: `${difficulty.color}20` }]}>
              <Text variant="caption" style={{ color: difficulty.color }}>
                {difficulty.label}
              </Text>
            </View>
            {currentQuestion.topic?.name && (
              <View style={[styles.tag, { backgroundColor: dynamicStyles.secondary }]}>
                <Text variant="caption" color="muted">
                  {currentQuestion.topic.name}
                </Text>
              </View>
            )}
          </View>

          {/* Question text */}
          <View style={styles.questionText}>
            <RichTextWithLaTeX
              content={currentQuestion.textLatex || currentQuestion.text}
              fontSize={16}
            />
          </View>

          {/* Answers */}
          <View style={styles.answersContainer}>
            {currentQuestion.answers?.map((answer: { id: string; text: string; textLatex?: string | null; isCorrect: boolean }, index: number) => {
              const letter = String.fromCodePoint(65 + index);
              const isCorrect = answer.isCorrect;

              return (
                <View
                  key={answer.id}
                  style={[
                    styles.answerCard,
                    {
                      backgroundColor: isCorrect
                        ? `${colors.status.success.main}15`
                        : `${colors.status.error.main}08`,
                      borderColor: isCorrect
                        ? colors.status.success.main
                        : colors.status.error.light,
                    },
                  ]}
                >
                  {/* Letter badge */}
                  <View
                    style={[
                      styles.letterBadge,
                      {
                        backgroundColor: isCorrect
                          ? colors.status.success.main
                          : colors.status.error.light,
                      },
                    ]}
                  >
                    <Text
                      variant="body"
                      style={{
                        color: '#fff',
                        fontWeight: '600',
                      }}
                    >
                      {letter}
                    </Text>
                  </View>

                  {/* Answer text */}
                  <View style={styles.answerText}>
                    <RichTextWithLaTeX
                      content={answer.textLatex || answer.text}
                      fontSize={15}
                    />
                  </View>

                  {/* Icon */}
                  <Ionicons
                    name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                    size={24}
                    color={isCorrect ? colors.status.success.main : colors.status.error.light}
                  />
                </View>
              );
            })}
          </View>

          {/* Explanation */}
          {currentQuestion.generalExplanation && (
            <View style={[styles.explanation, { backgroundColor: `${colors.status.info.main}15` }]}>
              <View style={styles.explanationHeader}>
                <Ionicons name="bulb" size={18} color={colors.status.info.main} />
                <Text variant="body" style={{ fontWeight: '600', marginLeft: spacing[2], color: colors.status.info.main }}>
                  Spiegazione
                </Text>
              </View>
              <Text variant="body" color="secondary" style={{ marginTop: spacing[2] }}>
                {currentQuestion.generalExplanation}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Navigation footer */}
      <SafeAreaView edges={['bottom']} style={[styles.footer, { backgroundColor: dynamicStyles.card, borderTopColor: dynamicStyles.border }]}>
        <TouchableOpacity
          onPress={goPrev}
          disabled={currentIndex === 0}
          style={[
            styles.navButton,
            {
              backgroundColor: currentIndex > 0
                ? dynamicStyles.secondary
                : 'transparent',
              opacity: currentIndex === 0 ? 0.5 : 1,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={dynamicStyles.textPrimary} />
          <Text variant="body">Prec</Text>
        </TouchableOpacity>

        {/* Dots indicator */}
        <View style={styles.dotsContainer}>
          {questions.length <= 20 ? (
            questions.map((_: unknown, idx: number) => (
              <TouchableOpacity
                key={`dot-${idx}`}
                onPress={() => setCurrentIndex(idx)}
                style={[
                  styles.dot,
                  idx === currentIndex && styles.dotActive,
                  { backgroundColor: idx === currentIndex ? colors.primary.main : dynamicStyles.secondary },
                ]}
              />
            ))
          ) : (
            <Text variant="body" color="muted">
              {currentIndex + 1} / {questions.length}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={goNext}
          disabled={currentIndex === questions.length - 1}
          style={[
            styles.navButton,
            {
              backgroundColor: currentIndex < questions.length - 1
                ? colors.primary.main
                : 'transparent',
              opacity: currentIndex === questions.length - 1 ? 0.5 : 1,
            },
          ]}
        >
          <Text
            variant="body"
            style={{
              color: currentIndex < questions.length - 1 ? '#fff' : dynamicStyles.textPrimary,
            }}
          >
            Succ
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={currentIndex < questions.length - 1 ? '#fff' : dynamicStyles.textPrimary}
          />
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing[2],
  },
  headerCenter: {
    alignItems: 'center',
  },
  progressContainer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  questionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    padding: spacing[4],
  },
  tag: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 12,
  },
  questionText: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  answersContainer: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  answerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing[3],
    borderRadius: 12,
    borderWidth: 2,
    gap: spacing[3],
  },
  letterBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerText: {
    flex: 1,
  },
  explanation: {
    margin: spacing[4],
    marginTop: 0,
    padding: spacing[4],
    borderRadius: 12,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: 12,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    maxWidth: 200,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
  },
});
