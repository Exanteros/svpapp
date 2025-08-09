// @ts-nocheck
import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function getDatabase() {
  if (!db) {
    db = new Database(path.join(process.cwd(), 'database.sqlite'), {
      // Memory optimization for low-resource servers
      readonly: false,
      fileMustExist: false,
      timeout: parseInt(process.env.DB_TIMEOUT || '5000'),
    });
    
    // Memory and performance optimizations
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL'); // Faster writes
    db.pragma('cache_size = -2000'); // 2MB cache (reduced from default)
    db.pragma('temp_store = memory');
    db.pragma('mmap_size = 67108864'); // 64MB mmap
    
    // Connection pool simulation for SQLite
    const poolSize = parseInt(process.env.DB_POOL_SIZE || '3');
    db.pragma(`busy_timeout = ${poolSize * 1000}`);
    
    // Tabellen erstellen
    initializeTables();
  }
  return db;
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
      ergebnis TEXT,
      tore_team1 INTEGER DEFAULT 0,
      tore_team2 INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add columns if they don't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE spiele ADD COLUMN tore_team1 INTEGER DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore error
  }
  
  try {
    db.exec(`ALTER TABLE spiele ADD COLUMN tore_team2 INTEGER DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore error
  }
  
  // Turnier-Einstellungen Tabelle
  db.exec(`
    CREATE TABLE IF NOT EXISTS einstellungen (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Admin-Einstellungen Tabelle (für Feld-Einstellungen etc.)
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      key TEXT PRIMARY KEY,
      einstellungen TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  
  // Spiel-Feld-Zuordnungen Tabelle (für Tag-spezifische Beschränkungen)
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
  
  // Standard-Einstellungen einfügen
  const insertEinstellung = db.prepare(`
    INSERT OR IGNORE INTO einstellungen (id, key, value) VALUES (?, ?, ?)
  `);
  
  insertEinstellung.run('1', 'turnier_name', 'Rasenturnier Puschendorf 2025');
  insertEinstellung.run('2', 'startgeld', '25');
  insertEinstellung.run('3', 'schiri_geld', '20');
  insertEinstellung.run('4', 'anzahl_felder', '4');
  insertEinstellung.run('5', 'anmeldeschluss', '2025-06-30');
  insertEinstellung.run('6', 'turnier_datum_1', '2025-07-05');
  insertEinstellung.run('7', 'turnier_datum_2', '2025-07-06');
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
  }[];
  kosten: number;
}

export function createAnmeldung(anmeldungData: AnmeldungData): string {
  const db = getDatabase();
  
  const anmeldungId = `anm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
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
      INSERT INTO teams (id, anmeldung_id, kategorie, anzahl, schiri, spielstaerke)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    for (const team of anmeldungData.teams) {
      const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      insertTeam.run(
        teamId,
        anmeldungId,
        team.kategorie,
        team.anzahl,
        team.schiri ? 1 : 0,
        team.spielstaerke || null
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
  `).all();
  
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
    SET status = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `);
  
  return update.run(status, id);
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
}) {
  const db = getDatabase();
  
  const spielId = `spiel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const insert = db.prepare(`
    INSERT INTO spiele (id, datum, zeit, feld, kategorie, team1, team2, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'geplant')
  `);
  
  insert.run(
    spielId,
    spielData.datum,
    spielData.zeit,
    spielData.feld,
    spielData.kategorie,
    spielData.team1,
    spielData.team2
  );
  
  return spielId;
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
  `).all();
  
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

export function getStatistiken() {
  const db = getDatabase();
  
  const anmeldungenCount = db.prepare(`
    SELECT COUNT(*) as count FROM anmeldungen
  `).get() as { count: number };
  
  const teamsCount = db.prepare(`
    SELECT SUM(anzahl) as count FROM teams
  `).get() as { count: number };
  
  const bezahltCount = db.prepare(`
    SELECT COUNT(*) as count FROM anmeldungen WHERE status = 'bezahlt'
  `).get() as { count: number };
  
  const gesamtKosten = db.prepare(`
    SELECT SUM(kosten) as total FROM anmeldungen
  `).get() as { total: number };
  
  return {
    anmeldungen: anmeldungenCount.count,
    teams: teamsCount.count || 0,
    bezahlt: bezahltCount.count,
    gesamtKosten: gesamtKosten.total || 0
  };
}

// Funktionen für Tag-spezifische Feld-Jahrgang-Zuordnungen
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
    SELECT * FROM feld_jahrgang_zuordnungen ORDER BY datum, feld_id, jahrgang
  `).all();
  
  // Gruppiere nach Feld und Datum
  const gruppiert: { [feldId: string]: { [datum: string]: string[] } } = {};
  
  for (const zuordnung of zuordnungen) {
    if (!gruppiert[zuordnung.feld_id]) {
      gruppiert[zuordnung.feld_id] = {};
    }
    if (!gruppiert[zuordnung.feld_id][zuordnung.datum]) {
      gruppiert[zuordnung.feld_id][zuordnung.datum] = [];
    }
    gruppiert[zuordnung.feld_id][zuordnung.datum].push(zuordnung.jahrgang);
  }
  
  return gruppiert;
}
