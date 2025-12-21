import type { UserRole } from '@prisma/client';

/**
 * Centralized permission system for route access control
 * Used by both proxy.ts (server-side) and useUserRole hook (client-side)
 */

export type PermissionRole = 'ADMIN' | 'COLLABORATOR' | 'STUDENT';

/**
 * Page permissions mapping
 * Defines which roles can access each route
 */
export const PAGE_PERMISSIONS: Record<string, PermissionRole[]> = {
  // Common pages - all authenticated users
  '/dashboard': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  '/simulazioni': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  '/simulazioni/nuova': ['ADMIN', 'COLLABORATOR'], // Create simulation page - staff only
  '/simulazioni/risposte-aperte': ['ADMIN', 'COLLABORATOR'], // Open answer review - staff only
  '/calendario': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  '/messaggi': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  '/notifiche': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  '/materiali': ['ADMIN', 'COLLABORATOR', 'STUDENT'],
  
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
  
  // Collaborator only pages
  '/le-mie-assenze': ['COLLABORATOR'],
  
  // Student only pages
  '/il-mio-gruppo': ['STUDENT'],
  '/statistiche': ['STUDENT'],
};

/**
 * Check if a role has access to a specific path
 */
export function hasAccess(path: string, role: UserRole | string | undefined): boolean {
  if (!role) return false;
  
  // Find the matching permission entry
  // Check exact match first, then check if path starts with any permission key
  const normalizedPath = path.split('?')[0]; // Remove query params
  
  // Check exact match
  if (PAGE_PERMISSIONS[normalizedPath]) {
    return PAGE_PERMISSIONS[normalizedPath].includes(role as PermissionRole);
  }
  
  // Check prefix match (for nested routes like /simulazioni/[id])
  for (const [routePath, allowedRoles] of Object.entries(PAGE_PERMISSIONS)) {
    if (normalizedPath.startsWith(routePath + '/') || normalizedPath === routePath) {
      return allowedRoles.includes(role as PermissionRole);
    }
  }
  
  // Default: deny access if route not in permissions
  return false;
}

/**
 * Get the default dashboard path for a role
 */
export function getDefaultDashboard(_role: UserRole | string | undefined): string {
  return '/dashboard';
}

/**
 * Get all accessible routes for a role
 */
export function getAccessibleRoutes(role: UserRole | string | undefined): string[] {
  if (!role) return [];
  
  return Object.entries(PAGE_PERMISSIONS)
    .filter(([, allowedRoles]) => allowedRoles.includes(role as PermissionRole))
    .map(([path]) => path);
}

/**
 * Check if a role is staff (admin or collaborator)
 */
export function isStaff(role: UserRole | string | undefined): boolean {
  return role === 'ADMIN' || role === 'COLLABORATOR';
}

/**
 * Check if a role is admin
 */
export function isAdmin(role: UserRole | string | undefined): boolean {
  return role === 'ADMIN';
}

/**
 * Check if a role is collaborator
 */
export function isCollaborator(role: UserRole | string | undefined): boolean {
  return role === 'COLLABORATOR';
}

/**
 * Navigation items with role-based visibility
 */
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: PermissionRole[];
  badge?: string;
}

export const NAVIGATION_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', roles: ['ADMIN', 'COLLABORATOR', 'STUDENT'] },
  { label: 'Calendario', href: '/calendario', icon: 'Calendar', roles: ['ADMIN', 'COLLABORATOR', 'STUDENT'] },
  { label: 'Simulazioni', href: '/simulazioni', icon: 'FileText', roles: ['ADMIN', 'COLLABORATOR', 'STUDENT'] },
  { label: 'Materiali', href: '/materiali', icon: 'BookOpen', roles: ['ADMIN', 'COLLABORATOR', 'STUDENT'] },
  { label: 'Messaggi', href: '/messaggi', icon: 'MessageSquare', roles: ['ADMIN', 'COLLABORATOR', 'STUDENT'] },
  
  // Staff items
  { label: 'Domande', href: '/domande', icon: 'HelpCircle', roles: ['ADMIN', 'COLLABORATOR'] },
  { label: 'Tags', href: '/tags', icon: 'Tags', roles: ['ADMIN', 'COLLABORATOR'] },
  { label: 'Presenze', href: '/presenze', icon: 'ClipboardCheck', roles: ['ADMIN', 'COLLABORATOR'] },
  { label: 'Studenti', href: '/studenti', icon: 'Users', roles: ['ADMIN', 'COLLABORATOR'] },
  { label: 'Gruppi', href: '/gruppi', icon: 'UsersRound', roles: ['ADMIN', 'COLLABORATOR'] },
  
  // Admin items
  { label: 'Utenti', href: '/utenti', icon: 'UserCog', roles: ['ADMIN'] },
  { label: 'Collaboratori', href: '/collaboratori', icon: 'Briefcase', roles: ['ADMIN'] },
  { label: 'Contratti', href: '/contratti', icon: 'FileSignature', roles: ['ADMIN'] },
  { label: 'Candidature', href: '/candidature', icon: 'UserPlus', roles: ['ADMIN'] },
  { label: 'Assenze', href: '/assenze', icon: 'CalendarX', roles: ['ADMIN'] },
  { label: 'Richieste', href: '/richieste', icon: 'Inbox', roles: ['ADMIN'] },
  
  // Collaborator items
  { label: 'Le mie Assenze', href: '/le-mie-assenze', icon: 'CalendarX', roles: ['COLLABORATOR'] },
  
  // Student items
  { label: 'Il mio Gruppo', href: '/il-mio-gruppo', icon: 'Users', roles: ['STUDENT'] },
  { label: 'Statistiche', href: '/statistiche', icon: 'BarChart3', roles: ['STUDENT'] },
];

/**
 * Get navigation items for a specific role
 */
export function getNavigationForRole(role: UserRole | string | undefined): NavItem[] {
  if (!role) return [];
  
  return NAVIGATION_ITEMS.filter(item => 
    item.roles.includes(role as PermissionRole)
  );
}
