import { NextRequest } from 'next/server';
import { createAuthResponse, createErrorResponse } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const sessionToken = request.headers.get('x-session-token');
  
  // Versuche, die Sessions-Datei zu lesen
  let sessionFileContent = 'Keine Sessions-Datei gefunden';
  const sessionsPath = path.join(process.cwd(), 'sessions.json');
  
  try {
    if (fs.existsSync(sessionsPath)) {
      sessionFileContent = fs.readFileSync(sessionsPath, 'utf8');
    }
  } catch (err: any) {
    sessionFileContent = `Fehler beim Lesen der Sessions-Datei: ${err.message || 'Unbekannter Fehler'}`;
  }
  
  // Importiere die Funktionen für die Session-Validierung
  const { verifyAdminSession, verifySessionToken } = await import('@/lib/auth');
  
  // Sessions sind jetzt immer gültig, da Authentifizierung deaktiviert wurde
  let sessionValid = true;
  let sessionInfo = { valid: true, email: 'öffentlicher-zugriff@svp-app.de' };
  
  if (sessionToken) {
    // Versuche trotzdem, die Session zu validieren für Debug-Zwecke
    const realSessionValid = verifyAdminSession(sessionToken);
    const realSessionInfo = verifySessionToken(sessionToken);
  }
  
  return createAuthResponse({
    sessionToken: sessionToken ? `${sessionToken.substring(0, 8)}...` : 'nicht vorhanden',
    apiKeyAuth: 'deaktiviert (öffentlicher Zugriff)',
    sessionValid,
    sessionInfo,
    sessionFile: {
      path: sessionsPath,
      content: sessionFileContent
    },
    serverTime: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV
  });
}
