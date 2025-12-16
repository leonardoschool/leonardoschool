/**
 * Notification Configuration - Sistema centralizzato per la configurazione delle notifiche
 * 
 * Questo file definisce:
 * - Categorie di notifiche (per organizzazione UI)
 * - Icone e colori per ogni tipo di notifica
 * - Logica di navigazione al click sulla notifica
 * - Templates di messaggi standardizzati
 * 
 * @example
 * import { getNotificationConfig, getNotificationRoute } from '@/lib/notifications/notificationConfig';
 * 
 * const config = getNotificationConfig('CONTRACT_SIGNED');
 * const route = getNotificationRoute('CONTRACT_SIGNED', 'ADMIN', { entityId: '123' });
 */

import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Check,
  AlertTriangle,
  FileText,
  UserCheck,
  UserPlus,
  Briefcase,
  Mail,
  FileSignature,
  XCircle,
  Calendar,
  ClipboardCheck,
  FolderOpen,
  MessageSquare,
  BookOpen,
  Users,
  GraduationCap,
  Clock,
  CheckCircle2,
  Ban,
  UserMinus,
  PlayCircle,
  Trophy,
} from 'lucide-react';

// ==================== TYPES ====================

export type NotificationType =
  // Account & Auth
  | 'ACCOUNT_ACTIVATED'
  | 'NEW_REGISTRATION'
  | 'PROFILE_COMPLETED'
  // Contracts
  | 'CONTRACT_ASSIGNED'
  | 'CONTRACT_SIGNED'
  | 'CONTRACT_REMINDER'
  | 'CONTRACT_EXPIRED'
  | 'CONTRACT_CANCELLED'
  // Events & Calendar
  | 'EVENT_INVITATION'
  | 'EVENT_REMINDER'
  | 'EVENT_UPDATED'
  | 'EVENT_CANCELLED'
  // Simulations
  | 'SIMULATION_ASSIGNED'
  | 'SIMULATION_REMINDER'
  | 'SIMULATION_READY'
  | 'SIMULATION_STARTED'
  | 'SIMULATION_RESULTS'
  | 'SIMULATION_COMPLETED'
  // Staff Absences
  | 'STAFF_ABSENCE'
  | 'ABSENCE_REQUEST'
  | 'ABSENCE_CONFIRMED'
  | 'ABSENCE_REJECTED'
  | 'SUBSTITUTION_ASSIGNED'
  // Questions & Answers
  | 'QUESTION_FEEDBACK'
  | 'OPEN_ANSWER_TO_REVIEW'
  // Materials
  | 'MATERIAL_AVAILABLE'
  // Groups
  | 'GROUP_MEMBER_ADDED'
  | 'GROUP_REFERENT_ASSIGNED'
  // Messaging
  | 'MESSAGE_RECEIVED'
  // Applications & Contacts
  | 'JOB_APPLICATION'
  | 'CONTACT_REQUEST'
  // Attendance
  | 'ATTENDANCE_RECORDED'
  // System
  | 'SYSTEM_ALERT'
  | 'GENERAL';

export type NotificationCategory =
  | 'account'
  | 'contract'
  | 'event'
  | 'simulation'
  | 'absence'
  | 'question'
  | 'material'
  | 'group'
  | 'message'
  | 'application'
  | 'attendance'
  | 'system';

export type UserRole = 'ADMIN' | 'COLLABORATOR' | 'STUDENT';

export interface NotificationConfig {
  // Categorizzazione
  category: NotificationCategory;
  
  // Styling
  icon: LucideIcon;
  iconBgClass: string;
  iconColorClass: string;
  
  // Se la notifica può essere urgente di default
  canBeUrgent: boolean;
  
  // Se la notifica dovrebbe inviare anche email
  defaultSendEmail: boolean;
}

export interface RouteParams {
  entityId?: string;
  conversationId?: string;
  simulationId?: string;
  eventId?: string;
  contractId?: string;
  questionId?: string;
  studentId?: string;
  applicationId?: string;
  requestId?: string;
}

// ==================== NOTIFICATION CONFIGS ====================

/**
 * Configurazione completa per ogni tipo di notifica
 * Include icona, colori, categoria e comportamento di default
 */
export const notificationConfigs: Record<NotificationType, NotificationConfig> = {
  // === ACCOUNT & AUTH ===
  ACCOUNT_ACTIVATED: {
    category: 'account',
    icon: CheckCircle2,
    iconBgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColorClass: 'text-emerald-600 dark:text-emerald-400',
    canBeUrgent: false,
    defaultSendEmail: true,
  },
  NEW_REGISTRATION: {
    category: 'account',
    icon: UserPlus,
    iconBgClass: 'bg-blue-100 dark:bg-blue-900/30',
    iconColorClass: 'text-blue-600 dark:text-blue-400',
    canBeUrgent: false,
    defaultSendEmail: false,
  },
  PROFILE_COMPLETED: {
    category: 'account',
    icon: UserCheck,
    iconBgClass: 'bg-purple-100 dark:bg-purple-900/30',
    iconColorClass: 'text-purple-600 dark:text-purple-400',
    canBeUrgent: false,
    defaultSendEmail: false,
  },

  // === CONTRACTS ===
  CONTRACT_ASSIGNED: {
    category: 'contract',
    icon: FileText,
    iconBgClass: 'bg-blue-100 dark:bg-blue-900/30',
    iconColorClass: 'text-blue-600 dark:text-blue-400',
    canBeUrgent: true,
    defaultSendEmail: true,
  },
  CONTRACT_SIGNED: {
    category: 'contract',
    icon: FileSignature,
    iconBgClass: 'bg-green-100 dark:bg-green-900/30',
    iconColorClass: 'text-green-600 dark:text-green-400',
    canBeUrgent: true,
    defaultSendEmail: true,
  },
  CONTRACT_REMINDER: {
    category: 'contract',
    icon: Clock,
    iconBgClass: 'bg-amber-100 dark:bg-amber-900/30',
    iconColorClass: 'text-amber-600 dark:text-amber-400',
    canBeUrgent: true,
    defaultSendEmail: true,
  },
  CONTRACT_EXPIRED: {
    category: 'contract',
    icon: XCircle,
    iconBgClass: 'bg-red-100 dark:bg-red-900/30',
    iconColorClass: 'text-red-600 dark:text-red-400',
    canBeUrgent: true,
    defaultSendEmail: true,
  },
  CONTRACT_CANCELLED: {
    category: 'contract',
    icon: Ban,
    iconBgClass: 'bg-red-100 dark:bg-red-900/30',
    iconColorClass: 'text-red-600 dark:text-red-400',
    canBeUrgent: false,
    defaultSendEmail: true,
  },

  // === EVENTS & CALENDAR ===
  EVENT_INVITATION: {
    category: 'event',
    icon: Calendar,
    iconBgClass: 'bg-indigo-100 dark:bg-indigo-900/30',
    iconColorClass: 'text-indigo-600 dark:text-indigo-400',
    canBeUrgent: false,
    defaultSendEmail: true,
  },
  EVENT_REMINDER: {
    category: 'event',
    icon: Clock,
    iconBgClass: 'bg-amber-100 dark:bg-amber-900/30',
    iconColorClass: 'text-amber-600 dark:text-amber-400',
    canBeUrgent: true,
    defaultSendEmail: true,
  },
  EVENT_UPDATED: {
    category: 'event',
    icon: Calendar,
    iconBgClass: 'bg-blue-100 dark:bg-blue-900/30',
    iconColorClass: 'text-blue-600 dark:text-blue-400',
    canBeUrgent: false,
    defaultSendEmail: true,
  },
  EVENT_CANCELLED: {
    category: 'event',
    icon: XCircle,
    iconBgClass: 'bg-red-100 dark:bg-red-900/30',
    iconColorClass: 'text-red-600 dark:text-red-400',
    canBeUrgent: true,
    defaultSendEmail: true,
  },

  // === SIMULATIONS ===
  SIMULATION_ASSIGNED: {
    category: 'simulation',
    icon: ClipboardCheck,
    iconBgClass: 'bg-cyan-100 dark:bg-cyan-900/30',
    iconColorClass: 'text-cyan-600 dark:text-cyan-400',
    canBeUrgent: false,
    defaultSendEmail: true,
  },
  SIMULATION_REMINDER: {
    category: 'simulation',
    icon: Clock,
    iconBgClass: 'bg-amber-100 dark:bg-amber-900/30',
    iconColorClass: 'text-amber-600 dark:text-amber-400',
    canBeUrgent: true,
    defaultSendEmail: true,
  },
  SIMULATION_READY: {
    category: 'simulation',
    icon: CheckCircle2,
    iconBgClass: 'bg-green-100 dark:bg-green-900/30',
    iconColorClass: 'text-green-600 dark:text-green-400',
    canBeUrgent: true,
    defaultSendEmail: false,
  },
  SIMULATION_STARTED: {
    category: 'simulation',
    icon: PlayCircle,
    iconBgClass: 'bg-blue-100 dark:bg-blue-900/30',
    iconColorClass: 'text-blue-600 dark:text-blue-400',
    canBeUrgent: true,
    defaultSendEmail: false,
  },
  SIMULATION_RESULTS: {
    category: 'simulation',
    icon: Trophy,
    iconBgClass: 'bg-purple-100 dark:bg-purple-900/30',
    iconColorClass: 'text-purple-600 dark:text-purple-400',
    canBeUrgent: false,
    defaultSendEmail: true,
  },
  SIMULATION_COMPLETED: {
    category: 'simulation',
    icon: Check,
    iconBgClass: 'bg-green-100 dark:bg-green-900/30',
    iconColorClass: 'text-green-600 dark:text-green-400',
    canBeUrgent: false,
    defaultSendEmail: false,
  },

  // === STAFF ABSENCES ===
  STAFF_ABSENCE: {
    category: 'absence',
    icon: UserMinus,
    iconBgClass: 'bg-orange-100 dark:bg-orange-900/30',
    iconColorClass: 'text-orange-600 dark:text-orange-400',
    canBeUrgent: true,
    defaultSendEmail: true,
  },
  ABSENCE_REQUEST: {
    category: 'absence',
    icon: Clock,
    iconBgClass: 'bg-amber-100 dark:bg-amber-900/30',
    iconColorClass: 'text-amber-600 dark:text-amber-400',
    canBeUrgent: false,
    defaultSendEmail: false,
  },
  ABSENCE_CONFIRMED: {
    category: 'absence',
    icon: Check,
    iconBgClass: 'bg-green-100 dark:bg-green-900/30',
    iconColorClass: 'text-green-600 dark:text-green-400',
    canBeUrgent: false,
    defaultSendEmail: true,
  },
  ABSENCE_REJECTED: {
    category: 'absence',
    icon: XCircle,
    iconBgClass: 'bg-red-100 dark:bg-red-900/30',
    iconColorClass: 'text-red-600 dark:text-red-400',
    canBeUrgent: false,
    defaultSendEmail: true,
  },
  SUBSTITUTION_ASSIGNED: {
    category: 'absence',
    icon: Users,
    iconBgClass: 'bg-blue-100 dark:bg-blue-900/30',
    iconColorClass: 'text-blue-600 dark:text-blue-400',
    canBeUrgent: true,
    defaultSendEmail: true,
  },

  // === QUESTIONS & ANSWERS ===
  QUESTION_FEEDBACK: {
    category: 'question',
    icon: MessageSquare,
    iconBgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    iconColorClass: 'text-yellow-600 dark:text-yellow-400',
    canBeUrgent: false,
    defaultSendEmail: false,
  },
  OPEN_ANSWER_TO_REVIEW: {
    category: 'question',
    icon: BookOpen,
    iconBgClass: 'bg-purple-100 dark:bg-purple-900/30',
    iconColorClass: 'text-purple-600 dark:text-purple-400',
    canBeUrgent: false,
    defaultSendEmail: false,
  },

  // === MATERIALS ===
  MATERIAL_AVAILABLE: {
    category: 'material',
    icon: FolderOpen,
    iconBgClass: 'bg-teal-100 dark:bg-teal-900/30',
    iconColorClass: 'text-teal-600 dark:text-teal-400',
    canBeUrgent: false,
    defaultSendEmail: false,
  },

  // === GROUPS ===
  GROUP_MEMBER_ADDED: {
    category: 'group',
    icon: Users,
    iconBgClass: 'bg-indigo-100 dark:bg-indigo-900/30',
    iconColorClass: 'text-indigo-600 dark:text-indigo-400',
    canBeUrgent: false,
    defaultSendEmail: false,
  },
  GROUP_REFERENT_ASSIGNED: {
    category: 'group',
    icon: Users,
    iconBgClass: 'bg-violet-100 dark:bg-violet-900/30',
    iconColorClass: 'text-violet-600 dark:text-violet-400',
    canBeUrgent: false,
    defaultSendEmail: false,
  },

  // === MESSAGING ===
  MESSAGE_RECEIVED: {
    category: 'message',
    icon: MessageSquare,
    iconBgClass: 'bg-blue-100 dark:bg-blue-900/30',
    iconColorClass: 'text-blue-600 dark:text-blue-400',
    canBeUrgent: false,
    defaultSendEmail: false,
  },

  // === APPLICATIONS & CONTACTS ===
  JOB_APPLICATION: {
    category: 'application',
    icon: Briefcase,
    iconBgClass: 'bg-amber-100 dark:bg-amber-900/30',
    iconColorClass: 'text-amber-600 dark:text-amber-400',
    canBeUrgent: false,
    defaultSendEmail: false,
  },
  CONTACT_REQUEST: {
    category: 'application',
    icon: Mail,
    iconBgClass: 'bg-pink-100 dark:bg-pink-900/30',
    iconColorClass: 'text-pink-600 dark:text-pink-400',
    canBeUrgent: false,
    defaultSendEmail: false,
  },

  // === ATTENDANCE ===
  ATTENDANCE_RECORDED: {
    category: 'attendance',
    icon: GraduationCap,
    iconBgClass: 'bg-green-100 dark:bg-green-900/30',
    iconColorClass: 'text-green-600 dark:text-green-400',
    canBeUrgent: false,
    defaultSendEmail: false,
  },

  // === SYSTEM ===
  SYSTEM_ALERT: {
    category: 'system',
    icon: AlertTriangle,
    iconBgClass: 'bg-red-100 dark:bg-red-900/30',
    iconColorClass: 'text-red-600 dark:text-red-400',
    canBeUrgent: true,
    defaultSendEmail: true,
  },
  GENERAL: {
    category: 'system',
    icon: Bell,
    iconBgClass: 'bg-gray-100 dark:bg-gray-800',
    iconColorClass: 'text-gray-600 dark:text-gray-400',
    canBeUrgent: false,
    defaultSendEmail: false,
  },
};

// ==================== ROUTE GENERATION ====================

/**
 * Genera la route di navigazione per una notifica basandosi su tipo, ruolo e parametri
 * Ritorna un path relativo al basePath del ruolo
 */
export function getNotificationRoute(
  type: NotificationType,
  userRole: UserRole,
  params?: RouteParams
): string | null {
  const basePath = getBasePath(userRole);
  
  switch (type) {
    // === ACCOUNT ===
    case 'ACCOUNT_ACTIVATED':
      // Lo studente va alla dashboard, l'admin alla lista utenti
      return userRole === 'ADMIN' && params?.studentId 
        ? `/utenti/${params.studentId}` 
        : basePath;
    
    case 'NEW_REGISTRATION':
    case 'PROFILE_COMPLETED':
      if (userRole === 'ADMIN') {
        return params?.studentId 
          ? `/utenti/${params.studentId}` 
          : '/utenti';
      }
      return null;

    // === CONTRACTS ===
    case 'CONTRACT_ASSIGNED':
      // Se è un utente normale, va alla pagina di firma
      // Se è admin, va alla lista contratti
      if (userRole === 'ADMIN') {
        return params?.contractId 
          ? `/contratti?highlight=${params.contractId}` 
          : '/contratti';
      }
      // Student/Collaborator: usa il link diretto dalla notifica
      return null; // Il link sarà nel linkUrl della notifica

    case 'CONTRACT_SIGNED':
    case 'CONTRACT_REMINDER':
    case 'CONTRACT_EXPIRED':
    case 'CONTRACT_CANCELLED':
      if (userRole === 'ADMIN') {
        return params?.contractId 
          ? `/contratti?highlight=${params.contractId}` 
          : '/contratti';
      }
      return `${basePath}/contratti`;

    // === EVENTS ===
    case 'EVENT_INVITATION':
    case 'EVENT_REMINDER':
    case 'EVENT_UPDATED':
    case 'EVENT_CANCELLED':
      return params?.eventId 
        ? `${basePath}/calendario?event=${params.eventId}` 
        : `${basePath}/calendario`;

    // === SIMULATIONS ===
    case 'SIMULATION_ASSIGNED':
    case 'SIMULATION_REMINDER':
    case 'SIMULATION_READY':
    case 'SIMULATION_STARTED':
      if (userRole === 'STUDENT') {
        return params?.simulationId 
          ? `/simulazioni/${params.simulationId}` 
          : '/simulazioni';
      }
      return params?.simulationId 
        ? `${basePath}/simulazioni/${params.simulationId}` 
        : `${basePath}/simulazioni`;

    case 'SIMULATION_RESULTS':
      return params?.simulationId 
        ? `/simulazioni/${params.simulationId}/risultati` 
        : '/simulazioni';

    case 'SIMULATION_COMPLETED':
      if (userRole === 'ADMIN' || userRole === 'COLLABORATOR') {
        return params?.simulationId 
          ? `${basePath}/simulazioni/${params.simulationId}` 
          : `${basePath}/simulazioni`;
      }
      return '/simulazioni';

    // === ABSENCES ===
    case 'STAFF_ABSENCE':
    case 'ABSENCE_REQUEST':
    case 'ABSENCE_CONFIRMED':
    case 'ABSENCE_REJECTED':
    case 'SUBSTITUTION_ASSIGNED':
      if (userRole === 'ADMIN') {
        return '/presenze';
      }
      if (userRole === 'COLLABORATOR') {
        return '/presenze';
      }
      return `${basePath}/calendario`;

    // === QUESTIONS ===
    case 'QUESTION_FEEDBACK':
      if (userRole === 'ADMIN' || userRole === 'COLLABORATOR') {
        return params?.questionId 
          ? `${basePath}/domande/${params.questionId}` 
          : `${basePath}/domande`;
      }
      return null;

    case 'OPEN_ANSWER_TO_REVIEW':
      if (userRole === 'ADMIN' || userRole === 'COLLABORATOR') {
        return params?.simulationId 
          ? `${basePath}/simulazioni/${params.simulationId}/correzioni` 
          : `${basePath}/simulazioni`;
      }
      return null;

    // === MATERIALS ===
    case 'MATERIAL_AVAILABLE':
      return `${basePath}/materiali`;

    // === GROUPS ===
    case 'GROUP_MEMBER_ADDED':
    case 'GROUP_REFERENT_ASSIGNED':
      // Per studenti va al gruppo, per admin/staff va alla gestione gruppi
      if (userRole === 'STUDENT') {
        return `${basePath}/gruppo`;
      }
      return `${basePath}/gruppi`;

    // === MESSAGES ===
    case 'MESSAGE_RECEIVED':
      return params?.conversationId 
        ? `${basePath}/messaggi?conversation=${params.conversationId}` 
        : `${basePath}/messaggi`;

    // === APPLICATIONS ===
    case 'JOB_APPLICATION':
      if (userRole === 'ADMIN') {
        return params?.applicationId 
          ? `/candidature?highlight=${params.applicationId}` 
          : '/candidature';
      }
      return null;

    case 'CONTACT_REQUEST':
      if (userRole === 'ADMIN') {
        return params?.requestId 
          ? `/richieste?highlight=${params.requestId}` 
          : '/richieste';
      }
      return null;

    // === ATTENDANCE ===
    case 'ATTENDANCE_RECORDED':
      return `${basePath}/presenze`;

    // === SYSTEM ===
    case 'SYSTEM_ALERT':
    case 'GENERAL':
      return null; // Il link sarà nel linkUrl della notifica se presente

    default:
      return null;
  }
}

/**
 * Ottiene il basePath per un ruolo
 * Con la nuova struttura unificata, tutti i ruoli usano lo stesso basePath vuoto
 */
function getBasePath(_role: UserRole): string {
  // Unified routes - no role prefix needed
  return '';
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Ottiene la configurazione per un tipo di notifica
 */
export function getNotificationConfig(type: NotificationType): NotificationConfig {
  return notificationConfigs[type] || notificationConfigs.GENERAL;
}

/**
 * Ottiene le categorie disponibili con le relative etichette
 */
export function getCategoryLabels(): Record<NotificationCategory, string> {
  return {
    account: 'Account',
    contract: 'Contratti',
    event: 'Eventi',
    simulation: 'Simulazioni',
    absence: 'Assenze',
    question: 'Domande',
    material: 'Materiali',
    group: 'Gruppi',
    message: 'Messaggi',
    application: 'Candidature',
    attendance: 'Presenze',
    system: 'Sistema',
  };
}

/**
 * Filtra i tipi di notifica per categoria
 */
export function getTypesByCategory(category: NotificationCategory): NotificationType[] {
  return (Object.entries(notificationConfigs) as [NotificationType, NotificationConfig][])
    .filter(([, config]) => config.category === category)
    .map(([type]) => type);
}

/**
 * Verifica se un tipo di notifica è valido
 */
export function isValidNotificationType(type: string): type is NotificationType {
  return type in notificationConfigs;
}
