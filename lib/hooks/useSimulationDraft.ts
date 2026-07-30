'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { SimulationProgressSnapshot } from '@/lib/utils/simulationProgress';

// Bumping this invalidates every stored draft at once, should the shape change
const DRAFT_KEY_PREFIX = 'sim-draft-v1:';
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const WRITE_THROTTLE_MS = 1000;

function draftKey(resultId: string): string {
  return `${DRAFT_KEY_PREFIX}${resultId}`;
}

/**
 * Every access is guarded: localStorage throws on quota overflow and is entirely
 * unavailable in some privacy modes. A failure to keep the safety net must never
 * take down the simulation the student is sitting.
 */
function safeStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readDraft(resultId: string): SimulationProgressSnapshot | null {
  const storage = safeStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(draftKey(resultId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SimulationProgressSnapshot;
    if (!Array.isArray(parsed?.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDraft(resultId: string, snapshot: SimulationProgressSnapshot): void {
  const storage = safeStorage();
  if (!storage) return;

  try {
    storage.setItem(draftKey(resultId), JSON.stringify(snapshot));
  } catch {
    // Quota exceeded or storage disabled: the server autosave remains the fallback
  }
}

function clearDraft(resultId: string): void {
  const storage = safeStorage();
  if (!storage) return;

  try {
    storage.removeItem(draftKey(resultId));
  } catch {
    // Nothing to do — a leftover draft expires on its own
  }
}

/**
 * Drop drafts left behind by attempts that were never submitted (browser closed
 * for good, student switched device), so storage doesn't grow without bound.
 */
function purgeStaleDrafts(now: number): void {
  const storage = safeStorage();
  if (!storage) return;

  try {
    const staleKeys: string[] = [];

    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (!key?.startsWith(DRAFT_KEY_PREFIX)) continue;

      let updatedAt = 0;
      try {
        updatedAt = (JSON.parse(storage.getItem(key) ?? '{}') as SimulationProgressSnapshot)?.updatedAt ?? 0;
      } catch {
        // Unparseable entry: treat as stale
      }

      if (now - updatedAt > DRAFT_MAX_AGE_MS) {
        staleKeys.push(key);
      }
    }

    staleKeys.forEach((key) => storage.removeItem(key));
  } catch {
    // Enumeration failed: not worth interrupting the simulation over
  }
}

export interface UseSimulationDraftResult {
  /** Read the draft stored for an attempt, if any */
  readDraft: (resultId: string) => SimulationProgressSnapshot | null;
  /** Persist a snapshot locally; throttled, with `immediate` to force a write */
  saveDraft: (resultId: string, snapshot: SimulationProgressSnapshot, immediate?: boolean) => void;
  /** Remove the draft once the attempt is safely submitted */
  clearDraft: (resultId: string) => void;
}

/**
 * Local safety net for an in-progress attempt. Unlike the server autosave, this
 * keeps working with no connection at all, so a student who goes offline and then
 * reloads still finds every answer they entered.
 */
export function useSimulationDraft(): UseSimulationDraftResult {
  const lastWriteAtRef = useRef<number>(0);
  const pendingRef = useRef<{ resultId: string; snapshot: SimulationProgressSnapshot } | null>(null);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    purgeStaleDrafts(Date.now());
  }, []);

  const flushPending = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;

    pendingRef.current = null;
    lastWriteAtRef.current = Date.now();
    writeDraft(pending.resultId, pending.snapshot);
  }, []);

  const saveDraft = useCallback(
    (resultId: string, snapshot: SimulationProgressSnapshot, immediate = false) => {
      if (!resultId) return;

      pendingRef.current = { resultId, snapshot };

      const elapsed = Date.now() - lastWriteAtRef.current;
      if (immediate || elapsed >= WRITE_THROTTLE_MS) {
        if (throttleTimerRef.current) {
          clearTimeout(throttleTimerRef.current);
          throttleTimerRef.current = null;
        }
        flushPending();
        return;
      }

      // Coalesce bursts (typing in an open answer) into one write per second
      if (!throttleTimerRef.current) {
        throttleTimerRef.current = setTimeout(() => {
          throttleTimerRef.current = null;
          flushPending();
        }, WRITE_THROTTLE_MS - elapsed);
      }
    },
    [flushPending]
  );

  useEffect(() => {
    return () => {
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      // Never discard a coalesced write on unmount: it may hold the newest answers
      flushPending();
    };
  }, [flushPending]);

  return { readDraft, saveDraft, clearDraft };
}
