import { NextRequest, NextResponse } from 'next/server';
import { createAnmeldung, getAllAnmeldungen, getStatistiken, type AnmeldungData } from '@/lib/db';
import { sendConfirmationEmail, sendAdminNotification } from '@/lib/email';
import { getDatabase } from '@/lib/database';
import { EmailService } from '@/lib/email-service';
import { getTeamEmailDomain } from '@/lib/email-config';

export async function GET() {
  try {
    const anmeldungen = getAllAnmeldungen();
    const statistiken = getStatistiken();
    
    return NextResponse.json({
      anmeldungen,
      statistiken
    });
  } catch (error) {
    console.error('❌ Fehler beim Laden der Anmeldungen:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validierung der Anmeldedaten
    if (!body.verein || !body.kontakt || !body.email || !body.mobil || !body.teams || body.teams.length === 0) {
      return NextResponse.json(
        { error: 'Fehlende Pflichtfelder' },
        { status: 400 }
      );
    }

    // E-Mail-Validierung
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      );
    }

    // Kosten berechnen
    const kosten = body.teams.reduce((total: number, team: any) => {
      const baseCost = team.anzahl * 25; // 25€ pro Team
      const refereeCost = team.schiri ? 0 : team.anzahl * 20; // 20€ extra ohne Schiri
      return total + baseCost + refereeCost;
    }, 0);

    // Anmeldung in Datenbank speichern
    const anmeldungData: AnmeldungData = {
      verein: body.verein,
      kontakt: body.kontakt,
      email: body.email,
      mobil: body.mobil,
      teams: body.teams,
      kosten
    };

    const anmeldungId = createAnmeldung(anmeldungData);

    // Automatische Team-Email erstellen
    let teamEmail = null;
    try {
      const db = getDatabase();
      const emailService = new EmailService(db);
      
      // Verwende die konfigurierte Domain
      teamEmail = await emailService.createTeamEmail(
        anmeldungId.toString(), 
        body.verein,
        getTeamEmailDomain()
      );
      
      console.log('✅ Team-Email automatisch erstellt:', {
        teamId: anmeldungId,
        verein: body.verein,
        emailAddress: teamEmail.email_address,
        domain: getTeamEmailDomain()
      });
    } catch (emailError) {
      console.error('⚠️ Fehler beim Erstellen der Team-Email:', emailError);
      // Fehler hier nicht weiterleiten, da Anmeldung trotzdem erfolgreich ist
    }

    // Automatischer Spielplan-Update nach neuer Anmeldung
    try {
      const response = await fetch(`${request.nextUrl.origin}/api/spielplan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate',
          settings: { anzahlFelder: 5 },
          feldEinstellungen: [
            { id: 'feld1', name: 'Feld 1', spielzeit: 10, pausenzeit: 2, halbzeitpause: 0, zweiHalbzeiten: false },
            { id: 'feld2', name: 'Feld 2', spielzeit: 12, pausenzeit: 3, halbzeitpause: 0, zweiHalbzeiten: false },
            { id: 'feld3', name: 'Feld 3', spielzeit: 15, pausenzeit: 2, halbzeitpause: 0, zweiHalbzeiten: false },
            { id: 'feld4', name: 'Feld 4', spielzeit: 8, pausenzeit: 2, halbzeitpause: 2, zweiHalbzeiten: true },
            { id: 'feld5', name: 'Beachfeld', spielzeit: 12, pausenzeit: 3, halbzeitpause: 0, zweiHalbzeiten: false },
          ]
        }),
      });
      
      if (response.ok) {
        console.log('✅ Spielplan automatisch aktualisiert nach neuer Anmeldung');
      }
    } catch (error) {
      console.log('⚠️ Spielplan-Update nach Anmeldung fehlgeschlagen:', error);
    }

    // E-Mails senden
    const emailData = {
      ...anmeldungData,
      anmeldungId
    };

    const confirmationResult = await sendConfirmationEmail(emailData);
    const adminNotificationResult = await sendAdminNotification(emailData);

    console.log('✅ Neue Anmeldung erfolgreich:', {
      id: anmeldungId,
      verein: body.verein,
      teams: body.teams.length,
      kosten,
      emailSent: confirmationResult.success,
      adminNotified: adminNotificationResult.success
    });

    return NextResponse.json(
      { 
        success: true,
        message: 'Anmeldung erfolgreich!',
        anmeldungId,
        uniqueEmail: confirmationResult.uniqueEmail,
        teamEmail: teamEmail?.email_address, // Neue Team-Email für isolierte Kommunikation
        emailSent: confirmationResult.success,
        previewUrl: confirmationResult.previewUrl // Nur für Entwicklung
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Fehler bei Anmeldung:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
