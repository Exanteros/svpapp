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
  const scheduleBackupRoute = await source('app/api/spielplan/backup/route.ts');
  const fieldSettingsRoute = await source('app/api/admin/feld-settings/route.ts');
  const publicRoute = await source('app/api/spielplan/get/route.ts');
  const generator = await source('lib/spielplan-generator.ts');
  const tournament = await source('lib/tournament.ts');
  const db = await source('lib/db.ts');
  const adminPage = await source('app/admin/page.tsx');
  const adminApi = await source('app/admin/_components/admin-api.ts');
  const adminTypes = await source('app/admin/_components/types.ts');
  const liveRoute = await source('app/api/spielplan/live/route.ts');
  const schedulePanel = await source('app/admin/_components/schedule-panel.tsx');
  const scheduleDragBoard = await source('app/admin/_components/schedule-drag-board.tsx');

  assert.match(scheduleRoute, /validActions = new Set\(\['deleteAll', 'generate', 'assignReferees', 'create', 'update', 'delete', 'publish', 'unpublish'\]\)/);
  assert.match(scheduleRoute, /generateSpielplan\(/);
  assert.match(scheduleRoute, /assignSchiedsrichterToExistingSpielplan/);
  assert.match(scheduleRoute, /setSpielplanPublicationStatus\('published'\)/);
  assert.match(publicRoute, /settings\.spielplanStatus === 'published'/);
  assert.match(publicRoute, /hideInternalScoresForPublic/);
  assert.match(publicRoute, /schiedsrichterAnzeigeAktiv/);
  assert.match(publicRoute, /hideReferees/);
  assert.match(publicRoute, /normalizeSpielplanZeitbloecke/);
  assert.match(publicRoute, /spielplanZeitbloecke/);
  assert.match(generator, /feld: slot\.feld\.name/);
  assert.match(generator, /requestStartsOnKickoffGrid/);
  assert.match(generator, /restMinutes >= pauseMinutes/);
  assert.match(generator, /getPublicNameRestScore/);
  assert.doesNotMatch(generator, /publicNamesAvoidImmediateFollowUp/);
  assert.match(generator, /normalizeClubName\(team1\.club\) === normalizeClubName\(team2\.club\)/);
  assert.match(generator, /sameClub: false/);
  assert.doesNotMatch(generator, /sameClubRequests/);
  assert.match(generator, /normalizeSpielplanTimingProfil/);
  assert.match(generator, /getDynamicSpielplanTimingProfiles/);
  assert.match(generator, /applySpielplanTimingOverrides/);
  assert.match(generator, /assignSchiedsrichterToExistingSpielplan/);
  assert.match(generator, /updateSpiel\(spiel\.id, \{ schiedsrichter: spiel\.schiedsrichter \?\? null \}\)/);
  assert.match(tournament, /getDynamicSpielplanTimingProfiles/);
  assert.match(tournament, /normalizeSpielplanTimingOverrides/);
  assert.match(tournament, /applySpielplanTimingOverrides/);
  assert.match(tournament, /getDuplicateFeldnamen/);
  assert.match(tournament, /capacityMinutes/);
  assert.match(db, /spielplan_timing_overrides/);
  assert.match(db, /schiedsrichter/);
  assert.match(db, /schiedsrichterAnzeigeAktiv/);
  assert.match(db, /schiedsrichter_anzeige_aktiv/);
  assert.match(db, /replaceSpielplanFromSnapshot/);
  assert.match(scheduleBackupRoute, /svp-spielplan-snapshot/);
  assert.match(scheduleBackupRoute, /replaceSpielplanFromSnapshot/);
  assert.match(scheduleBackupRoute, /notifySpielplanChanged\(\{ reason: 'schedule-import' \}\)/);
  assert.match(adminPage, /assignSpielplanReferees/);
  assert.match(adminPage, /exportSpielplanSnapshot/);
  assert.match(adminPage, /importSpielplanSnapshot/);
  assert.match(adminApi, /\/api\/spielplan\/backup/);
  assert.match(schedulePanel, /Schiris zuweisen/);
  assert.match(schedulePanel, /Schiri-Anzeige/);
  assert.match(schedulePanel, /onSettingsPatch\(\{ schiedsrichterAnzeigeAktiv: Boolean\(checked\) \}\)/);
  assert.match(schedulePanel, /Exportieren/);
  assert.match(schedulePanel, /Importieren/);
  assert.match(adminTypes, /schiedsrichterAnzeigeAktiv: boolean/);
  assert.match(db, /updateSpielFeldnamen/);
  assert.match(fieldSettingsRoute, /getFieldRenames/);
  assert.match(fieldSettingsRoute, /duplicateFeldnamen/);
  assert.match(fieldSettingsRoute, /updateSpielFeldnamen/);
  assert.match(fieldSettingsRoute, /notifySpielplanChanged/);
  assert.match(adminPage, /renameSpielFields/);
  assert.match(liveRoute, /applySpielplanTimingOverrides/);
  assert.match(schedulePanel, /Spielzeit-Vorschlag auswählen/);
  assert.match(schedulePanel, /Spielzeiten feinjustieren/);
  assert.match(schedulePanel, /Spielzeiten speichern & generieren/);
  assert.match(schedulePanel, /Feldnamen doppelt/);
  assert.match(schedulePanel, /getDuplicateFeldnamen/);
  assert.match(schedulePanel, /dynamicTimingProfiles/);
  assert.match(schedulePanel, /draftTimingOverrides/);
  assert.doesNotMatch(schedulePanel, /SPIELPLAN_TIMING_PROFILES/);
  assert.match(scheduleDragBoard, /ScheduleTimeGrid/);
  assert.match(scheduleDragBoard, /gridTemplateColumns/);
  assert.match(scheduleDragBoard, /gridTemplateRows/);
  assert.match(scheduleDragBoard, /timeSlots\.map/);
  assert.match(scheduleDragBoard, /h-44 max-h-44/);
  assert.match(scheduleDragBoard, /h-40 max-h-40/);
  assert.match(scheduleDragBoard, /twoLineClampStyle/);
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

test('public team names are numbered only within the same visible category', async () => {
  const tournament = await source('lib/tournament.ts');
  const generator = await source('lib/spielplan-generator.ts');
  const spielplanPage = await source('app/spielplan/page.tsx');
  const ergebnissePage = await source('app/ergebnisse/page.tsx');
  const pdfExport = await source('lib/pdf-export-simple.ts');
  const xlsxExport = await source('lib/export-utils.ts');

  assert.match(tournament, /createTeamDisplayNameMapFromGames/);
  assert.match(tournament, /const category = formatScheduleCategoryLabel\(spiel\.kategorie\)/);
  assert.match(tournament, /isMiniDisplayCategory\(baseCategory\)/);
  assert.match(tournament, /return 'Mini'/);
  assert.match(tournament, /const qualifierKey = normalizeTeamDisplayKey\(getTeamDisplayQualifier\(entry\)\)/);
  assert.match(tournament, /const groupKey = `\$\{baseKey\}:\$\{categoryKey\}:\$\{qualifierKey\}`/);
  assert.match(tournament, /function getEJugendDisplayCode/);
  assert.match(tournament, /return 'gE'/);
  assert.match(tournament, /return 'mE'/);
  assert.match(tournament, /return 'wE'/);
  assert.match(generator, /createTeamNumbersByStrength/);
  assert.match(generator, /getTeamNumberingRank\(team\.kategorie, team\.spielstaerke\)/);
  assert.match(generator, /getMiniCategoryNumberingRank/);
  assert.match(generator, /getSkillNumberingRank/);
  assert.doesNotMatch(generator, /getNextTeamNumber/);

  for (const file of [spielplanPage, ergebnissePage, pdfExport, xlsxExport]) {
    assert.match(file, /createTeamDisplayNameMapFromGames/);
    assert.doesNotMatch(file, /createTeamDisplayNameMap\(.*flatMap\(\(spiel\) => \[spiel\.team1, spiel\.team2\]\)/s);
  }
});

test('public schedule marks youth switches and pauses from time blocks', async () => {
  const publicRoute = await source('app/api/spielplan/get/route.ts');
  const spielplanPage = await source('app/spielplan/page.tsx');

  assert.match(publicRoute, /datumKey: samstagDatum/);
  assert.match(publicRoute, /datumKey: sonntagDatum/);
  assert.match(spielplanPage, /buildTimelineItems/);
  assert.match(spielplanPage, /Jugendwechsel/);
  assert.match(spielplanPage, /PAUSE/);
  assert.match(spielplanPage, /Wechsel zu/);
});

test('public year labels come from configured tournament dates', async () => {
  const rootLayout = await source('app/layout.tsx');
  const spielplanLayout = await source('app/spielplan/layout.tsx');
  const ergebnisseLayout = await source('app/ergebnisse/layout.tsx');
  const anmeldungLayout = await source('app/anmeldung/layout.tsx');
  const publicSettingsRoute = await source('app/api/public/turnier-einstellungen/route.ts');
  const appShell = await source('components/app-shell.tsx');
  const anmeldungPage = await source('app/anmeldung/page.tsx');
  const email = await source('lib/email.ts');
  const seo = await source('lib/seo.ts');
  const tournament = await source('lib/tournament.ts');
  const db = await source('lib/db.ts');

  for (const file of [rootLayout, spielplanLayout, ergebnisseLayout, anmeldungLayout]) {
    assert.match(file, /dynamic = ["']force-dynamic["']/);
  }

  assert.match(publicSettingsRoute, /tournamentYear: getTournamentYear/);
  assert.match(appShell, /tournamentYear/);
  assert.doesNotMatch(appShell, /© 2025/);
  assert.match(anmeldungPage, /Rasenturnier \{tournamentYear\}/);
  assert.doesNotMatch(anmeldungPage, /Rasenturnier 2025/);
  assert.match(email, /getEmailTournamentInfo/);
  assert.doesNotMatch(email, /Rasenturnier Puschendorf 2025/);
  assert.doesNotMatch(email, /Juli 2025/);
  assert.match(seo, /replaceTextYear\(seo\.turnierName, seo\.tournamentYear\)/);
  assert.match(tournament, /replaceTextYear/);
  assert.match(db, /replaceTextYear\(result\.turnierName/);
  assert.match(db, /replaceTextYear\(settings\.turnierName/);
});
