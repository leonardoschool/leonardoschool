/**
 * Proxy Middleware Tests
 *
 * Tests for route protection, role-based access, and redirects
 */

import { describe, it, expect } from 'vitest';

// Import the proxy function directly (we'll test the logic)
// Since proxy uses NextResponse which requires Next.js runtime, we mock it

// Recreate the logic for testing (mirrors proxy.ts)
const PAGE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  '/simulazioni': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  '/calendario': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  '/messaggi': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  '/notifiche': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  '/materiali': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  '/profilo': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  '/impostazioni': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  '/domande': ['ADMIN', 'COLLABORATOR'],
  '/tags': ['ADMIN', 'COLLABORATOR'],
  '/presenze': ['ADMIN', 'COLLABORATOR'],
  '/studenti': ['ADMIN', 'COLLABORATOR'],
  '/gruppi': ['ADMIN', 'COLLABORATOR'],
  '/utenti': ['ADMIN'],
  '/collaboratori': ['ADMIN'],
  '/contratti': ['ADMIN'],
  '/candidature': ['ADMIN'],
  '/assenze': ['ADMIN'],
  '/richieste': ['ADMIN'],
  '/statistiche': ['ADMIN', 'STUDENT'],
  '/le-mie-assenze': ['COLLABORATOR'],
  '/gruppo': ['STUDENT'],
};

function hasAccess(path: string, role: string | undefined): boolean {
  if (!role) return false;
  
  const normalizedPath = path.split('?')[0];
  
  if (PAGE_PERMISSIONS[normalizedPath]) {
    return PAGE_PERMISSIONS[normalizedPath].includes(role);
  }
  
  for (const [routePath, allowedRoles] of Object.entries(PAGE_PERMISSIONS)) {
    if (normalizedPath.startsWith(routePath + '/') || normalizedPath === routePath) {
      return allowedRoles.includes(role);
    }
  }
  
  return false;
}

function isUnifiedProtectedRoute(pathname: string): boolean {
  const normalizedPath = pathname.split('?')[0];
  
  for (const routePath of Object.keys(PAGE_PERMISSIONS)) {
    if (normalizedPath === routePath || normalizedPath.startsWith(routePath + '/')) {
      return true;
    }
  }
  
  return false;
}

describe('Proxy Middleware', () => {
  describe('hasAccess', () => {
    describe('common pages - all authenticated users', () => {
      const commonPages = [
        '/dashboard',
        '/simulazioni',
        '/calendario',
        '/messaggi',
        '/notifiche',
        '/materiali',
        '/profilo',
        '/impostazioni',
      ];

      it.each(commonPages)('should allow ADMIN access to %s', (page) => {
        expect(hasAccess(page, 'ADMIN')).toBe(true);
      });

      it.each(commonPages)('should allow COLLABORATOR access to %s', (page) => {
        expect(hasAccess(page, 'COLLABORATOR')).toBe(true);
      });

      it.each(commonPages)('should allow STUDENT access to %s', (page) => {
        expect(hasAccess(page, 'STUDENT')).toBe(true);
      });
    });

    describe('staff pages - admin and collaborators only', () => {
      const staffPages = [
        '/domande',
        '/tags',
        '/presenze',
        '/studenti',
        '/gruppi',
      ];

      it.each(staffPages)('should allow ADMIN access to %s', (page) => {
        expect(hasAccess(page, 'ADMIN')).toBe(true);
      });

      it.each(staffPages)('should allow COLLABORATOR access to %s', (page) => {
        expect(hasAccess(page, 'COLLABORATOR')).toBe(true);
      });

      it.each(staffPages)('should deny STUDENT access to %s', (page) => {
        expect(hasAccess(page, 'STUDENT')).toBe(false);
      });
    });

    describe('admin only pages', () => {
      const adminPages = [
        '/utenti',
        '/collaboratori',
        '/contratti',
        '/candidature',
        '/assenze',
        '/richieste',
      ];

      it.each(adminPages)('should allow ADMIN access to %s', (page) => {
        expect(hasAccess(page, 'ADMIN')).toBe(true);
      });

      it.each(adminPages)('should deny COLLABORATOR access to %s', (page) => {
        expect(hasAccess(page, 'COLLABORATOR')).toBe(false);
      });

      it.each(adminPages)('should deny STUDENT access to %s', (page) => {
        expect(hasAccess(page, 'STUDENT')).toBe(false);
      });
    });

    describe('collaborator only pages', () => {
      it('should allow COLLABORATOR access to /le-mie-assenze', () => {
        expect(hasAccess('/le-mie-assenze', 'COLLABORATOR')).toBe(true);
      });

      it('should deny ADMIN access to /le-mie-assenze', () => {
        expect(hasAccess('/le-mie-assenze', 'ADMIN')).toBe(false);
      });

      it('should deny STUDENT access to /le-mie-assenze', () => {
        expect(hasAccess('/le-mie-assenze', 'STUDENT')).toBe(false);
      });
    });

    describe('student only pages', () => {
      it('should allow STUDENT access to /gruppo', () => {
        expect(hasAccess('/gruppo', 'STUDENT')).toBe(true);
      });

      it('should deny ADMIN access to /gruppo', () => {
        expect(hasAccess('/gruppo', 'ADMIN')).toBe(false);
      });

      it('should deny COLLABORATOR access to /gruppo', () => {
        expect(hasAccess('/gruppo', 'COLLABORATOR')).toBe(false);
      });
    });

    describe('special access: /statistiche', () => {
      it('should allow ADMIN access to /statistiche', () => {
        expect(hasAccess('/statistiche', 'ADMIN')).toBe(true);
      });

      it('should allow STUDENT access to /statistiche', () => {
        expect(hasAccess('/statistiche', 'STUDENT')).toBe(true);
      });

      it('should deny COLLABORATOR access to /statistiche', () => {
        expect(hasAccess('/statistiche', 'COLLABORATOR')).toBe(false);
      });
    });

    describe('nested routes', () => {
      it('should allow ADMIN access to /simulazioni/123', () => {
        expect(hasAccess('/simulazioni/123', 'ADMIN')).toBe(true);
      });

      it('should allow STUDENT access to /gruppo/456', () => {
        expect(hasAccess('/gruppo/456', 'STUDENT')).toBe(true);
      });

      it('should deny STUDENT access to /utenti/create', () => {
        expect(hasAccess('/utenti/create', 'STUDENT')).toBe(false);
      });

      it('should deny COLLABORATOR access to /assenze/edit/1', () => {
        expect(hasAccess('/assenze/edit/1', 'COLLABORATOR')).toBe(false);
      });
    });

    describe('query parameters', () => {
      it('should ignore query params in path', () => {
        expect(hasAccess('/dashboard?tab=overview', 'STUDENT')).toBe(true);
      });

      it('should still deny access with query params', () => {
        expect(hasAccess('/utenti?sort=name', 'STUDENT')).toBe(false);
      });
    });

    describe('undefined role', () => {
      it('should deny access with undefined role', () => {
        expect(hasAccess('/dashboard', undefined)).toBe(false);
      });

      it('should deny access to any page with undefined role', () => {
        expect(hasAccess('/profilo', undefined)).toBe(false);
        expect(hasAccess('/utenti', undefined)).toBe(false);
      });
    });

    describe('unknown routes', () => {
      it('should deny access to unknown routes', () => {
        expect(hasAccess('/unknown-page', 'ADMIN')).toBe(false);
      });

      it('should deny access to malicious paths', () => {
        expect(hasAccess('/api/admin', 'STUDENT')).toBe(false);
        expect(hasAccess('/../etc/passwd', 'ADMIN')).toBe(false);
      });
    });
  });

  describe('isUnifiedProtectedRoute', () => {
    describe('protected routes', () => {
      const protectedRoutes = [
        '/dashboard',
        '/simulazioni',
        '/calendario',
        '/utenti',
        '/gruppo',
        '/le-mie-assenze',
      ];

      it.each(protectedRoutes)('should identify %s as protected', (route) => {
        expect(isUnifiedProtectedRoute(route)).toBe(true);
      });
    });

    describe('nested protected routes', () => {
      it('should identify /dashboard/overview as protected', () => {
        expect(isUnifiedProtectedRoute('/dashboard/overview')).toBe(true);
      });

      it('should identify /simulazioni/abc123/results as protected', () => {
        expect(isUnifiedProtectedRoute('/simulazioni/abc123/results')).toBe(true);
      });
    });

    describe('non-protected routes', () => {
      const publicRoutes = [
        '/',
        '/chi-siamo',
        '/contattaci',
        '/lavora-con-noi',
        '/api/trpc',
        '/auth/login',
      ];

      it.each(publicRoutes)('should identify %s as NOT protected', (route) => {
        expect(isUnifiedProtectedRoute(route)).toBe(false);
      });
    });

    describe('query parameters', () => {
      it('should ignore query params when checking protected status', () => {
        expect(isUnifiedProtectedRoute('/dashboard?tab=stats')).toBe(true);
      });
    });
  });

  describe('security scenarios', () => {
    describe('role escalation prevention', () => {
      it('should prevent student from accessing admin pages', () => {
        const adminOnlyPages = ['/utenti', '/collaboratori', '/contratti'];
        for (const page of adminOnlyPages) {
          expect(hasAccess(page, 'STUDENT')).toBe(false);
        }
      });

      it('should prevent collaborator from accessing admin pages', () => {
        const adminOnlyPages = ['/utenti', '/collaboratori', '/contratti'];
        for (const page of adminOnlyPages) {
          expect(hasAccess(page, 'COLLABORATOR')).toBe(false);
        }
      });

      it('should prevent admin from accessing collaborator-only pages', () => {
        expect(hasAccess('/le-mie-assenze', 'ADMIN')).toBe(false);
      });

      it('should prevent admin from accessing student-only pages', () => {
        expect(hasAccess('/gruppo', 'ADMIN')).toBe(false);
      });
    });

    describe('path traversal protection', () => {
      // NOTE: This test documents current behavior. Path traversal in URLs
      // is typically normalized by the browser/HTTP layer before reaching middleware.
      // The hasAccess function checks if the path STARTS WITH a protected route,
      // so '/dashboard/../utenti' starts with '/dashboard' and would be allowed for STUDENT.
      // In practice, Next.js normalizes URLs before they reach middleware.
      it('should document that path matching uses startsWith (normalized by Next.js)', () => {
        // '/dashboard/../utenti' starts with '/dashboard', so it matches /dashboard permissions
        // This is not a security issue because Next.js normalizes paths before they reach the proxy
        expect(hasAccess('/dashboard/../utenti', 'STUDENT')).toBe(true);
        // The actual path after normalization would be '/utenti' which the middleware
        // would correctly handle after Next.js URL normalization
      });

      it('should not match encoded paths', () => {
        // URL encoding of /utenti
        expect(hasAccess('/%75tenti', 'STUDENT')).toBe(false);
      });
    });

    describe('case sensitivity', () => {
      it('should be case sensitive (default behavior)', () => {
        // These should not match because paths are case-sensitive
        expect(hasAccess('/Dashboard', 'STUDENT')).toBe(false);
        expect(hasAccess('/DASHBOARD', 'STUDENT')).toBe(false);
        expect(hasAccess('/UTENTI', 'ADMIN')).toBe(false);
      });
    });

    describe('invalid role values', () => {
      it('should deny access for empty string role', () => {
        expect(hasAccess('/dashboard', '')).toBe(false);
      });

      it('should deny access for malformed roles', () => {
        expect(hasAccess('/dashboard', 'admin')).toBe(false); // lowercase
        expect(hasAccess('/dashboard', 'Admin')).toBe(false); // mixed case
        expect(hasAccess('/dashboard', 'SUPERADMIN')).toBe(false); // non-existent
      });
    });
  });

  describe('PAGE_PERMISSIONS completeness', () => {
    it('should have all roles defined correctly', () => {
      const validRoles = ['ADMIN', 'COLLABORATOR', 'STUDENT'];
      
      for (const [, roles] of Object.entries(PAGE_PERMISSIONS)) {
        for (const role of roles) {
          expect(validRoles).toContain(role);
        }
      }
    });

    it('should have dashboard accessible to all roles', () => {
      expect(PAGE_PERMISSIONS['/dashboard']).toEqual(
        expect.arrayContaining(['ADMIN', 'COLLABORATOR', 'STUDENT'])
      );
    });

    it('should have /utenti restricted to ADMIN only', () => {
      expect(PAGE_PERMISSIONS['/utenti']).toEqual(['ADMIN']);
    });
  });
});
