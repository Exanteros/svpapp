import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
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
    const { spielId, toreTeam1, toreTeam2, status } = await request.json();

    if (!spielId || toreTeam1 === undefined || toreTeam2 === undefined) {
      return NextResponse.json(
        { error: 'Spiel-ID und Tore sind erforderlich' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    
    // Erstelle das Ergebnis-String im Format "X:Y"
    const ergebnis = `${toreTeam1}:${toreTeam2}`;
    
    // Update das Spiel mit dem Ergebnis
    const updateSpiel = db.prepare(`
      UPDATE spiele 
      SET 
        ergebnis = ?,
        tore_team1 = ?,
        tore_team2 = ?,
        status = ?
      WHERE id = ?
    `);
    
    const result = updateSpiel.run(ergebnis, toreTeam1, toreTeam2, status || 'beendet', spielId);
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Spiel nicht gefunden' },
        { status: 404 }
      );
    }

    // Hole das aktualisierte Spiel
    const updatedSpiel = db.prepare(`
      SELECT * FROM spiele WHERE id = ?
    `).get(spielId);

    return NextResponse.json({
      success: true,
      message: 'Ergebnis erfolgreich gespeichert',
      spiel: updatedSpiel
    });

  } catch (error) {
    console.error('Error updating ergebnis:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const db = getDatabase();
    
    // Hole alle Spiele mit Ergebnissen
    const spiele = db.prepare(`
      SELECT * FROM spiele 
      WHERE ergebnis IS NOT NULL 
      ORDER BY datum DESC, zeit DESC
    `).all();

    return NextResponse.json({
      success: true,
      spiele
    });

  } catch (error) {
    console.error('Error fetching ergebnisse:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
