/**
 * Notification Helpers - Funzioni standardizzate per la creazione di notifiche
 * 
 * Questo file fornisce un'API semplificata per creare notifiche
 * con link, parametri e comportamenti corretti.
 * 
 * Usa queste funzioni invece di creare notifiche direttamente con Prisma
 * per garantire consistenza in tutta l'applicazione.
 * 
 * @example
 * import { notifications } from '@/lib/notifications/notificationHelpers';
 * 
 * await notifications.contractSigned(prisma, {
 *   signerUserId: user.id,
 *   signerName: user.name,
 *   contractName: 'Corso Base',
 *   contractId: contract.id,
 * });
 */

import type { PrismaClient } from '@prisma/client';
import { 
  getNotificationConfig, 
  getNotificationRoute,
  type NotificationType, 
  type UserRole,
  type RouteParams,
} from './notificationConfig';

// ==================== TYPES ====================

type NotificationChannel = 'IN_APP' | 'EMAIL' | 'BOTH';

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

interface NotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

interface BulkNotificationResult {
  success: boolean;
  count: number;
  errors: string[];
}

// ==================== CORE FUNCTIONS ====================

/**
 * Crea una notifica per un singolo utente
 */
export async function createNotification(
  prisma: PrismaClient,
  params: CreateNotificationParams
): Promise<NotificationResult> {
  console.log('📨 [CREATE_NOTIFICATION] Chiamata con parametri:', {
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    linkType: params.linkType,
    linkEntityId: params.linkEntityId,
  });
  
  try {
    const config = getNotificationConfig(params.type);
    console.log('📨 [CREATE_NOTIFICATION] Config trovata:', config);
    
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        channel: params.channel || (config.defaultSendEmail ? 'BOTH' : 'IN_APP'),
        linkUrl: params.linkUrl,
        linkType: params.linkType,
        linkEntityId: params.linkEntityId,
        isUrgent: params.isUrgent || false,
        groupKey: params.groupKey,
        expiresAt: params.expiresAt,
      },
    });

    console.log('✅ [CREATE_NOTIFICATION] Notifica creata nel DB con ID:', notification.id);
    return { success: true, notificationId: notification.id };
  } catch (error) {
    console.error('❌ [CREATE_NOTIFICATION] Errore creazione notifica:', error);
    console.error('❌ [CREATE_NOTIFICATION] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Crea notifiche per più utenti contemporaneamente
 */
export async function createBulkNotifications(
  prisma: PrismaClient,
  params: BulkNotificationParams
): Promise<BulkNotificationResult> {
  try {
    const config = getNotificationConfig(params.type);
    
    await prisma.notification.createMany({
      data: params.userIds.map((userId) => ({
        userId,
        type: params.type,
        title: params.title,
        message: params.message,
        channel: params.channel || (config.defaultSendEmail ? 'BOTH' : 'IN_APP'),
        linkUrl: params.linkUrl,
        linkType: params.linkType,
        linkEntityId: params.linkEntityId,
        isUrgent: params.isUrgent || false,
        groupKey: params.groupKey,
        expiresAt: params.expiresAt,
      })),
    });

    return { success: true, count: params.userIds.length, errors: [] };
  } catch (error) {
    console.error('[Notifications] Failed to create bulk notifications:', error);
    return {
      success: false,
      count: 0,
      errors: [error instanceof Error ? error.message : 'Bulk insert failed'],
    };
  }
}

/**
 * Notifica tutti gli utenti con un determinato ruolo
 */
export async function notifyByRole(
  prisma: PrismaClient,
  role: UserRole,
  params: Omit<BulkNotificationParams, 'userIds'>
): Promise<BulkNotificationResult> {
  const users = await prisma.user.findMany({
    where: { role, isActive: true },
    select: { id: true },
  });

  if (users.length === 0) {
    return { success: true, count: 0, errors: [] };
  }

  return createBulkNotifications(prisma, {
    ...params,
    userIds: users.map((u) => u.id),
  });
}

/**
 * Notifica tutti gli admin
 */
export async function notifyAdmins(
  prisma: PrismaClient,
  params: Omit<BulkNotificationParams, 'userIds'>
): Promise<BulkNotificationResult> {
  return notifyByRole(prisma, 'ADMIN', params);
}

/**
 * Notifica tutti gli staff (admin + collaboratori)
 */
export async function notifyStaff(
  prisma: PrismaClient,
  params: Omit<BulkNotificationParams, 'userIds'>
): Promise<BulkNotificationResult> {
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['ADMIN', 'COLLABORATOR'] },
      isActive: true,
    },
    select: { id: true },
  });

  if (users.length === 0) {
    return { success: true, count: 0, errors: [] };
  }

  return createBulkNotifications(prisma, {
    ...params,
    userIds: users.map((u) => u.id),
  });
}

// ==================== HELPER: BUILD LINK URL ====================

/**
 * Costruisce il linkUrl per una notifica basandosi sul tipo e i parametri
 */
export function buildNotificationLink(
  type: NotificationType,
  role: UserRole,
  params?: RouteParams
): string | undefined {
  return getNotificationRoute(type, role, params) || undefined;
}

// ==================== SPECIALIZED NOTIFICATION CREATORS ====================

/**
 * Namespace per funzioni di notifica specifiche
 * Ogni funzione gestisce un caso d'uso specifico con i parametri corretti
 */
export const notifications = {
  // === ACCOUNT ===
  
  /**
   * Notifica quando un account viene attivato
   */
  async accountActivated(
    prisma: PrismaClient,
    params: {
      userId: string;
      userName: string;
    }
  ) {
    return createNotification(prisma, {
      userId: params.userId,
      type: 'ACCOUNT_ACTIVATED',
      title: 'Account attivato',
      message: 'Il tuo account è stato attivato. Ora puoi accedere a tutte le funzionalità.',
      channel: 'BOTH',
    });
  },

  /**
   * Notifica agli admin quando un nuovo utente si registra
   */
  async newRegistration(
    prisma: PrismaClient,
    params: {
      userName: string;
      userEmail: string;
      userId: string;
    }
  ) {
    return notifyAdmins(prisma, {
      type: 'NEW_REGISTRATION',
      title: 'Nuova registrazione',
      message: `${params.userName} (${params.userEmail}) si è registrato`,
      linkUrl: `/utenti/${params.userId}`,
      linkType: 'user',
      linkEntityId: params.userId,
    });
  },

  /**
   * Notifica agli admin quando uno studente completa il profilo
   */
  async profileCompleted(
    prisma: PrismaClient,
    params: {
      studentUserId: string;
      studentName: string;
    }
  ) {
    return notifyAdmins(prisma, {
      type: 'PROFILE_COMPLETED',
      title: 'Profilo completato',
      message: `${params.studentName} ha completato il profilo anagrafico`,
      linkUrl: `/utenti/${params.studentUserId}`,
      linkType: 'student',
      linkEntityId: params.studentUserId,
    });
  },

  // === CONTRACTS ===

  /**
   * Notifica quando un contratto viene assegnato
   */
  async contractAssigned(
    prisma: PrismaClient,
    params: {
      recipientUserId: string;
      recipientName: string;
      contractId: string;
      contractName: string;
      signLink: string;
    }
  ) {
    // Notifica al destinatario
    await createNotification(prisma, {
      userId: params.recipientUserId,
      type: 'CONTRACT_ASSIGNED',
      title: 'Nuovo contratto da firmare',
      message: `Ti è stato assegnato il contratto "${params.contractName}"`,
      linkUrl: params.signLink,
      linkType: 'contract',
      linkEntityId: params.contractId,
      isUrgent: true,
      channel: 'BOTH',
    });

    // Notifica agli admin
    await notifyAdmins(prisma, {
      type: 'CONTRACT_ASSIGNED',
      title: 'Contratto assegnato',
      message: `Contratto "${params.contractName}" assegnato a ${params.recipientName}`,
      linkUrl: `/contratti?highlight=${params.contractId}`,
      linkType: 'contract',
      linkEntityId: params.contractId,
    });
  },

  /**
   * Notifica quando un contratto viene firmato
   */
  async contractSigned(
    prisma: PrismaClient,
    params: {
      signerUserId: string;
      signerName: string;
      contractId: string;
      contractName: string;
    }
  ) {
    // Conferma al firmatario
    await createNotification(prisma, {
      userId: params.signerUserId,
      type: 'CONTRACT_SIGNED',
      title: 'Contratto firmato',
      message: `Hai firmato con successo il contratto "${params.contractName}"`,
      linkType: 'contract',
      linkEntityId: params.contractId,
      channel: 'BOTH',
    });

    // Notifica urgente agli admin
    await notifyAdmins(prisma, {
      type: 'CONTRACT_SIGNED',
      title: 'Contratto firmato',
      message: `${params.signerName} ha firmato il contratto "${params.contractName}". Attiva l'account se non l'hai già fatto.`,
      linkUrl: `/utenti?search=${encodeURIComponent(params.signerName)}`,
      linkType: 'user',
      linkEntityId: params.signerUserId,
      isUrgent: true,
    });
  },

  /**
   * Notifica quando un contratto viene annullato
   */
  async contractCancelled(
    prisma: PrismaClient,
    params: {
      recipientUserId?: string;
      recipientName: string;
      contractId: string;
      contractName: string;
    }
  ) {
    // Notifica al destinatario se disponibile
    if (params.recipientUserId) {
      await createNotification(prisma, {
        userId: params.recipientUserId,
        type: 'CONTRACT_CANCELLED',
        title: 'Contratto annullato',
        message: `Il contratto "${params.contractName}" è stato annullato.`,
        linkType: 'contract',
        channel: 'BOTH',
      });
    }

    // Notifica agli admin
    await notifyAdmins(prisma, {
      type: 'CONTRACT_CANCELLED',
      title: 'Contratto annullato',
      message: `Contratto "${params.contractName}" per ${params.recipientName} è stato annullato`,
      linkType: 'contract',
    });
  },

  // === EVENTS ===

  /**
   * Notifica invito a un evento
   */
  async eventInvitation(
    prisma: PrismaClient,
    params: {
      inviteeUserId: string;
      eventId: string;
      eventTitle: string;
      eventDate: Date;
      inviteeRole: UserRole;
    }
  ) {
    const formattedDate = params.eventDate.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    return createNotification(prisma, {
      userId: params.inviteeUserId,
      type: 'EVENT_INVITATION',
      title: 'Nuovo invito evento',
      message: `Sei stato invitato a: ${params.eventTitle} - ${formattedDate}`,
      linkUrl: buildNotificationLink('EVENT_INVITATION', params.inviteeRole, { eventId: params.eventId }),
      linkType: 'event',
      linkEntityId: params.eventId,
      channel: 'BOTH',
    });
  },

  /**
   * Notifica evento annullato
   */
  async eventCancelled(
    prisma: PrismaClient,
    params: {
      affectedUserIds: string[];
      eventId: string;
      eventTitle: string;
      reason?: string;
    }
  ) {
    const message = params.reason
      ? `L'evento "${params.eventTitle}" è stato annullato. Motivo: ${params.reason}`
      : `L'evento "${params.eventTitle}" è stato annullato.`;

    return createBulkNotifications(prisma, {
      userIds: params.affectedUserIds,
      type: 'EVENT_CANCELLED',
      title: 'Evento annullato',
      message,
      linkType: 'event',
      linkEntityId: params.eventId,
      isUrgent: true,
    });
  },

  /**
   * Notifica evento modificato
   */
  async eventUpdated(
    prisma: PrismaClient,
    params: {
      affectedUserIds: string[];
      eventId: string;
      eventTitle: string;
      changes: string;
    }
  ) {
    return createBulkNotifications(prisma, {
      userIds: params.affectedUserIds,
      type: 'EVENT_UPDATED',
      title: 'Evento modificato',
      message: `L'evento "${params.eventTitle}" è stato modificato: ${params.changes}`,
      linkType: 'event',
      linkEntityId: params.eventId,
    });
  },

  // === SIMULATIONS ===

  /**
   * Notifica simulazione assegnata
   */
  async simulationAssigned(
    prisma: PrismaClient,
    params: {
      assignedUserIds: string[];
      simulationId: string;
      simulationTitle: string;
      dueDate?: Date;
    }
  ) {
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

    return createBulkNotifications(prisma, {
      userIds: params.assignedUserIds,
      type: 'SIMULATION_ASSIGNED',
      title: 'Nuova simulazione assegnata',
      message,
      linkUrl: `/simulazioni/${params.simulationId}`,
      linkType: 'simulation',
      linkEntityId: params.simulationId,
    });
  },

  /**
   * Notifica risultati simulazione disponibili
   */
  async simulationResults(
    prisma: PrismaClient,
    params: {
      studentUserId: string;
      simulationId: string;
      simulationTitle: string;
      score: number;
      ranking?: number;
    }
  ) {
    const rankingText = params.ranking ? `, Posizione: ${params.ranking}°` : '';

    return createNotification(prisma, {
      userId: params.studentUserId,
      type: 'SIMULATION_RESULTS',
      title: 'Risultati disponibili',
      message: `I risultati della simulazione "${params.simulationTitle}" sono ora disponibili. Punteggio: ${params.score}${rankingText}`,
      linkUrl: `/simulazioni/${params.simulationId}/risultati`,
      linkType: 'simulation_result',
      linkEntityId: params.simulationId,
      channel: 'BOTH',
    });
  },

  /**
   * Notifica simulazione completata (per admin)
   */
  async simulationCompleted(
    prisma: PrismaClient,
    params: {
      simulationId: string;
      simulationTitle: string;
      completedCount: number;
    }
  ) {
    return notifyAdmins(prisma, {
      type: 'SIMULATION_COMPLETED',
      title: 'Simulazione completata',
      message: `La simulazione "${params.simulationTitle}" è stata completata da ${params.completedCount} studenti`,
      linkUrl: `/simulazioni/${params.simulationId}`,
      linkType: 'simulation',
      linkEntityId: params.simulationId,
    });
  },

  // === MESSAGES ===

  /**
   * Notifica nuovo messaggio ricevuto
   */
  async messageReceived(
    prisma: PrismaClient,
    params: {
      recipientUserId: string;
      conversationId: string;
      senderName: string;
      messagePreview: string;
      recipientRole: UserRole;
    }
  ) {
    const preview =
      params.messagePreview.length > 50
        ? params.messagePreview.substring(0, 50) + '...'
        : params.messagePreview;

    return createNotification(prisma, {
      userId: params.recipientUserId,
      type: 'MESSAGE_RECEIVED',
      title: `Nuovo messaggio da ${params.senderName}`,
      message: preview,
      linkUrl: buildNotificationLink('MESSAGE_RECEIVED', params.recipientRole, {
        conversationId: params.conversationId,
      }),
      linkType: 'conversation',
      linkEntityId: params.conversationId,
      groupKey: `conversation_${params.conversationId}`,
    });
  },

  // === MATERIALS ===

  /**
   * Notifica nuovo materiale disponibile
   */
  async materialAvailable(
    prisma: PrismaClient,
    params: {
      recipientUserIds: string[];
      materialTitle: string;
      materialId: string;
    }
  ) {
    return createBulkNotifications(prisma, {
      userIds: params.recipientUserIds,
      type: 'MATERIAL_AVAILABLE',
      title: 'Nuovo materiale disponibile',
      message: `È disponibile un nuovo materiale: "${params.materialTitle}"`,
      linkType: 'material',
      linkEntityId: params.materialId,
    });
  },

  // === APPLICATIONS ===

  /**
   * Notifica nuova candidatura lavoro
   */
  async jobApplication(
    prisma: PrismaClient,
    params: {
      applicationId: string;
      applicantName: string;
      subject: string;
    }
  ) {
    return notifyAdmins(prisma, {
      type: 'JOB_APPLICATION',
      title: 'Nuova candidatura',
      message: `${params.applicantName} ha inviato una candidatura per ${params.subject}`,
      linkUrl: `/candidature?highlight=${params.applicationId}`,
      linkType: 'job_application',
      linkEntityId: params.applicationId,
    });
  },

  /**
   * Notifica nuova richiesta di contatto
   */
  async contactRequest(
    prisma: PrismaClient,
    params: {
      requestId: string;
      senderName: string;
      subject: string;
    }
  ) {
    return notifyAdmins(prisma, {
      type: 'CONTACT_REQUEST',
      title: 'Nuova richiesta di contatto',
      message: `${params.senderName}: ${params.subject}`,
      linkUrl: `/richieste?highlight=${params.requestId}`,
      linkType: 'contact_request',
      linkEntityId: params.requestId,
    });
  },

  // === ABSENCES ===

  /**
   * Notifica nuova richiesta assenza (per admin)
   */
  async absenceRequest(
    prisma: PrismaClient,
    params: {
      absenceId: string;
      requesterName: string;
      startDate: Date;
      endDate: Date;
      isUrgent?: boolean;
    }
  ) {
    const formattedStart = params.startDate.toLocaleDateString('it-IT');
    const formattedEnd = params.endDate.toLocaleDateString('it-IT');
    const dateRange =
      formattedStart === formattedEnd
        ? formattedStart
        : `dal ${formattedStart} al ${formattedEnd}`;

    return notifyAdmins(prisma, {
      type: 'ABSENCE_REQUEST',
      title: params.isUrgent ? 'Richiesta assenza urgente' : 'Nuova richiesta assenza',
      message: `${params.requesterName} ha richiesto un'assenza ${dateRange}`,
      linkUrl: '/assenze',
      linkType: 'absence',
      linkEntityId: params.absenceId,
      isUrgent: params.isUrgent,
    });
  },

  /**
   * Notifica assenza confermata (per collaboratore)
   */
  async absenceConfirmed(
    prisma: PrismaClient,
    params: {
      collaboratorUserId: string;
      absenceId: string;
      startDate: Date;
      endDate: Date;
    }
  ) {
    const formattedStart = params.startDate.toLocaleDateString('it-IT');
    const formattedEnd = params.endDate.toLocaleDateString('it-IT');
    const dateRange =
      formattedStart === formattedEnd
        ? formattedStart
        : `dal ${formattedStart} al ${formattedEnd}`;

    return createNotification(prisma, {
      userId: params.collaboratorUserId,
      type: 'ABSENCE_CONFIRMED',
      title: 'Assenza confermata',
      message: `La tua richiesta di assenza ${dateRange} è stata confermata.`,
      linkUrl: '/le-mie-assenze',
      linkType: 'absence',
      linkEntityId: params.absenceId,
    });
  },

  /**
   * Notifica assenza rifiutata (per collaboratore)
   */
  async absenceRejected(
    prisma: PrismaClient,
    params: {
      collaboratorUserId: string;
      absenceId: string;
      startDate: Date;
      endDate: Date;
      reason?: string;
    }
  ) {
    const formattedStart = params.startDate.toLocaleDateString('it-IT');
    const formattedEnd = params.endDate.toLocaleDateString('it-IT');
    const dateRange =
      formattedStart === formattedEnd
        ? formattedStart
        : `dal ${formattedStart} al ${formattedEnd}`;

    let message = `La tua richiesta di assenza ${dateRange} è stata rifiutata.`;
    if (params.reason) {
      message += ` Motivo: ${params.reason}`;
    }

    return createNotification(prisma, {
      userId: params.collaboratorUserId,
      type: 'ABSENCE_REJECTED',
      title: 'Assenza rifiutata',
      message,
      linkUrl: '/le-mie-assenze',
      linkType: 'absence',
      linkEntityId: params.absenceId,
    });
  },

  /**
   * Notifica assenza staff (per studenti interessati)
   */
  async staffAbsence(
    prisma: PrismaClient,
    params: {
      affectedStudentIds: string[];
      staffName: string;
      startDate: Date;
      endDate: Date;
      affectedEventTitle?: string;
      affectedEventId?: string;
    }
  ) {
    const formattedStart = params.startDate.toLocaleDateString('it-IT');
    const formattedEnd = params.endDate.toLocaleDateString('it-IT');
    const dateRange =
      formattedStart === formattedEnd
        ? formattedStart
        : `${formattedStart} - ${formattedEnd}`;

    let message = `${params.staffName} sarà assente il ${dateRange}.`;
    if (params.affectedEventTitle) {
      message += ` L'evento "${params.affectedEventTitle}" potrebbe subire modifiche.`;
    }

    return createBulkNotifications(prisma, {
      userIds: params.affectedStudentIds,
      type: 'STAFF_ABSENCE',
      title: 'Assenza docente',
      message,
      linkType: params.affectedEventId ? 'event' : undefined,
      linkEntityId: params.affectedEventId,
      isUrgent: true,
    });
  },

  // === QUESTIONS ===

  /**
   * Notifica feedback su domanda
   */
  async questionFeedback(
    prisma: PrismaClient,
    params: {
      questionId: string;
      questionTitle: string;
      feedbackType: string;
      reporterName: string;
    }
  ) {
    return notifyStaff(prisma, {
      type: 'QUESTION_FEEDBACK',
      title: 'Segnalazione su domanda',
      message: `${params.reporterName} ha segnalato un problema (${params.feedbackType}) sulla domanda: "${params.questionTitle}"`,
      linkUrl: `/domande/${params.questionId}`,
      linkType: 'question',
      linkEntityId: params.questionId,
    });
  },

  /**
   * Notifica risposta aperta da correggere
   */
  async openAnswerToReview(
    prisma: PrismaClient,
    params: {
      simulationId: string;
      simulationTitle: string;
      studentName: string;
      answersCount: number;
    }
  ) {
    return notifyStaff(prisma, {
      type: 'OPEN_ANSWER_TO_REVIEW',
      title: 'Risposte da correggere',
      message: `${params.studentName} ha completato la simulazione "${params.simulationTitle}" con ${params.answersCount} risposte aperte da valutare`,
      linkUrl: `/simulazioni/${params.simulationId}/correzioni`,
      linkType: 'simulation',
      linkEntityId: params.simulationId,
    });
  },

  // === ATTENDANCE ===

  /**
   * Notifica presenza registrata
   */
  async attendanceRecorded(
    prisma: PrismaClient,
    params: {
      studentUserId: string;
      eventTitle: string;
      date: Date;
    }
  ) {
    const formattedDate = params.date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    return createNotification(prisma, {
      userId: params.studentUserId,
      type: 'ATTENDANCE_RECORDED',
      title: 'Presenza registrata',
      message: `La tua presenza a "${params.eventTitle}" del ${formattedDate} è stata registrata`,
      linkType: 'attendance',
    });
  },

  // === SYSTEM ===

  /**
   * Notifica alert di sistema
   */
  async systemAlert(
    prisma: PrismaClient,
    params: {
      userIds: string[];
      title: string;
      message: string;
      isUrgent?: boolean;
    }
  ) {
    return createBulkNotifications(prisma, {
      userIds: params.userIds,
      type: 'SYSTEM_ALERT',
      title: params.title,
      message: params.message,
      isUrgent: params.isUrgent ?? true,
      channel: 'BOTH',
    });
  },

  /**
   * Notifica generica
   */
  async general(
    prisma: PrismaClient,
    params: {
      userIds: string[];
      title: string;
      message: string;
      linkUrl?: string;
    }
  ) {
    return createBulkNotifications(prisma, {
      userIds: params.userIds,
      type: 'GENERAL',
      title: params.title,
      message: params.message,
      linkUrl: params.linkUrl,
    });
  },

  // === REMINDERS (for scheduled jobs) ===

  /**
   * Reminder contratto in scadenza
   */
  async contractReminder(
    prisma: PrismaClient,
    params: {
      recipientUserId: string;
      contractId: string;
      contractName: string;
      expiresAt: Date;
      signLink: string;
    }
  ) {
    const daysLeft = Math.ceil(
      (params.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return createNotification(prisma, {
      userId: params.recipientUserId,
      type: 'CONTRACT_REMINDER',
      title: 'Contratto in scadenza',
      message: `Il contratto "${params.contractName}" scade tra ${daysLeft} giorni. Firma prima della scadenza.`,
      linkUrl: params.signLink,
      linkType: 'contract',
      linkEntityId: params.contractId,
      isUrgent: daysLeft <= 3,
      channel: 'BOTH',
    });
  },

  /**
   * Notifica contratto scaduto
   */
  async contractExpired(
    prisma: PrismaClient,
    params: {
      recipientUserId: string;
      contractId: string;
      contractName: string;
    }
  ) {
    return createNotification(prisma, {
      userId: params.recipientUserId,
      type: 'CONTRACT_EXPIRED',
      title: 'Contratto scaduto',
      message: `Il contratto "${params.contractName}" è scaduto. Contatta la segreteria per maggiori informazioni.`,
      linkType: 'contract',
      linkEntityId: params.contractId,
      isUrgent: true,
      channel: 'BOTH',
    });
  },

  /**
   * Reminder evento in arrivo
   */
  async eventReminder(
    prisma: PrismaClient,
    params: {
      userIds: string[];
      eventId: string;
      eventTitle: string;
      eventDate: Date;
      minutesBefore: number;
    }
  ) {
    const timeText =
      params.minutesBefore >= 60
        ? `${Math.floor(params.minutesBefore / 60)} ore`
        : `${params.minutesBefore} minuti`;

    return createBulkNotifications(prisma, {
      userIds: params.userIds,
      type: 'EVENT_REMINDER',
      title: 'Promemoria evento',
      message: `L'evento "${params.eventTitle}" inizia tra ${timeText}`,
      linkType: 'event',
      linkEntityId: params.eventId,
      isUrgent: params.minutesBefore <= 30,
    });
  },

  /**
   * Reminder simulazione in scadenza
   */
  async simulationReminder(
    prisma: PrismaClient,
    params: {
      userIds: string[];
      simulationId: string;
      simulationTitle: string;
      dueDate: Date;
    }
  ) {
    const formattedDate = params.dueDate.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    return createBulkNotifications(prisma, {
      userIds: params.userIds,
      type: 'SIMULATION_REMINDER',
      title: 'Promemoria simulazione',
      message: `La simulazione "${params.simulationTitle}" scade il ${formattedDate}. Non dimenticare di completarla!`,
      linkUrl: `/simulazioni/${params.simulationId}`,
      linkType: 'simulation',
      linkEntityId: params.simulationId,
      isUrgent: true,
    });
  },

  /**
   * Notifica simulazione pronta per iniziare
   */
  async simulationReady(
    prisma: PrismaClient,
    params: {
      userIds: string[];
      simulationId: string;
      simulationTitle: string;
    }
  ) {
    return createBulkNotifications(prisma, {
      userIds: params.userIds,
      type: 'SIMULATION_READY',
      title: 'Simulazione disponibile',
      message: `La simulazione "${params.simulationTitle}" è ora disponibile. Puoi iniziarla quando vuoi.`,
      linkUrl: `/simulazioni/${params.simulationId}`,
      linkType: 'simulation',
      linkEntityId: params.simulationId,
    });
  },

  /**
   * Notifica simulazione iniziata (per admin/collaboratori)
   */
  async simulationStarted(
    prisma: PrismaClient,
    params: {
      simulationId: string;
      simulationTitle: string;
      studentName: string;
    }
  ) {
    return notifyStaff(prisma, {
      type: 'SIMULATION_STARTED',
      title: 'Simulazione iniziata',
      message: `${params.studentName} ha iniziato la simulazione "${params.simulationTitle}"`,
      linkUrl: `/simulazioni/${params.simulationId}`,
      linkType: 'simulation',
      linkEntityId: params.simulationId,
    });
  },

  /**
   * Notifica sostituzione assegnata
   */
  async substitutionAssigned(
    prisma: PrismaClient,
    params: {
      substituteUserId: string;
      originalStaffName: string;
      eventId: string;
      eventTitle: string;
      eventDate: Date;
    }
  ) {
    const formattedDate = params.eventDate.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    return createNotification(prisma, {
      userId: params.substituteUserId,
      type: 'SUBSTITUTION_ASSIGNED',
      title: 'Sostituzione assegnata',
      message: `Sei stato assegnato come sostituto di ${params.originalStaffName} per l'evento "${params.eventTitle}" del ${formattedDate}`,
      linkType: 'event',
      linkEntityId: params.eventId,
      isUrgent: true,
      channel: 'BOTH',
    });
  },

  // ==================== GROUP NOTIFICATIONS ====================

  /**
   * Notifica quando un utente viene aggiunto come membro di un gruppo
   */
  async groupMemberAdded(
    prisma: PrismaClient,
    params: {
      recipientUserId: string;
      groupId: string;
      groupName: string;
    }
  ) {
    return createNotification(prisma, {
      userId: params.recipientUserId,
      type: 'GROUP_MEMBER_ADDED',
      title: 'Aggiunto al gruppo',
      message: `Sei stato aggiunto al gruppo "${params.groupName}"`,
      linkUrl: '/gruppo',
      linkType: 'group',
      linkEntityId: params.groupId,
      channel: 'IN_APP',
    });
  },

  /**
   * Notifica quando un utente viene assegnato come referente di un gruppo
   */
  async groupReferentAssigned(
    prisma: PrismaClient,
    params: {
      recipientUserId: string;
      groupId: string;
      groupName: string;
    }
  ) {
    return createNotification(prisma, {
      userId: params.recipientUserId,
      type: 'GROUP_REFERENT_ASSIGNED',
      title: 'Assegnato come referente',
      message: `Sei stato assegnato come referente del gruppo "${params.groupName}"`,
      linkUrl: '/gruppi',
      linkType: 'group',
      linkEntityId: params.groupId,
      channel: 'IN_APP',
    });
  },
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Elimina notifiche per un'entità (quando viene eliminata)
 */
export async function deleteNotificationsForEntity(
  prisma: PrismaClient,
  entityType: string,
  entityId: string
): Promise<{ deleted: number }> {
  const result = await prisma.notification.deleteMany({
    where: {
      linkType: entityType,
      linkEntityId: entityId,
    },
  });

  return { deleted: result.count };
}

/**
 * Archivia tutte le notifiche lette per un utente
 */
export async function archiveReadNotifications(
  prisma: PrismaClient,
  userId: string
): Promise<{ archived: number }> {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: true,
      isArchived: false,
    },
    data: {
      isArchived: true,
    },
  });

  return { archived: result.count };
}

/**
 * Ottiene il conteggio notifiche non lette per un utente
 */
export async function getUnreadCount(
  prisma: PrismaClient,
  userId: string
): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
      isArchived: false,
    },
  });
}
