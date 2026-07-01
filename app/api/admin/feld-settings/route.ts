import { NextRequest, NextResponse } from 'next/server';
import { getStoredFeldEinstellungen, saveStoredFeldEinstellungen, updateSpielFeldnamen, type SpielFeldRename } from '@/lib/db';
import { verifyApiAuth } from '@/lib/dal';
import { DEFAULT_FELD_EINSTELLUNGEN, getDuplicateFeldnamen, type FeldEinstellungen } from '@/lib/tournament';
import { notifySpielplanChanged } from '@/lib/spielplan-events';

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

    const duplicateFeldnamen = getDuplicateFeldnamen(feldEinstellungen);

    if (duplicateFeldnamen.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Feldnamen müssen eindeutig sein: ${duplicateFeldnamen.join(', ')}`,
          duplicateFeldnamen,
        },
        { status: 400 }
      );
    }

    const previousFeldEinstellungen = getStoredFeldEinstellungen();
    const savedFeldEinstellungen = saveStoredFeldEinstellungen(feldEinstellungen);
    const fieldRenames = getFieldRenames(previousFeldEinstellungen, savedFeldEinstellungen);
    const renamedSpiele = updateSpielFeldnamen(fieldRenames).changes;

    if (renamedSpiele > 0 || fieldRenames.length > 0) {
      notifySpielplanChanged({ reason: 'field-settings' });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Field settings saved successfully',
      feldEinstellungen: savedFeldEinstellungen,
      fieldRenames,
      renamedSpiele,
    });

  } catch (error) {
    console.error('Error saving field settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save field settings' },
      { status: 500 }
    );
  }
}

function getFieldRenames(
  previousFields: FeldEinstellungen[],
  nextFields: FeldEinstellungen[]
): SpielFeldRename[] {
  const previousById = new Map(previousFields.map((field) => [field.id, field.name]));

  return nextFields.reduce<SpielFeldRename[]>((renames, field) => {
    const previousName = previousById.get(field.id);

    if (previousName && previousName !== field.name) {
      renames.push({
        id: field.id,
        from: previousName,
        to: field.name,
      });
    }

    return renames;
  }, []);
}
