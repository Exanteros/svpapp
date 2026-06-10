import { NextRequest, NextResponse } from 'next/server';
import {
  deleteStoredLiveTimer,
  getDatabase,
  getAdminSettings,
  getStoredFeldEinstellungen,
  getStoredLiveTimers,
  saveStoredLiveTimer,
} from '@/lib/db';
import { verifyApiAuth } from '@/lib/dal';
import { notifySpielplanChanged } from '@/lib/spielplan-events';
import { areScoresPublicForDate, formatScheduleCategoryLabel, resolveFeldEinstellungenForDate } from '@/lib/tournament';

interface Spiel {
  id: string;
  datum: string;
  zeit: string;
  feld: string;
  kategorie: string;
  team1: string;
  team2: string;
  status: string;
  ergebnis?: string | null;
  tore_team1?: number;
  tore_team2?: number;
}

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const settings = getAdminSettings();
    const authResult = await verifyApiAuth(request);
    
    // Get all games for today
    const today = new Date().toISOString().split('T')[0];
    
    const allGames = db.prepare(`
      SELECT * FROM spiele 
      WHERE datum = ? 
      ORDER BY zeit, feld
    `).all(today) as Spiel[];

    const feldEinstellungen = getStoredFeldEinstellungen();

    const scoresVisible = authResult.authenticated || areScoresPublicForDate(settings, today);
    const enhancedGames = allGames.map(spiel => {
      const feldInfo = feldEinstellungen.find(f => f.name === spiel.feld);
      const fieldForGame = feldInfo ? resolveFeldEinstellungenForDate(feldInfo, spiel.datum) : null;
      const visibleSpiel = scoresVisible ? spiel : { ...spiel, ergebnis: null, tore_team1: null, tore_team2: null };

      return {
        ...visibleSpiel,
        kategorie: formatScheduleCategoryLabel(spiel.kategorie),
        spielzeit: fieldForGame?.spielzeit || 15,
        pausenzeit: fieldForGame?.pausenzeit || 3,
        halbzeitpause: fieldForGame?.halbzeitpause || 0,
        zweiHalbzeiten: fieldForGame?.zweiHalbzeiten || false,
      };
    });

    return NextResponse.json({
      success: true,
      spiele: enhancedGames,
      liveStatus: getStoredLiveTimers()
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
    const {
      spielId,
      status,
      tore_team1,
      tore_team2,
      liveTime,
      startTime,
      elapsedTime,
      isSecondHalf,
      halbzeitStartTime,
    } = await request.json();
    const db = getDatabase();

    if (!spielId || !['geplant', 'laufend', 'halbzeit', 'beendet'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid game status request' },
        { status: 400 }
      );
    }

    // Update live game store with current timer data
    if (status === 'laufend' || status === 'halbzeit') {
      saveStoredLiveTimer(spielId, {
        liveTime,
        status,
        startTime,
        elapsedTime,
        isSecondHalf,
        halbzeitStartTime,
        lastUpdate: Date.now(),
      });
    } else if (status === 'beendet' || status === 'geplant') {
      // Remove from live store when game ends
      deleteStoredLiveTimer(spielId);
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

      notifySpielplanChanged({ reason: 'live-status', spielId: String(spielId), status });

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
