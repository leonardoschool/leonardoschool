/**
 * Schermata esecuzione simulazione
 * Gestisce il timer, le domande e le risposte durante una simulazione
 * Utilizza le API tRPC reali per caricamento e invio.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  BackHandler,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInRight,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { Text, Button, Card, PageLoader } from '../../../components/ui';
import { colors } from '../../../lib/theme/colors';
import { spacing } from '../../../lib/theme/spacing';
import { typography } from '../../../lib/theme/typography';
import { showConfirmAlert } from '../../../lib/errorHandler';
import { useTheme } from '../../../contexts/ThemeContext';
import { trpc } from '../../../lib/trpc';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Tipo per le domande
interface Question {
  id: string;
  text: string;
  difficulty: 'FACILE' | 'MEDIA' | 'DIFFICILE';
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'OPEN' | 'OPEN_TEXT';
  points: number;
  options: {
    id: string;
    text: string;
  }[];
  subjectId: string;
}

// Tipo per le risposte
interface Answer {
  questionId: string;
  selectedOptionId: string | null;
  isMarked: boolean; // domanda segnata per revisione
}

// Configurazione simulazione
interface SimulationConfig {
  id: string;
  title: string;
  duration: number; // minuti
  questions: Question[];
}

export default function SimulationExecutionScreen() {
  const { id, assignmentId } = useLocalSearchParams<{ id: string; assignmentId?: string }>();
  const router = useRouter();
  const { themed } = useTheme();

  // Stati
  const [loading, setLoading] = useState(true);
  const [simulation, setSimulation] = useState<SimulationConfig | null>(null);
  const [_attemptId, setAttemptId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0); // secondi
  const [showQuestionNav, setShowQuestionNav] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState(Date.now());

  // Animazioni
  const progressScale = useSharedValue(1);

  // tRPC mutations - usa ref per evitare ri-esecuzione useEffect
  const startAttemptMutation = trpc.simulations.startAttempt.useMutation();
  const startAttemptRef = React.useRef(startAttemptMutation);
  startAttemptRef.current = startAttemptMutation;
  
  const submitMutation = trpc.simulations.submit.useMutation();
  const saveProgressMutation = trpc.simulations.saveProgress.useMutation();

  // Styles dinamici
  const dynamicStyles = useMemo(
    () => ({
      container: {
        backgroundColor: themed(colors.background.primary),
      },
      cardBg: themed(colors.background.card),
      textPrimary: themed(colors.text.primary),
      textSecondary: themed(colors.text.secondary),
      border: themed(colors.border.primary),
    }),
    [themed]
  );

  // Ref per submitSimulation per evitare re-render
  const submitSimulationRef = React.useRef<(() => Promise<void>) | null>(null);

  // Tempo scaduto
  const handleTimeExpired = useCallback(() => {
    Alert.alert(
      'Tempo scaduto',
      'Il tempo a disposizione è terminato. La simulazione verrà consegnata automaticamente.',
      [{ text: 'OK', onPress: () => submitSimulationRef.current?.() }]
    );
  }, []);

  // Funzione per gestire uscita
  const handleExitConfirm = useCallback(() => {
    router.back();
  }, [router]);

  // Caricamento simulazione con API reale
  useEffect(() => {
    const loadSimulation = async () => {
      if (!id) {
        Alert.alert('Errore', 'ID simulazione mancante');
        router.back();
        return;
      }

      try {
        // Start attempt - ottieni i dati della simulazione usando la ref
        const result = await startAttemptRef.current.mutateAsync({
          simulationId: id,
          assignmentId: assignmentId || undefined,
        });

        if (!result) {
          throw new Error('Nessun risultato');
        }

        // Trasforma i dati nel formato locale
        const questions: Question[] = result.questions.map((sq: {
          id: string;
          question: {
            text: string;
            difficulty: string;
            type: string;
            points: number;
            answers: Array<{ id: string; text?: string | null; textLatex?: string | null }>;
            subject?: { id: string } | null;
          };
        }) => ({
          id: sq.id,
          text: sq.question.text,
          difficulty: sq.question.difficulty as 'FACILE' | 'MEDIA' | 'DIFFICILE',
          type: sq.question.type as Question['type'],
          points: sq.question.points,
          options: sq.question.answers.map((a: { id: string; text?: string | null; textLatex?: string | null }) => ({
            id: a.id,
            text: a.textLatex || a.text || '',
          })),
          subjectId: sq.question.subject?.id || '',
        }));

        const simConfig: SimulationConfig = {
          id: result.simulation.id,
          title: result.simulation.title,
          duration: result.simulation.duration,
          questions,
        };

        setSimulation(simConfig);
        setAttemptId(result.resultId);
        setTimeRemaining(result.remainingTime || result.simulation.duration * 60);
        setAnswers(
          questions.map((q) => ({
            questionId: q.id,
            selectedOptionId: null,
            isMarked: false,
          }))
        );
        setLoading(false);
      } catch (error) {
        console.error('Errore caricamento simulazione:', error);
        const message = error instanceof Error ? error.message : 'Impossibile caricare la simulazione';
        Alert.alert('Errore', message);
        router.back();
      }
    };

    loadSimulation();
  }, [id, assignmentId, router]);

  // Timer countdown
  useEffect(() => {
    if (loading || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, timeRemaining, handleTimeExpired]);

  // Gestione tasto back hardware (Android)
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      showConfirmAlert(
        'Esci dalla simulazione',
        'Sei sicuro di voler uscire? I tuoi progressi verranno persi.',
        handleExitConfirm,
        undefined,
        'Esci',
        'Continua'
      );
      return true;
    });

    return () => backHandler.remove();
  }, [handleExitConfirm]);

  // Formattazione tempo
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Colore timer in base al tempo rimanente
  const getTimerColor = (): string => {
    const percentRemaining = timeRemaining / ((simulation?.duration || 100) * 60);
    if (percentRemaining <= 0.1) return colors.status.error.main;
    if (percentRemaining <= 0.25) return colors.status.warning.main;
    return colors.primary.main;
  };

  // Selezione risposta
  const selectAnswer = (optionId: string) => {
    setAnswers((prev) =>
      prev.map((a, i) => (i === currentQuestionIndex ? { ...a, selectedOptionId: optionId } : a))
    );
  };

  // Toggle segna domanda
  const toggleMark = () => {
    setAnswers((prev) =>
      prev.map((a, i) => (i === currentQuestionIndex ? { ...a, isMarked: !a.isMarked } : a))
    );
  };

  // Navigazione domande
  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setShowQuestionNav(false);
  };

  const goNext = () => {
    if (currentQuestionIndex < (simulation?.questions.length || 0) - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const goPrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  // Invio simulazione con API reale
  const submitSimulation = async () => {
    if (!simulation || !id) return;
    
    setIsSubmitting(true);
    try {
      // Calcola tempo totale trascorso in secondi
      const totalTimeSpent = Math.floor((Date.now() - startTime) / 1000);
      
      // Prepara le risposte nel formato API
      const apiAnswers = answers.map((a) => ({
        questionId: a.questionId,
        answerId: a.selectedOptionId,
      }));

      await submitMutation.mutateAsync({
        simulationId: id,
        answers: apiAnswers,
        totalTimeSpent,
      });

      // Naviga ai risultati
      router.replace(`/simulation/${id}/result`);
    } catch (error) {
      console.error('Errore invio simulazione:', error);
      const message = error instanceof Error ? error.message : 'Impossibile inviare la simulazione. Riprova.';
      Alert.alert('Errore', message);
      setIsSubmitting(false);
    }
  };

  // Aggiorna la ref per handleTimeExpired
  submitSimulationRef.current = submitSimulation;

  // Salva progresso periodicamente
  const saveProgress = useCallback(async () => {
    if (!simulation || !id) return;
    
    try {
      const apiAnswers = answers.map((a) => ({
        questionId: a.questionId,
        answerId: a.selectedOptionId,
      }));

      await saveProgressMutation.mutateAsync({
        simulationId: id,
        answers: apiAnswers,
        currentQuestion: currentQuestionIndex,
      });
    } catch (error) {
      console.error('Errore salvataggio progresso:', error);
    }
  }, [simulation, id, answers, currentQuestionIndex, saveProgressMutation]);

  // Salva progresso ogni 30 secondi
  useEffect(() => {
    if (loading || !simulation) return;

    const interval = setInterval(() => {
      saveProgress();
    }, 30000);

    return () => clearInterval(interval);
  }, [loading, simulation, saveProgress]);

  // Conferma invio
  const confirmSubmit = () => {
    const answeredCount = answers.filter((a) => a.selectedOptionId !== null).length;
    const totalQuestions = simulation?.questions.length || 0;
    const unansweredCount = totalQuestions - answeredCount;

    let message = `Hai risposto a ${answeredCount} domande su ${totalQuestions}.`;
    if (unansweredCount > 0) {
      message += `\n\n${unansweredCount} domande sono ancora senza risposta.`;
    }
    message += '\n\nVuoi consegnare la simulazione?';

    showConfirmAlert(
      'Consegna simulazione',
      message,
      submitSimulation,
      undefined,
      'Consegna',
      'Continua'
    );
  };

  // Stile animato progress bar
  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progressScale.value }],
  }));

  // Loading state
  if (loading || !simulation) {
    return <PageLoader />;
  }

  const currentQuestion = simulation.questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestionIndex];
  const answeredCount = answers.filter((a) => a.selectedOptionId !== null).length;
  const progressPercent = (answeredCount / simulation.questions.length) * 100;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={[styles.container, dynamicStyles.container]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: dynamicStyles.border }]}>
          <TouchableOpacity
            style={styles.exitButton}
            onPress={() =>
              showConfirmAlert(
                'Esci dalla simulazione',
                'Sei sicuro di voler uscire? I tuoi progressi verranno persi.',
                handleExitConfirm,
                undefined,
                'Esci',
                'Continua'
              )
            }
          >
            <Ionicons name="close" size={24} color={dynamicStyles.textPrimary} />
          </TouchableOpacity>

          <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={20} color={getTimerColor()} />
            <Text style={[styles.timer, { color: getTimerColor() }]}>
              {formatTime(timeRemaining)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setShowQuestionNav(!showQuestionNav)}
          >
            <Ionicons name="grid-outline" size={24} color={dynamicStyles.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBg, { backgroundColor: dynamicStyles.border }]}>
            <Animated.View
              style={[
                styles.progressFill,
                progressStyle,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: colors.primary.main,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: dynamicStyles.textSecondary }]}>
            {answeredCount}/{simulation.questions.length} risposte
          </Text>
        </View>

        {/* Contenuto domanda */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInRight.duration(300)}>
            {/* Numero domanda e mark */}
            <View style={styles.questionHeader}>
              <View style={styles.questionNumber}>
                <Text style={styles.questionNumberText}>
                  Domanda {currentQuestionIndex + 1}
                </Text>
                {currentAnswer?.isMarked && (
                  <View style={styles.markedBadge}>
                    <Ionicons name="flag" size={12} color={colors.status.warning.main} />
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={toggleMark} style={styles.markButton}>
                <Ionicons
                  name={currentAnswer?.isMarked ? 'flag' : 'flag-outline'}
                  size={20}
                  color={
                    currentAnswer?.isMarked ? colors.status.warning.main : dynamicStyles.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.markText,
                    {
                      color: currentAnswer?.isMarked
                        ? colors.status.warning.main
                        : dynamicStyles.textSecondary,
                    },
                  ]}
                >
                  {currentAnswer?.isMarked ? 'Segnata' : 'Segna'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Testo domanda */}
            <Card style={[styles.questionCard, { backgroundColor: dynamicStyles.cardBg }]}>
              <Text style={[styles.questionText, { color: dynamicStyles.textPrimary }]}>
                {currentQuestion.text}
              </Text>
            </Card>

            {/* Opzioni */}
            <View style={styles.optionsContainer}>
              {currentQuestion.options.map((option, index) => {
                const isSelected = currentAnswer?.selectedOptionId === option.id;
                const optionLetter = String.fromCharCode(65 + index); // A, B, C, D, E

                return (
                  <Animated.View
                    key={option.id}
                    entering={SlideInRight.delay(index * 50).duration(300)}
                  >
                    <TouchableOpacity
                      style={[
                        styles.optionButton,
                        {
                          backgroundColor: isSelected ? colors.primary.light : dynamicStyles.cardBg,
                          borderColor: isSelected ? colors.primary.main : dynamicStyles.border,
                        },
                      ]}
                      onPress={() => selectAnswer(option.id)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.optionLetter,
                          {
                            backgroundColor: isSelected
                              ? colors.primary.main
                              : dynamicStyles.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionLetterText,
                            { color: isSelected ? '#fff' : dynamicStyles.textSecondary },
                          ]}
                        >
                          {optionLetter}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color: isSelected
                              ? colors.primary.main
                              : dynamicStyles.textPrimary,
                          },
                        ]}
                      >
                        {option.text}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color={colors.primary.main}
                          style={styles.checkIcon}
                        />
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>
        </ScrollView>

        {/* Footer navigazione */}
        <View style={[styles.footer, { borderTopColor: dynamicStyles.border }]}>
          <TouchableOpacity
            style={[styles.navArrow, currentQuestionIndex === 0 && styles.navArrowDisabled]}
            onPress={goPrev}
            disabled={currentQuestionIndex === 0}
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color={currentQuestionIndex === 0 ? dynamicStyles.border : dynamicStyles.textPrimary}
            />
          </TouchableOpacity>

          {currentQuestionIndex === simulation.questions.length - 1 ? (
            <Button
              onPress={confirmSubmit}
              loading={isSubmitting}
              style={styles.submitButton}
            >
              {isSubmitting ? 'Invio...' : 'Consegna'}
            </Button>
          ) : (
            <TouchableOpacity style={styles.skipButton} onPress={goNext}>
              <Text style={[styles.skipText, { color: dynamicStyles.textSecondary }]}>
                Salta
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.navArrow,
              currentQuestionIndex === simulation.questions.length - 1 && styles.navArrowDisabled,
            ]}
            onPress={goNext}
            disabled={currentQuestionIndex === simulation.questions.length - 1}
          >
            <Ionicons
              name="chevron-forward"
              size={28}
              color={
                currentQuestionIndex === simulation.questions.length - 1
                  ? dynamicStyles.border
                  : dynamicStyles.textPrimary
              }
            />
          </TouchableOpacity>
        </View>

        {/* Pannello navigazione domande */}
        {showQuestionNav && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={[styles.navOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          >
            <TouchableOpacity
              style={styles.navOverlayBg}
              activeOpacity={1}
              onPress={() => setShowQuestionNav(false)}
            />
            <Animated.View
              entering={SlideInRight.duration(300)}
              style={[styles.navPanel, { backgroundColor: dynamicStyles.cardBg }]}
            >
              <View style={styles.navPanelHeader}>
                <Text style={[styles.navPanelTitle, { color: dynamicStyles.textPrimary }]}>
                  Vai alla domanda
                </Text>
                <TouchableOpacity onPress={() => setShowQuestionNav(false)}>
                  <Ionicons name="close" size={24} color={dynamicStyles.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.navGrid} showsVerticalScrollIndicator={false}>
                <View style={styles.navGridContent}>
                  {simulation.questions.map((q, index) => {
                    const answer = answers[index];
                    const isAnswered = answer?.selectedOptionId !== null;
                    const isMarked = answer?.isMarked;
                    const isCurrent = index === currentQuestionIndex;

                    return (
                      <TouchableOpacity
                        key={q.id}
                        style={[
                          styles.navItem,
                          {
                            backgroundColor: isCurrent
                              ? colors.primary.main
                              : isAnswered
                                ? colors.primary.light
                                : dynamicStyles.border,
                            borderColor: isMarked ? colors.status.warning.main : 'transparent',
                            borderWidth: isMarked ? 2 : 0,
                          },
                        ]}
                        onPress={() => goToQuestion(index)}
                      >
                        <Text
                          style={[
                            styles.navItemText,
                            {
                              color:
                                isCurrent || isAnswered ? '#fff' : dynamicStyles.textSecondary,
                            },
                          ]}
                        >
                          {index + 1}
                        </Text>
                        {isMarked && (
                          <View style={styles.navItemFlag}>
                            <Ionicons name="flag" size={8} color={colors.status.warning.main} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Legenda */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: colors.primary.main }]}
                  />
                  <Text style={[styles.legendText, { color: dynamicStyles.textSecondary }]}>
                    Corrente
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: colors.primary.light }]}
                  />
                  <Text style={[styles.legendText, { color: dynamicStyles.textSecondary }]}>
                    Risposta
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      {
                        backgroundColor: dynamicStyles.border,
                        borderColor: colors.status.warning.main,
                        borderWidth: 2,
                      },
                    ]}
                  />
                  <Text style={[styles.legendText, { color: dynamicStyles.textSecondary }]}>
                    Segnata
                  </Text>
                </View>
              </View>
            </Animated.View>
          </Animated.View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[10] + 20, // safe area
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
  },
  exitButton: {
    padding: spacing[1],
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  timer: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  navButton: {
    padding: spacing[1],
  },
  progressContainer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[4],
    paddingBottom: spacing[10],
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  questionNumber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  questionNumberText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary.main,
  },
  markedBadge: {
    padding: 4,
  },
  markButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    padding: spacing[1],
  },
  markText: {
    fontSize: typography.fontSize.sm,
  },
  questionCard: {
    marginBottom: spacing[6],
  },
  questionText: {
    fontSize: typography.fontSize.base,
    lineHeight: 24,
  },
  optionsContainer: {
    gap: spacing[2],
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: 12,
    borderWidth: 2,
    gap: spacing[4],
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  optionText: {
    flex: 1,
    fontSize: typography.fontSize.base,
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    paddingBottom: spacing[10],
    borderTopWidth: 1,
  },
  navArrow: {
    padding: spacing[2],
  },
  navArrowDisabled: {
    opacity: 0.3,
  },
  skipButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[6],
  },
  skipText: {
    fontSize: typography.fontSize.base,
  },
  submitButton: {
    minWidth: 140,
  },
  navOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  navOverlayBg: {
    flex: 1,
  },
  navPanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.8,
    maxWidth: 320,
    paddingTop: spacing[10] + 20,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 20,
  },
  navPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  navPanelTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  navGrid: {
    flex: 1,
  },
  navGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing[4],
    gap: spacing[2],
  },
  navItem: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  navItemFlag: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.fontSize.xs,
  },
});
