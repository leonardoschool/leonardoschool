/**
 * Tests for simulationLabels utility
 */
import { describe, it, expect } from 'vitest';
import {
  SIMULATION_TYPE_LABELS,
  getSimulationTypeLabel,
  SIMULATION_TYPE_COLORS,
  getSimulationTypeColors,
} from '@/lib/utils/simulationLabels';

describe('simulationLabels', () => {
  describe('SIMULATION_TYPE_LABELS', () => {
    it('should have label for OFFICIAL', () => {
      expect(SIMULATION_TYPE_LABELS.OFFICIAL).toBe('Simulazione Ufficiale');
    });

    it('should have label for PRACTICE', () => {
      expect(SIMULATION_TYPE_LABELS.PRACTICE).toBe('Test di Pratica');
    });

    it('should have label for CUSTOM', () => {
      expect(SIMULATION_TYPE_LABELS.CUSTOM).toBe('Simulazione Personalizzata');
    });

    it('should have label for QUICK_QUIZ', () => {
      expect(SIMULATION_TYPE_LABELS.QUICK_QUIZ).toBe('Quiz Veloce');
    });

    it('should have all Italian labels', () => {
      Object.values(SIMULATION_TYPE_LABELS).forEach((label) => {
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getSimulationTypeLabel', () => {
    it('should return correct label for OFFICIAL', () => {
      expect(getSimulationTypeLabel('OFFICIAL')).toBe('Simulazione Ufficiale');
    });

    it('should return correct label for PRACTICE', () => {
      expect(getSimulationTypeLabel('PRACTICE')).toBe('Test di Pratica');
    });

    it('should return correct label for CUSTOM', () => {
      expect(getSimulationTypeLabel('CUSTOM')).toBe('Simulazione Personalizzata');
    });

    it('should return correct label for QUICK_QUIZ', () => {
      expect(getSimulationTypeLabel('QUICK_QUIZ')).toBe('Quiz Veloce');
    });

    it('should return the type itself for unknown types', () => {
      expect(getSimulationTypeLabel('UNKNOWN')).toBe('UNKNOWN');
    });

    it('should return the type itself for empty string', () => {
      expect(getSimulationTypeLabel('')).toBe('');
    });

    it('should handle case-sensitive type names', () => {
      // Types are case-sensitive
      expect(getSimulationTypeLabel('official')).toBe('official');
      expect(getSimulationTypeLabel('Official')).toBe('Official');
    });
  });

  describe('SIMULATION_TYPE_COLORS', () => {
    it('should have colors for OFFICIAL', () => {
      const colors = SIMULATION_TYPE_COLORS.OFFICIAL;
      expect(colors.bg).toContain('red');
      expect(colors.text).toContain('red');
    });

    it('should have colors for PRACTICE', () => {
      const colors = SIMULATION_TYPE_COLORS.PRACTICE;
      expect(colors.bg).toContain('blue');
      expect(colors.text).toContain('blue');
    });

    it('should have colors for CUSTOM', () => {
      const colors = SIMULATION_TYPE_COLORS.CUSTOM;
      expect(colors.bg).toContain('purple');
      expect(colors.text).toContain('purple');
    });

    it('should have colors for QUICK_QUIZ', () => {
      const colors = SIMULATION_TYPE_COLORS.QUICK_QUIZ;
      expect(colors.bg).toContain('green');
      expect(colors.text).toContain('green');
    });

    it('should have dark mode variants', () => {
      Object.values(SIMULATION_TYPE_COLORS).forEach((colors) => {
        expect(colors.bg).toContain('dark:');
        expect(colors.text).toContain('dark:');
      });
    });

    it('should have Tailwind CSS classes', () => {
      Object.values(SIMULATION_TYPE_COLORS).forEach((colors) => {
        expect(colors.bg).toMatch(/bg-\w+-\d+/);
        expect(colors.text).toMatch(/text-\w+-\d+/);
      });
    });
  });

  describe('getSimulationTypeColors', () => {
    it('should return correct colors for OFFICIAL', () => {
      const colors = getSimulationTypeColors('OFFICIAL');
      expect(colors.bg).toContain('red');
      expect(colors.text).toContain('red');
    });

    it('should return correct colors for PRACTICE', () => {
      const colors = getSimulationTypeColors('PRACTICE');
      expect(colors.bg).toContain('blue');
      expect(colors.text).toContain('blue');
    });

    it('should return correct colors for CUSTOM', () => {
      const colors = getSimulationTypeColors('CUSTOM');
      expect(colors.bg).toContain('purple');
      expect(colors.text).toContain('purple');
    });

    it('should return correct colors for QUICK_QUIZ', () => {
      const colors = getSimulationTypeColors('QUICK_QUIZ');
      expect(colors.bg).toContain('green');
      expect(colors.text).toContain('green');
    });

    it('should return PRACTICE colors as fallback for unknown types', () => {
      const colors = getSimulationTypeColors('UNKNOWN');
      expect(colors).toEqual(SIMULATION_TYPE_COLORS.PRACTICE);
    });

    it('should return PRACTICE colors for empty string', () => {
      const colors = getSimulationTypeColors('');
      expect(colors).toEqual(SIMULATION_TYPE_COLORS.PRACTICE);
    });

    it('should handle case-sensitive type names', () => {
      // Unknown case should fallback to PRACTICE
      const colors = getSimulationTypeColors('official');
      expect(colors).toEqual(SIMULATION_TYPE_COLORS.PRACTICE);
    });
  });

  describe('color consistency', () => {
    it('should have matching bg and text color families', () => {
      // Each type should have same color family for bg and text
      const colorFamilies = ['red', 'blue', 'purple', 'green'];
      
      Object.entries(SIMULATION_TYPE_COLORS).forEach(([_type, colors]) => {
        const bgColor = colorFamilies.find((c) => colors.bg.includes(c));
        const textColor = colorFamilies.find((c) => colors.text.includes(c));
        expect(bgColor).toBe(textColor);
      });
    });

    it('should have light background variants (100)', () => {
      Object.values(SIMULATION_TYPE_COLORS).forEach((colors) => {
        expect(colors.bg).toMatch(/bg-\w+-100/);
      });
    });

    it('should have darker text variants (700)', () => {
      Object.values(SIMULATION_TYPE_COLORS).forEach((colors) => {
        expect(colors.text).toMatch(/text-\w+-700/);
      });
    });

    it('should have proper dark mode opacity for backgrounds', () => {
      Object.values(SIMULATION_TYPE_COLORS).forEach((colors) => {
        expect(colors.bg).toMatch(/dark:bg-\w+-900\/30/);
      });
    });

    it('should have lighter dark mode text (400)', () => {
      Object.values(SIMULATION_TYPE_COLORS).forEach((colors) => {
        expect(colors.text).toMatch(/dark:text-\w+-400/);
      });
    });
  });

  describe('type coverage', () => {
    it('should have labels for all color types', () => {
      const labelTypes = Object.keys(SIMULATION_TYPE_LABELS);
      const colorTypes = Object.keys(SIMULATION_TYPE_COLORS);
      
      expect(labelTypes.sort()).toEqual(colorTypes.sort());
    });

    it('should cover all expected simulation types', () => {
      const expectedTypes = ['OFFICIAL', 'PRACTICE', 'CUSTOM', 'QUICK_QUIZ'];
      
      expectedTypes.forEach((type) => {
        expect(SIMULATION_TYPE_LABELS).toHaveProperty(type);
        expect(SIMULATION_TYPE_COLORS).toHaveProperty(type);
      });
    });
  });
});
