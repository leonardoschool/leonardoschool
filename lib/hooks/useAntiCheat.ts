/**
 * Anti-Cheat Hook for Simulation Execution
 *
 * Implements various anti-cheat measures:
 * - Tab/window blur detection
 * - Visibility change detection
 * - Fullscreen enforcement
 * - Page reload prevention
 * - Copy/paste blocking
 * - Right-click blocking
 * - Keyboard shortcut blocking
 * - Event logging
 *
 * Touch devices (phones/tablets) fire many of these signals for benign
 * gestures (virtual keyboard, pinch-zoom, long-press, iOS Safari quirks),
 * so detection is capability-aware: desktop-only heuristics are disabled
 * on coarse-pointer devices and events are deduplicated to avoid inflating
 * the violation count.
 */

import { useEffect, useCallback, useRef, useState, useMemo } from 'react';

export interface AntiCheatEvent {
  type:
    | 'tab_blur'
    | 'visibility_hidden'
    | 'fullscreen_exit'
    | 'copy_attempt'
    | 'paste_attempt'
    | 'right_click'
    | 'keyboard_shortcut'
    | 'page_reload_attempt'
    | 'devtools_open';
  timestamp: Date;
  details?: string;
}

export interface AntiCheatConfig {
  enabled: boolean;
  forceFullscreen: boolean;
  blockTabSwitch: boolean;
  blockCopyPaste: boolean;
  blockRightClick: boolean;
  blockKeyboardShortcuts: boolean;
  blockReload: boolean;
  onViolation?: (event: AntiCheatEvent) => void;
}

export interface AntiCheatState {
  isFullscreen: boolean;
  violationCount: number;
  events: AntiCheatEvent[];
  isBlurred: boolean;
  lastViolation: AntiCheatEvent | null;
}

const defaultConfig: AntiCheatConfig = {
  enabled: true,
  forceFullscreen: true,
  blockTabSwitch: true,
  blockCopyPaste: true,
  blockRightClick: true,
  blockKeyboardShortcuts: true,
  blockReload: true,
};

// The same physical action must not be counted twice: a real tab switch fires
// both `blur` and `visibilitychange`, and size-based checks run on an interval.
const EVENT_DEDUP_MS = 5000;
const DEDUP_BUCKET: Partial<Record<AntiCheatEvent['type'], string>> = {
  tab_blur: 'focus_loss',
  visibility_hidden: 'focus_loss',
};

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void>;
};

// Classify by PRIMARY pointer, not by "has any fine pointer": a Samsung tablet
// with S-Pen or an iPad with Pencil/trackpad reports `any-pointer: fine` yet is
// still a touch device (virtual keyboard, app switching, no reliable fullscreen),
// so `(pointer: coarse)` is the signal that matters. A touchscreen laptop
// (Surface, 2-in-1) keeps a fine primary pointer and desktop-strength detection.
function getIsTouchOnlyDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const coarsePrimary = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const noFinePointer =
    navigator.maxTouchPoints > 0 && !window.matchMedia?.('(any-pointer: fine)').matches;
  return coarsePrimary || noFinePointer;
}

function getFullscreenElement(): Element | null {
  if (typeof document === 'undefined') return null;
  return document.fullscreenElement ?? (document as WebkitDocument).webkitFullscreenElement ?? null;
}

// iPhone Safari has no Fullscreen API for non-video elements: enforcing or
// logging fullscreen there would block the exam or produce phantom events.
function getIsFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  return document.fullscreenEnabled || (document as WebkitDocument).webkitFullscreenEnabled === true;
}

export function useAntiCheat(config: Partial<AntiCheatConfig> = {}) {
  const mergedConfig = useMemo(() => ({ ...defaultConfig, ...config }), [config]);

  const [state, setState] = useState<AntiCheatState>({
    isFullscreen: false,
    violationCount: 0,
    events: [],
    isBlurred: false,
    lastViolation: null,
  });

  // Fullscreen can only be meaningfully enforced on desktop: on touch devices
  // the virtual keyboard kicks the browser out of fullscreen on its own.
  // Computed after mount to stay SSR-safe.
  const [canEnforceFullscreen, setCanEnforceFullscreen] = useState(false);
  useEffect(() => {
    setCanEnforceFullscreen(getIsFullscreenSupported() && !getIsTouchOnlyDevice());
  }, []);

  const eventsRef = useRef<AntiCheatEvent[]>([]);
  const violationCountRef = useRef(0);
  const lastEventAtRef = useRef<Map<string, number>>(new Map());

  // Log event
  const logEvent = useCallback((type: AntiCheatEvent['type'], details?: string) => {
    if (!mergedConfig.enabled) return;

    const bucket = DEDUP_BUCKET[type] ?? type;
    const now = Date.now();
    const lastAt = lastEventAtRef.current.get(bucket);
    if (lastAt !== undefined && now - lastAt < EVENT_DEDUP_MS) return;
    lastEventAtRef.current.set(bucket, now);

    const event: AntiCheatEvent = {
      type,
      timestamp: new Date(),
      details,
    };

    eventsRef.current.push(event);
    violationCountRef.current += 1;

    setState(prev => ({
      ...prev,
      events: [...prev.events, event],
      violationCount: prev.violationCount + 1,
      lastViolation: event,
    }));

    // Call violation callback. Report-only by design: violations are surfaced
    // to staff (Virtual Room) who decide whether to kick — never auto-terminate.
    mergedConfig.onViolation?.(event);
  }, [mergedConfig]);

  // Request fullscreen
  const requestFullscreen = useCallback(async () => {
    if (!mergedConfig.forceFullscreen || !getIsFullscreenSupported()) return;

    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
        await (elem as HTMLElement & { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
      } else if ((elem as HTMLElement & { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen) {
        await (elem as HTMLElement & { msRequestFullscreen: () => Promise<void> }).msRequestFullscreen();
      }
      setState(prev => ({ ...prev, isFullscreen: true }));
    } catch (error) {
      console.warn('Fullscreen request failed:', error);
    }
  }, [mergedConfig.forceFullscreen]);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as WebkitDocument).webkitExitFullscreen) {
        await (document as WebkitDocument).webkitExitFullscreen?.();
      } else if ((document as Document & { msExitFullscreen?: () => Promise<void> }).msExitFullscreen) {
        await (document as Document & { msExitFullscreen: () => Promise<void> }).msExitFullscreen();
      }
      setState(prev => ({ ...prev, isFullscreen: false }));
    } catch (error) {
      console.warn('Exit fullscreen failed:', error);
    }
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (!mergedConfig.enabled) return;

    const isTouch = getIsTouchOnlyDevice();
    const enforceFullscreen =
      mergedConfig.forceFullscreen && getIsFullscreenSupported() && !isTouch;

    // Visibility change handler
    const handleVisibilityChange = () => {
      if (document.hidden && mergedConfig.blockTabSwitch) {
        logEvent('visibility_hidden', 'Lo studente ha cambiato scheda o finestra del browser');
        setState(prev => ({ ...prev, isBlurred: true }));
      } else {
        setState(prev => ({ ...prev, isBlurred: false }));
      }
    };

    // Window blur handler. On touch devices `blur` fires for benign in-page
    // actions (virtual keyboard, address bar tap, notification banner), so
    // only `visibilitychange` — a real app/tab switch — counts there.
    const handleBlur = () => {
      if (mergedConfig.blockTabSwitch && !isTouch) {
        logEvent('tab_blur', 'La finestra del browser ha perso il focus');
        setState(prev => ({ ...prev, isBlurred: true }));
      }
    };

    // Window focus handler
    const handleFocus = () => {
      setState(prev => ({ ...prev, isBlurred: false }));
    };

    // Fullscreen change handler. Log the exit only on a fullscreen→windowed
    // transition: WebKit fires `webkitfullscreenchange` on enter too, and
    // checking only `document.fullscreenElement` there reported a phantom
    // exit at the moment the student entered fullscreen.
    let wasFullscreen = !!getFullscreenElement();
    const handleFullscreenChange = () => {
      const isFullscreen = !!getFullscreenElement();
      setState(prev => ({ ...prev, isFullscreen }));

      if (wasFullscreen && !isFullscreen && enforceFullscreen) {
        logEvent('fullscreen_exit', 'Lo studente ha abbandonato la modalità schermo intero');
        // Re-request fullscreen after a short delay
        setTimeout(() => {
          requestFullscreen();
        }, 100);
      }
      wasFullscreen = isFullscreen;
    };

    // Copy handler
    const handleCopy = (e: ClipboardEvent) => {
      if (mergedConfig.blockCopyPaste) {
        e.preventDefault();
        logEvent('copy_attempt', 'Lo studente ha tentato di copiare del testo');
      }
    };

    // Paste handler
    const handlePaste = (e: ClipboardEvent) => {
      if (mergedConfig.blockCopyPaste) {
        e.preventDefault();
        logEvent('paste_attempt', 'Lo studente ha tentato di incollare del testo');
      }
    };

    // Right-click handler. A long-press on touch devices fires `contextmenu`
    // too: still block the menu, but don't count it as a right click.
    const handleContextMenu = (e: MouseEvent) => {
      if (!mergedConfig.blockRightClick) return;
      e.preventDefault();

      const pointerType = (e as Partial<PointerEvent>).pointerType;
      const fromTouch = pointerType === 'touch' || pointerType === 'pen' || (pointerType === undefined && isTouch);
      if (!fromTouch) {
        logEvent('right_click', 'Lo studente ha fatto click con il tasto destro del mouse');
      }
    };

    // Keyboard shortcut handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!mergedConfig.blockKeyboardShortcuts) return;

      // Block common shortcuts
      const blockedShortcuts = [
        { ctrl: true, key: 'c' }, // Copy
        { ctrl: true, key: 'v' }, // Paste
        { ctrl: true, key: 'x' }, // Cut
        { ctrl: true, key: 'a' }, // Select all
        { ctrl: true, key: 'p' }, // Print
        { ctrl: true, key: 's' }, // Save
        { ctrl: true, key: 'u' }, // View source
        { ctrl: true, shift: true, key: 'i' }, // DevTools
        { ctrl: true, shift: true, key: 'j' }, // DevTools Console
        { ctrl: true, shift: true, key: 'c' }, // DevTools Elements
        { key: 'F12' }, // DevTools
        { key: 'F5' }, // Refresh
        { ctrl: true, key: 'r' }, // Refresh
        { ctrl: true, shift: true, key: 'r' }, // Hard refresh
        { alt: true, key: 'Tab' }, // Tab switch (may not work on all OS)
      ];

      const isBlocked = blockedShortcuts.some(shortcut => {
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const shiftMatch = shortcut.shift ? e.shiftKey : !shortcut.shift || !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : true;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        return ctrlMatch && shiftMatch && altMatch && keyMatch;
      });

      if (isBlocked) {
        e.preventDefault();
        e.stopPropagation();
        logEvent('keyboard_shortcut', `Scorciatoia bloccata: ${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.altKey ? 'Alt+' : ''}${e.key}`);
      }
    };

    // Beforeunload handler
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (mergedConfig.blockReload) {
        logEvent('page_reload_attempt', 'Lo studente ha tentato di abbandonare o ricaricare la pagina');
        e.preventDefault();
        e.returnValue = 'Sei sicuro di voler abbandonare la simulazione? I tuoi progressi potrebbero andare persi.';
        return e.returnValue;
      }
    };

    // DevTools detection (basic). Only meaningful on desktop: on mobile the
    // virtual keyboard and pinch-zoom shrink the inner viewport far past the
    // threshold, producing an endless stream of false positives. Log only on
    // the closed→open transition, not on every interval tick.
    let devToolsOpen = false;
    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = globalThis.outerWidth - globalThis.innerWidth > threshold;
      const heightThreshold = globalThis.outerHeight - globalThis.innerHeight > threshold;
      const open = widthThreshold || heightThreshold;

      if (open && !devToolsOpen) {
        logEvent('devtools_open', 'Possibile apertura degli strumenti per sviluppatori (DevTools)');
      }
      devToolsOpen = open;
    };

    // Add listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    globalThis.addEventListener('blur', handleBlur);
    globalThis.addEventListener('focus', handleFocus);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    globalThis.addEventListener('beforeunload', handleBeforeUnload);

    // Check devtools periodically (desktop only)
    const devToolsInterval = isTouch ? undefined : setInterval(detectDevTools, 1000);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      globalThis.removeEventListener('blur', handleBlur);
      globalThis.removeEventListener('focus', handleFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      globalThis.removeEventListener('beforeunload', handleBeforeUnload);
      if (devToolsInterval !== undefined) clearInterval(devToolsInterval);
    };
  }, [mergedConfig, logEvent, requestFullscreen]);

  // Manually clear a lingering blur state. Some mobile browsers (iOS Safari
  // returning from the app switcher) occasionally skip the `visibilitychange`
  // → visible / `focus` events, which would leave the warning overlay stuck
  // and block the exam. The event itself was already logged.
  const acknowledgeBlur = useCallback(() => {
    setState(prev => ({ ...prev, isBlurred: false }));
  }, []);

  // Get events for server sync
  const getEventsForSync = useCallback(() => {
    const events = [...eventsRef.current];
    eventsRef.current = [];
    return events;
  }, []);

  // Reset state
  const reset = useCallback(() => {
    eventsRef.current = [];
    violationCountRef.current = 0;
    lastEventAtRef.current.clear();
    setState({
      isFullscreen: false,
      violationCount: 0,
      events: [],
      isBlurred: false,
      lastViolation: null,
    });
  }, []);

  return {
    ...state,
    canEnforceFullscreen,
    requestFullscreen,
    exitFullscreen,
    acknowledgeBlur,
    getEventsForSync,
    reset,
    config: mergedConfig,
  };
}

export default useAntiCheat;
