/**
 * Rate Limiting Middleware
 * Protects against brute force attacks and DoS
 * Uses in-memory storage (suitable for single-server deployments)
 * For multi-server deployments, use Redis-based solution
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (reset on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMIT_CONFIG = {
  // Auth endpoints - stricter limits
  auth: {
    maxRequests: 5, // 5 requests
    windowMs: 60 * 1000, // per 1 minute
  },
  // Contact form - moderate limits
  contact: {
    maxRequests: 3, // 3 requests
    windowMs: 60 * 1000, // per 1 minute
  },
  // General API - relaxed limits
  api: {
    maxRequests: 100, // 100 requests
    windowMs: 60 * 1000, // per 1 minute
  },
  // Sensitive operations (password reset, etc)
  sensitive: {
    maxRequests: 3, // 3 requests
    windowMs: 5 * 60 * 1000, // per 5 minutes
  },
};

type RateLimitType = keyof typeof RATE_LIMIT_CONFIG;

/**
 * Clean up expired entries periodically
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param type - Type of rate limit to apply
 * @returns Object with allowed status and retry information
 */
export function checkRateLimit(
  identifier: string,
  type: RateLimitType = 'api'
): { allowed: boolean; remaining: number; retryAfterMs?: number } {
  const config = RATE_LIMIT_CONFIG[type];
  const key = `${type}:${identifier}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  // First request or expired window
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: entry.resetTime - now,
    };
  }

  // Increment count
  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count };
}

/**
 * Get client IP from request headers
 * Handles proxies (Vercel, Cloudflare, etc.)
 */
export function getClientIp(headers: Headers): string {
  // Check common proxy headers
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP (client IP)
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback
  return 'unknown';
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(
  remaining: number,
  limit: number,
  retryAfterMs?: number
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
  };

  if (retryAfterMs) {
    headers['Retry-After'] = String(Math.ceil(retryAfterMs / 1000));
    headers['X-RateLimit-Reset'] = String(Date.now() + retryAfterMs);
  }

  return headers;
}

/**
 * Rate limit error response
 */
export function rateLimitExceededResponse(retryAfterMs: number) {
  const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
  return {
    error: `Troppi tentativi. Riprova tra ${retryAfterSeconds} secondi.`,
    retryAfter: retryAfterSeconds,
  };
}
