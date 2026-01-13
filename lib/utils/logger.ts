/**
 * Centralized logging utility with request tracking
 * 
 * Features:
 * - Request ID tracking (like Spring Boot's MDC)
 * - Structured logging with timestamps
 * - Environment-aware log levels
 * - Namespace support for different modules
 * 
 * Only logs in development unless ENABLE_PROD_LOGS=true
 * Use this instead of console.log throughout the codebase
 */

import { getRequestId } from './requestContext';

const isDev = process.env.NODE_ENV === 'development';
const enableProdLogs = process.env.ENABLE_PROD_LOGS === 'true';
const enableVerbose = process.env.LOG_VERBOSE === 'true';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  /** Debug logs - only in dev with LOG_VERBOSE=true */
  debug: (...args: unknown[]) => void;
  /** Info logs - only in dev */
  info: (...args: unknown[]) => void;
  /** Warning logs - always shown */
  warn: (...args: unknown[]) => void;
  /** Error logs - always shown */
  error: (...args: unknown[]) => void;
}

const shouldLog = (level: LogLevel): boolean => {
  // Errors and warnings always logged
  if (level === 'error' || level === 'warn') return true;
  
  // In production, only log if explicitly enabled
  if (!isDev && !enableProdLogs) return false;
  
  // Debug requires verbose flag
  if (level === 'debug' && !enableVerbose) return false;
  
  return true;
};

/**
 * Format log prefix with timestamp, request ID, and namespace
 * Example: [12:34:56.789] [req:abc123] [VirtualRoom]
 */
const formatPrefix = (namespace?: string): string => {
  const timestamp = new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS
  const requestId = getRequestId();
  
  let prefix = `[${timestamp}]`;
  
  // Add request ID if available (for tracing)
  if (requestId) {
    prefix += ` [req:${requestId.slice(0, 8)}]`; // First 8 chars of UUID
  }
  
  // Add namespace
  if (namespace) {
    prefix += ` [${namespace}]`;
  }
  
  return prefix;
};

/**
 * Create a namespaced logger
 * @param namespace - Prefix for log messages (e.g., 'VirtualRoom', 'Simulations')
 */
export const createLogger = (namespace: string): Logger => ({
  debug: (...args: unknown[]) => {
    if (shouldLog('debug')) {
      console.log(formatPrefix(namespace), ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (shouldLog('info')) {
      console.log(formatPrefix(namespace), ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (shouldLog('warn')) {
      console.warn(formatPrefix(namespace), ...args);
    }
  },
  error: (...args: unknown[]) => {
    if (shouldLog('error')) {
      console.error(formatPrefix(namespace), ...args);
    }
  },
});

// Default logger without namespace
export const logger: Logger = {
  debug: (...args: unknown[]) => {
    if (shouldLog('debug')) {
      console.log(formatPrefix(), ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (shouldLog('info')) {
      console.log(formatPrefix(), ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (shouldLog('warn')) {
      console.warn(formatPrefix(), ...args);
    }
  },
  error: (...args: unknown[]) => {
    if (shouldLog('error')) {
      console.error(formatPrefix(), ...args);
    }
  },
};

export default logger;
