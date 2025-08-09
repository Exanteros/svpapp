import { NextRequest, NextResponse } from 'next/server';
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

  // Protected data - only available to authenticated users
  const protectedData = {
    message: 'Herzlichen Glückwunsch! Sie haben Zugriff auf geschützte Daten.',
    user: authResult.user,
    timestamp: new Date().toISOString(),
    data: {
      secretInfo: 'Diese Informationen sind nur für authentifizierte Benutzer verfügbar.',
      adminLevel: 'full'
    }
  };

  return NextResponse.json(protectedData);
}

export async function POST(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyApiAuth(request);
  
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = await request.json();
    
    // Process protected data - Ensure authResult.user is not undefined
    if (!authResult.user) {
      return NextResponse.json(
        { error: 'Benutzerinformationen nicht verfügbar' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Daten erfolgreich verarbeitet',
      processedBy: authResult.user.email,
      receivedData: body
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Ungültige JSON-Daten' },
      { status: 400 }
    );
  }
}
