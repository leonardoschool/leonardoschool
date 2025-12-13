/**
 * Unified Notification Service
 * 
 * This service handles creating notifications for all user types (admin, collaborator, student)
 * using the new unified Notification model, while maintaining backward compatibility
 * with AdminNotification during the transition period.
 */

import type { PrismaClient } from '@prisma/client';
import * as emailService from './emailService';

// Types for notification - these will be available after prisma generate
type NotificationType = 
  | 'ACCOUNT_ACTIVATED'
  | 'NEW_REGISTRATION'
  | 'PROFILE_COMPLETED'
  | 'CONTRACT_ASSIGNED'
  | 'CONTRACT_SIGNED'
  | 'CONTRACT_REMINDER'
  | 'CONTRACT_EXPIRED'
  | 'CONTRACT_CANCELLED'
  | 'EVENT_INVITATION'
  | 'EVENT_REMINDER'
  | 'EVENT_UPDATED'
  | 'EVENT_CANCELLED'
  | 'SIMULATION_ASSIGNED'
  | 'SIMULATION_REMINDER'
  | 'SIMULATION_READY'
  | 'SIMULATION_STARTED'
  | 'SIMULATION_RESULTS'
  | 'SIMULATION_COMPLETED'
  | 'STAFF_ABSENCE'
  | 'ABSENCE_REQUEST'
  | 'ABSENCE_CONFIRMED'
  | 'ABSENCE_REJECTED'
  | 'SUBSTITUTION_ASSIGNED'
  | 'QUESTION_FEEDBACK'
  | 'OPEN_ANSWER_TO_REVIEW'
  | 'MATERIAL_AVAILABLE'
  | 'MESSAGE_RECEIVED'
  | 'JOB_APPLICATION'
  | 'CONTACT_REQUEST'
  | 'ATTENDANCE_RECORDED'
  | 'SYSTEM_ALERT'
  | 'GENERAL';

type NotificationChannel = 'IN_APP' | 'EMAIL' | 'BOTH';

type UserRole = 'ADMIN' | 'COLLABORATOR' | 'STUDENT';

// Types for notification creation
interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channel?: NotificationChannel;
  linkUrl?: string;
  linkType?: string;
  linkEntityId?: string;
  isUrgent?: boolean;
  groupKey?: string;
  expiresAt?: Date;
  sendEmail?: boolean;
  emailData?: Record<string, unknown>;
}

interface BulkNotificationParams {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  channel?: NotificationChannel;
  linkUrl?: string;
  linkType?: string;
  linkEntityId?: string;
  isUrgent?: boolean;
  groupKey?: string;
  expiresAt?: Date;
}

// Notification creation result
interface NotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

/**
 * Create a notification for a single user
 */
export async function createNotification(
  prisma: PrismaClient,
  params: CreateNotificationParams
): Promise<NotificationResult> {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        channel: params.channel || 'IN_APP',
        linkUrl: params.linkUrl,
        linkType: params.linkType,
        linkEntityId: params.linkEntityId,
        isUrgent: params.isUrgent || false,
        groupKey: params.groupKey,
        expiresAt: params.expiresAt,
      },
    });

    // If email should be sent, check user preferences and send
    if (params.sendEmail && (params.channel === 'EMAIL' || params.channel === 'BOTH')) {
      // Check user notification preferences
      const preference = await prisma.notificationPreference.findUnique({
        where: {
          userId_notificationType: {
            userId: params.userId,
            notificationType: params.type,
          },
        },
      });

      // If no preference exists or email is enabled, try to send email
      if (!preference || preference.emailEnabled) {
        // Mark email as pending - actual sending happens via email service
        await prisma.notification.update({
          where: { id: notification.id },
          data: { emailSent: false },
        });
      }
    }

    return { success: true, notificationId: notification.id };
  } catch (error) {
    console.error('Failed to create notification:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create notifications for multiple users at once
 */
export async function createBulkNotifications(
  prisma: PrismaClient,
  params: BulkNotificationParams
): Promise<{ success: boolean; count: number; errors: string[] }> {
  const errors: string[] = [];
  let successCount = 0;

  // Use transaction for bulk insert
  try {
    await prisma.notification.createMany({
      data: params.userIds.map(userId => ({
        userId,
        type: params.type,
        title: params.title,
        message: params.message,
        channel: params.channel || 'IN_APP',
        linkUrl: params.linkUrl,
        linkType: params.linkType,
        linkEntityId: params.linkEntityId,
        isUrgent: params.isUrgent || false,
        groupKey: params.groupKey,
        expiresAt: params.expiresAt,
      })),
    });
    successCount = params.userIds.length;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Bulk insert failed');
  }

  return { success: errors.length === 0, count: successCount, errors };
}

/**
 * Create notifications for all users with a specific role
 */
export async function notifyByRole(
  prisma: PrismaClient,
  role: UserRole,
  params: Omit<BulkNotificationParams, 'userIds'>
): Promise<{ success: boolean; count: number }> {
  const users = await prisma.user.findMany({
    where: { role, isActive: true },
    select: { id: true },
  });

  const result = await createBulkNotifications(prisma, {
    ...params,
    userIds: users.map(u => u.id),
  });

  return { success: result.success, count: result.count };
}

/**
 * Notify all admins
 */
export async function notifyAdmins(
  prisma: PrismaClient,
  params: Omit<BulkNotificationParams, 'userIds'>
): Promise<{ success: boolean; count: number }> {
  return notifyByRole(prisma, 'ADMIN', params);
}

/**
 * Notify all staff (admins + collaborators)
 */
export async function notifyStaff(
  prisma: PrismaClient,
  params: Omit<BulkNotificationParams, 'userIds'>
): Promise<{ success: boolean; count: number }> {
  const users = await prisma.user.findMany({
    where: { 
      role: { in: ['ADMIN', 'COLLABORATOR'] },
      isActive: true,
    },
    select: { id: true },
  });

  const result = await createBulkNotifications(prisma, {
    ...params,
    userIds: users.map(u => u.id),
  });

  return { success: result.success, count: result.count };
}

// ==================== SPECIFIC NOTIFICATION CREATORS ====================

/**
 * Notify admins when a student completes their profile
 */
export async function notifyProfileCompleted(
  prisma: PrismaClient,
  studentId: string,
  studentName: string,
  studentEmail: string
): Promise<void> {
  // Create notifications for all admins
  await notifyAdmins(prisma, {
    type: 'PROFILE_COMPLETED',
    title: 'Nuovo profilo completato',
    message: `${studentName} ha completato il profilo anagrafico`,
    linkType: 'student',
    linkEntityId: studentId,
    linkUrl: `/admin/studenti/${studentId}`,
  });

  // Also create legacy AdminNotification for backward compatibility
  await prisma.adminNotification.create({
    data: {
      type: 'PROFILE_COMPLETED',
      title: 'Nuovo profilo completato',
      message: `${studentName} ha completato il profilo anagrafico`,
      studentId,
    },
  });

  // Send email notification
  await emailService.sendProfileCompletedAdminNotification({
    studentName,
    studentEmail,
    studentId,
  }).catch(err => {
    console.error('Failed to send profile completed admin notification:', err);
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
    signLink: string;
    price: number;
    expiresAt: Date;
  }
): Promise<void> {
  // Notify the recipient (student or collaborator)
  await createNotification(prisma, {
    userId: params.recipientUserId,
    type: 'CONTRACT_ASSIGNED',
    title: 'Nuovo contratto da firmare',
    message: `Ti è stato assegnato il contratto "${params.templateName}"`,
    linkType: 'contract',
    linkEntityId: params.contractId,
    linkUrl: params.signLink,
    isUrgent: true,
    channel: 'BOTH',
    sendEmail: true,
  });

  // Notify admins
  await notifyAdmins(prisma, {
    type: 'CONTRACT_ASSIGNED',
    title: 'Contratto assegnato',
    message: `Contratto "${params.templateName}" assegnato a ${params.recipientName}`,
    linkType: 'contract',
    linkEntityId: params.contractId,
    linkUrl: `/admin/contratti/${params.contractId}`,
  });

  // Legacy AdminNotification
  await prisma.adminNotification.create({
    data: {
      type: 'CONTRACT_ASSIGNED',
      title: 'Contratto assegnato',
      message: `Contratto "${params.templateName}" assegnato a ${params.recipientName}`,
      studentId: params.recipientType === 'STUDENT' ? params.recipientProfileId : undefined,
      collaboratorId: params.recipientType === 'COLLABORATOR' ? params.recipientProfileId : undefined,
      contractId: params.contractId,
    },
  });

  // Send email to recipient
  await emailService.sendContractAssignedEmail({
    studentName: params.recipientName,
    studentEmail: params.recipientEmail,
    signLink: params.signLink,
    contractName: params.templateName,
    price: params.price,
    expiresAt: params.expiresAt,
  }).catch(err => {
    console.error('Failed to send contract assigned email:', err);
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
  // Notify the signer (confirmation)
  await createNotification(prisma, {
    userId: params.signerUserId,
    type: 'CONTRACT_SIGNED',
    title: 'Contratto firmato',
    message: `Hai firmato con successo il contratto "${params.templateName}"`,
    linkType: 'contract',
    linkEntityId: params.contractId,
    channel: 'BOTH',
    sendEmail: true,
  });

  // Notify admins
  await notifyAdmins(prisma, {
    type: 'CONTRACT_SIGNED',
    title: 'Contratto firmato',
    message: `${params.signerName} ha firmato il contratto "${params.templateName}"`,
    linkType: 'contract',
    linkEntityId: params.contractId,
    linkUrl: `/admin/contratti/${params.contractId}`,
    isUrgent: true,
  });

  // Legacy AdminNotification
  await prisma.adminNotification.create({
    data: {
      type: 'CONTRACT_SIGNED',
      title: 'Contratto firmato',
      message: `${params.signerName} ha firmato il contratto "${params.templateName}"`,
      studentId: params.signerType === 'STUDENT' ? params.signerProfileId : null,
      collaboratorId: params.signerType === 'COLLABORATOR' ? params.signerProfileId : null,
      contractId: params.contractId,
      isUrgent: true,
    },
  });

  // Send confirmation email to signer
  await emailService.sendContractSignedConfirmationEmail({
    studentName: params.signerName,
    studentEmail: params.signerEmail,
    contractName: params.templateName,
    signedAt: params.signedAt,
    price: params.price,
  }).catch(err => {
    console.error('Failed to send contract signed confirmation email:', err);
  });

  // Send notification email to admin
  await emailService.sendContractSignedAdminNotification({
    studentName: params.signerName,
    studentEmail: params.signerEmail,
    contractName: params.templateName,
    signedAt: params.signedAt,
  }).catch(err => {
    console.error('Failed to send contract signed admin notification:', err);
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
  // Notify the user
  await createNotification(prisma, {
    userId: params.userId,
    type: 'ACCOUNT_ACTIVATED',
    title: 'Account attivato',
    message: 'Il tuo account è stato attivato. Ora puoi accedere a tutte le funzionalità.',
    linkUrl: params.loginUrl,
    channel: 'BOTH',
    sendEmail: true,
  });

  // Legacy AdminNotification (for tracking)
  await prisma.adminNotification.create({
    data: {
      type: 'ACCOUNT_ACTIVATED',
      title: 'Account attivato',
      message: `Account di ${params.userName} è stato attivato`,
      studentId: params.profileId,
    },
  });

  // Send email
  await emailService.sendAccountActivatedEmail({
    studentName: params.userName,
    studentEmail: params.userEmail,
    loginUrl: params.loginUrl,
  }).catch(err => {
    console.error('Failed to send account activated email:', err);
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
  // Notify the recipient if we have their userId
  if (params.recipientUserId) {
    await createNotification(prisma, {
      userId: params.recipientUserId,
      type: 'CONTRACT_CANCELLED',
      title: 'Contratto revocato',
      message: `Il contratto "${params.templateName}" è stato revocato.`,
      linkType: 'contract',
      channel: 'BOTH',
      sendEmail: true,
    });
  }

  // Notify admins
  await notifyAdmins(prisma, {
    type: 'CONTRACT_CANCELLED',
    title: 'Contratto revocato',
    message: `Contratto "${params.templateName}" per ${params.recipientName} è stato revocato ed eliminato`,
    linkType: 'contract',
  });

  // Legacy AdminNotification
  await prisma.adminNotification.create({
    data: {
      type: 'CONTRACT_CANCELLED',
      title: 'Contratto revocato',
      message: `Contratto "${params.templateName}" per ${params.recipientName} è stato revocato ed eliminato`,
      studentId: params.recipientType === 'STUDENT' ? params.recipientProfileId : undefined,
      collaboratorId: params.recipientType === 'COLLABORATOR' ? params.recipientProfileId : undefined,
    },
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
  await notifyAdmins(prisma, {
    type: 'JOB_APPLICATION',
    title: 'Nuova candidatura',
    message: `${params.applicantName} ha inviato una candidatura per ${params.materia}`,
    linkType: 'job_application',
    linkEntityId: params.applicationId,
    linkUrl: `/admin/candidature/${params.applicationId}`,
    isUrgent: false,
  });

  // Legacy AdminNotification
  await prisma.adminNotification.create({
    data: {
      type: 'JOB_APPLICATION',
      title: 'Nuova candidatura',
      message: `${params.applicantName} ha inviato una candidatura per ${params.materia}`,
    },
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
  await notifyAdmins(prisma, {
    type: 'CONTACT_REQUEST',
    title: 'Nuova richiesta di contatto',
    message: `${params.senderName}: ${params.subject}`,
    linkType: 'contact_request',
    linkEntityId: params.requestId,
    linkUrl: `/admin/richieste/${params.requestId}`,
  });

  // Legacy AdminNotification
  await prisma.adminNotification.create({
    data: {
      type: 'CONTACT_REQUEST',
      title: 'Nuova richiesta di contatto',
      message: `${params.senderName}: ${params.subject}`,
    },
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
  const formattedDate = params.eventDate.toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  await createNotification(prisma, {
    userId: params.inviteeUserId,
    type: 'EVENT_INVITATION',
    title: 'Nuovo invito evento',
    message: `Sei stato invitato a: ${params.eventTitle} - ${formattedDate}`,
    linkType: 'event',
    linkEntityId: params.eventId,
    linkUrl: `/calendario/${params.eventId}`,
    channel: params.sendEmail ? 'BOTH' : 'IN_APP',
    sendEmail: params.sendEmail,
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
  const message = params.reason 
    ? `L'evento "${params.eventTitle}" è stato annullato. Motivo: ${params.reason}`
    : `L'evento "${params.eventTitle}" è stato annullato.`;

  await createBulkNotifications(prisma, {
    userIds: params.affectedUserIds,
    type: 'EVENT_CANCELLED',
    title: 'Evento annullato',
    message,
    linkType: 'event',
    linkEntityId: params.eventId,
    isUrgent: true,
  });
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
  const formattedStart = params.startDate.toLocaleDateString('it-IT');
  const formattedEnd = params.endDate.toLocaleDateString('it-IT');
  const dateRange = formattedStart === formattedEnd 
    ? formattedStart 
    : `${formattedStart} - ${formattedEnd}`;

  let message = `${params.staffName} sarà assente il ${dateRange}.`;
  if (params.affectedEventTitle) {
    message += ` L'evento "${params.affectedEventTitle}" potrebbe subire modifiche.`;
  }

  await createBulkNotifications(prisma, {
    userIds: params.affectedStudentIds,
    type: 'STAFF_ABSENCE',
    title: 'Assenza docente',
    message,
    linkType: params.affectedEventId ? 'event' : undefined,
    linkEntityId: params.affectedEventId,
    isUrgent: true,
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
  let message = `Ti è stata assegnata la simulazione "${params.simulationTitle}".`;
  if (params.dueDate) {
    const formattedDate = params.dueDate.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
    message += ` Scadenza: ${formattedDate}`;
  }

  await createBulkNotifications(prisma, {
    userIds: params.assignedUserIds,
    type: 'SIMULATION_ASSIGNED',
    title: 'Nuova simulazione assegnata',
    message,
    linkType: 'simulation',
    linkEntityId: params.simulationId,
    linkUrl: `/studente/simulazioni/${params.simulationId}`,
  });
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
  await createNotification(prisma, {
    userId: params.studentUserId,
    type: 'SIMULATION_RESULTS',
    title: 'Risultati disponibili',
    message: `I risultati della simulazione "${params.simulationTitle}" sono ora disponibili. Punteggio: ${params.score}${params.ranking ? `, Posizione: ${params.ranking}°` : ''}`,
    linkType: 'simulation_result',
    linkEntityId: params.simulationId,
    linkUrl: `/studente/simulazioni/${params.simulationId}/risultati`,
    channel: 'BOTH',
    sendEmail: true,
  });
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
  const preview = params.messagePreview.length > 50 
    ? params.messagePreview.substring(0, 50) + '...' 
    : params.messagePreview;

  await createNotification(prisma, {
    userId: params.recipientUserId,
    type: 'MESSAGE_RECEIVED',
    title: `Nuovo messaggio da ${params.senderName}`,
    message: preview,
    linkType: 'conversation',
    linkEntityId: params.conversationId,
    linkUrl: `/messaggi/${params.conversationId}`,
    groupKey: `conversation_${params.conversationId}`,
    channel: 'IN_APP', // Messages usually in-app only, user can change preferences
  });
}

// Export all functions as named exports (default export removed to comply with lint rules)
