import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { getAdminAuth } from '@/lib/firebase/admin';
import { logApp } from '@/lib/logging/appLog';
import { persistProgress, type PersistProgressStatus } from '@/server/trpc/routers/simulations.helpers';

// Maps a failed persistProgress outcome onto an HTTP response (the tRPC
// saveProgress mutation maps the same outcomes onto TRPCError codes).
// Successful outcomes are absent, so a lookup on them yields undefined.
const SAVE_PROGRESS_FAILURES: Partial<
  Record<PersistProgressStatus, { status: number; error: string }>
> = {
  not_found: { status: 404, error: 'Tentativo non trovato' },
  forbidden: { status: 403, error: 'Non autorizzato' },
  completed: { status: 400, error: 'Tentativo già completato' },
  reset: { status: 409, error: 'Tentativo ripristinato dallo staff' },
};

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
    const { resultId, answers, timeSpent, sectionTimes, currentSectionIndex, currentQuestionIndex, resetToken, rev } = body;

    if (!resultId || !Array.isArray(answers)) {
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

    // Ownership, completion, staff-reset and out-of-order guards all live in
    // persistProgress, shared with the tRPC saveProgress mutation
    const outcome = await persistProgress(prisma, {
      resultId,
      studentId: student.id,
      answers,
      timeSpent: typeof timeSpent === 'number' ? timeSpent : 0,
      sectionTimes,
      currentSectionIndex,
      currentQuestionIndex,
      resetToken,
      rev,
    });

    const failure = SAVE_PROGRESS_FAILURES[outcome];
    if (failure) {
      return NextResponse.json({ error: failure.error }, { status: failure.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SaveProgress API] Error:', error);
    await logApp({
      source: 'SIMULATION',
      level: 'ERROR',
      message: 'Errore nel salvataggio progresso simulazione',
      error,
      path: 'POST /api/simulations/save-progress',
      statusCode: 500,
    });
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
