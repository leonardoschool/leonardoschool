// API route to get current user data after login
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { prisma } from '@/lib/prisma/client';
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from '@/lib/middleware/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request.headers);
    const rateLimit = checkRateLimit(clientIp, 'auth');
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        rateLimitExceededResponse(rateLimit.retryAfterMs!),
        { status: 429 }
      );
    }

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
    let user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: {
        student: {
          include: {
            parentGuardian: true,
          },
        },
        admin: true,
        collaborator: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      );
    }

    // Check if student needs to provide parent data
    const parentDataRequired = user.student?.requiresParentData && !user.student?.parentGuardian;
    
    // Note: We don't block deactivated users here anymore.
    // The proxy middleware handles the redirect based on isActive cookie.
    // This allows users to complete registration flow even if not yet activated.

    // Sincronizza emailVerified da Firebase al database se è cambiato
    if (decodedToken.email_verified && !user.emailVerified) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
        include: {
          student: {
            include: {
              parentGuardian: true,
            },
          },
          admin: true,
          collaborator: true,
        },
      });
    }

    // Check if student needs to provide parent data
    // Already calculated above

    // Check if user has a pending contract to sign
    let pendingContractToken: string | null = null;
    if (user.role === 'STUDENT' && user.student) {
      const pendingContract = await prisma.contract.findFirst({
        where: {
          studentId: user.student.id,
          status: 'PENDING',
        },
        select: { signToken: true },
      });
      pendingContractToken = pendingContract?.signToken || null;
    } else if (user.role === 'COLLABORATOR' && user.collaborator) {
      const pendingContract = await prisma.contract.findFirst({
        where: {
          collaboratorId: user.collaborator.id,
          status: 'PENDING',
        },
        select: { signToken: true },
      });
      pendingContractToken = pendingContract?.signToken || null;
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
      parentDataRequired: parentDataRequired || false,
      pendingContractToken: pendingContractToken,
    });

    // Cookie duration: 7 days (refresh happens on each /api/auth/me call)
    const cookieMaxAge = 60 * 60 * 24 * 7; // 7 giorni

    // Setta cookie HttpOnly e Secure con il token (non accessibile da JS)
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/',
    });

    // Cookie per middleware (non HttpOnly perché deve essere letto client-side per redirect)
    // Non contengono dati sensibili, solo info per routing
    response.cookies.set('user-role', user.role, {
      httpOnly: false, // Middleware Next.js può leggerlo
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/',
    });

    response.cookies.set('profile-completed', String(user.profileCompleted), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/',
    });

    // Cookie for parent data requirement (students only)
    response.cookies.set('parent-data-required', String(parentDataRequired), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/',
    });

    // Cookie for user active status
    response.cookies.set('user-active', String(user.isActive), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/',
    });

    // Cookie for pending contract token (if user has a contract to sign)
    if (pendingContractToken) {
      response.cookies.set('pending-contract', pendingContractToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: cookieMaxAge,
        path: '/',
      });
    } else {
      // Clear the cookie if no pending contract
      response.cookies.set('pending-contract', '', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0, // Expire immediately
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('Errore nel recupero utente:', error);
    const message = error instanceof Error ? error.message : 'Errore nel recupero dati utente';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
