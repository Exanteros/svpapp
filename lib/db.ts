import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

// Funktion zur Ausführung von Datenbank-Migrationen
function runMigrations(database: Database.Database) {
  console.log('Führe Datenbank-Migrationen aus...');
  
  // Migration: Stelle sicher, dass helfer_bedarf eine updated_at Spalte hat
  try {
    const columns = database.prepare(`PRAGMA table_info(helfer_bedarf)`).all() as any[];
    const hasUpdatedAt = columns.some(column => column.name === 'updated_at');
    
    if (!hasUpdatedAt) {
      console.log('Migration: Füge updated_at Spalte zur helfer_bedarf-Tabelle hinzu...');
      database.exec(`ALTER TABLE helfer_bedarf ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP`);
      console.log('Migration: updated_at Spalte erfolgreich hinzugefügt');
    } else {
      console.log('Migration: updated_at Spalte existiert bereits');
    }
  } catch (error) {
    // Falls die Tabelle noch nicht existiert, ist das kein Fehler (wird später erstellt)
    console.log('Migration: Konnte updated_at nicht prüfen - möglicherweise existiert die Tabelle noch nicht');
  }
  
  console.log('Datenbank-Migrationen abgeschlossen');
}

// Datenbank-Verbindung herstellen
export function getDatabase() {
  if (!db) {
    db = new Database(path.join(process.cwd(), 'database.sqlite'));
    
    // WAL-Modus für bessere Concurrency
    db.pragma('journal_mode = WAL');
    
    // Tabellen erstellen
    initializeTables();
    
    // Datenbankmigrationen ausführen
    migrateDatabase();
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
  
  insertEinstellung.run('1', 'turnier_name', 'Rasenturnier Puschendorf 2025');
  insertEinstellung.run('2', 'startgeld', '25');
  insertEinstellung.run('3', 'schiri_geld', '20');
  insertEinstellung.run('4', 'anzahl_felder', '4');
  insertEinstellung.run('5', 'anmeldeschluss', '2025-06-30');
  insertEinstellung.run('6', 'turnier_datum_1', '2025-07-05');
  insertEinstellung.run('7', 'turnier_datum_2', '2025-07-06');

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

  // Migration: Spalte kuchenspende hinzufügen falls sie nicht existiert
  try {
    db.exec(`ALTER TABLE helfer_anmeldungen ADD COLUMN kuchenspende TEXT`);
  } catch (error) {
    // Spalte existiert bereits oder anderer Fehler - ignorieren
  }
  
  // Migrations-Tabelle erstellen
  db.exec(`
    CREATE TABLE IF NOT EXISTS db_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Strukturierte Migrationen ausführen
  runStructuredMigrations();
}  /**
   * Führt strukturierte Datenbankmigrationen aus, um die Struktur zu aktualisieren
   */
  function runStructuredMigrations() {
    if (!db) return;
    
    console.log('🔄 Prüfe strukturierte Datenbankmigrationen...');
    
    // Liste aller Migrationen
    const migrations = [
      {
        name: 'add_updated_at_to_helfer_bedarf',
        run: () => {
          try {
            // Prüfen, ob die Spalte bereits existiert
            const columns = db!.prepare(`PRAGMA table_info(helfer_bedarf)`).all() as any[];
            const columnExists = columns.some(column => column.name === 'updated_at');
            
            if (!columnExists) {
              console.log('🔧 Migration: Füge updated_at zu helfer_bedarf hinzu');
              db!.exec(`ALTER TABLE helfer_bedarf ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP`);
            }
          } catch (error) {
            console.error('❌ Fehler bei Migration add_updated_at_to_helfer_bedarf:', error);
          }
        }
      },
      {
        name: 'add_created_at_to_teams',
        run: () => {
          try {
            // Prüfen, ob die Spalte bereits existiert
            const columns = db!.prepare(`PRAGMA table_info(teams)`).all() as any[];
            const columnExists = columns.some(column => column.name === 'created_at');
            
            if (!columnExists) {
              console.log('🔧 Migration: Füge created_at zu teams hinzu');
              db!.exec(`ALTER TABLE teams ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
            }
          } catch (error) {
            console.error('❌ Fehler bei Migration add_created_at_to_teams:', error);
          }
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
    
    // Check if anmeldungen table has updated_at column
    const anmeldungenColumns = db.prepare(`PRAGMA table_info(anmeldungen)`).all() as any[];
    const hasUpdatedAt = anmeldungenColumns.some(col => col.name === 'updated_at');
    
    if (!hasUpdatedAt) {
      console.log('➕ Adding updated_at column to anmeldungen table...');
      db.exec(`ALTER TABLE anmeldungen ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
    }
    
    // Check if teams table has created_at column
    const teamsColumns = db.prepare(`PRAGMA table_info(teams)`).all() as any[];
    const teamsHasCreatedAt = teamsColumns.some(col => col.name === 'created_at');
    
    if (!teamsHasCreatedAt) {
      console.log('➕ Adding created_at column to teams table...');
      db.exec(`ALTER TABLE teams ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
    }
    
    console.log('✅ Database migrations completed');
  } catch (error) {
    console.warn('⚠️ Database migration warning:', error);
    // Don't throw - continue with existing schema
  }
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

// Admin-Einstellungen verwalten
export function getAdminSettings() {
  const db = getDatabase();
  const settings = db.prepare(`
    SELECT key, value FROM einstellungen
  `).all();
  
  const result: any = {
    turnierName: 'Rasenturnier Puschendorf 2025',
    startgeld: 25,
    schiriGeld: 20,
    maxTeamsProKategorie: 8,
    anmeldeschluss: '2025-06-30',
    anzahlFelder: 4,
    spielzeit: 12,
    pausenzeit: 3,
    adminEmail: 'admin@sv-puschendorf.de',
    automatischeEmails: true,
    sichtbarkeit: 'public' as const,
    zahlungsarten: ['Überweisung', 'PayPal', 'Barzahlung'],
    datenschutz: true,
    turnierStartDatum: '2025-07-05',
    turnierEndDatum: '2025-07-06',
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
      case 'admin_passkey':
        result.adminPasskey = setting.value;
        break;
    }
  });

  return result;
}

export function saveAdminSettings(settings: any) {
  const db = getDatabase();
  const updateSetting = db.prepare(`
    INSERT OR REPLACE INTO einstellungen (id, key, value, updated_at) 
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const transaction = db.transaction(() => {
    updateSetting.run('1', 'turnier_name', settings.turnierName);
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
    updateSetting.run('15', 'samstagStartzeit', settings.samstagStartzeit || '09:00');
    updateSetting.run('16', 'samstagEndzeit', settings.samstagEndzeit || '18:00');
    updateSetting.run('17', 'sonntagStartzeit', settings.sonntagStartzeit || '09:00');
    updateSetting.run('18', 'sonntagEndzeit', settings.sonntagEndzeit || '18:00');
    // Sicher speichern des Passkeys (in produktiver Umgebung sollte dieser gehasht werden)
    if (settings.adminPasskey) {
      updateSetting.run('19', 'admin_passkey', settings.adminPasskey);
    }
  });

  return transaction();
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
  status: string;
  ergebnis: string;
}>) {
  const db = getDatabase();
  
  const fields = [];
  const values = [];
  
  for (const [key, value] of Object.entries(spielData)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
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
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT value FROM einstellungen 
    WHERE key = 'helfer_link'
  `);
  
  const result = stmt.get() as { value: string } | undefined;
  return result?.value || '';
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
  const id = 'bedarf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
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
  const token = 'hlf_' + Math.random().toString(36).substr(2, 20) + Date.now().toString(36);
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
  const id = 'ha_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
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
  const helferLink = getHelferLink();
  return helferLink.includes(token);
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
  
  const fields = [];
  const values = [];
  
  for (const [key, value] of Object.entries(bedarf)) {
    if (value !== undefined) {
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
  
  const deleteStmt = db.prepare(`
    DELETE FROM spiele
  `);
  
  const result = deleteStmt.run();
  
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
    const token = 'demo_hlf_' + Math.random().toString(36).substr(2, 20);
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
          { kategorie: "D-Jugend männlich", anzahl: 1, schiri: true, spielstaerke: "Fortgeschritten" }
        ],
        status: "angemeldet"
      },
      {
        verein: "FC Beispielheim",
        kontakt: "Andrea Schmidt",
        email: "a.schmidt@fc-beispielheim.de",
        mobil: "0171-2345678",
        teams: [
          { kategorie: "E-Jugend", anzahl: 1, schiri: false, spielstaerke: "Fortgeschritten" },
          { kategorie: "C-Jugend weiblich", anzahl: 1, schiri: true, spielstaerke: "Erfahren" },
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
          { kategorie: "B-Jugend männlich", anzahl: 1, schiri: true, spielstaerke: "Sehr erfahren" },
          { kategorie: "A-Jugend männlich", anzahl: 1, schiri: false, spielstaerke: "Erfahren" }
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
          { kategorie: "D-Jugend weiblich", anzahl: 1, schiri: true, spielstaerke: "Fortgeschritten" }
        ],
        status: "angemeldet"
      },
      {
        verein: "1. FC Probehausen",
        kontakt: "Robert Fischer",
        email: "r.fischer@fc-probehausen.de",
        mobil: "0174-5678901",
        teams: [
          { kategorie: "C-Jugend männlich", anzahl: 2, schiri: true, spielstaerke: "Erfahren" },
          { kategorie: "B-Jugend weiblich", anzahl: 1, schiri: false, spielstaerke: "Sehr erfahren" }
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
          { kategorie: "E-Jugend", anzahl: 1, schiri: false, spielstaerke: "Fortgeschritten" },
          { kategorie: "A-Jugend weiblich", anzahl: 1, schiri: true, spielstaerke: "Sehr erfahren" }
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
          { kategorie: "C-Jugend weiblich", anzahl: 1, schiri: true, spielstaerke: "Fortgeschritten" }
        ],
        status: "bezahlt"
      },
      {
        verein: "TSG Ballspiel",
        kontakt: "Lisa Wagner",
        email: "l.wagner@tsg-ballspiel.de",
        mobil: "0177-8901234",
        teams: [
          { kategorie: "E-Jugend", anzahl: 2, schiri: false, spielstaerke: "Erfahren" },
          { kategorie: "B-Jugend männlich", anzahl: 1, schiri: true, spielstaerke: "Sehr erfahren" }
        ],
        status: "angemeldet"
      }
    ];
    
    // Berechne Startgeld (25€) und Schiedsrichtergeld (20€)
    const STARTGELD = 25;
    const SCHIRI_GELD = 20;
    
    const insertAnmeldungStmt = db.prepare(`
      INSERT INTO anmeldungen (id, verein, kontakt, email, mobil, kosten, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertTeamStmt = db.prepare(`
      INSERT INTO teams (id, anmeldung_id, kategorie, anzahl, schiri, spielstaerke)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const anmeldungIds: string[] = [];
    
    demoAnmeldungen.forEach((anmeldung, index) => {
      const anmeldungId = `demo_anm_${index + 1}_${Date.now()}`;
      anmeldungIds.push(anmeldungId);
      
      // Berechne Gesamtkosten
      let gesamtKosten = 0;
      anmeldung.teams.forEach(team => {
        gesamtKosten += team.anzahl * STARTGELD;
        if (team.schiri) {
          gesamtKosten -= SCHIRI_GELD; // Schiedsrichter-Rabatt
        }
      });
      
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
      anmeldung.teams.forEach((team, teamIndex) => {
        const teamId = `demo_team_${index + 1}_${teamIndex + 1}_${Date.now()}`;
        
        insertTeamStmt.run(
          teamId,
          anmeldungId,
          team.kategorie,
          team.anzahl,
          team.schiri ? 1 : 0,
          team.spielstaerke
        );
      });
    });
    
    // Commit transaction
    db.exec('COMMIT');
    
    console.log('🏆 Anmeldungen demo data created:', {
      anmeldungen: demoAnmeldungen.length,
      totalTeams: demoAnmeldungen.reduce((sum, anm) => sum + anm.teams.reduce((teamSum, team) => teamSum + team.anzahl, 0), 0),
      leistungsstufen: ['Anfänger', 'Fortgeschritten', 'Erfahren', 'Sehr erfahren']
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
