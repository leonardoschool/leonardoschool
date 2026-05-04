import {
  Bell,
  Users,
  FileText,
  BookOpen,
  FolderOpen,
  Check,
  X,
  AlertTriangle,
  Briefcase,
  MessageSquare,
  UserCheck,
  UserPlus,
  FileSignature,
  XCircle,
  ClipboardCheck,
  Mail,
  Calendar,
  GraduationCap,
} from 'lucide-react';
import type { NotificationTypeKey, NotificationConfig } from './types';

// Notification type config with icons and colors
export const notificationConfig: Record<NotificationTypeKey, NotificationConfig> = {
  // Account & Auth
  ACCOUNT_ACTIVATED: { icon: UserCheck, bgClass: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  NEW_REGISTRATION: { icon: UserPlus, bgClass: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  PROFILE_COMPLETED: { icon: UserPlus, bgClass: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
  // Contracts
  CONTRACT_ASSIGNED: { icon: FileText, bgClass: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  CONTRACT_SIGNED: { icon: FileSignature, bgClass: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
  CONTRACT_REMINDER: { icon: FileText, bgClass: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
  CONTRACT_EXPIRED: { icon: XCircle, bgClass: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600 dark:text-red-400' },
  CONTRACT_CANCELLED: { icon: XCircle, bgClass: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600 dark:text-red-400' },
  // Events & Calendar
  EVENT_INVITATION: { icon: Calendar, bgClass: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400' },
  EVENT_REMINDER: { icon: Calendar, bgClass: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
  EVENT_UPDATED: { icon: Calendar, bgClass: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  EVENT_CANCELLED: { icon: Calendar, bgClass: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600 dark:text-red-400' },
  // Simulations
  SIMULATION_ASSIGNED: { icon: ClipboardCheck, bgClass: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400' },
  SIMULATION_REMINDER: { icon: ClipboardCheck, bgClass: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
  SIMULATION_READY: { icon: ClipboardCheck, bgClass: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
  SIMULATION_STARTED: { icon: ClipboardCheck, bgClass: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  SIMULATION_RESULTS: { icon: ClipboardCheck, bgClass: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
  SIMULATION_COMPLETED: { icon: ClipboardCheck, bgClass: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
  // Staff Absences
  STAFF_ABSENCE: { icon: UserCheck, bgClass: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400' },
  ABSENCE_REQUEST: { icon: UserCheck, bgClass: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
  ABSENCE_CONFIRMED: { icon: Check, bgClass: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
  ABSENCE_REJECTED: { icon: X, bgClass: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600 dark:text-red-400' },
  SUBSTITUTION_ASSIGNED: { icon: Users, bgClass: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  // Questions
  QUESTION_FEEDBACK: { icon: MessageSquare, bgClass: 'bg-yellow-100 dark:bg-yellow-900/30', iconColor: 'text-yellow-600 dark:text-yellow-400' },
  OPEN_ANSWER_TO_REVIEW: { icon: BookOpen, bgClass: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
  // Materials
  MATERIAL_AVAILABLE: { icon: FolderOpen, bgClass: 'bg-teal-100 dark:bg-teal-900/30', iconColor: 'text-teal-600 dark:text-teal-400' },
  // Messages
  MESSAGE_RECEIVED: { icon: MessageSquare, bgClass: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  // Applications
  JOB_APPLICATION: { icon: Briefcase, bgClass: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
  CONTACT_REQUEST: { icon: Mail, bgClass: 'bg-pink-100 dark:bg-pink-900/30', iconColor: 'text-pink-600 dark:text-pink-400' },
  // Attendance
  ATTENDANCE_RECORDED: { icon: GraduationCap, bgClass: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
  // System
  SYSTEM_ALERT: { icon: AlertTriangle, bgClass: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600 dark:text-red-400' },
  GENERAL: { icon: Bell, bgClass: 'bg-gray-100 dark:bg-gray-800', iconColor: 'text-gray-600 dark:text-gray-400' },
};
