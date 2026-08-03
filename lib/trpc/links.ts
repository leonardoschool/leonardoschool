// Transport configuration for the tRPC client.
//
// Kept out of the provider component on purpose: the rules below decide what
// shares an HTTP request with what and how long a request may hang, which is
// exactly the behaviour that has to be verifiable in a test rather than by
// reading a spinner in production.
import { httpBatchLink, httpLink, splitLink } from '@trpc/client';
import { transformer } from './transformer';
import { firebaseAuth } from '@/lib/firebase/auth';

/**
 * Ceiling on a single request. Without it a connection that stalls mid-flight
 * never settles — the browser's fetch has no timeout of its own — and a
 * mutation left pending forever freezes every piece of UI gated on it, with
 * nothing in the network tab to show for it.
 */
export const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Bulk operations legitimately run for minutes — importing a whole PDF of
 * questions is the usual one — so they get the platform's own ceiling instead
 * of the interactive one, which they would otherwise trip on every large file.
 */
export const SLOW_REQUEST_TIMEOUT_MS = 300_000;
const SLOW_PROCEDURE_PATTERN = /import|export|calibrat|bulk/i;

/**
 * Procedures that travel in an HTTP request of their own.
 *
 * Batching packs whatever calls happen to fire in the same tick into one
 * request, and that request only answers once *every* procedure in it has
 * finished. Submitting a simulation shares its moment with a heartbeat every
 * three seconds and an autosave every five, so a single slow co-passenger was
 * enough to hold back a submit that had already been written to the database:
 * the attempt was scored, the student saw a button spinning forever, and only
 * a reload revealed the test had gone through.
 */
export const UNBATCHED_PROCEDURES = new Set(['simulations.submit']);

/**
 * Ceiling on the Firebase token refresh. The cached ID token is only valid for
 * an hour, so past that mark every request has to wait on a network refresh
 * before it can even be built: a refresh that hangs would hold the request
 * hostage indefinitely. Going ahead without the header instead produces a
 * clean 401, which the pages that would sign a user out over it are expected
 * to retry before acting on.
 */
export const TOKEN_TIMEOUT_MS = 8_000;

export function shouldSkipBatching(path: string): boolean {
  return UNBATCHED_PROCEDURES.has(path);
}

/** The batched procedure names travel in the path, so the budget can follow
 *  what is actually being called. */
export function requestTimeoutMs(url: string): number {
  return SLOW_PROCEDURE_PATTERN.test(url) ? SLOW_REQUEST_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
}

export function timeoutSignal(
  url: string,
  existing: AbortSignal | null | undefined
): AbortSignal | undefined {
  if (typeof AbortSignal.timeout !== 'function') return existing ?? undefined;
  const timeout = AbortSignal.timeout(requestTimeoutMs(url));
  if (!existing) return timeout;
  return typeof AbortSignal.any === 'function' ? AbortSignal.any([existing, timeout]) : existing;
}

export async function getIdTokenWithTimeout(): Promise<string | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), TOKEN_TIMEOUT_MS);
    const settle = (token: string | null) => {
      clearTimeout(timer);
      resolve(token);
    };
    firebaseAuth.getIdToken().then(settle, () => settle(null));
  });
}

export function trpcEndpointUrl(): string {
  return typeof window !== 'undefined'
    ? `${window.location.origin}/api/trpc`
    : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/trpc`;
}

export function createTrpcLinks() {
  const linkOptions = {
    url: trpcEndpointUrl(),
    // Transformer must match server config for proper serialization
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transformer: transformer as any,
    fetch(url: RequestInfo | URL, options?: RequestInit) {
      return fetch(url, {
        ...options,
        signal: timeoutSignal(String(url), options?.signal),
      });
    },
    // Add Firebase token to all requests
    async headers() {
      const freshToken = await getIdTokenWithTimeout();
      if (freshToken) {
        return {
          authorization: `Bearer ${freshToken}`,
        };
      }

      // No token available - request will proceed without auth
      return {};
    },
  };

  return [
    splitLink({
      condition: (op) => shouldSkipBatching(op.path),
      true: httpLink(linkOptions),
      false: httpBatchLink(linkOptions),
    }),
  ];
}
