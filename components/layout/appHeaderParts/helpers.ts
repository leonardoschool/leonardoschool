import {
  Home,
  Calendar,
  BarChart3,
  ClipboardList,
  FolderOpen,
  UsersRound,
  Users,
  FileSignature,
  Briefcase,
  Mail,
  GraduationCap,
  ClipboardCheck,
  UserMinus,
  BookOpen,
  Tag,
} from 'lucide-react';
import type { NavItem } from './types';

// Get notification navigation URL based on type and role
export function getNotificationNavigationUrl(
  notificationType: string,
  linkUrl: string | null | undefined,
  isAdmin: boolean
): string {
  if (linkUrl) return linkUrl;

  const contractTypes = ['CONTRACT_ASSIGNED', 'CONTRACT_SIGNED', 'CONTRACT_REMINDER', 'CONTRACT_EXPIRED', 'CONTRACT_CANCELLED'];
  if (contractTypes.includes(notificationType) && isAdmin) {
    return '/contratti';
  }

  const simulationTypes = ['SIMULATION_ASSIGNED', 'SIMULATION_REMINDER', 'SIMULATION_READY', 'SIMULATION_STARTED', 'SIMULATION_RESULTS', 'SIMULATION_COMPLETED'];
  if (simulationTypes.includes(notificationType)) {
    return '/simulazioni';
  }

  const eventTypes = ['EVENT_INVITATION', 'EVENT_REMINDER', 'EVENT_UPDATED', 'EVENT_CANCELLED'];
  if (eventTypes.includes(notificationType)) {
    return '/calendario';
  }

  const accountTypes = ['ACCOUNT_ACTIVATED', 'PROFILE_COMPLETED', 'NEW_REGISTRATION'];
  if (accountTypes.includes(notificationType) && isAdmin) {
    return '/utenti';
  }

  switch (notificationType) {
    case 'JOB_APPLICATION':
      return isAdmin ? '/candidature' : '/dashboard';
    case 'CONTACT_REQUEST':
      return isAdmin ? '/richieste' : '/dashboard';
    case 'MATERIAL_AVAILABLE':
      return '/materiali';
    case 'MESSAGE_RECEIVED':
      return '/messaggi';
    default:
      return '/dashboard';
  }
}

// Get navigation items based on role
export function getNavigationItems(isAdmin: boolean, isCollaborator: boolean, isStudent: boolean): NavItem[] {
  const adminNavItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/calendario', label: 'Calendario', icon: Calendar },
    { href: '/statistiche', label: 'Statistiche', icon: BarChart3 },
  ];

  const collaboratorNavItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/calendario', label: 'Calendario', icon: Calendar },
  ];

  const studentNavItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/calendario', label: 'Calendario', icon: Calendar },
    { href: '/simulazioni', label: 'Simulazioni', icon: ClipboardList },
    { href: '/materiali', label: 'Materiale Didattico', icon: FolderOpen },
    { href: '/statistiche', label: 'Statistiche', icon: BarChart3 },
    { href: '/gruppo', label: 'Il Mio Gruppo', icon: UsersRound },
  ];

  if (isAdmin) return adminNavItems;
  if (isCollaborator) return collaboratorNavItems;
  if (isStudent) return studentNavItems;
  return [];
}

// Check if collaborator can navigate
export function checkCollaboratorNavigation(
  isCollaborator: boolean,
  isActive: boolean | undefined,
  contractStatus: string | undefined
): boolean {
  if (!isCollaborator) return true;
  
  const hasPendingContract = contractStatus === 'PENDING';
  const hasSignedContract = contractStatus === 'SIGNED';
  const hasNoContract = !contractStatus;
  
  return Boolean(isActive && (hasSignedContract || (hasNoContract && !hasPendingContract)));
}

// Get role badge text
export function getRoleBadgeText(isAdmin: boolean, isCollaborator: boolean): string {
  if (isAdmin) return '👑 Amministratore';
  if (isCollaborator) return '🤝 Collaboratore';
  return '📚 Studente';
}

// Format notification time
export function formatNotificationTime(date: Date | string): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Ora';
  if (minutes < 60) return `${minutes}m fa`;
  if (hours < 24) return `${hours}h fa`;
  return `${days}g fa`;
}

// Menu items for each section
export function getGestioneItems(isAdmin: boolean): NavItem[] {
  const adminItems: NavItem[] = [
    { href: '/utenti', label: 'Utenti', icon: Users },
    { href: '/gruppi', label: 'Gruppi', icon: UsersRound },
    { href: '/contratti', label: 'Contratti', icon: FileSignature },
    { href: '/candidature', label: 'Candidature', icon: Briefcase },
    { href: '/richieste', label: 'Richieste', icon: Mail },
  ];

  const collaboratorItems: NavItem[] = [
    { href: '/studenti', label: 'Studenti', icon: GraduationCap },
    { href: '/gruppi', label: 'Gruppi', icon: UsersRound },
  ];

  return isAdmin ? adminItems : collaboratorItems;
}

export function getRegistroItems(isAdmin: boolean): NavItem[] {
  const adminItems: NavItem[] = [
    { href: '/presenze', label: 'Registro Elettronico', icon: ClipboardCheck },
    { href: '/assenze', label: 'Assenze Staff', icon: UserMinus },
  ];

  const collaboratorItems: NavItem[] = [
    { href: '/presenze', label: 'Registro Elettronico', icon: ClipboardCheck },
    { href: '/le-mie-assenze', label: 'Le Mie Assenze', icon: UserMinus },
  ];

  return isAdmin ? adminItems : collaboratorItems;
}

export function getDidatticaItems(isAdmin: boolean): NavItem[] {
  const adminItems: NavItem[] = [
    { href: '/domande', label: 'Domande', icon: BookOpen },
    { href: '/tags', label: 'Tag', icon: Tag },
    { href: '/materiali', label: 'Materie & Materiali', icon: FolderOpen },
    { href: '/simulazioni', label: 'Simulazioni', icon: ClipboardList },
  ];

  const collaboratorItems: NavItem[] = [
    { href: '/domande', label: 'Domande', icon: BookOpen },
    { href: '/tags', label: 'Tag', icon: Tag },
    { href: '/materiali', label: 'Materiali', icon: FolderOpen },
    { href: '/simulazioni', label: 'Simulazioni', icon: ClipboardList },
  ];

  return isAdmin ? adminItems : collaboratorItems;
}

// Get badge count for gestione items (admin only)
export function getGestioneBadgeCount(
  itemHref: string,
  isAdmin: boolean,
  pendingContractUsersCount: number,
  pendingApplicationsCount: number,
  pendingContactRequestsCount: number
): number {
  if (!isAdmin) return 0;
  if (itemHref === '/utenti') return pendingContractUsersCount;
  if (itemHref === '/candidature') return pendingApplicationsCount;
  if (itemHref === '/richieste') return pendingContactRequestsCount;
  return 0;
}
