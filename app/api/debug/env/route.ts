import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Only in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL ? 'SET' : 'NOT SET',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? 'SET' : 'NOT SET',
    SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET',
    // Show first 3 chars for debugging
    ADMIN_EMAIL_START: process.env.ADMIN_EMAIL?.substring(0, 3),
    ADMIN_PASSWORD_START: process.env.ADMIN_PASSWORD?.substring(0, 3),
  });
}
