// Middleware: Alle API-Routen sind öffentlich
// Die API-Key-Authentifizierung wurde entfernt

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Keine API-Key-Prüfung mehr, alle API-Anfragen werden direkt durchgelassen
  console.log('� API-Zugriff: API-Route aufgerufen ohne Authentifizierung:', request.nextUrl.pathname);
  return NextResponse.next();
}

export const config = {
  // Nur für API-Routen ausführen
  matcher: '/api/:path*',
}
