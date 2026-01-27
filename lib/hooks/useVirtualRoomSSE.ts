// Hook for Server-Sent Events connection to Virtual Room
import { useEffect, useRef, useState, useCallback } from 'react';
import { firebaseAuth } from '@/lib/firebase/auth';

// Re-export types that match the server's SessionStateData
export interface VirtualRoomParticipant {
  id: string;
  studentId: string;
  studentName: string;
  isConnected: boolean;
  isReady: boolean;
  isKicked: boolean;
  kickedReason?: string | null;
  kickedAt?: string | null;
  readyAt?: string | null;
  lastHeartbeat?: string | null;
  joinedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  currentQuestionIndex: number;
  answeredCount: number;
  cheatingEventsCount: number;
  recentCheatingEvents: Array<{
    id: string;
    eventType: string;
    createdAt: string;
  }>;
  unreadMessagesCount: number;
  result?: {
    totalScore: number;
    correctAnswers: number;
    wrongAnswers: number;
    blankAnswers: number;
  } | null;
}

export interface VirtualRoomMessage {
  id: string;
  senderType: 'ADMIN' | 'STUDENT';
  message: string;
  createdAt: string;
  isRead: boolean;
}

export interface VirtualRoomData {
  session: {
    id: string;
    status: string;
    scheduledStartAt?: string | null;
    actualStartAt?: string | null;
    endedAt?: string | null;
  };
  simulation: {
    id: string;
    title: string;
    durationMinutes: number;
    totalQuestions: number;
  };
  participants: VirtualRoomParticipant[];
  invitedStudents: Array<{
    id: string;
    userId: string;
    name: string;
    email: string;
  }>;
  connectedCount: number;
  totalInvited: number;
  timeRemaining: number | null;
  messages?: VirtualRoomMessage[];
}

interface UseVirtualRoomSSEOptions {
  sessionId: string | null;
  participantId?: string | null;
  enabled?: boolean;
  onMessage?: (data: VirtualRoomData) => void;
  onError?: (error: Error) => void;
}

export function useVirtualRoomSSE({
  sessionId,
  participantId,
  enabled = true,
  onMessage,
  onError,
}: UseVirtualRoomSSEOptions) {
  const [data, setData] = useState<VirtualRoomData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const connectRef = useRef<(() => Promise<void>) | null>(null);
  
  // CRITICAL FIX: Use refs for callbacks to prevent dependency changes causing reconnections
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  
  // Update refs when callbacks change (without triggering reconnection)
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);
  
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const connect = useCallback(async () => {
    if (!sessionId || !enabled) return;

    // Get fresh token
    let token: string | null = null;
    try {
      token = await firebaseAuth.getIdToken();
    } catch {
      console.error('[SSE] Failed to get auth token');
      return;
    }

    if (!token) {
      console.error('[SSE] No auth token available');
      return;
    }

    // Build URL with query params
    const url = new URL(`/api/virtual-room/${sessionId}/stream`, globalThis.location.origin);
    url.searchParams.set('token', token);
    if (participantId) {
      url.searchParams.set('participantId', participantId);
    }

    // Close existing connection BEFORE creating new one (prevents leak)
    if (eventSourceRef.current) {
      console.log('[SSE] Closing existing connection before reconnect');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    console.log('[SSE] Connecting to', url.pathname, participantId ? `(participant: ${participantId})` : '(all)');
    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[SSE] Connected');
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
    };

    // Handle init event (first data) - use ref to avoid dependency issues
    eventSource.addEventListener('init', (event) => {
      try {
        const parsed = JSON.parse(event.data) as VirtualRoomData;
        setData(parsed);
        onMessageRef.current?.(parsed);
      } catch (e) {
        console.error('[SSE] Failed to parse init data', e);
      }
    });

    // Handle update events - use ref to avoid dependency issues
    eventSource.addEventListener('update', (event) => {
      try {
        const parsed = JSON.parse(event.data) as VirtualRoomData;
        setData(parsed);
        onMessageRef.current?.(parsed);
      } catch (e) {
        console.error('[SSE] Failed to parse update data', e);
      }
    });

    // Handle message event (new message notification) - use ref to avoid dependency issues
    eventSource.addEventListener('message', (event) => {
      try {
        const parsed = JSON.parse(event.data) as VirtualRoomData;
        setData(parsed);
        onMessageRef.current?.(parsed);
      } catch (e) {
        console.error('[SSE] Failed to parse message data', e);
      }
    });

    eventSource.onerror = (e) => {
      console.error('[SSE] Connection error', e);
      setIsConnected(false);
      
      // Check if we're being cleaned up or if connection was manually closed
      if (eventSource.readyState === EventSource.CLOSED) {
        console.log('[SSE] Connection closed permanently, not reconnecting');
        return;
      }
      
      eventSource.close();

      // Reconnect with exponential backoff
      const attempts = reconnectAttemptsRef.current;
      const delay = Math.min(1000 * Math.pow(2, attempts), 30000); // Max 30 seconds
      
      console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${attempts + 1})`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptsRef.current++;
        connectRef.current?.();
      }, delay);

      const err = new Error('SSE connection error');
      setError(err);
      onErrorRef.current?.(err);
    };
  }, [sessionId, participantId, enabled]); // Removed onMessage and onError from dependencies

  // Keep connectRef updated
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Connect on mount and when dependencies change
  useEffect(() => {
    if (!enabled || !sessionId) {
      console.log('[SSE] Not connecting: enabled =', enabled, 'sessionId =', sessionId);
      return;
    }

    console.log('[SSE] Initiating connection for session:', sessionId);
    connect();

    // Cleanup function - CRITICAL for preventing connection leaks
    return () => {
      console.log('[SSE] Cleanup: closing connection for session:', sessionId);
      
      // Clear any pending reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Close the EventSource connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      setIsConnected(false);
      setData(null);
    };
  }, [connect, enabled, sessionId]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  return {
    data,
    isConnected,
    error,
    reconnect,
  };
}
