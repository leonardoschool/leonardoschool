// Virtual Room Router - Manages synchronized exam sessions
import { z } from 'zod';
import { router, staffProcedure, protectedProcedure } from '../init';
import { TRPCError } from '@trpc/server';
import { CheatingEventType, SessionMessageSender } from '@prisma/client';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('VirtualRoom');

export const virtualRoomRouter = router({
  // ==================== SESSION MANAGEMENT (Staff Only) ====================

  // Create or get session for an assignment (each assignment has its own Virtual Room)
  getOrCreateSession: staffProcedure
    .input(z.object({
      assignmentId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get assignment with simulation details
      const assignment = await ctx.prisma.simulationAssignment.findUnique({
        where: { id: input.assignmentId },
        include: {
          simulation: true,
          student: { include: { user: true } },
          group: { include: { members: { include: { student: { include: { user: true } } } } } },
        },
      });

      if (!assignment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Assegnazione non trovata' });
      }

      const simulation = assignment.simulation;

      if (simulation.accessType !== 'ROOM') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Questa simulazione non è configurata per la stanza virtuale' });
      }

      // Check if assignment is expired
      const now = new Date();
      const effectiveEndDate = assignment.endDate || simulation.endDate;
      const isExpired = effectiveEndDate && effectiveEndDate < now;

      if (isExpired) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'L\'assegnazione è scaduta. Non è più possibile accedere alla Virtual Room.' 
        });
      }

      // Check if assignment is ACTIVE
      if (assignment.status !== 'ACTIVE') {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'L\'assegnazione è chiusa. Riapri l\'assegnazione per accedere alla Virtual Room.' 
        });
      }

      // Check if session already exists for this assignment (not completed/cancelled)
      let session = await ctx.prisma.simulationSession.findFirst({
        where: {
          assignmentId: input.assignmentId,
          status: { in: ['WAITING', 'STARTED'] },
        },
        include: {
          participants: {
            include: {
              student: { include: { user: true } },
              cheatingEvents: true,
            },
          },
        },
      });

      if (!session) {
        // Create new session for this assignment
        session = await ctx.prisma.simulationSession.create({
          data: {
            simulationId: simulation.id,
            assignmentId: input.assignmentId,
            status: 'WAITING',
            scheduledStartAt: assignment.startDate || simulation.startDate,
          },
          include: {
            participants: {
              include: {
                student: { include: { user: true } },
                cheatingEvents: true,
              },
            },
          },
        });
        
        // Log session creation with request tracking
        log.info('Session created', {
          sessionId: session.id,
          simulationId: simulation.id,
          assignmentId: input.assignmentId,
          staffId: ctx.user.id,
        });
      }

      // Get list of invited students for this specific assignment
      const invitedStudents: { id: string; userId: string; name: string; email: string }[] = [];
      
      if (assignment.student) {
        invitedStudents.push({
          id: assignment.student.id,
          userId: assignment.student.userId,
          name: assignment.student.user.name,
          email: assignment.student.user.email,
        });
      }
      if (assignment.group) {
        for (const member of assignment.group.members) {
          if (member.student && !invitedStudents.find(s => s.id === member.student!.id)) {
            invitedStudents.push({
              id: member.student.id,
              userId: member.student.userId,
              name: member.student.user.name,
              email: member.student.user.email,
            });
          }
        }
      }

      return {
        session,
        assignmentId: input.assignmentId,
        simulation: {
          id: simulation.id,
          title: simulation.title,
          durationMinutes: simulation.durationMinutes,
          totalQuestions: simulation.totalQuestions,
          hasSections: simulation.hasSections,
          sections: simulation.sections,
        },
        invitedStudents,
        connectedCount: session.participants.filter(p => p.isConnected).length,
        totalInvited: invitedStudents.length,
      };
    }),

  // Start the simulation for all participants
  startSession: staffProcedure
    .input(z.object({
      sessionId: z.string(),
      forceStart: z.boolean().default(false), // Start even if not all connected
    }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.prisma.simulationSession.findUnique({
        where: { id: input.sessionId },
        include: {
          simulation: {
            include: {
              assignments: {
                include: {
                  student: true,
                  group: { include: { members: { include: { student: true } } } },
                },
              },
            },
          },
          participants: true,
        },
      });

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Sessione non trovata' });
      }

      if (session.status !== 'WAITING') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'La sessione è già stata avviata o completata' });
      }

      // Count invited students
      const invitedStudentIds = new Set<string>();
      for (const assignment of session.simulation.assignments) {
        if (assignment.student) invitedStudentIds.add(assignment.student.id);
        if (assignment.group) {
          for (const member of assignment.group.members) {
            if (member.student) invitedStudentIds.add(member.student.id);
          }
        }
      }

      // Use heartbeat timeout to determine real connection status
      const heartbeatTimeout = 15 * 1000; // 15 seconds
      const connectedCount = session.participants.filter(p => 
        p.isConnected && p.lastHeartbeat && (Date.now() - p.lastHeartbeat.getTime()) < heartbeatTimeout
      ).length;
      
      if (!input.forceStart && connectedCount < invitedStudentIds.size) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Solo ${connectedCount}/${invitedStudentIds.size} studenti sono connessi. Usa forceStart per avviare comunque.`,
        });
      }

      // Start session
      const now = new Date();
      await ctx.prisma.simulationSession.update({
        where: { id: input.sessionId },
        data: {
          status: 'STARTED',
          actualStartAt: now,
          startedById: ctx.user.id,
        },
      });

      // Mark all connected participants as started
      await ctx.prisma.simulationSessionParticipant.updateMany({
        where: {
          sessionId: input.sessionId,
          isConnected: true,
        },
        data: {
          startedAt: now,
        },
      });

      return {
        success: true,
        startedAt: now,
        participantsStarted: connectedCount,
      };
    }),

  // End session (time's up or manually ended)
  endSession: staffProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Use transaction to ensure atomicity
      const session = await ctx.prisma.$transaction(async () => {
        // Update session status
        const updatedSession = await ctx.prisma.simulationSession.update({
          where: { id: input.sessionId },
          data: {
            status: 'COMPLETED',
            endedAt: new Date(),
          },
          include: {
            participants: true,
          },
        });

        // Disconnect all participants
        await ctx.prisma.simulationSessionParticipant.updateMany({
          where: { sessionId: input.sessionId },
          data: {
            isConnected: false,
          },
        });

        // Delete all session messages for this session
        // Get all participant IDs first
        const participantIds = updatedSession.participants.map(p => p.id);
        
        if (participantIds.length > 0) {
          const deletedMessages = await ctx.prisma.sessionMessage.deleteMany({
            where: {
              participantId: { in: participantIds },
            },
          });
          
          log.info('Session ended - messages deleted:', {
            sessionId: input.sessionId,
            deletedCount: deletedMessages.count,
          });
        }

        return updatedSession;
      });

      return { success: true, session };
    }),

  // Get session state for admin monitoring
  getSessionState: staffProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.prisma.simulationSession.findUnique({
        where: { id: input.sessionId },
        include: {
          simulation: {
            include: {
              questions: {
                include: { question: true },
              },
              assignments: {
                include: {
                  student: { include: { user: true } },
                  group: { include: { members: { include: { student: { include: { user: true } } } } } },
                },
              },
            },
          },
          participants: {
            include: {
              student: { include: { user: true } },
              cheatingEvents: {
                orderBy: { createdAt: 'desc' },
                take: 10,
              },
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 5,
              },
              result: true,
            },
          },
        },
      });

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Sessione non trovata' });
      }

      // Get list of all invited students
      const invitedStudents: { id: string; userId: string; name: string; email: string }[] = [];
      for (const assignment of session.simulation.assignments) {
        if (assignment.student) {
          invitedStudents.push({
            id: assignment.student.id,
            userId: assignment.student.userId,
            name: assignment.student.user.name,
            email: assignment.student.user.email,
          });
        }
        if (assignment.group) {
          for (const member of assignment.group.members) {
            if (member.student && !invitedStudents.find(s => s.id === member.student!.id)) {
              invitedStudents.push({
                id: member.student.id,
                userId: member.student.userId,
                name: member.student.user.name,
                email: member.student.user.email,
              });
            }
          }
        }
      }

      // Calculate time remaining
      let timeRemaining: number | null = null;
      if (session.status === 'STARTED' && session.actualStartAt) {
        const elapsedMs = Date.now() - session.actualStartAt.getTime();
        const totalMs = session.simulation.durationMinutes * 60 * 1000;
        timeRemaining = Math.max(0, Math.floor((totalMs - elapsedMs) / 1000));
      }

      return {
        session: {
          id: session.id,
          status: session.status,
          scheduledStartAt: session.scheduledStartAt,
          actualStartAt: session.actualStartAt,
          endedAt: session.endedAt,
        },
        simulation: {
          id: session.simulation.id,
          title: session.simulation.title,
          durationMinutes: session.simulation.durationMinutes,
          totalQuestions: session.simulation.totalQuestions,
        },
        participants: session.participants.map(p => {
          // Consider connected only if heartbeat is recent (within 15 seconds)
          const heartbeatTimeout = 15 * 1000; // 15 seconds
          const isReallyConnected = p.isConnected && 
            p.lastHeartbeat && 
            (Date.now() - p.lastHeartbeat.getTime()) < heartbeatTimeout;
          
          return {
            id: p.id,
            studentId: p.studentId,
            studentName: p.student.user.name,
            isConnected: isReallyConnected,
            isReady: !!p.readyAt,
            readyAt: p.readyAt,
            lastHeartbeat: p.lastHeartbeat,
            joinedAt: p.joinedAt,
            startedAt: p.startedAt,
            completedAt: p.completedAt,
            currentQuestionIndex: p.currentQuestionIndex,
            answeredCount: p.answeredCount,
            cheatingEventsCount: p.cheatingEvents.length,
            recentCheatingEvents: p.cheatingEvents,
            unreadMessagesCount: p.messages.filter(m => m.senderType === 'STUDENT' && !m.isRead).length,
            // Kick status
            isKicked: p.isKicked,
            kickedReason: p.kickedReason,
            kickedAt: p.kickedAt,
            result: p.result ? {
              totalScore: p.result.totalScore,
              correctAnswers: p.result.correctAnswers,
              wrongAnswers: p.result.wrongAnswers,
              blankAnswers: p.result.blankAnswers,
            } : null,
          };
        }),
        invitedStudents,
        connectedCount: session.participants.filter(p => {
          const heartbeatTimeout = 15 * 1000;
          return p.isConnected && p.lastHeartbeat && (Date.now() - p.lastHeartbeat.getTime()) < heartbeatTimeout;
        }).length,
        totalInvited: invitedStudents.length,
        timeRemaining,
      };
    }),

  // ==================== STUDENT PROCEDURES ====================

  // Student joins the waiting room for a specific assignment
  joinSession: protectedProcedure
    .input(z.object({
      assignmentId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'STUDENT') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo gli studenti possono unirsi alla sessione' });
      }

      // Get student record
      const student = await ctx.prisma.student.findUnique({
        where: { userId: ctx.user.id },
      });

      if (!student) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Profilo studente non trovato' });
      }

      // Get assignment with simulation
      const assignment = await ctx.prisma.simulationAssignment.findUnique({
        where: { id: input.assignmentId },
        include: {
          simulation: true,
          student: true,
          group: { include: { members: { include: { student: true } } } },
        },
      });

      if (!assignment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Assegnazione non trovata' });
      }

      if (assignment.simulation.accessType !== 'ROOM') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Questa simulazione non richiede stanza virtuale' });
      }

      // Check if student is invited to this assignment
      let isInvited = false;
      if (assignment.studentId === student.id) {
        isInvited = true;
      } else if (assignment.group) {
        for (const member of assignment.group.members) {
          if (member.studentId === student.id) {
            isInvited = true;
            break;
          }
        }
      }

      if (!isInvited) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non sei invitato a questa assegnazione' });
      }

      // Find active session for this assignment
      const session = await ctx.prisma.simulationSession.findFirst({
        where: {
          assignmentId: input.assignmentId,
          status: { in: ['WAITING', 'STARTED'] },
        },
      });

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Nessuna sessione attiva per questa assegnazione' });
      }

      // Join or update participant
      const participant = await ctx.prisma.simulationSessionParticipant.upsert({
        where: {
          sessionId_studentId: {
            sessionId: session.id,
            studentId: student.id,
          },
        },
        update: {
          isConnected: true,
          lastHeartbeat: new Date(),
          disconnectedAt: null,
          // Reset ready state on reconnection - student must confirm again
          readyAt: null,
        },
        create: {
          sessionId: session.id,
          studentId: student.id,
          isConnected: true,
          lastHeartbeat: new Date(),
        },
      });

      return {
        participantId: participant.id,
        sessionId: session.id,
        sessionStatus: session.status,
        actualStartAt: session.actualStartAt,
        waitingMessage: session.waitingMessage,
        simulation: {
          title: assignment.simulation.title,
          durationMinutes: assignment.simulation.durationMinutes,
          totalQuestions: assignment.simulation.totalQuestions,
        },
      };
    }),

  // Student heartbeat (keep-alive)
  heartbeat: protectedProcedure
    .input(z.object({
      participantId: z.string(),
      currentQuestionIndex: z.number().optional(),
      answeredCount: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // First check if participant exists and isn't kicked
      const existing = await ctx.prisma.simulationSessionParticipant.findUnique({
        where: { id: input.participantId },
        select: { isKicked: true, kickedReason: true },
      });

      if (!existing) {
        log.warn('Heartbeat: Participant not found:', input.participantId);
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Partecipante non trovato' });
      }

      if (existing.isKicked) {
        log.debug('Heartbeat: Participant is kicked:', input.participantId);
        return {
          isKicked: true,
          kickedReason: existing.kickedReason || 'Sei stato espulso dalla sessione',
          sessionStatus: 'COMPLETED' as const,
          actualStartAt: null,
          endedAt: null,
          unreadMessages: [],
          isReady: false,
        };
      }

      const participant = await ctx.prisma.simulationSessionParticipant.update({
        where: { id: input.participantId },
        data: {
          lastHeartbeat: new Date(),
          isConnected: true,
          ...(input.currentQuestionIndex !== undefined && { currentQuestionIndex: input.currentQuestionIndex }),
          ...(input.answeredCount !== undefined && { answeredCount: input.answeredCount }),
        },
        include: {
          session: {
            include: {
              participants: {
                select: { isConnected: true },
              },
            },
          },
          messages: {
            where: { isRead: false, senderType: 'ADMIN' },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      // Count connected participants
      const connectedCount = participant.session.participants.filter(p => p.isConnected).length;
      
      // Get ALL invited students for this session (from all assignments of this simulation)
      const session = await ctx.prisma.simulationSession.findUnique({
        where: { id: participant.sessionId },
        include: {
          simulation: {
            include: {
              assignments: {
                where: { 
                  status: 'ACTIVE' 
                },
                include: {
                  student: { include: { user: true } },
                  group: { 
                    include: { 
                      members: { 
                        include: { 
                          student: { include: { user: true } } 
                        } 
                      } 
                    } 
                  },
                },
              },
            },
          },
        },
      });

      // Count all unique students invited (avoid duplicates)
      const invitedStudentIds = new Set<string>();
      if (session?.simulation.assignments) {
        for (const assignment of session.simulation.assignments) {
          if (assignment.student) {
            invitedStudentIds.add(assignment.student.id);
          }
          if (assignment.group) {
            for (const member of assignment.group.members) {
              if (member.student) {
                invitedStudentIds.add(member.student.id);
              }
            }
          }
        }
      }
      
      const totalParticipants = invitedStudentIds.size || 1;

      // Debug log only - very verbose, only shown with LOG_VERBOSE=true
      log.debug('Heartbeat updated:', {
        participantId: input.participantId,
        answeredCount: input.answeredCount,
      });

      return {
        isKicked: false,
        sessionStatus: participant.session.status,
        actualStartAt: participant.session.actualStartAt,
        endedAt: participant.session.endedAt,
        unreadMessages: participant.messages,
        isReady: !!participant.readyAt,
        connectedCount,
        totalParticipants,
      };
    }),

  // Student marks as ready
  setReady: protectedProcedure
    .input(z.object({
      participantId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.simulationSessionParticipant.update({
        where: { id: input.participantId },
        data: { readyAt: new Date() },
      });
      return { success: true };
    }),

  // Get session status for student polling (by assignmentId)
  getStudentSessionStatus: protectedProcedure
    .input(z.object({
      assignmentId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'STUDENT') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo gli studenti possono accedere' });
      }

      const student = await ctx.prisma.student.findUnique({
        where: { userId: ctx.user.id },
      });

      if (!student) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Profilo studente non trovato' });
      }

      const session = await ctx.prisma.simulationSession.findFirst({
        where: {
          assignmentId: input.assignmentId,
          status: { in: ['WAITING', 'STARTED', 'COMPLETED'] },
        },
        include: {
          simulation: true,
          participants: {
            where: { studentId: student.id },
            include: {
              messages: {
                where: { isRead: false, senderType: 'ADMIN' },
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!session) {
        return { hasSession: false };
      }

      const participant = session.participants[0];

      // Check if kicked
      if (participant?.isKicked) {
        return {
          hasSession: true,
          isKicked: true,
          kickedReason: participant.kickedReason || 'Sei stato espulso dalla sessione',
          sessionId: session.id,
          status: 'COMPLETED' as const,
        };
      }

      // Calculate time remaining
      let timeRemaining: number | null = null;
      if (session.status === 'STARTED' && session.actualStartAt) {
        const elapsedMs = Date.now() - session.actualStartAt.getTime();
        const totalMs = session.simulation.durationMinutes * 60 * 1000;
        timeRemaining = Math.max(0, Math.floor((totalMs - elapsedMs) / 1000));
      }

      return {
        hasSession: true,
        isKicked: false,
        sessionId: session.id,
        simulationId: session.simulationId, // For redirect after session starts
        status: session.status,
        actualStartAt: session.actualStartAt,
        endedAt: session.endedAt,
        waitingMessage: session.waitingMessage,
        participantId: participant?.id,
        isConnected: participant?.isConnected ?? false,
        unreadMessages: participant?.messages ?? [],
        timeRemaining,
        simulation: {
          title: session.simulation.title,
          durationMinutes: session.simulation.durationMinutes,
        },
      };
    }),

  // ==================== CHEATING DETECTION ====================

  // Log cheating event
  logCheatingEvent: protectedProcedure
    .input(z.object({
      participantId: z.string(),
      eventType: z.nativeEnum(CheatingEventType),
      description: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.prisma.sessionCheatingEvent.create({
        data: {
          participantId: input.participantId,
          eventType: input.eventType,
          description: input.description,
          metadata: input.metadata,
        },
      });

      return { success: true, eventId: event.id };
    }),

  // Kick/block participant (staff only)
  kickParticipant: staffProcedure
    .input(z.object({
      participantId: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const participant = await ctx.prisma.simulationSessionParticipant.findUnique({
        where: { id: input.participantId },
        include: { student: { include: { user: true } }, session: true },
      });

      if (!participant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Partecipante non trovato' });
      }

      // Update participant as kicked
      await ctx.prisma.simulationSessionParticipant.update({
        where: { id: input.participantId },
        data: {
          isKicked: true,
          kickedAt: new Date(),
          kickedReason: input.reason || 'Espulso dall\'amministratore',
          isConnected: false,
        },
      });

      return { 
        success: true, 
        message: `${participant.student.user.name} è stato espulso dalla sessione` 
      };
    }),

  // ==================== MESSAGING ====================

  // Send message (staff to student or student to staff)
  sendMessage: protectedProcedure
    .input(z.object({
      participantId: z.string(),
      message: z.string().min(1).max(1000),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check participant exists
      const participant = await ctx.prisma.simulationSessionParticipant.findUnique({
        where: { id: input.participantId },
        include: { student: { include: { user: true } }, session: true },
      });

      if (!participant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Partecipante non trovato' });
      }

      // Determine sender type
      let senderType: SessionMessageSender;
      if (ctx.user.role === 'ADMIN' || ctx.user.role === 'COLLABORATOR') {
        senderType = 'ADMIN';
      } else if (ctx.user.role === 'STUDENT') {
        // Verify student is the participant
        if (participant.student.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Non puoi inviare messaggi per altri studenti' });
        }
        senderType = 'STUDENT';
      } else {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non autorizzato' });
      }

      const sentMessage = await ctx.prisma.sessionMessage.create({
        data: {
          participantId: input.participantId,
          senderType,
          senderId: ctx.user.id,
          message: input.message,
        },
        include: {
          sender: true,
        },
      });

      return { success: true, message: sentMessage };
    }),

  // Get messages for a participant
  getMessages: protectedProcedure
    .input(z.object({
      participantId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const participant = await ctx.prisma.simulationSessionParticipant.findUnique({
        where: { id: input.participantId },
        include: { student: true },
      });

      if (!participant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Partecipante non trovato' });
      }

      // Students can only see their own messages
      if (ctx.user.role === 'STUDENT' && participant.student.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Non autorizzato' });
      }

      const messages = await ctx.prisma.sessionMessage.findMany({
        where: { participantId: input.participantId },
        include: { sender: true },
        orderBy: { createdAt: 'asc' },
      });

      return messages;
    }),

  // Mark messages as read
  markMessagesRead: protectedProcedure
    .input(z.object({
      participantId: z.string(),
      messageIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const where = input.messageIds
        ? { id: { in: input.messageIds }, participantId: input.participantId }
        : { participantId: input.participantId, isRead: false };

      // For students, only mark admin messages as read
      // For staff, only mark student messages as read
      const senderTypeFilter = ctx.user.role === 'STUDENT' ? 'ADMIN' : 'STUDENT';

      await ctx.prisma.sessionMessage.updateMany({
        where: {
          ...where,
          senderType: senderTypeFilter,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return { success: true };
    }),

  // ==================== RANKINGS ====================

  // Get session rankings
  getSessionRankings: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.prisma.simulationSession.findUnique({
        where: { id: input.sessionId },
        include: {
          simulation: true,
          participants: {
            include: {
              student: { include: { user: true } },
              result: true,
            },
            orderBy: {
              result: { totalScore: 'desc' },
            },
          },
        },
      });

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Sessione non trovata' });
      }

      const isStaff = ctx.user.role === 'ADMIN' || ctx.user.role === 'COLLABORATOR';
      const studentId = ctx.user.role === 'STUDENT'
        ? (await ctx.prisma.student.findUnique({ where: { userId: ctx.user.id } }))?.id
        : null;

      // Build rankings
      const rankings = session.participants
        .filter(p => p.result && p.completedAt)
        .map((p, index) => ({
          position: index + 1,
          // Staff sees real names, students see anonymous or their own
          studentName: isStaff
            ? p.student.user.name
            : (p.studentId === studentId ? p.student.user.name : `Studente ${p.anonymousId.slice(0, 6)}`),
          isCurrentUser: p.studentId === studentId,
          totalScore: p.result!.totalScore,
          correctAnswers: p.result!.correctAnswers,
          wrongAnswers: p.result!.wrongAnswers,
          blankAnswers: p.result!.blankAnswers,
          completedAt: p.completedAt,
        }));

      return {
        sessionId: session.id,
        simulationTitle: session.simulation.title,
        totalParticipants: session.participants.length,
        completedParticipants: rankings.length,
        rankings,
        isSessionCompleted: session.status === 'COMPLETED',
      };
    }),

  // ==================== DISCONNECT HANDLING ====================

  // Mark participant as disconnected
  disconnect: protectedProcedure
    .input(z.object({
      participantId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update participant as disconnected
      const participant = await ctx.prisma.simulationSessionParticipant.update({
        where: { id: input.participantId },
        data: {
          isConnected: false,
          disconnectedAt: new Date(),
        },
        include: {
          session: {
            include: {
              participants: true,
            },
          },
        },
      });

      // Check if this was the last connected participant in a completed session
      const session = participant.session;
      const hasAnyConnected = session.participants.some(p => p.isConnected && p.id !== input.participantId);
      
      // If session is completed and no one is connected anymore, delete all messages
      if (session.status === 'COMPLETED' && !hasAnyConnected) {
        const participantIds = session.participants.map(p => p.id);
        
        if (participantIds.length > 0) {
          const deletedMessages = await ctx.prisma.sessionMessage.deleteMany({
            where: {
              participantId: { in: participantIds },
            },
          });
          
          log.info('All participants disconnected - messages deleted:', {
            sessionId: session.id,
            deletedCount: deletedMessages.count,
          });
        }
      }

      return { success: true };
    }),

  // Link simulation result to participant (when starting exam)
  linkResult: protectedProcedure
    .input(z.object({
      participantId: z.string(),
      resultId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.simulationSessionParticipant.update({
        where: { id: input.participantId },
        data: { resultId: input.resultId },
      });
      return { success: true };
    }),

  // Mark participant as completed
  markCompleted: protectedProcedure
    .input(z.object({
      participantId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.simulationSessionParticipant.update({
        where: { id: input.participantId },
        data: { completedAt: new Date() },
      });
      return { success: true };
    }),
});
