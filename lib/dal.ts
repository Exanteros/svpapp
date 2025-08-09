import { getSession } from '@/lib/session';
import { NextRequest } from 'next/server';
import { cache } from 'react';

/**
 * Data Access Layer (DAL) for authentication
 * Centralizes authorization logic
 */

/**
 * Verify user authentication for server components
 */
export const verifySession = cache(async () => {
  const session = await getSession();
  
  if (!session?.userId) {
    return { isAuth: false, userId: null };
  }

  return { isAuth: true, userId: session.userId };
});

/**
 * Get user for API routes
 */
export async function getUser(request?: NextRequest) {
  const session = await getSession(request);
  
  if (!session?.userId) {
    return null;
  }

  return {
    id: session.userId,
    email: session.email,
    role: session.role
  };
}

/**
 * Middleware to verify API route authentication
 */
export async function verifyApiAuth(request: NextRequest) {
  const user = await getUser(request);
  
  if (!user) {
    return {
      authenticated: false,
      error: 'Nicht authentifiziert',
      status: 401
    };
  }

  return {
    authenticated: true,
    user
  };
}

/**
 * Check if user has admin role
 */
export async function verifyAdminRole(request?: NextRequest) {
  const user = await getUser(request);
  
  if (!user || user.role !== 'admin') {
    return {
      authorized: false,
      error: 'Nicht autorisiert - Admin-Berechtigung erforderlich',
      status: 403
    };
  }

  return {
    authorized: true,
    user
  };
}
