import { NextRequest, NextResponse } from 'next/server';

import { verifyApiAuth } from '@/lib/dal';
import {
  createAdminInvite,
  deactivateAdminUser,
  deleteAdminUser,
  getOrCreateAdminInvite,
  listAdminUsers,
  regenerateAdminInvite,
} from '@/lib/passkey-manager';
import { sendAdminInviteEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  const authResult = await verifyApiAuth(request);

  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  return NextResponse.json({
    admins: listAdminUsers(request.nextUrl.origin),
  });
}

export async function POST(request: NextRequest) {
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

  try {
    const body = await request.json().catch(() => ({}));

    if (body.action === 'create') {
      const admin = createAdminInvite(
        {
          email: String(body.email || ''),
          name: typeof body.name === 'string' ? body.name : undefined,
        },
        request.nextUrl.origin,
        authResult.user.id
      );

      return NextResponse.json({ success: true, admin });
    }

    if (body.action === 'regenerate-invite') {
      const admin = regenerateAdminInvite(String(body.adminId || ''), request.nextUrl.origin);

      return NextResponse.json({ success: true, admin });
    }

    if (body.action === 'send-invite') {
      const admin = getOrCreateAdminInvite(String(body.adminId || ''), request.nextUrl.origin);
      const emailResult = await sendAdminInviteEmail(admin);

      if (!emailResult.success) {
        return NextResponse.json(
          { success: false, error: emailResult.error || 'Einladung konnte nicht verschickt werden' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        admin,
        messageId: emailResult.messageId,
        previewUrl: emailResult.previewUrl,
      });
    }

    if (body.action === 'deactivate') {
      const deactivated = deactivateAdminUser(String(body.adminId || ''));

      return NextResponse.json({ success: deactivated });
    }

    if (body.action === 'delete') {
      const deleted = deleteAdminUser(String(body.adminId || ''));

      return NextResponse.json({ success: deleted });
    }

    return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 });
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Admin konnte nicht aktualisiert werden' },
      { status: 400 }
    );
  }
}
