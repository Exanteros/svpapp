import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';

/**
 * Admin Authentication Configuration
 */
const ADMIN_CONFIG = {
  // In production, use environment variables
  API_KEY: process.env.ADMIN_API_KEY || 'svp-admin-2025-secure-key',
  SESSION_SECRET: process.env.SESSION_SECRET || 'svp-session-secret-2025',
  ALLOWED_IPS: process.env.ALLOWED_IPS?.split(',').filter(ip => ip.trim()) || [], // Optional IP whitelist
  MAX_REQUESTS_PER_MINUTE: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '120'),
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  DEBUG: true, // Aktiviere Debug-Modus für die Fehlersuche
  // Passkey Configuration
  PASSKEY_RP_ID: process.env.NEXT_PUBLIC_APP_URL?.replace(/https?:\/\//, '') || 'localhost',
  PASSKEY_RP_NAME: 'SV Puschendorf Turnier-Verwaltung',
  PASSKEY_TIMEOUT: 60000, // 60 seconds
};

/**
 * Simple rate limiting using in-memory storage
 * In production, use Redis or similar
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Passkey challenge storage (in production, use Redis)
 */
const passkeyStore = new Map<string, {
  challenge: string;
  userHandle: string;
  timestamp: number;
}>();

/**
 * Registered passkeys storage (in production, use database)
 */
const registeredPasskeys = new Map<string, {
  id: string;
  publicKey: string;
  counter: number;
  userHandle: string;
  createdAt: number;
}>();

/**
 * Email/Password Authentication Storage (in production, use database)
 */
const adminCredentials = new Map<string, {
  email: string;
  passwordHash: string;
  createdAt: number;
}>();

/**
 * Session storage for authenticated users
 * In production, this should be replaced with a database or Redis
 */
let activeSessions = new Map<string, {
  email: string;
  createdAt: number;
  expiresAt: number;
}>();

// Hilfsfunktion zum Persistieren der Sessions in einer JSON-Datei
// Nur für Entwicklungszwecke - in Produktion sollte eine Datenbank verwendet werden
function saveSessions(): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Konvertiere Map zu Array für JSON-Serialisierung
      const sessionsArray = Array.from(activeSessions.entries());
      const sessionsPath = path.join(process.cwd(), 'sessions.json');
      
      fs.writeFileSync(sessionsPath, JSON.stringify(sessionsArray), 'utf8');
      console.log('💾 Sessions in Datei gespeichert:', sessionsPath);
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Sessions:', error);
    }
  }
}

// Hilfsfunktion zum Laden der Sessions aus einer JSON-Datei
// Nur für Entwicklungszwecke - in Produktion sollte eine Datenbank verwendet werden
function loadSessions(): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    try {
      const fs = require('fs');
      const path = require('path');
      const sessionsPath = path.join(process.cwd(), 'sessions.json');
      
      if (fs.existsSync(sessionsPath)) {
        const data = fs.readFileSync(sessionsPath, 'utf8');
        const sessionsArray = JSON.parse(data);
        
        // Konvertiere Array zurück zu Map
        activeSessions = new Map(sessionsArray);
        console.log('📂 Sessions aus Datei geladen:', sessionsPath);
        console.log('📊 Anzahl geladener Sessions:', activeSessions.size);
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Sessions:', error);
      activeSessions = new Map(); // Fallback zu leerer Map bei Fehler
    }
  }
}

// Lade Sessions beim Serverstart
loadSessions();

/**
 * Check if request is rate limited
 */
export function checkRateLimit(clientId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = Math.floor(now / 60000) * 60000; // 1-minute window
  
  const existing = rateLimitStore.get(clientId);
  
  // Clean up old entries
  if (existing && existing.resetTime < now) {
    rateLimitStore.delete(clientId);
  }
  
  const current = rateLimitStore.get(clientId) || { count: 0, resetTime: windowStart + 60000 };
  
  if (current.count >= ADMIN_CONFIG.MAX_REQUESTS_PER_MINUTE) {
    return { allowed: false, remaining: 0 };
  }
  
  current.count++;
  rateLimitStore.set(clientId, current);
  
  return { 
    allowed: true, 
    remaining: ADMIN_CONFIG.MAX_REQUESTS_PER_MINUTE - current.count 
  };
}

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  return ip;
}

/**
 * Verify API Key or Session Token from request headers
 * Diese Funktion wurde modifiziert, um immer true zurückzugeben (öffentliche API)
 */
function verifyAuthentication(request: NextRequest): boolean {
  // Authentifizierung wurde deaktiviert - alle Anfragen werden akzeptiert
  console.log('🔓 API-Zugriff: Alle API-Anfragen werden ohne Authentifizierung akzeptiert');
  console.log('- URL:', request.url);
  
  // Immer true zurückgeben, um alle API-Anfragen zu erlauben
  return true;
}

/**
 * Check if IP is whitelisted (if whitelist is configured)
 */
function isIpAllowed(request: NextRequest): boolean {
  if (ADMIN_CONFIG.ALLOWED_IPS.length === 0) {
    return true; // No IP restriction if list is empty
  }
  
  const clientIp = getClientId(request);
  return ADMIN_CONFIG.ALLOWED_IPS.includes(clientIp);
}

/**
 * Validate request origin (CSRF protection)
 */
function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const userAgent = request.headers.get('user-agent') || '';
  
  // Allow localhost and development URLs
  const allowedOrigins = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    process.env.NEXT_PUBLIC_APP_URL || 'localhost'
  ];
  
  // Check if origin is allowed
  if (origin) {
    const isAllowed = allowedOrigins.some(allowed => 
      origin.includes(allowed) || origin.includes('localhost') || origin.includes('127.0.0.1')
    );
    if (isAllowed) return true;
  }
  
  // Check if referer is allowed
  if (referer) {
    const isAllowed = allowedOrigins.some(allowed => 
      referer.includes(allowed) || referer.includes('localhost') || referer.includes('127.0.0.1')
    );
    if (isAllowed) return true;
  }
  
  // Allow requests without origin/referer for direct API calls (like from API clients)
  // This is common for server-to-server communication or direct fetch calls
  if (!origin && !referer) {
    return true;
  }
  
  // Allow requests from browsers in development mode
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  console.warn(`🚫 Origin validation failed - Origin: ${origin}, Referer: ${referer}`);
  return false;
}

/**
 * Main authentication function for admin endpoints
 */
export async function authenticateAdmin(request: NextRequest): Promise<{
  success: boolean;
  error?: string;
  status?: number;
  headers?: Record<string, string>;
}> {
  try {
    // Authentifizierung deaktiviert - alle Anfragen werden automatisch akzeptiert
    console.log('� Admin API: Authentifizierung deaktiviert - öffentlicher Zugriff', {
      path: request.nextUrl.pathname,
      method: request.method
    });

    // Direktes Erfolgsergebnis zurückgeben ohne Authentifizierung
    return {
      success: true,
      headers: {
        'X-API-Auth-Disabled': 'true'
      }
    };

  } catch (error) {
    console.error('🚫 Authentication error:', error);
    return {
      success: false,
      error: 'Authentifizierungsfehler',
      status: 500
    };
  }
}

/**
 * Utility function to create authenticated response
 */
export function createAuthResponse(data: any, headers?: Record<string, string>) {
  const response = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      ...headers
    }
  });
  
  return response;
}

/**
 * Utility function to create error response
 */
export function createErrorResponse(error: string, status: number = 400, headers?: Record<string, string>) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      ...headers
    }
  });
}

/**
 * Generate a secure admin token (for initial setup)
 */
export function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Passkey Utilities
 */

// Generate random challenge for passkey
export function generateChallenge(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// Generate user handle
export function generateUserHandle(): string {
  return crypto.randomBytes(16).toString('base64url');
}

// Convert buffer to base64url
export function bufferToBase64url(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString('base64url');
}

// Convert base64url to buffer
export function base64urlToBuffer(base64url: string): ArrayBuffer {
  const buffer = Buffer.from(base64url, 'base64url');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

/**
 * Generate passkey registration options
 */
export function generatePasskeyRegistrationOptions(): {
  rp: { id: string; name: string };
  user: { id: string; name: string; displayName: string };
  challenge: string;
  pubKeyCredParams: Array<{ alg: number; type: string }>;
  timeout: number;
  attestation: string;
} {
  const challenge = generateChallenge();
  const userHandle = generateUserHandle();
  
  // Store challenge for verification
  passkeyStore.set(challenge, {
    challenge,
    userHandle,
    timestamp: Date.now()
  });
  
  return {
    rp: {
      id: ADMIN_CONFIG.PASSKEY_RP_ID,
      name: ADMIN_CONFIG.PASSKEY_RP_NAME
    },
    user: {
      id: userHandle,
      name: 'admin',
      displayName: 'Administrator'
    },
    challenge,
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },  // ES256
      { alg: -257, type: 'public-key' } // RS256
    ],
    timeout: ADMIN_CONFIG.PASSKEY_TIMEOUT,
    attestation: 'none'
  };
}

/**
 * Generate passkey authentication options
 */
export function generatePasskeyAuthenticationOptions(): {
  challenge: string;
  timeout: number;
  rpId: string;
  allowCredentials: Array<{ id: string; type: string }>;
} {
  const challenge = generateChallenge();
  
  // Store challenge for verification
  passkeyStore.set(challenge, {
    challenge,
    userHandle: 'admin',
    timestamp: Date.now()
  });
  
  // Get all registered credentials
  const allowCredentials = Array.from(registeredPasskeys.values()).map(passkey => ({
    id: passkey.id,
    type: 'public-key'
  }));
  
  return {
    challenge,
    timeout: ADMIN_CONFIG.PASSKEY_TIMEOUT,
    rpId: ADMIN_CONFIG.PASSKEY_RP_ID,
    allowCredentials
  };
}

/**
 * Verify passkey registration
 */
export function verifyPasskeyRegistration(credential: any, challenge: string): { success: boolean; error?: string } {
  try {
    // Check if challenge exists and is valid
    const storedChallenge = passkeyStore.get(challenge);
    if (!storedChallenge) {
      return { success: false, error: 'Ungültige Challenge' };
    }
    
    // Check if challenge is not expired (5 minutes)
    if (Date.now() - storedChallenge.timestamp > 300000) {
      passkeyStore.delete(challenge);
      return { success: false, error: 'Challenge abgelaufen' };
    }
    
    // Store the passkey (in production, save to database)
    registeredPasskeys.set(credential.id, {
      id: credential.id,
      publicKey: credential.response.publicKey,
      counter: credential.response.authenticatorData?.signCount || 0,
      userHandle: storedChallenge.userHandle,
      createdAt: Date.now()
    });
    
    // Clean up challenge
    passkeyStore.delete(challenge);
    
    return { success: true };
  } catch (error) {
    console.error('Passkey registration error:', error);
    return { success: false, error: 'Registrierung fehlgeschlagen' };
  }
}

/**
 * Verify passkey authentication
 */
export function verifyPasskeyAuthentication(credential: any, challenge: string): { success: boolean; error?: string } {
  try {
    // Check if challenge exists and is valid
    const storedChallenge = passkeyStore.get(challenge);
    if (!storedChallenge) {
      return { success: false, error: 'Ungültige Challenge' };
    }
    
    // Check if challenge is not expired
    if (Date.now() - storedChallenge.timestamp > 300000) {
      passkeyStore.delete(challenge);
      return { success: false, error: 'Challenge abgelaufen' };
    }
    
    // Check if passkey is registered
    const registeredKey = registeredPasskeys.get(credential.id);
    if (!registeredKey) {
      return { success: false, error: 'Passkey nicht registriert' };
    }
    
    // In a real implementation, you would verify the signature here
    // For this demo, we'll accept valid credentials
    
    // Clean up challenge
    passkeyStore.delete(challenge);
    
    return { success: true };
  } catch (error) {
    console.error('Passkey authentication error:', error);
    return { success: false, error: 'Authentifizierung fehlgeschlagen' };
  }
}

/**
 * Check if any passkeys are registered
 */
export function hasRegisteredPasskeys(): boolean {
  return registeredPasskeys.size > 0;
}

/**
 * Get registered passkeys info
 */
export function getRegisteredPasskeysInfo(): Array<{ id: string; createdAt: number }> {
  return Array.from(registeredPasskeys.values()).map(passkey => ({
    id: passkey.id.substring(0, 8) + '...',
    createdAt: passkey.createdAt
  }));
}

/**
 * Delete a passkey
 */
export function deletePasskey(credentialId: string): boolean {
  return registeredPasskeys.delete(credentialId);
}

/**
 * Hash password using built-in crypto
 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + ADMIN_CONFIG.SESSION_SECRET).digest('hex');
}

/**
 * Verify password against hash
 */
function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * Create admin user (for setup)
 */
export function createAdminUser(email: string, password: string): { success: boolean; error?: string } {
  if (!email || !password) {
    return { success: false, error: 'Email und Passwort sind erforderlich' };
  }

  if (password.length < 8) {
    return { success: false, error: 'Passwort muss mindestens 8 Zeichen lang sein' };
  }

  if (adminCredentials.has(email)) {
    return { success: false, error: 'Benutzer existiert bereits' };
  }

  adminCredentials.set(email, {
    email,
    passwordHash: hashPassword(password),
    createdAt: Date.now()
  });

  return { success: true };
}

/**
 * Authenticate with email and password
 */
export function authenticateWithEmailPassword(email: string, password: string): { success: boolean; token?: string; error?: string } {
  const user = adminCredentials.get(email);
  
  if (!user) {
    return { success: false, error: 'Ungültige Anmeldedaten' };
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return { success: false, error: 'Ungültige Anmeldedaten' };
  }

  // Create session token
  const sessionToken = generateSecureToken();
  const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

  activeSessions.set(sessionToken, {
    email,
    createdAt: Date.now(),
    expiresAt
  });

  return { success: true, token: sessionToken };
}

/**
 * Verify session token
 */
export function verifySessionToken(token: string): { valid: boolean; email?: string } {
  console.log('🔍 verifySessionToken aufgerufen mit Token:', token ? token.substring(0, 8) + '...' : 'KEIN TOKEN');
  
  // Lade aktuelle Sessions aus Persistenz
  loadSessions();
  
  const session = activeSessions.get(token);
  console.log('📋 Session aus activeSessions:', session ? 'GEFUNDEN' : 'NICHT GEFUNDEN');
  console.log('📊 Anzahl aktive Sessions:', activeSessions.size);
  
  if (!session) {
    console.log('❌ Session nicht gefunden');
    return { valid: false };
  }

  if (Date.now() > session.expiresAt) {
    console.log('⏰ Session abgelaufen');
    activeSessions.delete(token);
    saveSessions(); // Aktualisiere die persistierten Sessions
    return { valid: false };
  }

  console.log('✅ Session gültig, Email:', session.email);
  return { valid: true, email: session.email };
}

/**
 * Logout (invalidate session)
 */
export function logout(token: string): boolean {
  // Lade aktuelle Sessions aus Persistenz
  loadSessions();
  
  const result = activeSessions.delete(token);
  
  // Aktualisiere die persistierten Sessions
  saveSessions();
  
  return result;
}

/**
 * Check if any admin users exist
 */
export function hasAdminUsers(): boolean {
  return adminCredentials.size > 0;
}

/**
 * Create admin session (used for login)
 */
export function createAdminSession(token: string, expiresAt: number): void {
  console.log('🔧 createAdminSession aufgerufen');
  console.log('🔑 Token:', token ? token.substring(0, 8) + '...' : 'KEIN TOKEN');
  console.log('⏰ Expires At:', new Date(expiresAt).toISOString());
  
  // Lade existierende Sessions vor dem Hinzufügen
  loadSessions();
  
  activeSessions.set(token, {
    email: 'admin', // Use a special identifier for admin sessions
    createdAt: Date.now(),
    expiresAt: expiresAt
  });
  
  // Persistiere Sessions nach dem Hinzufügen
  saveSessions();
  
  console.log('📊 Session gespeichert. Anzahl aktive Sessions:', activeSessions.size);
}

/**
 * Verify if session token is valid for admin access
 */
export function verifyAdminSession(token: string): boolean {
  console.log('🔍 verifyAdminSession aufgerufen mit Token:', token ? token.substring(0, 8) + '...' : 'KEIN TOKEN');
  const session = verifySessionToken(token);
  console.log('📋 Session Validierung Ergebnis:', session);
  const isValidAdmin = session.valid && session.email === 'admin';
  console.log('👤 Admin Session gültig:', isValidAdmin);
  return isValidAdmin;
}
