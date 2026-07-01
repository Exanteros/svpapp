import { NextRequest, NextResponse } from 'next/server';
import { getAdminSettings, getDatabase } from '@/lib/db';
import { verifyApiAuth } from '@/lib/dal';
import {
  DEFAULT_FELD_EINSTELLUNGEN,
  areScoresPublicForDate,
  formatScheduleCategoryLabel,
  hideInternalScoresForPublic,
  resolveTournamentScheduleSettings,
} from '@/lib/tournament';

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
  tore_team1?: number | null;
  tore_team2?: number | null;
  schiedsrichter?: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const { searchParams } = new URL(request.url);
    const includeDraft = searchParams.get('includeDraft') === '1';
    const settings = getAdminSettings();

    if (includeDraft) {
      const authResult = await verifyApiAuth(request);

      if (!authResult.authenticated) {
        return NextResponse.json(
          { error: authResult.error },
          { status: authResult.status }
        );
      }
    }

    const isPublished = settings.spielplanStatus === 'published';
    const rawSpiele = !includeDraft && !isPublished ? [] : db.prepare(`
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

    const scheduleSettings = resolveTournamentScheduleSettings(settings);
    const samstagStartzeit = scheduleSettings.samstagStartzeit;
    const samstagEndzeit = scheduleSettings.samstagEndzeit;
    const sonntagStartzeit = scheduleSettings.sonntagStartzeit;
    const sonntagEndzeit = scheduleSettings.sonntagEndzeit;
    const samstagDatum = scheduleSettings.turnierStartDatum;
    const sonntagDatum = scheduleSettings.turnierEndDatum;
    const spiele = (includeDraft ? rawSpiele : hideInternalScoresForPublic(rawSpiele, settings)).map((spiel) => ({
      ...spiel,
      kategorie: formatScheduleCategoryLabel(spiel.kategorie),
    }));

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
        ...(includeDraft ? { toreSichtbar: areScoresPublicForDate(settings, samstagDatum) } : {}),
        spiele: samstag
      },
      sonntag: {
        datum: formatDatum(sonntagDatum),
        zeit: `${sonntagStartzeit} - ${sonntagEndzeit} Uhr`,
        ...(includeDraft ? { toreSichtbar: areScoresPublicForDate(settings, sonntagDatum) } : {}),
        spiele: sonntag
      },
      availableFields: availableFields.length > 0 ? availableFields : DEFAULT_FELD_EINSTELLUNGEN.map((feld) => feld.name),
      spielplanStatus: settings.spielplanStatus,
      spielplanPublishedAt: settings.spielplanPublishedAt,
    };

    // Setze No-Cache Headers um sicherzustellen, dass immer aktuelle Daten geladen werden
    const headers = new Headers();
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    return NextResponse.json(response, { headers });
  } catch (error) {
    console.error('Error fetching spielplan:', error);

    const scheduleSettings = resolveTournamentScheduleSettings();

    const headers = new Headers();
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    return NextResponse.json({
      samstag: {
        datum: formatFallbackDatum(scheduleSettings.turnierStartDatum),
        zeit: `${scheduleSettings.samstagStartzeit} - ${scheduleSettings.samstagEndzeit} Uhr`,
        spiele: []
      },
      sonntag: {
        datum: formatFallbackDatum(scheduleSettings.turnierEndDatum),
        zeit: `${scheduleSettings.sonntagStartzeit} - ${scheduleSettings.sonntagEndzeit} Uhr`,
        spiele: []
      },
      availableFields: DEFAULT_FELD_EINSTELLUNGEN.map((feld) => feld.name)
    }, { headers });
  }
}

function formatFallbackDatum(dateString: string) {
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
}
