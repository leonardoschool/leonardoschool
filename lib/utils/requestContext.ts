/**
 * Request Context - Thread-local storage per request tracking
 * Similar to Spring Boot's MDC (Mapped Diagnostic Context)
 * 
 * Uses AsyncLocalStorage to maintain request-scoped context across async operations
 */

import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface RequestContext {
  requestId: string;
  userId?: string;
  userRole?: string;
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  startTime: number;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Generate a unique request ID
 */
export const generateRequestId = (): string => {
  return randomUUID();
};

/**
 * Initialize request context (call at request start)
 */
export const initRequestContext = (context: Partial<RequestContext>): RequestContext => {
  const ctx: RequestContext = {
    requestId: context.requestId || generateRequestId(),
    userId: context.userId,
    userRole: context.userRole,
    path: context.path,
    method: context.method,
    ip: context.ip,
    userAgent: context.userAgent,
    startTime: Date.now(),
  };
  return ctx;
};

/**
 * Run a function with request context
 */
export const runWithContext = <T>(context: RequestContext, fn: () => T): T => {
  return asyncLocalStorage.run(context, fn);
};

/**
 * Get current request context
 */
export const getRequestContext = (): RequestContext | undefined => {
  return asyncLocalStorage.getStore();
};

/**
 * Get current request ID
 */
export const getRequestId = (): string | undefined => {
  return asyncLocalStorage.getStore()?.requestId;
};

/**
 * Get request duration in milliseconds
 */
export const getRequestDuration = (): number | undefined => {
  const ctx = asyncLocalStorage.getStore();
  return ctx ? Date.now() - ctx.startTime : undefined;
};

/**
 * Update request context (partial update)
 */
export const updateRequestContext = (updates: Partial<RequestContext>): void => {
  const ctx = asyncLocalStorage.getStore();
  if (ctx) {
    Object.assign(ctx, updates);
  }
};
