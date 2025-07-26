import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET() {
  try {
    const db = getDatabase();
    
    // Helfer-Bedarf Tabelle erstellen falls nicht vorhanden
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
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Helfer-Anmeldungen Tabelle erstellen falls nicht vorhanden
    db.exec(`
      CREATE TABLE IF NOT EXISTS helfer_anmeldungen (
        id TEXT PRIMARY KEY,
        helferBedarfId TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        telefon TEXT,
        bemerkung TEXT,
        status TEXT NOT NULL DEFAULT 'angemeldet',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (helferBedarfId) REFERENCES helfer_bedarf(id)
      )
    `);

    // Einstellungen Tabelle erstellen falls nicht vorhanden
    db.exec(`
      CREATE TABLE IF NOT EXISTS einstellungen (
        schluessel TEXT PRIMARY KEY,
        wert TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Helfer-Bedarf laden
    const bedarfStmt = db.prepare(`
      SELECT * FROM helfer_bedarf 
      ORDER BY datum ASC, startzeit ASC
    `);
    const bedarf = bedarfStmt.all();

    // Helfer-Anmeldungen laden
    const anmeldungenStmt = db.prepare(`
      SELECT * FROM helfer_anmeldungen 
      ORDER BY created_at DESC
    `);
    const anmeldungen = anmeldungenStmt.all();

    // Helfer-Link laden (falls vorhanden)
    const linkStmt = db.prepare(`
      SELECT wert FROM einstellungen 
      WHERE schluessel = 'helfer_link'
    `);
    const linkResult = linkStmt.get() as { wert: string } | undefined;
    const helferLink = linkResult?.wert || '';

    return NextResponse.json({
      bedarf,
      anmeldungen,
      helferLink
    });
  } catch (error) {
    console.error('Fehler beim Laden der Helfer-Daten:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Helfer-Daten' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, ...data } = await request.json();

    switch (action) {
      case 'save_bedarf':
        return await saveHelferBedarf(data.bedarf);
      case 'delete_bedarf':
        return await deleteHelferBedarf(data.bedarfId);
      case 'generate_link':
        return await generateHelferLink();
      case 'update_status':
        return await updateHelferStatus(data.anmeldungId, data.status);
      default:
        return NextResponse.json(
          { error: 'Unbekannte Aktion' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Fehler bei der Helfer-API:', error);
    return NextResponse.json(
      { error: 'Serverfehler' },
      { status: 500 }
    );
  }
}

async function saveHelferBedarf(bedarf: any) {
  try {
    const db = getDatabase();
    const id = 'bedarf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const stmt = db.prepare(`
      INSERT INTO helfer_bedarf (
        id, titel, beschreibung, datum, startzeit, endzeit, 
        anzahlBenötigt, kategorie, aktiv, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
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

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Fehler beim Speichern des Helfer-Bedarfs:', error);
    return NextResponse.json(
      { error: 'Fehler beim Speichern' },
      { status: 500 }
    );
  }
}

async function deleteHelferBedarf(bedarfId: string) {
  try {
    const db = getDatabase();
    
    const deleteBedarfStmt = db.prepare('DELETE FROM helfer_bedarf WHERE id = ?');
    deleteBedarfStmt.run(bedarfId);
    
    // Auch zugehörige Anmeldungen löschen
    const deleteAnmeldungenStmt = db.prepare('DELETE FROM helfer_anmeldungen WHERE helferBedarfId = ?');
    deleteAnmeldungenStmt.run(bedarfId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen des Helfer-Bedarfs:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen' },
      { status: 500 }
    );
  }
}

async function generateHelferLink() {
  try {
    const db = getDatabase();
    
    // Generiere geheimen Token
    const token = 'hlf_' + Math.random().toString(36).substr(2, 20) + Date.now().toString(36);
    const helferLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/helfer/${token}`;
    
    // Speichere den Link in der Datenbank
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO einstellungen (schluessel, wert, updated_at) 
      VALUES ('helfer_link', ?, ?)
    `);
    stmt.run(helferLink, new Date().toISOString());

    return NextResponse.json({ helferLink });
  } catch (error) {
    console.error('Fehler beim Generieren des Helfer-Links:', error);
    return NextResponse.json(
      { error: 'Fehler beim Generieren des Links' },
      { status: 500 }
    );
  }
}

async function updateHelferStatus(anmeldungId: string, status: string) {
  try {
    const db = getDatabase();
    
    const stmt = db.prepare(`
      UPDATE helfer_anmeldungen 
      SET status = ?, updated_at = ? 
      WHERE id = ?
    `);
    stmt.run(status, new Date().toISOString(), anmeldungId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Helfer-Status:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren' },
      { status: 500 }
    );
  }
}
