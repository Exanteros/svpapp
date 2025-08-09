import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllHelferBedarf, 
  getAllHelferAnmeldungen, 
  getHelferLink,
  createHelferBedarf,
  deleteHelferBedarf,
  generateHelferLink,
  updateHelferStatus,
  updateHelferBedarf,
  flushHelferDatabase,
  createHelferDemoData
} from '@/lib/db';
import { verifyApiAuth } from '@/lib/dal';

export async function GET(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyApiAuth(request);
  
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const bedarf = getAllHelferBedarf();
    const anmeldungen = getAllHelferAnmeldungen();
    const helferLink = getHelferLink();

    return NextResponse.json({
      bedarf,
      anmeldungen,
      helferLink
    });
  } catch (error) {
    console.error('Fehler beim Laden der Helfer-Daten:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Helfer-Daten' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyApiAuth(request);
  
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { action, ...data } = await request.json();

    switch (action) {
      case 'save_bedarf':
        const result = createHelferBedarf(data.bedarf);
        return NextResponse.json({ success: true, ...result });
        
      case 'delete_bedarf':
        console.log('Delete bedarf called with data:', data);
        const bedarfId = data.bedarfId || data.id;
        if (!bedarfId) {
          return NextResponse.json(
            { error: 'Keine Bedarf-ID angegeben' },
            { status: 400 }
          );
        }
        const deleteResult = deleteHelferBedarf(bedarfId);
        console.log('Delete result:', deleteResult);
        return NextResponse.json({ success: true, deleted: deleteResult.changes > 0 });
        
      case 'generate_link':
        const helferLink = generateHelferLink();
        return NextResponse.json({ helferLink });
        
      case 'update_status':
        updateHelferStatus(data.anmeldungId, data.status);
        return NextResponse.json({ success: true });
        
      case 'update_bedarf':
        const updateResult = updateHelferBedarf(data.id, data.bedarf);
        return NextResponse.json({ success: true, ...updateResult });
        
      case 'flush_database':
        const flushResult = flushHelferDatabase();
        return NextResponse.json({ 
          success: true, 
          message: 'Helper database flushed successfully',
          result: flushResult 
        });
        
      case 'create_demo_data':
        const demoResult = createHelferDemoData();
        return NextResponse.json({ 
          success: true, 
          message: 'Demo data created successfully',
          result: demoResult 
        });
        
      default:
        return NextResponse.json(
          { error: 'Unbekannte Aktion' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Fehler bei der Helfer-API:', error);
    return NextResponse.json(
      { error: 'Serverfehler' },
      { status: 500 }
    );
  }
}
