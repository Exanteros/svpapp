import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const DEV_ADMIN_EMAIL = 'admin@svpuschendorf.de';
const VOLATILE_SESSION_SECRET = createVolatileSessionSecret();

// Session configuration
const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || VOLATILE_SESSION_SECRET
);
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export interface SessionPayload {
  userId: string;
  email: string;
  role: 'admin';
  expiresAt: number;
}

/**
 * Encrypt session data into a JWT token
 */
export async function encrypt(payload: SessionPayload): Promise<string> {
  const jwtPayload = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    expiresAt: payload.expiresAt
  };

  return new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(new Date(payload.expiresAt))
    .sign(SESSION_SECRET);
}

/**
 * Decrypt and verify JWT token
 */
export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET, {
      algorithms: ['HS256'],
    });

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as 'admin',
      expiresAt: payload.expiresAt as number
    };
  } catch (error) {
    console.error('Session decrypt error:', error);
    return null;
  }
}

/**
 * Create a new session for authenticated user
 */
export async function createSession(email: string, userId = 'admin'): Promise<string> {
  const expiresAt = Date.now() + SESSION_DURATION;
  const sessionPayload: SessionPayload = {
    userId,
    email,
    role: 'admin',
    expiresAt,
  };

  const encryptedSession = await encrypt(sessionPayload);

  // Set session cookie
  const cookieStore = await cookies();
  cookieStore.set('session', encryptedSession, {
    httpOnly: true,
    secure: shouldUseSecureSessionCookie(),
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
    path: '/',
    sameSite: 'lax',
  });

  return encryptedSession;
}

/**
 * Get current session from request
 */
export async function getSession(request?: NextRequest): Promise<SessionPayload | null> {
  let token: string | undefined;

  if (request) {
    // Get from request cookies (middleware)
    token = request.cookies.get('session')?.value;
  } else {
    // Get from Next.js cookies (server components/API routes)
    const cookieStore = await cookies();
    token = cookieStore.get('session')?.value;
  }

  if (!token) return null;

  const session = await decrypt(token);

  // Check if session is expired
  if (session && Date.now() > session.expiresAt) {
    await deleteSession();
    return null;
  }

  return session;
}

/**
 * Delete the current session
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

/**
 * Refresh session expiration
 */
export async function refreshSession(): Promise<void> {
  const session = await getSession();
  if (!session) return;

  // Extend expiration
  const newExpiresAt = Date.now() + SESSION_DURATION;
  const newSessionPayload: SessionPayload = {
    ...session,
    expiresAt: newExpiresAt,
  };

  const encryptedSession = await encrypt(newSessionPayload);

  const cookieStore = await cookies();
  cookieStore.set('session', encryptedSession, {
    httpOnly: true,
    secure: shouldUseSecureSessionCookie(),
    maxAge: SESSION_DURATION / 1000,
    path: '/',
    sameSite: 'lax',
  });
}

/**
 * Verify admin credentials (simple username/password check)
 */
export function verifyCredentials(email: string, password: string): boolean {
  const configuredEmail = process.env.ADMIN_EMAIL;
  const configuredPassword = process.env.ADMIN_PASSWORD;

  if (!configuredEmail || !configuredPassword) {
    if (process.env.NODE_ENV === 'development') {
      const devPassword = process.env.DEV_ADMIN_PASSWORD;
      return Boolean(devPassword) && email === DEV_ADMIN_EMAIL && password === devPassword;
    }

    return false;
  }

  return email === configuredEmail && password === configuredPassword;
}

function createVolatileSessionSecret() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const values = new Uint32Array(4);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
    return Array.from(values, (value) => value.toString(36)).join('');
  }

  return `volatile-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function shouldUseSecureSessionCookie() {
  const explicitValue = process.env.SESSION_COOKIE_SECURE;

  if (explicitValue === 'true') {
    return true;
  }

  if (explicitValue === 'false') {
    return false;
  }

  return process.env.NODE_ENV === 'production';
}
