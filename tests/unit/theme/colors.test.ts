/**
 * Tests for lib/theme/colors.ts
 *
 * Tests for the centralized color system including dynamic subject colors.
 */

import { describe, it, expect } from 'vitest';
import {
  generateDynamicSubjectColor,
  getSubjectInlineStyle,
  getSubjectColor,
  colors,
} from '@/lib/theme/colors';

describe('colors.ts', () => {
  describe('generateDynamicSubjectColor', () => {
    describe('with valid hex colors', () => {
      it('should generate correct classes for standard hex color', () => {
        const result = generateDynamicSubjectColor('#D54F8A');

        expect(result.main).toBe('#D54F8A');
        expect(result.bg).toBe('bg-[#D54F8A]');
        expect(result.text).toBe('text-[#D54F8A]');
        expect(result.border).toBe('border-[#D54F8A]');
        expect(result.hover).toBe('hover:bg-[#D54F8A]');
        expect(result.shadow).toBe('shadow-[#D54F8A]/20');
        expect(result.bgLight).toBe('bg-[#D54F8A]/10');
        expect(result.bgLightDark).toBe('bg-[#D54F8A]/20');
      });

      it('should handle lowercase hex colors', () => {
        const result = generateDynamicSubjectColor('#abc123');

        expect(result.main).toBe('#abc123');
        expect(result.bg).toBe('bg-[#abc123]');
      });

      it('should handle uppercase hex colors', () => {
        const result = generateDynamicSubjectColor('#FFFFFF');

        expect(result.main).toBe('#FFFFFF');
        expect(result.bg).toBe('bg-[#FFFFFF]');
      });

      it('should handle mixed case hex colors', () => {
        const result = generateDynamicSubjectColor('#AbCdEf');

        expect(result.main).toBe('#AbCdEf');
      });

      it('should handle primary brand color', () => {
        const result = generateDynamicSubjectColor('#a8012b');

        expect(result.main).toBe('#a8012b');
        expect(result.bg).toBe('bg-[#a8012b]');
      });
    });

    describe('with null/undefined values', () => {
      it('should return fallback gray for null', () => {
        const result = generateDynamicSubjectColor(null);

        expect(result.main).toBe('#6B7280');
        expect(result.bg).toBe('bg-[#6B7280]');
        expect(result.text).toBe('text-[#6B7280]');
      });

      it('should return fallback gray for undefined', () => {
        const result = generateDynamicSubjectColor(undefined);

        expect(result.main).toBe('#6B7280');
        expect(result.bg).toBe('bg-[#6B7280]');
      });

      it('should return fallback gray for empty string', () => {
        const result = generateDynamicSubjectColor('');

        expect(result.main).toBe('#6B7280');
      });
    });

    describe('all returned properties', () => {
      it('should return all 8 properties', () => {
        const result = generateDynamicSubjectColor('#123456');

        expect(Object.keys(result)).toHaveLength(8);
        expect(result).toHaveProperty('main');
        expect(result).toHaveProperty('bg');
        expect(result).toHaveProperty('text');
        expect(result).toHaveProperty('border');
        expect(result).toHaveProperty('hover');
        expect(result).toHaveProperty('shadow');
        expect(result).toHaveProperty('bgLight');
        expect(result).toHaveProperty('bgLightDark');
      });
    });
  });

  describe('getSubjectInlineStyle', () => {
    describe('with valid hex colors', () => {
      it('should return inline style object for valid color', () => {
        const result = getSubjectInlineStyle('#D54F8A');

        expect(result.backgroundColor).toBe('#D54F8A');
        expect(result.color).toBe('#D54F8A');
        expect(result.borderColor).toBe('#D54F8A');
      });

      it('should return all three style properties', () => {
        const result = getSubjectInlineStyle('#123456');

        expect(Object.keys(result)).toHaveLength(3);
      });
    });

    describe('with null/undefined values', () => {
      it('should return fallback gray for null', () => {
        const result = getSubjectInlineStyle(null);

        expect(result.backgroundColor).toBe('#6B7280');
        expect(result.color).toBe('#6B7280');
        expect(result.borderColor).toBe('#6B7280');
      });

      it('should return fallback gray for undefined', () => {
        const result = getSubjectInlineStyle(undefined);

        expect(result.backgroundColor).toBe('#6B7280');
      });
    });
  });

  describe('getSubjectColor (deprecated)', () => {
    describe('variant selection', () => {
      it('should return fallback hex for main variant', () => {
        const result = getSubjectColor('any', 'main');

        expect(result).toBe('#6B7280');
      });

      it('should return bg class for bg variant', () => {
        const result = getSubjectColor('any', 'bg');

        expect(result).toBe('bg-gray-500');
      });

      it('should return softBg class for softBg variant', () => {
        const result = getSubjectColor('any', 'softBg');

        expect(result).toBe('bg-gray-100 dark:bg-gray-800');
      });

      it('should return text class for text variant', () => {
        const result = getSubjectColor('any', 'text');

        expect(result).toBe('text-gray-500');
      });

      it('should return border class for border variant', () => {
        const result = getSubjectColor('any', 'border');

        expect(result).toBe('border-gray-500');
      });

      it('should return hover class for hover variant', () => {
        const result = getSubjectColor('any', 'hover');

        expect(result).toBe('hover:bg-gray-600');
      });

      it('should default to bg variant when not specified', () => {
        const result = getSubjectColor('any');

        expect(result).toBe('bg-gray-500');
      });
    });

    describe('subject names are ignored', () => {
      it('should return same fallback for any subject name', () => {
        expect(getSubjectColor('Matematica')).toBe('bg-gray-500');
        expect(getSubjectColor('Italiano')).toBe('bg-gray-500');
        expect(getSubjectColor('Scienze')).toBe('bg-gray-500');
        expect(getSubjectColor('')).toBe('bg-gray-500');
      });
    });
  });

  describe('colors object', () => {
    describe('primary colors', () => {
      it('should have gradient property', () => {
        expect(colors.primary.gradient).toContain('bg-gradient-to-r');
        expect(colors.primary.gradient).toContain('#a8012b');
      });

      it('should have main color', () => {
        expect(colors.primary.main).toBe('#a8012b');
      });

      it('should have dark variant', () => {
        expect(colors.primary.dark).toBe('#8a0125');
      });

      it('should have bg class', () => {
        expect(colors.primary.bg).toContain('bg-[#a8012b]');
      });

      it('should have text class', () => {
        expect(colors.primary.text).toBe('text-[#a8012b]');
      });

      it('should have border class', () => {
        expect(colors.primary.border).toBe('border-[#a8012b]');
      });

      it('should have hover class', () => {
        expect(colors.primary.hover).toContain('hover:bg-');
      });

      it('should have softBg class', () => {
        expect(colors.primary.softBg).toContain('bg-red-50');
        expect(colors.primary.softBg).toContain('dark:bg-red-950');
      });
    });

    describe('background colors', () => {
      it('should have primary background', () => {
        expect(colors.background.primary).toContain('bg-white');
        expect(colors.background.primary).toContain('dark:bg-slate-900');
      });

      it('should have secondary background', () => {
        expect(colors.background.secondary).toContain('bg-gray-50');
      });

      it('should have card background', () => {
        expect(colors.background.card).toContain('bg-white');
        expect(colors.background.card).toContain('dark:bg-slate-800');
      });

      it('should have authPage background', () => {
        expect(colors.background.authPage).toBeDefined();
      });
    });

    describe('text colors', () => {
      it('should have primary text', () => {
        expect(colors.text.primary).toContain('text-gray-900');
        expect(colors.text.primary).toContain('dark:text-slate-100');
      });

      it('should have secondary text', () => {
        expect(colors.text.secondary).toBeDefined();
      });

      it('should have muted text', () => {
        expect(colors.text.muted).toBeDefined();
      });
    });

    describe('border colors', () => {
      it('should have primary border', () => {
        expect(colors.border.primary).toContain('border-gray');
      });
    });

    describe('status colors', () => {
      it('should have success colors', () => {
        expect(colors.status.success.text).toContain('text-green');
        expect(colors.status.success.bg).toContain('bg-green');
      });

      it('should have error colors', () => {
        expect(colors.status.error.text).toContain('text-red');
        expect(colors.status.error.bg).toContain('bg-red');
      });

      it('should have warning colors', () => {
        expect(colors.status.warning.text).toContain('text-yellow');
        expect(colors.status.warning.bg).toContain('bg-yellow');
      });

      it('should have info colors', () => {
        expect(colors.status.info.text).toContain('text-blue');
        expect(colors.status.info.bg).toContain('bg-blue');
      });
    });

    describe('role colors', () => {
      it('should have admin role colors', () => {
        expect(colors.roles.admin.bg).toBeDefined();
        expect(colors.roles.admin.text).toBeDefined();
      });

      it('should have collaborator role colors', () => {
        expect(colors.roles.collaborator.bg).toBeDefined();
        expect(colors.roles.collaborator.text).toBeDefined();
      });

      it('should have student role colors', () => {
        expect(colors.roles.student.bg).toBeDefined();
        expect(colors.roles.student.text).toBeDefined();
      });
    });

    describe('immutability', () => {
      it('should be a const object', () => {
        expect(typeof colors).toBe('object');
        expect(colors).not.toBeNull();
      });
    });
  });
});
