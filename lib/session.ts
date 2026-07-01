import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { decrypt, encrypt, type SessionPayload } from './session-token';

const DEFAULT_DEV_ADMIN_USERNAME = 'admin';
const DEFAULT_DEV_ADMIN_PASSWORD = 'password';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
export { decrypt, encrypt, type SessionPayload };

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
 * Verify admin credentials.
 *
 * Development accepts a local username/password pair. Production requires
 * ADMIN_EMAIL and a bcrypt ADMIN_PASSWORD_HASH.
 */
export function verifyCredentials(identifier: string, password: string): boolean {
  const normalizedIdentifier = identifier.trim().toLowerCase();

  if (process.env.NODE_ENV === 'development') {
    const devUsername = (process.env.DEV_ADMIN_USERNAME || DEFAULT_DEV_ADMIN_USERNAME).trim().toLowerCase();
    const devPassword = process.env.DEV_ADMIN_PASSWORD || DEFAULT_DEV_ADMIN_PASSWORD;

    if (normalizedIdentifier === devUsername && password === devPassword) {
      return true;
    }
  }

  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const configuredPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!configuredEmail || !configuredPasswordHash || normalizedIdentifier !== configuredEmail) {
    return false;
  }

  try {
    return bcrypt.compareSync(password, configuredPasswordHash);
  } catch {
    return false;
  }
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
