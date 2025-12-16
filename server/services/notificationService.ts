/**
 * Unified Notification Service (Server-Side)
 * 
 * This module re-exports the notification helpers from lib/notifications
 * and adds server-specific functionality like email sending.
 * 
 * Use this module for server-side notification creation.
 * The lib/notifications module is shared between client and server.
 * 
 * @example
 * import * as notificationService from '@/server/services/notificationService';
 * 
 * await notificationService.notifyProfileCompleted(prisma, studentId, studentName, studentEmail);
 */

import type { PrismaClient } from '@prisma/client';
import * as emailService from './emailService';
import {
  notifications,
  createNotification,
  createBulkNotifications,
  notifyAdmins,
  notifyStaff,
  notifyByRole,
  deleteNotificationsForEntity,
  archiveReadNotifications,
  getUnreadCount,
} from '@/lib/notifications';

// Re-export core functions for backward compatibility
export {
  createNotification,
  createBulkNotifications,
  notifyAdmins,
  notifyStaff,
  notifyByRole,
  deleteNotificationsForEntity,
  archiveReadNotifications,
  getUnreadCount,
};

// ==================== SERVER-SIDE NOTIFICATION CREATORS ====================
// These functions combine notification creation with email sending

/**
 * Notify admins when a student completes their profile
 */
export async function notifyProfileCompleted(
  prisma: PrismaClient,
  studentId: string,
  studentName: string,
  studentEmail: string
): Promise<void> {
  // Get the user ID for the student
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { userId: true },
  });

  // Create notifications for all admins
  await notifications.profileCompleted(prisma, {
    studentUserId: student?.userId || studentId,
    studentName,
  });

  // Send email notification
  await emailService.sendProfileCompletedAdminNotification({
    studentName,
    studentEmail,
    studentId,
  }).catch(err => {
    console.error('[NotificationService] Failed to send profile completed admin notification:', err);
  });
}

/**
 * Notify when a contract is assigned
 */
export async function notifyContractAssigned(
  prisma: PrismaClient,
  params: {
    contractId: string;
    templateName: string;
    recipientUserId: string;
    recipientName: string;
    recipientEmail: string;
    recipientType: 'STUDENT' | 'COLLABORATOR';
    recipientProfileId: string;
    signLink: string; // Relative link for in-app navigation
    signLinkAbsolute: string; // Absolute link for emails
    price: number;
    expiresAt: Date;
  }
): Promise<void> {
  // Create notifications with relative link for in-app navigation
  await notifications.contractAssigned(prisma, {
    recipientUserId: params.recipientUserId,
    recipientName: params.recipientName,
    contractId: params.contractId,
    contractName: params.templateName,
    signLink: params.signLink, // Use relative link for notifications
  });

  // Send email to recipient with absolute link
  await emailService.sendContractAssignedEmail({
    studentName: params.recipientName,
    studentEmail: params.recipientEmail,
    signLink: params.signLinkAbsolute, // Use absolute link for emails
    contractName: params.templateName,
    price: params.price,
    expiresAt: params.expiresAt,
  }).catch(err => {
    console.error('[NotificationService] Failed to send contract assigned email:', err);
  });
}

/**
 * Notify when a contract is signed
 */
export async function notifyContractSigned(
  prisma: PrismaClient,
  params: {
    contractId: string;
    templateName: string;
    signerUserId: string;
    signerName: string;
    signerEmail: string;
    signerType: 'STUDENT' | 'COLLABORATOR';
    signerProfileId: string;
    signedAt: Date;
    price: number;
  }
): Promise<void> {
  // Create notifications
  await notifications.contractSigned(prisma, {
    signerUserId: params.signerUserId,
    signerName: params.signerName,
    contractId: params.contractId,
    contractName: params.templateName,
  });

  // Send confirmation email to signer
  await emailService.sendContractSignedConfirmationEmail({
    studentName: params.signerName,
    studentEmail: params.signerEmail,
    contractName: params.templateName,
    signedAt: params.signedAt,
    price: params.price,
  }).catch(err => {
    console.error('[NotificationService] Failed to send contract signed confirmation email:', err);
  });

  // Send notification email to admin
  await emailService.sendContractSignedAdminNotification({
    studentName: params.signerName,
    studentEmail: params.signerEmail,
    contractName: params.templateName,
    signedAt: params.signedAt,
  }).catch(err => {
    console.error('[NotificationService] Failed to send contract signed admin notification:', err);
  });
}

/**
 * Notify when an account is activated
 */
export async function notifyAccountActivated(
  prisma: PrismaClient,
  params: {
    userId: string;
    userName: string;
    userEmail: string;
    profileId: string;
    loginUrl: string;
  }
): Promise<void> {
  // Create notification
  await notifications.accountActivated(prisma, {
    userId: params.userId,
    userName: params.userName,
  });

  // Send email
  await emailService.sendAccountActivatedEmail({
    studentName: params.userName,
    studentEmail: params.userEmail,
    loginUrl: params.loginUrl,
  }).catch(err => {
    console.error('[NotificationService] Failed to send account activated email:', err);
  });
}

/**
 * Notify when a contract is cancelled
 */
export async function notifyContractCancelled(
  prisma: PrismaClient,
  params: {
    contractId: string;
    templateName: string;
    recipientUserId?: string;
    recipientName: string;
    recipientProfileId?: string;
    recipientType?: 'STUDENT' | 'COLLABORATOR';
  }
): Promise<void> {
  await notifications.contractCancelled(prisma, {
    recipientUserId: params.recipientUserId,
    recipientName: params.recipientName,
    contractId: params.contractId,
    contractName: params.templateName,
  });
}

/**
 * Notify about a new job application
 */
export async function notifyJobApplication(
  prisma: PrismaClient,
  params: {
    applicationId: string;
    applicantName: string;
    applicantEmail: string;
    subject: string;
    materia: string;
  }
): Promise<void> {
  await notifications.jobApplication(prisma, {
    applicationId: params.applicationId,
    applicantName: params.applicantName,
    subject: params.materia,
  });
}

/**
 * Notify about a new contact request
 */
export async function notifyContactRequest(
  prisma: PrismaClient,
  params: {
    requestId: string;
    senderName: string;
    senderEmail: string;
    subject: string;
  }
): Promise<void> {
  await notifications.contactRequest(prisma, {
    requestId: params.requestId,
    senderName: params.senderName,
    subject: params.subject,
  });
}

/**
 * Notify about event invitation
 */
export async function notifyEventInvitation(
  prisma: PrismaClient,
  params: {
    eventId: string;
    eventTitle: string;
    eventDate: Date;
    inviteeUserId: string;
    inviteeName: string;
    sendEmail: boolean;
  }
): Promise<void> {
  // Get user role
  const user = await prisma.user.findUnique({
    where: { id: params.inviteeUserId },
    select: { role: true },
  });

  await notifications.eventInvitation(prisma, {
    inviteeUserId: params.inviteeUserId,
    eventId: params.eventId,
    eventTitle: params.eventTitle,
    eventDate: params.eventDate,
    inviteeRole: (user?.role as 'ADMIN' | 'COLLABORATOR' | 'STUDENT') || 'STUDENT',
  });
}

/**
 * Notify about event cancellation
 */
export async function notifyEventCancelled(
  prisma: PrismaClient,
  params: {
    eventId: string;
    eventTitle: string;
    reason?: string;
    affectedUserIds: string[];
  }
): Promise<void> {
  await notifications.eventCancelled(prisma, params);
}

/**
 * Notify about staff absence
 */
export async function notifyStaffAbsence(
  prisma: PrismaClient,
  params: {
    absenceId: string;
    staffName: string;
    startDate: Date;
    endDate: Date;
    affectedEventId?: string;
    affectedEventTitle?: string;
    affectedStudentIds: string[];
  }
): Promise<void> {
  await notifications.staffAbsence(prisma, {
    affectedStudentIds: params.affectedStudentIds,
    staffName: params.staffName,
    startDate: params.startDate,
    endDate: params.endDate,
    affectedEventTitle: params.affectedEventTitle,
    affectedEventId: params.affectedEventId,
  });
}

/**
 * Notify about simulation assignment
 */
export async function notifySimulationAssigned(
  prisma: PrismaClient,
  params: {
    simulationId: string;
    simulationTitle: string;
    dueDate?: Date;
    assignedUserIds: string[];
  }
): Promise<void> {
  await notifications.simulationAssigned(prisma, params);
}

/**
 * Notify about simulation results available
 */
export async function notifySimulationResults(
  prisma: PrismaClient,
  params: {
    simulationId: string;
    simulationTitle: string;
    studentUserId: string;
    score: number;
    ranking?: number;
  }
): Promise<void> {
  await notifications.simulationResults(prisma, params);
}

/**
 * Notify about new message received
 */
export async function notifyMessageReceived(
  prisma: PrismaClient,
  params: {
    conversationId: string;
    messageId: string;
    senderName: string;
    recipientUserId: string;
    messagePreview: string;
  }
): Promise<void> {
  // Get recipient role
  const user = await prisma.user.findUnique({
    where: { id: params.recipientUserId },
    select: { role: true },
  });

  await notifications.messageReceived(prisma, {
    recipientUserId: params.recipientUserId,
    conversationId: params.conversationId,
    senderName: params.senderName,
    messagePreview: params.messagePreview,
    recipientRole: (user?.role as 'ADMIN' | 'COLLABORATOR' | 'STUDENT') || 'STUDENT',
  });
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Notify about contract reminder (for scheduled jobs)
 */
export async function notifyContractReminder(
  prisma: PrismaClient,
  params: {
    recipientUserId: string;
    recipientEmail: string;
    recipientName: string;
    contractId: string;
    contractName: string;
    expiresAt: Date;
    signLink: string;
  }
): Promise<void> {
  await notifications.contractReminder(prisma, {
    recipientUserId: params.recipientUserId,
    contractId: params.contractId,
    contractName: params.contractName,
    expiresAt: params.expiresAt,
    signLink: params.signLink,
  });

  // TODO: Add sendContractReminderEmail to emailService when needed
  // await emailService.sendContractReminderEmail({...})
}

/**
 * Notify about contract expiration
 */
export async function notifyContractExpired(
  prisma: PrismaClient,
  params: {
    recipientUserId: string;
    recipientEmail: string;
    recipientName: string;
    contractId: string;
    contractName: string;
  }
): Promise<void> {
  await notifications.contractExpired(prisma, {
    recipientUserId: params.recipientUserId,
    contractId: params.contractId,
    contractName: params.contractName,
  });

  // TODO: Add sendContractExpiredEmail to emailService when needed
  // await emailService.sendContractExpiredEmail({...})
}

/**
 * Notify about simulation results
 */
export async function notifySimulationResultsAvailable(
  prisma: PrismaClient,
  params: {
    simulationId: string;
    simulationTitle: string;
    studentUserId: string;
    studentEmail: string;
    studentName: string;
    score: number;
    ranking?: number;
  }
): Promise<void> {
  await notifications.simulationResults(prisma, {
    simulationId: params.simulationId,
    simulationTitle: params.simulationTitle,
    studentUserId: params.studentUserId,
    score: params.score,
    ranking: params.ranking,
  });

  // TODO: Add email for simulation results when template is ready
}

/**
 * Notify about simulation completion (for staff)
 * This notifies admins that a simulation has been completed by students
 */
export async function notifySimulationCompletedByStudent(
  prisma: PrismaClient,
  params: {
    simulationId: string;
    simulationTitle: string;
    studentName: string;
    hasOpenAnswers: boolean;
    openAnswersCount?: number;
  }
): Promise<void> {
  // If there are open answers to review, send that notification instead
  if (params.hasOpenAnswers && params.openAnswersCount) {
    await notifications.openAnswerToReview(prisma, {
      simulationId: params.simulationId,
      simulationTitle: params.simulationTitle,
      studentName: params.studentName,
      answersCount: params.openAnswersCount,
    });
  }
  
  // Note: simulationCompleted is meant for batch notification (e.g., "X students completed")
  // For individual completion, we use openAnswerToReview when relevant
}

/**
 * Notify about material availability
 */
export async function notifyMaterialAvailable(
  prisma: PrismaClient,
  params: {
    materialId: string;
    materialTitle: string;
    targetUserIds: string[];
  }
): Promise<void> {
  await notifications.materialAvailable(prisma, {
    recipientUserIds: params.targetUserIds,
    materialId: params.materialId,
    materialTitle: params.materialTitle,
  });
}

/**
 * Notify about question feedback
 */
export async function notifyQuestionFeedback(
  prisma: PrismaClient,
  params: {
    questionId: string;
    questionTitle: string;
    feedbackType: string;
    reporterName: string;
  }
): Promise<void> {
  await notifications.questionFeedback(prisma, params);
}

/**
 * Get user notification count (for badges)
 * Optimized query that only counts, doesn't fetch data
 */
export async function getUserUnreadCount(
  prisma: PrismaClient,
  userId: string
): Promise<number> {
  return getUnreadCount(prisma, userId);
}
