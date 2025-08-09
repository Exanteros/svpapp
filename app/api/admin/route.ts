import { NextRequest, NextResponse } from 'next/server';
import { 
  getStatistiken, 
  getAllAnmeldungen, 
  updateAnmeldungStatus, 
  saveAdminSettings, 
  getAdminSettings, 
  deleteAnmeldung,
  createAnmeldungenDemoData,
  flushAnmeldungenDatabase
} from '@/lib/db';
import { verifyApiAuth } from '@/lib/dal';

export async function GET(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyApiAuth(request);
  
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const statistiken = getStatistiken();
    const anmeldungen = getAllAnmeldungen();
    const settings = getAdminSettings();
    
    return NextResponse.json({
      statistiken,
      anmeldungen,
      settings
    });
  } catch (error) {
    console.error('❌ Fehler beim Laden der Admin-Daten:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // The login action is now handled by /api/auth/login
    if (body.action === 'login') {
      return NextResponse.json(
        { error: 'Login wird über /api/auth/login verarbeitet' },
        { status: 400 }
      );
    }
    
    // All other actions require authentication
    const authResult = await verifyApiAuth(request);
    
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    if (body.action === 'update_status') {
      const result = updateAnmeldungStatus(body.anmeldungId, body.status);
      
      if (result.changes === 0) {
        return NextResponse.json(
          { error: 'Anmeldung nicht gefunden' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        message: 'Status erfolgreich aktualisiert',
        anmeldungId: body.anmeldungId,
        newStatus: body.status
      });
    }
    
    if (body.action === 'save_settings') {
      const result = saveAdminSettings(body.settings);
      
      return NextResponse.json({
        message: 'Einstellungen erfolgreich gespeichert',
        settings: body.settings
      });
    }
    
    if (body.action === 'delete_anmeldung') {
      const result = deleteAnmeldung(body.anmeldungId);
      
      if (result.anmeldungDeleted === 0) {
        return NextResponse.json(
          { error: 'Anmeldung nicht gefunden' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        message: 'Anmeldung erfolgreich gelöscht',
        anmeldungId: body.anmeldungId,
        deletedTeams: result.teamsDeleted
      });
    }
    
    if (body.action === 'create_demo_data') {
      const result = createAnmeldungenDemoData();
      
      return NextResponse.json({
        message: 'Demo-Daten erfolgreich erstellt',
        anmeldungen: result.anmeldungen,
        totalTeams: result.totalTeams
      });
    }
    
    if (body.action === 'flush_database') {
      const result = flushAnmeldungenDatabase();
      
      return NextResponse.json({
        message: 'Datenbank erfolgreich geleert',
        deletedTeams: result.teams,
        deletedAnmeldungen: result.anmeldungen
      });
    }
    
    return NextResponse.json(
      { error: 'Ungültige Aktion' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('❌ Admin API Fehler:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
