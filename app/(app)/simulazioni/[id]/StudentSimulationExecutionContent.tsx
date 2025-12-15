'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { PageLoader, Spinner } from '@/components/ui/loaders';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';
import { useAntiCheat } from '@/lib/hooks/useAntiCheat';
import {
  ArrowLeft,
  Clock,
  Target,
  Flag,
  CheckCircle,
  AlertCircle,
  Play,
  Send,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Award,
  Shield,
  ShieldAlert,
  Maximize,
  EyeOff,
  Layers,
  Lock,
  CalendarPlus,
} from 'lucide-react';

interface Answer {
  questionId: string;
  answerId: string | null;
  answerText: string | null;
  timeSpent: number;
  flagged: boolean;
}

// Section type matching database schema (from wizard)
interface SimulationSection {
  name: string;
  durationMinutes: number;
  questionIds: string[];
  subjectId?: string;
}

interface StudentSimulationExecutionContentProps {
  id: string;
}

export default function StudentSimulationExecutionContent({ id }: StudentSimulationExecutionContentProps) {
  const router = useRouter();
  const { handleMutationError } = useApiError();
  const { showSuccess, showError } = useToast();

  // State
  const [hasStarted, setHasStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  
  // Section state for TOLC-style simulations
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [sectionTimes, setSectionTimes] = useState<Record<number, number>>({});
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());
  const [showSectionTransition, setShowSectionTransition] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
  const [showNavigation, setShowNavigation] = useState(false);
  const [submitConfirm, setSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questionStartTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSubmitRef = useRef<(() => void) | null>(null);

  // Fetch simulation
  const { data: simulation, isLoading, error } = trpc.simulations.getSimulationForStudent.useQuery(
    { id },
    { enabled: !hasStarted }
  );

  // Mutations
  const startAttemptMutation = trpc.simulations.startAttempt.useMutation({
    onSuccess: (data) => {
      setHasStarted(true);
      if (data.resumed) {
        showSuccess('Ripreso', 'Hai ripreso il tuo tentativo precedente');
      }
    },
    onError: handleMutationError,
  });

  const saveProgressMutation = trpc.simulations.saveProgress.useMutation({
    onError: (error) => {
      console.error('Save progress error:', error);
    },
  });

  const submitMutation = trpc.simulations.submit.useMutation({
    onSuccess: (data) => {
      showSuccess('Completata!', 'Simulazione inviata con successo');
      router.push(`/simulazioni/${id}/risultato?resultId=${data.resultId}`);
    },
    onError: handleMutationError,
  });

  // Anti-cheat configuration
  const antiCheatConfig = useMemo(() => ({
    enabled: hasStarted && (simulation?.enableAntiCheat ?? false),
    requireFullscreen: simulation?.forceFullscreen ?? false,
    blockTabSwitch: true,
    blockDevTools: true,
    blockClipboard: true,
    blockShortcuts: true,
    blockReload: true,
    maxViolations: 10,
    onViolation: (event: { type: string; timestamp: Date; details?: string }) => {
      console.warn('[AntiCheat] Violation:', event);
    },
    onMaxViolations: () => {
      showError('Attenzione', 'Troppe violazioni rilevate. La simulazione verrà terminata.');
      autoSubmitRef.current?.();
    },
    onFullscreenExit: () => {
      // Fullscreen exit is handled automatically by the hook
    },
  }), [hasStarted, simulation?.enableAntiCheat, simulation?.forceFullscreen, showError]);

  const antiCheat = useAntiCheat(antiCheatConfig);

  // Update auto-submit ref when dependencies change
  useEffect(() => {
    autoSubmitRef.current = () => {
      if (!simulation || isSubmitting) return;
      setIsSubmitting(true);
      
      const finalAnswers = answers.map((a) => ({
        questionId: a.questionId,
        answerId: a.answerId,
        answerText: a.answerText,
        timeSpent: questionTimes[a.questionId] || 0,
        flagged: a.flagged,
      }));

      submitMutation.mutate({
        simulationId: id,
        answers: finalAnswers,
        totalTimeSpent: timeSpent,
      });
    };
  }, [simulation, isSubmitting, answers, questionTimes, timeSpent, id, submitMutation]);

  // Initialize answers when simulation loads
  useEffect(() => {
    if (simulation && hasStarted && answers.length === 0) {
      setAnswers(
        simulation.questions.map((sq) => ({
          questionId: sq.questionId,
          answerId: null,
          answerText: null,
          timeSpent: 0,
          flagged: false,
        }))
      );
    }
  }, [simulation, hasStarted, answers.length]);

  // Timer
  useEffect(() => {
    if (!hasStarted || !simulation) return;

    // Initialize question start time when simulation starts
    questionStartTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasStarted, simulation]);

  // Track question time
  const trackQuestionTime = useCallback(() => {
    if (!simulation || !hasStarted) return;
    const currentQuestion = simulation.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const elapsed = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
    setQuestionTimes((prev) => ({
      ...prev,
      [currentQuestion.questionId]: (prev[currentQuestion.questionId] || 0) + elapsed,
    }));
    questionStartTimeRef.current = Date.now();
  }, [simulation, currentQuestionIndex, hasStarted]);

  // Auto-save progress periodically
  useEffect(() => {
    if (!hasStarted || !startAttemptMutation.data?.resultId) return;

    const interval = setInterval(() => {
      const answersWithTimes = answers.map((a) => ({
        ...a,
        timeSpent: questionTimes[a.questionId] || 0,
      }));

      saveProgressMutation.mutate({
        resultId: startAttemptMutation.data.resultId,
        answers: answersWithTimes,
        timeSpent,
      });
    }, 30000); // Save every 30 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, answers, timeSpent, questionTimes]);

  // Handle answer selection
  const handleAnswerSelect = (answerId: string) => {
    if (!simulation) return;
    const currentQuestion = simulation.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    setAnswers((prev) =>
      prev.map((a) =>
        a.questionId === currentQuestion.questionId
          ? { ...a, answerId: a.answerId === answerId ? null : answerId }
          : a
      )
    );
  };

  // Handle flag toggle
  const handleToggleFlag = () => {
    if (!simulation) return;
    const currentQuestion = simulation.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    setAnswers((prev) =>
      prev.map((a) =>
        a.questionId === currentQuestion.questionId ? { ...a, flagged: !a.flagged } : a
      )
    );
  };

  // Navigate questions
  const goToQuestion = (index: number) => {
    trackQuestionTime();
    setCurrentQuestionIndex(index);
    setShowNavigation(false);
  };

  const goNext = () => {
    if (!simulation || currentQuestionIndex >= simulation.questions.length - 1) return;
    trackQuestionTime();
    setCurrentQuestionIndex((prev) => prev + 1);
  };

  const goPrev = () => {
    if (currentQuestionIndex <= 0) return;
    trackQuestionTime();
    setCurrentQuestionIndex((prev) => prev - 1);
  };

  // Submit simulation
  const handleSubmit = async () => {
    if (!simulation) return;
    setIsSubmitting(true);

    trackQuestionTime();

    const finalAnswers = answers.map((a) => ({
      questionId: a.questionId,
      answerId: a.answerId,
      answerText: a.answerText,
      timeSpent: questionTimes[a.questionId] || 0,
      flagged: a.flagged,
    }));

    submitMutation.mutate({
      simulationId: id,
      answers: finalAnswers,
      totalTimeSpent: timeSpent,
    });
  };

  // Format time
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Parse sections from simulation (if TOLC-style)
  const sections: SimulationSection[] = useMemo(() => {
    if (!simulation?.hasSections || !simulation.sections) return [];
    try {
      const parsed = simulation.sections as unknown as SimulationSection[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [simulation?.hasSections, simulation?.sections]);

  const hasSectionsMode = sections.length > 0;

  // Get current section info
  const currentSection = hasSectionsMode ? sections[currentSectionIndex] : null;
  
  // Get questions for current section (or all questions if no sections)
  const currentSectionQuestions = useMemo(() => {
    if (!simulation?.questions) return [];
    if (!hasSectionsMode || !currentSection) {
      return simulation.questions;
    }
    // Filter questions that belong to current section
    return simulation.questions.filter(q => 
      currentSection.questionIds.includes(q.questionId)
    );
  }, [simulation?.questions, hasSectionsMode, currentSection]);

  // Get question index within current section
  const currentSectionQuestionIndex = useMemo(() => {
    if (!hasSectionsMode) return currentQuestionIndex;
    // Map global question index to section question index
    const currentQ = simulation?.questions[currentQuestionIndex];
    if (!currentQ) return 0;
    return currentSectionQuestions.findIndex(q => q.questionId === currentQ.questionId);
  }, [hasSectionsMode, currentQuestionIndex, simulation?.questions, currentSectionQuestions]);

  // Section timer management
  useEffect(() => {
    if (!hasStarted || !hasSectionsMode) return;

    // Update section time when timer changes
    setSectionTimes(prev => ({
      ...prev,
      [currentSectionIndex]: (prev[currentSectionIndex] || 0) + 1,
    }));
  }, [timeSpent, hasStarted, hasSectionsMode, currentSectionIndex]);

  // Section time remaining
  const sectionTimeRemaining = useMemo(() => {
    if (!hasSectionsMode || !currentSection) return null;
    const sectionDuration = currentSection.durationMinutes * 60;
    const sectionTimeUsed = sectionTimes[currentSectionIndex] || 0;
    return sectionDuration - sectionTimeUsed;
  }, [hasSectionsMode, currentSection, currentSectionIndex, sectionTimes]);

  // Auto-advance section when section time runs out
  useEffect(() => {
    if (!hasSectionsMode || sectionTimeRemaining === null) return;
    if (sectionTimeRemaining <= 0 && hasStarted && !completedSections.has(currentSectionIndex)) {
      showError('Tempo sezione scaduto', `Il tempo per "${currentSection?.name}" è terminato`);
      handleCompleteSection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionTimeRemaining, hasStarted, hasSectionsMode, currentSectionIndex]);

  // Complete current section and move to next
  const handleCompleteSection = useCallback(() => {
    if (!hasSectionsMode) return;
    
    // Mark section as completed
    setCompletedSections(prev => new Set([...prev, currentSectionIndex]));
    
    // Move to next section if available
    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
      // Find first question of next section
      const nextSection = sections[currentSectionIndex + 1];
      if (nextSection && simulation?.questions) {
        const firstQuestionIndex = simulation.questions.findIndex(
          q => nextSection.questionIds.includes(q.questionId)
        );
        if (firstQuestionIndex >= 0) {
          setCurrentQuestionIndex(firstQuestionIndex);
        }
      }
      setShowSectionTransition(false);
    }
  }, [hasSectionsMode, currentSectionIndex, sections, simulation?.questions]);

  // Show section transition modal
  const handleRequestSectionComplete = () => {
    if (!hasSectionsMode) return;
    setShowSectionTransition(true);
  };

  // Time remaining
  const timeRemaining = simulation?.durationMinutes
    ? simulation.durationMinutes * 60 - timeSpent
    : null;

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining <= 0 && hasStarted && !isSubmitting) {
      showError('Tempo scaduto', 'La simulazione verrà inviata automaticamente');
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, hasStarted, isSubmitting]);

  // Loading state
  if (isLoading) {
    return <PageLoader />;
  }

  // Error state
  if (error || !simulation) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className={`text-center py-12 ${colors.background.card} rounded-xl border ${colors.border.light}`}>
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-3" />
          <p className={`font-medium ${colors.text.primary}`}>
            {error?.message || 'Simulazione non disponibile'}
          </p>
          <Link
            href="/simulazioni"
            className={`inline-flex items-center gap-2 mt-4 ${colors.primary.text}`}
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alle simulazioni
          </Link>
        </div>
      </div>
    );
  }

  // Start screen
  if (!hasStarted) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-2xl mx-auto">
        <Link
          href="/simulazioni"
          className={`inline-flex items-center gap-2 text-sm ${colors.text.muted} hover:${colors.text.primary} mb-6`}
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alle simulazioni
        </Link>

        <div className={`rounded-xl p-8 ${colors.background.card} border ${colors.border.light} text-center`}>
          {simulation.isOfficial && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium mb-4">
              <Award className="w-4 h-4" />
              Simulazione Ufficiale
            </div>
          )}

          <h1 className={`text-2xl font-bold ${colors.text.primary} mb-2`}>{simulation.title}</h1>
          {simulation.description && (
            <p className={`${colors.text.secondary} mb-6`}>{simulation.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className={`p-4 rounded-lg ${colors.background.secondary}`}>
              <Target className="w-6 h-6 mx-auto text-gray-500 mb-2" />
              <p className={`text-2xl font-bold ${colors.text.primary}`}>{simulation.totalQuestions}</p>
              <p className={`text-sm ${colors.text.muted}`}>Domande</p>
            </div>
            <div className={`p-4 rounded-lg ${colors.background.secondary}`}>
              <Clock className="w-6 h-6 mx-auto text-gray-500 mb-2" />
              <p className={`text-2xl font-bold ${colors.text.primary}`}>
                {simulation.durationMinutes > 0 ? `${simulation.durationMinutes} min` : '∞'}
              </p>
              <p className={`text-sm ${colors.text.muted}`}>Tempo</p>
            </div>
          </div>

          <div className={`mb-8 text-left p-4 rounded-lg ${colors.background.secondary}`}>
            <h3 className={`font-medium ${colors.text.primary} mb-3`}>Punteggio:</h3>
            <ul className={`space-y-1 text-sm ${colors.text.secondary}`}>
              <li>✓ Risposta corretta: <span className="font-medium text-green-600">+{simulation.correctPoints}</span></li>
              <li>✗ Risposta errata: <span className="font-medium text-red-600">{simulation.wrongPoints}</span></li>
              <li>○ Non risposta: <span className="font-medium">{simulation.blankPoints}</span></li>
            </ul>
          </div>

          {/* Anti-cheat warning */}
          {simulation.enableAntiCheat && (
            <div className="mb-4 p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-left">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-800 dark:text-orange-300 mb-1">
                    Protezione Anti-Cheat Attiva
                  </h4>
                  <p className="text-sm text-orange-700 dark:text-orange-400">
                    Durante questa simulazione verranno monitorati:
                  </p>
                  <ul className="text-sm text-orange-600 dark:text-orange-400 mt-2 space-y-1">
                    <li>• Cambio finestra/tab del browser</li>
                    <li>• Apertura strumenti sviluppatore</li>
                    <li>• Tentativi di copia/incolla</li>
                    {simulation.forceFullscreen && <li>• Uscita dalla modalità schermo intero</li>}
                  </ul>
                  {simulation.forceFullscreen && (
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-300 mt-3">
                      ⚠️ Sarà richiesta la modalità schermo intero
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {simulation.hasInProgressAttempt && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Hai un tentativo in corso. Cliccando &quot;Inizia&quot; riprenderai da dove ti eri fermato.
              </p>
            </div>
          )}

          {/* Calendar download for scheduled simulations */}
          {simulation.startDate && (
            <a
              href={`/api/simulations/${id}/calendar`}
              download
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 mb-3 rounded-lg border ${colors.border.light} ${colors.text.secondary} hover:${colors.background.secondary} transition-colors`}
            >
              <CalendarPlus className="w-5 h-5" />
              Aggiungi al Calendario
            </a>
          )}

          <button
            onClick={() => startAttemptMutation.mutate({ simulationId: id })}
            disabled={startAttemptMutation.isPending}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white ${colors.primary.bg} hover:opacity-90 disabled:opacity-50 text-lg font-medium`}
          >
            {startAttemptMutation.isPending ? (
              <Spinner size="sm" variant="white" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            {simulation.hasInProgressAttempt ? 'Riprendi Simulazione' : 'Inizia Simulazione'}
          </button>
        </div>
      </div>
    );
  }

  // Execution screen
  const currentQuestion = simulation.questions[currentQuestionIndex];
  const currentAnswer = answers.find((a) => a.questionId === currentQuestion?.questionId);
  const answeredCount = answers.filter((a) => a.answerId !== null).length;
  const flaggedCount = answers.filter((a) => a.flagged).length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Anti-cheat warning banner */}
      {simulation.enableAntiCheat && (antiCheat.isBlurred || (simulation.forceFullscreen && !antiCheat.isFullscreen)) && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className={`max-w-md p-8 rounded-2xl ${colors.background.card} text-center`}>
            <EyeOff className="w-16 h-16 mx-auto text-orange-500 mb-4" />
            <h2 className={`text-xl font-bold ${colors.text.primary} mb-3`}>
              {antiCheat.isBlurred 
                ? 'Torna alla simulazione!' 
                : 'Schermo intero richiesto'}
            </h2>
            <p className={`${colors.text.secondary} mb-6`}>
              {antiCheat.isBlurred 
                ? 'Hai lasciato la finestra della simulazione. Questo evento è stato registrato.' 
                : 'Questa simulazione richiede la modalità schermo intero. Clicca il pulsante per continuare.'}
            </p>
            {simulation.forceFullscreen && !antiCheat.isFullscreen && (
              <button
                onClick={() => antiCheat.requestFullscreen()}
                className={`flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg text-white ${colors.primary.bg} hover:opacity-90`}
              >
                <Maximize className="w-5 h-5" />
                Attiva schermo intero
              </button>
            )}
            <p className={`mt-4 text-sm ${colors.text.muted}`}>
              Violazioni: {antiCheat.violationCount}/10
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`sticky top-0 z-10 ${colors.background.card} border-b ${colors.border.light} px-4 py-3`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className={`font-semibold ${colors.text.primary} hidden sm:block`}>{simulation.title}</h1>
            <span className={`text-sm ${colors.text.muted}`}>
              {hasSectionsMode && currentSection ? (
                // Show section progress for TOLC-style
                <>
                  <span className="hidden sm:inline">{currentSection.name}: </span>
                  {currentSectionQuestionIndex + 1}/{currentSectionQuestions.length}
                </>
              ) : (
                // Show global progress
                <>{currentQuestionIndex + 1}/{simulation.totalQuestions}</>
              )}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Anti-cheat indicator */}
            {simulation.enableAntiCheat && (
              <div
                className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                  antiCheat.violationCount > 0
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                }`}
                title={antiCheat.violationCount > 0 
                  ? `${antiCheat.violationCount} violazioni rilevate` 
                  : 'Monitoraggio attivo'}
              >
                {antiCheat.violationCount > 0 ? (
                  <ShieldAlert className="w-4 h-4" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {antiCheat.violationCount > 0 
                    ? `${antiCheat.violationCount}/10` 
                    : 'Protetto'}
                </span>
              </div>
            )}

            {/* Timer */}
            {hasSectionsMode && currentSection ? (
              // Section timer for TOLC-style
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                sectionTimeRemaining !== null && sectionTimeRemaining < 60 
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              }`}>
                <Layers className="w-4 h-4" />
                <span className="font-mono font-medium text-sm">
                  {currentSection.name}: {sectionTimeRemaining !== null ? formatTime(sectionTimeRemaining) : '--:--'}
                </span>
              </div>
            ) : (
              // Global timer
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                timeRemaining !== null && timeRemaining < 300 
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
                  : colors.background.secondary
              }`}>
                <Clock className="w-4 h-4" />
                <span className="font-mono font-medium">
                  {timeRemaining !== null ? formatTime(timeRemaining) : formatTime(timeSpent)}
                </span>
              </div>
            )}

            {/* Progress */}
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors.background.secondary}`}>
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className={`text-sm ${colors.text.secondary}`}>{answeredCount}/{simulation.totalQuestions}</span>
            </div>

            {/* Navigation toggle */}
            <button
              onClick={() => setShowNavigation(!showNavigation)}
              className={`p-2 rounded-lg ${colors.background.hover} ${showNavigation ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>

            {/* Submit button */}
            <button
              onClick={() => setSubmitConfirm(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${colors.primary.bg} hover:opacity-90`}
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Consegna</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Question panel */}
        <div className="flex-1 px-4 py-6">
          <div className="max-w-3xl mx-auto">
            {/* Question header */}
            <div className="flex items-center justify-between mb-4">
              <span className={`text-sm font-medium ${colors.text.muted}`}>
                Domanda {currentQuestionIndex + 1}
              </span>
              <button
                onClick={handleToggleFlag}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                  currentAnswer?.flagged
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    : `${colors.background.hover} ${colors.text.secondary}`
                }`}
              >
                <Flag className="w-4 h-4" />
                {currentAnswer?.flagged ? 'Contrassegnata' : 'Contrassegna'}
              </button>
            </div>

            {/* Question text */}
            <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light} mb-6`}>
              <div
                className={`prose prose-sm max-w-none ${colors.text.primary}`}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentQuestion?.question.text || '') }}
              />
            </div>

            {/* Answers */}
            <div className="space-y-3">
              {currentQuestion?.question.answers.map((answer, index) => {
                const isSelected = currentAnswer?.answerId === answer.id;
                const label = String.fromCharCode(65 + index); // A, B, C, D...

                return (
                  <button
                    key={answer.id}
                    onClick={() => handleAnswerSelect(answer.id)}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : `border-transparent ${colors.background.card} hover:border-gray-300 dark:hover:border-gray-600`
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-medium ${
                        isSelected
                          ? 'bg-red-500 text-white'
                          : `${colors.background.secondary} ${colors.text.secondary}`
                      }`}
                    >
                      {label}
                    </span>
                    <div
                      className={`flex-1 ${colors.text.primary}`}
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(answer.text) }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={goPrev}
                disabled={currentQuestionIndex === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border.light} ${colors.text.secondary} disabled:opacity-50 disabled:cursor-not-allowed ${colors.background.hover}`}
              >
                <ChevronLeft className="w-4 h-4" />
                Precedente
              </button>
              <button
                onClick={goNext}
                disabled={currentQuestionIndex === simulation.totalQuestions - 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border.light} ${colors.text.secondary} disabled:opacity-50 disabled:cursor-not-allowed ${colors.background.hover}`}
              >
                Successiva
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation sidebar */}
        {showNavigation && (
          <div className={`w-64 border-l ${colors.border.light} ${colors.background.secondary} p-4 overflow-y-auto`}>
            <h3 className={`font-medium ${colors.text.primary} mb-4`}>Navigazione</h3>
            
            {/* Section tabs for TOLC-style */}
            {hasSectionsMode && (
              <div className="mb-4 space-y-2">
                <p className={`text-xs font-medium ${colors.text.muted} uppercase`}>Sezioni</p>
                {sections.map((section, index) => {
                  const isCurrent = index === currentSectionIndex;
                  const isCompleted = completedSections.has(index);
                  const isLocked = !isCurrent && !isCompleted && index > currentSectionIndex;
                  
                  return (
                    <button
                      key={index}
                      disabled={isLocked}
                      onClick={() => {
                        if (!isLocked && (isCurrent || isCompleted)) {
                          setCurrentSectionIndex(index);
                          // Move to first question of this section
                          const firstQIndex = simulation.questions.findIndex(
                            q => section.questionIds.includes(q.questionId)
                          );
                          if (firstQIndex >= 0) setCurrentQuestionIndex(firstQIndex);
                        }
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                        isCurrent 
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-2 ring-red-500'
                          : isCompleted
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : isLocked
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          : colors.background.card
                      }`}
                    >
                      {isLocked ? (
                        <Lock className="w-4 h-4 flex-shrink-0" />
                      ) : isCompleted ? (
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <Layers className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span className="flex-1 truncate">{section.name}</span>
                      <span className="text-xs opacity-70">{section.durationMinutes}m</span>
                    </button>
                  );
                })}
                
                {/* Complete section button */}
                {currentSectionIndex < sections.length - 1 && (
                  <button
                    onClick={handleRequestSectionComplete}
                    className={`w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white ${colors.primary.bg} hover:opacity-90 text-sm`}
                  >
                    Completa Sezione
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            
            {/* Legend */}
            <div className={`mb-4 text-xs space-y-1 ${colors.text.muted}`}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-green-500" />
                <span>Risposta data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-yellow-500" />
                <span>Contrassegnata</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-gray-300 dark:bg-gray-600" />
                <span>Non risposta</span>
              </div>
            </div>

            {/* Question grid */}
            <div className="grid grid-cols-5 gap-2">
              {simulation.questions.map((sq, index) => {
                const answer = answers.find((a) => a.questionId === sq.questionId);
                const isCurrent = index === currentQuestionIndex;
                const isAnswered = answer?.answerId !== null;
                const isFlagged = answer?.flagged;

                let bgColor = 'bg-gray-200 dark:bg-gray-700';
                if (isAnswered) bgColor = 'bg-green-500 text-white';
                if (isFlagged) bgColor = 'bg-yellow-500 text-white';

                return (
                  <button
                    key={sq.questionId}
                    onClick={() => goToQuestion(index)}
                    className={`w-full aspect-square rounded flex items-center justify-center text-sm font-medium transition-all ${bgColor} ${
                      isCurrent ? 'ring-2 ring-red-500 ring-offset-2' : ''
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            {/* Stats */}
            <div className={`mt-6 pt-4 border-t ${colors.border.light}`}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className={colors.text.muted}>Risposte date:</span>
                  <span className={`font-medium ${colors.text.primary}`}>{answeredCount}/{simulation.totalQuestions}</span>
                </div>
                <div className="flex justify-between">
                  <span className={colors.text.muted}>Contrassegnate:</span>
                  <span className={`font-medium ${colors.text.primary}`}>{flaggedCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit confirmation modal */}
      {submitConfirm && (
        <ConfirmModal
          isOpen={true}
          title="Consegna Simulazione"
          message={
            <div className="space-y-3">
              <p>Sei sicuro di voler consegnare la simulazione?</p>
              <div className={`p-3 rounded-lg ${colors.background.secondary}`}>
                <p className="text-sm">
                  <strong>Risposte date:</strong> {answeredCount}/{simulation.totalQuestions}
                </p>
                {simulation.totalQuestions - answeredCount > 0 && (
                  <p className="text-sm text-orange-600 mt-1">
                    ⚠️ Hai {simulation.totalQuestions - answeredCount} domande senza risposta
                  </p>
                )}
                {flaggedCount > 0 && (
                  <p className="text-sm text-yellow-600 mt-1">
                    ⚠️ Hai {flaggedCount} domande contrassegnate
                  </p>
                )}
              </div>
            </div>
          }
          confirmText="Consegna"
          cancelText="Continua"
          variant="warning"
          isLoading={submitMutation.isPending}
          onConfirm={handleSubmit}
          onCancel={() => setSubmitConfirm(false)}
        />
      )}

      {/* Section transition modal for TOLC-style */}
      {showSectionTransition && currentSection && (
        <ConfirmModal
          isOpen={true}
          title="Completa Sezione"
          message={
            <div className="space-y-3">
              <p>
                Stai per completare la sezione <strong>&quot;{currentSection.name}&quot;</strong>.
              </p>
              <div className={`p-3 rounded-lg ${colors.background.secondary}`}>
                <p className="text-sm">
                  Una volta completata, <strong>non potrai tornare</strong> a questa sezione.
                </p>
                {currentSectionIndex < sections.length - 1 && (
                  <p className="text-sm mt-2">
                    Passerai alla sezione: <strong>&quot;{sections[currentSectionIndex + 1]?.name}&quot;</strong>
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20`}>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  ⚠️ Domande della sezione completate: {
                    answers.filter(a => 
                      currentSection.questionIds.includes(a.questionId) && a.answerId !== null
                    ).length
                  }/{currentSection.questionIds.length}
                </p>
              </div>
            </div>
          }
          confirmText="Completa e Continua"
          cancelText="Torna alla Sezione"
          variant="warning"
          onConfirm={handleCompleteSection}
          onCancel={() => setShowSectionTransition(false)}
        />
      )}
    </div>
  );
}
