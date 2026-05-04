import type { LucideIcon } from 'lucide-react';

// Types for notification system
export type NotificationTypeKey = 
  | 'ACCOUNT_ACTIVATED' | 'NEW_REGISTRATION' | 'PROFILE_COMPLETED'
  | 'CONTRACT_ASSIGNED' | 'CONTRACT_SIGNED' | 'CONTRACT_REMINDER' | 'CONTRACT_EXPIRED' | 'CONTRACT_CANCELLED'
  | 'EVENT_INVITATION' | 'EVENT_REMINDER' | 'EVENT_UPDATED' | 'EVENT_CANCELLED'
  | 'SIMULATION_ASSIGNED' | 'SIMULATION_REMINDER' | 'SIMULATION_READY' | 'SIMULATION_STARTED' | 'SIMULATION_RESULTS' | 'SIMULATION_COMPLETED'
  | 'STAFF_ABSENCE' | 'ABSENCE_REQUEST' | 'ABSENCE_CONFIRMED' | 'ABSENCE_REJECTED' | 'SUBSTITUTION_ASSIGNED'
  | 'QUESTION_FEEDBACK' | 'OPEN_ANSWER_TO_REVIEW'
  | 'MATERIAL_AVAILABLE' | 'MESSAGE_RECEIVED'
  | 'JOB_APPLICATION' | 'CONTACT_REQUEST'
  | 'ATTENDANCE_RECORDED' | 'SYSTEM_ALERT' | 'GENERAL';

export interface NotificationConfig {
  icon: LucideIcon;
  bgClass: string;
  iconColor: string;
}

export type Theme = 'light' | 'dark' | 'system';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  isUrgent?: boolean;
  createdAt: Date | string;
  linkUrl?: string | null;
  linkType?: string | null;
  linkEntityId?: string | null;
}

export interface UserData {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  isActive?: boolean;
  student?: {
    matricola?: string | null;
  } | null;
}
