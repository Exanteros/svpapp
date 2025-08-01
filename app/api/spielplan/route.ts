import { NextRequest, NextResponse } from 'next/server';
import { getSpielplan, createSpiel, updateSpielErgebnis, updateSpiel, deleteSpiel, getAllAnmeldungen } from '@/lib/db';
import { authenticateAdmin, createAuthResponse, createErrorResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // For public viewing, allow without authentication
  // But for admin operations, authentication is required in POST
  try {
    const { searchParams } = new URL(request.url);
    const datum = searchParams.get('datum');
    
    const spiele = getSpielplan(datum || undefined);
    
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
  console.log('🔍 Spielplan POST - Authentifizierung beginnt...');
  
  // Check for session token first
  const sessionToken = request.headers.get('x-session-token');
  console.log('🔑 Session Token gefunden:', sessionToken ? 'JA' : 'NEIN');
  
  if (sessionToken) {
    // Import the function here to avoid naming conflicts
    const { verifyAdminSession } = await import('@/lib/auth');
    const isValid = verifyAdminSession(sessionToken);
    console.log('✅ Session Token gültig:', isValid);
    
    if (!isValid) {
      console.log('❌ Session Token ungültig - Zugriff verweigert');
      return createErrorResponse('Ungültiges Session-Token', 401);
    }
    console.log('✅ Session Token erfolgreich validiert');
  } else {
    console.log('🔄 Kein Session Token - Fallback zu vollständiger Authentifizierung');
    // Fall back to full authentication
    const auth = await authenticateAdmin(request);
    if (!auth.success) {
      console.log('❌ Vollständige Authentifizierung fehlgeschlagen:', auth.error);
      return createErrorResponse(auth.error || 'Zugriff verweigert', auth.status || 401, auth.headers);
    }
    console.log('✅ Vollständige Authentifizierung erfolgreich');
  }

  try {
    const body = await request.json();
    
    if (body.action === 'deleteAll') {
      // Lösche alle Spiele
      const { deleteAllSpiele } = await import('@/lib/db');
      const result = deleteAllSpiele();
      return createAuthResponse({
        message: `Alle Spiele wurden gelöscht (${result.deleted} Einträge entfernt)`,
        result
      });
    }
    
    if (body.action === 'generate') {
      // Spielplan-Generator
      const generatedSpiele = await generateSpielplan(body);
      return createAuthResponse({
        message: 'Spielplan erfolgreich generiert',
        spiele: generatedSpiele
      });
    }
    
    if (body.action === 'create') {
      // Einzelnes Spiel erstellen
      const spielId = createSpiel(body.spiel);
      return createAuthResponse({
        message: 'Spiel erfolgreich erstellt',
        spielId
      });
    }
    
    if (body.action === 'update') {
      // Spiel aktualisieren (Drag & Drop)
      if (body.spiel) {
        const result = updateSpiel(body.spielId, body.spiel);
        return createAuthResponse({
          message: 'Spiel erfolgreich aktualisiert',
          result
        });
      }
      
      // Spielergebnis aktualisieren
      updateSpielErgebnis(body.spielId, body.ergebnis, body.status);
      return createAuthResponse({
        message: 'Spielergebnis erfolgreich aktualisiert'
      });
    }
    
    if (body.action === 'delete') {
      // Spiel löschen
      const result = deleteSpiel(body.spielId);
      return createAuthResponse({
        message: 'Spiel erfolgreich gelöscht',
        result
      });
    }
    
    return createErrorResponse('Ungültige Aktion', 400);
  } catch (error) {
    console.error('❌ Fehler bei Spielplan-Operation:', error);
    return createErrorResponse('Interner Serverfehler', 500);
  }
}

// Erweiterte Spielplan-Generator-Funktion
async function generateSpielplan(params: any) {
  console.log('🏁 Spielplan-Generator gestartet mit Parametern:', JSON.stringify(params, null, 2));
  
  const anmeldungen = getAllAnmeldungen();
  console.log(`📋 Anmeldungen geladen: ${anmeldungen.length}`);
  
  interface FeldEinstellungen {
    id: string;
    name: string;
    spielzeit: number;
    pausenzeit: number;
    halbzeitpause: number;
    zweiHalbzeiten: boolean;
    erlaubteJahrgaenge?: string[];
    erlaubteJahrgaengeProTag?: {
      [datum: string]: string[];
    };
  }
  
  const feldEinstellungen: FeldEinstellungen[] = params.feldEinstellungen;
  
  if (!feldEinstellungen || feldEinstellungen.length === 0) {
    console.log('⚠️ Keine Feld-Einstellungen übertragen - verwende Standard-Einstellungen');
    throw new Error('Keine Feld-Einstellungen verfügbar');
  }
  
  console.log(`🏟️ Felder für Spielplan: ${feldEinstellungen.map(f => f.name).join(', ')}`);
  console.log('🏟️ Feld-Beschränkungen:', feldEinstellungen.map(f => ({
    feld: f.name,
    erlaubteJahrgaenge: f.erlaubteJahrgaenge || 'Alle',
    erlaubteJahrgaengeProTag: f.erlaubteJahrgaengeProTag || 'Keine'
  })));
  
  // Gruppiere Teams nach Kategorie und Spielniveau
  const teamsByCategory: { [key: string]: { [niveau: string]: string[] } } = {};
  
  anmeldungen.forEach(anmeldung => {
    console.log(`🏢 Verarbeite Anmeldung: ${anmeldung.verein} mit ${anmeldung.teams?.length || 0} Teams`);
    
    if (!anmeldung.teams || anmeldung.teams.length === 0) {
      console.log(`⚠️ Keine Teams für Anmeldung: ${anmeldung.verein}`);
      return;
    }
    
    anmeldung.teams.forEach((team: any) => {
      // E-Jugend Teams werden zusammengefasst
      let kategorieKey = team.kategorie;
      if (team.kategorie === 'E-Jugend') {
        kategorieKey = 'E-Jugend';
      }
      
      if (!teamsByCategory[kategorieKey]) {
        teamsByCategory[kategorieKey] = {};
      }
      
      // Verwende Spielniveau oder "Standard" als Fallback
      const niveau = team.spielstaerke || 'Standard';
      
      if (!teamsByCategory[kategorieKey][niveau]) {
        teamsByCategory[kategorieKey][niveau] = [];
      }
      
      console.log(`🏆 Kategorie ${team.kategorie} (Pool: ${kategorieKey}), Niveau: ${niveau}: ${team.anzahl} Team(s) von ${anmeldung.verein}`);
      
      // Füge Teams entsprechend der Anzahl hinzu
      for (let i = 0; i < team.anzahl; i++) {
        const teamName = `${anmeldung.verein} ${team.kategorie} ${i + 1}`;
        teamsByCategory[kategorieKey][niveau].push(teamName);
        console.log(`➕ Team hinzugefügt: ${teamName} in Pool ${kategorieKey}, Niveau ${niveau}`);
      }
    });
  });
  
  console.log('📊 Teams nach Kategorie und Niveau:', teamsByCategory);
  
  const generatedSpiele: any[] = [];
  
  // Hole die Zeiteinstellungen aus den Parametern
  const turnierSettings = params.settings || {};
  const samstagStartzeit = turnierSettings.samstagStartzeit || '09:00';
  const samstagEndzeit = turnierSettings.samstagEndzeit || '18:00';
  const sonntagStartzeit = turnierSettings.sonntagStartzeit || '09:00';
  const sonntagEndzeit = turnierSettings.sonntagEndzeit || '18:00';
  
  // Hole die Turnierdaten aus den Einstellungen
  const turnierStartDatum = turnierSettings.turnierStartDatum || '2025-07-05';
  const turnierEndDatum = turnierSettings.turnierEndDatum || '2025-07-06';
  
  console.log(`📅 Turnierdaten: ${turnierStartDatum} bis ${turnierEndDatum}`);
  console.log(`⏰ Zeiteinstellungen - Samstag: ${samstagStartzeit} - ${samstagEndzeit}, Sonntag: ${sonntagStartzeit} - ${sonntagEndzeit}`);
  
  // Log für jedes Feld die Tag-spezifischen Einstellungen
  console.log(`🔍 Debug: Tag-spezifische Feld-Einstellungen mit korrekten Datumsvergleichen:`);
  feldEinstellungen.forEach(feld => {
    console.log(`🏟️ ${feld.name} - Spezifische Jahrgänge pro Tag:`);
    if (feld.erlaubteJahrgaengeProTag) {
      Object.entries(feld.erlaubteJahrgaengeProTag).forEach(([datum, jahrgaenge]) => {
        console.log(`  📅 ${datum}: [${jahrgaenge.join(', ')}]`);
        console.log(`    🔄 Vergleich mit Turnierdaten: Samstag(${turnierStartDatum})=${datum === turnierStartDatum}, Sonntag(${turnierEndDatum})=${datum === turnierEndDatum}`);
      });
    } else {
      console.log(`  ❌ Keine Tag-spezifischen Einstellungen`);
    }
  });

  // WICHTIG: Normalisiere die Tag-spezifischen Feld-Einstellungen 
  // Das Admin-Interface verwendet feste Datumsstrings, aber der Generator verwendet dynamische Turnierdaten
  // Wir müssen diese mappen
  const normalizedFeldEinstellungen = feldEinstellungen.map(feld => {
    const normalizedErlaubteJahrgaengeProTag: { [datum: string]: string[] } = {};
    
    if (feld.erlaubteJahrgaengeProTag) {
      // Mappe bekannte feste Daten auf die dynamischen Turnierdaten
      const staticToTournament: { [key: string]: string } = {
        '2025-07-05': turnierStartDatum,  // Samstag
        '2025-07-06': turnierEndDatum     // Sonntag
      };
      
      Object.entries(feld.erlaubteJahrgaengeProTag).forEach(([staticDatum, jahrgaenge]) => {
        const tournamentDatum = staticToTournament[staticDatum] || staticDatum;
        normalizedErlaubteJahrgaengeProTag[tournamentDatum] = jahrgaenge;
        console.log(`📝 Mapping ${feld.name}: ${staticDatum} -> ${tournamentDatum}`);
      });
    }
    
    return {
      ...feld,
      erlaubteJahrgaengeProTag: normalizedErlaubteJahrgaengeProTag
    };
  });

  console.log(`✅ Feld-Einstellungen wurden normalisiert für Turnierdaten`);
  
  // Verwende die normalisierten Einstellungen ab hier
  const fieldSettings = normalizedFeldEinstellungen;
  
  // Definiere Turnierzeiten pro Tag
  const parseTime = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const samstagStart = parseTime(samstagStartzeit);
  const samstagEnde = parseTime(samstagEndzeit);
  const sonntagStart = parseTime(sonntagStartzeit);
  const sonntagEnde = parseTime(sonntagEndzeit);
  
  const verfügbareZeitSamstag = samstagEnde - samstagStart;
  const verfügbareZeitSonntag = sonntagEnde - sonntagStart;
  
  console.log(`⏰ Verfügbare Zeit - Samstag: ${verfügbareZeitSamstag} min, Sonntag: ${verfügbareZeitSonntag} min`);
  
  // Erstelle einen separaten Zeitplan für jedes Feld
  const feldZeitpläne = fieldSettings.map(feld => ({
    feld,
    zeitSlots: [] as Array<{ zeit: string, datum: string, belegt: boolean }>
  }));
  
  // Generiere Zeitslots für jedes Feld
  feldZeitpläne.forEach(feldPlan => {
    const feld = feldPlan.feld;
    const gesamtZeitProSpiel = feld.spielzeit + feld.pausenzeit + (feld.zweiHalbzeiten ? feld.halbzeitpause : 0);
    
    console.log(`🏟️ Feld ${feld.name}: ${gesamtZeitProSpiel} min pro Spiel`);
    
    // Erstelle Zeitslots für beide Turniertage mit individuellen Zeiten
    const tage = [
      { datum: turnierStartDatum, startzeit: samstagStart, verfügbareZeit: verfügbareZeitSamstag, name: 'Samstag' },
      { datum: turnierEndDatum, startzeit: sonntagStart, verfügbareZeit: verfügbareZeitSonntag, name: 'Sonntag' }
    ];
    
    tage.forEach(tag => {
      const möglicheSpieleProTag = Math.floor(tag.verfügbareZeit / gesamtZeitProSpiel);
      console.log(`🏟️ Feld ${feld.name} - ${tag.name}: ${möglicheSpieleProTag} Spiele möglich`);
      
      for (let slot = 0; slot < möglicheSpieleProTag; slot++) {
        const startzeit = tag.startzeit + (slot * gesamtZeitProSpiel);
        const stunde = Math.floor(startzeit / 60);
        const minute = startzeit % 60;
        const zeit = `${stunde.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        feldPlan.zeitSlots.push({
          zeit,
          datum: tag.datum,
          belegt: false
        });
      }
    });
  });
  
  // Erstelle Spiele basierend auf Feld-Beschränkungen
  for (const [kategoriePool, niveauGroups] of Object.entries(teamsByCategory)) {
    console.log(`🎮 Verarbeite Kategorie-Pool ${kategoriePool}`);
    
    for (const [niveau, teams] of Object.entries(niveauGroups)) {
      console.log(`🎯 Generiere Spiele für ${kategoriePool}, Niveau: ${niveau} mit ${teams.length} Teams`);
      
      if (teams.length < 2) {
        console.log(`⚠️ Zu wenige Teams in ${kategoriePool} (Niveau: ${niveau}), überspringe...`);
        continue;
      }
      
      // Bestimme das Datum basierend auf der Kategorie
      // Samstag: Mini und E-Jugend
      // Sonntag: D, C, B, A-Jugend und höhere Jahrgänge
      const istNiedrigerJahrgang = kategoriePool.includes('Mini') || kategoriePool.includes('E-Jugend');
      const datum = istNiedrigerJahrgang ? turnierStartDatum : turnierEndDatum;
      
      console.log(`📅 Kategorie ${kategoriePool} wird am ${datum === turnierStartDatum ? 'Samstag' : 'Sonntag'} eingeplant`);
      
      // Für die Feld-Beschränkung verwenden wir die ursprüngliche Kategorie-Info
      const kategorieForFeldCheck = kategoriePool;
      
      // Finde verfügbare Felder für diese Kategorie am spezifischen Datum
      const verfügbareFelder = fieldSettings.filter(feld => {
        console.log(`🔍 Prüfe Feld ${feld.name} für Kategorie ${kategorieForFeldCheck} am ${datum}`);
        
        // Prüfe zuerst Tag-spezifische Einstellungen
        const jahrgaengeProTag = feld.erlaubteJahrgaengeProTag?.[datum];
        console.log(`📅 Tag-spezifische Jahrgänge für ${feld.name} am ${datum}:`, jahrgaengeProTag);
        console.log(`🗂️ Alle verfügbaren Datumskeys für ${feld.name}:`, Object.keys(feld.erlaubteJahrgaengeProTag || {}));
        
        if (jahrgaengeProTag && jahrgaengeProTag.length > 0) {
          // Tag-spezifische Beschränkungen vorhanden - verwende diese
          console.log(`✅ Verwende Tag-spezifische Beschränkungen für ${feld.name}`);
          
          // Spezielle Behandlung für Mini-Kategorien
          if (kategorieForFeldCheck.includes('Mini')) {
            const erlaubt = jahrgaengeProTag.some(erlaubter => erlaubter.includes('Mini'));
            console.log(`🏃‍♂️ Mini-Kategorie ${kategorieForFeldCheck} auf ${feld.name}: ${erlaubt ? 'ERLAUBT' : 'NICHT ERLAUBT'}`);
            return erlaubt;
          }
          
          // Für E-Jugend: Prüfe auf E-Jugend
          if (kategoriePool === 'E-Jugend') {
            const erlaubt = jahrgaengeProTag.some(erlaubter => 
              erlaubter.includes('E-Jugend')
            );
            console.log(`🏃‍♂️ E-Jugend ${kategorieForFeldCheck} auf ${feld.name}: ${erlaubt ? 'ERLAUBT' : 'NICHT ERLAUBT'}`);
            return erlaubt;
          }
          
          // Für alle anderen Kategorien: Exakte Übereinstimmung
          const erlaubt = jahrgaengeProTag.includes(kategorieForFeldCheck);
          console.log(`🏃‍♂️ Kategorie ${kategorieForFeldCheck} auf ${feld.name}: ${erlaubt ? 'ERLAUBT' : 'NICHT ERLAUBT'}`);
          return erlaubt;
        }
        
        console.log(`🔄 Keine Tag-spezifischen Beschränkungen - verwende Standard-Feld-Beschränkungen für ${feld.name}`);
        console.log(`📋 Standard-Jahrgänge für ${feld.name}:`, feld.erlaubteJahrgaenge);
        
        // Fallback: Verwende Standard-Feld-Beschränkungen
        // Wenn keine Jahrgänge zugeordnet sind, ist das Feld für alle verfügbar
        if (!feld.erlaubteJahrgaenge || feld.erlaubteJahrgaenge.length === 0) {
          console.log(`✅ Feld ${feld.name} erlaubt alle Jahrgänge (Standard)`);
          return true;
        }
        
        // Spezielle Behandlung für Mini-Kategorien - prüfe nur auf "Mini"
        if (kategorieForFeldCheck.includes('Mini')) {
          const erlaubt = feld.erlaubteJahrgaenge.some(erlaubter => erlaubter.includes('Mini'));
          console.log(`🏃‍♂️ Mini-Kategorie ${kategorieForFeldCheck} auf ${feld.name} (Standard): ${erlaubt ? 'ERLAUBT' : 'NICHT ERLAUBT'}`);
          return erlaubt;
        }
        
        // Für E-Jugend: Prüfe auf E-Jugend
        if (kategoriePool === 'E-Jugend') {
          const erlaubt = feld.erlaubteJahrgaenge.some(erlaubter => 
            erlaubter.includes('E-Jugend')
          );
          console.log(`🏃‍♂️ E-Jugend ${kategorieForFeldCheck} auf ${feld.name} (Standard): ${erlaubt ? 'ERLAUBT' : 'NICHT ERLAUBT'}`);
          return erlaubt;
        }
        
        // Für alle anderen Kategorien: Exakte Übereinstimmung
        const erlaubt = feld.erlaubteJahrgaenge.includes(kategorieForFeldCheck);
        console.log(`🏃‍♂️ Kategorie ${kategorieForFeldCheck} auf ${feld.name} (Standard): ${erlaubt ? 'ERLAUBT' : 'NICHT ERLAUBT'}`);
        return erlaubt;
      });
      
      if (verfügbareFelder.length === 0) {
        console.log(`⚠️ Kein verfügbares Feld für ${kategoriePool} (Niveau: ${niveau}), überspringe...`);
        continue;
      }
      
      console.log(`🏟️ Verfügbare Felder für ${kategoriePool} (${niveau}): ${verfügbareFelder.map(f => f.name).join(', ')}`);
      
      // Für jedes verfügbare Feld, fülle es mit Spielen bis die Zeit aufgebraucht ist
      verfügbareFelder.forEach(feld => {
        const feldPlan = feldZeitpläne.find(fp => fp.feld.id === feld.id);
        if (!feldPlan) return;
        
        // Finde alle freien Zeitslots für das richtige Datum
        const freieSlots = feldPlan.zeitSlots.filter(slot => slot.datum === datum && !slot.belegt);
        console.log(`⏰ Feld ${feld.name} hat ${freieSlots.length} freie Slots am ${datum}`);
        
        // Erstelle so viele Spiele wie möglich für dieses Feld
        let spieleErstellt = 0;
        let paarungIndex = 0;
        
        // Erstelle alle möglichen Paarungen (Round-Robin)
        const allePaarungen = [];
        for (let i = 0; i < teams.length; i++) {
          for (let j = i + 1; j < teams.length; j++) {
            allePaarungen.push([teams[i], teams[j]]);
          }
        }
        
        console.log(`🎯 ${allePaarungen.length} mögliche Paarungen für ${teams.length} Teams`);
        
        // Fülle das Feld mit Spielen bis alle Slots belegt sind
        for (const slot of freieSlots) {
          if (allePaarungen.length === 0) break;
          
          // Nutze Round-Robin mit Wiederholung
          const [team1, team2] = allePaarungen[paarungIndex % allePaarungen.length];
          
          const spielData = {
            datum: slot.datum,
            zeit: slot.zeit,
            feld: feld.name,
            kategorie: `${kategoriePool} (${niveau})`,
            team1,
            team2,
            status: 'geplant'
          };
          
          console.log(`➕ Erstelle Spiel: ${spielData.team1} vs ${spielData.team2}, ${spielData.datum} ${spielData.zeit} auf ${spielData.feld} (Runde ${Math.floor(paarungIndex / allePaarungen.length) + 1})`);
          
          // Erstelle das Spiel in der Datenbank
          const spielId = createSpiel(spielData);
          
          // Füge zum generierten Array hinzu
          generatedSpiele.push({
            ...spielData,
            id: spielId.toString()
          });
          
          // Markiere den Slot als belegt
          slot.belegt = true;
          spieleErstellt++;
          paarungIndex++;
        }
        
        console.log(`✅ Feld ${feld.name}: ${spieleErstellt} Spiele für ${kategoriePool} (${niveau}) erstellt`);
      });
    }
  }
  
  console.log(`✅ Spielplan generiert: ${generatedSpiele.length} Spiele`);
  return generatedSpiele;
}
