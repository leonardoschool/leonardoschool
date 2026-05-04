/**
 * Tests for lib/permissions.ts
 *
 * Tests for centralized permission system, route access control,
 * and navigation items.
 */

import { describe, it, expect } from 'vitest';
import {
  PAGE_PERMISSIONS,
  hasAccess,
  getDefaultDashboard,
  getAccessibleRoutes,
  isStaff,
  isAdmin,
  isCollaborator,
  NAVIGATION_ITEMS,
  getNavigationForRole,
  type PermissionRole,
} from '@/lib/permissions';

describe('permissions.ts', () => {
  describe('PAGE_PERMISSIONS', () => {
    describe('structure', () => {
      it('should be an object with route keys', () => {
        expect(typeof PAGE_PERMISSIONS).toBe('object');
        expect(Object.keys(PAGE_PERMISSIONS).length).toBeGreaterThan(0);
      });

      it('should have all routes starting with /', () => {
        Object.keys(PAGE_PERMISSIONS).forEach((route) => {
          expect(route.startsWith('/')).toBe(true);
        });
      });

      it('should have arrays of roles as values', () => {
        Object.values(PAGE_PERMISSIONS).forEach((roles) => {
          expect(Array.isArray(roles)).toBe(true);
          expect(roles.length).toBeGreaterThan(0);
        });
      });

      it('should only contain valid role values', () => {
        const validRoles: PermissionRole[] = ['ADMIN', 'COLLABORATOR', 'STUDENT'];
        Object.values(PAGE_PERMISSIONS).forEach((roles) => {
          roles.forEach((role) => {
            expect(validRoles).toContain(role);
          });
        });
      });
    });

    describe('common pages', () => {
      it('should allow all roles to access /dashboard', () => {
        expect(PAGE_PERMISSIONS['/dashboard']).toContain('ADMIN');
        expect(PAGE_PERMISSIONS['/dashboard']).toContain('COLLABORATOR');
        expect(PAGE_PERMISSIONS['/dashboard']).toContain('STUDENT');
      });

      it('should allow all roles to access /simulazioni', () => {
        expect(PAGE_PERMISSIONS['/simulazioni']).toContain('ADMIN');
        expect(PAGE_PERMISSIONS['/simulazioni']).toContain('COLLABORATOR');
        expect(PAGE_PERMISSIONS['/simulazioni']).toContain('STUDENT');
      });

      it('should allow all roles to access /calendario', () => {
        expect(PAGE_PERMISSIONS['/calendario']).toContain('ADMIN');
        expect(PAGE_PERMISSIONS['/calendario']).toContain('COLLABORATOR');
        expect(PAGE_PERMISSIONS['/calendario']).toContain('STUDENT');
      });

      it('should allow all roles to access /messaggi', () => {
        expect(PAGE_PERMISSIONS['/messaggi']).toContain('ADMIN');
        expect(PAGE_PERMISSIONS['/messaggi']).toContain('COLLABORATOR');
        expect(PAGE_PERMISSIONS['/messaggi']).toContain('STUDENT');
      });

      it('should allow all roles to access /materiali', () => {
        expect(PAGE_PERMISSIONS['/materiali']).toContain('ADMIN');
        expect(PAGE_PERMISSIONS['/materiali']).toContain('COLLABORATOR');
        expect(PAGE_PERMISSIONS['/materiali']).toContain('STUDENT');
      });
    });

    describe('staff pages', () => {
      it('should allow only staff to access /domande', () => {
        expect(PAGE_PERMISSIONS['/domande']).toContain('ADMIN');
        expect(PAGE_PERMISSIONS['/domande']).toContain('COLLABORATOR');
        expect(PAGE_PERMISSIONS['/domande']).not.toContain('STUDENT');
      });

      it('should allow only staff to access /studenti', () => {
        expect(PAGE_PERMISSIONS['/studenti']).toContain('ADMIN');
        expect(PAGE_PERMISSIONS['/studenti']).toContain('COLLABORATOR');
        expect(PAGE_PERMISSIONS['/studenti']).not.toContain('STUDENT');
      });

      it('should allow only staff to access /gruppi', () => {
        expect(PAGE_PERMISSIONS['/gruppi']).toContain('ADMIN');
        expect(PAGE_PERMISSIONS['/gruppi']).toContain('COLLABORATOR');
        expect(PAGE_PERMISSIONS['/gruppi']).not.toContain('STUDENT');
      });

      it('should allow only staff to access /presenze', () => {
        expect(PAGE_PERMISSIONS['/presenze']).toContain('ADMIN');
        expect(PAGE_PERMISSIONS['/presenze']).toContain('COLLABORATOR');
        expect(PAGE_PERMISSIONS['/presenze']).not.toContain('STUDENT');
      });

      it('should allow only staff to access /simulazioni/nuova', () => {
        expect(PAGE_PERMISSIONS['/simulazioni/nuova']).toContain('ADMIN');
        expect(PAGE_PERMISSIONS['/simulazioni/nuova']).toContain('COLLABORATOR');
        expect(PAGE_PERMISSIONS['/simulazioni/nuova']).not.toContain('STUDENT');
      });
    });

    describe('admin-only pages', () => {
      it('should allow only admin to access /utenti', () => {
        expect(PAGE_PERMISSIONS['/utenti']).toContain('ADMIN');
        expect(PAGE_PERMISSIONS['/utenti']).not.toContain('COLLABORATOR');
        expect(PAGE_PERMISSIONS['/utenti']).not.toContain('STUDENT');
      });

      it('should allow only admin to access /collaboratori', () => {
        expect(PAGE_PERMISSIONS['/collaboratori']).toContain('ADMIN');
        expect(PAGE_PERMISSIONS['/collaboratori']).not.toContain('COLLABORATOR');
        expect(PAGE_PERMISSIONS['/collaboratori']).not.toContain('STUDENT');
      });

      it('should allow only admin to access /contratti', () => {
        expect(PAGE_PERMISSIONS['/contratti']).toContain('ADMIN');
        expect(PAGE_PERMISSIONS['/contratti']).not.toContain('COLLABORATOR');
        expect(PAGE_PERMISSIONS['/contratti']).not.toContain('STUDENT');
      });

      it('should allow only admin to access /candidature', () => {
        expect(PAGE_PERMISSIONS['/candidature']).toContain('ADMIN');
        expect(PAGE_PERMISSIONS['/candidature']).not.toContain('COLLABORATOR');
        expect(PAGE_PERMISSIONS['/candidature']).not.toContain('STUDENT');
      });

      it('should allow only admin to access /assenze', () => {
        expect(PAGE_PERMISSIONS['/assenze']).toContain('ADMIN');
        expect(PAGE_PERMISSIONS['/assenze']).not.toContain('COLLABORATOR');
        expect(PAGE_PERMISSIONS['/assenze']).not.toContain('STUDENT');
      });

      it('should allow only admin to access /richieste', () => {
        expect(PAGE_PERMISSIONS['/richieste']).toContain('ADMIN');
        expect(PAGE_PERMISSIONS['/richieste']).not.toContain('COLLABORATOR');
        expect(PAGE_PERMISSIONS['/richieste']).not.toContain('STUDENT');
      });
    });

    describe('collaborator-only pages', () => {
      it('should allow only collaborator to access /le-mie-assenze', () => {
        expect(PAGE_PERMISSIONS['/le-mie-assenze']).toContain('COLLABORATOR');
        expect(PAGE_PERMISSIONS['/le-mie-assenze']).not.toContain('ADMIN');
        expect(PAGE_PERMISSIONS['/le-mie-assenze']).not.toContain('STUDENT');
      });
    });

    describe('student-only pages', () => {
      it('should allow only student to access /statistiche', () => {
        expect(PAGE_PERMISSIONS['/statistiche']).toContain('STUDENT');
        expect(PAGE_PERMISSIONS['/statistiche']).not.toContain('ADMIN');
        expect(PAGE_PERMISSIONS['/statistiche']).not.toContain('COLLABORATOR');
      });
    });
  });

  describe('hasAccess', () => {
    describe('exact path matching', () => {
      it('should return true for admin accessing admin page', () => {
        expect(hasAccess('/utenti', 'ADMIN')).toBe(true);
      });

      it('should return false for student accessing admin page', () => {
        expect(hasAccess('/utenti', 'STUDENT')).toBe(false);
      });

      it('should return true for student accessing common page', () => {
        expect(hasAccess('/dashboard', 'STUDENT')).toBe(true);
      });

      it('should return true for collaborator accessing staff page', () => {
        expect(hasAccess('/domande', 'COLLABORATOR')).toBe(true);
      });
    });

    describe('prefix path matching', () => {
      it('should allow access to nested routes', () => {
        expect(hasAccess('/simulazioni/abc123', 'STUDENT')).toBe(true);
      });

      it('should deny access to nested admin routes', () => {
        expect(hasAccess('/utenti/abc123', 'STUDENT')).toBe(false);
      });

      it('should allow admin access to nested routes', () => {
        expect(hasAccess('/utenti/edit/abc123', 'ADMIN')).toBe(true);
      });
    });

    describe('query parameter handling', () => {
      it('should ignore query parameters', () => {
        expect(hasAccess('/dashboard?tab=overview', 'STUDENT')).toBe(true);
      });

      it('should handle complex query strings', () => {
        expect(hasAccess('/simulazioni?page=1&filter=active', 'ADMIN')).toBe(true);
      });
    });

    describe('null/undefined role', () => {
      it('should return false for undefined role', () => {
        expect(hasAccess('/dashboard', undefined)).toBe(false);
      });

      it('should return false for null role', () => {
        expect(hasAccess('/dashboard', null as unknown as string)).toBe(false);
      });

      it('should return false for empty string role', () => {
        expect(hasAccess('/dashboard', '')).toBe(false);
      });
    });

    describe('unknown routes', () => {
      it('should return false for unknown route', () => {
        expect(hasAccess('/unknown-route', 'ADMIN')).toBe(false);
      });

      it('should return false for unknown nested route', () => {
        expect(hasAccess('/nonexistent/path', 'ADMIN')).toBe(false);
      });
    });

    describe('security edge cases', () => {
      it('should prevent role escalation by students', () => {
        expect(hasAccess('/utenti', 'STUDENT')).toBe(false);
        expect(hasAccess('/collaboratori', 'STUDENT')).toBe(false);
        expect(hasAccess('/contratti', 'STUDENT')).toBe(false);
      });

      it('should prevent collaborators from accessing admin-only pages', () => {
        expect(hasAccess('/utenti', 'COLLABORATOR')).toBe(false);
        expect(hasAccess('/collaboratori', 'COLLABORATOR')).toBe(false);
      });
    });
  });

  describe('getDefaultDashboard', () => {
    it('should return /dashboard for ADMIN', () => {
      expect(getDefaultDashboard('ADMIN')).toBe('/dashboard');
    });

    it('should return /dashboard for COLLABORATOR', () => {
      expect(getDefaultDashboard('COLLABORATOR')).toBe('/dashboard');
    });

    it('should return /dashboard for STUDENT', () => {
      expect(getDefaultDashboard('STUDENT')).toBe('/dashboard');
    });

    it('should return /dashboard for undefined', () => {
      expect(getDefaultDashboard(undefined)).toBe('/dashboard');
    });
  });

  describe('getAccessibleRoutes', () => {
    describe('ADMIN role', () => {
      it('should return all admin-accessible routes', () => {
        const routes = getAccessibleRoutes('ADMIN');
        expect(routes).toContain('/dashboard');
        expect(routes).toContain('/utenti');
        expect(routes).toContain('/collaboratori');
        expect(routes).toContain('/contratti');
      });

      it('should not include collaborator-only routes', () => {
        const routes = getAccessibleRoutes('ADMIN');
        expect(routes).not.toContain('/le-mie-assenze');
      });
    });

    describe('COLLABORATOR role', () => {
      it('should include common and staff routes', () => {
        const routes = getAccessibleRoutes('COLLABORATOR');
        expect(routes).toContain('/dashboard');
        expect(routes).toContain('/domande');
        expect(routes).toContain('/le-mie-assenze');
      });

      it('should not include admin-only routes', () => {
        const routes = getAccessibleRoutes('COLLABORATOR');
        expect(routes).not.toContain('/utenti');
        expect(routes).not.toContain('/collaboratori');
      });
    });

    describe('STUDENT role', () => {
      it('should include common and student routes', () => {
        const routes = getAccessibleRoutes('STUDENT');
        expect(routes).toContain('/dashboard');
        expect(routes).toContain('/simulazioni');
        expect(routes).toContain('/statistiche');
      });

      it('should not include staff routes', () => {
        const routes = getAccessibleRoutes('STUDENT');
        expect(routes).not.toContain('/domande');
        expect(routes).not.toContain('/studenti');
      });
    });

    describe('undefined role', () => {
      it('should return empty array for undefined', () => {
        expect(getAccessibleRoutes(undefined)).toEqual([]);
      });

      it('should return empty array for null', () => {
        expect(getAccessibleRoutes(null as unknown as string)).toEqual([]);
      });
    });
  });

  describe('isStaff', () => {
    it('should return true for ADMIN', () => {
      expect(isStaff('ADMIN')).toBe(true);
    });

    it('should return true for COLLABORATOR', () => {
      expect(isStaff('COLLABORATOR')).toBe(true);
    });

    it('should return false for STUDENT', () => {
      expect(isStaff('STUDENT')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isStaff(undefined)).toBe(false);
    });

    it('should return false for invalid role', () => {
      expect(isStaff('INVALID_ROLE')).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true for ADMIN', () => {
      expect(isAdmin('ADMIN')).toBe(true);
    });

    it('should return false for COLLABORATOR', () => {
      expect(isAdmin('COLLABORATOR')).toBe(false);
    });

    it('should return false for STUDENT', () => {
      expect(isAdmin('STUDENT')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isAdmin(undefined)).toBe(false);
    });
  });

  describe('isCollaborator', () => {
    it('should return true for COLLABORATOR', () => {
      expect(isCollaborator('COLLABORATOR')).toBe(true);
    });

    it('should return false for ADMIN', () => {
      expect(isCollaborator('ADMIN')).toBe(false);
    });

    it('should return false for STUDENT', () => {
      expect(isCollaborator('STUDENT')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isCollaborator(undefined)).toBe(false);
    });
  });

  describe('NAVIGATION_ITEMS', () => {
    describe('structure', () => {
      it('should be an array', () => {
        expect(Array.isArray(NAVIGATION_ITEMS)).toBe(true);
      });

      it('should have items with required properties', () => {
        NAVIGATION_ITEMS.forEach((item) => {
          expect(item).toHaveProperty('label');
          expect(item).toHaveProperty('href');
          expect(item).toHaveProperty('icon');
          expect(item).toHaveProperty('roles');
        });
      });

      it('should have valid hrefs starting with /', () => {
        NAVIGATION_ITEMS.forEach((item) => {
          expect(item.href.startsWith('/')).toBe(true);
        });
      });

      it('should have non-empty labels', () => {
        NAVIGATION_ITEMS.forEach((item) => {
          expect(item.label.length).toBeGreaterThan(0);
        });
      });

      it('should have valid icon names', () => {
        NAVIGATION_ITEMS.forEach((item) => {
          expect(item.icon.length).toBeGreaterThan(0);
        });
      });
    });

    describe('content', () => {
      it('should include Dashboard item', () => {
        const dashboard = NAVIGATION_ITEMS.find((i) => i.href === '/dashboard');
        expect(dashboard).toBeDefined();
        expect(dashboard?.label).toBe('Dashboard');
      });

      it('should include Calendario item', () => {
        const calendario = NAVIGATION_ITEMS.find((i) => i.href === '/calendario');
        expect(calendario).toBeDefined();
      });

      it('should include Simulazioni item', () => {
        const simulazioni = NAVIGATION_ITEMS.find((i) => i.href === '/simulazioni');
        expect(simulazioni).toBeDefined();
      });
    });
  });

  describe('getNavigationForRole', () => {
    describe('ADMIN role', () => {
      it('should return admin navigation items', () => {
        const items = getNavigationForRole('ADMIN');
        expect(items.length).toBeGreaterThan(0);
      });

      it('should include common items', () => {
        const items = getNavigationForRole('ADMIN');
        const hrefs = items.map((i) => i.href);
        expect(hrefs).toContain('/dashboard');
      });

      it('should include admin-only items', () => {
        const items = getNavigationForRole('ADMIN');
        const hrefs = items.map((i) => i.href);
        expect(hrefs).toContain('/utenti');
      });

      it('should not include collaborator-only items', () => {
        const items = getNavigationForRole('ADMIN');
        const hrefs = items.map((i) => i.href);
        expect(hrefs).not.toContain('/le-mie-assenze');
      });
    });

    describe('COLLABORATOR role', () => {
      it('should return collaborator navigation items', () => {
        const items = getNavigationForRole('COLLABORATOR');
        expect(items.length).toBeGreaterThan(0);
      });

      it('should include collaborator-specific items', () => {
        const items = getNavigationForRole('COLLABORATOR');
        const hrefs = items.map((i) => i.href);
        expect(hrefs).toContain('/le-mie-assenze');
      });

      it('should not include admin-only items', () => {
        const items = getNavigationForRole('COLLABORATOR');
        const hrefs = items.map((i) => i.href);
        expect(hrefs).not.toContain('/utenti');
      });
    });

    describe('STUDENT role', () => {
      it('should return student navigation items', () => {
        const items = getNavigationForRole('STUDENT');
        expect(items.length).toBeGreaterThan(0);
      });

      it('should include student-specific items', () => {
        const items = getNavigationForRole('STUDENT');
        const hrefs = items.map((i) => i.href);
        expect(hrefs).toContain('/statistiche');
      });

      it('should not include staff items', () => {
        const items = getNavigationForRole('STUDENT');
        const hrefs = items.map((i) => i.href);
        expect(hrefs).not.toContain('/domande');
        expect(hrefs).not.toContain('/studenti');
      });
    });

    describe('undefined role', () => {
      it('should return empty array for undefined', () => {
        expect(getNavigationForRole(undefined)).toEqual([]);
      });

      it('should return empty array for null', () => {
        expect(getNavigationForRole(null as unknown as string)).toEqual([]);
      });
    });
  });
});
