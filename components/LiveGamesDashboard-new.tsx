'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, Timer, Trophy, Maximize, Minimize, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Spiel {
  id: string;
  datum: string;
  zeit: string;
  feld: string;
  kategorie: string;
  team1: string;
  team2: string;
  status: string;
  ergebnis?: string;
  tore_team1?: number;
  tore_team2?: number;
}

interface FeldEinstellung {
  id: string;
  name: string;
  spielzeit: number;
  pausenzeit: number;
  halbzeitpause: number;
  zweiHalbzeiten: boolean;
  erlaubteJahrgaenge: string[];
}

interface LiveGame extends Spiel {
  liveStatus: 'ready' | 'running' | 'finished' | 'halftime';
  startTime?: number;
  elapsedTime: number;
  isSecondHalf: boolean;
  halbzeitStartTime?: number;
  spielzeit: number;
  zweiHalbzeiten: boolean;
  feldInfo: FeldEinstellung;
}

export default function LiveGamesDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [liveGames, setLiveGames] = useState<LiveGame[]>([]);
  const [nextGames, setNextGames] = useState<LiveGame[]>([]);
  const [feldEinstellungen, setFeldEinstellungen] = useState<FeldEinstellung[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTimeSlot, setCurrentTimeSlot] = useState<string>('');
  const [nextTimeSlot, setNextTimeSlot] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Lade Feldeinstellungen
  useEffect(() => {
    async function loadFeldEinstellungen() {
      try {
        const response = await fetch('/api/admin/feld-settings');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.feldEinstellungen) {
            setFeldEinstellungen(data.feldEinstellungen);
            console.log('✅ Feldeinstellungen geladen:', data.feldEinstellungen);
          }
        } else {
          throw new Error('Failed to load field settings');
        }
      } catch (error) {
        console.warn('⚠️ Fallback: Verwende Standard-Feldeinstellungen');
        setFeldEinstellungen([
          { id: '1', name: 'Feld 1', spielzeit: 10, pausenzeit: 2, halbzeitpause: 3, zweiHalbzeiten: true, erlaubteJahrgaenge: [] },
          { id: '2', name: 'Feld 2', spielzeit: 12, pausenzeit: 2, halbzeitpause: 3, zweiHalbzeiten: true, erlaubteJahrgaenge: [] },
          { id: '3', name: 'Feld 3', spielzeit: 15, pausenzeit: 3, halbzeitpause: 5, zweiHalbzeiten: false, erlaubteJahrgaenge: [] },
          { id: '4', name: 'Feld 4', spielzeit: 8, pausenzeit: 2, halbzeitpause: 2, zweiHalbzeiten: false, erlaubteJahrgaenge: [] },
          { id: '5', name: 'Beachfeld', spielzeit: 12, pausenzeit: 2, halbzeitpause: 3, zweiHalbzeiten: true, erlaubteJahrgaenge: [] }
        ]);
      }
    }
    loadFeldEinstellungen();
  }, []);

  // Timer für die Uhr
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Timer für laufende Spiele
  useEffect(() => {
    const gameTimer = setInterval(() => {
      updateRunningGames();
    }, 1000);
    return () => clearInterval(gameTimer);
  }, []);

  // Spiele laden (initial und alle 30 Sekunden)
  useEffect(() => {
    loadGames();
    const loadInterval = setInterval(loadGames, 30000);
    return () => clearInterval(loadInterval);
  }, [feldEinstellungen]);

  const loadGames = async () => {
    if (feldEinstellungen.length === 0) return;
    
    try {
      const response = await fetch('/api/spielplan/live', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (!data.success || !data.spiele) throw new Error('Invalid response');

      const allGames = data.spiele;
      const today = formatDateToSpielDate(currentTime);
      const todaysGames = allGames.filter((spiel: Spiel) => spiel.datum === today);
      
      // Finde aktuellen und nächsten Zeitslot
      const timeSlots = Array.from(new Set(todaysGames.map((spiel: Spiel) => spiel.zeit))) as string[];
      timeSlots.sort();
      const currentSlot = findCurrentTimeSlot(timeSlots);
      const nextSlot = findNextTimeSlot(timeSlots, currentSlot);
      
      setCurrentTimeSlot(currentSlot);
      setNextTimeSlot(nextSlot);

      // Lade aktuelle Spiele (laufend oder bereit für den aktuellen Slot)
      const currentGames = todaysGames.filter((spiel: Spiel) => 
        spiel.zeit === currentSlot || 
        spiel.status === 'laufend' || 
        spiel.status === 'halbzeit'
      );

      // Lade nächste Spiele (für Durchsagen)
      const upcomingGames = nextSlot ? todaysGames.filter((spiel: Spiel) => spiel.zeit === nextSlot) : [];

      setLiveGames(convertToLiveGames(currentGames));
      setNextGames(convertToLiveGames(upcomingGames));
      setLoading(false);

      console.log(`✅ Spiele geladen - Aktuell: ${currentGames.length}, Nächste: ${upcomingGames.length}`);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Spiele:', error);
      toast.error('Fehler beim Laden der Spiele');
    }
  };

  const convertToLiveGames = (spiele: Spiel[]): LiveGame[] => {
    return spiele.map(spiel => {
      // Finde Feldinfo
      const feldInfo = findFeldInfo(spiel.feld);
      
      // Bestimme Status
      let liveStatus: 'ready' | 'running' | 'finished' | 'halftime' = 'ready';
      if (spiel.status === 'beendet') liveStatus = 'finished';
      else if (spiel.status === 'laufend') liveStatus = 'running';
      else if (spiel.status === 'halbzeit') liveStatus = 'halftime';

      // Hole gespeicherte Timer-Daten
      const savedData = getGameTimerFromStorage(spiel.id);

      return {
        ...spiel,
        liveStatus,
        startTime: savedData.startTime,
        elapsedTime: savedData.elapsedTime,
        isSecondHalf: savedData.isSecondHalf,
        halbzeitStartTime: savedData.halbzeitStartTime,
        spielzeit: feldInfo.spielzeit,
        zweiHalbzeiten: feldInfo.zweiHalbzeiten,
        feldInfo
      };
    });
  };

  const findFeldInfo = (feldName: string): FeldEinstellung => {
    const feldNameNorm = feldName.trim().toLowerCase();
    
    // Direkte Namenssuche
    let feldInfo = feldEinstellungen.find(f => f.name.trim().toLowerCase() === feldNameNorm);
    
    // Suche nach ID
    if (!feldInfo) {
      feldInfo = feldEinstellungen.find(f => f.id === feldName);
    }
    
    // Suche nach Nummer im Namen
    if (!feldInfo) {
      const numMatch = feldNameNorm.match(/(\d+)/);
      if (numMatch) {
        feldInfo = feldEinstellungen.find(f => f.id === numMatch[1]);
      }
    }
    
    if (!feldInfo) {
      console.warn(`⚠️ Kein Feld gefunden für "${feldName}", verwende Fallback`);
      return { id: '0', name: feldName, spielzeit: 15, pausenzeit: 3, halbzeitpause: 5, zweiHalbzeiten: false, erlaubteJahrgaenge: [] };
    }
    
    return feldInfo;
  };

  const findCurrentTimeSlot = (timeSlots: string[]): string => {
    const currentTimeStr = formatTimeToSpielzeit(currentTime);
    const currentMinutes = timeStringToMinutes(currentTimeStr);
    
    // Finde den aktuellen oder nächsten verfügbaren Zeitslot
    const availableSlot = timeSlots.find(slot => timeStringToMinutes(slot) >= currentMinutes);
    return availableSlot || timeSlots[timeSlots.length - 1] || currentTimeStr;
  };

  const findNextTimeSlot = (timeSlots: string[], currentSlot: string): string => {
    const currentIndex = timeSlots.indexOf(currentSlot);
    return currentIndex >= 0 && currentIndex < timeSlots.length - 1 ? timeSlots[currentIndex + 1] : '';
  };

  const updateRunningGames = () => {
    setLiveGames(prev => prev.map(game => {
      if (game.liveStatus === 'running' && game.startTime) {
        const newElapsedTime = Math.floor((Date.now() - game.startTime) / 1000);
        const spielzeitInSekunden = game.spielzeit * 60;
        
        // Prüfe auf automatisches Ende oder Halbzeit
        if (game.zweiHalbzeiten && !game.isSecondHalf && newElapsedTime >= spielzeitInSekunden / 2) {
          // Erste Halbzeit beendet -> Halbzeitpause
          autoMoveToHalftime(game);
          return game;
        } else if ((!game.zweiHalbzeiten && newElapsedTime >= spielzeitInSekunden) ||
                   (game.zweiHalbzeiten && game.isSecondHalf && newElapsedTime >= spielzeitInSekunden)) {
          // Spiel beendet
          autoEndGame(game);
          return game;
        }
        
        return { ...game, elapsedTime: newElapsedTime };
      }
      return game;
    }));
  };

  const autoMoveToHalftime = async (game: LiveGame) => {
    console.log(`🔄 Auto-Halbzeit für ${game.team1} vs ${game.team2} auf ${game.feld}`);
    
    try {
      // Update in lokaler State
      setLiveGames(prev => prev.map(g => 
        g.id === game.id 
          ? { ...g, liveStatus: 'halftime', halbzeitStartTime: Date.now() }
          : g
      ));

      // Update in Datenbank
      await fetch('/api/spielplan/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spielId: game.id, status: 'halbzeit' })
      });

      // Timer-Daten speichern
      saveGameTimerToStorage(game.id, {
        startTime: game.startTime!,
        elapsedTime: game.elapsedTime,
        isSecondHalf: false,
        halbzeitStartTime: Date.now()
      });

      toast.info(`Halbzeitpause auf ${game.feld}!`);
    } catch (error) {
      console.error('Fehler bei Auto-Halbzeit:', error);
    }
  };

  const autoEndGame = async (game: LiveGame) => {
    console.log(`🏁 Auto-Ende für ${game.team1} vs ${game.team2} auf ${game.feld}`);
    
    try {
      // Update in lokaler State
      setLiveGames(prev => prev.map(g => 
        g.id === game.id 
          ? { ...g, liveStatus: 'finished' }
          : g
      ));

      // Update in Datenbank
      await fetch('/api/spielplan/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spielId: game.id, status: 'beendet' })
      });

      // Timer-Daten löschen
      removeGameTimerFromStorage(game.id);

      toast.success(`Spiel auf ${game.feld} beendet!`);
    } catch (error) {
      console.error('Fehler bei Auto-Ende:', error);
    }
  };

  const startAllGames = async () => {
    const startableGames = liveGames.filter(game => 
      game.liveStatus === 'ready' || game.liveStatus === 'halftime'
    );

    if (startableGames.length === 0) {
      toast.error('Keine Spiele zum Starten verfügbar!');
      return;
    }

    const startTime = Date.now();
    
    try {
      const promises = startableGames.map(async (game) => {
        const isSecondHalf = game.liveStatus === 'halftime';
        
        // Update in Datenbank
        await fetch('/api/spielplan/live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            spielId: game.id, 
            status: 'laufend',
            liveTime: '00:00'
          })
        });

        // Timer-Daten speichern
        saveGameTimerToStorage(game.id, {
          startTime: isSecondHalf ? startTime : startTime,
          elapsedTime: isSecondHalf ? game.elapsedTime : 0,
          isSecondHalf,
          halbzeitStartTime: game.halbzeitStartTime
        });

        return { ...game, isSecondHalf };
      });

      await Promise.all(promises);

      // Update lokaler State
      setLiveGames(prev => prev.map(game => {
        const startableGame = startableGames.find(sg => sg.id === game.id);
        if (startableGame) {
          const isSecondHalf = game.liveStatus === 'halftime';
          return {
            ...game,
            liveStatus: 'running',
            startTime,
            isSecondHalf,
            elapsedTime: isSecondHalf ? game.elapsedTime : 0
          };
        }
        return game;
      }));

      const newGames = startableGames.filter(g => g.liveStatus === 'ready').length;
      const halftimeGames = startableGames.filter(g => g.liveStatus === 'halftime').length;
      
      let message = '';
      if (newGames > 0) message += `${newGames} neue Spiele gestartet! `;
      if (halftimeGames > 0) message += `${halftimeGames} Spiele in 2. Halbzeit!`;
      
      toast.success(message);
    } catch (error) {
      console.error('Fehler beim Starten der Spiele:', error);
      toast.error('Fehler beim Starten der Spiele');
    }
  };

  // Hilfsfunktionen
  const formatTimeToSpielzeit = (date: Date): string => {
    const hours = date.getHours();
    const minutes = Math.floor(date.getMinutes() / 10) * 10;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatDateToSpielDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const timeStringToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const getElapsedTimeDisplay = (game: LiveGame): string => {
    if (game.liveStatus === 'halftime') {
      const halftimeMinutes = game.halbzeitStartTime 
        ? Math.floor((Date.now() - game.halbzeitStartTime) / 60000) 
        : 0;
      return `Halbzeit (${halftimeMinutes} min)`;
    }

    const minutes = Math.floor(game.elapsedTime / 60);
    const seconds = game.elapsedTime % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    if (game.zweiHalbzeiten) {
      const half = game.isSecondHalf ? '2. HZ' : '1. HZ';
      return `${half}: ${timeStr}`;
    }

    return timeStr;
  };

  const getGameProgress = (game: LiveGame): { progress: number; isLastMinute: boolean; timeLeft: number } => {
    if (game.liveStatus !== 'running') return { progress: 0, isLastMinute: false, timeLeft: 0 };

    const maxTime = game.zweiHalbzeiten ? (game.spielzeit * 60) / 2 : game.spielzeit * 60;
    const currentTime = game.isSecondHalf ? game.elapsedTime : game.elapsedTime;
    
    const progress = Math.min(100, (currentTime / maxTime) * 100);
    const timeLeft = Math.max(0, maxTime - currentTime);
    const isLastMinute = timeLeft <= 60 && timeLeft > 0;

    return { progress, isLastMinute, timeLeft };
  };

  const getProgressColor = (progress: number, isLastMinute: boolean): string => {
    if (isLastMinute) return 'bg-red-500';
    if (progress > 75) return 'bg-orange-500';
    if (progress > 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // LocalStorage Funktionen
  const getGameTimerFromStorage = (gameId: string) => {
    try {
      const saved = localStorage.getItem(`game-timer-${gameId}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Fehler beim Laden der Timer-Daten:', error);
    }
    return { startTime: undefined, elapsedTime: 0, isSecondHalf: false, halbzeitStartTime: undefined };
  };

  const saveGameTimerToStorage = (gameId: string, data: any) => {
    try {
      localStorage.setItem(`game-timer-${gameId}`, JSON.stringify(data));
    } catch (error) {
      console.warn('Fehler beim Speichern der Timer-Daten:', error);
    }
  };

  const removeGameTimerFromStorage = (gameId: string) => {
    try {
      localStorage.removeItem(`game-timer-${gameId}`);
    } catch (error) {
      console.warn('Fehler beim Löschen der Timer-Daten:', error);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-8 text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300 animate-spin" />
          <p className="text-gray-600">Lade Live-Dashboard...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 bg-white z-50 p-4 overflow-auto' : ''}`}>
      {/* Header mit Uhr */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 shadow-lg">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-blue-800">Live Dashboard</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
          <div className={`font-mono font-bold text-blue-900 mb-2 ${isFullscreen ? 'text-8xl' : 'text-6xl'}`}>
            {currentTime.toLocaleTimeString('de-DE', { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            })}
          </div>
          <p className="text-blue-700 text-lg">
            {currentTime.toLocaleDateString('de-DE', { 
              weekday: 'long', 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric' 
            })}
          </p>
        </CardContent>
      </Card>

      {/* Aktuelle Spiele */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Timer className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-slate-800">
                  Aktuelle Spiele - {currentTimeSlot} Uhr
                </CardTitle>
                <p className="text-slate-600 text-sm">
                  {liveGames.length} Spiel(e) | Läuft: {liveGames.filter(g => g.liveStatus === 'running').length} | 
                  Halbzeit: {liveGames.filter(g => g.liveStatus === 'halftime').length} | 
                  Beendet: {liveGames.filter(g => g.liveStatus === 'finished').length}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {liveGames.some(g => g.liveStatus === 'ready' || g.liveStatus === 'halftime') && (
                <Button
                  onClick={startAllGames}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Alle starten ({liveGames.filter(g => g.liveStatus === 'ready' || g.liveStatus === 'halftime').length})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={loadGames}
                className="border-slate-300"
              >
                <Clock className="h-4 w-4 mr-2" />
                Aktualisieren
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {liveGames.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-700 text-lg">Keine aktuellen Spiele</p>
            </div>
          ) : (
            <div className={`grid gap-4 ${isFullscreen ? 'grid-cols-2' : 'grid-cols-1 lg:grid-cols-2'}`}>
              {liveGames.map((game) => {
                const { progress, isLastMinute } = getGameProgress(game);
                const statusColor = game.liveStatus === 'running' ? 'bg-green-100 text-green-800' :
                                  game.liveStatus === 'halftime' ? 'bg-yellow-100 text-yellow-800' :
                                  game.liveStatus === 'finished' ? 'bg-gray-100 text-gray-800' :
                                  'bg-blue-100 text-blue-800';

                return (
                  <Card key={game.id} className={`border-2 ${isLastMinute ? 'border-red-400 animate-pulse' : 'border-slate-200'}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={statusColor}>
                            {game.feld}
                          </Badge>
                          {isLastMinute && (
                            <Badge variant="destructive" className="animate-pulse">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Letzte Minute!
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {game.kategorie}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <div className={`font-bold ${isFullscreen ? 'text-2xl' : 'text-lg'}`}>
                          {game.team1} vs {game.team2}
                        </div>
                        <div className={`font-mono ${isFullscreen ? 'text-xl' : 'text-base'} mt-2`}>
                          {getElapsedTimeDisplay(game)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {game.liveStatus === 'running' && (
                        <div className="space-y-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress, isLastMinute)}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-600 text-center">
                            {Math.round(progress)}% | {game.zweiHalbzeiten ? (game.isSecondHalf ? '2. Halbzeit' : '1. Halbzeit') : 'Spielzeit'}
                          </div>
                        </div>
                      )}
                      
                      {game.liveStatus === 'halftime' && (
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <div className="text-yellow-800 font-semibold">🏃‍♂️ Halbzeitpause</div>
                          <div className="text-sm text-yellow-700">Wartet auf nächsten Start</div>
                        </div>
                      )}

                      {game.liveStatus === 'finished' && (
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-gray-800 font-semibold">🏁 Spiel beendet</div>
                          {game.ergebnis && (
                            <div className="text-sm text-gray-600">{game.ergebnis}</div>
                          )}
                        </div>
                      )}

                      {game.liveStatus === 'ready' && (
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-blue-800 font-semibold">⏸️ Bereit zum Start</div>
                          <div className="text-sm text-blue-700">
                            Spielzeit: {game.spielzeit} min {game.zweiHalbzeiten ? '(2 × ' + game.spielzeit/2 + ' min)' : ''}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nächste Spiele (für Durchsagen) */}
      {nextGames.length > 0 && (
        <Card className="bg-blue-50 border-blue-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-blue-100">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-blue-800">
                  Nächste Spiele - {nextTimeSlot} Uhr
                </CardTitle>
                <p className="text-blue-600 text-sm">
                  {nextGames.length} Spiel(e) für Durchsagen vorbereiten
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className={`grid gap-3 ${isFullscreen ? 'grid-cols-2' : 'grid-cols-1 lg:grid-cols-2'}`}>
              {nextGames.map((game) => (
                <div key={game.id} className="p-4 bg-white rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="border-blue-300 text-blue-700">
                      {game.feld}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-blue-200 text-blue-600">
                      {game.kategorie}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-900">
                      {game.team1} vs {game.team2}
                    </div>
                    <div className="text-sm text-blue-700 mt-1">
                      Spielzeit: {game.spielzeit} min {game.zweiHalbzeiten ? '(2 Halbzeiten)' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
