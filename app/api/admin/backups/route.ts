import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { createDatabaseBackup, restoreDatabaseFromBuffer } from '@/lib/db';
import { verifyApiAuth } from '@/lib/dal';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authResult = await verifyApiAuth(request);

  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const backupPath = await createDatabaseBackup();
    const backup = fs.readFileSync(backupPath);
    const filename = path.basename(backupPath);

    return new NextResponse(backup, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.sqlite3',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Backups:', error);
    return NextResponse.json(
      { error: 'Backup konnte nicht erstellt werden' },
      { status: 500 }
    );
  }
}

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
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Backup-Datei fehlt' },
        { status: 400 }
      );
    }

    const maxSizeBytes = Number.parseInt(process.env.DATABASE_RESTORE_MAX_BYTES || `${50 * 1024 * 1024}`, 10);

    if (file.size <= 0 || file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: 'Backup-Datei ist leer oder zu groß' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = restoreDatabaseFromBuffer(buffer);

    return NextResponse.json({
      success: true,
      message: 'Backup erfolgreich wiederhergestellt',
      preRestoreBackupPath: result.preRestoreBackupPath,
    });
  } catch (error) {
    console.error('❌ Fehler beim Wiederherstellen des Backups:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Backup konnte nicht wiederhergestellt werden' },
      { status: 400 }
    );
  }
}
