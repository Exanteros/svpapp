'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, ClipboardEdit, Pause, Play, Square, Timer, Trophy, Maximize, Minimize, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatScheduleCategoryLabel } from '@/lib/tournament';

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
  einstellungenProTag?: Record<string, {
    spielzeit: number;
    pausenzeit: number;
    halbzeitpause: number;
    zweiHalbzeiten: boolean;
  }>;
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

interface StoredLiveTimer {
  liveTime?: string;
  status?: string;
  startTime?: number;
  elapsedTime?: number;
  isSecondHalf?: boolean;
  halbzeitStartTime?: number;
}

interface LiveGamesDashboardProps {
  onOpenResults?: () => void;
}

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

export default function LiveGamesDashboard({ onOpenResults }: LiveGamesDashboardProps = {}) {
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [liveGames, setLiveGames] = useState<LiveGame[]>([]);
  const [nextGames, setNextGames] = useState<LiveGame[]>([]);
  const [feldEinstellungen, setFeldEinstellungen] = useState<FeldEinstellung[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTimeSlot, setCurrentTimeSlot] = useState<string>('');
  const [nextTimeSlot, setNextTimeSlot] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreenState = () => {
      const fullscreenDocument = document as FullscreenDocument;
      const activeElement = document.fullscreenElement || fullscreenDocument.webkitFullscreenElement || null;
      setIsFullscreen(activeElement === dashboardRef.current);
    };

    document.addEventListener('fullscreenchange', syncFullscreenState);
    document.addEventListener('webkitfullscreenchange', syncFullscreenState);

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
      document.removeEventListener('webkitfullscreenchange', syncFullscreenState);
    };
  }, []);

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

      const liveStatus = data.liveStatus || {};
      setLiveGames(convertToLiveGames(currentGames, liveStatus));
      setNextGames(convertToLiveGames(upcomingGames, liveStatus));
      setLoading(false);

      console.log(`✅ Spiele geladen - Aktuell: ${currentGames.length}, Nächste: ${upcomingGames.length}`);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Spiele:', error);
      toast.error('Fehler beim Laden der Spiele');
    }
  };

  useEffect(() => {
    const handleScoreSaved = () => loadGames();

    window.addEventListener('svp:score-saved', handleScoreSaved);
    return () => window.removeEventListener('svp:score-saved', handleScoreSaved);
  }, [feldEinstellungen]);

  const convertToLiveGames = (spiele: Spiel[], liveTimers: Record<string, StoredLiveTimer> = {}): LiveGame[] => {
    return spiele.map(spiel => {
      // Finde Feldinfo
      const feldInfo = findFeldInfo(spiel);
      
      // Bestimme Status
      let liveStatus: 'ready' | 'running' | 'finished' | 'halftime' = 'ready';
      if (spiel.status === 'beendet') liveStatus = 'finished';
      else if (spiel.status === 'laufend') liveStatus = 'running';
      else if (spiel.status === 'halbzeit') liveStatus = 'halftime';

      const savedData = liveTimers[spiel.id] || {};
      const elapsedTime = liveTimers[spiel.id]?.startTime && liveTimers[spiel.id]?.status === 'laufend'
        ? Math.floor((Date.now() - Number(liveTimers[spiel.id].startTime)) / 1000)
        : Number(savedData.elapsedTime || 0);

      return {
        ...spiel,
        liveStatus,
        startTime: savedData.startTime,
        elapsedTime,
        isSecondHalf: Boolean(savedData.isSecondHalf),
        halbzeitStartTime: savedData.halbzeitStartTime,
        spielzeit: feldInfo.spielzeit,
        zweiHalbzeiten: feldInfo.zweiHalbzeiten,
        feldInfo
      };
    });
  };

  const findFeldInfo = (spiel: Spiel): FeldEinstellung => {
    const feldName = spiel.feld;
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
    
    return getFieldSettingsForDate(feldInfo, spiel.datum);
  };

  const getFieldSettingsForDate = (field: FeldEinstellung, date: string): FeldEinstellung => {
    const daySettings = field.einstellungenProTag?.[date];

    return daySettings ? { ...field, ...daySettings } : field;
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
        } else if (!game.zweiHalbzeiten && newElapsedTime >= spielzeitInSekunden) {
          // Spiel ohne 2 Halbzeiten beendet
          autoEndGame(game);
          return game;
        } else if (game.zweiHalbzeiten && game.isSecondHalf && newElapsedTime >= spielzeitInSekunden / 2) {
          // Zweite Halbzeit beendet (nur halbe Spielzeit für 2. HZ)
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
      const halbzeitStartTime = Date.now();
      const elapsedTime = game.startTime ? Math.floor((Date.now() - game.startTime) / 1000) : game.elapsedTime;

      // Update in lokaler State
      setLiveGames(prev => prev.map(g => 
        g.id === game.id 
          ? { ...g, liveStatus: 'halftime', elapsedTime, halbzeitStartTime }
          : g
      ));

      // Update in Datenbank
      await postLiveUpdate({
        spielId: game.id,
        status: 'halbzeit',
        startTime: game.startTime,
        elapsedTime,
        isSecondHalf: false,
        halbzeitStartTime,
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
      await postLiveUpdate({ spielId: game.id, status: 'beendet' });

      toast.success(`Spiel auf ${game.feld} beendet!`);
    } catch (error) {
      console.error('Fehler bei Auto-Ende:', error);
    }
  };

  const postLiveUpdate = async (payload: Record<string, unknown>) => {
    const response = await fetch('/api/spielplan/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  };

  const startSingleGame = async (game: LiveGame) => {
    const startTime = Date.now();
    const isSecondHalf = game.liveStatus === 'halftime';

    try {
      await postLiveUpdate({
        spielId: game.id,
        status: 'laufend',
        liveTime: '00:00',
        startTime,
        elapsedTime: 0,
        isSecondHalf,
        halbzeitStartTime: game.halbzeitStartTime,
      });

      setLiveGames(prev => prev.map(g =>
        g.id === game.id
          ? { ...g, liveStatus: 'running', startTime, elapsedTime: 0, isSecondHalf }
          : g
      ));

      toast.success(isSecondHalf ? `2. Halbzeit auf ${game.feld} gestartet` : `Spiel auf ${game.feld} gestartet`);
    } catch (error) {
      console.error('Fehler beim Starten des Spiels:', error);
      toast.error('Spiel konnte nicht gestartet werden');
    }
  };

  const moveGameToHalftime = async (game: LiveGame) => {
    const halbzeitStartTime = Date.now();
    const elapsedTime = game.startTime ? Math.floor((Date.now() - game.startTime) / 1000) : game.elapsedTime;

    try {
      await postLiveUpdate({
        spielId: game.id,
        status: 'halbzeit',
        startTime: game.startTime,
        elapsedTime,
        isSecondHalf: false,
        halbzeitStartTime,
      });

      setLiveGames(prev => prev.map(g =>
        g.id === game.id
          ? { ...g, liveStatus: 'halftime', elapsedTime, halbzeitStartTime }
          : g
      ));

      toast.info(`Halbzeit auf ${game.feld}`);
    } catch (error) {
      console.error('Fehler beim Setzen der Halbzeit:', error);
      toast.error('Halbzeit konnte nicht gesetzt werden');
    }
  };

  const endSingleGame = async (game: LiveGame) => {
    try {
      await postLiveUpdate({ spielId: game.id, status: 'beendet' });

      setLiveGames(prev => prev.map(g =>
        g.id === game.id
          ? { ...g, liveStatus: 'finished' }
          : g
      ));

      toast.success(`Spiel auf ${game.feld} beendet`);
    } catch (error) {
      console.error('Fehler beim Beenden des Spiels:', error);
      toast.error('Spiel konnte nicht beendet werden');
    }
  };

  const openResultEntry = () => {
    if (!onOpenResults) {
      toast.info('Ergebnisse im Ergebnis-Panel eintragen');
      return;
    }

    onOpenResults();
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
            liveTime: '00:00',
            startTime,
            elapsedTime: isSecondHalf ? game.elapsedTime : 0,
            isSecondHalf,
            halbzeitStartTime: game.halbzeitStartTime,
          })
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

    if (game.zweiHalbzeiten) {
      const halfTime = (game.spielzeit * 60) / 2; // Halbzeit in Sekunden
      
      if (game.isSecondHalf) {
        // Zweite Halbzeit: Progress von 50% bis 100%
        const progress = Math.min(100, 50 + (game.elapsedTime / halfTime) * 50);
        const timeLeft = Math.max(0, halfTime - game.elapsedTime);
        const isLastMinute = timeLeft <= 60 && timeLeft > 0;
        return { progress, isLastMinute, timeLeft };
      } else {
        // Erste Halbzeit: Progress von 0% bis 50%
        const progress = Math.min(50, (game.elapsedTime / halfTime) * 50);
        const timeLeft = Math.max(0, halfTime - game.elapsedTime);
        const isLastMinute = timeLeft <= 60 && timeLeft > 0;
        return { progress, isLastMinute, timeLeft };
      }
    } else {
      // Spiel ohne 2 Halbzeiten: Normal von 0% bis 100%
      const maxTime = game.spielzeit * 60;
      const progress = Math.min(100, (game.elapsedTime / maxTime) * 100);
      const timeLeft = Math.max(0, maxTime - game.elapsedTime);
      const isLastMinute = timeLeft <= 60 && timeLeft > 0;
      return { progress, isLastMinute, timeLeft };
    }
  };

  const getProgressColor = (progress: number, isLastMinute: boolean): string => {
    if (isLastMinute) return 'bg-red-500';
    if (progress > 75) return 'bg-[#35401f]';
    if (progress > 50) return 'bg-[#5e6d35]';
    return 'bg-[#87935d]';
  };

  const toggleFullscreen = async () => {
    const target = dashboardRef.current as FullscreenElement | null;
    const fullscreenDocument = document as FullscreenDocument;
    const activeElement = document.fullscreenElement || fullscreenDocument.webkitFullscreenElement || null;
    const shouldEnterFullscreen = activeElement !== target && !isFullscreen;

    if (!target) {
      return;
    }

    if (isFullscreen && activeElement !== target) {
      setIsFullscreen(false);
      return;
    }

    try {
      if (activeElement === target) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          return;
        }

        if (fullscreenDocument.webkitExitFullscreen) {
          await fullscreenDocument.webkitExitFullscreen();
          return;
        }

        setIsFullscreen(false);
        return;
      }

      if (target.requestFullscreen) {
        await target.requestFullscreen();
        return;
      }

      if (target.webkitRequestFullscreen) {
        await target.webkitRequestFullscreen();
        return;
      }

      setIsFullscreen((value) => !value);
    } catch (error) {
      console.error('Vollbild konnte nicht umgeschaltet werden:', error);
      setIsFullscreen(shouldEnterFullscreen);
      if (!shouldEnterFullscreen) {
        toast.error('Vollbildmodus konnte nicht beendet werden');
      }
    }
  };

  if (loading) {
    return (
      <Card className="bg-white border-stone-200 shadow-sm">
        <CardContent className="p-8 text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-stone-300 animate-spin" />
          <p className="text-stone-600">Lade Live-Dashboard...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      ref={dashboardRef}
      className={`space-y-4 sm:space-y-6 ${isFullscreen ? 'fixed inset-0 z-[80] overflow-auto bg-background p-2 sm:p-4' : ''}`}
    >
      {/* Header mit Uhr */}
      <Card className="border-[#d9dec8] bg-[#f6f7f1] shadow-sm">
        <CardContent className="p-3 sm:p-6 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-2 sm:mb-4 gap-2">
            <div className="flex min-w-0 items-center">
              <Clock className="h-6 w-6 shrink-0 sm:h-8 sm:w-8 text-[#5e6d35] mr-2 sm:mr-3" />
              <h1 className="truncate text-lg sm:text-2xl font-bold text-[#35401f]">Live Dashboard</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="w-full border-[#d9dec8] text-[#4f5d2f] hover:bg-[#eef1e5] sm:w-auto"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              <span className="ml-1 hidden sm:inline">
                {isFullscreen ? 'Minimieren' : 'Vollbild'}
              </span>
            </Button>
          </div>
          <div className={`font-mono font-bold text-[#35401f] mb-1 sm:mb-2 ${
            isFullscreen ? 'text-5xl sm:text-8xl' : 'text-3xl sm:text-6xl'
          }`}>
            {currentTime.toLocaleTimeString('de-DE', { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            })}
          </div>
          <p className="text-[#4f5d2f] text-sm sm:text-lg">
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
      <Card className="bg-white border-stone-200 shadow-sm">
        <CardHeader className="pb-3 sm:pb-4 border-b border-stone-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="shrink-0 p-1.5 sm:p-2 rounded-lg bg-[#eef1e5]">
                <Timer className="h-4 w-4 sm:h-5 sm:w-5 text-[#5e6d35]" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg sm:text-xl text-stone-900">
                  Aktuelle Spiele
                  <span className="hidden sm:inline"> - {currentTimeSlot} Uhr</span>
                </CardTitle>
                <p className="text-stone-600 text-xs sm:text-sm">
                  <span className="sm:hidden">{currentTimeSlot} Uhr | </span>
                  {liveGames.length} Spiel(e) | Läuft: {liveGames.filter(g => g.liveStatus === 'running').length}
                  <span className="hidden sm:inline"> | 
                    Halbzeit: {liveGames.filter(g => g.liveStatus === 'halftime').length} | 
                    Beendet: {liveGames.filter(g => g.liveStatus === 'finished').length}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {liveGames.some(g => g.liveStatus === 'ready' || g.liveStatus === 'halftime') && (
                <Button
                  onClick={startAllGames}
                  className="bg-[#5e6d35] hover:bg-[#4f5d2f] text-white w-full sm:w-auto"
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-2" />
                  <span className="sm:hidden">Alle starten</span>
                  <span className="hidden sm:inline">
                    Alle starten ({liveGames.filter(g => g.liveStatus === 'ready' || g.liveStatus === 'halftime').length})
                  </span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={loadGames}
                className="border-stone-300 w-full sm:w-auto"
              >
                <Clock className="h-4 w-4 mr-2" />
                <span className="sm:hidden">Update</span>
                <span className="hidden sm:inline">Aktualisieren</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {liveGames.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Trophy className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-stone-400" />
              <p className="text-stone-700 text-base sm:text-lg">Keine aktuellen Spiele</p>
            </div>
          ) : (
            <div className={`grid gap-3 sm:gap-4 ${
              isFullscreen ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 xl:grid-cols-2'
            }`}>
              {liveGames.map((game) => {
                const { progress, isLastMinute } = getGameProgress(game);
                const categoryLabel = formatScheduleCategoryLabel(game.kategorie);
                const statusColor = game.liveStatus === 'running' ? 'bg-[#eef1e5] text-[#35401f]' :
                                  game.liveStatus === 'halftime' ? 'bg-amber-100 text-amber-900' :
                                  game.liveStatus === 'finished' ? 'bg-stone-100 text-stone-800' :
                                  'bg-stone-100 text-stone-800';

                return (
                  <Card key={game.id} className={`min-w-0 border-2 ${isLastMinute ? 'border-red-400 animate-pulse' : 'border-stone-200'}`}>
                    <CardHeader className="pb-2 sm:pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-2">
                          <Badge className={`${statusColor} text-xs sm:text-sm`}>
                            {game.feld}
                          </Badge>
                          {isLastMinute && (
                            <Badge variant="destructive" className="animate-pulse text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Letzte Minute!</span>
                              <span className="sm:hidden">!</span>
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline" className="max-w-full truncate text-xs">
                          <span className="hidden sm:inline truncate">{categoryLabel}</span>
                          <span className="sm:hidden truncate">{categoryLabel.length > 10 ? `${categoryLabel.substring(0, 10)}...` : categoryLabel}</span>
                        </Badge>
                      </div>
                      <div className="text-center">
                        <div className={`break-words font-bold leading-tight ${
                          isFullscreen ? 'text-xl sm:text-2xl' : 'text-sm sm:text-lg'
                        }`}>
                          {game.team1} vs {game.team2}
                        </div>
                        <div className={`font-mono ${
                          isFullscreen ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'
                        } mt-1 sm:mt-2`}>
                          {getElapsedTimeDisplay(game)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
                      {game.liveStatus === 'running' && (
                        <div className="space-y-2">
                          <div className="w-full bg-stone-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress, isLastMinute)}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="text-xs text-stone-600 text-center">
                            {Math.round(progress)}%
                            <span className="hidden sm:inline"> | {game.zweiHalbzeiten ? (game.isSecondHalf ? '2. Halbzeit' : '1. Halbzeit') : 'Spielzeit'}</span>
                          </div>
                        </div>
                      )}
                      
                      {game.liveStatus === 'halftime' && (
                        <div className="text-center p-2 sm:p-4 bg-amber-50 rounded-lg">
                          <div className="text-amber-900 font-semibold text-sm sm:text-base">Halbzeitpause</div>
                          <div className="text-xs sm:text-sm text-amber-800">Wartet auf nächsten Start</div>
                        </div>
                      )}

                      {game.liveStatus === 'finished' && (
                        <div className="text-center p-2 sm:p-4 bg-stone-50 rounded-lg">
                          <div className="text-stone-800 font-semibold text-sm sm:text-base">Spiel beendet</div>
                          {game.ergebnis && (
                            <div className="text-xs sm:text-sm text-stone-600">{game.ergebnis}</div>
                          )}
                        </div>
                      )}

                      {game.liveStatus === 'ready' && (
                        <div className="text-center p-2 sm:p-4 bg-[#f6f7f1] rounded-lg">
                          <div className="text-[#35401f] font-semibold text-sm sm:text-base">Bereit zum Start</div>
                          <div className="text-xs sm:text-sm text-[#4f5d2f]">
                            Spielzeit: {game.spielzeit} min {game.zweiHalbzeiten ? '(2 × ' + game.spielzeit/2 + ' min)' : ''}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:justify-center">
                        {game.liveStatus === 'ready' && (
                          <Button size="sm" className="bg-[#5e6d35] text-white hover:bg-[#4f5d2f]" onClick={() => startSingleGame(game)}>
                            <Play className="h-4 w-4" />
                            Start
                          </Button>
                        )}
                        {game.liveStatus === 'running' && game.zweiHalbzeiten && !game.isSecondHalf && (
                          <Button size="sm" variant="outline" onClick={() => moveGameToHalftime(game)}>
                            <Pause className="h-4 w-4" />
                            Halbzeit
                          </Button>
                        )}
                        {game.liveStatus === 'halftime' && (
                          <Button size="sm" className="bg-[#5e6d35] text-white hover:bg-[#4f5d2f]" onClick={() => startSingleGame(game)}>
                            <Play className="h-4 w-4" />
                            Fortsetzen
                          </Button>
                        )}
                        {game.liveStatus === 'running' && (
                          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => endSingleGame(game)}>
                            <Square className="h-4 w-4" />
                            Beenden
                          </Button>
                        )}
                        {game.liveStatus !== 'ready' && (
                          <Button size="sm" variant="outline" onClick={openResultEntry}>
                            <ClipboardEdit className="h-4 w-4" />
                            Ergebnis setzen
                          </Button>
                        )}
                      </div>
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
        <Card className="bg-stone-50 border-stone-200 shadow-sm">
          <CardHeader className="pb-3 sm:pb-4 border-b border-stone-100">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="shrink-0 p-1.5 sm:p-2 rounded-lg bg-[#eef1e5]">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-[#5e6d35]" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg sm:text-xl text-stone-900">
                  Nächste Spiele
                  <span className="hidden sm:inline"> - {nextTimeSlot} Uhr</span>
                </CardTitle>
                <p className="text-stone-600 text-xs sm:text-sm">
                  <span className="sm:hidden">{nextTimeSlot} Uhr | </span>
                  {nextGames.length} Spiel(e)
                  <span className="hidden sm:inline"> für Durchsagen vorbereiten</span>
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className={`grid gap-2 sm:gap-3 ${
              isFullscreen ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 xl:grid-cols-2'
            }`}>
              {nextGames.map((game) => {
                const categoryLabel = formatScheduleCategoryLabel(game.kategorie);

                return (
                  <div key={game.id} className="min-w-0 p-3 sm:p-4 bg-white rounded-lg border border-stone-200">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <Badge variant="outline" className="border-[#d9dec8] text-[#4f5d2f] text-xs sm:text-sm">
                        {game.feld}
                      </Badge>
                      <Badge variant="outline" className="max-w-full truncate text-xs border-stone-200 text-stone-700">
                        <span className="hidden sm:inline truncate">{categoryLabel}</span>
                        <span className="sm:hidden truncate">{categoryLabel.length > 10 ? `${categoryLabel.substring(0, 10)}...` : categoryLabel}</span>
                      </Badge>
                    </div>
                    <div className="text-center">
                      <div className="break-words font-semibold text-stone-900 text-sm sm:text-base">
                        {game.team1} vs {game.team2}
                      </div>
                      <div className="text-xs sm:text-sm text-stone-600 mt-1">
                        Spielzeit: {game.spielzeit} min {game.zweiHalbzeiten ? '(2 HZ)' : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
