'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import TolcSimulationLayout from '@/components/simulazioni/TolcSimulationLayout';
import StudentWaitingRoom from '@/components/simulazioni/StudentWaitingRoom';
import TolcInstructions from '@/components/simulazioni/TolcInstructions';
import InTestMessaging, { MessagingButton } from '@/components/simulazioni/InTestMessaging';
import {
  SimulationLoadingState,
  SimulationKickedState,
  SimulationErrorState,
  SimulationMissingAssignmentState,
  AntiCheatWarningOverlay,
} from '@/components/simulazioni/SimulationStates';
import SimulationStartScreen from '@/components/simulazioni/SimulationStartScreen';
import FeedbackModal from '@/components/simulazioni/FeedbackModal';
import SimulationHeader from '@/components/simulazioni/SimulationHeader';
import QuestionPanel from '@/components/simulazioni/QuestionPanel';
import NavigationSidebar from '@/components/simulazioni/NavigationSidebar';
import {
  SubmitConfirmModal,
  SectionTransitionModal,
} from '@/components/simulazioni/SimulationModals';
import { useRouter } from 'next/navigation';
import { useAntiCheat } from '@/lib/hooks/useAntiCheat';

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
  readonly id: string;
  readonly assignmentId?: string | null;
}

export default function StudentSimulationExecutionContent({ id, assignmentId }: StudentSimulationExecutionContentProps) {
  const router = useRouter();
  const { handleMutationError } = useApiError();
  const { showSuccess, showError } = useToast();

  // State
  const [hasStarted, setHasStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  
  // TOLC Instructions state - for Virtual Room simulations with sections
  // Persist in sessionStorage to survive page refreshes
  const [hasReadInstructions, setHasReadInstructions] = useState(() => {
    if (globalThis.window !== undefined) {
      const stored = sessionStorage.getItem(`tolc-instructions-read-${id}`);
      return stored === 'true';
    }
    return false;
  });
  
  // Virtual Room state
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [showMessaging, setShowMessaging] = useState(false);
  const [messagingUnreadCount, setMessagingUnreadCount] = useState(0);
  const [isKicked, setIsKicked] = useState(false);
  const [kickedReason, setKickedReason] = useState<string | null>(null);
  
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
  
  // Feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const questionStartTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSubmitRef = useRef<(() => void) | null>(null);
  const answersInitializedRef = useRef<boolean>(false);
  const answersRef = useRef<Answer[]>([]); // Ref for heartbeat to read current answers
  const participantIdRef = useRef<string | null>(null); // Ref for anti-cheat to read current participantId
  const lastSectionTimeUpdateRef = useRef<number>(-1); // Track last timeSpent used for section time update

  // Fetch simulation - pass assignmentId to get correct assignment dates
  // Keep enabled even after hasStarted to ensure data is available for initialization
  const { data: simulation, isLoading, error } = trpc.simulations.getSimulationForStudent.useQuery(
    { id, assignmentId: assignmentId ?? undefined },
    { 
      enabled: true, // Always enabled to ensure data is available
      staleTime: Infinity, // Don't refetch once loaded
    }
  );

  // Check if this is a virtual room simulation (after simulation is loaded)
  const isVirtualRoom = simulation?.accessType === 'ROOM';

  // Get participant ID for Virtual Room simulations - run immediately when isVirtualRoom
  // Uses assignmentId to get the session status for this specific assignment
  // eslint-disable-next-line sonarjs/no-unused-vars -- refetch reserved for manual status refresh
  const { data: sessionStatus, refetch: _refetchSessionStatus } = trpc.virtualRoom.getStudentSessionStatus.useQuery(
    { assignmentId: assignmentId ?? undefined },
    { 
      enabled: isVirtualRoom === true && !!assignmentId, // Run only for Virtual Room with valid assignmentId
      refetchInterval: hasStarted ? 5000 : false, // Poll only after started to check for session end
    }
  );

  // Set participantId from session status
  useEffect(() => {
    console.log('[VirtualRoom] sessionStatus changed:', sessionStatus);
    
    if (sessionStatus?.hasSession && 'participantId' in sessionStatus && sessionStatus.participantId) {
      console.log('[VirtualRoom] Got participantId:', sessionStatus.participantId);
      setParticipantId(sessionStatus.participantId);
    }
    
    // Check if session has been terminated by admin
    if (sessionStatus?.hasSession && 'status' in sessionStatus && sessionStatus.status === 'COMPLETED' && hasStarted) {
      console.log('[VirtualRoom] Session terminated by admin, auto-submitting...');
      // Auto-submit if session ended
      if (autoSubmitRef.current) {
        autoSubmitRef.current();
      }
    }
    
    // Check if kicked
    if (sessionStatus?.hasSession && 'isKicked' in sessionStatus && sessionStatus.isKicked) {
      setIsKicked(true);
      const reason = 'kickedReason' in sessionStatus ? sessionStatus.kickedReason : 'Sei stato espulso dalla sessione';
      setKickedReason(typeof reason === 'string' ? reason : 'Sei stato espulso dalla sessione');
    }
  }, [sessionStatus, hasStarted]);

  // Persist TOLC instructions read state to sessionStorage
  useEffect(() => {
    if (hasReadInstructions) {
      sessionStorage.setItem(`tolc-instructions-read-${id}`, 'true');
    }
  }, [hasReadInstructions, id]);

  // Helper to restore saved attempt state
  const restoreAttemptState = useCallback((data: { 
    savedTimeSpent?: number; 
    savedAnswers?: Array<{ questionId?: string | null; answerId?: string | null; answerText?: string | null; timeSpent?: number | null; flagged?: boolean | null }>; 
    savedSectionTimes?: Record<number, number>; 
    savedCurrentSectionIndex?: number;
  }) => {
    const { savedTimeSpent, savedAnswers, savedSectionTimes, savedCurrentSectionIndex } = data;
    
    if (savedTimeSpent) {
      setTimeSpent(savedTimeSpent);
      lastSectionTimeUpdateRef.current = savedTimeSpent;
    }
    
    if (!savedAnswers || savedAnswers.length === 0) return;
    
    const restoredAnswers = savedAnswers.map(a => ({
      questionId: a.questionId,
      answerId: a.answerId,
      answerText: a.answerText,
      timeSpent: a.timeSpent || 0,
      flagged: a.flagged || false,
    }));
    setAnswers(restoredAnswers);
    answersInitializedRef.current = true;
    
    const restoredQuestionTimes: Record<string, number> = {};
    savedAnswers.forEach(a => {
      if (a.timeSpent) {
        restoredQuestionTimes[a.questionId ?? ''] = a.timeSpent;
      }
    });
    setQuestionTimes(restoredQuestionTimes);
    
    if (savedSectionTimes) {
      setSectionTimes(savedSectionTimes);
    }
    if (savedCurrentSectionIndex !== undefined) {
      setCurrentSectionIndex(savedCurrentSectionIndex);
    }
  }, []);

  // Mutations
  const startAttemptMutation = trpc.simulations.startAttempt.useMutation({
    onSuccess: (data) => {
      console.log('[VirtualRoom] startAttemptMutation onSuccess, resumed:', data.resumed);
      if (data.resumed) {
        showSuccess('Ripreso', 'Hai ripreso il tuo tentativo precedente');
        // Extract saved data with type narrowing
        const savedData = {
          savedTimeSpent: 'savedTimeSpent' in data ? data.savedTimeSpent : undefined,
          savedAnswers: 'savedAnswers' in data ? data.savedAnswers : undefined,
          savedSectionTimes: 'savedSectionTimes' in data ? data.savedSectionTimes : undefined,
          savedCurrentSectionIndex: 'savedCurrentSectionIndex' in data ? data.savedCurrentSectionIndex : undefined,
        };
        restoreAttemptState(savedData);
      }
      console.log('[VirtualRoom] Setting hasStarted = true');
      setHasStarted(true);
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
      // Clear TOLC instructions state on completion
      sessionStorage.removeItem(`tolc-instructions-read-${id}`);
      showSuccess('Completata!', 'Simulazione inviata con successo');
      router.push(`/simulazioni/${id}/risultato?resultId=${data.resultId}`);
    },
    onError: handleMutationError,
  });

  // Feedback mutation
  const submitFeedbackMutation = trpc.questions.submitFeedback.useMutation({
    onSuccess: () => {
      showSuccess('Segnalazione inviata', 'La tua segnalazione è stata inviata agli admin.');
      setShowFeedbackModal(false);
    },
    onError: handleMutationError,
  });

  // Log cheating event for virtual room (silent - no error toast)
  const logCheatingEvent = trpc.virtualRoom.logCheatingEvent.useMutation();

  // Map anti-cheat event type to DB enum
  const mapEventType = useCallback((type: string) => {
    const mapping: Record<string, 'TAB_CHANGE' | 'WINDOW_BLUR' | 'COPY_ATTEMPT' | 'PASTE_ATTEMPT' | 'RIGHT_CLICK' | 'DEVTOOLS_OPEN' | 'KEYBOARD_SHORTCUT' | 'OTHER'> = {
      'tab_blur': 'WINDOW_BLUR',
      'visibility_hidden': 'TAB_CHANGE',
      'fullscreen_exit': 'OTHER',
      'copy_attempt': 'COPY_ATTEMPT',
      'paste_attempt': 'PASTE_ATTEMPT',
      'right_click': 'RIGHT_CLICK',
      'keyboard_shortcut': 'KEYBOARD_SHORTCUT',
      'page_reload_attempt': 'OTHER',
      'devtools_open': 'DEVTOOLS_OPEN',
    };
    return mapping[type] || 'OTHER';
  }, []);

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
      // Log to database if in virtual room mode - use ref to get current participantId
      const currentParticipantId = participantIdRef.current;
      if (isVirtualRoom && currentParticipantId) {
        logCheatingEvent.mutate({
          participantId: currentParticipantId,
          eventType: mapEventType(event.type),
          description: event.details,
          metadata: { timestamp: event.timestamp.toISOString() },
        });
      }
    },
    onMaxViolations: () => {
      showError('Attenzione', 'Troppe violazioni rilevate. La simulazione verrà terminata.');
      autoSubmitRef.current?.();
    },
    onFullscreenExit: () => {
      // Fullscreen exit is handled automatically by the hook
    },
  }), [hasStarted, simulation?.enableAntiCheat, simulation?.forceFullscreen, showError, isVirtualRoom, logCheatingEvent, mapEventType]);

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

  // Initialize answers when simulation loads (only if not already initialized from resume)
  useEffect(() => {
    if (simulation && hasStarted && answers.length === 0 && !answersInitializedRef.current) {
      answersInitializedRef.current = true;
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

  // Keep answersRef in sync with answers state (for heartbeat interval)
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Keep participantIdRef in sync (for anti-cheat callbacks)
  useEffect(() => {
    participantIdRef.current = participantId;
  }, [participantId]);

  // Virtual Room heartbeat - send progress updates
  const heartbeatMutation = trpc.virtualRoom.heartbeat.useMutation({
    onSuccess: (data) => {
      // Check if student has been kicked (type guard for kicked response)
      if (data.isKicked && 'kickedReason' in data) {
        setIsKicked(true);
        const reason = data.kickedReason;
        setKickedReason(typeof reason === 'string' && reason ? reason : 'Sei stato espulso dalla sessione');
      }
    },
  });

  // Store current values in refs to avoid useEffect re-running
  const currentQuestionIndexRef = useRef(currentQuestionIndex);
  useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (!isVirtualRoom || !participantId || !hasStarted) {
      return;
    }

    console.log('[VirtualRoom Heartbeat] Starting interval with participantId:', participantId);

    // Send heartbeat immediately once using current state
    const initialAnsweredCount = answersRef.current.filter(a => a.answerId !== null || a.answerText !== null).length;
    heartbeatMutation.mutate({
      participantId,
      currentQuestionIndex: currentQuestionIndexRef.current,
      answeredCount: initialAnsweredCount,
    });

    // Send heartbeat every 3 seconds - read from refs to get latest values
    const interval = setInterval(() => {
      const currentAnsweredCount = answersRef.current.filter(a => a.answerId !== null || a.answerText !== null).length;
      
      heartbeatMutation.mutate({
        participantId,
        currentQuestionIndex: currentQuestionIndexRef.current,
        answeredCount: currentAnsweredCount,
      });
    }, 3000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVirtualRoom, participantId, hasStarted]);

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

  // Save progress function (reusable)
  const saveProgress = useCallback(() => {
    if (!hasStarted || !startAttemptMutation.data?.resultId) return;
    
    const answersWithTimes = answers.map((a) => ({
      ...a,
      timeSpent: questionTimes[a.questionId] || 0,
    }));

    saveProgressMutation.mutate({
      resultId: startAttemptMutation.data.resultId,
      answers: answersWithTimes,
      timeSpent,
      sectionTimes,
      currentSectionIndex,
    });
  }, [hasStarted, startAttemptMutation.data?.resultId, answers, questionTimes, timeSpent, sectionTimes, currentSectionIndex, saveProgressMutation]);

  // Save on page unload/refresh
  useEffect(() => {
    const resultId = startAttemptMutation.data?.resultId;
    if (!hasStarted || !resultId) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Save progress synchronously using sendBeacon for reliability
      const answersWithTimes = answers.map((a) => ({
        ...a,
        timeSpent: questionTimes[a.questionId] || 0,
      }));

      const payload = JSON.stringify({
        resultId,
        answers: answersWithTimes,
        timeSpent,
        sectionTimes,
        currentSectionIndex,
      });

      // Use sendBeacon for reliable delivery during page unload
      navigator.sendBeacon('/api/simulations/save-progress', payload);

      // Show confirmation dialog
      e.preventDefault();
      // Modern browsers show a generic message; custom messages are ignored.
      return 'Hai una simulazione in corso. Sei sicuro di voler lasciare la pagina?';
    };

    globalThis.addEventListener('beforeunload', handleBeforeUnload);
    return () => globalThis.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasStarted, startAttemptMutation.data?.resultId, answers, questionTimes, timeSpent, sectionTimes, currentSectionIndex]);

  // Auto-save progress periodically
  useEffect(() => {
    if (!hasStarted || !startAttemptMutation.data?.resultId) return;

    const interval = setInterval(() => {
      saveProgress();
    }, 30000); // Save every 30 seconds

    return () => clearInterval(interval);
  }, [hasStarted, startAttemptMutation.data?.resultId, saveProgress]);

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

  // Handle open text answer change
  const handleOpenTextChange = (text: string) => {
    if (!simulation) return;
    const currentQuestion = simulation.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    setAnswers((prev) =>
      prev.map((a) =>
        a.questionId === currentQuestion.questionId
          ? { ...a, answerText: text || null }
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
    if (!simulation) return;
    
    if (hasSectionsMode && currentSection) {
      // In sections mode, navigate within current section
      const currentQ = simulation.questions[currentQuestionIndex];
      if (!currentQ) return;
      
      const sectionQIndex = currentSectionQuestions.findIndex(q => q.questionId === currentQ.questionId);
      if (sectionQIndex < currentSectionQuestions.length - 1) {
        // Find the global index of the next section question
        const nextSectionQ = currentSectionQuestions[sectionQIndex + 1];
        const globalIndex = simulation.questions.findIndex(q => q.questionId === nextSectionQ.questionId);
        if (globalIndex !== -1) {
          trackQuestionTime();
          setCurrentQuestionIndex(globalIndex);
        }
      }
    } else {
      // Normal mode - navigate globally
      if (currentQuestionIndex >= simulation.questions.length - 1) return;
      trackQuestionTime();
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const goPrev = () => {
    if (!simulation) return;
    
    if (hasSectionsMode && currentSection) {
      // In sections mode, navigate within current section
      const currentQ = simulation.questions[currentQuestionIndex];
      if (!currentQ) return;
      
      const sectionQIndex = currentSectionQuestions.findIndex(q => q.questionId === currentQ.questionId);
      if (sectionQIndex > 0) {
        // Find the global index of the previous section question
        const prevSectionQ = currentSectionQuestions[sectionQIndex - 1];
        const globalIndex = simulation.questions.findIndex(q => q.questionId === prevSectionQ.questionId);
        if (globalIndex !== -1) {
          trackQuestionTime();
          setCurrentQuestionIndex(globalIndex);
        }
      }
    } else {
      // Normal mode - navigate globally
      if (currentQuestionIndex <= 0) return;
      trackQuestionTime();
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  // Submit simulation
  const handleSubmit = useCallback(async () => {
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
  }, [simulation, trackQuestionTime, answers, questionTimes, submitMutation, id, timeSpent]);

  // Keep autoSubmitRef updated with the latest handleSubmit function
  // This allows external triggers (like Virtual Room session end) to auto-submit
  useEffect(() => {
    autoSubmitRef.current = () => { void handleSubmit(); };
  }, [handleSubmit]);

  // Parse sections from simulation (if TOLC-style)
  const sections: SimulationSection[] = useMemo(() => {
    if (!simulation?.hasSections || !simulation.sections) {
      return [];
    }
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

    // Only increment if this is a new second (not a restore or duplicate)
    // This prevents incrementing when timeSpent is restored from saved progress
    if (timeSpent <= lastSectionTimeUpdateRef.current) return;
    lastSectionTimeUpdateRef.current = timeSpent;

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
    
    // Close the transition modal
    setShowSectionTransition(false);
    
    // Check if this is the last section
    if (currentSectionIndex >= sections.length - 1) {
      // Last section - show submit confirmation
      setSubmitConfirm(true);
    } else {
      // Move to next section
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
    return <SimulationLoadingState />;
  }

  // Kicked state - shown when student is expelled from Virtual Room session
  if (isKicked) {
    return <SimulationKickedState reason={kickedReason} />;
  }

  // Error state
  if (error || !simulation) {
    return <SimulationErrorState errorMessage={error?.message} />;
  }

  // Virtual Room requires assignmentId
  if (!hasStarted && isVirtualRoom && !assignmentId) {
    return <SimulationMissingAssignmentState />;
  }
  
  // For Virtual Room TOLC-style simulations, show instructions first
  if (!hasStarted && isVirtualRoom && hasSectionsMode && !hasReadInstructions) {
    return (
      <TolcInstructions
        simulationTitle={simulation.title}
        durationMinutes={simulation.durationMinutes}
        totalQuestions={simulation.totalQuestions}
        sectionsCount={sections.length}
        onContinue={() => setHasReadInstructions(true)}
      />
    );
  }
  
  // Virtual Room Waiting Screen
  if (!hasStarted && isVirtualRoom && assignmentId) {
    return (
      <StudentWaitingRoom
        assignmentId={assignmentId}
        simulationTitle={simulation.title}
        durationMinutes={simulation.durationMinutes}
        instructions={simulation.paperInstructions}
        onSessionStart={(actualStartAt, pId) => {
          console.log('[VirtualRoom] onSessionStart called with participantId:', pId, 'at:', actualStartAt);
          setParticipantId(pId);
          console.log('[VirtualRoom] participantId set, calling startAttemptMutation');
          startAttemptMutation.mutate({ 
            simulationId: id,
            assignmentId: assignmentId,
          });
        }}
      />
    );
  }

  // Start screen (for non-virtual room simulations)
  if (!hasStarted) {
    return (
      <SimulationStartScreen
        simulation={simulation}
        id={id}
        isVirtualRoom={isVirtualRoom ?? false}
        onStart={() => startAttemptMutation.mutate({ 
          simulationId: id,
          assignmentId: assignmentId || undefined,
        })}
        isPending={startAttemptMutation.isPending}
      />
    );
  }

  // Execution screen
  const currentQuestion = simulation.questions[currentQuestionIndex];
  const currentAnswer = answers.find((a) => a.questionId === currentQuestion?.questionId);
  // Count answers including both choice answers and text answers
  const answeredCount = answers.filter((a) => a.answerId !== null || (a.answerText && a.answerText.trim().length > 0)).length;
  const flaggedCount = answers.filter((a) => a.flagged).length;

  // Use TOLC layout for simulations with sections
  if (hasSectionsMode) {
    return (
      <>
        {/* Anti-cheat warning overlay */}
        {simulation.enableAntiCheat && (
          <AntiCheatWarningOverlay
            isBlurred={antiCheat.isBlurred}
            isFullscreen={antiCheat.isFullscreen}
            requireFullscreen={simulation.forceFullscreen}
            onRequestFullscreen={antiCheat.requestFullscreen}
          />
        )}

        <TolcSimulationLayout
          simulationTitle={simulation.title}
          questions={simulation.questions}
          sections={sections}
          currentSectionIndex={currentSectionIndex}
          currentQuestionIndex={currentQuestionIndex}
          answers={answers}
          sectionTimeRemaining={sectionTimeRemaining}
          completedSections={completedSections}
          onAnswerSelect={handleAnswerSelect}
          onOpenTextChange={handleOpenTextChange}
          onToggleFlag={handleToggleFlag}
          onGoToQuestion={goToQuestion}
          onGoNext={goNext}
          onGoPrev={goPrev}
          onCompleteSection={handleRequestSectionComplete}
          onSubmit={() => setSubmitConfirm(true)}
          onReportQuestion={() => setShowFeedbackModal(true)}
          answeredCount={answeredCount}
          totalQuestions={simulation.totalQuestions}
        />

        {/* In-test messaging for virtual room - TOLC mode */}
        {isVirtualRoom && participantId && (
          <>
            <MessagingButton 
              onClick={() => setShowMessaging(true)} 
              unreadCount={messagingUnreadCount} 
            />
            <InTestMessaging 
              participantId={participantId} 
              isOpen={showMessaging}
              onClose={() => setShowMessaging(false)}
              unreadCount={messagingUnreadCount}
              onUnreadChange={setMessagingUnreadCount}
            />
          </>
        )}

        {/* Section Transition Modal */}
        {showSectionTransition && currentSection && (
          <ConfirmModal
            isOpen={true}
            title={`Concludi "${currentSection.name}"?`}
            message={`Stai per concludere la sezione "${currentSection.name}". Non potrai più tornare a questa sezione. Vuoi continuare?`}
            confirmLabel="Concludi Sezione"
            cancelLabel="Annulla"
            variant="warning"
            onConfirm={handleCompleteSection}
            onCancel={() => setShowSectionTransition(false)}
          />
        )}

        {/* Submit confirmation */}
        <ConfirmModal
          isOpen={submitConfirm}
          title="Consegna Simulazione"
          message={`Hai risposto a ${answeredCount}/${simulation.totalQuestions} domande. Vuoi consegnare?`}
          confirmLabel="Consegna"
          cancelLabel="Torna alla Simulazione"
          variant="warning"
          onConfirm={handleSubmit}
          onCancel={() => setSubmitConfirm(false)}
          isLoading={isSubmitting}
        />

        {/* Feedback Modal */}
        {currentQuestion && (
          <FeedbackModal
            isOpen={showFeedbackModal}
            questionId={currentQuestion.questionId}
            onClose={() => setShowFeedbackModal(false)}
            onSubmit={(data) => submitFeedbackMutation.mutate(data)}
            isSubmitting={submitFeedbackMutation.isPending}
          />
        )}
      </>
    );
  }

  // Standard layout (non-TOLC)
  return (
    <div className="min-h-screen flex flex-col">
      {/* Anti-cheat warning banner */}
      {simulation.enableAntiCheat && (
        <AntiCheatWarningOverlay
          isBlurred={antiCheat.isBlurred}
          isFullscreen={antiCheat.isFullscreen}
          requireFullscreen={simulation.forceFullscreen}
          onRequestFullscreen={antiCheat.requestFullscreen}
          violationCount={antiCheat.violationCount}
        />
      )}

      {/* Header */}
      <SimulationHeader
        simulationTitle={simulation.title}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={simulation.totalQuestions}
        answeredCount={answeredCount}
        showNavigation={showNavigation}
        onToggleNavigation={() => setShowNavigation(!showNavigation)}
        onSubmit={() => setSubmitConfirm(true)}
        timeSpent={timeSpent}
        timeRemaining={timeRemaining}
        enableAntiCheat={simulation.enableAntiCheat ?? false}
        violationCount={antiCheat.violationCount}
        hasSectionsMode={hasSectionsMode}
        currentSection={currentSection}
        sectionTimeRemaining={sectionTimeRemaining}
        currentSectionQuestionIndex={currentSectionQuestionIndex}
        currentSectionQuestionsLength={currentSectionQuestions.length}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Question panel */}
        {currentQuestion && (
          <QuestionPanel
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={simulation.totalQuestions}
            question={currentQuestion}
            answer={currentAnswer}
            onAnswerSelect={handleAnswerSelect}
            onOpenTextChange={handleOpenTextChange}
            onToggleFlag={handleToggleFlag}
            onReport={() => setShowFeedbackModal(true)}
            onPrevious={goPrev}
            onNext={goNext}
            canGoPrevious={currentQuestionIndex > 0}
            canGoNext={currentQuestionIndex < simulation.totalQuestions - 1}
          />
        )}

        {/* Navigation sidebar */}
        {showNavigation && (
          <NavigationSidebar
            questions={simulation.questions}
            answers={answers}
            currentQuestionIndex={currentQuestionIndex}
            answeredCount={answeredCount}
            flaggedCount={flaggedCount}
            totalQuestions={simulation.totalQuestions}
            onGoToQuestion={goToQuestion}
            hasSectionsMode={hasSectionsMode}
            sections={sections}
            currentSectionIndex={currentSectionIndex}
            completedSections={completedSections}
            onSectionChange={(index) => {
              const section = sections[index];
              if (section && (index === currentSectionIndex || completedSections.has(index))) {
                setCurrentSectionIndex(index);
                const firstQIndex = simulation.questions.findIndex(
                  q => section.questionIds.includes(q.questionId)
                );
                if (firstQIndex >= 0) setCurrentQuestionIndex(firstQIndex);
              }
            }}
            onCompleteSection={handleRequestSectionComplete}
          />
        )}
      </div>

      {/* In-test messaging for virtual room */}
      {isVirtualRoom && participantId && hasStarted && (
        <>
          <MessagingButton
            onClick={() => setShowMessaging(true)}
            unreadCount={messagingUnreadCount}
          />
          <InTestMessaging
            participantId={participantId}
            isOpen={showMessaging}
            onClose={() => setShowMessaging(false)}
            unreadCount={messagingUnreadCount}
            onUnreadChange={setMessagingUnreadCount}
          />
        </>
      )}

      {/* Submit confirmation modal */}
      <SubmitConfirmModal
        isOpen={submitConfirm}
        answeredCount={answeredCount}
        totalQuestions={simulation.totalQuestions}
        flaggedCount={flaggedCount}
        isLoading={submitMutation.isPending}
        onConfirm={handleSubmit}
        onCancel={() => setSubmitConfirm(false)}
      />

      {/* Section transition modal for TOLC-style */}
      {currentSection && (
        <SectionTransitionModal
          isOpen={showSectionTransition}
          currentSectionName={currentSection.name}
          nextSectionName={sections[currentSectionIndex + 1]?.name}
          answeredInSection={
            answers.filter(a =>
              currentSection.questionIds.includes(a.questionId) && a.answerId !== null
            ).length
          }
          totalInSection={currentSection.questionIds.length}
          isLastSection={currentSectionIndex >= sections.length - 1}
          onConfirm={handleCompleteSection}
          onCancel={() => setShowSectionTransition(false)}
        />
      )}

      {/* Feedback Modal */}
      {currentQuestion && (
        <FeedbackModal
          isOpen={showFeedbackModal}
          questionId={currentQuestion.questionId}
          onClose={() => setShowFeedbackModal(false)}
          onSubmit={(data) => submitFeedbackMutation.mutate(data)}
          isSubmitting={submitFeedbackMutation.isPending}
        />
      )}
    </div>
  );
}
