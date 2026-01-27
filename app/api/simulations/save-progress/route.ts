import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { getAdminAuth } from '@/lib/firebase/admin';
import { Prisma } from '@prisma/client';

/**
 * API endpoint for saving simulation progress via sendBeacon
 * Used when page is being unloaded/refreshed
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token from cookie
    const authToken = request.cookies.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await getAdminAuth().verifyIdToken(authToken);
    } catch {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 });
    }

    // Get user from Firebase UID
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
    }

    const body = await request.json();
    const { resultId, answers, timeSpent, sectionTimes, currentSectionIndex } = body;

    if (!resultId || !answers) {
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 });
    }

    // Get student from user
    const student = await prisma.student.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Studente non trovato' }, { status: 404 });
    }

    // Verify result belongs to student
    const result = await prisma.simulationResult.findUnique({
      where: { id: resultId },
      select: { studentId: true, completedAt: true },
    });

    if (!result) {
      return NextResponse.json({ error: 'Tentativo non trovato' }, { status: 404 });
    }

    if (result.studentId !== student.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
    }

    if (result.completedAt) {
      return NextResponse.json({ error: 'Tentativo già completato' }, { status: 400 });
    }

    // Prepare answers with section progress metadata
    const answersWithMeta = {
      items: answers,
      sectionTimes: sectionTimes || {},
      currentSectionIndex: currentSectionIndex ?? 0,
    };

    // Save progress
    await prisma.simulationResult.update({
      where: { id: resultId },
      data: {
        answers: answersWithMeta as unknown as Prisma.JsonArray,
        durationSeconds: timeSpent,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SaveProgress API] Error:', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
