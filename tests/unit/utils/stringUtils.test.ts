/**
 * String Utils Tests
 *
 * Tests for string normalization utilities
 */

import { describe, it, expect } from 'vitest';
import { normalizeName, normalizeEmail } from '@/lib/utils/stringUtils';

describe('stringUtils', () => {
  describe('normalizeName', () => {
    describe('basic capitalization', () => {
      it('should capitalize first letter of each word', () => {
        expect(normalizeName('mario rossi')).toBe('Mario Rossi');
      });

      it('should lowercase other letters', () => {
        expect(normalizeName('MARIO ROSSI')).toBe('Mario Rossi');
      });

      it('should handle mixed case', () => {
        expect(normalizeName('mArIo RoSsI')).toBe('Mario Rossi');
      });

      it('should handle single word', () => {
        expect(normalizeName('mario')).toBe('Mario');
      });

      it('should handle single character', () => {
        expect(normalizeName('m')).toBe('M');
      });
    });

    describe('whitespace handling', () => {
      it('should trim leading whitespace', () => {
        expect(normalizeName('  mario rossi')).toBe('Mario Rossi');
      });

      it('should trim trailing whitespace', () => {
        expect(normalizeName('mario rossi  ')).toBe('Mario Rossi');
      });

      it('should collapse multiple spaces', () => {
        expect(normalizeName('mario   rossi')).toBe('Mario Rossi');
      });

      it('should handle tabs', () => {
        expect(normalizeName('mario\trossi')).toBe('Mario Rossi');
      });

      it('should handle newlines', () => {
        expect(normalizeName('mario\nrossi')).toBe('Mario Rossi');
      });

      it('should handle empty string', () => {
        expect(normalizeName('')).toBe('');
      });

      it('should handle only whitespace', () => {
        expect(normalizeName('   ')).toBe('');
      });
    });

    describe('complex names', () => {
      it('should handle three-word names', () => {
        expect(normalizeName('mario giuseppe rossi')).toBe('Mario Giuseppe Rossi');
      });

      it('should handle names with particles', () => {
        expect(normalizeName('maria de luca')).toBe('Maria De Luca');
      });

      it('should handle accented characters', () => {
        expect(normalizeName('nicolò andrè')).toBe('Nicolò Andrè');
      });

      it('should handle hyphenated names', () => {
        // Note: current implementation treats hyphen as part of word
        expect(normalizeName('jean-pierre dupont')).toBe('Jean-pierre Dupont');
      });

      it('should handle apostrophes', () => {
        expect(normalizeName("d'angelo")).toBe("D'angelo");
      });
    });

    describe('edge cases', () => {
      it('should handle numbers in names', () => {
        expect(normalizeName('john 3rd')).toBe('John 3rd');
      });

      it('should handle very long names', () => {
        const longName = 'alessandro ' + 'a '.repeat(50);
        const result = normalizeName(longName);
        expect(result.startsWith('Alessandro')).toBe(true);
      });
    });
  });

  describe('normalizeEmail', () => {
    describe('basic normalization', () => {
      it('should lowercase email', () => {
        expect(normalizeEmail('Test@Example.COM')).toBe('test@example.com');
      });

      it('should keep already lowercase email', () => {
        expect(normalizeEmail('test@example.com')).toBe('test@example.com');
      });
    });

    describe('whitespace handling', () => {
      it('should trim leading whitespace', () => {
        expect(normalizeEmail('  test@example.com')).toBe('test@example.com');
      });

      it('should trim trailing whitespace', () => {
        expect(normalizeEmail('test@example.com  ')).toBe('test@example.com');
      });

      it('should trim both ends', () => {
        expect(normalizeEmail('  test@example.com  ')).toBe('test@example.com');
      });

      it('should handle empty string', () => {
        expect(normalizeEmail('')).toBe('');
      });

      it('should handle only whitespace', () => {
        expect(normalizeEmail('   ')).toBe('');
      });
    });

    describe('special characters', () => {
      it('should preserve plus addressing', () => {
        expect(normalizeEmail('Test+Tag@Example.com')).toBe('test+tag@example.com');
      });

      it('should preserve dots in local part', () => {
        expect(normalizeEmail('First.Last@Example.com')).toBe('first.last@example.com');
      });

      it('should preserve underscores', () => {
        expect(normalizeEmail('First_Last@Example.com')).toBe('first_last@example.com');
      });

      it('should preserve hyphens', () => {
        expect(normalizeEmail('Test@Sub-Domain.Example.com')).toBe(
          'test@sub-domain.example.com'
        );
      });
    });

    describe('international domains', () => {
      it('should handle .it domain', () => {
        expect(normalizeEmail('Test@Example.IT')).toBe('test@example.it');
      });

      it('should handle .co.uk domain', () => {
        expect(normalizeEmail('Test@Example.CO.UK')).toBe('test@example.co.uk');
      });
    });
  });
});
