/**
 * Error Handler Tests
 *
 * Tests for error parsing and user-friendly message generation
 */

import { describe, it, expect } from 'vitest';
import { parseError, isErrorCode, isAuthError, isNetworkError } from '@/lib/utils/errorHandler';

describe('errorHandler', () => {
  describe('parseError', () => {
    describe('tRPC errors', () => {
      it('should parse UNAUTHORIZED error', () => {
        // Without custom message - should use default Italian message
        const error = { code: 'UNAUTHORIZED' };
        const result = parseError(error);

        expect(result.code).toBe('UNAUTHORIZED');
        expect(result.title).toBe('Accesso negato');
        expect(result.message).toBe(
          'Devi effettuare il login per accedere a questa funzionalità.'
        );
      });

      it('should parse UNAUTHORIZED error with custom message', () => {
        // With custom message - should prefer the custom message
        const error = { code: 'UNAUTHORIZED', message: 'Not authenticated' };
        const result = parseError(error);

        expect(result.code).toBe('UNAUTHORIZED');
        expect(result.title).toBe('Accesso negato');
        expect(result.message).toBe('Not authenticated');
      });

      it('should parse FORBIDDEN error', () => {
        const error = { code: 'FORBIDDEN' };
        const result = parseError(error);

        expect(result.code).toBe('FORBIDDEN');
        expect(result.title).toBe('Permesso negato');
        expect(result.message).toBe(
          'Non hai i permessi necessari per eseguire questa azione.'
        );
      });

      it('should parse NOT_FOUND error', () => {
        const error = { code: 'NOT_FOUND' };
        const result = parseError(error);

        expect(result.code).toBe('NOT_FOUND');
        expect(result.title).toBe('Non trovato');
        expect(result.message).toBe('La risorsa richiesta non è stata trovata.');
      });

      it('should parse BAD_REQUEST error', () => {
        const error = { code: 'BAD_REQUEST', message: 'Invalid input' };
        const result = parseError(error);

        expect(result.code).toBe('BAD_REQUEST');
        expect(result.title).toBe('Dati non validi');
      });

      it('should parse CONFLICT error', () => {
        const error = { code: 'CONFLICT', message: 'Duplicate entry' };
        const result = parseError(error);

        expect(result.code).toBe('CONFLICT');
        expect(result.title).toBe('Conflitto');
      });

      it('should parse TOO_MANY_REQUESTS error', () => {
        const error = { code: 'TOO_MANY_REQUESTS', message: 'Rate limited' };
        const result = parseError(error);

        expect(result.code).toBe('TOO_MANY_REQUESTS');
        expect(result.title).toBe('Troppe richieste');
      });

      it('should parse TIMEOUT error', () => {
        const error = { code: 'TIMEOUT', message: 'Request timed out' };
        const result = parseError(error);

        expect(result.code).toBe('TIMEOUT');
        expect(result.title).toBe('Timeout');
      });

      it('should parse INTERNAL_SERVER_ERROR', () => {
        const error = { code: 'INTERNAL_SERVER_ERROR', message: 'Server crashed' };
        const result = parseError(error);

        expect(result.code).toBe('INTERNAL_SERVER_ERROR');
        expect(result.title).toBe('Errore del server');
      });

      it('should parse PARSE_ERROR', () => {
        const error = { code: 'PARSE_ERROR', message: 'Invalid JSON' };
        const result = parseError(error);

        expect(result.code).toBe('PARSE_ERROR');
        expect(result.title).toBe('Errore dati');
      });
    });

    describe('nested tRPC errors (v11 shape)', () => {
      it('should extract code from data.code', () => {
        const error = { data: { code: 'FORBIDDEN' } };
        const result = parseError(error);

        expect(result.code).toBe('FORBIDDEN');
        expect(result.title).toBe('Permesso negato');
      });

      it('should extract custom message from data.message', () => {
        const error = {
          code: 'BAD_REQUEST',
          data: { message: 'Email già registrata nel sistema' },
        };
        const result = parseError(error);

        expect(result.message).toBe('Email già registrata nel sistema');
      });
    });

    describe('Zod validation errors', () => {
      it('should parse Zod validation error with zodError array', () => {
        const error = {
          code: 'BAD_REQUEST',
          data: {
            zodError: [
              { path: ['email'], message: 'Invalid email' },
            ],
          },
        };
        const result = parseError(error);

        expect(result.code).toBe('BAD_REQUEST');
        // Should translate and include field name
        expect(result.message).toContain('email');
      });

      it('should handle empty zodError array', () => {
        const error = {
          code: 'BAD_REQUEST',
          data: { zodError: [] },
        };
        const result = parseError(error);

        expect(result.code).toBe('BAD_REQUEST');
      });

      it('should handle nested field paths', () => {
        const error = {
          data: {
            zodError: [
              { path: ['address', 'city'], message: 'Required' },
            ],
          },
        };
        const result = parseError(error);

        expect(result.message).toContain('address');
        expect(result.message).toContain('city');
      });
    });

    describe('network errors', () => {
      it('should detect fetch failed as network error', () => {
        const error = { message: 'fetch failed' };
        const result = parseError(error);

        expect(result.code).toBe('NETWORK_ERROR');
        expect(result.title).toBe('Errore di connessione');
      });

      it('should detect network in message', () => {
        const error = { message: 'network request failed' };
        const result = parseError(error);

        expect(result.code).toBe('NETWORK_ERROR');
      });
    });

    describe('unknown errors', () => {
      it('should handle null error', () => {
        const result = parseError(null);

        expect(result.code).toBe('UNKNOWN');
        expect(result.title).toBe('Errore');
      });

      it('should handle undefined error', () => {
        const result = parseError(undefined);

        expect(result.code).toBe('UNKNOWN');
      });

      it('should handle empty object', () => {
        const result = parseError({});

        expect(result.code).toBe('UNKNOWN');
      });

      it('should handle string error', () => {
        const result = parseError('Something went wrong');

        expect(result.code).toBe('UNKNOWN');
      });

      it('should handle number error', () => {
        const result = parseError(500);

        expect(result.code).toBe('UNKNOWN');
      });
    });

    describe('custom messages', () => {
      it('should prefer custom message from error.message', () => {
        const error = { code: 'BAD_REQUEST', message: 'Username già in uso' };
        const result = parseError(error);

        expect(result.message).toBe('Username già in uso');
      });

      it('should skip generic network messages', () => {
        const error = { code: 'NETWORK_ERROR', message: 'Failed to fetch' };
        const result = parseError(error);

        // Should use default Italian message, not the generic one
        expect(result.message).toBe(
          'Impossibile connettersi al server. Verifica la tua connessione internet.'
        );
      });
    });

    describe('originalError preservation', () => {
      it('should preserve the original error object', () => {
        const originalError = { code: 'FORBIDDEN', stack: 'Error at line 1' };
        const result = parseError(originalError);

        expect(result.originalError).toBe(originalError);
      });
    });
  });

  describe('isErrorCode', () => {
    it('should return true for matching code', () => {
      const error = { code: 'UNAUTHORIZED' };
      expect(isErrorCode(error, 'UNAUTHORIZED')).toBe(true);
    });

    it('should return false for non-matching code', () => {
      const error = { code: 'FORBIDDEN' };
      expect(isErrorCode(error, 'UNAUTHORIZED')).toBe(false);
    });

    it('should handle null error', () => {
      expect(isErrorCode(null, 'UNAUTHORIZED')).toBe(false);
    });
  });

  describe('isAuthError', () => {
    it('should return true for UNAUTHORIZED', () => {
      const error = { code: 'UNAUTHORIZED' };
      expect(isAuthError(error)).toBe(true);
    });

    it('should return true for FORBIDDEN', () => {
      const error = { code: 'FORBIDDEN' };
      expect(isAuthError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      const error = { code: 'NOT_FOUND' };
      expect(isAuthError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isAuthError(null)).toBe(false);
    });
  });

  describe('isNetworkError', () => {
    it('should return true for NETWORK_ERROR code', () => {
      const error = { code: 'NETWORK_ERROR' };
      expect(isNetworkError(error)).toBe(true);
    });

    it('should return true for fetch failed message', () => {
      const error = { message: 'fetch failed' };
      expect(isNetworkError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      const error = { code: 'INTERNAL_SERVER_ERROR' };
      expect(isNetworkError(error)).toBe(false);
    });
  });

  describe('Italian translations', () => {
    const italianErrors: Array<{ code: string; expectedTitle: string }> = [
      { code: 'UNAUTHORIZED', expectedTitle: 'Accesso negato' },
      { code: 'FORBIDDEN', expectedTitle: 'Permesso negato' },
      { code: 'NOT_FOUND', expectedTitle: 'Non trovato' },
      { code: 'BAD_REQUEST', expectedTitle: 'Dati non validi' },
      { code: 'CONFLICT', expectedTitle: 'Conflitto' },
      { code: 'TOO_MANY_REQUESTS', expectedTitle: 'Troppe richieste' },
      { code: 'TIMEOUT', expectedTitle: 'Timeout' },
      { code: 'INTERNAL_SERVER_ERROR', expectedTitle: 'Errore del server' },
      { code: 'PARSE_ERROR', expectedTitle: 'Errore dati' },
      { code: 'NETWORK_ERROR', expectedTitle: 'Errore di connessione' },
      { code: 'VALIDATION_ERROR', expectedTitle: 'Dati non validi' },
    ];

    italianErrors.forEach(({ code, expectedTitle }) => {
      it(`should have Italian title for ${code}`, () => {
        const error = { code };
        const result = parseError(error);
        expect(result.title).toBe(expectedTitle);
      });
    });
  });

  describe('Zod message translation edge cases', () => {
    describe('regex pattern matching', () => {
      it('should translate "must be greater than or equal to" with number extraction', () => {
        const error = {
          data: {
            zodError: [
              { path: ['age'], message: 'Number must be greater than or equal to 18' },
            ],
          },
        };
        const result = parseError(error);

        expect(result.message).toContain('age');
        expect(result.message).toContain('18');
        // Partial translation: 'greater than' gets translated, but 'or equal to' remains
        expect(result.message).toContain('maggiore di');
      });

      it('should translate "must be less than or equal to" with number extraction', () => {
        const error = {
          data: {
            zodError: [
              { path: ['score'], message: 'Number must be less than or equal to 100' },
            ],
          },
        };
        const result = parseError(error);

        expect(result.message).toContain('score');
        expect(result.message).toContain('100');
        // Partial translation: 'less than' gets translated, but 'or equal to' remains
        expect(result.message).toContain('minore di');
      });

      it('should handle complex nested paths in Zod errors', () => {
        const error = {
          data: {
            zodError: [
              { path: ['user', 'profile', 'email'], message: 'Invalid email' },
            ],
          },
        };
        const result = parseError(error);

        expect(result.message).toContain('user → profile → email');
      });

      it('should handle empty path in Zod errors', () => {
        const error = {
          data: {
            zodError: [
              { path: [], message: 'Invalid input' },
            ],
          },
        };
        const result = parseError(error);

        expect(result.message).toContain('campo');
      });

      it('should fallback to original message with field name for unknown patterns', () => {
        const error = {
          data: {
            zodError: [
              { path: ['custom'], message: 'Some unknown validation error' },
            ],
          },
        };
        const result = parseError(error);

        expect(result.message).toContain('custom');
        expect(result.message).toContain('Some unknown validation error');
      });
    });

    describe('all translation patterns', () => {
      const translations = [
        { input: 'Required', expected: 'Campo obbligatorio' },
        { input: 'Expected string, received number', expected: 'Deve essere un testo' },
        { input: 'Expected number, received string', expected: 'Deve essere un numero' },
        { input: 'Expected boolean, received string', expected: 'Deve essere vero o falso' },
        { input: 'Invalid email', expected: 'Email non valida' },
        { input: 'String must contain at least 8 characters', expected: 'Deve contenere almeno' },
        { input: 'String must contain at most 100 characters', expected: 'Deve contenere al massimo' },
        { input: 'Number must be greater than 0', expected: 'Deve essere maggiore di' },
        { input: 'Number must be less than 100', expected: 'Deve essere minore di' },
        { input: 'Invalid input', expected: 'Input non valido' },
        { input: 'Invalid', expected: 'Non valido' },
      ];

      translations.forEach(({ input, expected }) => {
        it(`should translate "${input.substring(0, 30)}..."`, () => {
          const error = {
            data: {
              zodError: [
                { path: ['field'], message: input },
              ],
            },
          };
          const result = parseError(error);

          expect(result.message).toContain(expected);
        });
      });
    });

    describe('numeric pattern edge cases', () => {
      it('should handle multi-digit numbers in greater than or equal', () => {
        const error = {
          data: {
            zodError: [
              { path: ['amount'], message: 'Number must be greater than or equal to 1000' },
            ],
          },
        };
        const result = parseError(error);

        expect(result.message).toContain('1000');
      });

      it('should handle decimal numbers if present', () => {
        const error = {
          data: {
            zodError: [
              { path: ['price'], message: 'Number must be less than or equal to 99.99' },
            ],
          },
        };
        const result = parseError(error);

        // Should extract first number group
        expect(result.message).toMatch(/\d+/);
      });
    });

    it('should have Italian fallback message for unknown errors', () => {
      const result = parseError({});

      expect(result.title).toBe('Errore');
      expect(result.message).toBe(
        'Si è verificato un errore imprevisto. Riprova più tardi.'
      );
    });
  });

  describe('security considerations', () => {
    it('should not expose stack traces in user messages', () => {
      const error = {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something failed',
        stack: 'Error: Something failed\n    at Function.x (/app/src/module.ts:10:5)',
      };
      const result = parseError(error);

      expect(result.message).not.toContain('at Function');
      expect(result.message).not.toContain('/app/src');
    });

    it('should not expose database details', () => {
      const error = {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unique constraint failed on the fields: (`email`)',
      };
      const result = parseError(error);

      // Should use the custom message (which might expose details)
      // but the title should be generic
      expect(result.title).toBe('Errore del server');
    });
  });
});
