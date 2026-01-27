/**
 * Calendar Router
 * Gestione eventi calendario, presenze e assenze staff
 */

import { z } from 'zod';
import { router, protectedProcedure, adminProcedure, staffProcedure } from '../init';
import { TRPCError } from '@trpc/server';
import {
  EventType,
  EventLocationType,
  RecurrenceFrequency,
  EventInviteStatus,
  AttendanceStatus,
  StaffAbsenceStatus,
} from '@prisma/client';
import {
  sendEventInvitationEmail,
  sendEventModificationEmail,
  sendEventCancellationEmail,
  sendAbsenceStatusEmail,
  type EventEmailData,
  type InviteeData,
} from '@/lib/email/eventEmails';
import { notifications, createBulkNotifications } from '@/lib/notifications';

// ==================== CALENDAR EVENTS ====================

export const calendarRouter = router({
  // Get events with filters
  getEvents: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        type: z.nativeEnum(EventType).optional(),
        createdById: z.string().optional(),
        includeInvitations: z.boolean().optional().default(false),
        includeCancelled: z.boolean().optional().default(false),
        onlyMyEvents: z.boolean().optional().default(false),
        page: z.number().min(1).optional().default(1),
        pageSize: z.number().min(1).max(100).optional().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, type, createdById, includeInvitations, includeCancelled, onlyMyEvents, page, pageSize } = input;

      const where: Parameters<typeof ctx.prisma.calendarEvent.findMany>[0]['where'] = {};

      // Date filters
      if (startDate) {
        where.startDate = { gte: startDate };
      }
      if (endDate) {
        where.endDate = { lte: endDate };
      }

      // Type filter
      if (type) {
        where.type = type;
      }

      // Creator filter
      if (createdById) {
        where.createdById = createdById;
      }

      // Cancelled filter
      if (!includeCancelled) {
        where.isCancelled = false;
      }

      // Get student's groups if user is a student (needed for both filters below)
      let studentGroupIds: string[] = [];
      if (ctx.user?.role === 'STUDENT') {
        const student = await ctx.prisma.student.findUnique({
          where: { userId: ctx.user.id },
          select: { id: true },
        });
        
        if (student) {
          const groupMembers = await ctx.prisma.groupMember.findMany({
            where: { studentId: student.id },
            select: { groupId: true },
          });
          studentGroupIds = groupMembers.map(gm => gm.groupId);
        }
      }

      // Get collaborator's groups if user is a collaborator
      let collaboratorGroupIds: string[] = [];
      if (ctx.user?.role === 'COLLABORATOR') {
        const collaborator = await ctx.prisma.collaborator.findUnique({
          where: { userId: ctx.user.id },
          select: { id: true },
        });
        
        if (collaborator) {
          const groupMembers = await ctx.prisma.groupMember.findMany({
            where: { collaboratorId: collaborator.id },
            select: { groupId: true },
          });
          collaboratorGroupIds = groupMembers.map(gm => gm.groupId);
        }
      }

      // Only my events (created by me or invited) - takes precedence over public filter
      if (onlyMyEvents && ctx.user) {
        type WhereCondition = Parameters<typeof ctx.prisma.calendarEvent.findMany>[0]['where'];
        const orConditions: WhereCondition[] = [
          { createdById: ctx.user.id },
          { invitations: { some: { userId: ctx.user.id } } },
        ];
        
        // Add group invitations for students
        if (studentGroupIds.length > 0) {
          orConditions.push({ invitations: { some: { groupId: { in: studentGroupIds } } } });
        }
        
        // Add group invitations for collaborators
        if (collaboratorGroupIds.length > 0) {
          orConditions.push({ invitations: { some: { groupId: { in: collaboratorGroupIds } } } });
        }
        
        where.OR = orConditions;
      } 
      // Public events or user-specific (only if not using onlyMyEvents filter)
      else if (ctx.user?.role === 'STUDENT') {
        // Students see: public events, events they're invited to directly, or events their groups are invited to
        type WhereCondition = Parameters<typeof ctx.prisma.calendarEvent.findMany>[0]['where'];
        const orConditions: WhereCondition[] = [
          { isPublic: true },
          { invitations: { some: { userId: ctx.user.id } } },
        ];
        
        if (studentGroupIds.length > 0) {
          orConditions.push({ invitations: { some: { groupId: { in: studentGroupIds } } } });
        }
        
        where.OR = orConditions;
      }
      // Collaborators see: public events, events created by them, events they're invited to directly, or events their groups are invited to
      else if (ctx.user?.role === 'COLLABORATOR') {
        type WhereCondition = Parameters<typeof ctx.prisma.calendarEvent.findMany>[0]['where'];
        const orConditions: WhereCondition[] = [
          { isPublic: true },
          { createdById: ctx.user.id },
          { invitations: { some: { userId: ctx.user.id } } },
        ];
        
        if (collaboratorGroupIds.length > 0) {
          orConditions.push({ invitations: { some: { groupId: { in: collaboratorGroupIds } } } });
        }
        
        where.OR = orConditions;
      }

      const [events, total] = await Promise.all([
        ctx.prisma.calendarEvent.findMany({
          where,
          include: {
            createdBy: {
              select: { id: true, name: true, email: true, role: true },
            },
            invitations: includeInvitations
              ? {
                  include: {
                    user: { select: { id: true, name: true, email: true } },
                    group: { select: { id: true, name: true } },
                  },
                }
              : false,
            _count: {
              select: {
                invitations: true,
                attendances: true,
              },
            },
          },
          orderBy: { startDate: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        ctx.prisma.calendarEvent.count({ where }),
      ]);

      return {
        events,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Get single event with details
  getEvent: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.prisma.calendarEvent.findUnique({
        where: { id: input.id },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
          invitations: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              group: { select: { id: true, name: true } },
            },
          },
          attendances: {
            include: {
              student: {
                select: { 
                  id: true,
                  user: {
                    select: { name: true, email: true },
                  },
                },
              },
              recordedBy: {
                select: { id: true, name: true },
              },
            },
          },
          staffAbsences: {
            include: {
              requester: { select: { id: true, name: true } },
              substitute: { select: { id: true, name: true } },
            },
          },
          simulation: {
            select: { id: true, title: true, status: true },
          },
        },
      });

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Evento non trovato',
        });
      }

      // Check access
      if (ctx.user?.role === 'STUDENT' && !event.isPublic) {
        // Check if user is invited directly
        const isInvitedDirectly = event.invitations?.some(
          (inv) => inv.userId === ctx.user?.id
        );
        
        // Check if user is invited via group
        let isInvitedViaGroup = false;
        if (!isInvitedDirectly) {
          const student = await ctx.prisma.student.findUnique({
            where: { userId: ctx.user.id },
            select: { id: true },
          });
          
          if (student) {
            const groupMembers = await ctx.prisma.groupMember.findMany({
              where: { studentId: student.id },
              select: { groupId: true },
            });
            const studentGroupIds = new Set(groupMembers.map(gm => gm.groupId));
            
            isInvitedViaGroup = event.invitations?.some(
              (inv) => inv.groupId && studentGroupIds.has(inv.groupId)
            ) || false;
          }
        }
        
        if (!isInvitedDirectly && !isInvitedViaGroup) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Non hai accesso a questo evento',
          });
        }
      }

      return event;
    }),

  // Create event (staff only)
  createEvent: staffProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        type: z.nativeEnum(EventType).default('OTHER'),
        startDate: z.date(),
        endDate: z.date(),
        isAllDay: z.boolean().optional().default(false),
        locationType: z.nativeEnum(EventLocationType).default('IN_PERSON'),
        locationDetails: z.string().optional(),
        onlineLink: z.string().url().optional().or(z.literal('')),
        isPublic: z.boolean().optional().default(false),
        sendEmailInvites: z.boolean().optional().default(false),
        sendEmailReminders: z.boolean().optional().default(false),
        reminderMinutes: z.number().min(5).max(10080).optional(), // max 1 week
        isRecurring: z.boolean().optional().default(false),
        recurrenceFrequency: z.nativeEnum(RecurrenceFrequency).optional(),
        recurrenceEndDate: z.date().optional(),
        // Invitations
        inviteUserIds: z.array(z.string()).optional(),
        inviteGroupIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const {
        inviteUserIds,
        inviteGroupIds,
        onlineLink,
        ...eventData
      } = input;

      // Validate dates
      if (eventData.endDate < eventData.startDate) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La data di fine deve essere successiva alla data di inizio',
        });
      }

      // Create event with invitations
      const event = await ctx.prisma.calendarEvent.create({
        data: {
          title: eventData.title,
          description: eventData.description,
          type: eventData.type,
          startDate: eventData.startDate,
          endDate: eventData.endDate,
          isAllDay: eventData.isAllDay,
          locationType: eventData.locationType,
          locationDetails: eventData.locationDetails,
          onlineLink: onlineLink || null,
          isPublic: eventData.isPublic,
          sendEmailInvites: eventData.sendEmailInvites,
          sendEmailReminders: eventData.sendEmailReminders,
          reminderMinutes: eventData.reminderMinutes,
          isRecurring: eventData.isRecurring,
          recurrenceFrequency: eventData.recurrenceFrequency,
          recurrenceEndDate: eventData.recurrenceEndDate,
          createdBy: { connect: { id: ctx.user.id } },
          invitations: {
            create: [
              ...(inviteUserIds?.map((userId) => ({ user: { connect: { id: userId } } })) || []),
              ...(inviteGroupIds?.map((groupId) => ({ group: { connect: { id: groupId } } })) || []),
            ],
          },
        },
        include: {
          createdBy: { select: { id: true, name: true } },
          invitations: {
            include: {
              user: { select: { id: true, email: true, name: true } },
              group: { 
                include: { 
                  members: { 
                    include: { 
                      student: { 
                        include: { 
                          user: { select: { id: true, email: true, name: true } } 
                        } 
                      },
                      collaborator: { 
                        include: { 
                          user: { select: { id: true, email: true, name: true } } 
                        } 
                      },
                    } 
                  } 
                } 
              },
            },
          },
        },
      });

      // Send email invites and in-app notifications if there are invitations
      if (event.invitations.length > 0) {
        // Collect all invitees with their IDs and emails
        const invitees: (InviteeData & { id: string })[] = [];
        const seenIds = new Set<string>();

        for (const invitation of event.invitations) {
          // Direct user invite
          if (invitation.user?.id && !seenIds.has(invitation.user.id)) {
            invitees.push({
              id: invitation.user.id,
              email: invitation.user.email || '',
              name: invitation.user.name || 'Utente',
            });
            seenIds.add(invitation.user.id);
          }

          // Group members (students and collaborators)
          if (invitation.group?.members) {
            for (const member of invitation.group.members) {
              // Check student user
              if (member.student?.user?.id && !seenIds.has(member.student.user.id)) {
                invitees.push({
                  id: member.student.user.id,
                  email: member.student.user.email || '',
                  name: member.student.user.name || 'Utente',
                });
                seenIds.add(member.student.user.id);
              }
              // Check collaborator user
              if (member.collaborator?.user?.id && !seenIds.has(member.collaborator.user.id)) {
                invitees.push({
                  id: member.collaborator.user.id,
                  email: member.collaborator.user.email || '',
                  name: member.collaborator.user.name || 'Utente',
                });
                seenIds.add(member.collaborator.user.id);
              }
            }
          }
        }

        // Send email invitations if we have invitees and valid dates
        if (invitees.length > 0 && event.startDate && event.endDate) {
          const eventEmailData: EventEmailData = {
            id: event.id,
            title: event.title,
            description: event.description,
            type: event.type,
            startDate: event.startDate,
            endDate: event.endDate,
            isAllDay: event.isAllDay,
            locationType: event.locationType,
            locationDetails: event.locationDetails,
            onlineLink: event.onlineLink,
            createdByName: event.createdBy?.name || 'Staff',
          };

          // Send emails asynchronously if enabled (don't block the response)
          if (eventData.sendEmailInvites) {
            const emailInvitees = invitees.filter(i => i.email);
            sendEventInvitationEmail(eventEmailData, emailInvitees).catch((error) => {
              console.error('Error sending event invitation emails:', error);
            });
          }

          // Create in-app notifications for all invitees
          const userIds = invitees.map(i => i.id);
          createBulkNotifications(ctx.prisma, {
            userIds,
            type: 'EVENT_INVITATION',
            title: 'Nuovo invito evento',
            message: `Sei stato invitato all'evento "${event.title}"`,
            linkType: 'event',
            linkEntityId: event.id,
          }).catch((error) => {
            console.error('Error creating event invitation notifications:', error);
          });
        }
      }

      return event;
    }),

  // Update event
  updateEvent: staffProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        type: z.nativeEnum(EventType).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        isAllDay: z.boolean().optional(),
        locationType: z.nativeEnum(EventLocationType).optional(),
        locationDetails: z.string().optional(),
        onlineLink: z.string().url().optional().or(z.literal('')),
        isPublic: z.boolean().optional(),
        sendEmailReminders: z.boolean().optional(),
        reminderMinutes: z.number().min(5).max(10080).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, onlineLink, ...updateData } = input;

      // Check event exists
      const existing = await ctx.prisma.calendarEvent.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Evento non trovato',
        });
      }

      // Collaborators can only edit their own events
      if (ctx.user.role === 'COLLABORATOR' && existing.createdById !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Puoi modificare solo i tuoi eventi',
        });
      }

      // Validate dates if both provided
      if (updateData.startDate && updateData.endDate && updateData.endDate < updateData.startDate) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La data di fine deve essere successiva alla data di inizio',
        });
      }

      const event = await ctx.prisma.calendarEvent.update({
        where: { id },
        data: {
          ...updateData,
          onlineLink: onlineLink === '' ? null : onlineLink,
        },
        include: {
          createdBy: { select: { id: true, name: true } },
          invitations: {
            include: {
              user: { select: { id: true, email: true, name: true } },
              group: {
                include: {
                  members: {
                    include: {
                      student: {
                        include: {
                          user: { select: { id: true, email: true, name: true } }
                        }
                      },
                      collaborator: {
                        include: {
                          user: { select: { id: true, email: true, name: true } }
                        }
                      },
                    }
                  }
                }
              },
            },
          },
        },
      });

      // Send modification notifications to invited users
      if (event.invitations.length > 0) {
        const invitees: (InviteeData & { id: string })[] = [];
        const seenIds = new Set<string>();

        for (const invitation of event.invitations) {
          if (invitation.user?.id && !seenIds.has(invitation.user.id)) {
            invitees.push({
              id: invitation.user.id,
              email: invitation.user.email || '',
              name: invitation.user.name || 'Utente',
            });
            seenIds.add(invitation.user.id);
          }

          if (invitation.group?.members) {
            for (const member of invitation.group.members) {
              if (member.student?.user?.id && !seenIds.has(member.student.user.id)) {
                invitees.push({
                  id: member.student.user.id,
                  email: member.student.user.email || '',
                  name: member.student.user.name || 'Utente',
                });
                seenIds.add(member.student.user.id);
              }
              if (member.collaborator?.user?.id && !seenIds.has(member.collaborator.user.id)) {
                invitees.push({
                  id: member.collaborator.user.id,
                  email: member.collaborator.user.email || '',
                  name: member.collaborator.user.name || 'Utente',
                });
                seenIds.add(member.collaborator.user.id);
              }
            }
          }
        }

        // Send modification emails if we have invitees and valid dates
        if (invitees.length > 0 && event.startDate && event.endDate) {
          const eventEmailData: EventEmailData = {
            id: event.id,
            title: event.title,
            description: event.description,
            type: event.type,
            startDate: event.startDate,
            endDate: event.endDate,
            isAllDay: event.isAllDay,
            locationType: event.locationType,
            locationDetails: event.locationDetails,
            onlineLink: event.onlineLink,
            createdByName: event.createdBy?.name || 'Staff',
          };

          // Send modification emails
          const emailInvitees = invitees.filter(i => i.email);
          sendEventModificationEmail(eventEmailData, emailInvitees).catch((error) => {
            console.error('Error sending event modification emails:', error);
          });

          // Create in-app notifications
          const userIds = invitees.map(i => i.id);
          createBulkNotifications(ctx.prisma, {
            userIds,
            type: 'EVENT_UPDATED',
            title: 'Evento modificato',
            message: `L'evento "${event.title}" è stato modificato`,
            linkType: 'event',
            linkEntityId: event.id,
          }).catch((error) => {
            console.error('Error creating event update notifications:', error);
          });
        }
      }

      return event;
    }),

  // Cancel event
  cancelEvent: staffProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.calendarEvent.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Evento non trovato',
        });
      }

      // Collaborators can only cancel their own events
      if (ctx.user.role === 'COLLABORATOR' && existing.createdById !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Puoi annullare solo i tuoi eventi',
        });
      }

      // Get event with invitations for email notifications
      const eventWithInvitations = await ctx.prisma.calendarEvent.findUnique({
        where: { id: input.id },
        include: {
          createdBy: { select: { name: true } },
          invitations: {
            include: {
              user: { select: { id: true, email: true, name: true } },
              group: {
                include: {
                  members: {
                    include: {
                      student: {
                        include: {
                          user: { select: { id: true, email: true, name: true } }
                        }
                      },
                      collaborator: {
                        include: {
                          user: { select: { id: true, email: true, name: true } }
                        }
                      },
                    }
                  }
                }
              },
            },
          },
        },
      });

      const event = await ctx.prisma.calendarEvent.update({
        where: { id: input.id },
        data: {
          isCancelled: true,
          cancelledAt: new Date(),
          cancelledById: ctx.user.id,
          cancelReason: input.reason,
        },
      });

      // Send cancellation notifications to invited users
      if (eventWithInvitations && eventWithInvitations.invitations.length > 0) {
        const invitees: (InviteeData & { id: string })[] = [];
        const seenIds = new Set<string>();

        for (const invitation of eventWithInvitations.invitations) {
          if (invitation.user?.id && !seenIds.has(invitation.user.id)) {
            invitees.push({
              id: invitation.user.id,
              email: invitation.user.email || '',
              name: invitation.user.name || 'Utente',
            });
            seenIds.add(invitation.user.id);
          }

          if (invitation.group?.members) {
            for (const member of invitation.group.members) {
              if (member.student?.user?.id && !seenIds.has(member.student.user.id)) {
                invitees.push({
                  id: member.student.user.id,
                  email: member.student.user.email || '',
                  name: member.student.user.name || 'Utente',
                });
                seenIds.add(member.student.user.id);
              }
              if (member.collaborator?.user?.id && !seenIds.has(member.collaborator.user.id)) {
                invitees.push({
                  id: member.collaborator.user.id,
                  email: member.collaborator.user.email || '',
                  name: member.collaborator.user.name || 'Utente',
                });
                seenIds.add(member.collaborator.user.id);
              }
            }
          }
        }

        // Send cancellation emails if we have invitees and valid dates
        if (invitees.length > 0 && eventWithInvitations.startDate && eventWithInvitations.endDate) {
          const eventEmailData: EventEmailData = {
            id: eventWithInvitations.id,
            title: eventWithInvitations.title,
            description: eventWithInvitations.description,
            type: eventWithInvitations.type,
            startDate: eventWithInvitations.startDate,
            endDate: eventWithInvitations.endDate,
            isAllDay: eventWithInvitations.isAllDay,
            locationType: eventWithInvitations.locationType,
            locationDetails: eventWithInvitations.locationDetails,
            onlineLink: eventWithInvitations.onlineLink,
            createdByName: eventWithInvitations.createdBy?.name || 'Staff',
          };

          // Send cancellation emails
          const emailInvitees = invitees.filter(i => i.email);
          sendEventCancellationEmail(eventEmailData, emailInvitees, input.reason).catch((error) => {
            console.error('Error sending event cancellation emails:', error);
          });

          // Create in-app notifications
          const userIds = invitees.map(i => i.id);
          const reasonSuffix = input.reason ? `: ${input.reason}` : '';
          const notificationMessage = `L'evento "${eventWithInvitations.title}" è stato annullato${reasonSuffix}`;
          createBulkNotifications(ctx.prisma, {
            userIds,
            type: 'EVENT_CANCELLED',
            title: 'Evento annullato',
            message: notificationMessage,
            linkType: 'event',
            linkEntityId: eventWithInvitations.id,
          }).catch((error) => {
            console.error('Error creating event cancellation notifications:', error);
          });
        }
      }

      return event;
    }),

  // Delete event (admin only, hard delete)
  deleteEvent: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.calendarEvent.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Evento non trovato',
        });
      }

      await ctx.prisma.calendarEvent.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // ==================== INVITATIONS ====================

  // Add invitations to event
  addInvitations: staffProcedure
    .input(
      z.object({
        eventId: z.string(),
        userIds: z.array(z.string()).optional(),
        groupIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { eventId, userIds, groupIds } = input;

      const event = await ctx.prisma.calendarEvent.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Evento non trovato',
        });
      }

      // Collaborators can only manage their own events
      if (ctx.user.role === 'COLLABORATOR' && event.createdById !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Puoi gestire solo i tuoi eventi',
        });
      }

      const invitations = await ctx.prisma.$transaction([
        ...(userIds?.map((userId) =>
          ctx.prisma.eventInvitation.upsert({
            where: { eventId_userId: { eventId, userId } },
            create: { eventId, userId },
            update: {},
          })
        ) || []),
        ...(groupIds?.map((groupId) =>
          ctx.prisma.eventInvitation.upsert({
            where: { eventId_groupId: { eventId, groupId } },
            create: { eventId, groupId },
            update: {},
          })
        ) || []),
      ]);

      return { added: invitations.length };
    }),

  // Remove invitation
  removeInvitation: staffProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.prisma.eventInvitation.findUnique({
        where: { id: input.invitationId },
        include: { event: true },
      });

      if (!invitation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invito non trovato',
        });
      }

      // Collaborators can only manage their own events
      if (ctx.user.role === 'COLLABORATOR' && invitation.event.createdById !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Puoi gestire solo i tuoi eventi',
        });
      }

      await ctx.prisma.eventInvitation.delete({
        where: { id: input.invitationId },
      });

      return { success: true };
    }),

  // Respond to invitation (for invited users)
  respondToInvitation: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        status: z.enum(['ACCEPTED', 'DECLINED', 'TENTATIVE']),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.prisma.eventInvitation.findFirst({
        where: {
          eventId: input.eventId,
          userId: ctx.user.id,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Non sei stato invitato a questo evento',
        });
      }

      const updated = await ctx.prisma.eventInvitation.update({
        where: { id: invitation.id },
        data: {
          status: input.status as EventInviteStatus,
          respondedAt: new Date(),
          responseNote: input.note,
        },
      });

      return updated;
    }),

  // ==================== ATTENDANCE ====================

  // Get attendances for an event
  getEventAttendances: staffProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.prisma.calendarEvent.findUnique({
        where: { id: input.eventId },
        include: {
          invitations: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                  student: {
                    select: { id: true },
                  },
                },
              },
              group: {
                select: {
                  id: true,
                  name: true,
                  members: {
                    where: {
                      studentId: { not: null }, // Only include student members
                    },
                    include: {
                      student: {
                        select: {
                          id: true,
                          user: {
                            select: { id: true, name: true, email: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Evento non trovato',
        });
      }

      // Check if collaborator can access this event (must be creator)
      if (ctx.user.role === 'COLLABORATOR' && event.createdById !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non hai i permessi per gestire le presenze di questo evento',
        });
      }

      const attendances = await ctx.prisma.attendance.findMany({
        where: { eventId: input.eventId },
        include: {
          student: {
            select: {
              id: true,
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          recordedBy: {
            select: { id: true, name: true },
          },
          customStatus: true,
        },
      });

      // Collect all invited students from different sources
      const studentsMap = new Map<string, { id: string; name: string; email: string }>();

      event.invitations.forEach((inv) => {
        // Direct user invitation (if student)
        if (inv.user?.role === 'STUDENT' && inv.user.student) {
          studentsMap.set(inv.user.student.id, {
            id: inv.user.student.id,
            name: inv.user.name,
            email: inv.user.email,
          });
        }

        // Group invitation - expand all student members
        if (inv.group?.members) {
          inv.group.members.forEach((member) => {
            if (member.student?.user) {
              studentsMap.set(member.student.id, {
                id: member.student.id,
                name: member.student.user.name,
                email: member.student.user.email,
              });
            }
          });
        }
      });

      const invitedStudents = Array.from(studentsMap.values());

      return {
        attendances,
        invitedStudents,
        event: {
          id: event.id,
          createdById: event.createdById,
        },
      };
    }),

  // Record attendance
  recordAttendance: staffProcedure
    .input(
      z.object({
        eventId: z.string(),
        studentId: z.string(),
        status: z.nativeEnum(AttendanceStatus),
        customStatusId: z.string().optional(),
        notes: z.string().optional(),
        arrivalTime: z.date().optional(),
        leaveTime: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { eventId, studentId, ...attendanceData } = input;

      // Check event exists
      const event = await ctx.prisma.calendarEvent.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Evento non trovato',
        });
      }

      // Check if collaborator can access this event (must be creator)
      if (ctx.user.role === 'COLLABORATOR' && event.createdById !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non hai i permessi per gestire le presenze di questo evento',
        });
      }

      // Upsert attendance
      const attendance = await ctx.prisma.attendance.upsert({
        where: {
          eventId_studentId: { eventId, studentId },
        },
        create: {
          eventId,
          studentId,
          ...attendanceData,
          recordedById: ctx.user.id,
        },
        update: {
          ...attendanceData,
          lastEditedById: ctx.user.id,
          lastEditedAt: new Date(),
        },
        include: {
          student: {
            select: {
              id: true,
              user: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      return attendance;
    }),

  // Bulk record attendance
  bulkRecordAttendance: staffProcedure
    .input(
      z.object({
        eventId: z.string(),
        attendances: z.array(
          z.object({
            studentId: z.string(),
            status: z.nativeEnum(AttendanceStatus),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { eventId, attendances } = input;

      // Check event exists
      const event = await ctx.prisma.calendarEvent.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Evento non trovato',
        });
      }

      // Check if collaborator can access this event (must be creator)
      if (ctx.user.role === 'COLLABORATOR' && event.createdById !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non hai i permessi per gestire le presenze di questo evento',
        });
      }

      const results = await ctx.prisma.$transaction(
        attendances.map((att) =>
          ctx.prisma.attendance.upsert({
            where: {
              eventId_studentId: { eventId, studentId: att.studentId },
            },
            create: {
              eventId,
              studentId: att.studentId,
              status: att.status,
              notes: att.notes,
              recordedById: ctx.user.id,
            },
            update: {
              status: att.status,
              notes: att.notes,
              lastEditedById: ctx.user.id,
              lastEditedAt: new Date(),
            },
          })
        )
      );

      return { recorded: results.length };
    }),

  // ==================== STAFF ABSENCES ====================

  // Get staff absences
  getStaffAbsences: staffProcedure
    .input(
      z.object({
        status: z.nativeEnum(StaffAbsenceStatus).optional(),
        requesterId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        onlyMine: z.boolean().optional().default(false),
        page: z.number().min(1).optional().default(1),
        pageSize: z.number().min(1).max(50).optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { status, requesterId, startDate, endDate, onlyMine, page, pageSize } = input;

      const where: Parameters<typeof ctx.prisma.staffAbsence.findMany>[0]['where'] = {};

      if (status) {
        where.status = status;
      }

      if (requesterId) {
        where.requesterId = requesterId;
      }

      if (onlyMine || ctx.user.role === 'COLLABORATOR') {
        // Collaborators only see their own absences
        where.requesterId = ctx.user.id;
      }

      if (startDate) {
        where.startDate = { gte: startDate };
      }

      if (endDate) {
        where.endDate = { lte: endDate };
      }

      const [absences, total] = await Promise.all([
        ctx.prisma.staffAbsence.findMany({
          where,
          include: {
            requester: {
              select: { id: true, name: true, email: true },
            },
            confirmedBy: {
              select: { id: true, name: true },
            },
            substitute: {
              select: { id: true, name: true, email: true },
            },
            affectedEvent: {
              select: { id: true, title: true, startDate: true },
            },
          },
          orderBy: { startDate: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        ctx.prisma.staffAbsence.count({ where }),
      ]);

      return {
        absences,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Request staff absence
  requestAbsence: staffProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        isAllDay: z.boolean().optional().default(true),
        reason: z.string().min(5),
        isUrgent: z.boolean().optional().default(false),
        affectedEventId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate dates
      if (input.endDate < input.startDate) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La data di fine deve essere successiva alla data di inizio',
        });
      }

      const absence = await ctx.prisma.staffAbsence.create({
        data: {
          startDate: input.startDate,
          endDate: input.endDate,
          isAllDay: input.isAllDay,
          reason: input.reason,
          isUrgent: input.isUrgent,
          requester: { connect: { id: ctx.user.id } },
          ...(input.affectedEventId && {
            affectedEvent: { connect: { id: input.affectedEventId } },
          }),
        },
        include: {
          requester: { select: { id: true, name: true } },
        },
      });

      // Create notification for all admins about new absence request
      const requesterName = absence.requester?.name || 'Un collaboratore';
      notifications.absenceRequest(ctx.prisma, {
        absenceId: absence.id,
        requesterName,
        startDate: input.startDate,
        endDate: input.endDate,
        isUrgent: input.isUrgent,
      }).catch((error) => {
        console.error('Error creating absence request notifications for admins:', error);
      });

      return absence;
    }),

  // Confirm/reject absence (admin only)
  updateAbsenceStatus: adminProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['CONFIRMED', 'REJECTED']),
        adminNotes: z.string().optional(),
        substituteId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.staffAbsence.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Richiesta assenza non trovata',
        });
      }

      const absence = await ctx.prisma.staffAbsence.update({
        where: { id: input.id },
        data: {
          status: input.status as StaffAbsenceStatus,
          confirmedById: ctx.user.id,
          confirmedAt: new Date(),
          adminNotes: input.adminNotes,
          substituteId: input.substituteId,
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          substitute: { select: { id: true, name: true } },
        },
      });

      // Send email notification to requester
      if (absence.requester?.email) {
        sendAbsenceStatusEmail({
          requesterName: absence.requester.name || 'Collaboratore',
          requesterEmail: absence.requester.email,
          startDate: absence.startDate,
          endDate: absence.endDate,
          reason: absence.reason,
          status: absence.status,
          adminNotes: absence.adminNotes,
        }).catch((error) => {
          console.error('Error sending absence status email:', error);
        });
      }

      // Create in-app notification for requester
      if (absence.requester?.id) {
        const isConfirmed = input.status === 'CONFIRMED';
        if (isConfirmed) {
          notifications.absenceConfirmed(ctx.prisma, {
            collaboratorUserId: absence.requester.id,
            absenceId: absence.id,
            startDate: absence.startDate,
            endDate: absence.endDate,
          }).catch((error) => {
            console.error('Error creating absence confirmed notification:', error);
          });
        } else {
          notifications.absenceRejected(ctx.prisma, {
            collaboratorUserId: absence.requester.id,
            absenceId: absence.id,
            startDate: absence.startDate,
            endDate: absence.endDate,
            reason: input.adminNotes,
          }).catch((error) => {
            console.error('Error creating absence rejected notification:', error);
          });
        }
      }

      return absence;
    }),

  // Cancel absence request (by requester)
  cancelAbsenceRequest: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.staffAbsence.findUnique({
        where: { id: input.id },
        include: {
          requester: { select: { name: true } },
          affectedEvent: {
            select: {
              id: true,
              title: true,
              invitations: {
                select: {
                  userId: true,
                  groupId: true,
                },
              },
            },
          },
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Richiesta assenza non trovata',
        });
      }

      // Only requester or admin can cancel
      if (existing.requesterId !== ctx.user.id && ctx.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non puoi annullare questa richiesta',
        });
      }

      // Can only cancel pending or confirmed requests
      if (existing.status === 'CANCELLED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Questa richiesta è già stata annullata',
        });
      }

      const absence = await ctx.prisma.staffAbsence.update({
        where: { id: input.id },
        data: {
          status: 'CANCELLED',
        },
      });

      // Notify invitees if there was an affected event
      if (existing.affectedEvent) {
        const event = existing.affectedEvent;
        const requesterName = existing.requester?.name || 'Un collaboratore';
        
        // Collect all user IDs to notify
        const userIdsToNotify = new Set<string>();
        const studentIdsToNotify = new Set<string>();
        
        for (const inv of event.invitations) {
          // Direct user invitation
          if (inv.userId) userIdsToNotify.add(inv.userId);
          
          // Expand group members
          if (inv.groupId) {
            const groupMembers = await ctx.prisma.groupMember.findMany({
              where: { groupId: inv.groupId, studentId: { not: null } },
              select: { studentId: true },
            });
            groupMembers.forEach((m) => m.studentId && studentIdsToNotify.add(m.studentId));
          }
        }
        
        // Get user IDs for students
        if (studentIdsToNotify.size > 0) {
          const students = await ctx.prisma.student.findMany({
            where: { id: { in: Array.from(studentIdsToNotify) } },
            select: { userId: true },
          });
          students.forEach((s) => s.userId && userIdsToNotify.add(s.userId));
        }
        
        // Remove the requester from notifications
        userIdsToNotify.delete(existing.requesterId);
        
        // Create notifications
        if (userIdsToNotify.size > 0) {
          await ctx.prisma.notification.createMany({
            data: Array.from(userIdsToNotify).map((userId) => ({
              userId,
              type: 'EVENT_UPDATED' as const,
              title: 'Assenza ritirata',
              message: `${requesterName} ha ritirato la comunicazione di assenza per l'evento "${event.title}". L'evento si svolgerà regolarmente.`,
              metadata: { eventId: event.id, absenceId: absence.id },
            })),
          });
        }
      }

      return absence;
    }),

  // ==================== STATS ====================

  // Get calendar stats
  getStats: staffProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // For collaborators, only count events they can see (created by them or invited to)
    // For admins, count all events
    let eventFilter: Parameters<typeof ctx.prisma.calendarEvent.count>[0]['where'] = { isCancelled: false };
    
    if (ctx.user.role === 'COLLABORATOR') {
      // Get collaborator's groups
      const collaborator = await ctx.prisma.collaborator.findUnique({
        where: { userId: ctx.user.id },
        select: { id: true },
      });
      
      let collaboratorGroupIds: string[] = [];
      if (collaborator) {
        const groupMembers = await ctx.prisma.groupMember.findMany({
          where: { collaboratorId: collaborator.id },
          select: { groupId: true },
        });
        collaboratorGroupIds = groupMembers.map(gm => gm.groupId);
      }

      // Collaborators see: public events, events created by them, events they're invited to, or events their groups are invited to
      eventFilter = {
        isCancelled: false,
        OR: [
          { isPublic: true },
          { createdById: ctx.user.id },
          { invitations: { some: { userId: ctx.user.id } } },
          ...(collaboratorGroupIds.length > 0 
            ? [{ invitations: { some: { groupId: { in: collaboratorGroupIds } } } }] 
            : []),
        ],
      };
    }

    const [
      totalEvents,
      eventsThisMonth,
      upcomingEvents,
      pendingAbsences,
      myEventsCount,
    ] = await Promise.all([
      ctx.prisma.calendarEvent.count({
        where: eventFilter,
      }),
      ctx.prisma.calendarEvent.count({
        where: {
          ...eventFilter,
          startDate: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      ctx.prisma.calendarEvent.count({
        where: {
          ...eventFilter,
          startDate: { gte: now },
        },
      }),
      ctx.prisma.staffAbsence.count({
        where: { status: 'PENDING' },
      }),
      ctx.prisma.calendarEvent.count({
        where: {
          createdById: ctx.user.id,
          isCancelled: false,
        },
      }),
    ]);

    return {
      totalEvents,
      eventsThisMonth,
      upcomingEvents,
      pendingAbsences,
      myEventsCount,
    };
  }),
});
