import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { sendAuthEmailVerification } from '@/server/services/emailService';

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
    } catch {
      // continueUrl domain not yet authorized in Firebase Console — generate without it
      verificationLink = await adminAuth.generateEmailVerificationLink(email);
    }

    await sendAuthEmailVerification({ name, email, verificationLink });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[send-verification-email]', error);
    return NextResponse.json(
      { error: 'Errore nell\'invio dell\'email di verifica' },
      { status: 500 }
    );
  }
}
