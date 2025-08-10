import { NextRequest, NextResponse } from 'next/server';
import { getStatistiken, getAllAnmeldungen, updateAnmeldungStatus, saveAdminSettings, getAdminSettings } from '@/lib/db';
import { authenticateAdmin, createAuthResponse, createErrorResponse } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  // Authenticate admin request
  const auth = await authenticateAdmin(request);
  if (!auth.success) {
    return createErrorResponse(auth.error || 'Zugriff verweigert', auth.status || 401, auth.headers);
  }

  try {
    const statistiken = getStatistiken();
    const anmeldungen = getAllAnmeldungen();
    const settings = getAdminSettings();
    
    return createAuthResponse({
      statistiken,
      anmeldungen,
      settings
    }, 200, auth.headers);
  } catch (error) {
    console.error('❌ Fehler beim Laden der Admin-Daten:', error);
    return createErrorResponse('Interner Serverfehler', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle login separately (no authentication required)
    if (body.action === 'login') {
      const { apiKey } = body;
      
      if (!apiKey) {
        return createErrorResponse('API-Schlüssel erforderlich', 400);
      }
      
      // Verify API key
      const expectedApiKey = process.env.ADMIN_API_KEY || 'svp-admin-2025-secure-key';
      if (apiKey !== expectedApiKey) {
        console.warn(`🚫 Invalid API key attempt: ${apiKey}`);
        return createErrorResponse('Ungültiger API-Schlüssel', 401);
      }
      
      // Generate session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
      
      console.log(`✅ Login successful, session token generated`);
      
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
      }, 200, auth.headers);
    }
    
    if (body.action === 'save_settings') {
      const result = saveAdminSettings(body.settings);
      
      return createAuthResponse({
        message: 'Einstellungen erfolgreich gespeichert',
        settings: body.settings
      }, 200, auth.headers);
    }
    
    return createErrorResponse('Ungültige Aktion', 400);
  } catch (error) {
    console.error('❌ Fehler bei Admin-Operation:', error);
    return createErrorResponse('Interner Serverfehler', 500);
  }
}
