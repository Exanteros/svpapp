import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/dal';

// Eine spezielle Debug-Route, die nur im Entwicklungsmodus verfügbar ist
export async function GET(request: NextRequest) {
  // Sicherheitsmaßnahme: Nur im Entwicklungsmodus verfügbar
  if (process.env.NODE_ENV !== 'development') {
    return new Response(JSON.stringify({ error: 'Diese Route ist nur im Entwicklungsmodus verfügbar' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verify authentication even in development
  const authResult = await verifyApiAuth(request);
  
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  // Sammle alle relevanten Anfrageinformationen
  const headers = Object.fromEntries(request.headers.entries());
  const cookies = Object.fromEntries(
    request.cookies.getAll().map(cookie => [cookie.name, cookie.value])
  );
  
  // Für die Sicherheit: Ersetze sensitive Daten mit Platzhaltern
  if (headers['authorization']) {
    headers['authorization'] = headers['authorization'].substring(0, 8) + '...';
  }
  if (headers['x-api-key']) {
    headers['x-api-key'] = headers['x-api-key'].substring(0, 8) + '...';
  }
  if (cookies['svp-admin-key']) {
    cookies['svp-admin-key'] = cookies['svp-admin-key'].substring(0, 8) + '...';
  }
  if (cookies['svp-session-token']) {
    cookies['svp-session-token'] = cookies['svp-session-token'].substring(0, 8) + '...';
  }

  // Stelle Konfigurationsinformationen zusammen (ohne sensible Daten)
  const config = {
    IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
    APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    HAS_API_KEY: !!process.env.ADMIN_API_KEY,
    HAS_SESSION_SECRET: !!process.env.SESSION_SECRET,
    ALLOWED_IPS: process.env.ALLOWED_IPS?.split(',').filter(ip => ip.trim()) || [],
    MAX_REQUESTS_PER_MINUTE: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '120'),
  };

  // Stelle die Anfrageinformationen zusammen
  const requestInfo = {
    method: request.method,
    url: request.url,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unbekannt',
  };

  return new Response(JSON.stringify({
    message: 'Auth Debugging Information',
    request: requestInfo,
    headers,
    cookies,
    config,
    timestamp: new Date().toISOString()
  }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
