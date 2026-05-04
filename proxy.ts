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

/** Paths allowed while user is waiting for contract assignment */
const WAITING_PATHS = ['/dashboard', '/profilo', '/impostazioni'];

/** Roles that require profile completion */
const ROLES_REQUIRING_PROFILE = new Set(['STUDENT', 'COLLABORATOR']);

// ============================================================================
// Helper Types
// ============================================================================

interface UserContext {
  authToken: string | undefined;
  userRole: string | undefined;
  profileCompleted: boolean;
  parentDataRequired: boolean;
  userActive: boolean;
  pendingContract: string | undefined;
}

// ============================================================================
// Route Checking Functions
// ============================================================================

/**
 * Check if a role has access to a specific path
 */
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

/**
 * Check if a path is a protected unified route
 */
function isUnifiedProtectedRoute(pathname: string): boolean {
  const normalizedPath = pathname.split('?')[0];
  
  for (const routePath of Object.keys(PAGE_PERMISSIONS)) {
    if (normalizedPath === routePath || normalizedPath.startsWith(routePath + '/')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if user role requires profile completion
 */
function requiresProfileCompletion(role: string | undefined): boolean {
  return role !== undefined && ROLES_REQUIRING_PROFILE.has(role);
}

/**
 * Check if path is in the allowed waiting paths list
 */
function isAllowedWaitingPath(pathname: string): boolean {
  return WAITING_PATHS.some(path => pathname.startsWith(path));
}

// ============================================================================
// Redirect Helper Functions
// ============================================================================

/**
 * Create redirect to login page with optional redirect param
 */
function redirectToLogin(request: NextRequest, redirectPath?: string, error?: string): NextResponse {
  const loginUrl = new URL('/auth/login', request.url);
  if (redirectPath) {
    loginUrl.searchParams.set('redirect', redirectPath);
  }
  if (error) {
    loginUrl.searchParams.set('error', error);
  }
  return NextResponse.redirect(loginUrl);
}

/**
 * Create redirect to dashboard
 */
function redirectToDashboard(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL('/dashboard', request.url));
}

/**
 * Create redirect to complete profile page
 */
function redirectToCompleteProfile(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL('/auth/complete-profile', request.url));
}

/**
 * Create redirect to profile page with parent section
 */
function redirectToProfileParent(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL('/profilo?section=genitore', request.url));
}

/**
 * Create redirect to contract signing page
 */
function redirectToContract(request: NextRequest, contractToken: string): NextResponse {
  return NextResponse.redirect(new URL(`/contratto/${contractToken}`, request.url));
}

// ============================================================================
// Protected Route Handlers
// ============================================================================

/**
 * Handle incomplete profile redirect
 */
function handleIncompleteProfile(
  request: NextRequest,
  pathname: string,
  ctx: UserContext
): NextResponse | null {
  if (!requiresProfileCompletion(ctx.userRole) || ctx.profileCompleted) {
    return null;
  }
  
  if (!pathname.startsWith('/auth/complete-profile')) {
    return redirectToCompleteProfile(request);
  }
  
  return NextResponse.next();
}

/**
 * Handle parent data required redirect for students
 */
function handleParentDataRequired(
  request: NextRequest,
  pathname: string,
  ctx: UserContext
): NextResponse | null {
  if (ctx.userRole !== 'STUDENT' || !ctx.parentDataRequired) {
    return null;
  }
  
  if (!pathname.startsWith('/profilo') && !pathname.startsWith('/auth/complete-profile')) {
    return redirectToProfileParent(request);
  }
  
  return NextResponse.next();
}

/**
 * Handle pending contract redirect
 */
function handlePendingContract(
  request: NextRequest,
  pathname: string,
  ctx: UserContext
): NextResponse | null {
  if (!ctx.pendingContract || !requiresProfileCompletion(ctx.userRole)) {
    return null;
  }
  
  if (!pathname.startsWith('/contratto')) {
    return redirectToContract(request, ctx.pendingContract);
  }
  
  return NextResponse.next();
}

/**
 * Handle user waiting for contract assignment (not yet active)
 */
function handleWaitingForContract(
  request: NextRequest,
  pathname: string,
  ctx: UserContext
): NextResponse | null {
  const isWaitingForContract = !ctx.userActive && 
    requiresProfileCompletion(ctx.userRole) && 
    !ctx.pendingContract;
  
  if (!isWaitingForContract) {
    return null;
  }
  
  if (!isAllowedWaitingPath(pathname)) {
    return redirectToDashboard(request);
  }
  
  return NextResponse.next();
}

/**
 * Handle deactivated account
 */
function handleDeactivatedAccount(request: NextRequest, ctx: UserContext): NextResponse | null {
  if (ctx.userActive) {
    return null;
  }
  
  return redirectToLogin(request, undefined, 'account-deactivated');
}

// ============================================================================
// Main Proxy Function
// ============================================================================

/**
 * Extract user context from request cookies
 */
function getUserContext(request: NextRequest): UserContext {
  return {
    authToken: request.cookies.get('auth-token')?.value,
    userRole: request.cookies.get('user-role')?.value,
    profileCompleted: request.cookies.get('profile-completed')?.value === 'true',
    parentDataRequired: request.cookies.get('parent-data-required')?.value === 'true',
    userActive: request.cookies.get('user-active')?.value !== 'false',
    pendingContract: request.cookies.get('pending-contract')?.value,
  };
}

/**
 * Handle protected route access checks
 * Returns a response if access should be denied/redirected, null if allowed
 */
function handleProtectedRoute(
  request: NextRequest,
  pathname: string,
  ctx: UserContext
): NextResponse | null {
  // Check each condition in order of priority
  const handlers = [
    () => handleIncompleteProfile(request, pathname, ctx),
    () => handleParentDataRequired(request, pathname, ctx),
    () => handlePendingContract(request, pathname, ctx),
    () => handleWaitingForContract(request, pathname, ctx),
    () => handleDeactivatedAccount(request, ctx),
  ];

  for (const handler of handlers) {
    const result = handler();
    if (result) return result;
  }

  // Check role-based access
  if (!hasAccess(pathname, ctx.userRole)) {
    return redirectToDashboard(request);
  }

  return null;
}

/**
 * Handle authenticated user on auth pages
 */
function handleAuthPageAccess(
  request: NextRequest,
  pathname: string,
  ctx: UserContext
): NextResponse | null {
  // Skip complete-profile page
  if (pathname.startsWith('/auth/complete-profile')) {
    return null;
  }

  // If account is deactivated and not waiting for parent data, let them see login
  if (!ctx.userActive && !(ctx.userRole === 'STUDENT' && ctx.parentDataRequired)) {
    return NextResponse.next();
  }

  // If user with incomplete profile, redirect to complete-profile
  if (requiresProfileCompletion(ctx.userRole) && !ctx.profileCompleted) {
    return redirectToCompleteProfile(request);
  }

  // Redirect to dashboard
  return redirectToDashboard(request);
}

/**
 * Handle complete-profile page access
 */
function handleCompleteProfileAccess(
  request: NextRequest,
  ctx: UserContext
): NextResponse | null {
  const isEditMode = request.nextUrl.searchParams.get('edit') === 'true';
  const isParentDataMode = request.nextUrl.searchParams.get('parentData') === 'true';

  // Admins never need to complete profile
  if (ctx.userRole === 'ADMIN') {
    return redirectToDashboard(request);
  }

  // Check if user should be redirected away from complete-profile
  const hasSpecialAccess = isEditMode || 
    isParentDataMode || 
    (ctx.userRole === 'STUDENT' && ctx.parentDataRequired);

  if (ctx.profileCompleted && !hasSpecialAccess) {
    return redirectToDashboard(request);
  }

  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ctx = getUserContext(request);

  const isProtectedRoute = isUnifiedProtectedRoute(pathname);
  const isContractSignRoute = pathname.startsWith('/contratto');
  const isAuthPage = pathname.startsWith('/auth');

  // Handle protected routes
  if (isProtectedRoute) {
    if (!ctx.authToken) {
      return redirectToLogin(request, pathname);
    }
    const protectedResult = handleProtectedRoute(request, pathname, ctx);
    if (protectedResult) return protectedResult;
  }

  // Contract signing page - requires authentication
  if (isContractSignRoute && !ctx.authToken) {
    return redirectToLogin(request, pathname);
  }

  // Handle authenticated user on auth pages
  if (ctx.authToken && isAuthPage) {
    const authResult = handleAuthPageAccess(request, pathname, ctx);
    if (authResult) return authResult;
  }

  // Handle complete-profile page access for authenticated users
  if (ctx.authToken && pathname.startsWith('/auth/complete-profile')) {
    const completeProfileResult = handleCompleteProfileAccess(request, ctx);
    if (completeProfileResult) return completeProfileResult;
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
