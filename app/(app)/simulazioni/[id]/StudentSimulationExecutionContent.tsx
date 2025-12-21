'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { PageLoader, Spinner } from '@/components/ui/loaders';
import ConfirmModal from '@/components/ui/ConfirmModal';
import CustomSelect from '@/components/ui/CustomSelect';
import TolcSimulationLayout from '@/components/simulazioni/TolcSimulationLayout';
import StudentWaitingRoom from '@/components/simulazioni/StudentWaitingRoom';
import TolcInstructions from '@/components/simulazioni/TolcInstructions';
import InTestMessaging, { MessagingButton } from '@/components/simulazioni/InTestMessaging';
import { TextareaWithSymbols } from '@/components/ui/SymbolKeyboard';
import { LaTeXRenderer } from '@/components/ui/LaTeXEditor';
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
  AlertTriangle,
  X,
  Users,
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
  assignmentId?: string | null;
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
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(`tolc-instructions-read-${id}`);
      return stored === 'true';
    }
    return false;
  });
  
  // Virtual Room state
  const [_virtualRoomStartedAt, setVirtualRoomStartedAt] = useState<Date | null>(null);
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
  const [feedbackType, setFeedbackType] = useState<'ERROR_IN_QUESTION' | 'ERROR_IN_ANSWER' | 'UNCLEAR' | 'SUGGESTION' | 'OTHER'>('ERROR_IN_QUESTION');
  const [feedbackMessage, setFeedbackMessage] = useState('');

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
      setKickedReason('kickedReason' in sessionStatus ? (sessionStatus.kickedReason as string) : 'Sei stato espulso dalla sessione');
    }
  }, [sessionStatus, hasStarted]);

  // Persist TOLC instructions read state to sessionStorage
  useEffect(() => {
    if (hasReadInstructions) {
      sessionStorage.setItem(`tolc-instructions-read-${id}`, 'true');
    }
  }, [hasReadInstructions, id]);

  // Mutations
  const startAttemptMutation = trpc.simulations.startAttempt.useMutation({
    onSuccess: (data) => {
      console.log('[VirtualRoom] startAttemptMutation onSuccess, resumed:', data.resumed);
      if (data.resumed) {
        showSuccess('Ripreso', 'Hai ripreso il tuo tentativo precedente');
        // Restore saved time and answers BEFORE setting hasStarted
        if (data.savedTimeSpent) {
          setTimeSpent(data.savedTimeSpent);
          // Set the ref to prevent section time from incrementing on first render
          lastSectionTimeUpdateRef.current = data.savedTimeSpent;
        }
        if (data.savedAnswers && data.savedAnswers.length > 0) {
          const restoredAnswers = data.savedAnswers.map(a => ({
            questionId: a.questionId,
            answerId: a.answerId,
            answerText: a.answerText,
            timeSpent: a.timeSpent || 0,
            flagged: a.flagged || false,
          }));
          setAnswers(restoredAnswers);
          // Mark as initialized ONLY after successfully restoring
          answersInitializedRef.current = true;
          // Also restore question times
          const restoredQuestionTimes: Record<string, number> = {};
          data.savedAnswers.forEach(a => {
            if (a.timeSpent) {
              restoredQuestionTimes[a.questionId] = a.timeSpent;
            }
          });
          setQuestionTimes(restoredQuestionTimes);
          // Restore section times for TOLC mode
          if (data.savedSectionTimes) {
            setSectionTimes(data.savedSectionTimes);
          }
          // Restore current section index
          if (data.savedCurrentSectionIndex !== undefined) {
            setCurrentSectionIndex(data.savedCurrentSectionIndex);
          }
        }
        // If resumed but no saved answers, don't mark as initialized so they get created
      }
      // Set hasStarted AFTER restoring state to prevent re-initialization
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
      setFeedbackMessage('');
      setFeedbackType('ERROR_IN_QUESTION');
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
        setKickedReason((data.kickedReason as string) || 'Sei stato espulso dalla sessione');
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
      e.returnValue = 'Hai una simulazione in corso. Sei sicuro di voler lasciare la pagina?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
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
    autoSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

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
    if (!simulation?.hasSections || !simulation.sections) {
      console.log('[TOLC] No sections mode - hasSections:', simulation?.hasSections, 'sections:', simulation?.sections);
      return [];
    }
    try {
      const parsed = simulation.sections as unknown as SimulationSection[];
      console.log('[TOLC] Parsed sections:', parsed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [simulation?.hasSections, simulation?.sections]);

  const hasSectionsMode = sections.length > 0;
  
  // Debug log for TOLC mode
  console.log('[TOLC] hasSectionsMode:', hasSectionsMode, 'isVirtualRoom:', isVirtualRoom, 'hasReadInstructions:', hasReadInstructions);

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
    return <PageLoader />;
  }

  // Kicked state - shown when student is expelled from Virtual Room session
  if (isKicked) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          {/* Icon */}
          <div className="w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500/30 flex items-center justify-center mx-auto mb-8">
            <ShieldAlert className="w-12 h-12 text-red-500" />
          </div>
          
          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-4">
            Sessione Terminata
          </h1>
          
          {/* Status message */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-400 font-semibold text-lg">
              Sei stato espulso dalla sessione
            </p>
          </div>
          
          {/* Reason */}
          <p className="text-gray-300 text-base mb-10 px-4">
            {kickedReason || 'La tua partecipazione a questa simulazione è stata terminata dall\'amministratore.'}
          </p>
          
          {/* Back button */}
          <Link
            href="/simulazioni"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 hover:bg-gray-100 rounded-xl font-medium transition-colors shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            Torna alle simulazioni
          </Link>
        </div>
      </div>
    );
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

  // Virtual Room Waiting Screen
  if (!hasStarted && isVirtualRoom) {
    // Virtual Room requires assignmentId
    if (!assignmentId) {
      return (
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className={`text-center py-12 ${colors.background.card} rounded-xl border ${colors.border.light}`}>
            <p className={colors.text.secondary}>Errore: manca l&apos;ID dell&apos;assegnazione per la Virtual Room.</p>
          </div>
        </div>
      );
    }
    
    // For TOLC-style simulations (with sections), show instructions first
    if (hasSectionsMode && !hasReadInstructions) {
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
    
    return (
      <StudentWaitingRoom
        assignmentId={assignmentId}
        simulationTitle={simulation.title}
        durationMinutes={simulation.durationMinutes}
        instructions={simulation.paperInstructions}
        onSessionStart={(actualStartAt, pId) => {
          console.log('[VirtualRoom] onSessionStart called with participantId:', pId);
          // Store session start time for reference
          setVirtualRoomStartedAt(actualStartAt);
          setParticipantId(pId);
          console.log('[VirtualRoom] participantId set, calling startAttemptMutation');
          // Start the attempt with assignmentId
          // Note: timeSpent will be restored from saved progress in onSuccess if resumed
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
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-2xl mx-auto">
        <Link
          href="/simulazioni"
          className={`inline-flex items-center gap-2 text-sm ${colors.text.muted} hover:${colors.text.primary} mb-6`}
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alle simulazioni
        </Link>

        <div className={`rounded-xl p-8 ${colors.background.card} border ${colors.border.light} text-center`}>
          {/* Virtual Room indicator */}
          {isVirtualRoom && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium mb-4 mr-2">
              <Users className="w-4 h-4" />
              Stanza Virtuale
            </div>
          )}
          
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
            onClick={() => startAttemptMutation.mutate({ 
              simulationId: id,
              assignmentId: assignmentId || undefined,
            })}
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
  // Count answers including both choice answers and text answers
  const answeredCount = answers.filter((a) => a.answerId !== null || (a.answerText && a.answerText.trim().length > 0)).length;
  const flaggedCount = answers.filter((a) => a.flagged).length;

  // Use TOLC layout for simulations with sections
  if (hasSectionsMode && sections.length > 0) {
    return (
      <>
        {/* Anti-cheat warning overlay */}
        {simulation.enableAntiCheat && (antiCheat.isBlurred || (simulation.forceFullscreen && !antiCheat.isFullscreen)) && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
            <div className={`max-w-md p-8 rounded-2xl ${colors.background.card} text-center`}>
              <EyeOff className="w-16 h-16 mx-auto text-orange-500 mb-4" />
              <h2 className={`text-xl font-bold ${colors.text.primary} mb-3`}>
                {antiCheat.isBlurred ? 'Torna alla simulazione!' : 'Schermo intero richiesto'}
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
            </div>
          </div>
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
        {showFeedbackModal && currentQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className={`w-full max-w-md rounded-2xl ${colors.background.card} border ${colors.border.primary} shadow-2xl overflow-hidden`}>
              <div className={`flex items-center justify-between px-6 py-4 border-b ${colors.border.primary}`}>
                <h3 className={`text-lg font-semibold ${colors.text.primary}`}>Segnala Problema</h3>
                <button 
                  onClick={() => setShowFeedbackModal(false)} 
                  className={`p-1.5 rounded-lg ${colors.background.hover} ${colors.text.secondary} hover:${colors.text.primary} transition-colors`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <CustomSelect
                  value={feedbackType}
                  onChange={(value) => setFeedbackType(value as typeof feedbackType)}
                  options={[
                    { value: 'ERROR_IN_QUESTION', label: 'Errore nel testo della domanda' },
                    { value: 'ERROR_IN_ANSWER', label: 'Errore nelle risposte' },
                    { value: 'UNCLEAR', label: 'Domanda poco chiara' },
                    { value: 'SUGGESTION', label: 'Suggerimento miglioramento' },
                    { value: 'OTHER', label: 'Altro' },
                  ]}
                />
                <textarea
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  placeholder="Descrivi il problema in almeno 10 caratteri..."
                  rows={4}
                  className={`w-full p-3 rounded-lg border ${colors.border.primary} ${colors.background.secondary} ${colors.text.primary} placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#a8012b]/50`}
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowFeedbackModal(false)} 
                    className={`flex-1 px-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.text.primary} hover:${colors.background.hover} font-medium transition-colors`}
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => {
                      if (feedbackMessage.length >= 10) {
                        submitFeedbackMutation.mutate({
                          questionId: currentQuestion.questionId,
                          type: feedbackType,
                          message: feedbackMessage,
                        });
                      }
                    }}
                    disabled={feedbackMessage.length < 10 || submitFeedbackMutation.isPending}
                    className={`flex-1 px-4 py-2.5 rounded-lg ${colors.primary.bg} hover:opacity-90 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
                  >
                    {submitFeedbackMutation.isPending ? 'Invio...' : 'Invia'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Standard layout (non-TOLC)
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
                  : 'bg-gray-100 dark:bg-slate-700'
              }`}>
                <Clock className={`w-4 h-4 ${timeRemaining !== null && timeRemaining < 300 ? '' : colors.icon.primary}`} />
                <span className={`font-mono font-medium ${timeRemaining !== null && timeRemaining < 300 ? '' : colors.text.primary}`}>
                  {timeRemaining !== null ? formatTime(timeRemaining) : formatTime(timeSpent)}
                </span>
              </div>
            )}

            {/* Progress */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700">
              <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
              <span className={`text-sm font-medium ${colors.text.primary}`}>{answeredCount}/{simulation.totalQuestions}</span>
            </div>

            {/* Navigation toggle */}
            <button
              onClick={() => setShowNavigation(!showNavigation)}
              className={`p-2 rounded-lg transition-colors ${
                showNavigation 
                  ? 'bg-gray-300 dark:bg-slate-600' 
                  : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <Grid3X3 className={`w-5 h-5 ${colors.icon.primary}`} />
            </button>

            {/* Submit button */}
            <button
              onClick={() => setSubmitConfirm(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${colors.primary.bg} hover:opacity-90`}
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Concludi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Question panel */}
        <div className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            {/* Question header */}
            <div className="flex items-center justify-between mb-4">
              <span className={`text-sm font-medium ${colors.text.muted}`}>
                Domanda {currentQuestionIndex + 1}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors.background.hover} ${colors.text.secondary} hover:text-orange-500`}
                  title="Segnala problema con la domanda"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span className="hidden sm:inline">Segnala</span>
                </button>
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
            </div>

            {/* Question text */}
            <div className={`p-6 rounded-xl ${colors.background.card} border ${colors.border.light} mb-6`}>
              <div
                className={`prose prose-sm max-w-none ${colors.text.primary}`}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentQuestion?.question.text || '') }}
              />
              {currentQuestion?.question.textLatex && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <LaTeXRenderer 
                    latex={currentQuestion.question.textLatex} 
                    className={colors.text.primary} 
                  />
                </div>
              )}
            </div>

            {/* Answers - conditional based on question type */}
            {currentQuestion?.question.type === 'OPEN_TEXT' ? (
              /* Open text answer input with symbol keyboard */
              <div className="space-y-3">
                <label className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
                  Scrivi la tua risposta:
                </label>
                <TextareaWithSymbols
                  value={currentAnswer?.answerText || ''}
                  onChange={handleOpenTextChange}
                  placeholder="Inserisci la tua risposta..."
                  rows={6}
                  className={`w-full px-4 py-3 rounded-xl border ${colors.border.light} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors resize-y`}
                />
                <p className={`text-xs ${colors.text.muted}`}>
                  Usa la tastiera dei simboli per inserire caratteri speciali e formule matematiche.
                </p>
              </div>
            ) : (
              /* Multiple choice answers */
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
            )}

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
          <div className={`w-full sm:w-80 lg:w-96 border-l ${colors.border.light} ${colors.background.secondary} overflow-y-auto`}>
            <div className="p-4">
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
          </div>
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

      {/* Feedback Modal */}
      {showFeedbackModal && currentQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-md rounded-xl ${colors.background.card} border ${colors.border.light} shadow-xl`}>
            <div className={`flex items-center justify-between p-4 border-b ${colors.border.light}`}>
              <h3 className={`text-lg font-semibold ${colors.text.primary}`}>
                Segnala Problema
              </h3>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className={`p-1 rounded-lg ${colors.background.hover} ${colors.text.secondary}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
                  Tipo di problema
                </label>
                <CustomSelect
                  value={feedbackType}
                  onChange={(value) => setFeedbackType(value as typeof feedbackType)}
                  options={[
                    { value: 'ERROR_IN_QUESTION', label: 'Errore nel testo della domanda' },
                    { value: 'ERROR_IN_ANSWER', label: 'Errore nelle risposte' },
                    { value: 'UNCLEAR', label: 'Domanda poco chiara' },
                    { value: 'SUGGESTION', label: 'Suggerimento miglioramento' },
                    { value: 'OTHER', label: 'Altro' },
                  ]}
                  placeholder="Seleziona tipo di problema"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${colors.text.secondary} mb-2`}>
                  Descrizione del problema
                </label>
                <textarea
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  placeholder="Descrivi il problema in almeno 10 caratteri..."
                  rows={4}
                  className={`w-full p-3 rounded-lg border ${colors.border.light} ${colors.background.secondary} ${colors.text.primary} resize-none`}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg border ${colors.border.light} ${colors.text.secondary} ${colors.background.hover}`}
                >
                  Annulla
                </button>
                <button
                  onClick={() => {
                    if (feedbackMessage.length >= 10 && currentQuestion) {
                      submitFeedbackMutation.mutate({
                        questionId: currentQuestion.questionId,
                        type: feedbackType,
                        message: feedbackMessage,
                      });
                    }
                  }}
                  disabled={feedbackMessage.length < 10 || submitFeedbackMutation.isPending}
                  className={`flex-1 px-4 py-2 rounded-lg ${colors.primary.gradient} text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {submitFeedbackMutation.isPending ? 'Invio...' : 'Invia Segnalazione'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
