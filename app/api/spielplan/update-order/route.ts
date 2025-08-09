import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { verifyApiAuth } from '@/lib/dal';

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
    const { reorderedGames, day } = await request.json();
    
    if (!reorderedGames || !Array.isArray(reorderedGames) || !day) {
      return NextResponse.json(
        { error: 'Ungültige Daten' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    
    // Beginne eine Transaktion für atomische Updates
    db.prepare('BEGIN').run();
    
    try {
      // Bereite die Statements vor
      const updateStmt = db.prepare(`
        UPDATE spiele 
        SET zeit = ?, display_order = ? 
        WHERE id = ?
      `);
      
      // Update die Reihenfolge und Zeiten für jedes Spiel
      for (let i = 0; i < reorderedGames.length; i++) {
        const spiel = reorderedGames[i];
        updateStmt.run(spiel.zeit, i, spiel.id);
      }
      
      db.prepare('COMMIT').run();
      
      return NextResponse.json({ 
        success: true, 
        message: 'Spielplan erfolgreich aktualisiert',
        updatedCount: reorderedGames.length
      });
      
    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error;
    }
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Spielplans:', error);
    return NextResponse.json(
      { error: 'Fehler beim Speichern der Änderungen' },
      { status: 500 }
    );
  }
}

// GET Endpoint für Admin-Berechtigung prüfen
export async function GET() {
  return NextResponse.json({ 
    message: 'Spielplan Update API',
    endpoints: {
      POST: 'Update game order and times'
    }
  });
}
