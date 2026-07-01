import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

async function source(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

test('registration flow respects the public toggle, validation, costs, email toggle and schedule regeneration hook', async () => {
  const route = await source('app/api/anmeldungen/route.ts');
  const page = await source('app/anmeldung/page.tsx');

  assert.match(route, /settings\.anmeldungAktiv === false/);
  assert.match(route, /registrationRequestSchema\.safeParse/);
  assert.match(route, /calculateRegistrationCost\(registration\.teams\)/);
  assert.match(route, /settings\.automatischeEmails !== false/);
  assert.match(route, /regenerateSpielplanAfterRegistration\(\)/);
  assert.match(page, /result\.emailSent/);
});

test('login flow keeps rate limiting, credential checks and session creation', async () => {
  const route = await source('app/api/auth/login/route.ts');
  const session = await source('lib/session.ts');

  assert.match(route, /MAX_LOGIN_ATTEMPTS\s*=\s*5/);
  assert.match(route, /checkLoginRateLimit/);
  assert.match(route, /verifyCredentials\(identifier, password\)/);
  assert.match(route, /createSession\(identifier\)/);
  assert.match(session, /bcrypt\.compareSync/);
});

test('middleware only imports edge-safe session token helpers', async () => {
  const middleware = await source('middleware.ts');
  const sessionToken = await source('lib/session-token.ts');

  assert.match(middleware, /@\/lib\/session-token/);
  assert.doesNotMatch(middleware, /@\/lib\/session['"]/);
  assert.match(sessionToken, /jwtVerify/);
  assert.match(sessionToken, /SignJWT/);
});

test('schedule generation, publication and public visibility are preserved', async () => {
  const scheduleRoute = await source('app/api/spielplan/route.ts');
  const publicRoute = await source('app/api/spielplan/get/route.ts');
  const generator = await source('lib/spielplan-generator.ts');

  assert.match(scheduleRoute, /validActions = new Set\(\['deleteAll', 'generate', 'create', 'update', 'delete', 'publish', 'unpublish'\]\)/);
  assert.match(scheduleRoute, /generateSpielplan\(/);
  assert.match(scheduleRoute, /setSpielplanPublicationStatus\('published'\)/);
  assert.match(publicRoute, /settings\.spielplanStatus === 'published'/);
  assert.match(publicRoute, /hideInternalScoresForPublic/);
  assert.match(generator, /feld: slot\.feld\.name/);
});

test('result saving and public score visibility remain guarded', async () => {
  const resultRoute = await source('app/api/admin/ergebnisse/route.ts');
  const resultsPage = await source('app/ergebnisse/page.tsx');
  const scheduleGet = await source('app/api/spielplan/get/route.ts');

  assert.match(resultRoute, /verifyApiAuth/);
  assert.match(resultRoute, /tore_team1/);
  assert.match(resultRoute, /tore_team2/);
  assert.match(resultRoute, /notifySpielplanChanged/);
  assert.match(resultsPage, /areScoresPublicForDate\(settings, spiel\.datum\)/);
  assert.match(scheduleGet, /areScoresPublicForDate/);
});

test('helper link flow is still authenticated and backed by public token routes', async () => {
  const helperRoute = await source('app/api/helfer/route.ts');
  const publicHelperRoute = await source('app/api/helfer/public/[token]/route.ts');

  assert.match(helperRoute, /verifyApiAuth/);
  assert.match(helperRoute, /case 'generate_link'/);
  assert.match(helperRoute, /generateHelferLink/);
  assert.match(publicHelperRoute, /validateHelferToken/);
  assert.match(publicHelperRoute, /getActiveHelferBedarf/);
  assert.match(publicHelperRoute, /createHelferAnmeldung/);
});

test('production-only diagnostics are hidden and test data writers cannot run in production', async () => {
  const debugAuth = await source('app/api/debug/auth/route.ts');
  const debugEnv = await source('app/api/debug/env/route.ts');
  const keyCheck = await source('app/api/debug/key-check/route.ts');
  const protectedExample = await source('app/api/protected-example/route.ts');
  const fieldTest = await source('app/api/test-feld-zuordnungen/route.ts');
  const debugPage = await source('app/debug/auth/page.tsx');

  for (const file of [debugAuth, debugEnv, keyCheck, protectedExample, fieldTest]) {
    assert.match(file, /process\.env\.NODE_ENV !== 'development'/);
    assert.match(file, /status:\s*404/);
  }

  assert.match(debugPage, /notFound\(\)/);
  assert.match(fieldTest, /saveFeldJahrgangZuordnung/);
});

test('backup and restore are available through authenticated admin API and visible settings UI', async () => {
  const db = await source('lib/db.ts');
  const route = await source('app/api/admin/backups/route.ts');
  const settingsPanel = await source('app/admin/_components/settings-panel.tsx');

  assert.match(db, /ensureDailyDatabaseBackup/);
  assert.match(db, /createDatabaseBackup/);
  assert.match(db, /restoreDatabaseFromBuffer/);
  assert.match(db, /PRAGMA integrity_check/);
  assert.match(route, /verifyApiAuth/);
  assert.match(route, /Content-Disposition/);
  assert.match(settingsPanel, /Backups und Wiederherstellung/);
  assert.match(settingsPanel, /onDownloadBackup/);
  assert.match(settingsPanel, /onRestoreBackup/);
});
