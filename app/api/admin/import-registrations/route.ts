import { NextRequest, NextResponse } from 'next/server';

import { verifyApiAuth } from '@/lib/dal';
import { importAnmeldungen, type RegistrationImportMode } from '@/lib/db';
import { normalizeRegistrationImportRows, parseRegistrationImportFile } from '@/lib/registration-import';

export const runtime = 'nodejs';

const MAX_IMPORT_SIZE = 5 * 1024 * 1024;
const importModes = new Set<RegistrationImportMode>(['teams_payments', 'payments_only']);

export async function POST(request: NextRequest) {
  const authResult = await verifyApiAuth(request);

  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const formData = await request.formData();
    const uploadedFile = formData.get('file');

    if (!uploadedFile || typeof uploadedFile === 'string') {
      return NextResponse.json({ error: 'Keine Importdatei gefunden' }, { status: 400 });
    }

    if (uploadedFile.size > MAX_IMPORT_SIZE) {
      return NextResponse.json({ error: 'Die Importdatei darf maximal 5 MB groß sein' }, { status: 413 });
    }

    const modeValue = String(formData.get('mode') || 'teams_payments') as RegistrationImportMode;
    const mode = importModes.has(modeValue) ? modeValue : 'teams_payments';
    const replaceTeams = String(formData.get('replaceTeams') || 'true') !== 'false';

    const parsedRows = await parseRegistrationImportFile(uploadedFile.name, await uploadedFile.arrayBuffer());
    const normalizedImport = normalizeRegistrationImportRows(parsedRows);

    if (normalizedImport.entries.length === 0) {
      return NextResponse.json(
        {
          error: 'Keine importierbaren Zeilen gefunden. Die erste Zeile muss Überschriften enthalten.',
          warnings: normalizedImport.warnings,
        },
        { status: 400 }
      );
    }

    const importResult = importAnmeldungen(normalizedImport.entries, { mode, replaceTeams });

    return NextResponse.json({
      success: true,
      mode,
      replaceTeams,
      summary: {
        ...importResult,
        rows: normalizedImport.rows,
        warnings: [...normalizedImport.warnings, ...importResult.warnings],
      },
    });
  } catch (error) {
    console.error('Import der Anmeldungen fehlgeschlagen:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import fehlgeschlagen' },
      { status: 500 }
    );
  }
}
