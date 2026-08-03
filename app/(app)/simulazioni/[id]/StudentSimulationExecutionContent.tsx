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
import { useSimulationDraft } from '@/lib/hooks/useSimulationDraft';
import { useSimulationAutosave } from '@/lib/hooks/useSimulationAutosave';
import {
  accumulateQuestionMs,
  buildProgressItems,
  mergeProgress,
  nextRev,
  normalizeAnswerItems,
  questionMsToSeconds,
  questionSecondsToMs,
  type SimulationAnswerItem,
  type SimulationProgressSnapshot,
} from '@/lib/utils/simulationProgress';
import { sanitizeStudentAnswerText, sanitizeStudentOpenAnswerInput } from '@/lib/utils/studentOpenAnswer';

type Answer = SimulationAnswerItem;

// Section type matching database schema (from wizard)
interface SimulationSection {
  name: string;
  durationMinutes: number;
  questionIds: string[];
  subjectId?: string | null;
  order?: number;
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
  /**
   * Per-question time in milliseconds — the authoritative accumulator.
   *
   * A ref, not state, for two reasons: the submit paths have to read it in the same
   * tick they commit to it (a state read there sees the value from before the
   * commit), and the autosave loop must be able to look at it without forcing a
   * re-render. `questionTimes` below is the rendered mirror, in whole seconds.
   */
  const questionTimesMsRef = useRef<Record<string, number>>({});
  const currentQuestionIdRef = useRef<string | null>(null);
  // Lets the timer and the autosave loop commit the pending time without taking a
  // dependency on the callback, which would rebuild the interval on every change.
  const flushQuestionTimeRef = useRef<() => Record<string, number>>(() => ({}));
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSubmitRef = useRef<(() => void) | null>(null);
  const answersInitializedRef = useRef<boolean>(false);
  const answersRef = useRef<Answer[]>([]); // Ref for heartbeat to read current answers
  const timeSpentRef = useRef<number>(0);
  const questionTimesRef = useRef<Record<string, number>>({});
  const currentSectionIndexRef = useRef<number>(0);
  const sectionTimesRef = useRef<Record<number, number>>({});
  // Wall-clock origin of each section's timer (epoch ms), Virtual Room only:
  // elapsed is derived as now - origin, so a reload, a connection loss or a
  // throttled background tab can never pause the clock relative to the room.
  const sectionStartedAtRef = useRef<Record<number, number>>({});
  // Server-authoritative countdown for the Virtual Room, refreshed by the 5s
  // status poll: remaining seconds as the server computed them, plus when we
  // heard them. The room clock keeps running while a student is offline.
  const serverClockRef = useRef<{ remainingSeconds: number; syncedAtMs: number } | null>(null);
  const isSubmittingRef = useRef<boolean>(false);
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

    // Resync the room countdown on every poll: the server computes it from
    // actualStartAt, so every participant converges on the same clock.
    if (sessionStatus?.hasSession && 'timeRemaining' in sessionStatus && typeof sessionStatus.timeRemaining === 'number') {
      serverClockRef.current = { remainingSeconds: sessionStatus.timeRemaining, syncedAtMs: Date.now() };
    }
    
    // A kicked/disconnected student also gets a synthetic status: 'COMPLETED' from the
    // server (see getStudentSessionStatus). Handle the kick FIRST and never auto-submit
    // in that case, otherwise a connection loss would finalize an attempt the student
    // never actually finished, locking them out of the simulation.
    const isKickedNow = sessionStatus?.hasSession && 'isKicked' in sessionStatus && sessionStatus.isKicked;

    if (isKickedNow) {
      setIsKicked(true);
      const reason = 'kickedReason' in sessionStatus ? sessionStatus.kickedReason : 'Sei stato espulso dalla sessione';
      setKickedReason(typeof reason === 'string' ? reason : 'Sei stato espulso dalla sessione');
    }

    // Check if the session has been genuinely terminated by admin (not a kick)
    if (sessionStatus?.hasSession && 'status' in sessionStatus && sessionStatus.status === 'COMPLETED' && hasStarted && !isKickedNow) {
      console.log('[VirtualRoom] Session terminated by admin, auto-submitting...');
      // Auto-submit only when the whole session ended normally
      if (autoSubmitRef.current) {
        autoSubmitRef.current();
      }
    }
  }, [sessionStatus, hasStarted]);

  // Persist TOLC instructions read state to sessionStorage
  useEffect(() => {
    if (hasReadInstructions) {
      sessionStorage.setItem(`tolc-instructions-read-${id}`, 'true');
    }
  }, [hasReadInstructions, id]);

  // Helper to restore saved attempt state
  const restoreAttemptState = useCallback((snapshot: SimulationProgressSnapshot) => {
    if (snapshot.timeSpent) {
      setTimeSpent(snapshot.timeSpent);
      lastSectionTimeUpdateRef.current = snapshot.timeSpent;
    }

    if (snapshot.items.length > 0) {
      const restoredAnswers = snapshot.items.map(a => ({
        questionId: a.questionId,
        answerId: a.answerId ?? null,
        answerText: sanitizeStudentAnswerText(a.answerText),
        timeSpent: a.timeSpent || 0,
        flagged: a.flagged ?? false,
      }));
      setAnswers(restoredAnswers);
      answersInitializedRef.current = true;

      const restoredQuestionTimes: Record<string, number> = {};
      snapshot.items.forEach(a => {
        if (a.timeSpent) {
          restoredQuestionTimes[a.questionId] = a.timeSpent;
        }
      });
      // Seed the millisecond accumulator too, or the first commit after a resume
      // would overwrite the restored totals with the time of this session alone.
      questionTimesMsRef.current = questionSecondsToMs(restoredQuestionTimes);
      questionTimesRef.current = restoredQuestionTimes;
      setQuestionTimes(restoredQuestionTimes);
    }

    if (snapshot.sectionTimes) {
      setSectionTimes(snapshot.sectionTimes);
    }
    if (snapshot.sectionStartedAt) {
      sectionStartedAtRef.current = snapshot.sectionStartedAt;
    }
    setCurrentSectionIndex(snapshot.currentSectionIndex);
    setCompletedSections(new Set(Array.from({ length: snapshot.currentSectionIndex }, (_, index) => index)));
    setCurrentQuestionIndex(snapshot.currentQuestionIndex);
  }, []);

  // Echoed back on every saveProgress/submit so the server can reject writes
  // from a tab opened before a staff reset of this attempt
  const resetTokenRef = useRef<number | null>(null);

  const { readDraft, saveDraft, clearDraft } = useSimulationDraft();
  // Revision the autosave must continue from, so a resumed attempt never
  // reuses a number already stored on the server
  const [baseRev, setBaseRev] = useState(0);

  // Mutations
  const startAttemptMutation = trpc.simulations.startAttempt.useMutation({
    onSuccess: (data) => {
      console.log('[VirtualRoom] startAttemptMutation onSuccess, resumed:', data.resumed);
      const serverResetToken = ('resetToken' in data ? data.resetToken : null) ?? null;
      resetTokenRef.current = serverResetToken;

      // The server only knows what reached it. A student who went offline may
      // hold newer answers on this device, so both are compared before restoring.
      const serverSnapshot: SimulationProgressSnapshot | null = data.resumed
        ? {
            rev: ('savedRev' in data ? data.savedRev : 0) ?? 0,
            updatedAt: 0,
            resetToken: serverResetToken,
            items: normalizeAnswerItems('savedAnswers' in data ? data.savedAnswers : []),
            timeSpent: ('savedTimeSpent' in data ? data.savedTimeSpent : 0) ?? 0,
            sectionTimes: ('savedSectionTimes' in data ? data.savedSectionTimes : {}) ?? {},
            sectionStartedAt: ('savedSectionStartedAt' in data ? data.savedSectionStartedAt : {}) ?? {},
            currentSectionIndex: ('savedCurrentSectionIndex' in data ? data.savedCurrentSectionIndex : 0) ?? 0,
            currentQuestionIndex: ('savedCurrentQuestionIndex' in data ? data.savedCurrentQuestionIndex : 0) ?? 0,
          }
        : null;
      const localSnapshot = readDraft(data.resultId);
      const restored = mergeProgress(serverSnapshot, localSnapshot);

      if (restored) {
        restoreAttemptState(restored);
      }
      setBaseRev(nextRev(serverSnapshot, localSnapshot));

      console.log('[VirtualRoom] Setting hasStarted = true');
      setHasStarted(true);
    },
    onError: handleMutationError,
  });

  // Shown at most once: a staff reset makes every further autosave fail, and
  // repeating the toast on each retry would bury the student in notifications
  const resetConflictNotifiedRef = useRef(false);

  const saveProgressMutation = trpc.simulations.saveProgress.useMutation({
    onError: (error) => {
      console.error('Save progress error:', error);
      // A CONFLICT is not a connection problem: the attempt was reset by staff
      // and only reloading can reattach this tab to it.
      if (error.data?.code === 'CONFLICT' && !resetConflictNotifiedRef.current) {
        resetConflictNotifiedRef.current = true;
        showError('Tentativo ripristinato', error.message);
      }
    },
  });

  const submitMutation = trpc.simulations.submit.useMutation({
    // The one request a student cannot afford to lose. Submitting is a replace
    // keyed on the attempt, so retrying it is safe, and at the end of an exam
    // every participant fires it within the same minute — the moment a blip is
    // most likely and a red toast least useful.
    retry: (failureCount, error) => {
      const httpStatus = (error as { data?: { httpStatus?: number } })?.data?.httpStatus;
      // The server has spoken: a conflict or a rejection will not change on a retry
      if (httpStatus !== undefined && httpStatus < 500) return false;
      return failureCount < 3;
    },
    retryDelay: (failureCount) => Math.min(2000 * 2 ** failureCount, 10_000),
    onSuccess: (data) => {
      // Clear TOLC instructions state on completion
      sessionStorage.removeItem(`tolc-instructions-read-${id}`);
      // The attempt is safely scored: the local safety net is no longer needed
      const attemptId = startAttemptMutation.data?.resultId;
      if (attemptId) clearDraft(attemptId);
      showSuccess('Completata!', 'Simulazione inviata con successo');
      router.push(`/simulazioni/${id}/risultato?resultId=${data.resultId}`);
    },
    onError: (error) => {
      // A failed submit must not leave the attempt frozen: `isSubmitting` also
      // gates the timer and the autosave, so staying stuck here would silently
      // stop saving everything from this point on.
      setIsSubmitting(false);
      handleMutationError(error);
    },
  });

  // Feedback mutation
  const submitFeedbackMutation = trpc.questions.submitFeedback.useMutation({
    onSuccess: () => {
      showSuccess('Segnalazione inviata', 'La tua segnalazione è stata inviata agli admin.');
      setShowFeedbackModal(false);
    },
    onError: handleMutationError,
  });

  // Log cheating event for virtual room (silent - no error toast).
  // Only the stable `mutate` is referenced below: the mutation object changes
  // identity on every render and would re-register the anti-cheat listeners.
  const { mutate: logCheatingEventMutate } = trpc.virtualRoom.logCheatingEvent.useMutation();

  // Map anti-cheat event type to DB enum
  const mapEventType = useCallback((type: string) => {
    const mapping: Record<string, 'TAB_CHANGE' | 'WINDOW_BLUR' | 'FULLSCREEN_EXIT' | 'PAGE_RELOAD' | 'COPY_ATTEMPT' | 'PASTE_ATTEMPT' | 'RIGHT_CLICK' | 'DEVTOOLS_OPEN' | 'KEYBOARD_SHORTCUT' | 'OTHER'> = {
      'tab_blur': 'WINDOW_BLUR',
      'visibility_hidden': 'TAB_CHANGE',
      'fullscreen_exit': 'FULLSCREEN_EXIT',
      'copy_attempt': 'COPY_ATTEMPT',
      'paste_attempt': 'PASTE_ATTEMPT',
      'right_click': 'RIGHT_CLICK',
      'keyboard_shortcut': 'KEYBOARD_SHORTCUT',
      'page_reload_attempt': 'PAGE_RELOAD',
      'devtools_open': 'DEVTOOLS_OPEN',
    };
    return mapping[type] || 'OTHER';
  }, []);

  // Anti-cheat configuration. Detection is report-only: violations are logged
  // to the DB so staff sees them live in the Virtual Room, but the simulation
  // is NEVER terminated automatically — only the room controller can kick.
  const antiCheatConfig = useMemo(() => ({
    enabled: hasStarted && (simulation?.enableAntiCheat ?? false),
    forceFullscreen: simulation?.forceFullscreen ?? false,
    blockTabSwitch: true,
    blockCopyPaste: true,
    blockRightClick: true,
    blockKeyboardShortcuts: true,
    blockReload: true,
    onViolation: (event: { type: string; timestamp: Date; details?: string }) => {
      console.warn('[AntiCheat] Violation:', event);
      // Log to database if in virtual room mode - use ref to get current participantId
      const currentParticipantId = participantIdRef.current;
      if (isVirtualRoom && currentParticipantId) {
        logCheatingEventMutate({
          participantId: currentParticipantId,
          eventType: mapEventType(event.type),
          description: event.details,
          metadata: { timestamp: event.timestamp.toISOString() },
        });
      }
    },
  }), [hasStarted, simulation?.enableAntiCheat, simulation?.forceFullscreen, isVirtualRoom, logCheatingEventMutate, mapEventType]);

  const antiCheat = useAntiCheat(antiCheatConfig);

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

  // Timer. Paused while a submit is in flight (prevents negative display) and
  // resumed if that submit fails, so a dropped connection doesn't freeze the clock.
  useEffect(() => {
    if (!hasStarted || !simulation || isSubmitting) return;

    // The question clock (re)starts now, so a pause — a submit in flight — is never
    // billed to the question the student happens to be on.
    questionStartTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      // Commit before the clock stops. Without this, every pause (and every re-run
      // of this effect) would silently discard the time accrued since the last
      // navigation, because the line above resets the origin on the way back in.
      flushQuestionTimeRef.current();
    };
  }, [hasStarted, simulation, isSubmitting]);

  // Keep answersRef in sync with answers state (for heartbeat interval)
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    timeSpentRef.current = timeSpent;
  }, [timeSpent]);

  useEffect(() => {
    questionTimesRef.current = questionTimes;
  }, [questionTimes]);

  // The time accumulator credits whatever question this ref names, so it has to be
  // updated before any navigation commits — hence a ref rather than reading the
  // index out of a closure that may already belong to the next question.
  useEffect(() => {
    currentQuestionIdRef.current =
      simulation?.questions[currentQuestionIndex]?.questionId ?? null;
  }, [simulation, currentQuestionIndex]);

  useEffect(() => {
    currentSectionIndexRef.current = currentSectionIndex;
  }, [currentSectionIndex]);

  useEffect(() => {
    sectionTimesRef.current = sectionTimes;
  }, [sectionTimes]);

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  // Keep participantIdRef in sync (for anti-cheat callbacks)
  useEffect(() => {
    participantIdRef.current = participantId;
  }, [participantId]);

  // Reads the live state through the refs the timers already maintain, so the
  // autosave loop never forces a re-render just to look at the answers
  const buildSnapshot = useCallback(() => ({
    // Commit first: otherwise a snapshot taken while the student sits on one
    // question — an autosave tick, or the beacon fired as the tab closes — would
    // save that question as if no time had been spent on it, and a resume would
    // start it back from zero.
    items: buildProgressItems(answersRef.current, flushQuestionTimeRef.current()),
    timeSpent: timeSpentRef.current,
    sectionTimes: sectionTimesRef.current,
    sectionStartedAt: sectionStartedAtRef.current,
    currentSectionIndex: currentSectionIndexRef.current,
    currentQuestionIndex: currentQuestionIndexRef.current,
    resetToken: resetTokenRef.current,
  }), []);

  const persistLocal = useCallback((snapshot: SimulationProgressSnapshot) => {
    const resultId = startAttemptMutation.data?.resultId;
    if (resultId) saveDraft(resultId, snapshot);
  }, [startAttemptMutation.data?.resultId, saveDraft]);

  const persistRemote = useCallback((snapshot: SimulationProgressSnapshot) => {
    const resultId = startAttemptMutation.data?.resultId;
    if (!resultId) return Promise.resolve();

    return saveProgressMutation.mutateAsync({
      resultId,
      answers: snapshot.items,
      timeSpent: snapshot.timeSpent,
      sectionTimes: snapshot.sectionTimes,
      sectionStartedAt: snapshot.sectionStartedAt,
      currentSectionIndex: snapshot.currentSectionIndex,
      currentQuestionIndex: snapshot.currentQuestionIndex,
      resetToken: snapshot.resetToken,
      rev: snapshot.rev,
    });
  }, [startAttemptMutation.data?.resultId, saveProgressMutation]);

  // The page is going away: sendBeacon still gets through where a normal
  // request would be cancelled
  const persistOnUnload = useCallback((snapshot: SimulationProgressSnapshot) => {
    const resultId = startAttemptMutation.data?.resultId;
    if (!resultId) return;

    const requestBody = JSON.stringify({
      resultId,
      answers: snapshot.items,
      timeSpent: snapshot.timeSpent,
      sectionTimes: snapshot.sectionTimes,
      sectionStartedAt: snapshot.sectionStartedAt,
      currentSectionIndex: snapshot.currentSectionIndex,
      currentQuestionIndex: snapshot.currentQuestionIndex,
      resetToken: snapshot.resetToken,
      rev: snapshot.rev,
    });

    if (navigator.sendBeacon) {
      const beaconPayload = new Blob([requestBody], { type: 'application/json' });
      const sent = navigator.sendBeacon('/api/simulations/save-progress', beaconPayload);
      if (sent) return;
    }

    fetch('/api/simulations/save-progress', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
      keepalive: true,
    }).catch(() => {
      // Offline: the local draft written just before this call is the fallback
    });
  }, [startAttemptMutation.data?.resultId]);

  const { isOffline, flushNow } = useSimulationAutosave({
    resultId: startAttemptMutation.data?.resultId ?? null,
    enabled: hasStarted && !!startAttemptMutation.data?.resultId,
    paused: isSubmitting,
    baseRev,
    buildSnapshot,
    persistLocal,
    persistRemote,
    persistOnUnload,
  });

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

  /**
   * Commits the time spent on the question currently open and **returns** the
   * resulting per-question seconds.
   *
   * It returns the map instead of leaving callers to read `questionTimes`: that
   * state update lands on the next render, so a submit that called this and then
   * read the state would send the totals from *before* its own commit — silently
   * dropping the time spent on the last question the student looked at.
   */
  const flushQuestionTime = useCallback((): Record<string, number> => {
    const now = Date.now();
    if (hasStarted && questionStartTimeRef.current > 0) {
      questionTimesMsRef.current = accumulateQuestionMs(
        questionTimesMsRef.current,
        currentQuestionIdRef.current,
        now - questionStartTimeRef.current
      );
    }
    questionStartTimeRef.current = now;

    const seconds = questionMsToSeconds(questionTimesMsRef.current);
    questionTimesRef.current = seconds;
    setQuestionTimes(seconds);
    return seconds;
  }, [hasStarted]);

  useEffect(() => {
    flushQuestionTimeRef.current = flushQuestionTime;
  }, [flushQuestionTime]);

  // Leave confirmation. The progress flush itself lives in useSimulationAutosave,
  // which writes the local draft and fires the beacon on `pagehide` and unmount.
  useEffect(() => {
    if (!hasStarted || !startAttemptMutation.data?.resultId) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers show a generic message; custom messages are ignored.
      return 'Hai una simulazione in corso. Sei sicuro di voler lasciare la pagina?';
    };

    globalThis.addEventListener('beforeunload', handleBeforeUnload);
    return () => globalThis.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasStarted, startAttemptMutation.data?.resultId]);

  // Update the answer for the current question, creating its entry if missing.
  // A restored/partial `answers` array (resume) may lack a slot for questions
  // not yet answered — a plain `.map` would silently drop the change, so we
  // upsert to guarantee the selection is always captured (counted + submitted).
  const upsertCurrentAnswer = useCallback(
    (mutate: (current: Answer) => Answer) => {
      if (!simulation) return;
      const currentQuestion = simulation.questions[currentQuestionIndex];
      if (!currentQuestion) return;

      setAnswers((prev) => {
        const existing = prev.find((a) => a.questionId === currentQuestion.questionId);
        if (existing) {
          return prev.map((a) =>
            a.questionId === currentQuestion.questionId ? mutate(a) : a
          );
        }
        const base: Answer = {
          questionId: currentQuestion.questionId,
          answerId: null,
          answerText: null,
          timeSpent: 0,
          flagged: false,
        };
        return [...prev, mutate(base)];
      });
    },
    [simulation, currentQuestionIndex]
  );

  // Handle answer selection
  const handleAnswerSelect = (answerId: string) => {
    upsertCurrentAnswer((a) => ({
      ...a,
      answerId: a.answerId === answerId ? null : answerId,
    }));
  };

  // Handle open text answer change
  const handleOpenTextChange = (text: string) => {
    const sanitizedText = sanitizeStudentOpenAnswerInput(text);
    upsertCurrentAnswer((a) => ({
      ...a,
      answerText: sanitizedText.trim().length > 0 ? sanitizedText : null,
    }));
  };

  const handleToggleFlag = () => {
    upsertCurrentAnswer((a) => ({ ...a, flagged: !a.flagged }));
  };

  // Navigate questions
  const goToQuestion = (index: number) => {
    flushQuestionTime();
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
          flushQuestionTime();
          setCurrentQuestionIndex(globalIndex);
        }
      }
    } else {
      // Normal mode - navigate globally
      if (currentQuestionIndex >= simulation.questions.length - 1) return;
      flushQuestionTime();
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
          flushQuestionTime();
          setCurrentQuestionIndex(globalIndex);
        }
      }
    } else {
      // Normal mode - navigate globally
      if (currentQuestionIndex <= 0) return;
      flushQuestionTime();
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  // Submit simulation
  const handleSubmit = useCallback(async () => {
    // Guarded through the ref: `isSubmitting` in this closure can still be false
    // when an external trigger (the Virtual Room ending) fires right after a manual
    // submit, and a second submit would score the attempt twice.
    if (!simulation || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    // Read the map this returns, not the state: the commit it just made lands on the
    // next render, so `questionTimes` here would still be missing the time spent on
    // the question the student was looking at when they pressed submit.
    const finalTimes = flushQuestionTime();

    const finalAnswers = answers.map((a) => ({
      questionId: a.questionId,
      answerId: a.answerId,
      answerText: sanitizeStudentAnswerText(a.answerText),
      timeSpent: finalTimes[a.questionId] || 0,
      flagged: a.flagged,
    }));

    submitMutation.mutate({
      simulationId: id,
      answers: finalAnswers,
      totalTimeSpent: timeSpent,
      resetToken: resetTokenRef.current,
      // Submit against the very attempt that has been autosaved
      resultId: startAttemptMutation.data?.resultId,
    });
  }, [simulation, flushQuestionTime, answers, submitMutation, id, timeSpent, startAttemptMutation.data?.resultId]);

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
      if (!Array.isArray(parsed)) return [];

      const normalizedSections = parsed
        .map((section) => ({
          ...section,
          questionIds: Array.isArray(section.questionIds) ? [...section.questionIds] : [],
        }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      if (!simulation.questions || normalizedSections.length === 0) return normalizedSections;

      const assignedQuestionIds = new Set(normalizedSections.flatMap(section => section.questionIds));
      for (const simulationQuestion of simulation.questions) {
        if (assignedQuestionIds.has(simulationQuestion.questionId)) continue;

        const subjectId = simulationQuestion.question?.subject?.id;
        const subjectName = simulationQuestion.question?.subject?.name;
        const targetSection = normalizedSections.find(section => section.subjectId && section.subjectId === subjectId)
          || normalizedSections.find(section => subjectName && section.name.toLowerCase() === subjectName.toLowerCase())
          || normalizedSections[0];

        targetSection.questionIds.push(simulationQuestion.questionId);
        assignedQuestionIds.add(simulationQuestion.questionId);
      }

      return normalizedSections;
    } catch {
      return [];
    }
  }, [simulation?.hasSections, simulation?.sections, simulation?.questions]);

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

  // Virtual Room: anchor the section clock to the wall clock the moment the
  // section becomes active. Elapsed time is then derived from the anchor
  // instead of accumulated tick by tick, so all participants stay on the same
  // time across reloads, connection losses and background-tab throttling.
  // A legacy resume without an anchor continues from the saved elapsed time.
  useEffect(() => {
    if (!isVirtualRoom || !hasSectionsMode || !hasStarted) return;
    if (sectionStartedAtRef.current[currentSectionIndex]) return;
    const alreadyElapsed = sectionTimesRef.current[currentSectionIndex] || 0;
    sectionStartedAtRef.current = {
      ...sectionStartedAtRef.current,
      [currentSectionIndex]: Date.now() - alreadyElapsed * 1000,
    };
  }, [isVirtualRoom, hasSectionsMode, hasStarted, currentSectionIndex]);

  // Section timer management
  useEffect(() => {
    if (!hasStarted || !hasSectionsMode) return;

    // Only increment if this is a new second (not a restore or duplicate)
    // This prevents incrementing when timeSpent is restored from saved progress
    if (timeSpent <= lastSectionTimeUpdateRef.current) return;
    lastSectionTimeUpdateRef.current = timeSpent;

    const anchor = isVirtualRoom ? sectionStartedAtRef.current[currentSectionIndex] : undefined;
    setSectionTimes(prev => {
      const previous = prev[currentSectionIndex] || 0;
      // max() keeps the anchored clock monotonic even if the device clock is
      // adjusted mid-attempt; without an anchor, legacy tick accumulation.
      const next = anchor
        ? Math.max(previous, Math.floor((Date.now() - anchor) / 1000))
        : previous + 1;
      return { ...prev, [currentSectionIndex]: next };
    });
  }, [timeSpent, hasStarted, hasSectionsMode, currentSectionIndex, isVirtualRoom]);

  // Section time remaining
  const sectionTimeRemaining = useMemo(() => {
    if (!hasSectionsMode || !currentSection) return null;
    const sectionDuration = currentSection.durationMinutes * 60;
    const sectionTimeUsed = sectionTimes[currentSectionIndex] || 0;
    return Math.max(0, sectionDuration - sectionTimeUsed);
  }, [hasSectionsMode, currentSection, currentSectionIndex, sectionTimes]);

  // Auto-advance section when section time runs out
  useEffect(() => {
    if (!hasSectionsMode || sectionTimeRemaining === null) return;
    if (sectionTimeRemaining === 0 && hasStarted && !completedSections.has(currentSectionIndex)) {
      showError('Tempo sezione scaduto', `Il tempo per "${currentSection?.name}" è terminato`);
      if (currentSectionIndex >= sections.length - 1) {
        // Last section expired: submit immediately without confirmation dialog
        autoSubmitRef.current?.();
      } else {
        handleCompleteSection();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionTimeRemaining, hasStarted, hasSectionsMode, currentSectionIndex]);

  // Complete current section and move to next
  const handleCompleteSection = useCallback(() => {
    if (!hasSectionsMode) return;

    // A section can never be re-entered: get its answers to the server now
    // rather than waiting out the debounce
    flushNow();

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

  // Time remaining. In a Virtual Room the countdown follows the server clock
  // (resynced by the 5s status poll): the room clock keeps running while a
  // student is offline, so a reload or connection loss must never hand them
  // extra time relative to the rest of the room.
  const localTimeRemaining = simulation?.durationMinutes
    ? Math.max(0, simulation.durationMinutes * 60 - timeSpent)
    : null;
  const serverClock = isVirtualRoom ? serverClockRef.current : null;
  const timeRemaining = serverClock
    ? Math.max(0, serverClock.remainingSeconds - Math.floor((Date.now() - serverClock.syncedAtMs) / 1000))
    : localTimeRemaining;

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining === 0 && hasStarted && !isSubmitting) {
      showError('Tempo scaduto', 'La simulazione verrà inviata automaticamente');
      autoSubmitRef.current?.();
    }
  }, [timeRemaining, hasStarted, isSubmitting, showError]);

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

  // A retry in flight is the difference between "the app is thinking" and "the
  // connection dropped and it is trying again": without saying so, a spinner
  // that lasts half a minute reads as a frozen page and invites a reload.
  const submitModalMessage = submitMutation.failureCount > 0
    ? `Connessione lenta: sto riprovando l'invio (tentativo ${submitMutation.failureCount + 1} di 4). Non chiudere la pagina.`
    : `Hai risposto a ${answeredCount}/${simulation.totalQuestions} domande. Vuoi consegnare?`;

  // Use TOLC layout for simulations with sections
  if (hasSectionsMode) {
    return (
      <>
        {/* Anti-cheat warning overlay */}
        {simulation.enableAntiCheat && (
          <AntiCheatWarningOverlay
            isBlurred={antiCheat.isBlurred}
            isFullscreen={antiCheat.isFullscreen}
            requireFullscreen={simulation.forceFullscreen && antiCheat.canEnforceFullscreen}
            onRequestFullscreen={antiCheat.requestFullscreen}
            onDismissBlur={antiCheat.acknowledgeBlur}
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
          onGoToQuestion={goToQuestion}
          onGoNext={goNext}
          onGoPrev={goPrev}
          onCompleteSection={handleRequestSectionComplete}
          onSubmit={() => setSubmitConfirm(true)}
          onToggleFlag={handleToggleFlag}
          onReportQuestion={() => setShowFeedbackModal(true)}
          answeredCount={answeredCount}
          totalQuestions={simulation.totalQuestions}
          isOffline={isOffline}
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
          message={submitModalMessage}
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
          requireFullscreen={simulation.forceFullscreen && antiCheat.canEnforceFullscreen}
          onRequestFullscreen={antiCheat.requestFullscreen}
          onDismissBlur={antiCheat.acknowledgeBlur}
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
        isOffline={isOffline}
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
            onReportQuestion={() => setShowFeedbackModal(true)}
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
        isLoading={submitMutation.isPending}
        retryAttempt={submitMutation.failureCount}
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
              currentSection.questionIds.includes(a.questionId)
              && (a.answerId !== null || !!a.answerText?.trim())
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
