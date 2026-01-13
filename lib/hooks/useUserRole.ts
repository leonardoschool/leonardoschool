'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { hasAccess, getDefaultDashboard, getNavigationForRole, isStaff } from '@/lib/permissions';
import type { UserRole } from '@prisma/client';
import type { NavItem } from '@/lib/permissions';

// Type for the user returned by useAuth (from trpc.auth.me query)
// Use partial types since query may return partial data
type AuthUser = {
  id?: string;
  name?: string;
  firebaseUid?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  profileCompleted?: boolean;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  student?: unknown;
  admin?: unknown;
  collaborator?: unknown;
} | null | undefined;

interface UseUserRoleReturn {
  // User info
  user: AuthUser;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Role checks
  isAdmin: boolean;
  isCollaborator: boolean;
  isStudent: boolean;
  isStaff: boolean;
  
  // Permission checks
  hasAccess: (path: string) => boolean;
  canView: (roles: UserRole[]) => boolean;
  
  // Navigation
  navigation: NavItem[];
  dashboardPath: string;
  
  // Actions
  redirectToLogin: (returnPath?: string) => void;
  redirectToDashboard: () => void;
  redirectIfUnauthorized: (requiredRoles?: UserRole[]) => boolean;
}

/**
 * Hook for managing user role and permissions
 * Provides centralized access control for components
 */
export function useUserRole(): UseUserRoleReturn {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const role = (user?.role as UserRole) ?? null;
  const isLoading = authLoading || !isClient;
  const isAuthenticated = !!user && !!role;

  // Role checks
  const isAdminUser = role === 'ADMIN';
  const isCollaborator = role === 'COLLABORATOR';
  const isStudent = role === 'STUDENT';
  const isStaffUser = isStaff(role);

  // Permission check for a specific path
  const checkAccess = (path: string): boolean => {
    return hasAccess(path, role ?? undefined);
  };

  // Check if user can view content for specific roles
  const canView = (roles: UserRole[]): boolean => {
    if (!role) return false;
    return roles.includes(role);
  };

  // Get navigation items for current user
  const navigation = getNavigationForRole(role ?? undefined);

  // Get dashboard path
  const dashboardPath = getDefaultDashboard(role ?? undefined);

  // Redirect to login
  const redirectToLogin = (returnPath?: string) => {
    const loginUrl = returnPath 
      ? `/auth/login?redirect=${encodeURIComponent(returnPath)}`
      : '/auth/login';
    router.push(loginUrl);
  };

  // Redirect to dashboard
  const redirectToDashboard = () => {
    router.push(dashboardPath);
  };

  // Redirect if user doesn't have required roles
  // Returns true if redirect happened
  const redirectIfUnauthorized = (requiredRoles?: UserRole[]): boolean => {
    if (isLoading) return false;
    
    if (!isAuthenticated) {
      redirectToLogin(pathname);
      return true;
    }

    // If specific roles required, check them
    if (requiredRoles && requiredRoles.length > 0) {
      if (!role || !requiredRoles.includes(role)) {
        redirectToDashboard();
        return true;
      }
    }

    // Check general path access
    if (!checkAccess(pathname)) {
      redirectToDashboard();
      return true;
    }

    return false;
  };

  return {
    user,
    role,
    isLoading,
    isAuthenticated,
    isAdmin: isAdminUser,
    isCollaborator,
    isStudent,
    isStaff: isStaffUser,
    hasAccess: checkAccess,
    canView,
    navigation,
    dashboardPath,
    redirectToLogin,
    redirectToDashboard,
    redirectIfUnauthorized,
  };
}

/**
 * HOC-style hook for protecting pages
 * Use at the top of page components
 */
export function useRequireRole(requiredRoles?: UserRole[]) {
  const userRole = useUserRole();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (userRole.isLoading) return;

    const unauthorized = userRole.redirectIfUnauthorized(requiredRoles);
    setAuthorized(!unauthorized);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole.isLoading, userRole.isAuthenticated, userRole.role]);

  return {
    ...userRole,
    authorized,
    // Show loading or nothing while checking auth
    showContent: !userRole.isLoading && authorized,
  };
}

/**
 * Hook for conditional rendering based on role
 */
export function useRoleCheck() {
  const { role, isLoading } = useUserRole();

  return {
    isLoading,
    role,
    // Render helpers
    forAdmin: (content: React.ReactNode) => (role === 'ADMIN' ? content : null),
    forCollaborator: (content: React.ReactNode) => (role === 'COLLABORATOR' ? content : null),
    forStudent: (content: React.ReactNode) => (role === 'STUDENT' ? content : null),
    forStaff: (content: React.ReactNode) => (isStaff(role) ? content : null),
    forRoles: (roles: UserRole[], content: React.ReactNode) => 
      (role && roles.includes(role) ? content : null),
  };
}

export default useUserRole;
