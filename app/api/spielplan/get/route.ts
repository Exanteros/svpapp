import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

interface Spiel {
  id: string;
  datum: string;
  zeit: string;
  feld: string;
  kategorie: string;
  team1: string;
  team2: string;
  status: string;
  ergebnis?: string;
  tore_team1?: number;
  tore_team2?: number;
}

export async function GET() {
  try {
    const db = getDatabase();
    
    const spiele = db.prepare(`
      SELECT 
        *,
        CASE 
          WHEN tore_team1 IS NOT NULL AND tore_team2 IS NOT NULL 
          THEN tore_team1 || ':' || tore_team2 
          ELSE NULL 
        END as ergebnis
      FROM spiele 
      ORDER BY datum, zeit, feld
    `).all() as Spiel[];
    
    // Holen aller verfügbaren Felder
    const fields = db.prepare(`
      SELECT DISTINCT feld FROM spiele
      ORDER BY feld
    `).all() as Array<{feld: string}>;
    
    const availableFields = fields.map(f => f.feld);
    
    // Lade die Turnier-Einstellungen für die Daten und Zeiten
    const einstellungen = db.prepare(`
      SELECT key, value FROM einstellungen 
      WHERE key IN ('samstagStartzeit', 'samstagEndzeit', 'sonntagStartzeit', 'sonntagEndzeit', 'samstagDatum', 'sonntagDatum', 'turnier_start_datum', 'turnier_end_datum')
    `).all() as Array<{key: string, value: string}>;
    
    // Parse die Einstellungen
    const settings: { [key: string]: string } = {};
    einstellungen.forEach(setting => {
      settings[setting.key] = setting.value;
    });
    
    // Fallback-Werte und Kompatibilität mit beiden Namenskonventionen
    const samstagStartzeit = settings.samstagStartzeit || '09:00';
    const samstagEndzeit = settings.samstagEndzeit || '18:00';
    const sonntagStartzeit = settings.sonntagStartzeit || '09:00';
    const sonntagEndzeit = settings.sonntagEndzeit || '18:00';
    
    // Verwende die tatsächlichen Turnierdaten aus der Datenbank
    const samstagDatum = settings.samstagDatum || settings.turnier_start_datum || '2025-07-14';
    const sonntagDatum = settings.sonntagDatum || settings.turnier_end_datum || '2025-07-15';
    
    // Spiele nach Datum gruppieren (verwende die konfigurierten Daten)
    const samstag = spiele.filter((spiel: Spiel) => spiel.datum === samstagDatum);
    const sonntag = spiele.filter((spiel: Spiel) => spiel.datum === sonntagDatum);
    
    // Formatiere die Datumsanzeige
    const formatDatum = (dateString: string) => {
      try {
        const date = new Date(`${dateString}T12:00:00`);
        const weekday = date.toLocaleDateString('de-DE', { weekday: 'long' });
        const formattedDate = date.toLocaleDateString('de-DE', { 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric' 
        });
        return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${formattedDate}`;
      } catch (error) {
        return dateString;
      }
    };
    
    const response = {
      samstag: {
        datum: formatDatum(samstagDatum),
        zeit: `${samstagStartzeit} - ${samstagEndzeit} Uhr`,
        spiele: samstag
      },
      sonntag: {
        datum: formatDatum(sonntagDatum), 
        zeit: `${sonntagStartzeit} - ${sonntagEndzeit} Uhr`,
        spiele: sonntag
      },
      availableFields: availableFields.length > 0 ? availableFields : ['Feld 1', 'Feld 2', 'Feld 3', 'Feld 4', 'Beachfeld']
    };
    
    // Setze No-Cache Headers um sicherzustellen, dass immer aktuelle Daten geladen werden
    const headers = new Headers();
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    
    return NextResponse.json(response, { headers });
  } catch (error) {
    console.error('Error fetching spielplan:', error);
    
    // Fallback mit aktuellen Daten
    const headers = new Headers();
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    
    return NextResponse.json({
      samstag: {
        datum: "Montag, 14. Juli 2025",
        zeit: "09:00 - 18:00 Uhr",
        spiele: []
      },
      sonntag: {
        datum: "Dienstag, 15. Juli 2025",
        zeit: "09:00 - 18:00 Uhr", 
        spiele: []
      },
      availableFields: ['Feld 1', 'Feld 2', 'Feld 3', 'Feld 4', 'Beachfeld']
    }, { headers });
  }
}
