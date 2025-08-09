import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/dal';

// Debug-Endpunkt zur Überprüfung des API-Schlüssels
export async function GET(request: NextRequest) {
  // Nur im Entwicklungsmodus verfügbar
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Nur im Entwicklungsmodus verfügbar' }, { status: 403 });
  }
  
  // Verify authentication even in development
  const authResult = await verifyApiAuth(request);
  
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }
  
  // API Key extrahieren
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = process.env.ADMIN_API_KEY || 'svp-admin-2025-secure-key';
  
  // Cookies prüfen
  const cookies = request.cookies;
  const apiKeyCookie = cookies.get('svp-admin-key');
  
  // Antwort mit detaillierten Informationen
  return NextResponse.json({
    message: 'API-Schlüssel Debug-Informationen',
    expected: {
      key: expectedKey,
      length: expectedKey.length,
    },
    received: {
      fromHeader: apiKey ? {
        key: apiKey,
        length: apiKey.length,
        matches: apiKey === expectedKey
      } : 'Nicht vorhanden',
      fromCookie: apiKeyCookie ? {
        key: apiKeyCookie.value,
        length: apiKeyCookie.value.length,
        matches: apiKeyCookie.value === expectedKey
      } : 'Nicht vorhanden',
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasEnvApiKey: !!process.env.ADMIN_API_KEY,
    },
    headers: Object.fromEntries(
      Array.from(request.headers.entries())
        .filter(([name]) => !['cookie', 'authorization'].includes(name.toLowerCase()))
    ),
  });
}

// POST-Endpunkt zum Testen des API-Schlüssels mit verschiedenen Werten
export async function POST(request: NextRequest) {
  // Nur im Entwicklungsmodus verfügbar
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Nur im Entwicklungsmodus verfügbar' }, { status: 403 });
  }
  
  try {
    const { testKey } = await request.json();
    const expectedKey = process.env.ADMIN_API_KEY || 'svp-admin-2025-secure-key';
    
    return NextResponse.json({
      message: 'API-Schlüssel Test',
      testKey: {
        value: testKey,
        length: testKey?.length || 0,
      },
      expectedKey: {
        value: expectedKey,
        length: expectedKey.length,
      },
      comparison: {
        isExactMatch: testKey === expectedKey,
        // Detaillierter Vergleich für die Fehlersuche
        characterComparison: testKey ? Array.from(testKey).map((char, i) => ({
          position: i,
          testChar: char,
          expectedChar: expectedKey[i] || null,
          matches: char === expectedKey[i]
        })) : [],
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Fehler bei der Verarbeitung',
      details: (error as Error).message
    }, { status: 400 });
  }
}
