// Shared Virtual Room state logic
import { prisma } from '@/lib/prisma/client';
import {
  extractInvitedStudents,
  getScopedAssignments,
  isParticipantConnected,
  calculateTimeRemaining,
} from '@/server/trpc/routers/virtualRoom.helpers';

export interface SessionStateData {
  session: {
    id: string;
    status: string;
    scheduledStartAt: Date | null;
    actualStartAt: Date | null;
    endedAt: Date | null;
  };
  simulation: {
    id: string;
    title: string;
    durationMinutes: number;
    totalQuestions: number;
  };
  participants: Array<{
    id: string;
    studentId: string;
    studentName: string;
    isConnected: boolean;
    isReady: boolean;
    readyAt: Date | null;
    lastHeartbeat: Date | null;
    joinedAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
    currentQuestionIndex: number;
    answeredCount: number;
    cheatingEventsCount: number;
    recentCheatingEvents: Array<{
      id: string;
      eventType: string;
      createdAt: Date;
    }>;
    unreadMessagesCount: number;
    isKicked: boolean;
    kickedReason: string | null;
    kickedAt: Date | null;
    result: {
      totalScore: number;
      correctAnswers: number;
      wrongAnswers: number;
      blankAnswers: number;
    } | null;
  }>;
  invitedStudents: Array<{
    id: string;
    userId: string;
    name: string;
    email: string;
  }>;
  connectedCount: number;
  totalInvited: number;
  timeRemaining: number | null;
  // Messages for a specific participant (optional)
  messages?: Array<{
    id: string;
    senderType: string;
    message: string;
    createdAt: Date;
    isRead: boolean;
  }>;
}

export async function getSessionState(sessionId: string, participantIdForMessages?: string): Promise<SessionStateData | null> {
  const session = await prisma.simulationSession.findUnique({
    where: { id: sessionId },
    include: {
      assignment: {
        include: {
          student: { include: { user: true } },
          group: { include: { members: { include: { student: { include: { user: true } } } } } },
        },
      },
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
            take: 20,
          },
          result: true,
        },
      },
    },
  });

  if (!session) return null;

  // Get list of all invited students
  const invitedStudents = extractInvitedStudents(getScopedAssignments(session));

  // Calculate time remaining
  const timeRemaining = calculateTimeRemaining(session);

  const participants = session.participants.map(p => {
    const isReallyConnected = isParticipantConnected(p);
    
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
      recentCheatingEvents: p.cheatingEvents.map(e => ({
        id: e.id,
        eventType: e.eventType,
        description: e.description ?? null,
        createdAt: e.createdAt,
      })),
      unreadMessagesCount: p.messages.filter(m => m.senderType === 'STUDENT' && !m.isRead).length,
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
  });

  // Get messages for specific participant if requested
  let messages: SessionStateData['messages'] = undefined;
  if (participantIdForMessages) {
    const participant = session.participants.find(p => p.id === participantIdForMessages);
    if (participant) {
      messages = participant.messages.map(m => ({
        id: m.id,
        senderType: m.senderType,
        message: m.message,
        createdAt: m.createdAt,
        isRead: m.isRead,
      }));
    }
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
    participants,
    invitedStudents,
    connectedCount: participants.filter(p => p.isConnected).length,
    totalInvited: invitedStudents.length,
    timeRemaining,
    messages,
  };
}
