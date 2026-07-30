import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { sendAuthEmailVerification } from '@/server/services/emailService';
import { logApp } from '@/lib/logging/appLog';

/** Firebase rejects the continue URL when its domain isn't authorized in the console. */
function isUnauthorizedContinueUri(error: unknown): boolean {
  const code = (error as { code?: string })?.code ?? '';
  return code.includes('continue-uri') || code.includes('invalid-continue');
}

/**
 * Firebase throttles verification emails per account. This is the user pressing
 * "reinvia" repeatedly, not a platform fault: it must not be reported as an error.
 */
function isRateLimited(error: unknown): boolean {
  const code = (error as { code?: string })?.code ?? '';
  const message = (error as { message?: string })?.message ?? '';
  return code.includes('too-many-requests') || message.includes('TOO_MANY_ATTEMPTS_TRY_LATER');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = (body as { token?: string }).token;

    if (!token) {
      return NextResponse.json({ error: 'Token mancante' }, { status: 401 });
    }

    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);

    if (decodedToken.email_verified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    const email = decodedToken.email;
    if (!email) {
      return NextResponse.json(
        { error: 'Nessun indirizzo email associato all\'account' },
        { status: 400 }
      );
    }

    const firebaseUser = await adminAuth.getUser(decodedToken.uid);
    const name = firebaseUser.displayName || email.split('@')[0];

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.leonardoschool.it';
    let verificationLink: string;
    try {
      verificationLink = await adminAuth.generateEmailVerificationLink(email, {
        url: `${appUrl}/auth/login`,
      });
    } catch (error) {
      // Retry without the continue URL ONLY when that is what Firebase rejected.
      // Retrying blindly used to fire a second call for any failure — including a
      // throttling response — which spent another attempt against the same limit.
      if (!isUnauthorizedContinueUri(error)) throw error;
      // continueUrl domain not yet authorized in Firebase Console — generate without it
      verificationLink = await adminAuth.generateEmailVerificationLink(email);
    }

    await sendAuthEmailVerification({ name, email, verificationLink });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Throttling is an expected outcome, not a failure of ours: report it as a
    // warning with a 429 so it stops filling the error log, and tell the user
    // plainly to wait instead of showing a generic "something went wrong".
    if (isRateLimited(error)) {
      await logApp({
        source: 'AUTH',
        level: 'WARN',
        message: 'Email di verifica richiesta troppe volte (limite Firebase)',
        error,
        path: 'POST /api/auth/send-verification-email',
        statusCode: 429,
      });
      return NextResponse.json(
        { error: 'Hai richiesto troppe email di verifica. Attendi qualche minuto e riprova.' },
        { status: 429 }
      );
    }

    console.error('[send-verification-email]', error);
    await logApp({
      source: 'AUTH',
      level: 'ERROR',
      message: 'Errore nell\'invio dell\'email di verifica',
      error,
      path: 'POST /api/auth/send-verification-email',
      statusCode: 500,
    });
    return NextResponse.json(
      { error: 'Errore nell\'invio dell\'email di verifica' },
      { status: 500 }
    );
  }
}
