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
import { authenticateAdmin, createAuthResponse, createErrorResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Authenticate admin user
  const auth = await authenticateAdmin(request);
  if (!auth.success) {
    return createErrorResponse(auth.error || 'Zugriff verweigert', auth.status || 401, auth.headers);
  }

  try {
    const bedarf = getAllHelferBedarf();
    const anmeldungen = getAllHelferAnmeldungen();
    const helferLink = getHelferLink();

    return createAuthResponse({
      bedarf,
      anmeldungen,
      helferLink
    });
  } catch (error) {
    console.error('Fehler beim Laden der Helfer-Daten:', error);
    return createErrorResponse('Fehler beim Laden der Helfer-Daten', 500);
  }
}

export async function POST(request: NextRequest) {
  // Authenticate admin user
  const auth = await authenticateAdmin(request);
  if (!auth.success) {
    return createErrorResponse(auth.error || 'Zugriff verweigert', auth.status || 401, auth.headers);
  }

  try {
    const { action, ...data } = await request.json();

    switch (action) {
      case 'save_bedarf':
        const result = createHelferBedarf(data.bedarf);
        return createAuthResponse({ success: true, ...result }, auth.headers);
        
      case 'delete_bedarf':
        deleteHelferBedarf(data.id);
        return createAuthResponse({ success: true }, auth.headers);
        
      case 'generate_link':
        const helferLink = generateHelferLink();
        return createAuthResponse({ helferLink }, auth.headers);
        
      case 'update_status':
        updateHelferStatus(data.anmeldungId, data.status);
        return createAuthResponse({ success: true }, auth.headers);
        
      case 'update_bedarf':
        const updateResult = updateHelferBedarf(data.id, data.bedarf);
        return createAuthResponse({ success: true, ...updateResult }, auth.headers);
        
      case 'flush_database':
        const flushResult = flushHelferDatabase();
        return createAuthResponse({ 
          success: true, 
          message: 'Helper database flushed successfully',
          result: flushResult 
        }, auth.headers);
        
      case 'create_demo_data':
        const demoResult = createHelferDemoData();
        return createAuthResponse({ 
          success: true, 
          message: 'Demo data created successfully',
          result: demoResult 
        }, auth.headers);
        
      default:
        return createErrorResponse('Unbekannte Aktion', 400);
    }
  } catch (error) {
    console.error('Fehler bei der Helfer-API:', error);
    return createErrorResponse('Serverfehler', 500);
  }
}
