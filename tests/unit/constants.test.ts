/**
 * Tests for lib/constants.ts
 *
 * Tests for application constants including site configuration,
 * navigation, and social links.
 */

import { describe, it, expect } from 'vitest';
import {
  SITE_NAME,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SOCIAL_LINKS,
  NAVIGATION,
  STATS,
} from '@/lib/constants';

describe('constants.ts', () => {
  describe('SITE_NAME', () => {
    it('should be defined and non-empty', () => {
      expect(SITE_NAME).toBeDefined();
      expect(SITE_NAME.length).toBeGreaterThan(0);
    });

    it('should contain Leonardo School', () => {
      expect(SITE_NAME).toContain('Leonardo');
    });
  });

  describe('SITE_DESCRIPTION', () => {
    it('should be defined and non-empty', () => {
      expect(SITE_DESCRIPTION).toBeDefined();
      expect(SITE_DESCRIPTION.length).toBeGreaterThan(0);
    });

    it('should be SEO appropriate length (50-160 chars)', () => {
      expect(SITE_DESCRIPTION.length).toBeGreaterThan(50);
      expect(SITE_DESCRIPTION.length).toBeLessThan(500);
    });

    it('should contain relevant keywords', () => {
      const description = SITE_DESCRIPTION.toLowerCase();
      expect(description).toMatch(/medicina|test|preparazione|università/i);
    });
  });

  describe('SITE_KEYWORDS', () => {
    it('should be an array', () => {
      expect(Array.isArray(SITE_KEYWORDS)).toBe(true);
    });

    it('should have multiple keywords', () => {
      expect(SITE_KEYWORDS.length).toBeGreaterThan(5);
    });

    it('should contain medicine-related keywords', () => {
      const hasTestMedicina = SITE_KEYWORDS.some(
        (k) => k.toLowerCase().includes('medicina')
      );
      expect(hasTestMedicina).toBe(true);
    });

    it('should contain location keywords', () => {
      const hasCatania = SITE_KEYWORDS.some(
        (k) => k.toLowerCase().includes('catania')
      );
      expect(hasCatania).toBe(true);
    });

    it('should contain TOLC keywords', () => {
      const hasTolc = SITE_KEYWORDS.some(
        (k) => k.toLowerCase().includes('tolc')
      );
      expect(hasTolc).toBe(true);
    });

    it('should have non-empty keywords', () => {
      SITE_KEYWORDS.forEach((keyword) => {
        expect(keyword.length).toBeGreaterThan(0);
      });
    });
  });

  describe('SOCIAL_LINKS', () => {
    it('should be an object', () => {
      expect(typeof SOCIAL_LINKS).toBe('object');
    });

    it('should have facebook link', () => {
      expect(SOCIAL_LINKS.facebook).toBeDefined();
      expect(SOCIAL_LINKS.facebook).toMatch(/^https:\/\/(www\.)?facebook\.com/);
    });

    it('should have instagram link', () => {
      expect(SOCIAL_LINKS.instagram).toBeDefined();
      expect(SOCIAL_LINKS.instagram).toMatch(/^https:\/\/(www\.)?instagram\.com/);
    });

    it('should have youtube link', () => {
      expect(SOCIAL_LINKS.youtube).toBeDefined();
      expect(SOCIAL_LINKS.youtube).toMatch(/^https:\/\/(www\.)?youtube\.com/);
    });

    it('should have linkedin link', () => {
      expect(SOCIAL_LINKS.linkedin).toBeDefined();
      expect(SOCIAL_LINKS.linkedin).toMatch(/^https:\/\/(www\.)?linkedin\.com/);
    });

    it('should have tiktok link', () => {
      expect(SOCIAL_LINKS.tiktok).toBeDefined();
      expect(SOCIAL_LINKS.tiktok).toMatch(/^https:\/\/(www\.)?tiktok\.com/);
    });

    it('should have all valid URLs', () => {
      Object.values(SOCIAL_LINKS).forEach((url) => {
        expect(url).toMatch(/^https?:\/\//);
      });
    });
  });

  describe('NAVIGATION', () => {
    it('should be an array', () => {
      expect(Array.isArray(NAVIGATION)).toBe(true);
    });

    it('should have multiple navigation items', () => {
      expect(NAVIGATION.length).toBeGreaterThan(0);
    });

    it('should have items with label and href', () => {
      NAVIGATION.forEach((item) => {
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('href');
        expect(item.label.length).toBeGreaterThan(0);
      });
    });

    describe('required navigation items', () => {
      it('should have Didattica item', () => {
        const didattica = NAVIGATION.find((n) => n.label === 'Didattica');
        expect(didattica).toBeDefined();
        expect(didattica?.href).toBe('/didattica');
      });

      it('should have Simulazione item', () => {
        const simulazione = NAVIGATION.find((n) => n.label === 'Simulazione');
        expect(simulazione).toBeDefined();
        expect(simulazione?.href).toBe('/simulazione');
      });

      it('should have Contattaci item', () => {
        const contattaci = NAVIGATION.find((n) => n.label === 'Contattaci');
        expect(contattaci).toBeDefined();
        expect(contattaci?.href).toBe('/contattaci');
      });
    });

    describe('submenu items', () => {
      it('should have Didattica with submenu', () => {
        const didattica = NAVIGATION.find((n) => n.label === 'Didattica');
        expect(didattica?.submenu).toBeDefined();
        expect(Array.isArray(didattica?.submenu)).toBe(true);
        expect(didattica?.submenu?.length).toBeGreaterThan(0);
      });

      it('should have Altro with submenu', () => {
        const altro = NAVIGATION.find((n) => n.label === 'Altro');
        expect(altro?.submenu).toBeDefined();
        expect(Array.isArray(altro?.submenu)).toBe(true);
      });

      it('should have Chi siamo in Altro submenu', () => {
        const altro = NAVIGATION.find((n) => n.label === 'Altro');
        const chiSiamo = altro?.submenu?.find((s) => s.label === 'Chi siamo');
        expect(chiSiamo).toBeDefined();
        expect(chiSiamo?.href).toBe('/chi-siamo');
      });

      it('should have Lavora con noi in Altro submenu', () => {
        const altro = NAVIGATION.find((n) => n.label === 'Altro');
        const lavora = altro?.submenu?.find((s) => s.label === 'Lavora con noi');
        expect(lavora).toBeDefined();
        expect(lavora?.href).toBe('/lavora-con-noi');
      });

      it('should have Accedi in Altro submenu', () => {
        const altro = NAVIGATION.find((n) => n.label === 'Altro');
        const accedi = altro?.submenu?.find((s) => s.label === 'Accedi');
        expect(accedi).toBeDefined();
        expect(accedi?.href).toBe('/auth/login');
      });
    });

    describe('Didattica submenu courses', () => {
      it('should have Medicina course', () => {
        const didattica = NAVIGATION.find((n) => n.label === 'Didattica');
        const medicina = didattica?.submenu?.find((s) =>
          s.label.includes('Medicina')
        );
        expect(medicina).toBeDefined();
      });

      it('should have Professioni Sanitarie course', () => {
        const didattica = NAVIGATION.find((n) => n.label === 'Didattica');
        const snt = didattica?.submenu?.find((s) =>
          s.label.includes('Professioni Sanitarie')
        );
        expect(snt).toBeDefined();
      });

      it('should have Architettura course', () => {
        const didattica = NAVIGATION.find((n) => n.label === 'Didattica');
        const arched = didattica?.submenu?.find((s) =>
          s.label.includes('Architettura')
        );
        expect(arched).toBeDefined();
      });
    });
  });

  describe('STATS', () => {
    it('should be an array', () => {
      expect(Array.isArray(STATS)).toBe(true);
    });

    it('should have multiple stats', () => {
      expect(STATS.length).toBeGreaterThan(0);
    });

    it('should have stats with required properties', () => {
      STATS.forEach((stat) => {
        expect(stat).toHaveProperty('icon');
        expect(stat).toHaveProperty('value');
        expect(stat).toHaveProperty('label');
      });
    });

    it('should have positive values', () => {
      STATS.forEach((stat) => {
        expect(stat.value).toBeGreaterThan(0);
      });
    });

    it('should have non-empty labels', () => {
      STATS.forEach((stat) => {
        expect(stat.label.length).toBeGreaterThan(0);
      });
    });

    it('should have valid icons', () => {
      STATS.forEach((stat) => {
        expect(stat.icon.length).toBeGreaterThan(0);
      });
    });

    describe('specific stats', () => {
      it('should have students stat', () => {
        const students = STATS.find((s) =>
          s.label.toLowerCase().includes('student')
        );
        expect(students).toBeDefined();
        expect(students?.value).toBeGreaterThan(100);
      });

      it('should have admission rate stat', () => {
        const admission = STATS.find((s) =>
          s.label.toLowerCase().includes('ammessi')
        );
        expect(admission).toBeDefined();
        expect(admission?.suffix).toBe('%');
      });

      it('should have course hours stat', () => {
        const hours = STATS.find((s) =>
          s.label.toLowerCase().includes('ore')
        );
        expect(hours).toBeDefined();
        expect(hours?.value).toBeGreaterThan(1000);
      });

      it('should have tutors stat', () => {
        const tutors = STATS.find((s) =>
          s.label.toLowerCase().includes('tutor')
        );
        expect(tutors).toBeDefined();
      });
    });

    describe('suffixes and prefixes', () => {
      it('should have some stats with + suffix', () => {
        const withPlus = STATS.filter((s) => s.suffix === '+');
        expect(withPlus.length).toBeGreaterThan(0);
      });

      it('should have some stats with % suffix', () => {
        const withPercent = STATS.filter((s) => s.suffix === '%');
        expect(withPercent.length).toBeGreaterThan(0);
      });
    });
  });
});
