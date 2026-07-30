/**
 * What actually gets persisted for an application error.
 *
 * The `stack` column is the only place the *cause* is recorded. It used to be
 * filled only from `Error` instances, so every caller that reports a string —
 * the email transports being the notable one — logged that something failed
 * without ever recording why.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const create = vi.fn().mockResolvedValue({});

vi.mock('@/lib/prisma/client', () => ({
  prisma: { applicationLog: { create } },
}));

vi.mock('@/lib/utils/requestContext', () => ({
  getRequestContext: () => undefined,
}));

const { logApp } = await import('@/lib/logging/appLog');

/** The row handed to Prisma by the last logApp call. */
function lastRow() {
  return create.mock.calls.at(-1)?.[0]?.data;
}

describe('logApp', () => {
  beforeEach(() => {
    create.mockClear();
  });

  it('keeps the stack of a thrown Error', async () => {
    const error = new Error('SMTP down');

    await logApp({ source: 'EMAIL', message: 'Invio fallito', error });

    expect(lastRow().message).toBe('Invio fallito');
    expect(lastRow().stack).toContain('SMTP down');
  });

  it('keeps a string cause instead of discarding it', async () => {
    await logApp({
      source: 'EMAIL',
      message: 'Invio email fallito (EVENT_MODIFICATION): Evento modificato',
      error: '450 4.2.1 Recipient temporarily rejected',
    });

    expect(lastRow().stack).toBe('450 4.2.1 Recipient temporarily rejected');
  });

  it('serializes a non-Error object cause', async () => {
    await logApp({ source: 'API', message: 'Chiamata fallita', error: { code: 429, retryAfter: 60 } });

    expect(lastRow().stack).toContain('429');
  });

  it('records no cause when there is none to record', async () => {
    await logApp({ source: 'SYSTEM', message: 'Solo un messaggio' });

    expect(lastRow().stack).toBeNull();
  });

  it('does not repeat the title as its own cause', async () => {
    await logApp({ source: 'SYSTEM', message: 'Qualcosa è andato storto', error: 'Qualcosa è andato storto' });

    expect(lastRow().stack).toBeNull();
  });

  it('defaults to ERROR but honours an explicit level', async () => {
    await logApp({ source: 'AUTH', message: 'Troppi tentativi', level: 'WARN' });

    expect(lastRow().level).toBe('WARN');
  });

  it('never throws when the write fails — logging must not break the caller', async () => {
    create.mockRejectedValueOnce(new Error('db unreachable'));

    await expect(logApp({ source: 'SYSTEM', message: 'x' })).resolves.toBeUndefined();
  });
});
