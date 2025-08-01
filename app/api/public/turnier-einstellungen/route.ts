import { NextResponse } from 'next/server';
import { getAdminSettings } from '@/lib/db';

export async function GET() {
  try {
    const settings = getAdminSettings();
    
    // Nur die für die Öffentlichkeit relevanten Daten zurückgeben
    const publicSettings = {
      turnierStartDatum: settings.turnierStartDatum || '2025-07-05',
      turnierEndDatum: settings.turnierEndDatum || '2025-07-06',
      samstagStartzeit: settings.samstagStartzeit || '13:00',
      samstagEndzeit: settings.samstagEndzeit || '17:00',
      sonntagStartzeit: settings.sonntagStartzeit || '10:00',
      sonntagEndzeit: settings.sonntagEndzeit || '17:00'
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
