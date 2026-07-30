// Centralized application logging. Every unexpected error across the platform (tRPC
// procedures, API routes, email delivery, cron jobs…) is persisted to the ApplicationLog
// table so it can be inspected from the admin "Log Errori" page. Vercel's runtime logs
// have a short retention without a Pro plan, so the DB is the only reliable error history.
import { prisma } from '@/lib/prisma/client';
import { getRequestContext } from '@/lib/utils/requestContext';
import type { Prisma } from '@prisma/client';

export type LogSource = 'TRPC' | 'API' | 'AUTH' | 'EMAIL' | 'SIMULATION' | 'CRON' | 'SYSTEM';
export type LogLevelInput = 'ERROR' | 'WARN' | 'INFO';

interface LogInput {
  source: LogSource;
  message: string;
  level?: LogLevelInput;
  /** The thrown value; its message/stack are extracted automatically. */
  error?: unknown;
  path?: string;
  method?: string;
  statusCode?: number;
  metadata?: Prisma.InputJsonValue;
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

// Firestore/DB text columns can grow unbounded from a runaway stack; cap defensively.
const MAX_MESSAGE = 5000;
const MAX_STACK = 12000;

function extractMessage(input: LogInput): string {
  if (input.message) return input.message;
  if (input.error instanceof Error) return input.error.message;
  return String(input.error ?? 'Errore sconosciuto');
}

/**
 * The cause behind the log line, stored in `stack`.
 *
 * A thrown Error carries a stack, but plenty of callers only have a string —
 * the email transports, for instance, report SMTP failures as text. Reading the
 * stack off `Error` instances alone silently discarded those, so the log
 * recorded THAT an email had failed and never WHY.
 */
function extractDetail(input: LogInput): string | null {
  if (input.error instanceof Error) {
    return input.error.stack ?? input.error.message ?? null;
  }
  if (input.error === undefined || input.error === null) return null;

  let detail: string;
  if (typeof input.error === 'string') {
    detail = input.error;
  } else {
    try {
      detail = JSON.stringify(input.error);
    } catch {
      // Circular or otherwise unserializable: a rough description beats nothing
      detail = String(input.error);
    }
  }

  // A cause identical to the title adds nothing but noise in the detail panel
  return detail.length > 0 && detail !== input.message ? detail : null;
}

/**
 * Persist a log entry. NEVER throws — a failure to log must not break the caller's flow.
 * Missing fields are auto-filled from the current request context (userId, path, ip…).
 */
export async function logApp(input: LogInput): Promise<void> {
  try {
    const ctx = getRequestContext();
    const stack = extractDetail(input);

    await prisma.applicationLog.create({
      data: {
        level: input.level ?? 'ERROR',
        source: input.source,
        path: input.path ?? ctx?.path ?? null,
        method: input.method ?? ctx?.method ?? null,
        statusCode: input.statusCode ?? null,
        message: extractMessage(input).slice(0, MAX_MESSAGE),
        stack: stack ? stack.slice(0, MAX_STACK) : null,
        userId: input.userId ?? ctx?.userId ?? null,
        userRole: input.userRole ?? ctx?.userRole ?? null,
        userEmail: input.userEmail ?? null,
        requestId: ctx?.requestId ?? null,
        ip: ctx?.ip ?? null,
        userAgent: ctx?.userAgent ?? null,
        metadata: input.metadata,
      },
    });
  } catch (err) {
    // Last-resort fallback: at least surface it in the runtime logs.
    console.error('[appLog] Failed to persist application log:', err);
  }
}

/** Convenience wrapper for the most common case. */
export const logAppError = (input: Omit<LogInput, 'level'>): Promise<void> =>
  logApp({ ...input, level: 'ERROR' });
