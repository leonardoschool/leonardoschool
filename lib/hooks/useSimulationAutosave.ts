'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { progressFingerprint, type SimulationProgressSnapshot } from '@/lib/utils/simulationProgress';

const TICK_MS = 1000;
/** Quiet period after the last change before syncing, so a burst becomes one write */
const DEBOUNCE_MS = 5000;
/** Even with nothing changed, refresh the stored elapsed time this often */
const HEARTBEAT_MS = 120_000;
const RETRY_BASE_MS = 5000;
const RETRY_MAX_MS = 30_000;
/** Failures tolerated before the UI admits the connection is gone */
const FAILURES_BEFORE_OFFLINE = 2;

export interface UseSimulationAutosaveOptions {
  /** Attempt being saved; null until startAttempt resolves */
  resultId: string | null;
  enabled: boolean;
  /** Suspended while a submit is in flight */
  paused: boolean;
  /** Revision to continue from, so a resumed attempt never reuses a stored number */
  baseRev: number;
  /** Reads the live state; called on every tick, so it must be cheap and ref-based */
  buildSnapshot: () => Omit<SimulationProgressSnapshot, 'rev' | 'updatedAt'>;
  /** Mirrors a snapshot to local storage — must be synchronous and never throw */
  persistLocal: (snapshot: SimulationProgressSnapshot) => void;
  /** Sends a snapshot to the server; rejects on failure */
  persistRemote: (snapshot: SimulationProgressSnapshot) => Promise<unknown>;
  /** Fire-and-forget send used while the page is unloading (sendBeacon) */
  persistOnUnload: (snapshot: SimulationProgressSnapshot) => void;
}

export interface UseSimulationAutosaveResult {
  /** True when the connection is gone: drives the student-facing badge */
  isOffline: boolean;
  /** Force an immediate sync (section change, manual save) */
  flushNow: () => void;
}

/**
 * Keeps an in-progress attempt safe on two levels: a local snapshot that survives
 * a connection loss, a crash or a reload, and a debounced server sync that retries
 * on its own and skips writes when nothing has actually changed.
 *
 * Change detection polls once a second rather than hooking every answer handler:
 * the component's state already lives behind refs for the existing timers, and a
 * single fingerprint comparison keeps the wiring in one place.
 */
export function useSimulationAutosave(options: UseSimulationAutosaveOptions): UseSimulationAutosaveResult {
  const [isOffline, setIsOffline] = useState(false);

  // Options change identity on every render; the tick reads them from a ref so
  // the interval is registered once per attempt instead of once per render
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const revRef = useRef(0);
  const lastFingerprintRef = useRef<string | null>(null);
  const lastChangeAtRef = useRef(0);
  const lastSyncedRevRef = useRef(0);
  const lastRemoteSaveAtRef = useRef(0);
  const inFlightRef = useRef(false);
  const failureCountRef = useRef(0);
  const nextRetryAtRef = useRef(0);
  const latestSnapshotRef = useRef<SimulationProgressSnapshot | null>(null);
  const initializedRef = useRef(false);

  // A resumed attempt must continue above whatever revision is already stored
  useEffect(() => {
    if (options.baseRev > revRef.current) {
      revRef.current = options.baseRev;
      lastSyncedRevRef.current = options.baseRev;
    }
  }, [options.baseRev]);

  /** Capture the current state, bumping the revision only on a real change. */
  const captureSnapshot = useCallback((): void => {
    const { buildSnapshot, persistLocal } = optionsRef.current;
    const base = buildSnapshot();
    const fingerprint = progressFingerprint(base.items, base.currentQuestionIndex, base.currentSectionIndex);

    // The very first capture only establishes the baseline: the state restored
    // from the server is not a change and must not trigger a write
    const isFirstCapture = !initializedRef.current;
    initializedRef.current = true;
    const changed = !isFirstCapture && fingerprint !== lastFingerprintRef.current;

    if (isFirstCapture) {
      lastFingerprintRef.current = fingerprint;
    }

    if (changed) {
      lastFingerprintRef.current = fingerprint;
      lastChangeAtRef.current = Date.now();
      revRef.current += 1;
    }

    const snapshot: SimulationProgressSnapshot = {
      ...base,
      rev: revRef.current,
      updatedAt: Date.now(),
    };
    latestSnapshotRef.current = snapshot;

    // The local copy is the only one that survives with no connection, so it is
    // written on every change regardless of what the server sync is doing
    if (changed) {
      persistLocal(snapshot);
    }
  }, []);

  const syncToServer = useCallback((snapshot: SimulationProgressSnapshot) => {
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    const revBeingSent = snapshot.rev;

    optionsRef.current
      .persistRemote(snapshot)
      .then(() => {
        failureCountRef.current = 0;
        nextRetryAtRef.current = 0;
        lastRemoteSaveAtRef.current = Date.now();
        lastSyncedRevRef.current = revBeingSent;
        setIsOffline(false);
      })
      .catch(() => {
        failureCountRef.current += 1;
        const backoff = Math.min(RETRY_BASE_MS * 2 ** (failureCountRef.current - 1), RETRY_MAX_MS);
        nextRetryAtRef.current = Date.now() + backoff;
        if (failureCountRef.current >= FAILURES_BEFORE_OFFLINE) {
          setIsOffline(true);
        }
      })
      .finally(() => {
        inFlightRef.current = false;
      });
  }, []);

  const flushNow = useCallback(() => {
    const { enabled, paused, resultId } = optionsRef.current;
    if (!enabled || paused || !resultId) return;

    captureSnapshot();
    const snapshot = latestSnapshotRef.current;
    if (!snapshot || snapshot.rev <= lastSyncedRevRef.current) return;

    nextRetryAtRef.current = 0;
    syncToServer(snapshot);
  }, [captureSnapshot, syncToServer]);

  // Main loop: detect changes, then decide whether the server is due a write
  useEffect(() => {
    if (!options.enabled || !options.resultId) return;

    // Start the heartbeat window now, so resuming an attempt doesn't fire a
    // redundant write on the very first tick
    lastRemoteSaveAtRef.current = Date.now();
    // A different attempt needs its own baseline, otherwise the state restored
    // for it would be diffed against the previous attempt's fingerprint
    initializedRef.current = false;
    lastFingerprintRef.current = null;

    const interval = setInterval(() => {
      const { paused } = optionsRef.current;
      if (paused) return;

      captureSnapshot();
      const snapshot = latestSnapshotRef.current;
      if (!snapshot) return;

      const now = Date.now();
      const isDirty = snapshot.rev > lastSyncedRevRef.current;

      // Offline: keep updating the local copy and stop burning retries
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setIsOffline(true);
        return;
      }

      if (now < nextRetryAtRef.current) return;

      if (isDirty) {
        if (now - lastChangeAtRef.current >= DEBOUNCE_MS) {
          syncToServer(snapshot);
        }
        return;
      }

      // Nothing changed, but the stored elapsed time would otherwise go stale
      if (now - lastRemoteSaveAtRef.current >= HEARTBEAT_MS) {
        syncToServer(snapshot);
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [options.enabled, options.resultId, captureSnapshot, syncToServer]);

  // Regaining the connection should not wait for the retry backoff to elapse
  useEffect(() => {
    if (!options.enabled) return;

    const handleOnline = () => {
      failureCountRef.current = 0;
      nextRetryAtRef.current = 0;
      setIsOffline(false);
      flushNow();
    };
    const handleOffline = () => setIsOffline(true);

    globalThis.addEventListener('online', handleOnline);
    globalThis.addEventListener('offline', handleOffline);
    return () => {
      globalThis.removeEventListener('online', handleOnline);
      globalThis.removeEventListener('offline', handleOffline);
    };
  }, [options.enabled, flushNow]);

  // Last chance to persist: the tick may not fire again before the page dies
  useEffect(() => {
    if (!options.enabled || !options.resultId) return;

    const flushOnExit = () => {
      const { paused, persistOnUnload, persistLocal } = optionsRef.current;
      if (paused) return;

      captureSnapshot();
      const snapshot = latestSnapshotRef.current;
      if (!snapshot) return;

      // The local write is synchronous and always lands, even with no network
      persistLocal(snapshot);
      persistOnUnload(snapshot);
    };

    globalThis.addEventListener('pagehide', flushOnExit);
    return () => {
      globalThis.removeEventListener('pagehide', flushOnExit);
      flushOnExit();
    };
  }, [options.enabled, options.resultId, captureSnapshot]);

  return { isOffline, flushNow };
}
