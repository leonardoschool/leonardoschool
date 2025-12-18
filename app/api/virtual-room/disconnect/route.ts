import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

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

    // Update the participant to mark as disconnected
    await prisma.simulationSessionParticipant.update({
      where: { id: participantId },
      data: {
        isConnected: false,
        disconnectedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting participant:', error);
    // Return 200 anyway since this is a fire-and-forget request
    return NextResponse.json({ success: false });
  }
}
