import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Centralized route permission checking
 * Matches the PAGE_PERMISSIONS in lib/permissions.ts
 */
const PAGE_PERMISSIONS: Record<string, string[]> = {
  // Common pages - all authenticated users
  '/dashboard': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  '/simulazioni': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  '/calendario': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  '/messaggi': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  '/notifiche': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  '/materiali': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  '/profilo': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  '/impostazioni': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  
  // Staff pages - admin and collaborators
  '/domande': ['ADMIN', 'COLLABORATOR'],
  '/tags': ['ADMIN', 'COLLABORATOR'],
  '/presenze': ['ADMIN', 'COLLABORATOR'],
  '/studenti': ['ADMIN', 'COLLABORATOR'],
  '/gruppi': ['ADMIN', 'COLLABORATOR'],
  
  // Admin only pages
  '/utenti': ['ADMIN'],
  '/collaboratori': ['ADMIN'],
  '/contratti': ['ADMIN'],
  '/candidature': ['ADMIN'],
  '/assenze': ['ADMIN'],
  '/richieste': ['ADMIN'],
  '/statistiche': ['ADMIN', 'STUDENT'], // Admin and Student only
  
  // Collaborator only pages
  '/le-mie-assenze': ['COLLABORATOR'],
  
  // Student only pages
  '/gruppo': ['STUDENT'],
};

/**
 * Check if a role has access to a specific path
 */
function hasAccess(path: string, role: string | undefined): boolean {
  if (!role) return false;
  
  const normalizedPath = path.split('?')[0]; // Remove query params
  
  // Check exact match
  if (PAGE_PERMISSIONS[normalizedPath]) {
    return PAGE_PERMISSIONS[normalizedPath].includes(role);
  }
  
  // Check prefix match (for nested routes like /simulazioni/[id])
  for (const [routePath, allowedRoles] of Object.entries(PAGE_PERMISSIONS)) {
    if (normalizedPath.startsWith(routePath + '/') || normalizedPath === routePath) {
      return allowedRoles.includes(role);
    }
  }
  
  return false;
}

/**
 * Check if a path is a protected unified route
 */
function isUnifiedProtectedRoute(pathname: string): boolean {
  const normalizedPath = pathname.split('?')[0];
  
  // Check if path matches any unified route
  for (const routePath of Object.keys(PAGE_PERMISSIONS)) {
    if (normalizedPath === routePath || normalizedPath.startsWith(routePath + '/')) {
      return true;
    }
  }
  
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get auth token and user data from cookies
  const authToken = request.cookies.get('auth-token')?.value;
  const userRole = request.cookies.get('user-role')?.value;
  const profileCompleted = request.cookies.get('profile-completed')?.value === 'true';
  
  // Check if it's a protected route
  const isProtectedRoute = isUnifiedProtectedRoute(pathname);
  const isContractSignRoute = pathname.startsWith('/contratto');
  
  // Protect private application routes
  if (isProtectedRoute) {
    if (!authToken) {
      // Not authenticated, redirect to login
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Check if student/collaborator has completed profile (skip for admins)
    if ((userRole === 'STUDENT' || userRole === 'COLLABORATOR') && !profileCompleted && !pathname.startsWith('/auth/complete-profile')) {
      // Profile incomplete, redirect to complete profile page
      return NextResponse.redirect(new URL('/auth/complete-profile', request.url));
    }
    
    // Check role-based access using PAGE_PERMISSIONS
    if (!hasAccess(pathname, userRole)) {
      // User doesn't have access to this route, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  // Contract signing page - requires authentication but any role can access
  if (isContractSignRoute) {
    if (!authToken) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // If authenticated and trying to access auth pages (except complete-profile), redirect to dashboard
  if (authToken && pathname.startsWith('/auth') && !pathname.startsWith('/auth/complete-profile')) {
    // If user with incomplete profile, allow access to complete-profile
    if ((userRole === 'STUDENT' || userRole === 'COLLABORATOR') && !profileCompleted) {
      return NextResponse.redirect(new URL('/auth/complete-profile', request.url));
    }
    
    // Redirect to unified dashboard (instead of role-specific)
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // If user with completed profile tries to access complete-profile page, redirect to dashboard
  // Also redirect ADMIN users - they never need to complete profile
  if (authToken && pathname.startsWith('/auth/complete-profile')) {
    if (userRole === 'ADMIN' || profileCompleted) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Unified routes (role-based content via components)
    '/dashboard/:path*',
    '/simulazioni/:path*',
    '/calendario/:path*',
    '/messaggi/:path*',
    '/notifiche/:path*',
    '/materiali/:path*',
    '/profilo/:path*',
    '/impostazioni/:path*',
    '/domande/:path*',
    '/tags/:path*',
    '/presenze/:path*',
    '/studenti/:path*',
    '/gruppi/:path*',
    '/utenti/:path*',
    '/collaboratori/:path*',
    '/contratti/:path*',
    '/candidature/:path*',
    '/assenze/:path*',
    '/richieste/:path*',
    '/le-mie-assenze/:path*',
    '/gruppo/:path*',
    '/statistiche/:path*',
    // Other protected routes
    '/contratto/:path*',
    '/auth/:path*',
  ],
};
