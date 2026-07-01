import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/dal';

// Debug-Endpunkt zur Überprüfung des API-Schlüssels
export async function GET(request: NextRequest) {
  // Nur im Entwicklungsmodus verfügbar
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  // Verify authentication even in development
  const authResult = await verifyApiAuth(request);
  
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }
  
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const cookies = request.cookies;
  const apiKeyCookie = cookies.get('svp-admin-key');
  const expectedKey = process.env.ADMIN_API_KEY;
  
  return NextResponse.json({
    message: 'API-Schlüssel Debug-Informationen',
    expected: {
      configured: Boolean(expectedKey),
      length: expectedKey?.length || 0,
    },
    received: {
      fromHeader: apiKey ? {
        key: maskSecret(apiKey),
        length: apiKey.length,
        matches: expectedKey ? apiKey === expectedKey : false
      } : 'Nicht vorhanden',
      fromCookie: apiKeyCookie ? {
        key: maskSecret(apiKeyCookie.value),
        length: apiKeyCookie.value.length,
        matches: expectedKey ? apiKeyCookie.value === expectedKey : false
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
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  try {
    const { testKey } = await request.json();
    const expectedKey = process.env.ADMIN_API_KEY;
    
    return NextResponse.json({
      message: 'API-Schlüssel Test',
      testKey: {
        value: typeof testKey === 'string' ? maskSecret(testKey) : null,
        length: testKey?.length || 0,
      },
      expectedKey: {
        configured: Boolean(expectedKey),
        length: expectedKey?.length || 0,
      },
      comparison: {
        isExactMatch: Boolean(expectedKey) && testKey === expectedKey,
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Fehler bei der Verarbeitung',
      details: (error as Error).message
    }, { status: 400 });
  }
}

function maskSecret(value: string) {
  if (value.length <= 8) {
    return '********';
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
