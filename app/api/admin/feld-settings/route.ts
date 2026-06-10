import { NextRequest, NextResponse } from 'next/server';
import { getStoredFeldEinstellungen, saveStoredFeldEinstellungen } from '@/lib/db';
import { verifyApiAuth } from '@/lib/dal';
import { DEFAULT_FELD_EINSTELLUNGEN } from '@/lib/tournament';

export async function GET(request: NextRequest) {
  // Verify authentication for GET requests
  const authResult = await verifyApiAuth(request);
  
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    return NextResponse.json({
      success: true,
      feldEinstellungen: getStoredFeldEinstellungen()
    });

  } catch (error) {
    console.error('Error loading field settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to load field settings',
        feldEinstellungen: DEFAULT_FELD_EINSTELLUNGEN
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Verify authentication for POST requests
  const authResult = await verifyApiAuth(request);
  
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { feldEinstellungen } = await request.json();
    
    if (!feldEinstellungen || !Array.isArray(feldEinstellungen)) {
      return NextResponse.json(
        { success: false, error: 'Invalid field settings format' },
        { status: 400 }
      );
    }

    const savedFeldEinstellungen = saveStoredFeldEinstellungen(feldEinstellungen);
    
    return NextResponse.json({
      success: true,
      message: 'Field settings saved successfully',
      feldEinstellungen: savedFeldEinstellungen
    });

  } catch (error) {
    console.error('Error saving field settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save field settings' },
      { status: 500 }
    );
  }
}
