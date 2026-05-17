import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminAuth } from '@/lib/firebase/admin';
import { sendAuthPasswordReset } from '@/server/services/emailService';

const schema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  // Always return success to prevent email enumeration
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: true });
    }

    const { email } = parsed.data;
    console.log('[send-reset-password] request for:', email);

    const adminAuth = getAdminAuth();

    let name: string;
    try {
      const firebaseUser = await adminAuth.getUserByEmail(email);
      name = firebaseUser.displayName || email.split('@')[0];
      console.log('[send-reset-password] user found:', name);
    } catch (err) {
      console.log('[send-reset-password] user not found in Firebase:', (err as Error).message);
      return NextResponse.json({ success: true });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.leonardoschool.it';
    let resetLink: string;
    try {
      resetLink = await adminAuth.generatePasswordResetLink(email, {
        url: `${appUrl}/auth/login`,
      });
      console.log('[send-reset-password] link generated with continueUrl');
    } catch (err) {
      console.warn('[send-reset-password] continueUrl rejected, retrying without:', (err as Error).message);
      resetLink = await adminAuth.generatePasswordResetLink(email);
      console.log('[send-reset-password] link generated without continueUrl');
    }

    const result = await sendAuthPasswordReset({ name, email, resetLink });
    console.log(`[send-reset-password] email sent to ${email}:`, result);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[send-reset-password] fatal error:', error);
    return NextResponse.json({ success: true });
  }
}
