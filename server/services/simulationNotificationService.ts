/**
 * Simulation Notification Service
 * Handles calendar event creation, in-app notifications and email notifications for simulations
 */

import { PrismaClient, Simulation, User } from '@prisma/client';
import { sendSimulationInvitationEmail, SimulationInviteData, InviteeData } from '@/lib/email/eventEmails';
import { notifications } from '@/lib/notifications';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://leonardoschool.it';

interface SimulationWithRelations extends Simulation {
  createdBy?: { name: string } | null;
  assignments?: Array<{
    studentId?: string | null;
    groupId?: string | null;
    dueDate?: Date | null;
    startDate?: Date | null;
    endDate?: Date | null;
  }>;
}

interface NotificationResult {
  calendarEventId?: string | null;
  emailsSent: number;
  errors: string[];
}

/**
 * Create CalendarEvent for a simulation and invite all assigned students
 */
export async function createSimulationCalendarEvent(
  prisma: PrismaClient,
  simulation: SimulationWithRelations,
  createdByUser: User
): Promise<string | null> {
  // Only create calendar event if simulation has a start date
  if (!simulation.startDate) {
    return null;
  }

  // Calculate end date
  const endDate = simulation.endDate || new Date(
    simulation.startDate.getTime() + (simulation.durationMinutes || 60) * 60 * 1000
  );

  try {
    // Create the calendar event
    const calendarEvent = await prisma.calendarEvent.create({
      data: {
        title: simulation.title,
        description: simulation.description || `Simulazione: ${simulation.title}\nDomande: ${simulation.totalQuestions}\nDurata: ${simulation.durationMinutes} minuti`,
        type: 'SIMULATION',
        startDate: simulation.startDate,
        endDate,
        isAllDay: false,
        locationType: (simulation.locationType as 'ONLINE' | 'IN_PERSON' | 'HYBRID') || 'ONLINE',
        locationDetails: simulation.locationDetails,
        onlineLink: `${BASE_URL}/simulazioni/${simulation.id}`,
        createdById: createdByUser.id,
        isPublic: simulation.isPublic,
        sendEmailInvites: true,
        sendEmailReminders: true,
        reminderMinutes: 60, // 1 hour before
      },
    });

    // Link calendar event to simulation
    await prisma.simulation.update({
      where: { id: simulation.id },
      data: { calendarEventId: calendarEvent.id },
    });

    return calendarEvent.id;
  } catch (error) {
    console.error('Error creating calendar event for simulation:', error);
    return null;
  }
}

/**
 * Create EventInvitations for all students assigned to a simulation
 */
export async function createSimulationEventInvitations(
  prisma: PrismaClient,
  calendarEventId: string,
  assignments: Array<{
    studentId?: string | null;
    groupId?: string | null;
  }>
): Promise<void> {
  const invitationsToCreate: Array<{
    eventId: string;
    userId?: string;
    groupId?: string;
  }> = [];

  for (const assignment of assignments) {
    if (assignment.studentId) {
      // Get the user ID for this student
      const student = await prisma.student.findUnique({
        where: { id: assignment.studentId },
        select: { userId: true },
      });
      if (student) {
        invitationsToCreate.push({
          eventId: calendarEventId,
          userId: student.userId,
        });
      }
    }
    
    if (assignment.groupId) {
      invitationsToCreate.push({
        eventId: calendarEventId,
        groupId: assignment.groupId,
      });
    }
  }

  if (invitationsToCreate.length > 0) {
    await prisma.eventInvitation.createMany({
      data: invitationsToCreate,
      skipDuplicates: true,
    });
  }
}

/**
 * Get all student emails for simulation assignments
 */
export async function getAssignedStudentEmails(
  prisma: PrismaClient,
  assignments: Array<{
    studentId?: string | null;
    groupId?: string | null;
  }>
): Promise<InviteeData[]> {
  const studentUserIds = new Set<string>();
  const invitees: InviteeData[] = [];

  for (const assignment of assignments) {
    // Direct student assignment
    if (assignment.studentId) {
      const student = await prisma.student.findUnique({
        where: { id: assignment.studentId },
        include: { user: { select: { id: true, email: true, name: true } } },
      });
      if (student?.user && !studentUserIds.has(student.user.id)) {
        studentUserIds.add(student.user.id);
        invitees.push({
          email: student.user.email,
          name: student.user.name,
        });
      }
    }

    // Group assignment - get all students in the group
    if (assignment.groupId) {
      const groupMembers = await prisma.groupMember.findMany({
        where: { groupId: assignment.groupId },
        include: {
          student: {
            include: { user: { select: { id: true, email: true, name: true } } },
          },
        },
      });
      for (const member of groupMembers) {
        if (member.student?.user && !studentUserIds.has(member.student.user.id)) {
          studentUserIds.add(member.student.user.id);
          invitees.push({
            email: member.student.user.email,
            name: member.student.user.name,
          });
        }
      }
    }
  }

  return invitees;
}

/**
 * Get user IDs for all assigned students (for in-app notifications)
 */
export async function getAssignedStudentUserIds(
  prisma: PrismaClient,
  assignments: Array<{
    studentId?: string | null;
    groupId?: string | null;
  }>
): Promise<string[]> {
  const userIds = new Set<string>();

  for (const assignment of assignments) {
    // Direct student assignment
    if (assignment.studentId) {
      const student = await prisma.student.findUnique({
        where: { id: assignment.studentId },
        select: { userId: true },
      });
      if (student?.userId) {
        userIds.add(student.userId);
      }
    }

    // Group assignment - get all students in the group
    if (assignment.groupId) {
      const groupMembers = await prisma.groupMember.findMany({
        where: { groupId: assignment.groupId },
        select: { student: { select: { userId: true } } },
      });
      for (const member of groupMembers) {
        if (member.student?.userId) {
          userIds.add(member.student.userId);
        }
      }
    }
  }

  return Array.from(userIds);
}

/**
 * Send simulation invitation emails to all assigned students
 */
export async function sendSimulationNotifications(
  prisma: PrismaClient,
  simulation: SimulationWithRelations,
  createdByUser: User,
  assignments: Array<{
    studentId?: string | null;
    groupId?: string | null;
    dueDate?: Date | null;
    startDate?: Date | null;
    endDate?: Date | null;
  }>
): Promise<NotificationResult> {
  const result: NotificationResult = {
    calendarEventId: null,
    emailsSent: 0,
    errors: [],
  };

  // Check if we have dates from simulation OR from assignments
  const hasSimulationDates = !!simulation.startDate;
  const hasAssignmentDates = assignments.some(a => a.startDate);
  
  // Skip calendar/email if no dates at all, but still send in-app notifications
  if (!hasSimulationDates && !hasAssignmentDates) {
    // Get all invitee user IDs for in-app notification
    const inviteeUserIds = await getAssignedStudentUserIds(prisma, assignments);
    if (inviteeUserIds.length > 0) {
      await notifications.simulationAssigned(prisma, {
        assignedUserIds: inviteeUserIds,
        simulationId: simulation.id,
        simulationTitle: simulation.title,
        dueDate: assignments[0]?.dueDate || undefined,
      });
    }
    return result;
  }

  // Skip if no assignments
  if (!assignments || assignments.length === 0) {
    return result;
  }

  try {
    // Use assignment dates if simulation doesn't have dates
    const effectiveStartDate = simulation.startDate || assignments[0]?.startDate;
    const effectiveEndDate = simulation.endDate || assignments[0]?.endDate;
    
    // Create a modified simulation object with effective dates for calendar/email
    const simulationWithDates = {
      ...simulation,
      startDate: effectiveStartDate || null,
      endDate: effectiveEndDate || null,
    };

    // 1. Create calendar event (only if we have a start date)
    if (effectiveStartDate) {
      result.calendarEventId = await createSimulationCalendarEvent(prisma, simulationWithDates as SimulationWithRelations & { startDate: Date }, createdByUser);
    }

    // 2. Create event invitations if calendar event was created
    if (result.calendarEventId) {
      await createSimulationEventInvitations(prisma, result.calendarEventId, assignments);
    }

    // 3. Get all invitee data (emails and user IDs)
    const invitees = await getAssignedStudentEmails(prisma, assignments);

    if (invitees.length === 0) {
      return result;
    }

    // 3.1. Create in-app notifications for assigned students
    const inviteeUserIds = await getAssignedStudentUserIds(prisma, assignments);
    if (inviteeUserIds.length > 0) {
      await notifications.simulationAssigned(prisma, {
        assignedUserIds: inviteeUserIds,
        simulationId: simulation.id,
        simulationTitle: simulation.title,
        dueDate: assignments[0]?.dueDate || undefined,
      });
    }

    // 4. Prepare simulation data for email
    const simulationData: SimulationInviteData = {
      id: simulation.id,
      title: simulation.title,
      description: simulation.description,
      type: simulation.type,
      isOfficial: simulation.isOfficial,
      startDate: effectiveStartDate || null,
      endDate: effectiveEndDate || null,
      durationMinutes: simulation.durationMinutes,
      totalQuestions: simulation.totalQuestions,
      correctPoints: simulation.correctPoints,
      wrongPoints: simulation.wrongPoints,
      blankPoints: simulation.blankPoints,
      locationType: simulation.locationType,
      locationDetails: simulation.locationDetails,
      createdByName: simulation.createdBy?.name || createdByUser.name,
      dueDate: assignments[0]?.dueDate || null,
      platformUrl: `${BASE_URL}/simulazioni/${simulation.id}`,
    };

    // 5. Send emails
    const emailResult = await sendSimulationInvitationEmail(simulationData, invitees);
    result.emailsSent = emailResult.sentCount;
    result.errors = emailResult.errors;

  } catch (error) {
    console.error('Error in sendSimulationNotifications:', error);
    result.errors.push(error instanceof Error ? error.message : 'Errore sconosciuto');
  }

  return result;
}

/**
 * Helper function to notify about a simulation by ID
 * Fetches all required data and sends notifications
 */
export async function notifySimulationCreated(
  simulationId: string,
  prisma: PrismaClient
): Promise<NotificationResult> {
  const result: NotificationResult = {
    calendarEventId: null,
    emailsSent: 0,
    errors: [],
  };

  try {
    // Fetch simulation with all required relations
    const simulation = await prisma.simulation.findUnique({
      where: { id: simulationId },
      include: {
        createdBy: true,
        assignments: {
          select: {
            studentId: true,
            groupId: true,
            dueDate: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    if (!simulation) {
      result.errors.push('Simulazione non trovata');
      return result;
    }

    if (!simulation.createdBy) {
      result.errors.push('Creatore simulazione non trovato');
      return result;
    }

    if (simulation.assignments.length === 0) {
      // No assignments, no notifications needed
      return result;
    }

    // Check if we have dates from simulation OR from assignments
    const hasSimulationDates = !!simulation.startDate;
    const hasAssignmentDates = simulation.assignments.some(a => a.startDate);
    
    if (!hasSimulationDates && !hasAssignmentDates) {
      // No dates at all, still send in-app notifications but skip calendar/email
      // Get all invitee user IDs for in-app notification
      const inviteeUserIds = await getAssignedStudentUserIds(prisma, simulation.assignments);
      if (inviteeUserIds.length > 0) {
        await notifications.simulationAssigned(prisma, {
          assignedUserIds: inviteeUserIds,
          simulationId: simulation.id,
          simulationTitle: simulation.title,
          dueDate: simulation.assignments[0]?.dueDate || undefined,
        });
      }
      return result;
    }

    // Call the main notification function
    return await sendSimulationNotifications(
      prisma,
      simulation,
      simulation.createdBy,
      simulation.assignments
    );
  } catch (error) {
    console.error('Error in notifySimulationCreated:', error);
    result.errors.push(error instanceof Error ? error.message : 'Errore sconosciuto');
    return result;
  }
}
