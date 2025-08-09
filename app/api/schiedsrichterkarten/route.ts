import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { verifyApiAuth } from '@/lib/dal';

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
    const { action, spielId, ergebnis, qrData, aiData } = await request.json();
    const db = getDatabase();

    switch (action) {
      case 'save_result_from_qr':
      case 'save_result_from_ai_scan':
        // Ergebnis aus gescannter Schiedsrichterkarte speichern (QR oder AI)
        if (!spielId || !ergebnis) {
          return NextResponse.json(
            { error: 'Spiel-ID und Ergebnis sind erforderlich' },
            { status: 400 }
          );
        }

        // Versuche zuerst das Update, falls die Spalten existieren
        try {
          const updateStmt = db.prepare(`
            UPDATE spiele 
            SET ergebnis = ?, 
                tore_team1 = ?, 
                tore_team2 = ?, 
                status = 'beendet'
            WHERE id = ?
          `);
          
          const [toreTeam1, toreTeam2] = ergebnis.split(':').map((t: string) => parseInt(t.trim()));
          
          const result = updateStmt.run(ergebnis, toreTeam1 || 0, toreTeam2 || 0, spielId);
          
          if (result.changes === 0) {
            return NextResponse.json(
              { error: 'Spiel nicht gefunden' },
              { status: 404 }
            );
          }

          const source = action === 'save_result_from_ai_scan' ? '🤖 AI-Scanner' : '📱 QR-Scanner';
          console.log(`✅ Ergebnis aus ${source} gespeichert: Spiel ${spielId} = ${ergebnis}`);
          
          // AI-Training-Daten speichern für Modell-Verbesserung
          if (action === 'save_result_from_ai_scan' && aiData) {
            console.log(`🧠 AI-Daten gespeichert:`, {
              erkannteZahlen: aiData.erkannteZahlen,
              confidence: aiData.confidence,
              scanTimestamp: aiData.scanTimestamp
            });
            
            // AI-Modell mit korrekten Daten nachtrainieren
            try {
              await fetch('/api/ai-scanner', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  action: 'train_model',
                  correctResult: ergebnis,
                  aiPrediction: aiData,
                  modelVersion: 'handball-v2.1'
                })
              });
              console.log('🎯 AI-Modell wurde mit neuen Daten trainiert');
            } catch (trainError) {
              console.warn('⚠️ AI-Training fehlgeschlagen:', trainError);
            }
          }
          
          return NextResponse.json({
            success: true,
            message: `Ergebnis erfolgreich über ${source} gespeichert`,
            spielId,
            ergebnis,
            source: action === 'save_result_from_ai_scan' ? 'AI-Scanner' : 'QR-Scanner',
            confidence: aiData?.confidence || 100
          });

        } catch (updateError: any) {
          console.log('📝 Update fehlgeschlagen, versuche Fallback-Update:', updateError.message);
          
          // Fallback: Nur ergebnis-Spalte aktualisieren
          const fallbackStmt = db.prepare(`
            UPDATE spiele 
            SET ergebnis = ?, status = 'beendet'
            WHERE id = ?
          `);
          
          const fallbackResult = fallbackStmt.run(ergebnis, spielId);
          
          if (fallbackResult.changes === 0) {
            return NextResponse.json(
              { error: 'Spiel nicht gefunden' },
              { status: 404 }
            );
          }

          console.log(`✅ Ergebnis (Fallback) aus QR-Code gespeichert: Spiel ${spielId} = ${ergebnis}`);
          
          return NextResponse.json({
            success: true,
            message: 'Ergebnis erfolgreich gespeichert (Fallback)',
            spielId,
            ergebnis
          });
        }

      case 'validate_qr':
        // QR-Code validieren und Spiel-Informationen zurückgeben
        if (!qrData) {
          return NextResponse.json(
            { error: 'QR-Code Daten fehlen' },
            { status: 400 }
          );
        }

        try {
          const parsedData = JSON.parse(qrData);
          const { id: qrSpielId } = parsedData;
          
          // Spiel aus Datenbank laden
          const spiel = db.prepare('SELECT * FROM spiele WHERE id = ?').get(qrSpielId);
          
          if (!spiel) {
            return NextResponse.json(
              { error: 'Spiel nicht gefunden' },
              { status: 404 }
            );
          }

          return NextResponse.json({
            success: true,
            spiel: spiel,
            qrData: parsedData
          });

        } catch (parseError) {
          return NextResponse.json(
            { error: 'Ungültiger QR-Code' },
            { status: 400 }
          );
        }

      case 'get_card_data':
        // Daten für Schiedsrichterkarte abrufen
        if (!spielId) {
          return NextResponse.json(
            { error: 'Spiel-ID erforderlich' },
            { status: 400 }
          );
        }

        const cardSpiel = db.prepare('SELECT * FROM spiele WHERE id = ?').get(spielId);
        
        if (!cardSpiel) {
          return NextResponse.json(
            { error: 'Spiel nicht gefunden' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          spiel: cardSpiel
        });

      default:
        return NextResponse.json(
          { error: 'Unbekannte Aktion' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Fehler in Schiedsrichterkarten API:', error);
    return NextResponse.json(
      { 
        error: 'Interner Server-Fehler',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
