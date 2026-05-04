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

// Maximum connections per session (prevents resource exhaustion from bugs)
const MAX_CONNECTIONS_PER_SESSION = 10;

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

  function cleanup() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (refreshInterval) clearInterval(refreshInterval);
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

      refreshInterval = setInterval(async () => {
        try {
          const data = await getSessionState(sessionId, participantIdForMessages);
          if (data) {
            const message = 'event: update\ndata: ' + JSON.stringify(data) + '\n\n';
            controller.enqueue(encoder.encode(message));
          }
        } catch {
          // Will retry next interval
        }
      }, 1000);

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
