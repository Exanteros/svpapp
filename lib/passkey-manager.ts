/**
 * Modern Passkey Management with Touch ID/WebAuthn Support
 * SV Puschendorf Turnier-Verwaltung
 */

import { getDatabase } from './db';

// WebAuthn Configuration
const WEBAUTHN_CONFIG = {
  rpId: process.env.NEXT_PUBLIC_APP_URL?.replace(/https?:\/\//, '') || 'localhost',
  rpName: 'SV Puschendorf Turnier-Verwaltung',
  timeout: 60000,
  userVerification: 'preferred' as const,
  authenticatorSelection: {
    authenticatorAttachment: 'platform' as const, // Touch ID/Face ID
    userVerification: 'preferred' as const,
    residentKey: 'preferred' as const,
    requireResidentKey: false
  }
};

// Challenge storage (in production: Redis/Database)
const challengeStore = new Map<string, {
  challenge: string;
  timestamp: number;
  type: 'registration' | 'authentication';
}>();

/**
 * Generate a cryptographically secure challenge
 */
export function generateChallenge(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate WebAuthn registration options for Touch ID
 */
export function generatePasskeyRegistrationOptions() {
  const challenge = generateChallenge();
  
  // Store challenge
  challengeStore.set(challenge, {
    challenge,
    timestamp: Date.now(),
    type: 'registration'
  });
  
  return {
    rp: {
      id: WEBAUTHN_CONFIG.rpId,
      name: WEBAUTHN_CONFIG.rpName
    },
    user: {
      id: new TextEncoder().encode('admin'),
      name: 'admin@sv-puschendorf.de',
      displayName: 'SV Puschendorf Administrator'
    },
    challenge: new TextEncoder().encode(challenge),
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },   // ES256 (recommended)
      { alg: -257, type: 'public-key' }  // RS256 (fallback)
    ],
    timeout: WEBAUTHN_CONFIG.timeout,
    attestation: 'none' as const,
    authenticatorSelection: WEBAUTHN_CONFIG.authenticatorSelection,
    excludeCredentials: getExistingCredentials()
  };
}

/**
 * Generate WebAuthn authentication options
 */
export function generatePasskeyAuthenticationOptions() {
  const challenge = generateChallenge();
  
  // Store challenge
  challengeStore.set(challenge, {
    challenge,
    timestamp: Date.now(),
    type: 'authentication'
  });
  
  return {
    challenge: new TextEncoder().encode(challenge),
    timeout: WEBAUTHN_CONFIG.timeout,
    rpId: WEBAUTHN_CONFIG.rpId,
    allowCredentials: getExistingCredentials(),
    userVerification: WEBAUTHN_CONFIG.userVerification
  };
}

/**
 * Get existing credentials from database
 */
function getExistingCredentials() {
  try {
    const db = getDatabase();
    const credentials = db.prepare(`
      SELECT credential_id FROM passkeys WHERE active = 1
    `).all() as { credential_id: string }[];
    
    return credentials.map(cred => ({
      id: Uint8Array.from(atob(cred.credential_id), c => c.charCodeAt(0)),
      type: 'public-key' as const
    }));
  } catch (error) {
    console.error('Error getting existing credentials:', error);
    return [];
  }
}

/**
 * Verify passkey registration
 */
export function verifyPasskeyRegistration(
  credential: PublicKeyCredential, 
  challengeString: string
): { success: boolean; error?: string; credentialId?: string } {
  try {
    // Verify challenge
    const storedChallenge = challengeStore.get(challengeString);
    if (!storedChallenge || storedChallenge.type !== 'registration') {
      return { success: false, error: 'Ungültige oder abgelaufene Challenge' };
    }
    
    // Check expiration (5 minutes)
    if (Date.now() - storedChallenge.timestamp > 300000) {
      challengeStore.delete(challengeString);
      return { success: false, error: 'Challenge abgelaufen' };
    }
    
    // Basic validation
    if (!credential.response || !credential.rawId) {
      return { success: false, error: 'Ungültige Credential-Daten' };
    }
    
    // Store in database
    const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
    const publicKey = btoa(String.fromCharCode(...new Uint8Array(
      (credential.response as AuthenticatorAttestationResponse).getPublicKey() || new ArrayBuffer(0)
    )));
    
    const db = getDatabase();
    
    // Create passkeys table if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS passkeys (
        id TEXT PRIMARY KEY,
        credential_id TEXT UNIQUE NOT NULL,
        public_key TEXT NOT NULL,
        counter INTEGER DEFAULT 0,
        user_handle TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used DATETIME,
        active BOOLEAN DEFAULT 1,
        device_name TEXT
      )
    `);
    
    const insertPasskey = db.prepare(`
      INSERT INTO passkeys (
        id, credential_id, public_key, user_handle, device_name
      ) VALUES (?, ?, ?, ?, ?)
    `);
    
    const passkeyId = `pk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const deviceName = getDeviceName();
    
    insertPasskey.run(
      passkeyId,
      credentialId,
      publicKey,
      'admin',
      deviceName
    );
    
    // Clean up challenge
    challengeStore.delete(challengeString);
    
    return { 
      success: true, 
      credentialId: passkeyId 
    };
    
  } catch (error) {
    console.error('Passkey registration error:', error);
    return { 
      success: false, 
      error: 'Registrierung fehlgeschlagen: ' + (error as Error).message 
    };
  }
}

/**
 * Verify passkey authentication
 */
export function verifyPasskeyAuthentication(
  credential: PublicKeyCredential,
  challengeString: string
): { success: boolean; error?: string } {
  try {
    // Verify challenge
    const storedChallenge = challengeStore.get(challengeString);
    if (!storedChallenge || storedChallenge.type !== 'authentication') {
      return { success: false, error: 'Ungültige oder abgelaufene Challenge' };
    }
    
    // Check expiration
    if (Date.now() - storedChallenge.timestamp > 300000) {
      challengeStore.delete(challengeString);
      return { success: false, error: 'Challenge abgelaufen' };
    }
    
    // Find credential in database
    const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
    const db = getDatabase();
    
    const passkey = db.prepare(`
      SELECT * FROM passkeys 
      WHERE credential_id = ? AND active = 1
    `).get(credentialId) as any;
    
    if (!passkey) {
      return { success: false, error: 'Passkey nicht gefunden oder deaktiviert' };
    }
    
    // Update last used timestamp
    db.prepare(`
      UPDATE passkeys 
      SET last_used = CURRENT_TIMESTAMP, counter = counter + 1
      WHERE id = ?
    `).run(passkey.id);
    
    // Clean up challenge
    challengeStore.delete(challengeString);
    
    return { success: true };
    
  } catch (error) {
    console.error('Passkey authentication error:', error);
    return { 
      success: false, 
      error: 'Authentifizierung fehlgeschlagen: ' + (error as Error).message 
    };
  }
}

/**
 * Get device name for better UX
 */
function getDeviceName(): string {
  if (typeof navigator !== 'undefined') {
    const platform = (navigator as any).userAgentData?.platform || navigator.platform;
    
    if (platform.includes('Mac')) return 'Mac';
    if (platform.includes('iPhone')) return 'iPhone';
    if (platform.includes('iPad')) return 'iPad';
    if (platform.includes('Win')) return 'Windows';
    if (platform.includes('Android')) return 'Android';
    
    return 'Unbekanntes Gerät';
  }
  
  return 'Server';
}

/**
 * Check if passkeys are supported
 */
export function isPasskeySupported(): boolean {
  if (typeof window === 'undefined') return false;
  
  return !!(
    window.PublicKeyCredential &&
    window.navigator.credentials &&
    typeof window.navigator.credentials.create === 'function' &&
    typeof window.navigator.credentials.get === 'function'
  );
}

/**
 * Check if platform authenticator (Touch ID/Face ID) is available
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isPasskeySupported()) return false;
  
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Get all registered passkeys for admin
 */
export function getRegisteredPasskeys() {
  try {
    const db = getDatabase();
    
    // Ensure table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS passkeys (
        id TEXT PRIMARY KEY,
        credential_id TEXT UNIQUE NOT NULL,
        public_key TEXT NOT NULL,
        counter INTEGER DEFAULT 0,
        user_handle TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used DATETIME,
        active BOOLEAN DEFAULT 1,
        device_name TEXT
      )
    `);
    
    return db.prepare(`
      SELECT id, credential_id, device_name, created_at, last_used, counter
      FROM passkeys 
      WHERE active = 1
      ORDER BY created_at DESC
    `).all();
  } catch (error) {
    console.error('Error getting passkeys:', error);
    return [];
  }
}

/**
 * Delete a passkey
 */
export function deletePasskey(passkeyId: string): boolean {
  try {
    const db = getDatabase();
    const result = db.prepare(`
      UPDATE passkeys 
      SET active = 0 
      WHERE id = ?
    `).run(passkeyId);
    
    return result.changes > 0;
  } catch (error) {
    console.error('Error deleting passkey:', error);
    return false;
  }
}

/**
 * Check if any passkeys are registered
 */
export function hasRegisteredPasskeys(): boolean {
  return getRegisteredPasskeys().length > 0;
}
