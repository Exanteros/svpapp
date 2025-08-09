import { NextRequest, NextResponse } from 'next/server';
import { 
  validateHelferToken,
  getActiveHelferBedarf,
  createHelferAnmeldung,
  getHelferAnmeldungenForBedarf
} from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const url = new URL(request.url);
    const bedarfId = url.searchParams.get('bedarf');
    
    // Prüfe ob der Token gültig ist
    const isValidToken = validateHelferToken(token);
    
    if (!isValidToken) {
      return NextResponse.json(
        { error: 'Ungültiger oder abgelaufener Link' },
        { status: 404 }
      );
    }

    // Wenn eine spezifische BedarfId angefragt wird, lade die Anmeldungen
    if (bedarfId) {
      const anmeldungen = getHelferAnmeldungenForBedarf(bedarfId);
      return NextResponse.json({
        anmeldungen
      });
    }

    // Lade aktive Helfer-Positionen
    const bedarf = getActiveHelferBedarf();

    return NextResponse.json({
      bedarf
    });
  } catch (error) {
    console.error('Fehler beim Laden der öffentlichen Helfer-Daten:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Daten' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Prüfe ob der Token gültig ist
    const isValidToken = validateHelferToken(token);
    
    if (!isValidToken) {
      return NextResponse.json(
        { error: 'Ungültiger oder abgelaufener Link' },
        { status: 404 }
      );
    }

    const anmeldung = await request.json();
    
    // Validierung
    if (!anmeldung.name || !anmeldung.email || !anmeldung.helferBedarfId) {
      return NextResponse.json(
        { error: 'Pflichtfelder fehlen' },
        { status: 400 }
      );
    }

    // Erstelle Anmeldung über Backend-Funktion
    const result = createHelferAnmeldung({
      helferBedarfId: anmeldung.helferBedarfId,
      name: anmeldung.name,
      email: anmeldung.email,
      telefon: anmeldung.telefon || null,
      bemerkung: anmeldung.bemerkung || null,
      kuchenspende: anmeldung.kuchenspende || null
    });

    return NextResponse.json({ 
      success: true, 
      id: result.id,
      message: 'Anmeldung erfolgreich übermittelt' 
    });
  } catch (error) {
    console.error('Fehler bei der Helfer-Anmeldung:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Anmeldung' },
      { status: 500 }
    );
  }
}
