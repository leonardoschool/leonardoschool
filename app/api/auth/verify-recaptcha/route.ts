import { NextRequest, NextResponse } from 'next/server';

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

// In-memory rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_MAX = 5; // Max registrations
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    // Reset or create new entry
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetIn: RATE_LIMIT_WINDOW };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetIn: entry.resetAt - now 
    };
  }

  entry.count++;
  return { 
    allowed: true, 
    remaining: RATE_LIMIT_MAX - entry.count, 
    resetIn: entry.resetAt - now 
  };
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    
    // Check rate limit
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      const minutesLeft = Math.ceil(rateLimit.resetIn / 60000);
      return NextResponse.json(
        { 
          success: false, 
          error: `Troppe richieste. Riprova tra ${minutesLeft} minuti.`,
          code: 'RATE_LIMIT_EXCEEDED'
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetIn / 1000))
          }
        }
      );
    }

    const body = await request.json();
    const { token, honeypot } = body;

    // Check honeypot - if filled, it's a bot
    if (honeypot) {
      console.log('Honeypot triggered - bot detected from IP:', ip);
      // Return success to not alert the bot, but don't process
      return NextResponse.json({ 
        success: false, 
        error: 'Verifica di sicurezza fallita',
        code: 'BOT_DETECTED'
      }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token reCAPTCHA mancante', code: 'MISSING_TOKEN' },
        { status: 400 }
      );
    }

    if (!RECAPTCHA_SECRET_KEY) {
      console.error('RECAPTCHA_SECRET_KEY not configured');
      // In development, allow if not configured
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({ success: true, score: 1.0 });
      }
      return NextResponse.json(
        { success: false, error: 'Configurazione reCAPTCHA mancante', code: 'CONFIG_ERROR' },
        { status: 500 }
      );
    }

    // Verify with Google
    const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: RECAPTCHA_SECRET_KEY,
        response: token,
        remoteip: ip,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      console.log('reCAPTCHA verification failed:', data['error-codes']);
      return NextResponse.json(
        { success: false, error: 'Verifica reCAPTCHA fallita', code: 'VERIFICATION_FAILED' },
        { status: 400 }
      );
    }

    // reCAPTCHA v3 returns a score from 0.0 to 1.0
    // 1.0 = very likely human, 0.0 = very likely bot
    const score = data.score || 0;
    
    // Reject if score is too low (threshold: 0.5)
    if (score < 0.5) {
      console.log('reCAPTCHA low score:', score, 'from IP:', ip);
      return NextResponse.json(
        { success: false, error: 'Verifica di sicurezza fallita. Riprova.', code: 'LOW_SCORE' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      score,
      remaining: rateLimit.remaining 
    });

  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Errore durante la verifica', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
