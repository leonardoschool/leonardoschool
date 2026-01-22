/**
 * Auth Validation Tests
 * Tests for email validation and password strength calculation
 */

import { describe, it, expect } from 'vitest';
import { isValidEmail, calculatePasswordStrength } from '@/lib/validations/authValidation';

describe('authValidation', () => {
  describe('isValidEmail', () => {
    describe('valid emails', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.org',
        'user+tag@example.co.uk',
        'firstname.lastname@company.com',
        'email@subdomain.domain.com',
        'user123@test.io',
        'a@b.co',
        'test_email@example.com',
      ];

      it.each(validEmails)('should accept valid email: %s', (email) => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    describe('invalid emails', () => {
      const invalidEmails = [
        '',                          // Empty string
        'notanemail',               // No @ symbol
        '@nodomain.com',            // No local part
        'noatsymbol.com',           // Missing @
        'user@',                    // No domain
        'user@.com',                // Domain starts with dot
        'user@domain',              // No TLD
        'user name@example.com',    // Space in email
        'user@@example.com',        // Double @
        'user@exam ple.com',        // Space in domain
      ];

      it.each(invalidEmails)('should reject invalid email: %s', (email) => {
        expect(isValidEmail(email)).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should reject email with only spaces', () => {
        expect(isValidEmail('   ')).toBe(false);
      });

      it('should reject email with newlines', () => {
        expect(isValidEmail('test@example\n.com')).toBe(false);
      });

      it('should reject email with tabs', () => {
        expect(isValidEmail('test@example\t.com')).toBe(false);
      });
    });
  });

  describe('calculatePasswordStrength', () => {
    describe('very weak passwords (score 0-1)', () => {
      it('should return "Molto debole" for empty password', () => {
        const result = calculatePasswordStrength('');
        expect(result.score).toBeLessThanOrEqual(1);
        expect(result.label).toBe('Molto debole');
      });

      it('should return "Molto debole" for short password', () => {
        const result = calculatePasswordStrength('abc');
        expect(result.score).toBeLessThanOrEqual(1);
        expect(result.label).toBe('Molto debole');
      });

      it('should return "Molto debole" for simple password under 8 chars', () => {
        const result = calculatePasswordStrength('hello');
        expect(result.score).toBeLessThanOrEqual(1);
        expect(result.label).toBe('Molto debole');
      });
    });

    describe('weak passwords (score 2)', () => {
      it('should return "Debole" for password with 8+ chars and numbers only', () => {
        // 8+ chars (1 point) + numbers (1 point) = 2
        const result = calculatePasswordStrength('12345678');
        expect(result.score).toBe(2);
        expect(result.label).toBe('Debole');
      });

      it('should return "Debole" for 12+ lowercase only password', () => {
        // 8+ chars (1 point) + 12+ chars (1 point) = 2
        const result = calculatePasswordStrength('abcdefghijkl');
        expect(result.score).toBe(2);
        expect(result.label).toBe('Debole');
      });
    });

    describe('medium passwords (score 3)', () => {
      it('should return "Media" for 12+ char password with mixed case', () => {
        // 8+ chars (1) + 12+ chars (1) + mixed case (1) = 3
        const result = calculatePasswordStrength('Abcdefghijkl');
        expect(result.score).toBe(3);
        expect(result.label).toBe('Media');
      });

      it('should return "Media" for 12+ char password with numbers', () => {
        // 8+ chars (1) + 12+ chars (1) + numbers (1) = 3
        const result = calculatePasswordStrength('abcdefgh1234');
        expect(result.score).toBe(3);
        expect(result.label).toBe('Media');
      });

      it('should return "Media" for 8+ char password with mixed case and numbers', () => {
        // 8+ chars (1) + mixed case (1) + numbers (1) = 3
        const result = calculatePasswordStrength('Abcd1234');
        expect(result.score).toBe(3);
        expect(result.label).toBe('Media');
      });
    });

    describe('strong passwords (score 4)', () => {
      it('should return "Forte" for 12+ char with mixed case and numbers', () => {
        // 8+ chars (1) + 12+ chars (1) + mixed case (1) + numbers (1) = 4
        const result = calculatePasswordStrength('Abcdefgh1234');
        expect(result.score).toBe(4);
        expect(result.label).toBe('Forte');
      });

      it('should return "Forte" for 8+ char with mixed case, numbers and special', () => {
        // 8+ chars (1) + mixed case (1) + numbers (1) + special (1) = 4
        const result = calculatePasswordStrength('Abcd12!@');
        expect(result.score).toBe(4);
        expect(result.label).toBe('Forte');
      });
    });

    describe('very strong passwords (score 5)', () => {
      it('should return "Molto forte" for password with all criteria', () => {
        // 8+ chars (1) + 12+ chars (1) + mixed case (1) + numbers (1) + special (1) = 5
        const result = calculatePasswordStrength('MyP@ssw0rd!2024');
        expect(result.score).toBe(5);
        expect(result.label).toBe('Molto forte');
      });

      it('should return "Molto forte" for 12+ char password with all criteria', () => {
        const result = calculatePasswordStrength('SuperSecure!123');
        expect(result.score).toBe(5);
        expect(result.label).toBe('Molto forte');
      });
    });

    describe('scoring criteria', () => {
      it('should add 1 point for 8+ characters', () => {
        const short = calculatePasswordStrength('abc');
        const long = calculatePasswordStrength('abcdefgh');
        expect(long.score).toBeGreaterThan(short.score);
      });

      it('should add 1 point for 12+ characters', () => {
        const eight = calculatePasswordStrength('abcdefgh');
        const twelve = calculatePasswordStrength('abcdefghijkl');
        expect(twelve.score).toBeGreaterThan(eight.score);
      });

      it('should add 1 point for mixed case letters', () => {
        const lower = calculatePasswordStrength('abcdefgh');
        const mixed = calculatePasswordStrength('Abcdefgh');
        expect(mixed.score).toBeGreaterThan(lower.score);
      });

      it('should add 1 point for including numbers', () => {
        const noNumbers = calculatePasswordStrength('Abcdefgh');
        const withNumbers = calculatePasswordStrength('Abcdefg1');
        expect(withNumbers.score).toBeGreaterThan(noNumbers.score);
      });

      it('should add 1 point for special characters', () => {
        // Abcdefg1 = 8+ (1) + mixed (1) + number (1) = 3
        // Abcdefg! = 8+ (1) + mixed (1) + special (1) = 3
        // Need to compare with proper baseline
        const noSpecial = calculatePasswordStrength('Abcdefgh12'); // 8+ (1) + mixed (1) + num (1) = 3
        const withSpecial = calculatePasswordStrength('Abcdefgh1!'); // 8+ (1) + mixed (1) + num (1) + special (1) = 4
        expect(withSpecial.score).toBeGreaterThan(noSpecial.score);
      });
    });

    describe('color codes', () => {
      it('should return correct color classes for each strength level', () => {
        const veryWeak = calculatePasswordStrength('a');
        const weak = calculatePasswordStrength('abcdefgh');
        const medium = calculatePasswordStrength('Abcdefgh');
        const strong = calculatePasswordStrength('Abcd1234');
        const veryStrong = calculatePasswordStrength('Abcd1234!');

        // Each should have a color and textColor property
        expect(veryWeak.color).toBeDefined();
        expect(veryWeak.textColor).toBeDefined();
        expect(weak.color).toBeDefined();
        expect(medium.color).toBeDefined();
        expect(strong.color).toBeDefined();
        expect(veryStrong.color).toBeDefined();

        // Colors should be different for different strength levels
        expect(veryWeak.color).not.toBe(veryStrong.color);
      });
    });

    describe('edge cases', () => {
      it('should handle unicode characters', () => {
        const result = calculatePasswordStrength('Pässwörd123!');
        expect(result.score).toBeGreaterThan(0);
      });

      it('should handle very long passwords', () => {
        const longPassword = 'A'.repeat(100) + 'a1!';
        const result = calculatePasswordStrength(longPassword);
        expect(result.score).toBe(5);
        expect(result.label).toBe('Molto forte');
      });

      it('should handle password with only special characters', () => {
        const result = calculatePasswordStrength('!@#$%^&*');
        expect(result.score).toBeLessThanOrEqual(2);
      });
    });
  });
});
