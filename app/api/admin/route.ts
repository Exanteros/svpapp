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
import { authenticateAdmin, createAuthResponse, createErrorResponse, createAdminSession } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  // Check for session token first
  const sessionToken = request.headers.get('x-session-token');
  if (sessionToken) {
    // Import the function here to avoid naming conflicts
    const { verifyAdminSession } = await import('@/lib/auth');
    if (verifyAdminSession(sessionToken)) {
      // Valid session token, proceed without full auth
    } else {
      return createErrorResponse('Ungültiges Session-Token', 401);
    }
  } else {
    // Fall back to full authentication
    const auth = await authenticateAdmin(request);
    if (!auth.success) {
      return createErrorResponse(auth.error || 'Zugriff verweigert', auth.status || 401, auth.headers);
    }
  }

  try {
    const statistiken = getStatistiken();
    const anmeldungen = getAllAnmeldungen();
    const settings = getAdminSettings();
    
    return createAuthResponse({
      statistiken,
      anmeldungen,
      settings
    });
  } catch (error) {
    console.error('❌ Fehler beim Laden der Admin-Daten:', error);
    return createErrorResponse('Interner Serverfehler', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle login separately - automatisch erfolgreich
    if (body.action === 'login') {
      console.log('🔓 Admin Login: Automatisch erfolgreich (Auth deaktiviert)');
      // Login ist immer erfolgreich, da wir keine API-Key-Authentifizierung mehr verwenden
      
      // Generate session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
      
      // Store session using centralized auth system
      createAdminSession(sessionToken, expires);
      
      console.log(`✅ Login successful, session token generated and stored`);
      
      return NextResponse.json({
        success: true,
        message: 'Anmeldung erfolgreich',
        token: sessionToken,
        expires
      });
    }
    
    // All other actions require authentication
    const auth = await authenticateAdmin(request);
    if (!auth.success) {
      return createErrorResponse(auth.error || 'Zugriff verweigert', auth.status || 401, auth.headers);
    }

    if (body.action === 'update_status') {
      const result = updateAnmeldungStatus(body.anmeldungId, body.status);
      
      if (result.changes === 0) {
        return createErrorResponse('Anmeldung nicht gefunden', 404);
      }
      
      return createAuthResponse({
        message: 'Status erfolgreich aktualisiert',
        anmeldungId: body.anmeldungId,
        newStatus: body.status
      }, auth.headers);
    }
    
    if (body.action === 'save_settings') {
      const result = saveAdminSettings(body.settings);
      
      return createAuthResponse({
        message: 'Einstellungen erfolgreich gespeichert',
        settings: body.settings
      }, auth.headers);
    }
    
    if (body.action === 'delete_anmeldung') {
      const result = deleteAnmeldung(body.anmeldungId);
      
      if (result.anmeldungDeleted === 0) {
        return createErrorResponse('Anmeldung nicht gefunden', 404);
      }
      
      return createAuthResponse({
        message: 'Anmeldung erfolgreich gelöscht',
        anmeldungId: body.anmeldungId,
        teamsDeleted: result.teamsDeleted
      }, auth.headers);
    }
    
    if (body.action === 'create_anmeldungen_demo_data') {
      const result = createAnmeldungenDemoData();
      
      return createAuthResponse({
        success: true,
        message: 'Anmeldungen Demo-Daten erfolgreich erstellt',
        result: result
      }, auth.headers);
    }
    
    if (body.action === 'flush_anmeldungen_database') {
      const result = flushAnmeldungenDatabase();
      
      return createAuthResponse({
        success: true,
        message: 'Anmeldungen-Datenbank erfolgreich geleert',
        result: result
      }, auth.headers);
    }
    
    return createErrorResponse('Ungültige Aktion', 400);
  } catch (error) {
    console.error('❌ Fehler bei Admin-Operation:', error);
    return createErrorResponse('Interner Serverfehler', 500);
  }
}
