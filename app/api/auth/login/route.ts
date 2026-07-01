import { NextRequest, NextResponse } from 'next/server';
import { createSession, verifyCredentials } from '@/lib/session';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, username, password } = body || {};
    const identifier = typeof email === 'string'
      ? email
      : typeof username === 'string'
        ? username
        : '';
    const attemptKey = getLoginAttemptKey(request, identifier);
    const rateLimit = checkLoginRateLimit(attemptKey);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Zu viele Anmeldeversuche. Bitte versuchen Sie es später erneut.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(rateLimit.retryAfterMs / 1000).toString(),
          },
        }
      );
    }

    // Validate input
    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Benutzername/E-Mail und Passwort sind erforderlich' },
        { status: 400 }
      );
    }

    // Verify credentials
    if (!verifyCredentials(identifier, password)) {
      recordFailedLogin(attemptKey);
      return NextResponse.json(
        { error: 'Ungültige Anmeldedaten' },
        { status: 401 }
      );
    }

    // Create session
    const sessionToken = await createSession(identifier);
    loginAttempts.delete(attemptKey);

    console.log('✅ Login erfolgreich für:', identifier);

    return NextResponse.json({
      success: true,
      message: 'Anmeldung erfolgreich',
      token: sessionToken
    });

  } catch (error) {
    console.error('❌ Login-Fehler:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

function getLoginAttemptKey(request: NextRequest, email: unknown) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwardedFor || request.headers.get('x-real-ip') || 'unknown-ip';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : 'unknown-email';

  return `${ip}:${normalizedEmail}`;
}

function checkLoginRateLimit(key: string) {
  const now = Date.now();
  const attempt = loginAttempts.get(key);

  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.delete(key);
    return { allowed: true, retryAfterMs: 0 };
  }

  return {
    allowed: attempt.count < MAX_LOGIN_ATTEMPTS,
    retryAfterMs: attempt.resetAt - now,
  };
}

function recordFailedLogin(key: string) {
  const now = Date.now();
  const current = loginAttempts.get(key);

  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }

  loginAttempts.set(key, {
    count: current.count + 1,
    resetAt: current.resetAt,
  });
}
