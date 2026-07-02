import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  DEFAULT_FELD_EINSTELLUNGEN,
  TOURNAMENT_DEFAULTS,
  calculateRegistrationCost,
  getDefaultSpielplanZeitbloecke,
  getTournamentYear,
  normalizeFeldEinstellungen,
  normalizeSpielplanZeitbloecke,
  normalizeSpielplanTimingOverrides,
  normalizeSpielplanTimingProfil,
  replaceTextYear,
  resolveTournamentScheduleSettings,
  type FeldEinstellungen,
} from './tournament';

let db: Database.Database | null = null;

type TableColumn = {
  name: string;
};

export type SpielplanStatus = 'draft' | 'published';

export type StoredLiveTimer = {
  liveTime: string;
  status: string;
  startTime?: number;
  elapsedTime: number;
  isSecondHalf: boolean;
  halbzeitStartTime?: number;
  lastUpdate: number;
};

export type RegistrationImportMode = 'teams_payments' | 'payments_only';

export type RegistrationImportTeam = {
  kategorie: string;
  anzahl: number;
  schiri: boolean;
  spielstaerke?: string;
  schiriName?: string;
};

export type RegistrationImportEntry = {
  id?: string;
  verein: string;
  kontakt?: string;
  email?: string;
  mobil?: string;
  kosten?: number;
  status?: 'angemeldet' | 'bezahlt' | 'storniert';
  teams: RegistrationImportTeam[];
  sourceRows: number[];
};

export type RegistrationImportWarning = {
  row?: number;
  message: string;
};

export type RegistrationImportResult = {
  rows: number;
  entries: number;
  created: number;
  updated: number;
  skipped: number;
  paymentsUpdated: number;
  teamsInserted: number;
  teamsReplaced: number;
  warnings: RegistrationImportWarning[];
};

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

function tableHasColumn(database: Database.Database, tableName: string, columnName: string) {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as TableColumn[];
  return columns.some((column) => column.name === columnName);
}

function addColumnIfMissing(
  database: Database.Database,
  tableName: string,
  columnName: string,
  columnDefinition: string
) {
  if (!tableHasColumn(database, tableName, columnName)) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`);
  }
}

// Datenbank-Verbindung herstellen
export function getDatabase() {
  if (!db) {
    const databasePath = resolveDatabasePath();
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });

    db = new Database(databasePath, {
      fileMustExist: false,
      timeout: Number.parseInt(process.env.DB_TIMEOUT || '5000', 10),
    });

    // WAL-Modus für bessere Concurrency
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -2000');
    db.pragma('temp_store = memory');
    db.pragma('mmap_size = 67108864');
    db.pragma(`busy_timeout = ${Number.parseInt(process.env.DB_BUSY_TIMEOUT || '5000', 10)}`);

    // Tabellen erstellen
    initializeTables();

    // Datenbankmigrationen ausführen
    migrateDatabase();

    ensureDailyDatabaseBackup(databasePath);
  }
  return db;
}

export function getDatabasePath() {
  return resolveDatabasePath();
}

function resolveDatabasePath() {
  const configuredPath = process.env.DATABASE_PATH;

  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(process.cwd(), configuredPath);
  }

  if (process.env.NODE_ENV === 'production') {
    return path.join(process.cwd(), 'data', 'database.sqlite');
  }

  return path.join(process.cwd(), 'database.sqlite');
}

export async function createDatabaseBackup(destinationPath?: string) {
  const database = getDatabase();
  const backupPath = destinationPath || createBackupPath('manual');

  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  await database.backup(backupPath);

  return backupPath;
}

export function getBackupDirectory() {
  const configuredPath = process.env.DATABASE_BACKUP_DIR;

  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(process.cwd(), configuredPath);
  }

  return path.join(path.dirname(resolveDatabasePath()), 'backups');
}

export function restoreDatabaseFromBuffer(buffer: Buffer) {
  const databasePath = resolveDatabasePath();
  const restoreDir = path.join(path.dirname(databasePath), 'restore');
  const restorePath = path.join(restoreDir, `restore-${Date.now()}.sqlite`);
  const preRestoreBackupPath = createBackupPath('pre-restore');

  fs.mkdirSync(restoreDir, { recursive: true });
  fs.writeFileSync(restorePath, buffer);
  validateDatabaseFile(restorePath);

  if (db) {
    db.close();
    db = null;
  }

  fs.mkdirSync(path.dirname(preRestoreBackupPath), { recursive: true });
  if (fs.existsSync(databasePath)) {
    fs.copyFileSync(databasePath, preRestoreBackupPath);
  }

  for (const suffix of ['', '-wal', '-shm']) {
    const filePath = `${databasePath}${suffix}`;
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath);
    }
  }

  fs.copyFileSync(restorePath, databasePath);
  fs.rmSync(restorePath, { force: true });

  getDatabase();

  return {
    restored: true,
    preRestoreBackupPath,
  };
}

function createBackupPath(kind: 'auto' | 'manual' | 'pre-restore') {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toISOString().slice(11, 19).replace(/:/g, '-');
  const suffix = kind === 'auto' ? date : `${date}-${time}`;

  return path.join(getBackupDirectory(), `${kind}-${suffix}.sqlite`);
}

function ensureDailyDatabaseBackup(databasePath: string) {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  if (!fs.existsSync(databasePath)) {
    return;
  }

  const backupPath = createBackupPath('auto');

  if (fs.existsSync(backupPath)) {
    return;
  }

  void createDatabaseBackup(backupPath).catch((error) => {
    console.warn('⚠️ Automatisches Datenbank-Backup fehlgeschlagen:', error);
  });
}

function validateDatabaseFile(filePath: string) {
  let restoreDb: Database.Database | null = null;

  try {
    restoreDb = new Database(filePath, { readonly: true, fileMustExist: true });
    const integrity = restoreDb.prepare('PRAGMA integrity_check').get() as { integrity_check?: string };

    if (integrity.integrity_check !== 'ok') {
      throw new Error('SQLite integrity_check fehlgeschlagen');
    }

    const tables = restoreDb.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name IN ('anmeldungen', 'teams', 'spiele', 'einstellungen')
    `).all() as Array<{ name: string }>;
    const tableNames = new Set(tables.map((table) => table.name));

    for (const requiredTable of ['anmeldungen', 'teams', 'spiele', 'einstellungen']) {
      if (!tableNames.has(requiredTable)) {
        throw new Error(`Backup enthält die Tabelle "${requiredTable}" nicht`);
      }
    }
  } finally {
    restoreDb?.close();
  }
}

function initializeTables() {
  if (!db) return;

  // Anmeldungen Tabelle
  db.exec(`
    CREATE TABLE IF NOT EXISTS anmeldungen (
      id TEXT PRIMARY KEY,
      verein TEXT NOT NULL,
      kontakt TEXT NOT NULL,
      email TEXT NOT NULL,
      mobil TEXT NOT NULL,
      kosten INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'angemeldet',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Teams Tabelle
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      anmeldung_id TEXT NOT NULL,
      kategorie TEXT NOT NULL,
      anzahl INTEGER NOT NULL,
      schiri BOOLEAN NOT NULL,
      schiri_name TEXT,
      spielstaerke TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (anmeldung_id) REFERENCES anmeldungen (id)
    )
  `);

  // Spiele Tabelle
  db.exec(`
    CREATE TABLE IF NOT EXISTS spiele (
      id TEXT PRIMARY KEY,
      datum TEXT NOT NULL,
      zeit TEXT NOT NULL,
      feld TEXT NOT NULL,
      kategorie TEXT NOT NULL,
      team1 TEXT NOT NULL,
      team2 TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'geplant',
      schiedsrichter TEXT,
      ergebnis TEXT,
      tore_team1 INTEGER DEFAULT 0,
      tore_team2 INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS spiel_live_timers (
      spiel_id TEXT PRIMARY KEY,
      live_time TEXT,
      status TEXT NOT NULL,
      start_time INTEGER,
      elapsed_time INTEGER DEFAULT 0,
      is_second_half INTEGER DEFAULT 0,
      halbzeit_start_time INTEGER,
      last_update INTEGER NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (spiel_id) REFERENCES spiele (id) ON DELETE CASCADE
    )
  `);

  // Turnier-Einstellungen Tabelle
  db.exec(`
    CREATE TABLE IF NOT EXISTS einstellungen (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Standard-Einstellungen einfügen
  const insertEinstellung = db.prepare(`
    INSERT OR IGNORE INTO einstellungen (id, key, value) VALUES (?, ?, ?)
  `);

  insertEinstellung.run('1', 'turnier_name', TOURNAMENT_DEFAULTS.name);
  insertEinstellung.run('2', 'startgeld', TOURNAMENT_DEFAULTS.teamFee.toString());
  insertEinstellung.run('3', 'schiri_geld', TOURNAMENT_DEFAULTS.missingRefereeFee.toString());
  insertEinstellung.run('4', 'anzahl_felder', '4');
  insertEinstellung.run('5', 'anmeldeschluss', TOURNAMENT_DEFAULTS.registrationDeadline);
  insertEinstellung.run('6', 'turnier_datum_1', TOURNAMENT_DEFAULTS.startDate);
  insertEinstellung.run('7', 'turnier_datum_2', TOURNAMENT_DEFAULTS.endDate);
  insertEinstellung.run('20', 'spielplan_status', 'draft');
  insertEinstellung.run('21', 'spielplan_published_at', '');
  insertEinstellung.run('24', 'anmeldung_aktiv', 'true');

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      key TEXT PRIMARY KEY,
      einstellungen TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS feld_jahrgang_zuordnungen (
      id TEXT PRIMARY KEY,
      feld_id TEXT NOT NULL,
      datum TEXT NOT NULL,
      jahrgang TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(feld_id, datum, jahrgang)
    )
  `);

  // Helfer-Bedarf Tabelle
  db.exec(`
    CREATE TABLE IF NOT EXISTS helfer_bedarf (
      id TEXT PRIMARY KEY,
      titel TEXT NOT NULL,
      beschreibung TEXT NOT NULL,
      datum TEXT NOT NULL,
      startzeit TEXT NOT NULL,
      endzeit TEXT NOT NULL,
      anzahlBenötigt INTEGER NOT NULL,
      kategorie TEXT NOT NULL,
      aktiv BOOLEAN NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Helfer-Anmeldungen Tabelle
  db.exec(`
    CREATE TABLE IF NOT EXISTS helfer_anmeldungen (
      id TEXT PRIMARY KEY,
      helferBedarfId TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      telefon TEXT,
      bemerkung TEXT,
      kuchenspende TEXT,
      status TEXT NOT NULL DEFAULT 'angemeldet',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (helferBedarfId) REFERENCES helfer_bedarf(id)
    )
  `);

  addColumnIfMissing(db, 'helfer_anmeldungen', 'kuchenspende', 'kuchenspende TEXT');

  // Migrations-Tabelle erstellen
  db.exec(`
    CREATE TABLE IF NOT EXISTS db_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  runStructuredMigrations();
}

function runStructuredMigrations() {
    if (!db) return;

    console.log('🔄 Prüfe strukturierte Datenbankmigrationen...');

    // Liste aller Migrationen
    const migrations = [
      {
        name: 'add_updated_at_to_helfer_bedarf',
        run: () => {
          addColumnIfMissing(db!, 'helfer_bedarf', 'updated_at', 'updated_at TEXT DEFAULT CURRENT_TIMESTAMP');
        }
      },
      {
        name: 'add_created_at_to_teams',
        run: () => {
          addColumnIfMissing(db!, 'teams', 'created_at', 'created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
        }
      }
    ];

  // Bereits ausgeführte Migrationen abrufen
  const rows = db.prepare('SELECT name FROM db_migrations').all() as any[];
  const appliedMigrations = rows.map(row => row.name as string);

  // Neue Migrationen ausführen
  for (const migration of migrations) {
    if (!appliedMigrations.includes(migration.name)) {
      console.log(`🔄 Führe Migration aus: ${migration.name}`);

      try {
        migration.run();

        // Migration als ausgeführt markieren
        db.prepare('INSERT INTO db_migrations (name) VALUES (?)').run(migration.name);

        console.log(`✅ Migration erfolgreich: ${migration.name}`);
      } catch (error) {
        console.error(`❌ Fehler bei Migration ${migration.name}:`, error);
      }
    }
  }
}

function migrateDatabase() {
  if (!db) return;

  try {
    console.log('🔄 Checking database migrations...');
    addColumnIfMissing(db, 'anmeldungen', 'updated_at', 'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
    addColumnIfMissing(db, 'teams', 'created_at', 'created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
    addColumnIfMissing(db, 'teams', 'schiri_name', 'schiri_name TEXT');
    addColumnIfMissing(db, 'spiele', 'schiedsrichter', 'schiedsrichter TEXT');
    addColumnIfMissing(db, 'spiele', 'tore_team1', 'tore_team1 INTEGER DEFAULT 0');
    addColumnIfMissing(db, 'spiele', 'tore_team2', 'tore_team2 INTEGER DEFAULT 0');
    normalizeStoredTeamSkillLevels(db);

    console.log('✅ Database migrations completed');
  } catch (error) {
    console.warn('⚠️ Database migration warning:', error);
    // Don't throw - continue with existing schema
  }
}

function normalizeStoredTeamSkillLevels(database: Database.Database) {
  const teams = database.prepare(`
    SELECT id, spielstaerke FROM teams
    WHERE spielstaerke IS NOT NULL AND TRIM(spielstaerke) != ''
  `).all() as Array<{ id: string; spielstaerke: string }>;
  const updateTeam = database.prepare(`
    UPDATE teams
    SET spielstaerke = ?
    WHERE id = ?
  `);

  for (const team of teams) {
    const normalized = normalizeTeamSkillLevel(team.spielstaerke);

    if (normalized && normalized !== team.spielstaerke) {
      updateTeam.run(normalized, team.id);
    }
  }
}

function normalizeTeamSkillLevel(value: string | undefined | null) {
  const raw = String(value ?? '').trim();

  if (!raw) {
    return null;
  }

  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  if (['anf', 'anfaenger', 'anfanger', 'beginner', 'einsteiger'].includes(normalized) || normalized.includes('anfaeng')) {
    return 'Anfänger';
  }

  if (
    ['leistung', 'leistungsstark', 'stark', 'competitive', 'sehrerfahren', 'sehrstark'].includes(normalized) ||
    normalized.includes('leistung') ||
    normalized.includes('sehrerfahren')
  ) {
    return 'Leistung';
  }

  return 'Standard';
}

function normalizeOptionalText(value: string | undefined | null) {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();

  return normalized || null;
}

export interface AnmeldungData {
  verein: string;
  kontakt: string;
  email: string;
  mobil: string;
  teams: {
    kategorie: string;
    anzahl: number;
    schiri: boolean;
    spielstaerke?: string;
    schiriName?: string;
  }[];
  kosten: number;
}

export function createAnmeldung(anmeldungData: AnmeldungData): string {
  const db = getDatabase();

  const anmeldungId = createId('anm');

  // Transaction für Atomicity
  const transaction = db.transaction(() => {
    // Anmeldung einfügen
    const insertAnmeldung = db.prepare(`
      INSERT INTO anmeldungen (id, verein, kontakt, email, mobil, kosten, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertAnmeldung.run(
      anmeldungId,
      anmeldungData.verein,
      anmeldungData.kontakt,
      anmeldungData.email,
      anmeldungData.mobil,
      anmeldungData.kosten,
      'angemeldet'
    );

    // Teams einfügen
    const insertTeam = db.prepare(`
      INSERT INTO teams (id, anmeldung_id, kategorie, anzahl, schiri, schiri_name, spielstaerke)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const team of anmeldungData.teams) {
      const teamId = createId('team');
      insertTeam.run(
        teamId,
        anmeldungId,
        team.kategorie,
        team.anzahl,
        team.schiri ? 1 : 0,
        normalizeOptionalText(team.schiriName),
        normalizeTeamSkillLevel(team.spielstaerke)
      );
    }
  });

  transaction();

  return anmeldungId;
}

export function getAllAnmeldungen() {
  const db = getDatabase();

  const anmeldungen = db.prepare(`
    SELECT * FROM anmeldungen ORDER BY created_at DESC
  `).all() as any[];

  // Teams für jede Anmeldung laden
  const getTeams = db.prepare(`
    SELECT * FROM teams WHERE anmeldung_id = ?
  `);

  return anmeldungen.map(anmeldung => ({
    ...anmeldung,
    teams: getTeams.all(anmeldung.id)
  }));
}

export function getAnmeldungById(id: string) {
  const db = getDatabase();

  const anmeldung = db.prepare(`
    SELECT * FROM anmeldungen WHERE id = ?
  `).get(id);

  if (!anmeldung) return null;

  const teams = db.prepare(`
    SELECT * FROM teams WHERE anmeldung_id = ?
  `).all(id);

  return {
    ...anmeldung,
    teams
  };
}

export function updateAnmeldungStatus(id: string, status: string) {
  const db = getDatabase();

  const update = db.prepare(`
    UPDATE anmeldungen
    SET status = ?
    WHERE id = ?
  `);

  return update.run(status, id);
}

export function updateAnmeldungInfo(id: string, data: Partial<{
  verein: string;
  kontakt: string;
  email: string;
  mobil: string;
  kosten: number;
}>) {
  const db = getDatabase();
  const allowedFields = new Set(['verein', 'kontakt', 'email', 'mobil', 'kosten']);
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (!allowedFields.has(key) || value === undefined) {
      continue;
    }

    fields.push(`${key} = ?`);
    values.push(key === 'kosten' ? Number(value) : value);
  }

  if (fields.length === 0) {
    return { changes: 0 };
  }

  values.push(id);

  const update = db.prepare(`
    UPDATE anmeldungen
    SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  return update.run(...values);
}

export function importAnmeldungen(
  entries: RegistrationImportEntry[],
  options: { mode: RegistrationImportMode; replaceTeams: boolean }
): RegistrationImportResult {
  const db = getDatabase();
  const warnings: RegistrationImportWarning[] = [];
  const result: RegistrationImportResult = {
    rows: entries.reduce((sum, entry) => sum + Math.max(entry.sourceRows.length, 1), 0),
    entries: entries.length,
    created: 0,
    updated: 0,
    skipped: 0,
    paymentsUpdated: 0,
    teamsInserted: 0,
    teamsReplaced: 0,
    warnings,
  };

  const existingRows = db.prepare(`
    SELECT id, verein, kontakt, email, mobil, kosten, status
    FROM anmeldungen
  `).all() as Array<{
    id: string;
    verein: string;
    kontakt: string;
    email: string;
    mobil: string;
    kosten: number;
    status: string;
  }>;

  const byId = new Map(existingRows.map((row) => [row.id, row]));
  const byEmail = groupExistingRows(existingRows, (row) => normalizeImportLookup(row.email));
  const byVerein = groupExistingRows(existingRows, (row) => normalizeImportLookup(row.verein));
  const byVereinEmail = groupExistingRows(existingRows, (row) => {
    const verein = normalizeImportLookup(row.verein);
    const email = normalizeImportLookup(row.email);
    return verein && email ? `${verein}|${email}` : '';
  });

  const insertAnmeldung = db.prepare(`
    INSERT INTO anmeldungen (id, verein, kontakt, email, mobil, kosten, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const updateAnmeldung = db.prepare(`
    UPDATE anmeldungen
    SET verein = ?, kontakt = ?, email = ?, mobil = ?, kosten = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  const deleteTeams = db.prepare(`DELETE FROM teams WHERE anmeldung_id = ?`);
  const insertTeam = db.prepare(`
    INSERT INTO teams (id, anmeldung_id, kategorie, anzahl, schiri, schiri_name, spielstaerke)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  function rememberExisting(row: (typeof existingRows)[number]) {
    byId.set(row.id, row);
    addGroupedRow(byVerein, normalizeImportLookup(row.verein), row);
    addGroupedRow(byEmail, normalizeImportLookup(row.email), row);
    const verein = normalizeImportLookup(row.verein);
    const email = normalizeImportLookup(row.email);
    addGroupedRow(byVereinEmail, verein && email ? `${verein}|${email}` : '', row);
  }

  function findExisting(entry: RegistrationImportEntry) {
    if (entry.id && byId.has(entry.id)) {
      return byId.get(entry.id);
    }

    const verein = normalizeImportLookup(entry.verein);
    const email = normalizeImportLookup(entry.email || '');

    if (verein && email) {
      const match = getSingleGroupedRow(byVereinEmail, `${verein}|${email}`);
      if (match) return match;
    }

    if (email) {
      const match = getSingleGroupedRow(byEmail, email);
      if (match) return match;
    }

    if (verein) {
      const match = getSingleGroupedRow(byVerein, verein);
      if (match) return match;
    }

    return null;
  }

  const transaction = db.transaction(() => {
    for (const entry of entries) {
      const existing = findExisting(entry);
      const teams = sanitizeRegistrationImportTeams(entry.teams);
      const hasPaymentPatch = entry.status !== undefined || entry.kosten !== undefined;

      if (options.mode === 'payments_only' && !existing) {
        result.skipped += 1;
        warnings.push({
          row: entry.sourceRows[0],
          message: `Keine vorhandene Anmeldung für "${entry.verein || entry.email || 'unbekannt'}" gefunden.`,
        });
        continue;
      }

      if (existing) {
        const nextVerein = entry.verein.trim() || existing.verein;
        const nextKontakt = entry.kontakt?.trim() || existing.kontakt;
        const nextEmail = entry.email?.trim() || existing.email;
        const nextMobil = entry.mobil?.trim() || existing.mobil;
        const nextKosten = entry.kosten ?? (options.mode === 'teams_payments' && teams.length > 0
          ? calculateRegistrationCost(teams)
          : Number(existing.kosten || 0));
        const nextStatus = entry.status || (existing.status as 'angemeldet' | 'bezahlt' | 'storniert') || 'angemeldet';

        updateAnmeldung.run(nextVerein, nextKontakt, nextEmail, nextMobil, Math.max(0, Math.round(nextKosten)), nextStatus, existing.id);

        const shouldImportTeams = options.mode === 'teams_payments' && teams.length > 0;
        if (shouldImportTeams) {
          if (options.replaceTeams) {
            deleteTeams.run(existing.id);
            result.teamsReplaced += 1;
          }

          for (const team of teams) {
            insertTeam.run(
              createId('team'),
              existing.id,
              team.kategorie,
              team.anzahl,
              team.schiri ? 1 : 0,
              normalizeOptionalText(team.schiriName),
              normalizeTeamSkillLevel(team.spielstaerke)
            );
            result.teamsInserted += 1;
          }
        }

        existing.verein = nextVerein;
        existing.kontakt = nextKontakt;
        existing.email = nextEmail;
        existing.mobil = nextMobil;
        existing.kosten = Math.max(0, Math.round(nextKosten));
        existing.status = nextStatus;
        result.updated += 1;
        if (hasPaymentPatch) {
          result.paymentsUpdated += 1;
        }
        continue;
      }

      if (options.mode === 'payments_only') {
        result.skipped += 1;
        continue;
      }

      if (!entry.verein.trim()) {
        result.skipped += 1;
        warnings.push({ row: entry.sourceRows[0], message: 'Verein fehlt, Eintrag übersprungen.' });
        continue;
      }

      if (teams.length === 0) {
        warnings.push({ row: entry.sourceRows[0], message: `Für "${entry.verein}" wurden keine Teamdaten gefunden.` });
      }

      const id = createId('anm');
      const kosten = entry.kosten ?? calculateRegistrationCost(teams);
      const row = {
        id,
        verein: entry.verein.trim(),
        kontakt: entry.kontakt?.trim() || '',
        email: entry.email?.trim() || '',
        mobil: entry.mobil?.trim() || '',
        kosten: Math.max(0, Math.round(kosten)),
        status: entry.status || 'angemeldet',
      };

      insertAnmeldung.run(row.id, row.verein, row.kontakt, row.email, row.mobil, row.kosten, row.status);

      for (const team of teams) {
        insertTeam.run(
          createId('team'),
          row.id,
          team.kategorie,
          team.anzahl,
          team.schiri ? 1 : 0,
          normalizeOptionalText(team.schiriName),
          normalizeTeamSkillLevel(team.spielstaerke)
        );
        result.teamsInserted += 1;
      }

      rememberExisting(row);
      result.created += 1;
      if (hasPaymentPatch) {
        result.paymentsUpdated += 1;
      }
    }
  });

  transaction();

  return result;
}

function sanitizeRegistrationImportTeams(teams: RegistrationImportTeam[]) {
  const merged = new Map<string, RegistrationImportTeam>();

  for (const team of teams) {
    const kategorie = team.kategorie.trim();
    const anzahl = Math.max(1, Math.floor(Number(team.anzahl || 1)));

    if (!kategorie || !Number.isFinite(anzahl)) {
      continue;
    }

    const spielstaerke = normalizeTeamSkillLevel(team.spielstaerke) || undefined;
    const schiriName = normalizeOptionalText(team.schiriName) || undefined;
    const hasSchiri = Boolean(team.schiri || schiriName);
    const key = `${normalizeImportLookup(kategorie)}|${hasSchiri ? '1' : '0'}|${normalizeImportLookup(schiriName || '')}|${normalizeImportLookup(spielstaerke || '')}`;
    const existing = merged.get(key);

    if (existing) {
      existing.anzahl += anzahl;
    } else {
      merged.set(key, {
        kategorie,
        anzahl,
        schiri: hasSchiri,
        schiriName,
        spielstaerke,
      });
    }
  }

  return Array.from(merged.values());
}

function normalizeImportLookup(value: string) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase();
}

function groupExistingRows<T>(rows: T[], getKey: (row: T) => string) {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    addGroupedRow(grouped, getKey(row), row);
  }

  return grouped;
}

function addGroupedRow<T>(grouped: Map<string, T[]>, key: string, row: T) {
  if (!key) {
    return;
  }

  const rows = grouped.get(key) || [];
  rows.push(row);
  grouped.set(key, rows);
}

function getSingleGroupedRow<T>(grouped: Map<string, T[]>, key: string) {
  const rows = grouped.get(key);
  return rows && rows.length === 1 ? rows[0] : null;
}

export function getSpielplan(datum?: string) {
  const db = getDatabase();

  if (datum) {
    return db.prepare(`
      SELECT * FROM spiele WHERE datum = ? ORDER BY zeit
    `).all(datum);
  }

  return db.prepare(`
    SELECT * FROM spiele ORDER BY datum, zeit
  `).all();
}

export function createSpiel(spielData: {
  datum: string;
  zeit: string;
  feld: string;
  kategorie: string;
  team1: string;
  team2: string;
  schiedsrichter?: string | null;
}) {
  const db = getDatabase();

  const spielId = createId('spiel');

  const insert = db.prepare(`
    INSERT INTO spiele (id, datum, zeit, feld, kategorie, team1, team2, schiedsrichter, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'geplant')
  `);

  insert.run(
    spielId,
    spielData.datum,
    spielData.zeit,
    spielData.feld,
    spielData.kategorie,
    spielData.team1,
    spielData.team2,
    normalizeOptionalText(spielData.schiedsrichter)
  );

  return spielId;
}

export interface SpielplanSnapshotSpiel {
  id?: string | null;
  datum: string;
  zeit: string;
  feld: string;
  kategorie: string;
  team1: string;
  team2: string;
  status?: string | null;
  schiedsrichter?: string | null;
  ergebnis?: string | null;
  tore_team1?: number | null;
  tore_team2?: number | null;
}

export function replaceSpielplanFromSnapshot(spiele: SpielplanSnapshotSpiel[]) {
  const db = getDatabase();
  const validStatus = new Set(['geplant', 'laufend', 'halbzeit', 'beendet']);
  const deleteTimersStmt = db.prepare(`DELETE FROM spiel_live_timers`);
  const deleteSpieleStmt = db.prepare(`DELETE FROM spiele`);
  const insertSpielStmt = db.prepare(`
    INSERT INTO spiele (
      id, datum, zeit, feld, kategorie, team1, team2,
      status, schiedsrichter, ergebnis, tore_team1, tore_team2
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const normalizeRequired = (value: string) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const normalizeGoals = (value: number | null | undefined) => {
    const goals = Number(value);
    return Number.isInteger(goals) && goals >= 0 ? goals : null;
  };
  const transaction = db.transaction(() => {
    deleteTimersStmt.run();
    const deleted = deleteSpieleStmt.run();

    for (const spiel of spiele) {
      const id = normalizeOptionalText(spiel.id) || createId('spiel');
      const status = validStatus.has(String(spiel.status || '')) ? String(spiel.status) : 'geplant';

      insertSpielStmt.run(
        id,
        normalizeRequired(spiel.datum),
        normalizeRequired(spiel.zeit),
        normalizeRequired(spiel.feld),
        normalizeRequired(spiel.kategorie),
        normalizeRequired(spiel.team1),
        normalizeRequired(spiel.team2),
        status,
        normalizeOptionalText(spiel.schiedsrichter),
        normalizeOptionalText(spiel.ergebnis),
        normalizeGoals(spiel.tore_team1),
        normalizeGoals(spiel.tore_team2)
      );
    }

    return {
      deleted: deleted.changes,
      imported: spiele.length,
    };
  });

  const result = transaction();
  const publication = setSpielplanPublicationStatus('draft');

  return {
    ...result,
    ...publication,
  };
}

export function updateSpielErgebnis(id: string, ergebnis: string, status: string = 'beendet') {
  const db = getDatabase();

  const update = db.prepare(`
    UPDATE spiele
    SET ergebnis = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  return update.run(ergebnis, status, id);
}

export function getEinstellungen() {
  const db = getDatabase();

  const einstellungen = db.prepare(`
    SELECT * FROM einstellungen
  `).all() as any[];

  const result: Record<string, string> = {};

  for (const setting of einstellungen) {
    result[setting.key] = setting.value;
  }

  return result;
}

export function updateEinstellung(key: string, value: string) {
  const db = getDatabase();

  const update = db.prepare(`
    UPDATE einstellungen
    SET value = ?, updated_at = CURRENT_TIMESTAMP
    WHERE key = ?
  `);

  return update.run(value, key);
}

export function saveFeldJahrgangZuordnung(feldId: string, datum: string, jahrgang: string) {
  const db = getDatabase();
  const id = `${feldId}_${datum}_${jahrgang}`;

  const insert = db.prepare(`
    INSERT OR REPLACE INTO feld_jahrgang_zuordnungen (id, feld_id, datum, jahrgang)
    VALUES (?, ?, ?, ?)
  `);

  return insert.run(id, feldId, datum, jahrgang);
}

export function deleteFeldJahrgangZuordnung(feldId: string, datum: string, jahrgang: string) {
  const db = getDatabase();

  const deleteStmt = db.prepare(`
    DELETE FROM feld_jahrgang_zuordnungen
    WHERE feld_id = ? AND datum = ? AND jahrgang = ?
  `);

  return deleteStmt.run(feldId, datum, jahrgang);
}

export function getFeldJahrgangZuordnungen() {
  const db = getDatabase();

  const zuordnungen = db.prepare(`
    SELECT feld_id, datum, jahrgang
    FROM feld_jahrgang_zuordnungen
    ORDER BY datum, feld_id, jahrgang
  `).all() as Array<{ feld_id: string; datum: string; jahrgang: string }>;

  return zuordnungen.reduce<Record<string, Record<string, string[]>>>((result, zuordnung) => {
    result[zuordnung.feld_id] ??= {};
    result[zuordnung.feld_id][zuordnung.datum] ??= [];
    result[zuordnung.feld_id][zuordnung.datum].push(zuordnung.jahrgang);
    return result;
  }, {});
}

export function getStoredFeldEinstellungen(): FeldEinstellungen[] {
  const db = getDatabase();

  try {
    const result = db.prepare(`
      SELECT einstellungen FROM admin_settings
      WHERE key = 'feldEinstellungen'
      LIMIT 1
    `).get() as { einstellungen: string } | undefined;

    if (!result) {
      return normalizeFeldEinstellungen(DEFAULT_FELD_EINSTELLUNGEN);
    }

    return normalizeFeldEinstellungen(JSON.parse(result.einstellungen));
  } catch (error) {
    console.warn('Feldeinstellungen konnten nicht geladen werden, verwende Defaults:', error);
    return normalizeFeldEinstellungen(DEFAULT_FELD_EINSTELLUNGEN);
  }
}

export function saveStoredFeldEinstellungen(feldEinstellungen: unknown) {
  const db = getDatabase();
  const normalizedFeldEinstellungen = normalizeFeldEinstellungen(feldEinstellungen);

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO admin_settings (key, einstellungen, updated_at)
    VALUES (?, ?, datetime('now'))
  `);

  stmt.run('feldEinstellungen', JSON.stringify(normalizedFeldEinstellungen));

  return normalizedFeldEinstellungen;
}

export interface SpielFeldRename {
  id: string;
  from: string;
  to: string;
}

export function updateSpielFeldnamen(fieldRenames: SpielFeldRename[]) {
  const db = getDatabase();
  const normalizedRenames = fieldRenames
    .map((rename) => ({
      ...rename,
      from: String(rename.from || '').trim(),
      to: String(rename.to || '').trim(),
    }))
    .filter((rename) => rename.from && rename.to && rename.from !== rename.to);

  if (normalizedRenames.length === 0) {
    return { changes: 0 };
  }

  const caseParts = normalizedRenames.map(() => 'WHEN ? THEN ?').join(' ');
  const whereParts = normalizedRenames.map(() => '?').join(', ');
  const values: unknown[] = [];

  for (const rename of normalizedRenames) {
    values.push(rename.from, rename.to);
  }

  for (const rename of normalizedRenames) {
    values.push(rename.from);
  }

  const update = db.prepare(`
    UPDATE spiele
    SET feld = CASE feld ${caseParts} ELSE feld END,
        updated_at = CURRENT_TIMESTAMP
    WHERE feld IN (${whereParts})
  `);

  return update.run(...values);
}

// Admin-Einstellungen verwalten
export function getAdminSettings() {
  const db = getDatabase();
  const settings = db.prepare(`
    SELECT key, value FROM einstellungen
  `).all();
  let rawSpielplanZeitbloecke: unknown;
  let rawSpielplanTimingOverrides: unknown;

  const result: any = {
    turnierName: TOURNAMENT_DEFAULTS.name,
    startgeld: TOURNAMENT_DEFAULTS.teamFee,
    schiriGeld: TOURNAMENT_DEFAULTS.missingRefereeFee,
    maxTeamsProKategorie: TOURNAMENT_DEFAULTS.maxTeamsPerCategorySelection,
    anmeldeschluss: TOURNAMENT_DEFAULTS.registrationDeadline,
    anzahlFelder: DEFAULT_FELD_EINSTELLUNGEN.length,
    spielzeit: 12,
    pausenzeit: 3,
    adminEmail: 'admin@sv-puschendorf.de',
    automatischeEmails: true,
    sichtbarkeit: 'public' as const,
    zahlungsarten: ['Überweisung', 'PayPal', 'Barzahlung'],
    datenschutz: true,
    turnierStartDatum: TOURNAMENT_DEFAULTS.startDate,
    turnierEndDatum: TOURNAMENT_DEFAULTS.endDate,
    samstagStartzeit: TOURNAMENT_DEFAULTS.saturdayStartTime,
    samstagEndzeit: TOURNAMENT_DEFAULTS.saturdayEndTime,
    sonntagStartzeit: TOURNAMENT_DEFAULTS.sundayStartTime,
    sonntagEndzeit: TOURNAMENT_DEFAULTS.sundayEndTime,
    samstagToreSichtbar: false,
    sonntagToreSichtbar: true,
    ergebnisTabellenAktiv: false,
    spielzeitenAutomatisch: true,
    spielplanTimingProfil: 'standard',
    spielplanTimingOverrides: {},
    spielplanZeitbloecke: getDefaultSpielplanZeitbloecke(),
    anmeldungAktiv: true,
    spielplanStatus: 'draft' as SpielplanStatus,
    spielplanPublishedAt: null as string | null,
    adminPasskey: ''
  };

  // Einstellungen aus der Datenbank übernehmen
  settings.forEach((setting: any) => {
    switch (setting.key) {
      case 'turnier_name':
        result.turnierName = setting.value;
        break;
      case 'startgeld':
        result.startgeld = parseInt(setting.value);
        break;
      case 'schiri_geld':
        result.schiriGeld = parseInt(setting.value);
        break;
      case 'anzahl_felder':
        result.anzahlFelder = parseInt(setting.value);
        break;
      case 'anmeldeschluss':
        result.anmeldeschluss = setting.value;
        break;
      case 'max_teams_pro_kategorie':
        result.maxTeamsProKategorie = parseInt(setting.value);
        break;
      case 'spielzeit':
        result.spielzeit = parseInt(setting.value);
        break;
      case 'pausenzeit':
        result.pausenzeit = parseInt(setting.value);
        break;
      case 'admin_email':
        result.adminEmail = setting.value;
        break;
      case 'automatische_emails':
        result.automatischeEmails = setting.value === 'true';
        break;
      case 'sichtbarkeit':
        result.sichtbarkeit = setting.value;
        break;
      case 'datenschutz':
        result.datenschutz = setting.value === 'true';
        break;
      case 'turnier_start_datum':
        result.turnierStartDatum = setting.value;
        break;
      case 'turnier_end_datum':
        result.turnierEndDatum = setting.value;
        break;
      case 'samstagStartzeit':
        result.samstagStartzeit = setting.value;
        break;
      case 'samstagEndzeit':
        result.samstagEndzeit = setting.value;
        break;
      case 'sonntagStartzeit':
        result.sonntagStartzeit = setting.value;
        break;
      case 'sonntagEndzeit':
        result.sonntagEndzeit = setting.value;
        break;
      case 'samstag_tore_sichtbar':
        result.samstagToreSichtbar = setting.value === 'true';
        break;
      case 'sonntag_tore_sichtbar':
        result.sonntagToreSichtbar = setting.value !== 'false';
        break;
      case 'ergebnis_tabellen_aktiv':
        result.ergebnisTabellenAktiv = setting.value === 'true';
        break;
      case 'spielzeiten_automatisch':
        result.spielzeitenAutomatisch = setting.value !== 'false';
        break;
      case 'spielplan_timing_profil':
        result.spielplanTimingProfil = normalizeSpielplanTimingProfil(setting.value);
        break;
      case 'spielplan_timing_overrides':
        try {
          rawSpielplanTimingOverrides = JSON.parse(setting.value);
        } catch {
          rawSpielplanTimingOverrides = undefined;
        }
        break;
      case 'spielplan_zeitbloecke':
        try {
          rawSpielplanZeitbloecke = JSON.parse(setting.value);
        } catch {
          rawSpielplanZeitbloecke = undefined;
        }
        break;
      case 'anmeldung_aktiv':
        result.anmeldungAktiv = setting.value !== 'false';
        break;
      case 'spielplan_status':
        result.spielplanStatus = setting.value === 'published' ? 'published' : 'draft';
        break;
      case 'spielplan_published_at':
        result.spielplanPublishedAt = setting.value || null;
        break;
      case 'admin_passkey':
        result.adminPasskey = setting.value;
        break;
    }
  });

  const scheduleSettings = resolveTournamentScheduleSettings(result);
  const tournamentYear = getTournamentYear(scheduleSettings.turnierStartDatum);

  result.turnierName = replaceTextYear(result.turnierName || TOURNAMENT_DEFAULTS.name, tournamentYear);
  result.spielplanZeitbloecke = normalizeSpielplanZeitbloecke(
    rawSpielplanZeitbloecke ?? result.spielplanZeitbloecke,
    scheduleSettings
  );
  result.spielplanTimingProfil = normalizeSpielplanTimingProfil(result.spielplanTimingProfil);
  result.spielplanTimingOverrides = normalizeSpielplanTimingOverrides(
    rawSpielplanTimingOverrides ?? result.spielplanTimingOverrides
  );

  return result;
}

export function saveAdminSettings(settings: any) {
  const db = getDatabase();
  const scheduleSettings = resolveTournamentScheduleSettings(settings);
  const tournamentYear = getTournamentYear(scheduleSettings.turnierStartDatum);
  const turnierName = replaceTextYear(settings.turnierName || TOURNAMENT_DEFAULTS.name, tournamentYear);
  const updateSetting = db.prepare(`
    INSERT OR REPLACE INTO einstellungen (id, key, value, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const transaction = db.transaction(() => {
    updateSetting.run('1', 'turnier_name', turnierName);
    updateSetting.run('2', 'startgeld', settings.startgeld.toString());
    updateSetting.run('3', 'schiri_geld', settings.schiriGeld.toString());
    updateSetting.run('4', 'anzahl_felder', settings.anzahlFelder.toString());
    updateSetting.run('5', 'anmeldeschluss', settings.anmeldeschluss);
    updateSetting.run('6', 'max_teams_pro_kategorie', settings.maxTeamsProKategorie.toString());
    updateSetting.run('7', 'spielzeit', settings.spielzeit ? settings.spielzeit.toString() : '10');
    updateSetting.run('8', 'pausenzeit', settings.pausenzeit ? settings.pausenzeit.toString() : '2');
    updateSetting.run('9', 'admin_email', settings.adminEmail);
    updateSetting.run('10', 'automatische_emails', settings.automatischeEmails.toString());
    updateSetting.run('11', 'sichtbarkeit', settings.sichtbarkeit);
    updateSetting.run('12', 'datenschutz', settings.datenschutz.toString());
    updateSetting.run('13', 'turnier_start_datum', settings.turnierStartDatum);
    updateSetting.run('14', 'turnier_end_datum', settings.turnierEndDatum);
    // Neue Zeiteinstellungen
    updateSetting.run('15', 'samstagStartzeit', settings.samstagStartzeit || TOURNAMENT_DEFAULTS.saturdayStartTime);
    updateSetting.run('16', 'samstagEndzeit', settings.samstagEndzeit || TOURNAMENT_DEFAULTS.saturdayEndTime);
    updateSetting.run('17', 'sonntagStartzeit', settings.sonntagStartzeit || TOURNAMENT_DEFAULTS.sundayStartTime);
    updateSetting.run('18', 'sonntagEndzeit', settings.sonntagEndzeit || TOURNAMENT_DEFAULTS.sundayEndTime);
    updateSetting.run('20', 'spielplan_status', settings.spielplanStatus === 'published' ? 'published' : 'draft');
    updateSetting.run('21', 'spielplan_published_at', settings.spielplanPublishedAt || '');
    updateSetting.run('22', 'samstag_tore_sichtbar', settings.samstagToreSichtbar ? 'true' : 'false');
    updateSetting.run('23', 'sonntag_tore_sichtbar', settings.sonntagToreSichtbar ? 'true' : 'false');
    updateSetting.run('24', 'anmeldung_aktiv', settings.anmeldungAktiv === false ? 'false' : 'true');
    updateSetting.run('25', 'ergebnis_tabellen_aktiv', settings.ergebnisTabellenAktiv ? 'true' : 'false');
    updateSetting.run('26', 'spielzeiten_automatisch', settings.spielzeitenAutomatisch === false ? 'false' : 'true');
    updateSetting.run('28', 'spielplan_timing_profil', normalizeSpielplanTimingProfil(settings.spielplanTimingProfil));
    updateSetting.run(
      '29',
      'spielplan_timing_overrides',
      JSON.stringify(normalizeSpielplanTimingOverrides(settings.spielplanTimingOverrides))
    );
    updateSetting.run(
      '27',
      'spielplan_zeitbloecke',
      JSON.stringify(normalizeSpielplanZeitbloecke(settings.spielplanZeitbloecke, scheduleSettings))
    );
    // Sicher speichern des Passkeys (in produktiver Umgebung sollte dieser gehasht werden)
    if (settings.adminPasskey) {
      updateSetting.run('19', 'admin_passkey', settings.adminPasskey);
    }
  });

  return transaction();
}

export function setSpielplanPublicationStatus(status: SpielplanStatus) {
  const db = getDatabase();
  const nextStatus = status === 'published' ? 'published' : 'draft';
  const publishedAt = nextStatus === 'published' ? new Date().toISOString() : '';
  const updateSetting = db.prepare(`
    INSERT OR REPLACE INTO einstellungen (id, key, value, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const transaction = db.transaction(() => {
    updateSetting.run('20', 'spielplan_status', nextStatus);
    updateSetting.run('21', 'spielplan_published_at', publishedAt);
  });

  transaction();

  return {
    spielplanStatus: nextStatus,
    spielplanPublishedAt: publishedAt || null,
  };
}

export function getSpielplanPublicationStatus() {
  const settings = getAdminSettings();

  return {
    spielplanStatus: settings.spielplanStatus as SpielplanStatus,
    spielplanPublishedAt: settings.spielplanPublishedAt as string | null,
  };
}

export function getStoredLiveTimers() {
  const db = getDatabase();
  cleanupStoredLiveTimers();

  const rows = db.prepare(`
    SELECT *
    FROM spiel_live_timers
  `).all() as Array<{
    spiel_id: string;
    live_time: string | null;
    status: string;
    start_time: number | null;
    elapsed_time: number | null;
    is_second_half: number | null;
    halbzeit_start_time: number | null;
    last_update: number;
  }>;

  return rows.reduce<Record<string, StoredLiveTimer>>((result, row) => {
    result[row.spiel_id] = {
      liveTime: row.live_time || '00:00',
      status: row.status,
      startTime: row.start_time ?? undefined,
      elapsedTime: row.elapsed_time ?? 0,
      isSecondHalf: Boolean(row.is_second_half),
      halbzeitStartTime: row.halbzeit_start_time ?? undefined,
      lastUpdate: row.last_update,
    };
    return result;
  }, {});
}

export function saveStoredLiveTimer(spielId: string, timer: Partial<StoredLiveTimer>) {
  const db = getDatabase();
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO spiel_live_timers (
      spiel_id,
      live_time,
      status,
      start_time,
      elapsed_time,
      is_second_half,
      halbzeit_start_time,
      last_update,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  return stmt.run(
    spielId,
    timer.liveTime || '00:00',
    timer.status || 'laufend',
    timer.startTime ?? null,
    timer.elapsedTime ?? 0,
    timer.isSecondHalf ? 1 : 0,
    timer.halbzeitStartTime ?? null,
    timer.lastUpdate || now
  );
}

export function deleteStoredLiveTimer(spielId: string) {
  const db = getDatabase();
  return db.prepare(`
    DELETE FROM spiel_live_timers
    WHERE spiel_id = ?
  `).run(spielId);
}

export function cleanupStoredLiveTimers(maxAgeMs = 12 * 60 * 60 * 1000) {
  const db = getDatabase();
  const cutoff = Date.now() - maxAgeMs;

  return db.prepare(`
    DELETE FROM spiel_live_timers
    WHERE last_update < ?
  `).run(cutoff);
}

// Erweiterte Statistiken
export function getStatistiken() {
  const db = getDatabase();

  const anmeldungen = db.prepare('SELECT COUNT(*) as count FROM anmeldungen').get() as { count: number };
  const teams = db.prepare('SELECT COUNT(*) as count FROM teams').get() as { count: number };
  const bezahlt = db.prepare('SELECT COUNT(*) as count FROM anmeldungen WHERE status = ?').get('bezahlt') as { count: number };
  const gesamtKosten = db.prepare('SELECT SUM(kosten) as total FROM anmeldungen').get() as { total: number };

  // Kategorien-Statistiken
  const kategorienStats = db.prepare(`
    SELECT kategorie, COUNT(*) as count
    FROM teams
    GROUP BY kategorie
  `).all() as { kategorie: string; count: number }[];

  const kategorien: { [key: string]: number } = {};
  kategorienStats.forEach(stat => {
    kategorien[stat.kategorie] = stat.count;
  });

  // Verwendete Felder
  const fieldsUsed = db.prepare(`
    SELECT COUNT(DISTINCT feld) as count
    FROM spiele
  `).get() as { count: number };

  return {
    anmeldungen: anmeldungen.count,
    teams: teams.count,
    bezahlt: bezahlt.count,
    gesamtKosten: gesamtKosten.total || 0,
    kategorien: kategorien,
    fieldsUsed: fieldsUsed.count
  };
}

export function updateSpiel(id: string, spielData: Partial<{
  datum: string;
  zeit: string;
  feld: string;
  kategorie: string;
  team1: string;
  team2: string;
  schiedsrichter: string | null;
  status: string;
  ergebnis: string;
}>) {
  const db = getDatabase();
  const allowedFields = new Set(['datum', 'zeit', 'feld', 'kategorie', 'team1', 'team2', 'schiedsrichter', 'status', 'ergebnis']);

  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(spielData)) {
    if (value !== undefined && allowedFields.has(key)) {
      fields.push(`${key} = ?`);
      values.push(key === 'schiedsrichter' ? normalizeOptionalText(value as string | null) : value);
    }
  }

  if (fields.length === 0) {
    return { changes: 0 };
  }

  values.push(id);

  const update = db.prepare(`
    UPDATE spiele
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  return update.run(...values);
}

export function deleteSpiel(id: string) {
  const db = getDatabase();

  const deleteStmt = db.prepare(`
    DELETE FROM spiele
    WHERE id = ?
  `);

  return deleteStmt.run(id);
}

// ===== HELFER-MANAGEMENT =====

export function getAllHelferBedarf() {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM helfer_bedarf
    ORDER BY datum ASC, startzeit ASC
  `);

  return stmt.all();
}

export function getAllHelferAnmeldungen() {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM helfer_anmeldungen
    ORDER BY created_at DESC
  `);

  return stmt.all();
}

export function getHelferLink() {
  return getHelferLinkRecord()?.value || '';
}

function getHelferLinkRecord() {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT value, updated_at FROM einstellungen
    WHERE key = 'helfer_link'
  `);

  return stmt.get() as { value: string; updated_at?: string } | undefined;
}

export function createHelferBedarf(bedarf: {
  titel: string;
  beschreibung: string;
  datum: string;
  startzeit: string;
  endzeit: string;
  anzahlBenötigt: number;
  kategorie: string;
  aktiv: boolean;
}) {
  const db = getDatabase();
  const id = createId('bedarf');

  const stmt = db.prepare(`
    INSERT INTO helfer_bedarf (
      id, titel, beschreibung, datum, startzeit, endzeit,
      anzahlBenötigt, kategorie, aktiv, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    id,
    bedarf.titel,
    bedarf.beschreibung,
    bedarf.datum,
    bedarf.startzeit,
    bedarf.endzeit,
    bedarf.anzahlBenötigt,
    bedarf.kategorie,
    bedarf.aktiv ? 1 : 0,
    new Date().toISOString()
  );

  return { id, ...result };
}

export function deleteHelferBedarf(bedarfId: string) {
  const db = getDatabase();

  // Zuerst zugehörige Anmeldungen löschen
  const deleteAnmeldungenStmt = db.prepare('DELETE FROM helfer_anmeldungen WHERE helferBedarfId = ?');
  deleteAnmeldungenStmt.run(bedarfId);

  // Dann den Bedarf löschen
  const deleteBedarfStmt = db.prepare('DELETE FROM helfer_bedarf WHERE id = ?');
  const result = deleteBedarfStmt.run(bedarfId);

  return result;
}

export function generateHelferLink() {
  const db = getDatabase();

  // Generiere geheimen Token
  const token = `hlf_${randomUUID().replace(/-/g, '')}`;
  const helferLink = `https://rasenturnier.sv-puschendorf.de/helfer/${token}`;

  // Einfachere Lösung: INSERT OR REPLACE mit expliziter ID
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO einstellungen (id, key, value, updated_at)
    VALUES (?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  stmt.run('helfer_link_id', 'helfer_link', helferLink, now);

  return helferLink;
}

export function updateHelferStatus(anmeldungId: string, status: string) {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE helfer_anmeldungen
    SET status = ?, updated_at = ?
    WHERE id = ?
  `);

  const result = stmt.run(status, new Date().toISOString(), anmeldungId);
  return result;
}

export function createHelferAnmeldung(anmeldung: {
  helferBedarfId: string;
  name: string;
  email: string;
  telefon?: string;
  bemerkung?: string;
  kuchenspende?: string;
}) {
  const db = getDatabase();
  const id = createId('ha');

  const stmt = db.prepare(`
    INSERT INTO helfer_anmeldungen (
      id, helferBedarfId, name, email, telefon, bemerkung, kuchenspende,
      status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'angemeldet', ?, ?)
  `);

  const now = new Date().toISOString();
  const result = stmt.run(
    id,
    anmeldung.helferBedarfId,
    anmeldung.name,
    anmeldung.email,
    anmeldung.telefon || null,
    anmeldung.bemerkung || null,
    anmeldung.kuchenspende || null,
    now,
    now
  );

  return { id, ...result };
}

export function getActiveHelferBedarf() {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM helfer_bedarf
    WHERE aktiv = 1
    ORDER BY datum ASC, startzeit ASC
  `);

  return stmt.all();
}

export function validateHelferToken(token: string) {
  const normalizedToken = token.trim();

  if (normalizedToken.length < 24) {
    return false;
  }

  const record = getHelferLinkRecord();
  const storedToken = record ? extractHelferToken(record.value) : '';

  if (!storedToken || storedToken !== normalizedToken) {
    return false;
  }

  if (!record?.updated_at) {
    return false;
  }

  const updatedAt = new Date(record.updated_at).getTime();
  const maxAgeMs = 90 * 24 * 60 * 60 * 1000;

  return Number.isFinite(updatedAt) && Date.now() - updatedAt <= maxAgeMs;
}

function extractHelferToken(helferLink: string) {
  try {
    const url = new URL(helferLink);
    return url.pathname.split('/').filter(Boolean).pop() || '';
  } catch {
    return helferLink.split('/').filter(Boolean).pop() || '';
  }
}

export function updateHelferBedarf(bedarfId: string, bedarf: Partial<{
  titel: string;
  beschreibung: string;
  datum: string;
  startzeit: string;
  endzeit: string;
  anzahlBenötigt: number;
  kategorie: string;
  aktiv: boolean;
}>) {
  const db = getDatabase();
  const allowedFields = new Set([
    'titel',
    'beschreibung',
    'datum',
    'startzeit',
    'endzeit',
    'anzahlBenötigt',
    'kategorie',
    'aktiv',
  ]);

  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(bedarf)) {
    if (value !== undefined && allowedFields.has(key)) {
      if (key === 'aktiv') {
        fields.push(`${key} = ?`);
        values.push(value ? 1 : 0);
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
  }

  if (fields.length === 0) {
    return { changes: 0 };
  }

  try {
    // Versuchen, updated_at hinzuzufügen, wenn die Spalte existiert
    try {
      const columns = db.prepare(`PRAGMA table_info(helfer_bedarf)`).all() as any[];
      const hasUpdatedAt = columns.some(column => column.name === 'updated_at');

      if (hasUpdatedAt) {
        fields.push('updated_at = ?');
        values.push(new Date().toISOString());
      }
    } catch (columnError) {
      console.warn('Konnte updated_at Spalte nicht überprüfen:', columnError);
      // Wenn wir nicht prüfen können, ob die Spalte existiert, versuchen wir es ohne updated_at
    }

    values.push(bedarfId);

    const stmt = db.prepare(`
      UPDATE helfer_bedarf
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    return stmt.run(...values);
  } catch (error) {
    console.error('Fehler beim Aktualisieren von helfer_bedarf:', error);
    throw error;
  }
}

export function getHelferAnmeldungenForBedarf(bedarfId: string) {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM helfer_anmeldungen
    WHERE helferBedarfId = ?
    ORDER BY created_at ASC
  `);

  return stmt.all(bedarfId);
}

export function getPublicHelferAnmeldungenForBedarf(bedarfId: string) {
  const rows = getHelferAnmeldungenForBedarf(bedarfId) as Array<{
    id: string;
    helferBedarfId: string;
    name: string;
    email: string;
    status: string;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    helferBedarfId: row.helferBedarfId,
    name: maskPublicHelperName(row.name),
    email: maskPublicEmail(row.email),
    status: row.status,
    created_at: row.created_at,
  }));
}

function maskPublicHelperName(name: string) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  const lastName = parts.at(-1);

  return lastName ? `*** ${lastName}` : 'Angemeldet';
}

function maskPublicEmail(email: string) {
  const domain = String(email || '').split('@')[1];

  return domain ? `***@${domain}` : '';
}

export function deleteHelferAnmeldung(anmeldungId: string) {
  const db = getDatabase();

  const stmt = db.prepare(`
    DELETE FROM helfer_anmeldungen
    WHERE id = ?
  `);

  return stmt.run(anmeldungId);
}

export function deleteAnmeldung(id: string) {
  const db = getDatabase();

  // Transaction um sicherzustellen, dass beide Löschungen erfolgreich sind
  const transaction = db.transaction(() => {
    // Zuerst alle Teams löschen, die zu dieser Anmeldung gehören
    const deleteTeams = db.prepare(`
      DELETE FROM teams
      WHERE anmeldung_id = ?
    `);

    // Dann die Anmeldung löschen
    const deleteAnmeldung = db.prepare(`
      DELETE FROM anmeldungen
      WHERE id = ?
    `);

    const teamsResult = deleteTeams.run(id);
    const anmeldungResult = deleteAnmeldung.run(id);

    return {
      teamsDeleted: teamsResult.changes,
      anmeldungDeleted: anmeldungResult.changes
    };
  });

  return transaction();
}

export function deleteAllSpiele() {
  const db = getDatabase();

  console.log('🧹 Lösche alle Spiele aus der Datenbank...');

  const deleteTimersStmt = db.prepare(`
    DELETE FROM spiel_live_timers
  `);
  const deleteStmt = db.prepare(`
    DELETE FROM spiele
  `);

  deleteTimersStmt.run();
  const result = deleteStmt.run();
  setSpielplanPublicationStatus('draft');

  console.log(`✅ ${result.changes} Spiele wurden aus der Datenbank gelöscht`);

  return {
    deleted: result.changes
  };
}

export function flushHelferDatabase() {
  const db = getDatabase();

  try {
    // Begin transaction
    db.exec('BEGIN TRANSACTION');

    // Delete all helper applications first (foreign key constraint)
    const deleteAnmeldungenStmt = db.prepare('DELETE FROM helfer_anmeldungen');
    const anmeldungenResult = deleteAnmeldungenStmt.run();

    // Delete all helper requirements
    const deleteBedarfStmt = db.prepare('DELETE FROM helfer_bedarf');
    const bedarfResult = deleteBedarfStmt.run();

    // Remove helper link from settings
    const deleteLinkStmt = db.prepare('DELETE FROM einstellungen WHERE key = ?');
    const linkResult = deleteLinkStmt.run('helfer_link');

    // Commit transaction
    db.exec('COMMIT');

    console.log('🗑️ Helper database flushed:', {
      anmeldungen: anmeldungenResult.changes,
      bedarf: bedarfResult.changes,
      link: linkResult.changes
    });

    return {
      anmeldungen: anmeldungenResult.changes,
      bedarf: bedarfResult.changes,
      link: linkResult.changes
    };
  } catch (error) {
    // Rollback on error
    db.exec('ROLLBACK');
    console.error('❌ Error flushing helper database:', error);
    throw error;
  }
}

export function createHelferDemoData() {
  const db = getDatabase();

  try {
    // Begin transaction
    db.exec('BEGIN TRANSACTION');

    // Demo helper requirements
    const demoData = [
      {
        titel: 'Turnier-Aufbau',
        beschreibung: 'Aufbau der Tore, Fahnen und Banden am Freitag Abend',
        datum: '2025-07-04',
        startzeit: '18:00',
        endzeit: '20:00',
        anzahlBenötigt: 8,
        kategorie: 'Aufbau',
        aktiv: true
      },
      {
        titel: 'Schiedsrichter Feld 1',
        beschreibung: 'Schiedsrichter für die Spiele auf Feld 1',
        datum: '2025-07-05',
        startzeit: '09:00',
        endzeit: '12:00',
        anzahlBenötigt: 2,
        kategorie: 'Schiedsrichter',
        aktiv: true
      },
      {
        titel: 'Getränkestand',
        beschreibung: 'Verkauf von Getränken und Snacks',
        datum: '2025-07-05',
        startzeit: '10:00',
        endzeit: '16:00',
        anzahlBenötigt: 4,
        kategorie: 'Verkauf',
        aktiv: true
      },
      {
        titel: 'Ergebnisdienst',
        beschreibung: 'Erfassung der Spielergebnisse und Tabellenpflege',
        datum: '2025-07-05',
        startzeit: '08:30',
        endzeit: '18:00',
        anzahlBenötigt: 2,
        kategorie: 'Organisation',
        aktiv: true
      },
      {
        titel: 'Schiedsrichter Feld 2+3',
        beschreibung: 'Schiedsrichter für die Spiele auf Feld 2 und 3',
        datum: '2025-07-06',
        startzeit: '09:00',
        endzeit: '15:00',
        anzahlBenötigt: 3,
        kategorie: 'Schiedsrichter',
        aktiv: true
      },
      {
        titel: 'Turnier-Abbau',
        beschreibung: 'Abbau aller Aufbauten nach dem Turnier',
        datum: '2025-07-06',
        startzeit: '17:00',
        endzeit: '19:00',
        anzahlBenötigt: 6,
        kategorie: 'Abbau',
        aktiv: true
      },
      {
        titel: 'Kuchenstand',
        beschreibung: 'Verkauf von Kuchen und Kaffee',
        datum: '2025-07-06',
        startzeit: '11:00',
        endzeit: '16:00',
        anzahlBenötigt: 3,
        kategorie: 'Verkauf',
        aktiv: true
      },
      {
        titel: 'Siegerehrung',
        beschreibung: 'Vorbereitung und Durchführung der Siegerehrung',
        datum: '2025-07-06',
        startzeit: '15:30',
        endzeit: '17:00',
        anzahlBenötigt: 2,
        kategorie: 'Organisation',
        aktiv: true
      }
    ];

    // Insert demo helper requirements
    const insertBedarfStmt = db.prepare(`
      INSERT INTO helfer_bedarf (
        id, titel, beschreibung, datum, startzeit, endzeit,
        anzahlBenötigt, kategorie, aktiv, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const bedarfIds: string[] = [];
    demoData.forEach((bedarf, index) => {
      const id = `demo_bedarf_${index + 1}_${Date.now()}`;
      bedarfIds.push(id);

      insertBedarfStmt.run(
        id,
        bedarf.titel,
        bedarf.beschreibung,
        bedarf.datum,
        bedarf.startzeit,
        bedarf.endzeit,
        bedarf.anzahlBenötigt,
        bedarf.kategorie,
        bedarf.aktiv ? 1 : 0,
        new Date().toISOString()
      );
    });

    // Demo helper applications
    const demoAnmeldungen = [
      {
        helferBedarfId: bedarfIds[0], // Turnier-Aufbau
        name: 'Max Mustermann',
        email: 'max.mustermann@example.com',
        telefon: '0123-456789',
        bemerkung: 'Bringe eigenes Werkzeug mit',
        status: 'angemeldet'
      },
      {
        helferBedarfId: bedarfIds[0], // Turnier-Aufbau
        name: 'Anna Schmidt',
        email: 'anna.schmidt@example.com',
        telefon: '0987-654321',
        bemerkung: '',
        status: 'bestätigt'
      },
      {
        helferBedarfId: bedarfIds[1], // Schiedsrichter Feld 1
        name: 'Peter Weber',
        email: 'peter.weber@example.com',
        telefon: '0555-123456',
        bemerkung: 'Lizenzierter Schiedsrichter',
        status: 'bestätigt'
      },
      {
        helferBedarfId: bedarfIds[2], // Getränkestand
        name: 'Lisa Müller',
        email: 'lisa.mueller@example.com',
        telefon: '0777-987654',
        bemerkung: 'Erfahrung im Verkauf',
        status: 'angemeldet'
      },
      {
        helferBedarfId: bedarfIds[2], // Getränkestand
        name: 'Tom Fischer',
        email: 'tom.fischer@example.com',
        telefon: '0444-555666',
        bemerkung: '',
        status: 'bestätigt'
      },
      {
        helferBedarfId: bedarfIds[6], // Kuchenstand
        name: 'Maria Becker',
        email: 'maria.becker@example.com',
        telefon: '0333-222111',
        bemerkung: '',
        kuchenspende: 'Apfelkuchen',
        status: 'angemeldet'
      }
    ];

    // Insert demo applications
    const insertAnmeldungStmt = db.prepare(`
      INSERT INTO helfer_anmeldungen (
        id, helferBedarfId, name, email, telefon, bemerkung, kuchenspende,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    demoAnmeldungen.forEach((anmeldung, index) => {
      const id = `demo_anmeldung_${index + 1}_${Date.now()}`;
      const now = new Date().toISOString();

      insertAnmeldungStmt.run(
        id,
        anmeldung.helferBedarfId,
        anmeldung.name,
        anmeldung.email,
        anmeldung.telefon || null,
        anmeldung.bemerkung || null,
        anmeldung.kuchenspende || null,
        anmeldung.status,
        now,
        now
      );
    });

    // Generate demo helper link
    const token = `demo_hlf_${randomUUID().replace(/-/g, '')}`;
    const helferLink = `https://rasenturnier.sv-puschendorf.de/helfer/${token}`;

    const insertLinkStmt = db.prepare(`
      INSERT OR REPLACE INTO einstellungen (id, key, value, updated_at)
      VALUES (?, ?, ?, ?)
    `);

    insertLinkStmt.run('helfer_link_id', 'helfer_link', helferLink, new Date().toISOString());

    // Commit transaction
    db.exec('COMMIT');

    console.log('🎭 Helper demo data created:', {
      bedarf: demoData.length,
      anmeldungen: demoAnmeldungen.length,
      helferLink
    });

    return {
      bedarf: demoData.length,
      anmeldungen: demoAnmeldungen.length,
      helferLink
    };
  } catch (error) {
    // Rollback on error
    db.exec('ROLLBACK');
    console.error('❌ Error creating helper demo data:', error);
    throw error;
  }
}

export function createAnmeldungenDemoData() {
  const db = getDatabase();

  try {
    // Begin transaction
    db.exec('BEGIN TRANSACTION');

    // Demo-Anmeldungen mit verschiedenen Leistungsstufen
    const demoAnmeldungen = [
      {
        verein: "SV Musterstadt",
        kontakt: "Thomas Müller",
        email: "thomas.mueller@sv-musterstadt.de",
        mobil: "0170-1234567",
        teams: [
          { kategorie: "E-Jugend", anzahl: 2, schiri: false, spielstaerke: "Anfänger" },
          { kategorie: "D-Jugend männlich", anzahl: 1, schiri: true, spielstaerke: "Standard" }
        ],
        status: "angemeldet"
      },
      {
        verein: "FC Beispielheim",
        kontakt: "Andrea Schmidt",
        email: "a.schmidt@fc-beispielheim.de",
        mobil: "0171-2345678",
        teams: [
          { kategorie: "E-Jugend", anzahl: 1, schiri: false, spielstaerke: "Standard" },
          { kategorie: "C-Jugend weiblich", anzahl: 1, schiri: true, spielstaerke: "Standard" },
          { kategorie: "Mini", anzahl: 2, schiri: false, spielstaerke: "Anfänger" }
        ],
        status: "bezahlt"
      },
      {
        verein: "TSV Demostadt",
        kontakt: "Michael Weber",
        email: "m.weber@tsv-demostadt.de",
        mobil: "0172-3456789",
        teams: [
          { kategorie: "B-Jugend männlich", anzahl: 1, schiri: true, spielstaerke: "Leistung" },
          { kategorie: "A-Jugend männlich", anzahl: 1, schiri: false, spielstaerke: "Standard" }
        ],
        status: "bezahlt"
      },
      {
        verein: "SpVgg Testdorf",
        kontakt: "Sandra Klein",
        email: "sandra.klein@spvgg-testdorf.de",
        mobil: "0173-4567890",
        teams: [
          { kategorie: "E-Jugend", anzahl: 3, schiri: false, spielstaerke: "Anfänger" },
          { kategorie: "D-Jugend weiblich", anzahl: 1, schiri: true, spielstaerke: "Standard" }
        ],
        status: "angemeldet"
      },
      {
        verein: "1. FC Probehausen",
        kontakt: "Robert Fischer",
        email: "r.fischer@fc-probehausen.de",
        mobil: "0174-5678901",
        teams: [
          { kategorie: "C-Jugend männlich", anzahl: 2, schiri: true, spielstaerke: "Standard" },
          { kategorie: "B-Jugend weiblich", anzahl: 1, schiri: false, spielstaerke: "Leistung" }
        ],
        status: "bezahlt"
      },
      {
        verein: "SG Vereinsheim",
        kontakt: "Julia Bauer",
        email: "j.bauer@sg-vereinsheim.de",
        mobil: "0175-6789012",
        teams: [
          { kategorie: "Mini", anzahl: 1, schiri: false, spielstaerke: "Anfänger" },
          { kategorie: "E-Jugend", anzahl: 1, schiri: false, spielstaerke: "Standard" },
          { kategorie: "A-Jugend weiblich", anzahl: 1, schiri: true, spielstaerke: "Leistung" }
        ],
        status: "angemeldet"
      },
      {
        verein: "FC Kickersdorf",
        kontakt: "Daniel Koch",
        email: "d.koch@fc-kickersdorf.de",
        mobil: "0176-7890123",
        teams: [
          { kategorie: "D-Jugend männlich", anzahl: 2, schiri: false, spielstaerke: "Anfänger" },
          { kategorie: "C-Jugend weiblich", anzahl: 1, schiri: true, spielstaerke: "Standard" }
        ],
        status: "bezahlt"
      },
      {
        verein: "TSG Ballspiel",
        kontakt: "Lisa Wagner",
        email: "l.wagner@tsg-ballspiel.de",
        mobil: "0177-8901234",
        teams: [
          { kategorie: "E-Jugend", anzahl: 2, schiri: false, spielstaerke: "Standard" },
          { kategorie: "B-Jugend männlich", anzahl: 1, schiri: true, spielstaerke: "Leistung" }
        ],
        status: "angemeldet"
      }
    ];

    const insertAnmeldungStmt = db.prepare(`
      INSERT INTO anmeldungen (id, verein, kontakt, email, mobil, kosten, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTeamStmt = db.prepare(`
      INSERT INTO teams (id, anmeldung_id, kategorie, anzahl, schiri, schiri_name, spielstaerke)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const anmeldungIds: string[] = [];

    demoAnmeldungen.forEach((anmeldung) => {
      const anmeldungId = createId('demo_anm');
      anmeldungIds.push(anmeldungId);

      const gesamtKosten = calculateRegistrationCost(anmeldung.teams);

      const now = new Date().toISOString();

      // Anmeldung einfügen
      insertAnmeldungStmt.run(
        anmeldungId,
        anmeldung.verein,
        anmeldung.kontakt,
        anmeldung.email,
        anmeldung.mobil,
        gesamtKosten,
        anmeldung.status,
        now,
        now
      );

      // Teams einfügen
      anmeldung.teams.forEach((team) => {
        const teamId = createId('demo_team');

        insertTeamStmt.run(
          teamId,
          anmeldungId,
          team.kategorie,
          team.anzahl,
          team.schiri ? 1 : 0,
          null,
          team.spielstaerke
        );
      });
    });

    // Commit transaction
    db.exec('COMMIT');

    console.log('🏆 Anmeldungen demo data created:', {
      anmeldungen: demoAnmeldungen.length,
      totalTeams: demoAnmeldungen.reduce((sum, anm) => sum + anm.teams.reduce((teamSum, team) => teamSum + team.anzahl, 0), 0),
      leistungsstufen: ['Anfänger', 'Standard', 'Leistung']
    });

    return {
      anmeldungen: demoAnmeldungen.length,
      totalTeams: demoAnmeldungen.reduce((sum, anm) => sum + anm.teams.reduce((teamSum, team) => teamSum + team.anzahl, 0), 0)
    };
  } catch (error) {
    // Rollback on error
    db.exec('ROLLBACK');
    console.error('❌ Error creating anmeldungen demo data:', error);
    throw error;
  }
}

export function flushAnmeldungenDatabase() {
  const db = getDatabase();

  try {
    // Begin transaction
    db.exec('BEGIN TRANSACTION');

    // Delete teams first (foreign key constraint)
    const deleteTeamsStmt = db.prepare('DELETE FROM teams');
    const teamsResult = deleteTeamsStmt.run();

    // Delete anmeldungen
    const deleteAnmeldungenStmt = db.prepare('DELETE FROM anmeldungen');
    const anmeldungenResult = deleteAnmeldungenStmt.run();

    // Commit transaction
    db.exec('COMMIT');

    console.log('🗑️ Anmeldungen database flushed:', {
      teams: teamsResult.changes,
      anmeldungen: anmeldungenResult.changes
    });

    return {
      teams: teamsResult.changes,
      anmeldungen: anmeldungenResult.changes
    };
  } catch (error) {
    // Rollback on error
    db.exec('ROLLBACK');
    console.error('❌ Error flushing anmeldungen database:', error);
    throw error;
  }
}
