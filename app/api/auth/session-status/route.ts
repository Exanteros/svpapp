import { NextRequest, NextResponse } from 'next/server';

import { verifyApiAuth } from '@/lib/dal';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const authResult = await verifyApiAuth(request);

  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  return NextResponse.json({
    authenticated: true,
    user: authResult.user,
    serverTime: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
  });
}
