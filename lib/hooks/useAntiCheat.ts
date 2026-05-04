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
  maxViolations?: number;
  onMaxViolationsReached?: () => void;
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
  maxViolations: 5,
};

export function useAntiCheat(config: Partial<AntiCheatConfig> = {}) {
  const mergedConfig = useMemo(() => ({ ...defaultConfig, ...config }), [config]);
  
  const [state, setState] = useState<AntiCheatState>({
    isFullscreen: false,
    violationCount: 0,
    events: [],
    isBlurred: false,
    lastViolation: null,
  });

  const eventsRef = useRef<AntiCheatEvent[]>([]);
  const violationCountRef = useRef(0);

  // Log event
  const logEvent = useCallback((type: AntiCheatEvent['type'], details?: string) => {
    if (!mergedConfig.enabled) return;

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

    // Call violation callback
    mergedConfig.onViolation?.(event);

    // Check max violations
    if (
      mergedConfig.maxViolations &&
      violationCountRef.current >= mergedConfig.maxViolations
    ) {
      mergedConfig.onMaxViolationsReached?.();
    }
  }, [mergedConfig]);

  // Request fullscreen
  const requestFullscreen = useCallback(async () => {
    if (!mergedConfig.forceFullscreen) return;

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
      } else if ((document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
        await (document as Document & { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
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

    // Visibility change handler
    const handleVisibilityChange = () => {
      if (document.hidden && mergedConfig.blockTabSwitch) {
        logEvent('visibility_hidden', 'Lo studente ha cambiato scheda o finestra del browser');
        setState(prev => ({ ...prev, isBlurred: true }));
      } else {
        setState(prev => ({ ...prev, isBlurred: false }));
      }
    };

    // Window blur handler
    const handleBlur = () => {
      if (mergedConfig.blockTabSwitch) {
        logEvent('tab_blur', 'La finestra del browser ha perso il focus');
        setState(prev => ({ ...prev, isBlurred: true }));
      }
    };

    // Window focus handler
    const handleFocus = () => {
      setState(prev => ({ ...prev, isBlurred: false }));
    };

    // Fullscreen change handler
    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;
      setState(prev => ({ ...prev, isFullscreen }));
      
      if (!isFullscreen && mergedConfig.forceFullscreen) {
        logEvent('fullscreen_exit', 'Lo studente ha abbandonato la modalità schermo intero');
        // Re-request fullscreen after a short delay
        setTimeout(() => {
          requestFullscreen();
        }, 100);
      }
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

    // Right-click handler
    const handleContextMenu = (e: MouseEvent) => {
      if (mergedConfig.blockRightClick) {
        e.preventDefault();
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

    // DevTools detection (basic)
    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = globalThis.outerWidth - globalThis.innerWidth > threshold;
      const heightThreshold = globalThis.outerHeight - globalThis.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        logEvent('devtools_open', 'Possibile apertura degli strumenti per sviluppatori (DevTools)');
      }
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
    
    // Check devtools periodically
    const devToolsInterval = setInterval(detectDevTools, 1000);

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
      clearInterval(devToolsInterval);
    };
  }, [mergedConfig, logEvent, requestFullscreen]);

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
    requestFullscreen,
    exitFullscreen,
    getEventsForSync,
    reset,
    config: mergedConfig,
  };
}

export default useAntiCheat;
