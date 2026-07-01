import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminSettings,
  getSpielplan,
  createSpiel,
  updateSpielErgebnis,
  updateSpiel,
  deleteSpiel,
  deleteAllSpiele,
  saveStoredFeldEinstellungen,
  setSpielplanPublicationStatus,
} from '@/lib/db';
import { verifyApiAuth } from '@/lib/dal';
import { SpielplanGenerationError, generateSpielplan, optimizeSpielzeitenForSchedule } from '@/lib/spielplan-generator';
import { notifySpielplanChanged } from '@/lib/spielplan-events';
import { hideInternalScoresForPublic, type ScoreBearingSpiel } from '@/lib/tournament';

type PublicSpiel = ScoreBearingSpiel & Record<string, unknown>;

export async function GET(request: NextRequest) {
  // For public viewing, allow without authentication
  // But for admin operations, authentication is required in POST
  try {
    const { searchParams } = new URL(request.url);
    const datum = searchParams.get('datum');
    
    const settings = getAdminSettings();
    const authResult = await verifyApiAuth(request);
    const canViewDraft = authResult.authenticated || settings.spielplanStatus === 'published';
    const rawSpiele = canViewDraft ? getSpielplan(datum || undefined) as PublicSpiel[] : [];
    const spiele = authResult.authenticated ? rawSpiele : hideInternalScoresForPublic(rawSpiele, settings);
    
    return NextResponse.json({
      spiele,
      datum: datum || 'alle'
    });
  } catch (error) {
    console.error('❌ Fehler beim Laden des Spielplans:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
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
    const body = await request.json();
    const action = body.action;
    const validActions = new Set(['deleteAll', 'generate', 'create', 'update', 'delete', 'publish', 'unpublish']);

    if (!validActions.has(action)) {
      return NextResponse.json(
        { error: 'Ungültige Aktion' },
        { status: 400 }
      );
    }
    
    if (action === 'deleteAll') {
      // Lösche alle Spiele
      const result = deleteAllSpiele();
      notifySpielplanChanged({ reason: 'schedule-delete-all' });
      return NextResponse.json({
        message: `Alle Spiele wurden gelöscht (${result.deleted} Einträge entfernt)`,
        result
      });
    }

    if (action === 'publish') {
      const publication = setSpielplanPublicationStatus('published');
      notifySpielplanChanged({ reason: 'schedule-publish' });
      return NextResponse.json({
        message: 'Spielplan veröffentlicht',
        ...publication,
      });
    }

    if (action === 'unpublish') {
      const publication = setSpielplanPublicationStatus('draft');
      notifySpielplanChanged({ reason: 'schedule-unpublish' });
      return NextResponse.json({
        message: 'Spielplan zurückgezogen',
        ...publication,
      });
    }
    
    if (action === 'generate') {
      // Spielplan-Generator
      const autoSpielzeiten = body.settings?.spielzeitenAutomatisch !== false;
      const optimized = autoSpielzeiten
        ? optimizeSpielzeitenForSchedule({
          settings: body.settings,
          feldEinstellungen: body.feldEinstellungen,
        })
        : null;
      const generationFields = optimized?.feldEinstellungen ?? body.feldEinstellungen;
      const generatedSpiele = generateSpielplan({
        settings: body.settings,
        feldEinstellungen: generationFields,
        replaceExisting: Boolean(body.replaceExisting),
      });
      const feldEinstellungen = optimized
        ? saveStoredFeldEinstellungen(optimized.feldEinstellungen)
        : undefined;
      const publication = setSpielplanPublicationStatus('draft');
      notifySpielplanChanged({ reason: 'schedule-generate' });
      return NextResponse.json({
        message: 'Spielplan erfolgreich generiert',
        spiele: generatedSpiele,
        feldEinstellungen,
        spielzeitOptimierung: optimized?.optimierung ?? [],
        ...publication,
      });
    }
    
    if (action === 'create') {
      // Einzelnes Spiel erstellen
      const spielId = createSpiel(body.spiel);
      setSpielplanPublicationStatus('draft');
      notifySpielplanChanged({ reason: 'schedule-create', spielId: String(spielId) });
      return NextResponse.json({
        message: 'Spiel erfolgreich erstellt',
        spielId
      });
    }
    
    if (action === 'update') {
      // Spiel aktualisieren (Drag & Drop)
      if (body.spiel) {
        if (body.spiel.status && !['geplant', 'laufend', 'halbzeit', 'beendet'].includes(body.spiel.status)) {
          return NextResponse.json(
            { error: 'Ungültiger Spielstatus' },
            { status: 400 }
          );
        }

        const result = updateSpiel(body.spielId, body.spiel);
        setSpielplanPublicationStatus('draft');
        notifySpielplanChanged({
          reason: 'schedule-update',
          spielId: String(body.spielId || ''),
          status: body.spiel.status,
        });
        return NextResponse.json({
          message: 'Spiel erfolgreich aktualisiert',
          result
        });
      }
      
      // Spielergebnis aktualisieren
      if (body.status && !['geplant', 'laufend', 'halbzeit', 'beendet'].includes(body.status)) {
        return NextResponse.json(
          { error: 'Ungültiger Spielstatus' },
          { status: 400 }
        );
      }

      updateSpielErgebnis(body.spielId, body.ergebnis, body.status);
      notifySpielplanChanged({
        reason: 'schedule-result',
        spielId: String(body.spielId || ''),
        status: body.status || 'beendet',
      });
      return NextResponse.json({
        message: 'Spielergebnis erfolgreich aktualisiert'
      });
    }
    
    if (action === 'delete') {
      // Spiel löschen
      const result = deleteSpiel(body.spielId);
      setSpielplanPublicationStatus('draft');
      notifySpielplanChanged({ reason: 'schedule-delete', spielId: String(body.spielId || '') });
      return NextResponse.json({
        message: 'Spiel erfolgreich gelöscht',
        result
      });
    }
  } catch (error) {
    console.error('❌ Fehler bei Spielplan-Operation:', error);
    if (error instanceof SpielplanGenerationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
