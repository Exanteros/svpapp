import { NextRequest, NextResponse } from 'next/server';
import { createSession, verifyCredentials } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email und Passwort sind erforderlich' },
        { status: 400 }
      );
    }

    // Verify credentials
    if (!verifyCredentials(email, password)) {
      return NextResponse.json(
        { error: 'Ungültige Anmeldedaten' },
        { status: 401 }
      );
    }

    // Create session
    const sessionToken = await createSession(email);

    console.log('✅ Login erfolgreich für:', email);

    return NextResponse.json({
      success: true,
      message: 'Anmeldung erfolgreich',
      token: sessionToken
    });

  } catch (error) {
    console.error('❌ Login-Fehler:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
