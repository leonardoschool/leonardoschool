/**
 * Transport-level tests for the tRPC client.
 *
 * These assert the thing that actually broke a live exam: a submit sharing an
 * HTTP request with unrelated calls answers only when the slowest of them
 * does, so a submit already written to the database could never reach the
 * student. Type checks and router unit tests cannot see any of this — it only
 * shows up in how requests are put on the wire.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTRPCUntypedClient } from '@trpc/client';

vi.mock('@/lib/firebase/auth', () => ({
  firebaseAuth: {
    getIdToken: vi.fn().mockResolvedValue('test-token'),
  },
}));

import { createTrpcLinks, shouldSkipBatching, requestTimeoutMs, REQUEST_TIMEOUT_MS, SLOW_REQUEST_TIMEOUT_MS } from '@/lib/trpc/links';

/** One captured outgoing HTTP request */
interface CapturedRequest {
  url: string;
  body: string | null;
  resolve: (value: unknown) => void;
}

/**
 * A successful tRPC envelope. A batched request answers with an array, an
 * unbatched one with a bare object — the difference is itself part of what
 * these tests are checking.
 */
function trpcOkBody(count: number, batched: boolean) {
  const one = { result: { data: { json: null } } };
  return JSON.stringify(batched ? Array.from({ length: count }, () => one) : one);
}

describe('tRPC transport', () => {
  let captured: CapturedRequest[];
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    captured = [];
    fetchMock = vi.fn((url: RequestInfo | URL, options?: RequestInit) => {
      return new Promise((resolve) => {
        captured.push({
          url: String(url),
          body: typeof options?.body === 'string' ? options.body : null,
          resolve: (value: unknown) => resolve(value),
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Answers a captured request with as many successful results as it carried */
  function answer(request: CapturedRequest, resultCount: number) {
    request.resolve(
      new Response(trpcOkBody(resultCount, request.url.includes('batch=1')), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
  }

  it('sends the submit in an HTTP request of its own', async () => {
    const client = createTRPCUntypedClient({ links: createTrpcLinks() });

    const submit = client.mutation('simulations.submit', { simulationId: 'sim-1' });
    const heartbeat = client.mutation('virtualRoom.heartbeat', { participantId: 'p-1' });

    await vi.waitFor(() => expect(captured).toHaveLength(2));

    const submitRequest = captured.find((r) => r.url.includes('simulations.submit'));
    const heartbeatRequest = captured.find((r) => r.url.includes('virtualRoom.heartbeat'));

    expect(submitRequest).toBeDefined();
    expect(heartbeatRequest).toBeDefined();
    // The whole point: the submit must not carry a passenger
    expect(submitRequest!.url).not.toContain('virtualRoom.heartbeat');
    expect(submitRequest!.url).not.toContain('batch=1');

    answer(submitRequest!, 1);
    answer(heartbeatRequest!, 1);
    await Promise.all([submit, heartbeat]);
  });

  it('does not let a stalled neighbour hold back the submit', async () => {
    const client = createTRPCUntypedClient({ links: createTrpcLinks() });

    let submitSettled = false;
    const submit = client
      .mutation('simulations.submit', { simulationId: 'sim-1' })
      .then(() => { submitSettled = true; });
    // The neighbour never answers, exactly like the slow co-passenger in production
    const stalled = client.mutation('virtualRoom.heartbeat', { participantId: 'p-1' });

    await vi.waitFor(() => expect(captured).toHaveLength(2));
    answer(captured.find((r) => r.url.includes('simulations.submit'))!, 1);

    await submit;
    expect(submitSettled).toBe(true);
    expect(stalled).toBeInstanceOf(Promise);
  });

  it('still batches everything else into a single request', async () => {
    const client = createTRPCUntypedClient({ links: createTrpcLinks() });

    const a = client.query('notifications.getNotifications', undefined);
    const b = client.query('simulations.getSimulationForStudent', { id: 'sim-1' });

    await vi.waitFor(() => expect(captured).toHaveLength(1));
    expect(captured[0].url).toContain('notifications.getNotifications');
    expect(captured[0].url).toContain('simulations.getSimulationForStudent');

    answer(captured[0], 2);
    await Promise.all([a, b]);
  });

  it('routes only the submit away from the batch', () => {
    expect(shouldSkipBatching('simulations.submit')).toBe(true);
    expect(shouldSkipBatching('simulations.saveProgress')).toBe(false);
    expect(shouldSkipBatching('virtualRoom.heartbeat')).toBe(false);
    expect(shouldSkipBatching('auth.me')).toBe(false);
  });

  it('gives bulk operations a longer budget than interactive ones', () => {
    expect(requestTimeoutMs('/api/trpc/simulations.submit')).toBe(REQUEST_TIMEOUT_MS);
    expect(requestTimeoutMs('/api/trpc/virtualRoom.heartbeat')).toBe(REQUEST_TIMEOUT_MS);
    // A whole PDF of questions legitimately runs for minutes
    expect(requestTimeoutMs('/api/trpc/questions.importQuestions')).toBe(SLOW_REQUEST_TIMEOUT_MS);
  });

  it('aborts a request that never answers, instead of hanging forever', async () => {
    // AbortSignal.timeout runs on a platform timer that fake timers cannot
    // drive, so the deadline is stood in for by a controller that fires on
    // demand. What is under test is the wiring — that the signal reaches fetch
    // and that tripping it rejects the call — not the platform's own clock.
    const deadlines: number[] = [];
    const controller = new AbortController();
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms: number) => {
      deadlines.push(ms);
      return controller.signal;
    });

    try {
      const signals: (AbortSignal | undefined)[] = [];
      fetchMock.mockImplementation((_url: RequestInfo | URL, options?: RequestInit) => {
        signals.push(options?.signal ?? undefined);
        return new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        });
      });

      const client = createTRPCUntypedClient({ links: createTrpcLinks() });
      const outcome = client
        .mutation('simulations.submit', { simulationId: 'sim-1' })
        .then(() => 'resolved')
        .catch(() => 'rejected');

      await vi.waitFor(() => expect(signals).toHaveLength(1));
      expect(deadlines).toContain(REQUEST_TIMEOUT_MS);
      expect(signals[0]?.aborted).toBe(false);

      controller.abort();

      expect(signals[0]?.aborted).toBe(true);
      await expect(outcome).resolves.toBe('rejected');
    } finally {
      timeoutSpy.mockRestore();
    }
  });
});
