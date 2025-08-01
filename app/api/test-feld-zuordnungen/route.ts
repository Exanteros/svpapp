import { NextResponse } from 'next/server';
import { getFeldJahrgangZuordnungen, saveFeldJahrgangZuordnung } from '@/lib/database';

export async function GET() {
  try {
    // Erstelle ein paar Test-Zuordnungen
    saveFeldJahrgangZuordnung('feld1', '2025-07-05', 'Mini A');
    saveFeldJahrgangZuordnung('feld1', '2025-07-05', 'Mini B');
    saveFeldJahrgangZuordnung('feld2', '2025-07-06', 'E-Jugend');
    saveFeldJahrgangZuordnung('feld2', '2025-07-06', 'D-Jugend');
    
    const zuordnungen = getFeldJahrgangZuordnungen();
    
    return NextResponse.json({
      success: true,
      zuordnungen,
      message: 'Test-Zuordnungen erstellt und abgerufen'
    });
  } catch (error) {
    console.error('Fehler beim Testen der Feld-Zuordnungen:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
