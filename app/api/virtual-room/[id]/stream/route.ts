// Server-Sent Events endpoint for Virtual Room real-time updates
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { getAdminAuth } from '@/lib/firebase/admin';
import { getSessionState } from '@/server/services/virtualRoomState';

interface SSEConnection {
  controller: ReadableStreamDefaultController;
  participantIdForMessages?: string;
}

// Store active connections for broadcasting
const connections = new Map<string, Set<SSEConnection>>();

// Maximum connections per session (prevents resource exhaustion from bugs).
// It has to comfortably exceed a full classroom: every student holds one
// connection and the staff dashboard another, so a limit of 10 evicted real
// participants as soon as an eleventh joined, and each evicted client
// reconnected — turning a full room into a permanent reconnection churn.
const MAX_CONNECTIONS_PER_SESSION = 200;

/**
 * How often the session state is pushed. Nothing can change faster than this
 * anyway: participant progress reaches the database through a heartbeat the
 * students send every 3 seconds, so polling more often only multiplied the
 * database load without ever producing newer data.
 */
const REFRESH_INTERVAL_MS = 3000;

/**
 * A stream is closed deliberately a little before the platform's own ceiling.
 * Left alone it runs until Vercel kills the function, which logs a runtime
 * timeout error for every participant every five minutes: with one stream per
 * student that noise was burying the errors worth reading, and the forced kill
 * skips the cleanup that a deliberate close performs. The client reconnects on
 * its own either way.
 */
const STREAM_LIFETIME_MS = 240_000;

export const maxDuration = 300;

function addConnection(
  sessionId: string,
  controller: ReadableStreamDefaultController,
  participantIdForMessages?: string
) {
  if (!connections.has(sessionId)) {
    connections.set(sessionId, new Set());
  }
  
  const sessionConnections = connections.get(sessionId)!;
  
  // Check if we've hit the limit
  if (sessionConnections.size >= MAX_CONNECTIONS_PER_SESSION) {
    console.warn(
      `[SSE] Session ${sessionId} has ${sessionConnections.size} connections (limit: ${MAX_CONNECTIONS_PER_SESSION}). Closing oldest connection.`
    );
    
    // Close the oldest connection (first in set)
    const oldestConn = sessionConnections.values().next().value;
    if (oldestConn) {
      try {
        oldestConn.controller.close();
      } catch (err) {
        console.error('[SSE] Error closing oldest connection:', err);
      }
      sessionConnections.delete(oldestConn);
    }
  }
  
  sessionConnections.add({ controller, participantIdForMessages });
  console.log(`[SSE] Client connected to session ${sessionId}. Total: ${sessionConnections.size}`);
}

function removeConnection(sessionId: string, controller: ReadableStreamDefaultController) {
  const sessionConnections = connections.get(sessionId);
  if (sessionConnections) {
    for (const conn of sessionConnections) {
      if (conn.controller === controller) {
        sessionConnections.delete(conn);
        console.log(`[SSE] Client disconnected from session ${sessionId}. Remaining: ${sessionConnections.size}`);
        break;
      }
    }
    if (sessionConnections.size === 0) {
      connections.delete(sessionId);
      console.log(`[SSE] No more connections for session ${sessionId}, cleaning up`);
    }
  }
}

export function getConnectionCount(sessionId: string): number {
  return connections.get(sessionId)?.size || 0;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  const token =
    request.nextUrl.searchParams.get('token') ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  const participantIdForMessages =
    request.nextUrl.searchParams.get('participantId') || undefined;

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    await getAdminAuth().verifyIdToken(token);
  } catch {
    return new Response('Invalid token', { status: 401 });
  }

  const session = await prisma.simulationSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return new Response('Session not found', { status: 404 });
  }

  const encoder = new TextEncoder();
  let controllerRef: ReadableStreamDefaultController | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let refreshInterval: NodeJS.Timeout | null = null;
  let lifetimeTimeout: NodeJS.Timeout | null = null;

  function cleanup() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (refreshInterval) clearInterval(refreshInterval);
    if (lifetimeTimeout) clearTimeout(lifetimeTimeout);
    if (controllerRef) {
      removeConnection(sessionId, controllerRef);
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      controllerRef = controller;
      addConnection(sessionId, controller, participantIdForMessages);

      console.log(
        '[SSE] Client connected to session ' + sessionId + '. Total: ' + getConnectionCount(sessionId)
      );

      try {
        const initialData = await getSessionState(sessionId, participantIdForMessages);
        if (initialData) {
          const message = 'event: init\ndata: ' + JSON.stringify(initialData) + '\n\n';
          controller.enqueue(encoder.encode(message));
        }
      } catch (error) {
        console.error('[SSE] Error getting initial data:', error);
      }

      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          cleanup();
        }
      }, 15000);

      // Overlapping ticks are how a slow database becomes an unrecoverable one:
      // each tick would start another full state query while the previous one
      // is still running, piling on load exactly when it is already too high.
      let refreshInFlight = false;

      refreshInterval = setInterval(async () => {
        if (refreshInFlight) return;
        refreshInFlight = true;
        try {
          const data = await getSessionState(sessionId, participantIdForMessages);
          if (data) {
            const message = 'event: update\ndata: ' + JSON.stringify(data) + '\n\n';
            controller.enqueue(encoder.encode(message));
          }
        } catch {
          // Will retry next interval
        } finally {
          refreshInFlight = false;
        }
      }, REFRESH_INTERVAL_MS);

      lifetimeTimeout = setTimeout(() => {
        cleanup();
        try {
          controller.close();
        } catch {
          // Already closed by the client going away first
        }
      }, STREAM_LIFETIME_MS);

      request.signal.addEventListener('abort', () => {
        console.log('[SSE] Client disconnected from session ' + sessionId);
        cleanup();
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
