import { NextResponse } from 'next/server';
import { getAdminSettings } from '@/lib/db';
import { getTournamentYear, resolveTournamentScheduleSettings } from '@/lib/tournament';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = getAdminSettings();
    const scheduleSettings = resolveTournamentScheduleSettings(settings);
    
    // Nur die für die Öffentlichkeit relevanten Daten zurückgeben
    const publicSettings = {
      turnierStartDatum: scheduleSettings.turnierStartDatum,
      turnierEndDatum: scheduleSettings.turnierEndDatum,
      samstagStartzeit: scheduleSettings.samstagStartzeit,
      samstagEndzeit: scheduleSettings.samstagEndzeit,
      sonntagStartzeit: scheduleSettings.sonntagStartzeit,
      sonntagEndzeit: scheduleSettings.sonntagEndzeit,
      tournamentYear: getTournamentYear(scheduleSettings.turnierStartDatum),
      anmeldungAktiv: settings.anmeldungAktiv !== false
    };
    
    return NextResponse.json(publicSettings);
  } catch (error) {
    console.error('❌ Fehler beim Laden der öffentlichen Turnier-Einstellungen:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Turnier-Einstellungen' },
      { status: 500 }
    );
  }
}
