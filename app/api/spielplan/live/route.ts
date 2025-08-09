import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { verifyApiAuth } from '@/lib/dal';

interface Spiel {
  id: string;
  datum: string;
  zeit: string;
  feld: string;
  kategorie: string;
  team1: string;
  team2: string;
  status: string;
  tore_team1?: number;
  tore_team2?: number;
}

// In-memory store for live game data (temporary solution)
let liveGameStore: { [spielId: string]: { liveTime: string; status: string; lastUpdate: number } } = {};

export async function GET() {
  try {
    const db = getDatabase();
    
    // Get all games for today
    const today = new Date().toISOString().split('T')[0];
    
    const allGames = db.prepare(`
      SELECT * FROM spiele 
      WHERE datum = ? 
      ORDER BY zeit, feld
    `).all(today) as Spiel[];

    // Load field configurations from central API
    let feldEinstellungen = [
      { name: 'Feld 1', spielzeit: 10 },
      { name: 'Feld 2', spielzeit: 12 },
      { name: 'Feld 3', spielzeit: 15 },
      { name: 'Feld 4', spielzeit: 8 },
      { name: 'Beachfeld', spielzeit: 12 },
    ];

    try {
      const feldResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/admin/feld-settings`);
      if (feldResponse.ok) {
        const feldData = await feldResponse.json();
        if (feldData.success && feldData.feldEinstellungen) {
          feldEinstellungen = feldData.feldEinstellungen.map((f: any) => ({
            name: f.name,
            spielzeit: f.spielzeit
          }));
        }
      }
    } catch (fetchError) {
      console.warn('Could not load field settings, using defaults:', fetchError);
    }

    const enhancedGames = allGames.map(spiel => {
      const feldInfo = feldEinstellungen.find(f => f.name === spiel.feld);
      return {
        ...spiel,
        spielzeit: feldInfo?.spielzeit || 15
      };
    });

    // Clean up old live data (older than 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    Object.keys(liveGameStore).forEach(spielId => {
      if (liveGameStore[spielId].lastUpdate < fiveMinutesAgo) {
        delete liveGameStore[spielId];
      }
    });

    return NextResponse.json({
      success: true,
      spiele: enhancedGames,
      liveStatus: liveGameStore
    });

  } catch (error) {
    console.error('Error loading games:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load games' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyApiAuth(request);
  
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { spielId, status, tore_team1, tore_team2, liveTime } = await request.json();
    const db = getDatabase();

    // Update live game store with current timer data
    if (liveTime && status === 'laufend') {
      liveGameStore[spielId] = {
        liveTime,
        status,
        lastUpdate: Date.now()
      };
    } else if (status === 'beendet') {
      // Remove from live store when game ends
      delete liveGameStore[spielId];
    }

    // Update game status in spiele table
    try {
      const updateSpiel = db.prepare(`
        UPDATE spiele 
        SET status = ?, tore_team1 = COALESCE(?, tore_team1), tore_team2 = COALESCE(?, tore_team2)
        WHERE id = ?
      `);
      const result = updateSpiel.run(status, tore_team1, tore_team2, spielId);

      if (result.changes === 0) {
        return NextResponse.json(
          { success: false, error: 'Game not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Game status updated successfully'
      });

    } catch (updateError) {
      console.error('Error updating game:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update game' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in POST request:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}
