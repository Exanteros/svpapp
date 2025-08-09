import { NextRequest, NextResponse } from 'next/server';
import { 
  generatePasskeyRegistrationOptions, 
  generatePasskeyAuthenticationOptions,
  verifyPasskeyRegistration,
  verifyPasskeyAuthentication,
  hasRegisteredPasskeys,
  getRegisteredPasskeys,
  deletePasskey,
  isPasskeySupported,
  isPlatformAuthenticatorAvailable
} from '@/lib/passkey-manager';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'registration-options':
        const registrationOptions = generatePasskeyRegistrationOptions();
        return NextResponse.json(registrationOptions);

      case 'authentication-options':
        const authenticationOptions = generatePasskeyAuthenticationOptions();
        return NextResponse.json(authenticationOptions);

      case 'has-passkeys':
        return NextResponse.json({ hasPasskeys: hasRegisteredPasskeys() });

      case 'list-passkeys':
        return NextResponse.json({ passkeys: getRegisteredPasskeys() });

      case 'is-supported':
        return NextResponse.json({ 
          isSupported: true, // Server-side kann nicht testen, Client muss prüfen
          isPlatformAvailable: true // Wird client-side geprüft
        });

      default:
        return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 });
    }
  } catch (error) {
    console.error('Passkey API error:', error);
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'register':
        const registrationResult = verifyPasskeyRegistration(body.credential, body.challenge);
        if (registrationResult.success) {
          return NextResponse.json({ 
            success: true, 
            credentialId: registrationResult.credentialId,
            message: 'Passkey erfolgreich registriert' 
          });
        } else {
          return NextResponse.json({ 
            success: false, 
            error: registrationResult.error 
          }, { status: 400 });
        }

      case 'authenticate':
        const authResult = verifyPasskeyAuthentication(body.credential, body.challenge);
        if (authResult.success) {
          return NextResponse.json({ 
            success: true, 
            message: 'Authentifizierung erfolgreich' 
          });
        } else {
          return NextResponse.json({ 
            success: false, 
            error: authResult.error 
          }, { status: 401 });
        }

      case 'delete':
        const deleteResult = deletePasskey(body.credentialId);
        return NextResponse.json({ 
          success: deleteResult,
          message: deleteResult ? 'Passkey gelöscht' : 'Passkey nicht gefunden'
        });

      case 'create-admin':
        // Placeholder für Admin-Erstellung
        return NextResponse.json({ 
          success: false,
          error: 'Diese Funktion ist noch nicht implementiert'
        }, { status: 501 });

      case 'login-email':
        // Placeholder für E-Mail-Login
        return NextResponse.json({ 
          success: false,
          error: 'Diese Funktion ist noch nicht implementiert'
        }, { status: 501 });

      case 'logout':
        // Placeholder für Logout
        return NextResponse.json({ 
          success: true,
          message: 'Erfolgreich abgemeldet'
        });

      default:
        return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 });
    }
  } catch (error) {
    console.error('Passkey API error:', error);
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 });
  }
}
