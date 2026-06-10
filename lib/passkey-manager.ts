import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';

import { getDatabase } from './db';

const RP_NAME = 'SV Puschendorf Turnier-Verwaltung';
const ADMIN_USER_ID = 'admin';
const ADMIN_DISPLAY_NAME = 'SV Puschendorf Administrator';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const challengeStore = new Map<string, {
  timestamp: number;
  type: 'registration' | 'authentication';
}>();

type StoredPasskey = {
  id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports?: string | null;
  active: number;
};

export async function generatePasskeyRegistrationOptions(origin?: string) {
  ensurePasskeyTable();

  const context = getWebAuthnContext(origin);
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: context.rpId,
    userID: new TextEncoder().encode(ADMIN_USER_ID) as Uint8Array<ArrayBuffer>,
    userName: getAdminEmail(),
    userDisplayName: ADMIN_DISPLAY_NAME,
    timeout: 60000,
    attestationType: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'preferred',
      requireResidentKey: false,
      userVerification: 'required',
    },
    excludeCredentials: getExistingCredentials(),
    preferredAuthenticatorType: 'localDevice',
  });

  storeChallenge(options.challenge, 'registration');
  return options;
}

export async function generatePasskeyAuthenticationOptions(origin?: string) {
  ensurePasskeyTable();

  const context = getWebAuthnContext(origin);
  const options = await generateAuthenticationOptions({
    rpID: context.rpId,
    allowCredentials: getExistingCredentials(),
    timeout: 60000,
    userVerification: 'required',
  });

  storeChallenge(options.challenge, 'authentication');
  return options;
}

export async function verifyPasskeyRegistration(
  credential: RegistrationResponseJSON,
  challengeString: string,
  origin?: string
): Promise<{ success: boolean; error?: string; credentialId?: string }> {
  try {
    if (!consumeChallenge(challengeString, 'registration')) {
      return { success: false, error: 'Ungültige oder abgelaufene Challenge' };
    }

    const context = getWebAuthnContext(origin);
    const verification = await verifyRegistrationResponse({
      response: normalizeRegistrationResponse(credential),
      expectedChallenge: challengeString,
      expectedOrigin: context.allowedOrigins,
      expectedRPID: context.rpId,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return { success: false, error: 'Passkey-Registrierung konnte nicht verifiziert werden' };
    }

    const { credential: verifiedCredential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    const db = getDatabase();
    const passkeyId = `pk_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const transports = credential.response.transports || verifiedCredential.transports || [];

    db.prepare(`
      INSERT INTO passkeys (
        id, credential_id, public_key, counter, user_handle, device_name,
        transports, credential_device_type, credential_backed_up
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      passkeyId,
      verifiedCredential.id,
      bytesToBase64Url(verifiedCredential.publicKey),
      verifiedCredential.counter,
      ADMIN_USER_ID,
      'Platform Authenticator',
      JSON.stringify(transports),
      credentialDeviceType,
      credentialBackedUp ? 1 : 0
    );

    return { success: true, credentialId: passkeyId };
  } catch (error) {
    console.error('Passkey registration error:', error);
    return {
      success: false,
      error: 'Registrierung fehlgeschlagen',
    };
  }
}

export async function verifyPasskeyAuthentication(
  credential: AuthenticationResponseJSON,
  challengeString: string,
  origin?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!consumeChallenge(challengeString, 'authentication')) {
      return { success: false, error: 'Ungültige oder abgelaufene Challenge' };
    }

    ensurePasskeyTable();

    const normalizedCredential = normalizeAuthenticationResponse(credential);
    const db = getDatabase();
    const passkey = db.prepare(`
      SELECT * FROM passkeys
      WHERE credential_id = ? AND active = 1
    `).get(normalizedCredential.id) as StoredPasskey | undefined;

    if (!passkey) {
      return { success: false, error: 'Passkey nicht gefunden oder deaktiviert' };
    }

    const context = getWebAuthnContext(origin);
    const verification = await verifyAuthenticationResponse({
      response: normalizedCredential,
      expectedChallenge: challengeString,
      expectedOrigin: context.allowedOrigins,
      expectedRPID: context.rpId,
      requireUserVerification: true,
      credential: {
        id: passkey.credential_id,
        publicKey: base64UrlToBytes(passkey.public_key),
        counter: Number(passkey.counter || 0),
        transports: parseTransports(passkey.transports),
      },
    });

    if (!verification.verified) {
      return { success: false, error: 'Authentifizierung fehlgeschlagen' };
    }

    db.prepare(`
      UPDATE passkeys
      SET last_used = CURRENT_TIMESTAMP,
          counter = ?,
          credential_device_type = ?,
          credential_backed_up = ?
      WHERE id = ?
    `).run(
      verification.authenticationInfo.newCounter,
      verification.authenticationInfo.credentialDeviceType,
      verification.authenticationInfo.credentialBackedUp ? 1 : 0,
      passkey.id
    );

    return { success: true };
  } catch (error) {
    console.error('Passkey authentication error:', error);
    return {
      success: false,
      error: 'Authentifizierung fehlgeschlagen',
    };
  }
}

export function getRegisteredPasskeys() {
  ensurePasskeyTable();

  const db = getDatabase();
  return db.prepare(`
    SELECT id, credential_id, device_name, created_at, last_used, counter
    FROM passkeys
    WHERE active = 1
    ORDER BY created_at DESC
  `).all();
}

export function deletePasskey(passkeyId: string): boolean {
  ensurePasskeyTable();

  const db = getDatabase();
  const result = db.prepare(`
    UPDATE passkeys
    SET active = 0
    WHERE id = ?
  `).run(passkeyId);

  return result.changes > 0;
}

export function hasRegisteredPasskeys(): boolean {
  return getRegisteredPasskeys().length > 0;
}

export function isPasskeySupported(): boolean {
  return false;
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  return false;
}

function ensurePasskeyTable() {
  const db = getDatabase();

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
      device_name TEXT,
      transports TEXT,
      credential_device_type TEXT,
      credential_backed_up INTEGER DEFAULT 0
    )
  `);

  addPasskeyColumnIfMissing('transports', 'transports TEXT');
  addPasskeyColumnIfMissing('credential_device_type', 'credential_device_type TEXT');
  addPasskeyColumnIfMissing('credential_backed_up', 'credential_backed_up INTEGER DEFAULT 0');
}

function addPasskeyColumnIfMissing(columnName: string, columnDefinition: string) {
  const db = getDatabase();
  const columns = db.prepare('PRAGMA table_info(passkeys)').all() as Array<{ name: string }>;

  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE passkeys ADD COLUMN ${columnDefinition}`);
  }
}

function getExistingCredentials() {
  ensurePasskeyTable();

  const db = getDatabase();
  const credentials = db.prepare(`
    SELECT credential_id, transports FROM passkeys WHERE active = 1
  `).all() as Array<{ credential_id: string; transports?: string | null }>;

  return credentials.map((credential) => ({
    id: credential.credential_id,
    transports: parseTransports(credential.transports),
  }));
}

function storeChallenge(challenge: string, type: 'registration' | 'authentication') {
  cleanExpiredChallenges();
  challengeStore.set(challenge, { timestamp: Date.now(), type });
}

function consumeChallenge(challenge: string, type: 'registration' | 'authentication') {
  cleanExpiredChallenges();
  const stored = challengeStore.get(challenge);

  if (!stored || stored.type !== type) {
    return false;
  }

  challengeStore.delete(challenge);
  return Date.now() - stored.timestamp <= CHALLENGE_TTL_MS;
}

function cleanExpiredChallenges() {
  const now = Date.now();

  for (const [challenge, stored] of challengeStore.entries()) {
    if (now - stored.timestamp > CHALLENGE_TTL_MS) {
      challengeStore.delete(challenge);
    }
  }
}

function getWebAuthnContext(origin?: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  const fallbackOrigin = origin || 'http://localhost:3000';
  const appUrl = parseUrl(configuredUrl || fallbackOrigin);
  const requestUrl = parseUrl(origin || appUrl.origin);
  const rpId = appUrl.hostname || requestUrl.hostname || 'localhost';
  const allowedOrigins = Array.from(new Set([appUrl.origin, requestUrl.origin].filter(Boolean)));

  return { rpId, allowedOrigins };
}

function parseUrl(value: string) {
  try {
    return new URL(value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`);
  } catch {
    return new URL('http://localhost:3000');
  }
}

function getAdminEmail() {
  return process.env.ADMIN_EMAIL || 'admin@sv-puschendorf.de';
}

function normalizeRegistrationResponse(credential: RegistrationResponseJSON): RegistrationResponseJSON {
  return {
    ...credential,
    id: toBase64Url(credential.id),
    rawId: toBase64Url(credential.rawId),
    response: {
      ...credential.response,
      attestationObject: toBase64Url(credential.response.attestationObject),
      clientDataJSON: toBase64Url(credential.response.clientDataJSON),
      authenticatorData: credential.response.authenticatorData
        ? toBase64Url(credential.response.authenticatorData)
        : undefined,
      publicKey: credential.response.publicKey ? toBase64Url(credential.response.publicKey) : undefined,
    },
    clientExtensionResults: credential.clientExtensionResults || {},
    type: 'public-key',
  };
}

function normalizeAuthenticationResponse(credential: AuthenticationResponseJSON): AuthenticationResponseJSON {
  return {
    ...credential,
    id: toBase64Url(credential.id),
    rawId: toBase64Url(credential.rawId),
    response: {
      ...credential.response,
      authenticatorData: toBase64Url(credential.response.authenticatorData),
      clientDataJSON: toBase64Url(credential.response.clientDataJSON),
      signature: toBase64Url(credential.response.signature),
      userHandle: credential.response.userHandle ? toBase64Url(credential.response.userHandle) : undefined,
    },
    clientExtensionResults: credential.clientExtensionResults || {},
    type: 'public-key',
  };
}

function toBase64Url(value: string) {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function bytesToBase64Url(value: Uint8Array) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlToBytes(value: string) {
  return new Uint8Array(Buffer.from(value, 'base64url'));
}

function parseTransports(value?: string | null): AuthenticatorTransportFuture[] | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
