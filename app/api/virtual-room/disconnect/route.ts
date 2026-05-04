import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('VirtualRoom-Disconnect');

// This endpoint is called via sendBeacon when the browser is closing
// It must be a simple POST endpoint, not tRPC, for sendBeacon compatibility
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.text();
    
    // sendBeacon sends as text, try to parse as JSON
    let participantId: string | undefined;
    
    try {
      const data = JSON.parse(body);
      participantId = data.participantId;
    } catch {
      // If parsing fails, return error
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!participantId) {
      return NextResponse.json({ error: 'participantId is required' }, { status: 400 });
    }

    // Update the participant to mark as disconnected and check session status
    const participant = await prisma.simulationSessionParticipant.update({
      where: { id: participantId },
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
    const hasAnyConnected = session.participants.some(p => p.isConnected && p.id !== participantId);
    
    // If session is completed and no one is connected anymore, delete all messages
    if (session.status === 'COMPLETED' && !hasAnyConnected) {
      const participantIds = session.participants.map(p => p.id);
      
      if (participantIds.length > 0) {
        const deletedMessages = await prisma.sessionMessage.deleteMany({
          where: {
            participantId: { in: participantIds },
          },
        });
        
        log.info('All participants disconnected via beacon - messages deleted:', {
          sessionId: session.id,
          deletedCount: deletedMessages.count,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting participant:', error);
    // Return 200 anyway since this is a fire-and-forget request
    return NextResponse.json({ success: false });
  }
}
