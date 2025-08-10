import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Typen
export interface AdminSession {
  token: string;
  timestamp: number;
  expires: number;
  ip?: string;
  userAgent?: string;
}

export interface SessionData {
  sessions: AdminSession[];
}

// Session-Pfad
const SESSIONS_FILE = path.join(process.cwd(), 'sessions.json');

// Utility-Funktionen
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function loadSessions(): SessionData {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = fs.readFileSync(SESSIONS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Fehler beim Laden der Sessions:', error);
  }
  return { sessions: [] };
}

export function saveSessions(data: SessionData): void {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Fehler beim Speichern der Sessions:', error);
  }
}

export function cleanExpiredSessions(): void {
  const data = loadSessions();
  const now = Date.now();
  data.sessions = data.sessions.filter(session => session.expires > now);
  saveSessions(data);
}

export function verifySessionToken(token: string): boolean {
  cleanExpiredSessions();
  const data = loadSessions();
  return data.sessions.some(session => session.token === token);
}

export function createSession(ip?: string, userAgent?: string): string {
  const token = generateSecureToken();
  const now = Date.now();
  const expires = now + (24 * 60 * 60 * 1000); // 24 Stunden
  
  const session: AdminSession = {
    token,
    timestamp: now,
    expires,
    ip,
    userAgent
  };
  
  const data = loadSessions();
  data.sessions.push(session);
  saveSessions(data);
  
  return token;
}

export function deleteSession(token: string): void {
  const data = loadSessions();
  data.sessions = data.sessions.filter(session => session.token !== token);
  saveSessions(data);
}

export function verifyAdminSession(token?: string): boolean {
  if (!token) return false;
  return verifySessionToken(token);
}

export async function authenticateAdmin(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('admin-session')?.value;
  
  if (!sessionToken) return false;
  return verifyAdminSession(sessionToken);
}

// Response-Hilfsfunktionen
export function createAuthResponse(data: any, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function createErrorResponse(message: string, status: number = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function createUnauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Session-Cookie-Hilfsfunktionen
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('admin-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60, // 24 Stunden
    path: '/',
    sameSite: 'strict'
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('admin-session');
}

export async function getSessionFromCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('admin-session')?.value;
}
