import { NextRequest, NextResponse } from 'next/server';

import { verifyApiAuth } from '@/lib/dal';
import { createSession } from '@/lib/session';
import {
  deletePasskey,
  generateInviteRegistrationOptions,
  generatePasskeyAuthenticationOptions,
  generatePasskeyRegistrationOptions,
  getAdminInviteInfo,
  getRegisteredPasskeys,
  hasRegisteredPasskeys,
  verifyPasskeyAuthentication,
  verifyPasskeyRegistration,
} from '@/lib/passkey-manager';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'authentication-options':
        if (!hasRegisteredPasskeys()) {
          return NextResponse.json({ error: 'Kein Passkey registriert' }, { status: 404 });
        }

        return NextResponse.json(await generatePasskeyAuthenticationOptions(request.nextUrl.origin));

      case 'has-passkeys':
        return NextResponse.json({ hasPasskeys: hasRegisteredPasskeys() });

      case 'is-supported':
        return NextResponse.json({ isSupported: true, isPlatformAvailable: true });

      case 'invite-info': {
        const token = searchParams.get('token') || '';
        const invite = getAdminInviteInfo(token);

        if (!invite) {
          return NextResponse.json({ error: 'Einladungslink ist ungültig oder abgelaufen' }, { status: 404 });
        }

        return NextResponse.json({ invite });
      }

      case 'invite-registration-options': {
        const token = searchParams.get('token') || '';
        return NextResponse.json(await generateInviteRegistrationOptions(token, request.nextUrl.origin));
      }

      case 'registration-options':
      case 'list-passkeys': {
        const authResult = await verifyApiAuth(request);

        if (!authResult.authenticated) {
          return NextResponse.json(
            { error: authResult.error },
            { status: authResult.status }
          );
        }

        if (!authResult.user) {
          return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
        }

        if (action === 'registration-options') {
          return NextResponse.json(await generatePasskeyRegistrationOptions(request.nextUrl.origin, authResult.user.id));
        }

        return NextResponse.json({ passkeys: getRegisteredPasskeys() });
      }

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

    if (body.action === 'authenticate') {
      const passkeyAuthResult = await verifyPasskeyAuthentication(
        body.credential,
        String(body.challenge || ''),
        request.nextUrl.origin
      );

      if (!passkeyAuthResult.success || !passkeyAuthResult.user) {
        return NextResponse.json(
          { success: false, error: passkeyAuthResult.error },
          { status: 401 }
        );
      }

      await createSession(passkeyAuthResult.user.email, passkeyAuthResult.user.id);
      return NextResponse.json({ success: true, message: 'Authentifizierung erfolgreich' });
    }

    if (body.action === 'invite-register') {
      const registrationResult = await verifyPasskeyRegistration(
        body.credential,
        String(body.challenge || ''),
        request.nextUrl.origin
      );

      if (!registrationResult.success) {
        return NextResponse.json(
          { success: false, error: registrationResult.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        credentialId: registrationResult.credentialId,
        message: 'Passkey erfolgreich registriert',
      });
    }

    const apiAuthResult = await verifyApiAuth(request);

    if (!apiAuthResult.authenticated) {
      return NextResponse.json(
        { error: apiAuthResult.error },
        { status: apiAuthResult.status }
      );
    }

    if (body.action === 'register') {
      const registrationResult = await verifyPasskeyRegistration(
        body.credential,
        String(body.challenge || ''),
        request.nextUrl.origin
      );

      if (!registrationResult.success) {
        return NextResponse.json(
          { success: false, error: registrationResult.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        credentialId: registrationResult.credentialId,
        message: 'Passkey erfolgreich registriert',
      });
    }

    if (body.action === 'delete') {
      const deleted = deletePasskey(body.credentialId);

      return NextResponse.json({
        success: deleted,
        message: deleted ? 'Passkey gelöscht' : 'Passkey nicht gefunden',
      });
    }

    return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 });
  } catch (error) {
    console.error('Passkey API error:', error);
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 });
  }
}
