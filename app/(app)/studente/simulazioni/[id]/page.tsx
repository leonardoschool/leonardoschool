'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { PageLoader, Spinner } from '@/components/ui/loaders';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Target,
  Flag,
  CheckCircle,
  Circle,
  AlertCircle,
  Play,
  Send,
  RotateCcw,
  Pause,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  Award,
} from 'lucide-react';

interface Answer {
  questionId: string;
  answerId: string | null;
  answerText: string | null;
  timeSpent: number;
  flagged: boolean;
}

export default function SimulationExecutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { handleMutationError } = useApiError();
  const { showSuccess, showError } = useToast();

  // State
  const [hasStarted, setHasStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeSpent, setTimeSpent] = useState(0);
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
  const [showNavigation, setShowNavigation] = useState(false);
  const [submitConfirm, setSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questionStartTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
      router.push(`/studente/simulazioni/${id}/risultato?resultId=${data.resultId}`);
    },
    onError: handleMutationError,
  });

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
            href="/studente/simulazioni"
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
          href="/studente/simulazioni"
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

          {simulation.hasInProgressAttempt && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Hai un tentativo in corso. Cliccando "Inizia" riprenderai da dove ti eri fermato.
              </p>
            </div>
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
      {/* Header */}
      <div className={`sticky top-0 z-10 ${colors.background.card} border-b ${colors.border.light} px-4 py-3`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className={`font-semibold ${colors.text.primary} hidden sm:block`}>{simulation.title}</h1>
            <span className={`text-sm ${colors.text.muted}`}>
              {currentQuestionIndex + 1}/{simulation.totalQuestions}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Timer */}
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
                dangerouslySetInnerHTML={{ __html: currentQuestion?.question.text || '' }}
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
                      dangerouslySetInnerHTML={{ __html: answer.text }}
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
    </div>
  );
}
