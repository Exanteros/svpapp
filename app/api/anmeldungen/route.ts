import { NextRequest, NextResponse } from 'next/server';
import { createAnmeldung, getAdminSettings, getAllAnmeldungen, getStatistiken, type AnmeldungData } from '@/lib/db';
import { sendConfirmationEmail, sendAdminNotification } from '@/lib/email';
import { verifyApiAuth } from '@/lib/dal';
import { formatRegistrationValidationError, registrationRequestSchema } from '@/lib/registration-validation';
import { generateSpielplan } from '@/lib/spielplan-generator';
import { calculateRegistrationCost } from '@/lib/tournament';

export async function GET(request: NextRequest) {
  const authResult = await verifyApiAuth(request);

  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

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
    const settings = getAdminSettings();

    if (settings.anmeldungAktiv === false) {
      return NextResponse.json(
        { error: 'Die Team-Anmeldung ist derzeit geschlossen.' },
        { status: 403 }
      );
    }

    const parsedBody = registrationRequestSchema.safeParse(await request.json());

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: formatRegistrationValidationError(parsedBody.error) },
        { status: 400 }
      );
    }

    const registration = parsedBody.data;
    const kosten = calculateRegistrationCost(registration.teams);

    // Anmeldung in Datenbank speichern
    const anmeldungData: AnmeldungData = {
      verein: registration.verein,
      kontakt: registration.kontakt,
      email: registration.email,
      mobil: registration.mobil,
      teams: registration.teams,
      kosten
    };

    const anmeldungId = createAnmeldung(anmeldungData);

    regenerateSpielplanAfterRegistration();

    // E-Mails senden
    const emailData = {
      ...anmeldungData,
      anmeldungId
    };

    const confirmationResult = await sendConfirmationEmail(emailData);
    const adminNotificationResult = await sendAdminNotification(emailData);

    console.log('✅ Neue Anmeldung erfolgreich:', {
      id: anmeldungId,
      verein: registration.verein,
      teams: registration.teams.length,
      kosten,
      emailSent: confirmationResult.success,
      adminNotified: adminNotificationResult.success
    });

    return NextResponse.json(
      { 
        success: true,
        message: 'Anmeldung erfolgreich!',
        anmeldungId,
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

function regenerateSpielplanAfterRegistration() {
  if (process.env.AUTO_REGENERATE_SPIELPLAN_AFTER_REGISTRATION !== 'true') {
    return;
  }

  try {
    const spiele = generateSpielplan({ replaceExisting: true });
    console.log('✅ Spielplan automatisch aktualisiert nach neuer Anmeldung:', spiele.length);
  } catch (error) {
    console.warn('⚠️ Spielplan-Update nach Anmeldung fehlgeschlagen:', error);
  }
}
