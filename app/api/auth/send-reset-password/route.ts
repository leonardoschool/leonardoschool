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
    const adminAuth = getAdminAuth();

    let name: string;
    try {
      const firebaseUser = await adminAuth.getUserByEmail(email);
      name = firebaseUser.displayName || email.split('@')[0];
    } catch {
      // User not found — return success silently
      return NextResponse.json({ success: true });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.leonardoschool.it';
    const resetLink = await adminAuth.generatePasswordResetLink(email, {
      url: `${appUrl}/auth/login`,
    });

    await sendAuthPasswordReset({ name, email, resetLink });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[send-reset-password]', error);
    return NextResponse.json({ success: true });
  }
}
