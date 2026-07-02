import { NextRequest, NextResponse } from 'next/server';
import { getSpielplan, replaceSpielplanFromSnapshot, type SpielplanSnapshotSpiel } from '@/lib/db';
import { verifyApiAuth } from '@/lib/dal';
import { notifySpielplanChanged } from '@/lib/spielplan-events';

export const runtime = 'nodejs';

const SNAPSHOT_KIND = 'svp-spielplan-snapshot';
const MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024;
const REQUIRED_SPIEL_FIELDS: Array<keyof SpielplanSnapshotSpiel> = [
  'datum',
  'zeit',
  'feld',
  'kategorie',
  'team1',
  'team2',
];

export async function GET(request: NextRequest) {
  const authResult = await verifyApiAuth(request);

  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const spiele = getSpielplan() as SpielplanSnapshotSpiel[];
    const exportedAt = new Date().toISOString();
    const snapshot = {
      kind: SNAPSHOT_KIND,
      version: 1,
      exportedAt,
      count: spiele.length,
      spiele,
    };
    const filename = `svp-spielplan-${exportedAt.slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(snapshot, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('❌ Fehler beim Exportieren des Spielplans:', error);
    return NextResponse.json(
      { error: 'Spielplan konnte nicht exportiert werden' },
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
        { error: 'Spielplan-Datei fehlt' },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_SNAPSHOT_BYTES) {
      return NextResponse.json(
        { error: 'Spielplan-Datei ist leer oder zu groß' },
        { status: 400 }
      );
    }

    const snapshot = JSON.parse(await file.text()) as unknown;
    const spiele = parseSnapshot(snapshot);
    const result = replaceSpielplanFromSnapshot(spiele);

    notifySpielplanChanged({ reason: 'schedule-import' });

    return NextResponse.json({
      success: true,
      message: 'Spielplan erfolgreich importiert',
      spiele: getSpielplan(),
      ...result,
    });
  } catch (error) {
    console.error('❌ Fehler beim Importieren des Spielplans:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Spielplan konnte nicht importiert werden' },
      { status: 400 }
    );
  }
}

function parseSnapshot(snapshot: unknown): SpielplanSnapshotSpiel[] {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('Ungültige Spielplan-Datei');
  }

  const payload = snapshot as { kind?: unknown; spiele?: unknown };

  if (payload.kind !== SNAPSHOT_KIND) {
    throw new Error('Diese Datei ist kein SVP-Spielplan-Export');
  }

  if (!Array.isArray(payload.spiele)) {
    throw new Error('Spielplan-Datei enthält keine Spiele');
  }

  return payload.spiele.map((spiel, index) => parseSnapshotSpiel(spiel, index));
}

function parseSnapshotSpiel(spiel: unknown, index: number): SpielplanSnapshotSpiel {
  if (!spiel || typeof spiel !== 'object') {
    throw new Error(`Spiel ${index + 1} ist ungültig`);
  }

  const row = spiel as Partial<Record<keyof SpielplanSnapshotSpiel, unknown>>;

  for (const field of REQUIRED_SPIEL_FIELDS) {
    if (!isNonEmptyString(row[field])) {
      throw new Error(`Spiel ${index + 1}: ${field} fehlt`);
    }
  }

  return {
    id: optionalString(row.id),
    datum: String(row.datum).trim(),
    zeit: String(row.zeit).trim(),
    feld: String(row.feld).trim(),
    kategorie: String(row.kategorie).trim(),
    team1: String(row.team1).trim(),
    team2: String(row.team2).trim(),
    status: optionalString(row.status),
    schiedsrichter: optionalString(row.schiedsrichter),
    ergebnis: optionalString(row.ergebnis),
    tore_team1: optionalNumber(row.tore_team1),
    tore_team2: optionalNumber(row.tore_team2),
  };
}

function isNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
