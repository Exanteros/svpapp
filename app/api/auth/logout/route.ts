import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    await deleteSession();
    
    console.log('✅ Logout erfolgreich');
    
    return NextResponse.json({
      success: true,
      message: 'Erfolgreich abgemeldet'
    });

  } catch (error) {
    console.error('❌ Logout-Fehler:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
