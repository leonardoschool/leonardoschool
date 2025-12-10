// API route to get current user data after login
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { prisma } from '@/lib/prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token mancante' },
        { status: 401 }
      );
    }

    // Verifica token Firebase
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Recupera utente dal database
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: {
        student: true,
        admin: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      );
    }

    // Crea response con dati utente
    const response = NextResponse.json({
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      profileCompleted: user.profileCompleted,
      emailVerified: user.emailVerified,
    });

    // Setta cookie HttpOnly e Secure con il token (non accessibile da JS)
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 ora
      path: '/',
    });

    // Cookie per middleware (non HttpOnly perché deve essere letto client-side per redirect)
    // Non contengono dati sensibili, solo info per routing
    response.cookies.set('user-role', user.role, {
      httpOnly: false, // Middleware Next.js può leggerlo
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60,
      path: '/',
    });

    response.cookies.set('profile-completed', String(user.profileCompleted), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Errore nel recupero utente:', error);
    return NextResponse.json(
      { error: error.message || 'Errore nel recupero dati utente' },
      { status: 500 }
    );
  }
}
