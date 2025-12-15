/**
 * Messages Router - Sistema di messaggistica interno
 * 
 * Gestisce le conversazioni e i messaggi tra utenti:
 * - Admin può contattare collaboratori e studenti
 * - Collaboratori possono contattare admin, altri collaboratori e studenti
 * - Studenti possono contattare admin e collaboratori
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../init';
import { TRPCError } from '@trpc/server';
import { notifications } from '@/lib/notifications';

// Schema for creating a new conversation
const createConversationSchema = z.object({
  recipientId: z.string().min(1, 'Destinatario richiesto'),
  subject: z.string().min(1, 'Oggetto richiesto').max(200, 'Oggetto troppo lungo'),
  content: z.string().min(1, 'Messaggio richiesto').max(5000, 'Messaggio troppo lungo'),
});

// Schema for sending a message in an existing conversation
const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().min(1, 'Messaggio richiesto').max(5000, 'Messaggio troppo lungo'),
});

// Schema for getting conversations
const getConversationsSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(50).default(20),
  filter: z.enum(['all', 'unread', 'archived']).default('all'),
});

// Schema for getting messages in a conversation
const getMessagesSchema = z.object({
  conversationId: z.string().min(1),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(50),
});

export const messagesRouter = router({
  /**
   * Get list of users that the current user can contact
   * Based on role permissions
   */
  getContactableUsers: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.user;
    
    // Define which roles the current user can contact
    let allowedRoles: ('ADMIN' | 'COLLABORATOR' | 'STUDENT')[] = [];
    
    if (currentUser.role === 'ADMIN') {
      // Admin can contact collaborators and students
      allowedRoles = ['COLLABORATOR', 'STUDENT'];
    } else if (currentUser.role === 'COLLABORATOR') {
      // Collaborator can contact admin, other collaborators, and students
      allowedRoles = ['ADMIN', 'COLLABORATOR', 'STUDENT'];
    } else if (currentUser.role === 'STUDENT') {
      // Student can only contact admin and collaborators
      allowedRoles = ['ADMIN', 'COLLABORATOR'];
    }
    
    const users = await ctx.prisma.user.findMany({
      where: {
        id: { not: currentUser.id }, // Exclude self
        role: { in: allowedRoles },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' },
      ],
    });
    
    // For students, also include reference students from their groups
    if (currentUser.role === 'STUDENT') {
      // Get student profile
      const student = await ctx.prisma.student.findUnique({
        where: { userId: currentUser.id },
        select: { id: true },
      });
      
      if (student) {
        // Get groups where this student is a member
        const groups = await ctx.prisma.groupMember.findMany({
          where: { studentId: student.id },
          select: {
            group: {
              select: {
                referenceStudent: {
                  select: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        isActive: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });
        
        // Extract unique reference students (excluding self)
        const referenceStudents = groups
          .map(g => g.group.referenceStudent?.user)
          .filter((u): u is NonNullable<typeof u> => 
            u !== null && 
            u !== undefined && 
            u.id !== currentUser.id && 
            u.isActive
          );
        
        // Add reference students if not already in the list
        const existingIds = new Set(users.map(u => u.id));
        for (const refStudent of referenceStudents) {
          if (!existingIds.has(refStudent.id)) {
            users.push({
              id: refStudent.id,
              name: refStudent.name,
              email: refStudent.email,
              role: refStudent.role,
            });
            existingIds.add(refStudent.id);
          }
        }
      }
    }
    
    return users;
  }),

  /**
   * Get list of groups that the current user can message
   * - Admin: all active groups
   * - Collaborator: groups where they are a member or referent
   * - Student: not allowed to message groups (empty array)
   */
  getContactableGroups: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.user;
    
    // Students cannot message groups
    if (currentUser.role === 'STUDENT') {
      return [];
    }
    
    // Get profile IDs for collaborator check
    let collaboratorId: string | null = null;
    
    if (currentUser.role === 'COLLABORATOR') {
      const collaborator = await ctx.prisma.collaborator.findUnique({
        where: { userId: currentUser.id },
        select: { id: true },
      });
      collaboratorId = collaborator?.id || null;
    }
    
    // Build where clause based on role
    const whereClause = currentUser.role === 'ADMIN'
      ? { isActive: true }
      : {
          isActive: true,
          OR: [
            // Collaborator is a referent
            { referenceCollaboratorId: collaboratorId },
            // Collaborator is a member
            { members: { some: { collaboratorId } } },
          ],
        };
    
    const groups = await ctx.prisma.group.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        type: true,
        referenceStudent: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        referenceCollaborator: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        referenceAdmin: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        members: {
          select: {
            id: true,
            student: {
              select: {
                id: true,
                user: { select: { id: true, name: true, email: true } },
              },
            },
            collaborator: {
              select: {
                id: true,
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    
    // Transform to a cleaner format
    return groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      color: group.color,
      type: group.type,
      memberCount: group._count.members,
      referents: [
        group.referenceAdmin?.user,
        group.referenceCollaborator?.user,
        group.referenceStudent?.user,
      ].filter(Boolean).map(u => ({
        id: u!.id,
        name: u!.name,
        email: u!.email,
      })),
      members: group.members.map(m => {
        const user = m.student?.user || m.collaborator?.user;
        return user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          role: m.student ? 'STUDENT' : 'COLLABORATOR',
        } : null;
      }).filter(Boolean),
    }));
  }),

  /**
   * Create a new conversation with another user
   * This creates both the conversation and the first message
   */
  createConversation: protectedProcedure
    .input(createConversationSchema)
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.user;
      
      // Get recipient user
      const recipient = await ctx.prisma.user.findUnique({
        where: { id: input.recipientId },
        select: { id: true, role: true, name: true, isActive: true },
      });
      
      if (!recipient) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Destinatario non trovato',
        });
      }
      
      if (!recipient.isActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Impossibile contattare questo utente',
        });
      }
      
      // Verify permission to contact this user
      let canContact = canUserContact(currentUser.role, recipient.role);
      
      // Special case: Students can contact reference students from their groups
      if (!canContact && currentUser.role === 'STUDENT' && recipient.role === 'STUDENT') {
        const student = await ctx.prisma.student.findUnique({
          where: { userId: currentUser.id },
          select: { id: true },
        });
        
        if (student) {
          // Check if recipient is a reference student in any of sender's groups
          const sharedGroup = await ctx.prisma.group.findFirst({
            where: {
              members: { some: { studentId: student.id } },
              referenceStudent: { userId: recipient.id },
            },
          });
          
          if (sharedGroup) {
            canContact = true;
          }
        }
      }
      
      if (!canContact) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non hai i permessi per contattare questo utente',
        });
      }
      
      // Check if a direct conversation already exists between these users
      const existingConversation = await ctx.prisma.conversation.findFirst({
        where: {
          type: 'DIRECT',
          AND: [
            { participants: { some: { userId: currentUser.id } } },
            { participants: { some: { userId: input.recipientId } } },
          ],
        },
        include: {
          participants: true,
        },
      });
      
      if (existingConversation) {
        // Add message to existing conversation
        const message = await ctx.prisma.message.create({
          data: {
            conversationId: existingConversation.id,
            senderId: currentUser.id,
            content: `**${input.subject}**\n\n${input.content}`,
          },
        });
        
        // Update conversation lastMessageAt
        await ctx.prisma.conversation.update({
          where: { id: existingConversation.id },
          data: { lastMessageAt: new Date() },
        });
        
        // Create notification for recipient
        await notifications.messageReceived(ctx.prisma, {
          recipientUserId: input.recipientId,
          conversationId: existingConversation.id,
          senderName: currentUser.name,
          messagePreview: input.content,
          recipientRole: recipient.role,
        });
        
        return { conversationId: existingConversation.id, messageId: message.id };
      }
      
      // Create new conversation with first message
      const conversation = await ctx.prisma.conversation.create({
        data: {
          type: 'DIRECT',
          name: input.subject,
          lastMessageAt: new Date(),
          participants: {
            create: [
              { userId: currentUser.id },
              { userId: input.recipientId },
            ],
          },
          messages: {
            create: {
              senderId: currentUser.id,
              content: input.content,
            },
          },
        },
        include: {
          messages: true,
        },
      });
      
      // Create notification for recipient
      await notifications.messageReceived(ctx.prisma, {
        recipientUserId: input.recipientId,
        conversationId: conversation.id,
        senderName: currentUser.name,
        messagePreview: input.content,
        recipientRole: recipient.role,
      });
      
      return { conversationId: conversation.id, messageId: conversation.messages[0]?.id };
    }),

  /**
   * Send a message in an existing conversation
   */
  sendMessage: protectedProcedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.user;
      
      // Verify user is participant in conversation
      const participation = await ctx.prisma.conversationParticipant.findFirst({
        where: {
          conversationId: input.conversationId,
          userId: currentUser.id,
          leftAt: null,
        },
      });
      
      if (!participation) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non fai parte di questa conversazione',
        });
      }
      
      // Create message
      const message = await ctx.prisma.message.create({
        data: {
          conversationId: input.conversationId,
          senderId: currentUser.id,
          content: input.content,
        },
        include: {
          sender: {
            select: { id: true, name: true, role: true },
          },
        },
      });
      
      // Update conversation lastMessageAt
      await ctx.prisma.conversation.update({
        where: { id: input.conversationId },
        data: { lastMessageAt: new Date() },
      });
      
      // Update sender's lastReadAt
      await ctx.prisma.conversationParticipant.update({
        where: { id: participation.id },
        data: { 
          lastReadAt: new Date(),
          lastReadMsgId: message.id,
        },
      });
      
      // Get other participants and create notifications
      const otherParticipants = await ctx.prisma.conversationParticipant.findMany({
        where: {
          conversationId: input.conversationId,
          userId: { not: currentUser.id },
          leftAt: null,
        },
        include: {
          user: {
            select: { id: true, role: true },
          },
        },
      });
      
      // Create notifications for other participants
      for (const participant of otherParticipants) {
        await notifications.messageReceived(ctx.prisma, {
          recipientUserId: participant.userId,
          conversationId: input.conversationId,
          senderName: currentUser.name,
          messagePreview: input.content,
          recipientRole: participant.user.role,
        });
      }
      
      return message;
    }),

  /**
   * Get all conversations for current user
   */
  getConversations: protectedProcedure
    .input(getConversationsSchema)
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.user;
      const skip = (input.page - 1) * input.pageSize;
      
      // Build where clause based on filter
      const baseWhere = {
        participants: {
          some: {
            userId: currentUser.id,
            leftAt: null,
            ...(input.filter === 'archived' ? { isArchived: true } : { isArchived: false }),
          },
        },
      };
      
      // Get conversations
      const [conversations, totalCount] = await Promise.all([
        ctx.prisma.conversation.findMany({
          where: baseWhere,
          include: {
            participants: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, role: true },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: { lastMessageAt: 'desc' },
          skip,
          take: input.pageSize,
        }),
        ctx.prisma.conversation.count({ where: baseWhere }),
      ]);
      
      // Format conversations with unread count
      const formattedConversations = await Promise.all(
        conversations.map(async (conv) => {
          const myParticipation = conv.participants.find(p => p.userId === currentUser.id);
          const otherParticipants = conv.participants.filter(p => p.userId !== currentUser.id);
          
          // Count unread messages
          const unreadCount = await ctx.prisma.message.count({
            where: {
              conversationId: conv.id,
              senderId: { not: currentUser.id },
              createdAt: myParticipation?.lastReadAt 
                ? { gt: myParticipation.lastReadAt }
                : undefined,
            },
          });
          
          return {
            id: conv.id,
            type: conv.type,
            name: conv.name,
            isArchived: myParticipation?.isArchived || false,
            lastMessageAt: conv.lastMessageAt,
            unreadCount,
            lastMessage: conv.messages[0] || null,
            otherParticipants: otherParticipants.map(p => ({
              id: p.user.id,
              name: p.user.name,
              email: p.user.email,
              role: p.user.role,
            })),
          };
        })
      );
      
      // Count total unread
      const unreadConversationsCount = formattedConversations.filter(c => c.unreadCount > 0).length;
      
      return {
        conversations: formattedConversations,
        totalCount,
        unreadCount: unreadConversationsCount,
        totalPages: Math.ceil(totalCount / input.pageSize),
        currentPage: input.page,
      };
    }),

  /**
   * Get messages in a conversation
   */
  getMessages: protectedProcedure
    .input(getMessagesSchema)
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.user;
      
      // Verify user is participant
      const participation = await ctx.prisma.conversationParticipant.findFirst({
        where: {
          conversationId: input.conversationId,
          userId: currentUser.id,
          leftAt: null,
        },
      });
      
      if (!participation) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non fai parte di questa conversazione',
        });
      }
      
      const skip = (input.page - 1) * input.pageSize;
      
      // Get conversation with participants
      const conversation = await ctx.prisma.conversation.findUnique({
        where: { id: input.conversationId },
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
          },
        },
      });
      
      if (!conversation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversazione non trovata',
        });
      }
      
      // Get messages
      const [messages, totalCount] = await Promise.all([
        ctx.prisma.message.findMany({
          where: {
            conversationId: input.conversationId,
            isDeleted: false,
          },
          include: {
            sender: {
              select: { id: true, name: true, role: true },
            },
          },
          orderBy: { createdAt: 'asc' },
          skip,
          take: input.pageSize,
        }),
        ctx.prisma.message.count({
          where: {
            conversationId: input.conversationId,
            isDeleted: false,
          },
        }),
      ]);
      
      // Mark messages as read
      await ctx.prisma.conversationParticipant.update({
        where: { id: participation.id },
        data: {
          lastReadAt: new Date(),
          lastReadMsgId: messages[messages.length - 1]?.id,
        },
      });
      
      const otherParticipants = conversation.participants
        .filter(p => p.userId !== currentUser.id)
        .map(p => ({
          id: p.user.id,
          name: p.user.name,
          email: p.user.email,
          role: p.user.role,
        }));
      
      return {
        conversation: {
          id: conversation.id,
          type: conversation.type,
          name: conversation.name,
          otherParticipants,
        },
        messages: messages.map(m => ({
          id: m.id,
          content: m.content,
          senderId: m.senderId,
          senderName: m.sender.name,
          senderRole: m.sender.role,
          createdAt: m.createdAt,
          isEdited: m.isEdited,
          isMine: m.senderId === currentUser.id,
        })),
        totalCount,
        totalPages: Math.ceil(totalCount / input.pageSize),
        currentPage: input.page,
      };
    }),

  /**
   * Mark conversation as read
   */
  markAsRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.user;
      
      const participation = await ctx.prisma.conversationParticipant.findFirst({
        where: {
          conversationId: input.conversationId,
          userId: currentUser.id,
        },
      });
      
      if (!participation) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non fai parte di questa conversazione',
        });
      }
      
      // Get latest message
      const latestMessage = await ctx.prisma.message.findFirst({
        where: { conversationId: input.conversationId },
        orderBy: { createdAt: 'desc' },
      });
      
      await ctx.prisma.conversationParticipant.update({
        where: { id: participation.id },
        data: {
          lastReadAt: new Date(),
          lastReadMsgId: latestMessage?.id,
        },
      });
      
      return { success: true };
    }),

  /**
   * Archive/unarchive a conversation
   */
  toggleArchive: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.user;
      
      const participation = await ctx.prisma.conversationParticipant.findFirst({
        where: {
          conversationId: input.conversationId,
          userId: currentUser.id,
        },
      });
      
      if (!participation) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Non fai parte di questa conversazione',
        });
      }
      
      await ctx.prisma.conversationParticipant.update({
        where: { id: participation.id },
        data: { isArchived: !participation.isArchived },
      });
      
      return { 
        success: true, 
        isArchived: !participation.isArchived,
      };
    }),

  /**
   * Get unread messages count
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.user;
    
    // Get user's participations
    const participations = await ctx.prisma.conversationParticipant.findMany({
      where: {
        userId: currentUser.id,
        leftAt: null,
        isArchived: false,
      },
    });
    
    let totalUnread = 0;
    
    for (const participation of participations) {
      const unreadCount = await ctx.prisma.message.count({
        where: {
          conversationId: participation.conversationId,
          senderId: { not: currentUser.id },
          createdAt: participation.lastReadAt 
            ? { gt: participation.lastReadAt }
            : undefined,
        },
      });
      totalUnread += unreadCount;
    }
    
    return { unreadCount: totalUnread };
  }),
});

// Helper function to check if user can contact another user based on roles
function canUserContact(
  senderRole: string,
  recipientRole: string
): boolean {
  if (senderRole === 'ADMIN') {
    // Admin can contact collaborators and students
    return ['COLLABORATOR', 'STUDENT'].includes(recipientRole);
  } else if (senderRole === 'COLLABORATOR') {
    // Collaborator can contact admin, other collaborators, and students
    return ['ADMIN', 'COLLABORATOR', 'STUDENT'].includes(recipientRole);
  } else if (senderRole === 'STUDENT') {
    // Student can only contact admin and collaborators
    return ['ADMIN', 'COLLABORATOR'].includes(recipientRole);
  }
  return false;
}
