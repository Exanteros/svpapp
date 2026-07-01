import { SignJWT, jwtVerify } from 'jose';

const DEFAULT_DEV_SESSION_SECRET = 'svpapp-development-session-secret';
const VOLATILE_SESSION_SECRET = createVolatileSessionSecret();

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || (
    process.env.NODE_ENV === 'development'
      ? DEFAULT_DEV_SESSION_SECRET
      : VOLATILE_SESSION_SECRET
  )
);

export interface SessionPayload {
  userId: string;
  email: string;
  role: 'admin';
  expiresAt: number;
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    expiresAt: payload.expiresAt,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(new Date(payload.expiresAt))
    .sign(SESSION_SECRET);
}

export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET, {
      algorithms: ['HS256'],
    });

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as 'admin',
      expiresAt: payload.expiresAt as number,
    };
  } catch {
    return null;
  }
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
