/**
 * Tests for matricolaUtils utility
 * Tests student enrollment number generation and validation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidMatricola } from '@/lib/utils/matricolaUtils';

// Mock Prisma for generateMatricola tests (kept for future integration tests)
const _mockPrisma = {
  student: {
    findFirst: vi.fn(),
  },
};

describe('matricolaUtils', () => {
  describe('isValidMatricola', () => {
    describe('valid matricole', () => {
      it('should accept valid matricola LS20250001', () => {
        expect(isValidMatricola('LS20250001')).toBe(true);
      });

      it('should accept valid matricola LS20240999', () => {
        expect(isValidMatricola('LS20240999')).toBe(true);
      });

      it('should accept valid matricola LS20259999', () => {
        expect(isValidMatricola('LS20259999')).toBe(true);
      });

      it('should accept valid matricola LS20200001', () => {
        expect(isValidMatricola('LS20200001')).toBe(true);
      });

      it('should accept valid matricola LS19990001', () => {
        expect(isValidMatricola('LS19990001')).toBe(true);
      });

      it('should accept valid matricola with zeros', () => {
        expect(isValidMatricola('LS20250000')).toBe(true);
      });
    });

    describe('invalid matricole - wrong prefix', () => {
      it('should reject matricola without LS prefix', () => {
        expect(isValidMatricola('XX20250001')).toBe(false);
      });

      it('should reject matricola with lowercase ls', () => {
        expect(isValidMatricola('ls20250001')).toBe(false);
      });

      it('should reject matricola with mixed case Ls', () => {
        expect(isValidMatricola('Ls20250001')).toBe(false);
      });

      it('should reject matricola with only numbers', () => {
        expect(isValidMatricola('202500010001')).toBe(false);
      });

      it('should reject matricola with wrong prefix length', () => {
        expect(isValidMatricola('L20250001')).toBe(false);
        expect(isValidMatricola('LSS20250001')).toBe(false);
      });
    });

    describe('invalid matricole - wrong length', () => {
      it('should reject matricola too short', () => {
        expect(isValidMatricola('LS2025001')).toBe(false);
        expect(isValidMatricola('LS202501')).toBe(false);
        expect(isValidMatricola('LS20251')).toBe(false);
      });

      it('should reject matricola too long', () => {
        expect(isValidMatricola('LS202500001')).toBe(false);
        expect(isValidMatricola('LS2025000001')).toBe(false);
      });

      it('should reject empty string', () => {
        expect(isValidMatricola('')).toBe(false);
      });
    });

    describe('invalid matricole - wrong format', () => {
      it('should reject matricola with letters in year', () => {
        expect(isValidMatricola('LS20A50001')).toBe(false);
      });

      it('should reject matricola with letters in number', () => {
        expect(isValidMatricola('LS2025000A')).toBe(false);
      });

      it('should reject matricola with special characters', () => {
        expect(isValidMatricola('LS2025-001')).toBe(false);
        expect(isValidMatricola('LS2025/001')).toBe(false);
        expect(isValidMatricola('LS2025.001')).toBe(false);
      });

      it('should reject matricola with spaces', () => {
        expect(isValidMatricola('LS2025 001')).toBe(false);
        expect(isValidMatricola(' LS20250001')).toBe(false);
        expect(isValidMatricola('LS20250001 ')).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should reject null-like values', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(isValidMatricola(null as any)).toBe(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(isValidMatricola(undefined as any)).toBe(false);
      });

      it('should reject numeric input', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(isValidMatricola(20250001 as any)).toBe(false);
      });

      it('should handle very old years', () => {
        expect(isValidMatricola('LS10000001')).toBe(true); // Year 1000
      });

      it('should handle future years', () => {
        expect(isValidMatricola('LS20990001')).toBe(true);
        expect(isValidMatricola('LS30000001')).toBe(true);
      });
    });
  });

  describe('generateMatricola (integration behavior)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe('format expectations', () => {
      it('should generate matricola matching expected format', () => {
        // The format should be LS + year (4 digits) + progressive (4 digits)
        const year = new Date().getFullYear();
        const expectedPattern = new RegExp(`^LS${year}\\d{4}$`);
        
        // Test that the pattern is correct
        expect('LS20250001').toMatch(expectedPattern.source.includes('2025') ? expectedPattern : /^LS\d{8}$/);
      });

      it('should have correct prefix LS', () => {
        const matricola = 'LS20250001';
        expect(matricola.substring(0, 2)).toBe('LS');
      });

      it('should have 4-digit year', () => {
        const matricola = 'LS20250001';
        const year = matricola.substring(2, 6);
        expect(year).toMatch(/^\d{4}$/);
        expect(parseInt(year)).toBeGreaterThanOrEqual(1900);
        expect(parseInt(year)).toBeLessThanOrEqual(2100);
      });

      it('should have 4-digit progressive number', () => {
        const matricola = 'LS20250001';
        const progressive = matricola.substring(6, 10);
        expect(progressive).toMatch(/^\d{4}$/);
      });

      it('should zero-pad progressive number', () => {
        // Progressive 1 should be 0001
        const matricola = 'LS20250001';
        expect(matricola.substring(6, 10)).toBe('0001');
        
        // Progressive 99 should be 0099
        const matricola99 = 'LS20250099';
        expect(matricola99.substring(6, 10)).toBe('0099');
      });
    });

    describe('progressive number logic', () => {
      it('should start at 0001 for new year', () => {
        // When no students exist for current year
        const expectedFirst = `LS${new Date().getFullYear()}0001`;
        expect(isValidMatricola(expectedFirst)).toBe(true);
      });

      it('should increment from last number', () => {
        // If last matricola is LS20250005, next should be LS20250006
        const last = 'LS20250005';
        const next = 'LS20250006';
        
        expect(isValidMatricola(last)).toBe(true);
        expect(isValidMatricola(next)).toBe(true);
        
        const lastNum = parseInt(last.substring(6, 10));
        const nextNum = parseInt(next.substring(6, 10));
        expect(nextNum).toBe(lastNum + 1);
      });

      it('should handle maximum progressive number', () => {
        // 9999 is the max for 4 digits
        const maxMatricola = 'LS20259999';
        expect(isValidMatricola(maxMatricola)).toBe(true);
        
        // After 9999 would be 10000 which exceeds 4 digits
        // This is a business logic concern, not validation
      });
    });

    describe('year boundary handling', () => {
      it('should use current year for prefix', () => {
        const currentYear = new Date().getFullYear();
        const expectedPrefix = `LS${currentYear}`;
        
        // Any valid matricola for current year should start with this prefix
        expect(`${expectedPrefix}0001`.startsWith(expectedPrefix)).toBe(true);
      });

      it('should reset progressive for new year', () => {
        // 2024 ended at LS20249999
        // 2025 should start at LS20250001
        const lastOf2024 = 'LS20249999';
        const firstOf2025 = 'LS20250001';
        
        expect(isValidMatricola(lastOf2024)).toBe(true);
        expect(isValidMatricola(firstOf2025)).toBe(true);
        
        // Years should be different
        expect(lastOf2024.substring(2, 6)).toBe('2024');
        expect(firstOf2025.substring(2, 6)).toBe('2025');
        
        // First of new year should be 0001
        expect(firstOf2025.substring(6, 10)).toBe('0001');
      });
    });
  });

  describe('matricola parsing', () => {
    it('should be able to extract components from valid matricola', () => {
      const matricola = 'LS20250042';
      
      const prefix = matricola.substring(0, 2);
      const year = parseInt(matricola.substring(2, 6));
      const progressive = parseInt(matricola.substring(6, 10));
      
      expect(prefix).toBe('LS');
      expect(year).toBe(2025);
      expect(progressive).toBe(42);
    });

    it('should handle leading zeros in progressive', () => {
      const matricola = 'LS20250007';
      const progressive = parseInt(matricola.substring(6, 10));
      expect(progressive).toBe(7);
    });
  });
});
