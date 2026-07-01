import { randomBytes } from 'node:crypto';
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
const PRIMARY_ADMIN_ID = 'admin';
const PRIMARY_ADMIN_NAME = 'Ursprünglicher Admin';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const challengeStore = new Map<string, {
  timestamp: number;
  type: 'registration' | 'authentication';
  userId?: string;
  inviteToken?: string;
}>();

type StoredPasskey = {
  id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports?: string | null;
  active: number;
  user_handle: string;
  user_email?: string;
  user_name?: string;
};

type AdminUser = {
  id: string;
  email: string;
  name: string;
  auth_method: 'password' | 'passkey';
  active: number;
  invite_token?: string | null;
  invite_expires_at?: string | null;
  invite_accepted_at?: string | null;
  created_at: string;
  updated_at: string;
  last_login?: string | null;
};

export async function generatePasskeyRegistrationOptions(origin?: string, userId = PRIMARY_ADMIN_ID) {
  ensurePasskeyStorage();
  const admin = getAdminUserById(userId);

  if (!admin || !admin.active) {
    throw new Error('Admin nicht gefunden oder deaktiviert');
  }

  const context = getWebAuthnContext(origin);
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: context.rpId,
    userID: new TextEncoder().encode(admin.id) as Uint8Array<ArrayBuffer>,
    userName: admin.email,
    userDisplayName: admin.name,
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

  storeChallenge(options.challenge, 'registration', { userId: admin.id });
  return options;
}

export async function generateInviteRegistrationOptions(inviteToken: string, origin?: string) {
  ensurePasskeyStorage();
  const admin = getAdminUserByInviteToken(inviteToken);

  if (!admin) {
    throw new Error('Einladungslink ist ungültig oder abgelaufen');
  }

  const context = getWebAuthnContext(origin);
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: context.rpId,
    userID: new TextEncoder().encode(admin.id) as Uint8Array<ArrayBuffer>,
    userName: admin.email,
    userDisplayName: admin.name,
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

  storeChallenge(options.challenge, 'registration', { userId: admin.id, inviteToken });
  return options;
}

export async function generatePasskeyAuthenticationOptions(origin?: string) {
  ensurePasskeyStorage();

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
    const challenge = consumeChallenge(challengeString, 'registration');

    if (!challenge?.userId) {
      return { success: false, error: 'Ungültige oder abgelaufene Challenge' };
    }

    const admin = challenge.inviteToken
      ? getAdminUserByInviteToken(challenge.inviteToken)
      : getAdminUserById(challenge.userId);

    if (!admin || admin.id !== challenge.userId || !admin.active) {
      return { success: false, error: 'Admin-Einladung ist ungültig oder abgelaufen' };
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
      admin.id,
      'Platform Authenticator',
      JSON.stringify(transports),
      credentialDeviceType,
      credentialBackedUp ? 1 : 0
    );

    if (challenge.inviteToken) {
      db.prepare(`
        UPDATE admin_users
        SET invite_token = NULL,
            invite_expires_at = NULL,
            invite_accepted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(admin.id);
    }

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
): Promise<{ success: boolean; error?: string; user?: { id: string; email: string; name: string } }> {
  try {
    if (!consumeChallenge(challengeString, 'authentication')) {
      return { success: false, error: 'Ungültige oder abgelaufene Challenge' };
    }

    ensurePasskeyStorage();

    const normalizedCredential = normalizeAuthenticationResponse(credential);
    const db = getDatabase();
    const passkey = db.prepare(`
      SELECT
        passkeys.*,
        admin_users.email AS user_email,
        admin_users.name AS user_name
      FROM passkeys
      INNER JOIN admin_users ON admin_users.id = passkeys.user_handle
      WHERE passkeys.credential_id = ?
        AND passkeys.active = 1
        AND admin_users.active = 1
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

    db.prepare(`
      UPDATE admin_users
      SET last_login = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(passkey.user_handle);

    return {
      success: true,
      user: {
        id: passkey.user_handle,
        email: passkey.user_email || getAdminEmail(),
        name: passkey.user_name || passkey.user_email || 'Admin',
      },
    };
  } catch (error) {
    console.error('Passkey authentication error:', error);
    return {
      success: false,
      error: 'Authentifizierung fehlgeschlagen',
    };
  }
}

export function getRegisteredPasskeys() {
  ensurePasskeyStorage();

  const db = getDatabase();
  return db.prepare(`
    SELECT
      passkeys.id,
      passkeys.credential_id,
      passkeys.device_name,
      passkeys.created_at,
      passkeys.last_used,
      passkeys.counter,
      passkeys.user_handle,
      admin_users.email AS user_email,
      admin_users.name AS user_name
    FROM passkeys
    LEFT JOIN admin_users ON admin_users.id = passkeys.user_handle
    WHERE passkeys.active = 1
    ORDER BY passkeys.created_at DESC
  `).all();
}

export function deletePasskey(passkeyId: string): boolean {
  ensurePasskeyStorage();

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

export function createAdminInvite(input: { email: string; name?: string }, origin: string, createdBy?: string) {
  ensurePasskeyStorage();
  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || email;

  if (!email || !email.includes('@')) {
    throw new Error('Bitte eine gültige E-Mail-Adresse eingeben');
  }

  const db = getDatabase();
  const existing = db.prepare(`
    SELECT * FROM admin_users WHERE email = ?
  `).get(email) as AdminUser | undefined;

  if (existing?.auth_method === 'password') {
    throw new Error('Der ursprüngliche Passwort-Admin kann nicht überschrieben werden');
  }

  const adminId = existing?.id || `adm_${crypto.randomUUID()}`;
  const inviteToken = createInviteToken();
  const inviteExpiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  if (existing) {
    db.prepare(`
      UPDATE admin_users
      SET name = ?,
          active = 1,
          invite_token = ?,
          invite_expires_at = ?,
          invite_accepted_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, inviteToken, inviteExpiresAt, adminId);
  } else {
    db.prepare(`
      INSERT INTO admin_users (
        id, email, name, auth_method, active, invite_token,
        invite_expires_at, created_by
      ) VALUES (?, ?, ?, 'passkey', 1, ?, ?, ?)
    `).run(adminId, email, name, inviteToken, inviteExpiresAt, createdBy || PRIMARY_ADMIN_ID);
  }

  return {
    id: adminId,
    email,
    name,
    inviteUrl: createInviteUrl(origin, inviteToken),
    inviteExpiresAt,
  };
}

export function listAdminUsers(origin: string) {
  ensurePasskeyStorage();

  const db = getDatabase();
  const users = db.prepare(`
    SELECT
      admin_users.*,
      COUNT(passkeys.id) AS passkey_count,
      MAX(passkeys.last_used) AS passkey_last_used
    FROM admin_users
    LEFT JOIN passkeys ON passkeys.user_handle = admin_users.id AND passkeys.active = 1
    GROUP BY admin_users.id
    ORDER BY
      CASE admin_users.id WHEN ? THEN 0 ELSE 1 END,
      admin_users.created_at ASC
  `).all(PRIMARY_ADMIN_ID) as Array<AdminUser & { passkey_count: number; passkey_last_used?: string | null }>;

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    authMethod: user.auth_method,
    active: Boolean(user.active),
    createdAt: user.created_at,
    lastLogin: user.last_login,
    passkeyCount: Number(user.passkey_count || 0),
    passkeyLastUsed: user.passkey_last_used,
    inviteExpiresAt: user.invite_expires_at,
    inviteAcceptedAt: user.invite_accepted_at,
    inviteUrl: isInviteUsable(user) && user.invite_token
      ? createInviteUrl(origin, user.invite_token)
      : null,
  }));
}

export function deactivateAdminUser(adminId: string) {
  ensurePasskeyStorage();

  if (adminId === PRIMARY_ADMIN_ID) {
    throw new Error('Der ursprüngliche Admin kann nicht deaktiviert werden');
  }

  const db = getDatabase();
  const result = db.prepare(`
    UPDATE admin_users
    SET active = 0,
        invite_token = NULL,
        invite_expires_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(adminId);

  db.prepare(`
    UPDATE passkeys
    SET active = 0
    WHERE user_handle = ?
  `).run(adminId);

  return result.changes > 0;
}

export function deleteAdminUser(adminId: string) {
  ensurePasskeyStorage();

  if (adminId === PRIMARY_ADMIN_ID) {
    throw new Error('Der ursprüngliche Admin kann nicht gelöscht werden');
  }

  const db = getDatabase();

  db.prepare(`
    DELETE FROM passkeys
    WHERE user_handle = ?
  `).run(adminId);

  const result = db.prepare(`
    DELETE FROM admin_users
    WHERE id = ?
      AND auth_method = 'passkey'
  `).run(adminId);

  return result.changes > 0;
}

export function isAdminUserActive(adminId: string) {
  ensurePasskeyStorage();

  const admin = getAdminUserById(adminId);
  return Boolean(admin?.active);
}

export function regenerateAdminInvite(adminId: string, origin: string) {
  ensurePasskeyStorage();

  if (adminId === PRIMARY_ADMIN_ID) {
    throw new Error('Der ursprüngliche Admin nutzt Passwort-Login');
  }

  const db = getDatabase();
  const admin = getAdminUserById(adminId);

  if (!admin) {
    throw new Error('Admin nicht gefunden');
  }

  const inviteToken = createInviteToken();
  const inviteExpiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  db.prepare(`
    UPDATE admin_users
    SET active = 1,
        invite_token = ?,
        invite_expires_at = ?,
        invite_accepted_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(inviteToken, inviteExpiresAt, adminId);

  return {
    id: adminId,
    email: admin.email,
    name: admin.name,
    inviteUrl: createInviteUrl(origin, inviteToken),
    inviteExpiresAt,
  };
}

export function getOrCreateAdminInvite(adminId: string, origin: string) {
  ensurePasskeyStorage();

  if (adminId === PRIMARY_ADMIN_ID) {
    throw new Error('Der ursprüngliche Admin nutzt Passwort-Login');
  }

  const admin = getAdminUserById(adminId);

  if (!admin) {
    throw new Error('Admin nicht gefunden');
  }

  if (isInviteUsable(admin) && admin.invite_token && admin.invite_expires_at) {
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      inviteUrl: createInviteUrl(origin, admin.invite_token),
      inviteExpiresAt: admin.invite_expires_at,
    };
  }

  return regenerateAdminInvite(adminId, origin);
}

export function getAdminInviteInfo(inviteToken: string) {
  ensurePasskeyStorage();
  const admin = getAdminUserByInviteToken(inviteToken);

  if (!admin) {
    return null;
  }

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    inviteExpiresAt: admin.invite_expires_at,
  };
}

export function isPasskeySupported(): boolean {
  return false;
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  return false;
}

function ensurePasskeyStorage() {
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      auth_method TEXT NOT NULL DEFAULT 'passkey',
      active INTEGER NOT NULL DEFAULT 1,
      invite_token TEXT UNIQUE,
      invite_expires_at TEXT,
      invite_accepted_at TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT
    )
  `);

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
  ensurePrimaryAdminUser();
}

function addPasskeyColumnIfMissing(columnName: string, columnDefinition: string) {
  const db = getDatabase();
  const columns = db.prepare('PRAGMA table_info(passkeys)').all() as Array<{ name: string }>;

  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE passkeys ADD COLUMN ${columnDefinition}`);
  }
}

function getExistingCredentials() {
  ensurePasskeyStorage();

  const db = getDatabase();
  const credentials = db.prepare(`
    SELECT credential_id, transports FROM passkeys WHERE active = 1
  `).all() as Array<{ credential_id: string; transports?: string | null }>;

  return credentials.map((credential) => ({
    id: credential.credential_id,
    transports: parseTransports(credential.transports),
  }));
}

function getAdminUserById(adminId: string) {
  ensurePasskeyStorage();

  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM admin_users WHERE id = ?
  `).get(adminId) as AdminUser | undefined;
}

function getAdminUserByInviteToken(inviteToken: string) {
  ensurePasskeyStorage();

  if (!inviteToken) {
    return null;
  }

  const db = getDatabase();
  const admin = db.prepare(`
    SELECT * FROM admin_users
    WHERE invite_token = ?
      AND active = 1
      AND invite_accepted_at IS NULL
  `).get(inviteToken) as AdminUser | undefined;

  if (!admin || !isInviteUsable(admin)) {
    return null;
  }

  return admin;
}

function ensurePrimaryAdminUser() {
  const db = getDatabase();
  const adminEmail = getAdminEmail();

  db.prepare(`
    INSERT OR IGNORE INTO admin_users (
      id, email, name, auth_method, active, invite_accepted_at
    ) VALUES (?, ?, ?, 'password', 1, CURRENT_TIMESTAMP)
  `).run(PRIMARY_ADMIN_ID, adminEmail, PRIMARY_ADMIN_NAME);

  db.prepare(`
    UPDATE admin_users
    SET email = ?,
        name = ?,
        auth_method = 'password',
        active = 1,
        invite_token = NULL,
        invite_expires_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(adminEmail, PRIMARY_ADMIN_NAME, PRIMARY_ADMIN_ID);
}

function isInviteUsable(admin: Pick<AdminUser, 'active' | 'invite_token' | 'invite_expires_at' | 'invite_accepted_at'>) {
  if (!admin.active || !admin.invite_token || admin.invite_accepted_at) {
    return false;
  }

  const expiresAt = admin.invite_expires_at ? Date.parse(admin.invite_expires_at) : Number.NaN;
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function createInviteToken() {
  return randomBytes(32).toString('base64url');
}

function createInviteUrl(origin: string, inviteToken: string) {
  return `${origin.replace(/\/$/, '')}/admin/passkey-invite/${inviteToken}`;
}

function storeChallenge(
  challenge: string,
  type: 'registration' | 'authentication',
  details: { userId?: string; inviteToken?: string } = {}
) {
  cleanExpiredChallenges();
  challengeStore.set(challenge, { timestamp: Date.now(), type, ...details });
}

function consumeChallenge(challenge: string, type: 'registration' | 'authentication') {
  cleanExpiredChallenges();
  const stored = challengeStore.get(challenge);

  if (!stored || stored.type !== type) {
    return null;
  }

  challengeStore.delete(challenge);
  return Date.now() - stored.timestamp <= CHALLENGE_TTL_MS ? stored : null;
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
