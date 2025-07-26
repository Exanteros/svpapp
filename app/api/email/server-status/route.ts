import { NextRequest, NextResponse } from 'next/server';
import { getEmailServer } from '@/lib/email-server';

export async function GET(request: NextRequest) {
  try {
    const emailServer = getEmailServer();
    const status = emailServer.getStatus();
    
    return NextResponse.json({
      success: true,
      emailServer: status,
      integration: 'internal',
      message: status.running 
        ? 'Integrierter Email-Server läuft' 
        : 'Email-Server gestoppt'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Email-Server Status nicht verfügbar',
      integration: 'internal'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    const emailServer = getEmailServer();
    
    if (action === 'start') {
      await emailServer.start();
      return NextResponse.json({
        success: true,
        message: 'Email-Server gestartet'
      });
    } else if (action === 'stop') {
      await emailServer.stop();
      return NextResponse.json({
        success: true,
        message: 'Email-Server gestoppt'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Unbekannte Aktion'
      }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Email-Server Aktion fehlgeschlagen'
    }, { status: 500 });
  }
}
