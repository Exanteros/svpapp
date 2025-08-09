import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { verifyApiAuth } from '@/lib/dal';

interface FeldEinstellungen {
  id: string;
  name: string;
  spielzeit: number;
  pausenzeit: number;
  halbzeitpause: number;
  zweiHalbzeiten: boolean;
  erlaubteJahrgaenge: string[];
  erlaubteJahrgaengeProTag?: {
    [datum: string]: string[];
  };
}

// Default fallback configuration
const DEFAULT_FELD_EINSTELLUNGEN: FeldEinstellungen[] = [
  {
    id: 'feld1',
    name: 'Feld 1',
    spielzeit: 10,
    pausenzeit: 2,
    halbzeitpause: 0,
    zweiHalbzeiten: false,
    erlaubteJahrgaenge: [],
    erlaubteJahrgaengeProTag: {}
  },
  {
    id: 'feld2',
    name: 'Feld 2',
    spielzeit: 12,
    pausenzeit: 3,
    halbzeitpause: 0,
    zweiHalbzeiten: false,
    erlaubteJahrgaenge: [],
    erlaubteJahrgaengeProTag: {}
  },
  {
    id: 'feld3',
    name: 'Feld 3',
    spielzeit: 15,
    pausenzeit: 2,
    halbzeitpause: 0,
    zweiHalbzeiten: false,
    erlaubteJahrgaenge: [],
    erlaubteJahrgaengeProTag: {}
  },
  {
    id: 'feld4',
    name: 'Feld 4',
    spielzeit: 8,
    pausenzeit: 2,
    halbzeitpause: 2,
    zweiHalbzeiten: true,
    erlaubteJahrgaenge: [],
    erlaubteJahrgaengeProTag: {}
  },
  {
    id: 'feld5',
    name: 'Beachfeld',
    spielzeit: 12,
    pausenzeit: 3,
    halbzeitpause: 0,
    zweiHalbzeiten: false,
    erlaubteJahrgaenge: [],
    erlaubteJahrgaengeProTag: {}
  }
];

export async function GET(request: NextRequest) {
  // Verify authentication for GET requests
  const authResult = await verifyApiAuth(request);
  
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const db = getDatabase();
    
    // Ensure admin_settings table exists
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS admin_settings (
          key TEXT PRIMARY KEY,
          einstellungen TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
    } catch (tableError) {
      console.warn('Could not create admin_settings table:', tableError);
    }
    
    // Try to get field settings from database
    try {
      const result = db.prepare(`
        SELECT einstellungen FROM admin_settings 
        WHERE key = 'feldEinstellungen'
        LIMIT 1
      `).get() as { einstellungen: string } | undefined;
      
      if (result) {
        const feldEinstellungen = JSON.parse(result.einstellungen);
        return NextResponse.json({
          success: true,
          feldEinstellungen
        });
      }
    } catch (dbError) {
      console.warn('Could not load field settings from database:', dbError);
    }
    
    // Return default configuration if no database settings found
    return NextResponse.json({
      success: true,
      feldEinstellungen: DEFAULT_FELD_EINSTELLUNGEN
    });

  } catch (error) {
    console.error('Error loading field settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to load field settings',
        feldEinstellungen: DEFAULT_FELD_EINSTELLUNGEN
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Verify authentication for POST requests
  const authResult = await verifyApiAuth(request);
  
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { feldEinstellungen } = await request.json();
    
    if (!feldEinstellungen || !Array.isArray(feldEinstellungen)) {
      return NextResponse.json(
        { success: false, error: 'Invalid field settings format' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    
    // Ensure admin_settings table exists
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS admin_settings (
          key TEXT PRIMARY KEY,
          einstellungen TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
    } catch (tableError) {
      console.warn('Could not create admin_settings table:', tableError);
    }
    
    // Save field settings to database
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO admin_settings (key, einstellungen, updated_at)
      VALUES (?, ?, datetime('now'))
    `);
    
    stmt.run('feldEinstellungen', JSON.stringify(feldEinstellungen));
    
    return NextResponse.json({
      success: true,
      message: 'Field settings saved successfully'
    });

  } catch (error) {
    console.error('Error saving field settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save field settings' },
      { status: 500 }
    );
  }
}
