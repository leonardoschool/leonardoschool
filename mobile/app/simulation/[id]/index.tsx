/**
 * Schermata esecuzione simulazione
 * Gestisce il timer, le domande e le risposte durante una simulazione
 * Supporta:
 * - Simulazioni standard
 * - Simulazioni TOLC con sezioni
 * - Virtual Room con waiting room
 * Utilizza le API tRPC reali per caricamento e invio.
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { RichTextWithLaTeX } from '../../../components/ui/LaTeXRenderer';
import { colors } from '../../../lib/theme/colors';
import { spacing } from '../../../lib/theme/spacing';
import { typography } from '../../../lib/theme/typography';
import { showConfirmAlert } from '../../../lib/errorHandler';
import { useTheme } from '../../../contexts/ThemeContext';
import { trpc } from '../../../lib/trpc';
import {
  StudentWaitingRoom,
  TolcInstructions,
  TolcSimulationLayout,
  InTestMessaging,
  QuestionFeedbackModal,
} from '../../../components/simulation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Tipo per le domande
interface Question {
  id: string;
  text: string;
  textLatex?: string;
  difficulty: 'FACILE' | 'MEDIA' | 'DIFFICILE';
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'OPEN' | 'OPEN_TEXT';
  points: number;
  options: {
    id: string;
    text: string;
    textLatex?: string;
  }[];
  subjectId: string;
}

// Tipo per le risposte (aggiornato per supportare answerText e flagged)
interface Answer {
  questionId: string;
  selectedOptionId: string | null;
  answerText: string | null;
  isMarked: boolean; // domanda segnata per revisione
  timeSpent: number;
}

// Sezione TOLC
interface SimulationSection {
  name: string;
  durationMinutes: number;
  questionIds: string[];
  subjectId?: string;
}

// Configurazione simulazione (estesa per supportare TOLC e Virtual Room)
interface SimulationConfig {
  id: string;
  title: string;
  description?: string;
  duration: number; // minuti
  questions: Question[];
  hasSections: boolean;
  sections: SimulationSection[];
  accessType: 'PUBLIC' | 'ASSIGNED' | 'ROOM';
  enableAntiCheat: boolean;
  correctPoints: number;
  wrongPoints: number;
  blankPoints: number;
  paperInstructions?: string;
  isOfficial: boolean;
  hasInProgressAttempt: boolean;
}

export default function SimulationExecutionScreen() {
  const { id, assignmentId } = useLocalSearchParams<{ id: string; assignmentId?: string }>();
  const router = useRouter();
  const { themed } = useTheme();

  // Stati principali
  const [hasStarted, setHasStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeSpent, setTimeSpent] = useState(0); // tempo trascorso in secondi
  const [showQuestionNav, setShowQuestionNav] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  
  // TOLC section states
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [sectionTimes, setSectionTimes] = useState<Record<number, number>>({});
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());
  // eslint-disable-next-line sonarjs/no-unused-vars -- state reserved for section transition UI
  const [_showSectionTransition, setShowSectionTransition] = useState(false);
  
  // Virtual Room states
  const [hasReadInstructions, setHasReadInstructions] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [showMessaging, setShowMessaging] = useState(false);
  const [messagingUnreadCount, setMessagingUnreadCount] = useState(0);
  
  // Feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const answersRef = useRef<Answer[]>([]);
  const currentQuestionIndexRef = useRef(currentQuestionIndex);
  const answersInitializedRef = useRef(false);
  const lastSectionTimeUpdateRef = useRef(-1);

  // Animazioni
  const progressScale = useSharedValue(1);

  // Tipi per le risposte API
  interface SimulationQuestion {
    questionId: string;
    question: {
      text: string;
      difficulty: string;
      type: string;
      points: number;
      answers: Array<{ id: string; text?: string | null; textLatex?: string | null }>;
      subject?: { id: string } | null;
    };
  }

  // Query per caricare i dati della simulazione
  const { 
    data: simulationData, 
    isLoading: isLoadingSimulation, 
    error: simulationError 
  } = trpc.simulations.getSimulationForStudent.useQuery(
    { id: id || '', assignmentId: assignmentId || undefined },
    { enabled: !!id, staleTime: Infinity }
  );
  
  // Converti i dati in SimulationConfig
  const simulation: SimulationConfig | null = useMemo(() => {
    if (!simulationData) return null;
    
    const questions: Question[] = simulationData.questions.map((sq: SimulationQuestion) => ({
      id: sq.questionId,
      text: sq.question.text,
      difficulty: sq.question.difficulty as 'FACILE' | 'MEDIA' | 'DIFFICILE',
      type: sq.question.type as Question['type'],
      points: sq.question.points,
      options: sq.question.answers.map((a) => ({
        id: a.id,
        text: a.textLatex || a.text || '',
      })),
      subjectId: sq.question.subject?.id || '',
    }));
    
    // Parse sections
    let sections: SimulationSection[] = [];
    if (simulationData.hasSections && simulationData.sections) {
      try {
        sections = simulationData.sections as unknown as SimulationSection[];
        if (!Array.isArray(sections)) sections = [];
      } catch {
        sections = [];
      }
    }
    
    return {
      id: simulationData.id,
      title: simulationData.title,
      description: simulationData.description || undefined,
      duration: simulationData.durationMinutes,
      questions,
      hasSections: simulationData.hasSections || false,
      sections,
      accessType: simulationData.accessType as 'PUBLIC' | 'ASSIGNED' | 'ROOM',
      enableAntiCheat: simulationData.enableAntiCheat || false,
      correctPoints: simulationData.correctPoints,
      wrongPoints: simulationData.wrongPoints,
      blankPoints: simulationData.blankPoints,
      paperInstructions: simulationData.paperInstructions || undefined,
      isOfficial: simulationData.isOfficial || false,
      hasInProgressAttempt: simulationData.hasInProgressAttempt || false,
    };
  }, [simulationData]);
  
  // Check if Virtual Room and TOLC mode
  const isVirtualRoom = simulation?.accessType === 'ROOM';
  const hasSectionsMode = simulation?.hasSections && simulation?.sections.length > 0;

  // Tipo per dati mutation startAttempt
  interface StartAttemptData {
    resultId: string;
    resumed: boolean;
    savedTimeSpent?: number;
    savedAnswers?: Array<{
      questionId: string;
      answerId: string | null;
      answerText?: string | null;
      flagged?: boolean;
      timeSpent?: number;
    }>;
    savedSectionTimes?: Record<number, number>;
    savedCurrentSectionIndex?: number;
  }

  // tRPC mutations
  const startAttemptMutation = trpc.simulations.startAttempt.useMutation({
    onSuccess: (data: StartAttemptData) => {
      setResultId(data.resultId);
      
      if (data.resumed) {
        // Ripristina i dati salvati
        if (data.savedTimeSpent) {
          setTimeSpent(data.savedTimeSpent);
          lastSectionTimeUpdateRef.current = data.savedTimeSpent;
        }
        if (data.savedAnswers && data.savedAnswers.length > 0) {
          const restoredAnswers: Answer[] = data.savedAnswers.map((a: NonNullable<StartAttemptData['savedAnswers']>[number]) => ({
            questionId: a.questionId,
            selectedOptionId: a.answerId,
            answerText: a.answerText || null,
            isMarked: a.flagged || false,
            timeSpent: a.timeSpent || 0,
          }));
          setAnswers(restoredAnswers);
          answersInitializedRef.current = true;
        }
        if (data.savedSectionTimes) {
          setSectionTimes(data.savedSectionTimes);
        }
        if (data.savedCurrentSectionIndex !== undefined) {
          setCurrentSectionIndex(data.savedCurrentSectionIndex);
        }
        Alert.alert('Ripreso', 'Hai ripreso il tuo tentativo precedente');
      }
      
      setHasStarted(true);
    },
    onError: (error: { message?: string }) => {
      const message = error.message || 'Impossibile avviare la simulazione';
      Alert.alert('Errore', message);
    },
  });
  
  const submitMutation = trpc.simulations.submit.useMutation();
  const saveProgressMutation = trpc.simulations.saveProgress.useMutation();
  const heartbeatMutation = trpc.virtualRoom.heartbeat.useMutation();

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

  // Initialize answers when simulation loads
  useEffect(() => {
    if (simulation && hasStarted && answers.length === 0 && !answersInitializedRef.current) {
      answersInitializedRef.current = true;
      setAnswers(
        simulation.questions.map((q) => ({
          questionId: q.id,
          selectedOptionId: null,
          answerText: null,
          isMarked: false,
          timeSpent: 0,
        }))
      );
    }
  }, [simulation, hasStarted, answers.length]);

  // Keep refs in sync
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  // Timer
  useEffect(() => {
    if (!hasStarted || !simulation) return;

    timerRef.current = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasStarted, simulation]);

  // Section timer management
  useEffect(() => {
    if (!hasStarted || !hasSectionsMode) return;
    if (timeSpent <= lastSectionTimeUpdateRef.current) return;
    lastSectionTimeUpdateRef.current = timeSpent;

    setSectionTimes(prev => ({
      ...prev,
      [currentSectionIndex]: (prev[currentSectionIndex] || 0) + 1,
    }));
  }, [timeSpent, hasStarted, hasSectionsMode, currentSectionIndex]);

  // Calculate section time remaining
  const sectionTimeRemaining = useMemo(() => {
    if (!hasSectionsMode || !simulation?.sections[currentSectionIndex]) return null;
    const sectionDuration = simulation.sections[currentSectionIndex].durationMinutes * 60;
    const sectionTimeUsed = sectionTimes[currentSectionIndex] || 0;
    return sectionDuration - sectionTimeUsed;
  }, [hasSectionsMode, simulation, currentSectionIndex, sectionTimes]);

  // Calculate total time remaining
  const timeRemaining = useMemo(() => {
    if (!simulation || simulation.duration <= 0) return null;
    return simulation.duration * 60 - timeSpent;
  }, [simulation, timeSpent]);

  // Virtual Room heartbeat
  useEffect(() => {
    if (!isVirtualRoom || !participantId || !hasStarted) return;

    const sendHeartbeat = () => {
      const currentAnsweredCount = answersRef.current.filter(
        a => a.selectedOptionId !== null || a.answerText !== null
      ).length;
      
      heartbeatMutation.mutate({
        participantId,
        currentQuestionIndex: currentQuestionIndexRef.current,
        answeredCount: currentAnsweredCount,
      });
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 3000);
    return () => clearInterval(interval);
  }, [isVirtualRoom, participantId, hasStarted, heartbeatMutation]);

  // Auto-save progress periodically
  useEffect(() => {
    if (!hasStarted || !resultId) return;

    const saveProgress = () => {
      const answersWithTimes = answers.map((a) => ({
        questionId: a.questionId,
        answerId: a.selectedOptionId,
        answerText: a.answerText,
        timeSpent: a.timeSpent,
        flagged: a.isMarked,
      }));

      saveProgressMutation.mutate({
        resultId,
        answers: answersWithTimes,
        timeSpent,
        sectionTimes,
        currentSectionIndex,
      });
    };

    const interval = setInterval(saveProgress, 30000);
    return () => clearInterval(interval);
  }, [hasStarted, resultId, answers, timeSpent, sectionTimes, currentSectionIndex, saveProgressMutation]);

  // Funzione per gestire uscita
  const handleExitConfirm = useCallback(() => {
    router.back();
  }, [router]);

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
    if (timeRemaining === null) return colors.primary.main;
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

  // Complete section (TOLC mode)
  const handleCompleteSection = useCallback(() => {
    if (!simulation || !hasSectionsMode) return;
    
    setCompletedSections(prev => new Set(prev).add(currentSectionIndex));
    setShowSectionTransition(false);
    
    // Move to next section if available
    if (currentSectionIndex < simulation.sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
      // Find first question of next section
      const nextSection = simulation.sections[currentSectionIndex + 1];
      if (nextSection) {
        const firstQuestionIndex = simulation.questions.findIndex(
          q => nextSection.questionIds.includes(q.id)
        );
        if (firstQuestionIndex >= 0) {
          setCurrentQuestionIndex(firstQuestionIndex);
        }
      }
    }
  }, [simulation, hasSectionsMode, currentSectionIndex]);

  // Invio simulazione con API reale
  const submitSimulation = useCallback(async () => {
    if (!simulation || !id) return;
    
    setIsSubmitting(true);
    try {
      // Prepara le risposte nel formato API
      const apiAnswers = answers.map((a) => ({
        questionId: a.questionId,
        answerId: a.selectedOptionId,
        answerText: a.answerText,
        timeSpent: a.timeSpent,
        flagged: a.isMarked,
      }));

      await submitMutation.mutateAsync({
        simulationId: id,
        answers: apiAnswers,
        totalTimeSpent: timeSpent,
      });

      // Naviga ai risultati
      router.replace(`/simulation/${id}/result`);
    } catch (error) {
      console.error('Errore invio simulazione:', error);
      const message = error instanceof Error ? error.message : 'Impossibile inviare la simulazione. Riprova.';
      Alert.alert('Errore', message);
      setIsSubmitting(false);
    }
  }, [simulation, id, answers, timeSpent, submitMutation, router]);

  // Auto-submit when time expires (after submitSimulation is defined)
  useEffect(() => {
    if (hasStarted && simulation && simulation.duration > 0 && timeRemaining !== null && timeRemaining <= 0) {
      Alert.alert(
        'Tempo scaduto',
        'Il tempo a disposizione è terminato. La simulazione verrà consegnata automaticamente.',
        [{ text: 'OK', onPress: () => submitSimulation() }]
      );
    }
  }, [hasStarted, simulation, timeRemaining, submitSimulation]);

  // Section time auto-advance (after handleCompleteSection is defined)
  useEffect(() => {
    if (!hasSectionsMode || sectionTimeRemaining === null) return;
    if (sectionTimeRemaining <= 0 && !completedSections.has(currentSectionIndex)) {
      handleCompleteSection();
    }
  }, [hasSectionsMode, sectionTimeRemaining, currentSectionIndex, completedSections, handleCompleteSection]);

  // Conferma invio
  const confirmSubmit = () => {
    const answeredCount = answers.filter((a) => a.selectedOptionId !== null || a.answerText !== null).length;
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
  if (isLoadingSimulation || !simulation) {
    return <PageLoader />;
  }
  
  // Error state
  if (simulationError) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, dynamicStyles.container, styles.errorContainer]}>
          <Ionicons name="alert-circle" size={48} color={colors.status.error.main} />
          <Text style={[styles.errorText, { color: dynamicStyles.textPrimary }]}>
            {simulationError.message || 'Impossibile caricare la simulazione'}
          </Text>
          <Button onPress={() => router.back()}>Torna indietro</Button>
        </View>
      </>
    );
  }

  // Virtual Room: show waiting room (before hasStarted)
  if (!hasStarted && isVirtualRoom && assignmentId) {
    // For TOLC-style simulations, show instructions first
    if (hasSectionsMode && !hasReadInstructions) {
      return (
        <>
          <Stack.Screen options={{ headerShown: false }} />
          <TolcInstructions
            simulationTitle={simulation.title}
            durationMinutes={simulation.duration}
            totalQuestions={simulation.questions.length}
            sectionsCount={simulation.sections.length}
            onContinue={() => setHasReadInstructions(true)}
          />
        </>
      );
    }
    
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StudentWaitingRoom
          assignmentId={assignmentId}
          simulationTitle={simulation.title}
          durationMinutes={simulation.duration}
          instructions={simulation.paperInstructions}
          onSessionStart={(_actualStartAt, pId) => {
            setParticipantId(pId);
            startAttemptMutation.mutate({
              simulationId: id,
              assignmentId,
            });
          }}
        />
      </>
    );
  }

  // Start screen (for non-Virtual Room simulations)
  if (!hasStarted) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView 
          style={[styles.container, dynamicStyles.container]}
          contentContainerStyle={styles.startScreenContent}
        >
          <View style={styles.startCard}>
            {simulation.isOfficial && (
              <View style={styles.officialBadge}>
                <Ionicons name="ribbon" size={16} color={colors.status.error.main} />
                <Text style={styles.officialBadgeText}>Simulazione Ufficiale</Text>
              </View>
            )}
            
            <Text style={[styles.startTitle, { color: dynamicStyles.textPrimary }]}>
              {simulation.title}
            </Text>
            
            {simulation.description && (
              <Text style={[styles.startDescription, { color: dynamicStyles.textSecondary }]}>
                {simulation.description}
              </Text>
            )}
            
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: dynamicStyles.cardBg }]}>
                <Ionicons name="help-circle-outline" size={24} color={colors.primary.main} />
                <Text style={[styles.statValue, { color: dynamicStyles.textPrimary }]}>
                  {simulation.questions.length}
                </Text>
                <Text style={[styles.statLabel, { color: dynamicStyles.textSecondary }]}>
                  Domande
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: dynamicStyles.cardBg }]}>
                <Ionicons name="time-outline" size={24} color={colors.primary.main} />
                <Text style={[styles.statValue, { color: dynamicStyles.textPrimary }]}>
                  {simulation.duration > 0 ? `${simulation.duration} min` : '∞'}
                </Text>
                <Text style={[styles.statLabel, { color: dynamicStyles.textSecondary }]}>
                  Tempo
                </Text>
              </View>
            </View>
            
            <View style={[styles.scoringCard, { backgroundColor: dynamicStyles.cardBg }]}>
              <Text style={[styles.scoringTitle, { color: dynamicStyles.textPrimary }]}>
                Punteggio:
              </Text>
              <Text style={[styles.scoringItem, { color: colors.status.success.main }]}>
                ✓ Risposta corretta: +{simulation.correctPoints}
              </Text>
              <Text style={[styles.scoringItem, { color: colors.status.error.main }]}>
                ✗ Risposta errata: {simulation.wrongPoints}
              </Text>
              <Text style={[styles.scoringItem, { color: dynamicStyles.textSecondary }]}>
                ○ Non risposta: {simulation.blankPoints}
              </Text>
            </View>
            
            {simulation.hasInProgressAttempt && (
              <View style={styles.resumeBanner}>
                <Ionicons name="information-circle" size={20} color={colors.primary.main} />
                <Text style={styles.resumeText}>
                  Hai un tentativo in corso. Cliccando &quot;Inizia&quot; riprenderai da dove ti eri fermato.
                </Text>
              </View>
            )}
            
            <Button
              onPress={() => {
                startAttemptMutation.mutate({
                  simulationId: id,
                  assignmentId: assignmentId || undefined,
                });
              }}
              loading={startAttemptMutation.isPending}
              style={styles.startButton}
            >
              {simulation.hasInProgressAttempt ? 'Riprendi Simulazione' : 'Inizia Simulazione'}
            </Button>
            
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={[styles.backButtonText, { color: dynamicStyles.textSecondary }]}>
                ← Torna indietro
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </>
    );
  }

  // TOLC mode: use TolcSimulationLayout
  if (hasSectionsMode && simulation.sections.length > 0) {
    const tolcAnswers = answers.map(a => ({
      questionId: a.questionId,
      answerId: a.selectedOptionId,
      answerText: a.answerText,
      timeSpent: a.timeSpent,
      flagged: a.isMarked,
    }));
    
    const tolcQuestions = simulation.questions.map(q => ({
      questionId: q.id,
      question: {
        text: q.text,
        answers: q.options.map(o => ({
          id: o.id,
          text: o.text,
        })),
      },
    }));

    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <TolcSimulationLayout
          simulationTitle={simulation.title}
          questions={tolcQuestions}
          sections={simulation.sections}
          currentSectionIndex={currentSectionIndex}
          currentQuestionIndex={currentQuestionIndex}
          answers={tolcAnswers}
          sectionTimeRemaining={sectionTimeRemaining}
          completedSections={completedSections}
          onAnswerSelect={(answerId: string) => {
            const currentQ = simulation.questions[currentQuestionIndex];
            if (!currentQ) return;
            setAnswers(prev => prev.map(a => 
              a.questionId === currentQ.id 
                ? { ...a, selectedOptionId: a.selectedOptionId === answerId ? null : answerId }
                : a
            ));
          }}
          onOpenTextChange={(text: string) => {
            const currentQ = simulation.questions[currentQuestionIndex];
            if (!currentQ) return;
            setAnswers(prev => prev.map(a => 
              a.questionId === currentQ.id ? { ...a, answerText: text } : a
            ));
          }}
          onToggleFlag={() => {
            const currentQ = simulation.questions[currentQuestionIndex];
            if (!currentQ) return;
            setAnswers(prev => prev.map(a => 
              a.questionId === currentQ.id ? { ...a, isMarked: !a.isMarked } : a
            ));
          }}
          onGoToQuestion={goToQuestion}
          onGoNext={goNext}
          onGoPrev={goPrev}
          onCompleteSection={() => setShowSectionTransition(true)}
          onSubmit={confirmSubmit}
          onReportQuestion={() => setShowFeedbackModal(true)}
          answeredCount={answers.filter(a => a.selectedOptionId !== null || a.answerText !== null).length}
          totalQuestions={simulation.questions.length}
        />
        
        {/* In-test messaging for Virtual Room */}
        {isVirtualRoom && participantId && (
          <InTestMessaging
            participantId={participantId}
            isOpen={showMessaging}
            onClose={() => setShowMessaging(false)}
            unreadCount={messagingUnreadCount}
            onUnreadChange={setMessagingUnreadCount}
          />
        )}
        
        {/* Messaging button */}
        {isVirtualRoom && participantId && !showMessaging && (
          <TouchableOpacity
            style={styles.messagingButton}
            onPress={() => setShowMessaging(true)}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
            {messagingUnreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{messagingUnreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        
        {/* Question Feedback Modal for TOLC */}
        <QuestionFeedbackModal
          visible={showFeedbackModal}
          questionId={simulation.questions[currentQuestionIndex]?.id || ''}
          questionText={simulation.questions[currentQuestionIndex]?.text}
          onClose={() => setShowFeedbackModal(false)}
        />
      </>
    );
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
              {timeRemaining !== null ? formatTime(timeRemaining) : formatTime(timeSpent)}
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
              
              {/* Pulsante segnala problema */}
              <TouchableOpacity 
                onPress={() => setShowFeedbackModal(true)} 
                style={[styles.markButton, { marginLeft: spacing[2] }]}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color={dynamicStyles.textSecondary}
                />
                <Text
                  style={[
                    styles.markText,
                    { color: dynamicStyles.textSecondary },
                  ]}
                >
                  Segnala
                </Text>
              </TouchableOpacity>
            </View>

            {/* Testo domanda */}
            <Card style={[styles.questionCard, { backgroundColor: dynamicStyles.cardBg }]}>
              <RichTextWithLaTeX 
                content={currentQuestion.textLatex || currentQuestion.text} 
                fontSize={16}
              />
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
                      <View style={{ flex: 1 }}>
                        <RichTextWithLaTeX 
                          content={option.textLatex || option.text} 
                          fontSize={15}
                        />
                      </View>
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
        
        {/* Question Feedback Modal */}
        <QuestionFeedbackModal
          visible={showFeedbackModal}
          questionId={currentQuestion?.id || ''}
          questionText={currentQuestion?.text}
          onClose={() => setShowFeedbackModal(false)}
        />
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
  // New styles for start screen and error states
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
    gap: spacing[4],
  },
  errorText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginTop: spacing[2],
  },
  startScreenContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing[4],
  },
  startCard: {
    padding: spacing[6],
    alignItems: 'center',
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 20,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    marginBottom: spacing[4],
  },
  officialBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.status.error.main,
  },
  startTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  startDescription: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  statCard: {
    flex: 1,
    padding: spacing[4],
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing[2],
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing[1],
  },
  scoringCard: {
    width: '100%',
    padding: spacing[4],
    borderRadius: 12,
    marginBottom: spacing[4],
  },
  scoringTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[2],
  },
  scoringItem: {
    fontSize: typography.fontSize.sm,
    marginVertical: spacing[0.5],
  },
  resumeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    marginBottom: spacing[4],
    width: '100%',
  },
  resumeText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.primary.main,
  },
  startButton: {
    width: '100%',
    marginBottom: spacing[4],
  },
  backButton: {
    paddingVertical: spacing[2],
  },
  backButtonText: {
    fontSize: typography.fontSize.base,
  },
  messagingButton: {
    position: 'absolute',
    bottom: spacing[20],
    right: spacing[4],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.status.error.main,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[1],
  },
  unreadBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
  },
});
