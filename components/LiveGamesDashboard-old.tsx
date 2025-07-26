'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Play, 
  Pause, 
  Clock, 
  MapPin,
  Trophy,
  Timer,
  Users,
  Maximize,
  Minimize,
  RefreshCw
} from 'lucide-react';

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

interface LiveGame extends Spiel {
  liveStatus: 'ready' | 'running' | 'halftime' | 'finished';
  startTime?: number;
  elapsedTime: number;
  spielzeit: number;
  zweiHalbzeiten: boolean;
  isSecondHalf: boolean;
  halbzeitStartTime?: number;
  firstHalfEndTime?: number;
}

export default function LiveGamesDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSlotGames, setCurrentSlotGames] = useState<LiveGame[]>([]);
  const [nextSlotGames, setNextSlotGames] = useState<LiveGame[]>([]);
  const [currentTimeSlot, setCurrentTimeSlot] = useState<string>('');
  const [nextTimeSlot, setNextTimeSlot] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [feldEinstellungen, setFeldEinstellungen] = useState<Array<{
    id: string;
    name: string;
    spielzeit: number;
    pausenzeit: number;
    halbzeitpause: number;
    zweiHalbzeiten: boolean;
    erlaubteJahrgaenge: string[];
  }>>([]);

  // Load field settings on mount
  useEffect(() => {
    const loadFeldEinstellungen = async () => {
      try {
        const response = await fetch('/api/admin/feld-settings');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.feldEinstellungen) {
            setFeldEinstellungen(data.feldEinstellungen);
          }
        }
      } catch (error) {
        console.warn('Could not load field settings, using defaults');
      }
      
      // Fallback defaults
      if (feldEinstellungen.length === 0) {
        setFeldEinstellungen([
          { id: '1', name: 'Feld 1', spielzeit: 90, pausenzeit: 5, halbzeitpause: 15, zweiHalbzeiten: true, erlaubteJahrgaenge: [] },
          { id: '2', name: 'Feld 2', spielzeit: 90, pausenzeit: 5, halbzeitpause: 15, zweiHalbzeiten: true, erlaubteJahrgaenge: [] },
          { id: '3', name: 'Feld 3', spielzeit: 90, pausenzeit: 5, halbzeitpause: 15, zweiHalbzeiten: true, erlaubteJahrgaenge: [] },
          { id: '4', name: 'Feld 4', spielzeit: 90, pausenzeit: 5, halbzeitpause: 15, zweiHalbzeiten: true, erlaubteJahrgaenge: [] },
          { id: '5', name: 'Beachfeld', spielzeit: 60, pausenzeit: 5, halbzeitpause: 10, zweiHalbzeiten: true, erlaubteJahrgaenge: [] }
        ]);
      }
    };
    
    loadFeldEinstellungen();
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      
      // Update elapsed time for running games
      setCurrentSlotGames(prev => prev.map(game => {
        if (game.liveStatus === 'running' && game.startTime) {
          const elapsed = Math.floor((Date.now() - game.startTime) / 1000);
          
          // Send live timer update every 5 seconds
          if (elapsed % 5 === 0) {
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            fetch('/api/spielplan/live-timer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                spielId: game.id,
                liveTime: timeDisplay,
                status: 'running'
              }),
            }).catch(console.warn);
          }
          
          return { ...game, elapsedTime: elapsed };
        }
        return game;
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load games and determine time slots
  const loadGames = async () => {
    try {
      const response = await fetch('/api/spielplan/live');
      if (!response.ok) throw new Error('Failed to fetch games');
      
      const data = await response.json();
      const allGames = data.spiele || [];
      const today = formatDateToSpielDate(currentTime);
      
      // Get today's games sorted by time
      const todaysGames = allGames.filter((spiel: Spiel) => spiel.datum === today);
      const timeSlots = [...new Set(todaysGames.map((spiel: Spiel) => spiel.zeit))].sort();
      
      // Find current time slot
      const now = formatTimeToSpielzeit(currentTime);
      const nowMinutes = timeStringToMinutes(now);
      
      // Find next available time slot with games
      let selectedTimeSlot = '';
      let selectedNextTimeSlot = '';
      
      for (let i = 0; i < timeSlots.length; i++) {
        const slot = timeSlots[i];
        const slotMinutes = timeStringToMinutes(slot);
        
        // Check if this slot has games that need attention (ready, running, halftime)
        const slotGames = todaysGames.filter((spiel: Spiel) => spiel.zeit === slot);
        const hasActiveGames = slotGames.some((spiel: Spiel) => 
          spiel.status === 'bereit' || spiel.status === 'laufend' || spiel.status === 'halbzeit'
        );
        
        if (hasActiveGames && !selectedTimeSlot) {
          selectedTimeSlot = slot;
          selectedNextTimeSlot = timeSlots[i + 1] || '';
          break;
        }
      }
      
      // If no active games found, use current/next time slot
      if (!selectedTimeSlot) {
        const futureSlots = timeSlots.filter(slot => timeStringToMinutes(slot) >= nowMinutes);
        selectedTimeSlot = futureSlots[0] || timeSlots[timeSlots.length - 1] || '';
        selectedNextTimeSlot = futureSlots[1] || '';
      }
      
      setCurrentTimeSlot(selectedTimeSlot);
      setNextTimeSlot(selectedNextTimeSlot);
      
      // Get games for current and next slot
      const currentGames = todaysGames.filter((spiel: Spiel) => spiel.zeit === selectedTimeSlot);
      const nextGames = selectedNextTimeSlot ? 
        todaysGames.filter((spiel: Spiel) => spiel.zeit === selectedNextTimeSlot) : [];
      
      // Convert to LiveGame format
      const convertToLiveGame = (spiel: Spiel): LiveGame => {
        // Find field settings
        const feldNameApi = (spiel.feld || '').trim().toLowerCase();
        let feldInfo = feldEinstellungen.find(f => 
          f.name.trim().toLowerCase() === feldNameApi ||
          f.id === spiel.feld ||
          f.id === feldNameApi.match(/(\d+)/)?.[1]
        );
        
        feldInfo = feldInfo || { spielzeit: 90, zweiHalbzeiten: true, halbzeitpause: 15 };

        // Determine live status from API status
        let liveStatus: 'ready' | 'running' | 'halftime' | 'finished' = 'ready';
        if (spiel.status === 'beendet') liveStatus = 'finished';
        else if (spiel.status === 'laufend') liveStatus = 'running';
        else if (spiel.status === 'halbzeit') liveStatus = 'halftime';

        // Get saved timer state
        const savedTimer = localStorage.getItem(`game-timer-${spiel.id}`);
        let startTime: number | undefined;
        let elapsedTime = 0;
        let isSecondHalf = false;
        let halbzeitStartTime: number | undefined;
        let firstHalfEndTime: number | undefined;

        if (savedTimer) {
          const savedData = JSON.parse(savedTimer);
          startTime = savedData.startTime;
          isSecondHalf = savedData.isSecondHalf || false;
          halbzeitStartTime = savedData.halbzeitStartTime;
          firstHalfEndTime = savedData.firstHalfEndTime;
          
          if (liveStatus === 'running' && startTime) {
            if (isSecondHalf && halbzeitStartTime) {
              elapsedTime = Math.floor((Date.now() - halbzeitStartTime) / 1000);
            } else {
              elapsedTime = Math.floor((Date.now() - startTime) / 1000);
            }
          }
        }

        return {
          ...spiel,
          liveStatus,
          startTime,
          elapsedTime,
          spielzeit: feldInfo.spielzeit,
          zweiHalbzeiten: feldInfo.zweiHalbzeiten,
          isSecondHalf,
          halbzeitStartTime,
          firstHalfEndTime
        };
      };

      setCurrentSlotGames(currentGames.map(convertToLiveGame));
      setNextSlotGames(nextGames.map(convertToLiveGame));
      
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load games on mount and refresh periodically
  useEffect(() => {
    loadGames();
    const interval = setInterval(loadGames, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [feldEinstellungen]);

  // Check for automatic transitions (halftime/end)
  useEffect(() => {
    const checkTransitions = () => {
      setCurrentSlotGames(prev => prev.map(game => {
        if (game.liveStatus === 'running' && game.startTime) {
          const { shouldAutoEnd, shouldAutoHalftime } = getGameProgress(game);
          
          if (shouldAutoHalftime && game.zweiHalbzeiten && !game.isSecondHalf) {
            // Move to halftime
            const newGame = {
              ...game,
              liveStatus: 'halftime' as const,
              firstHalfEndTime: Date.now(),
              halbzeitStartTime: Date.now()
            };
            
            // Save to localStorage
            localStorage.setItem(`game-timer-${game.id}`, JSON.stringify({
              startTime: game.startTime,
              isSecondHalf: false,
              halbzeitStartTime: Date.now(),
              firstHalfEndTime: Date.now()
            }));
            
            // Update database
            fetch('/api/spielplan/live', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ spielId: game.id, status: 'halbzeit' })
            }).catch(console.error);
            
            // Update live timer
            fetch('/api/spielplan/live-timer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                spielId: game.id,
                liveTime: 'Halbzeit',
                status: 'halftime'
              })
            }).catch(console.error);
            
            return newGame;
          }
          
          if (shouldAutoEnd) {
            // End game
            localStorage.removeItem(`game-timer-${game.id}`);
            
            // Update database
            fetch('/api/spielplan/live', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ spielId: game.id, status: 'beendet' })
            }).catch(console.error);
            
            // Remove from live timer
            fetch('/api/spielplan/live-timer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ spielId: game.id, status: 'beendet' })
            }).catch(console.error);
            
            return { ...game, liveStatus: 'finished' as const };
          }
        }
        return game;
      }));
    };

    const interval = setInterval(checkTransitions, 1000);
    return () => clearInterval(interval);
  }, []);

  // Start all games (new + halftime)
  const startAllGames = async () => {
    const gamesToStart = currentSlotGames.filter(game => 
      game.liveStatus === 'ready' || game.liveStatus === 'halftime'
    );

    if (gamesToStart.length === 0) {
      alert('Keine Spiele zum Starten verfügbar');
      return;
    }

    const startTime = Date.now();

    try {
      // Update all games to running
      setCurrentSlotGames(prev => prev.map(game => {
        if (gamesToStart.some(g => g.id === game.id)) {
          const isSecondHalf = game.liveStatus === 'halftime';
          const gameStartTime = isSecondHalf ? (game.startTime || startTime) : startTime;
          
          // Save timer state
          localStorage.setItem(`game-timer-${game.id}`, JSON.stringify({
            startTime: gameStartTime,
            isSecondHalf,
            halbzeitStartTime: isSecondHalf ? startTime : undefined,
            firstHalfEndTime: game.firstHalfEndTime
          }));

          return {
            ...game,
            liveStatus: 'running' as const,
            startTime: gameStartTime,
            halbzeitStartTime: isSecondHalf ? startTime : game.halbzeitStartTime,
            isSecondHalf,
            elapsedTime: 0
          };
        }
        return game;
      }));

      // Update database
      await Promise.all(gamesToStart.map(game =>
        fetch('/api/spielplan/live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spielId: game.id, status: 'laufend' })
        })
      ));

      // Update live timers
      await Promise.all(gamesToStart.map(game =>
        fetch('/api/spielplan/live-timer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spielId: game.id,
            liveTime: '00:00',
            status: 'running'
          })
        }).catch(console.warn)
      ));

      console.log(`Started ${gamesToStart.length} games`);
      
    } catch (error) {
      console.error('Error starting games:', error);
    }
  };

  // Pause all running games
  const pauseAllGames = async () => {
    const runningGames = currentSlotGames.filter(game => game.liveStatus === 'running');
    if (runningGames.length === 0) return;

    try {
      setCurrentSlotGames(prev => prev.map(game => {
        if (game.liveStatus === 'running') {
          return { ...game, liveStatus: 'paused' as const };
        }
        return game;
      }));

      // Update database - pause is not a standard status, so we keep as 'laufend'
      // The pause state is only maintained in the frontend
      console.log(`Paused ${runningGames.length} games`);
      
    } catch (error) {
      console.error('Error pausing games:', error);
    }
  };

  // Resume all paused games
  const resumeAllGames = async () => {
    const pausedGames = currentSlotGames.filter(game => game.liveStatus === 'paused');
    if (pausedGames.length === 0) return;

    const resumeTime = Date.now();

    try {
      setCurrentSlotGames(prev => prev.map(game => {
        if (game.liveStatus === 'paused' && game.startTime) {
          // Adjust start time to account for pause
          const adjustedStartTime = resumeTime - (game.elapsedTime * 1000);
          return {
            ...game,
            liveStatus: 'running' as const,
            startTime: adjustedStartTime
          };
        }
        return game;
      }));

      console.log(`Resumed ${pausedGames.length} games`);
      
    } catch (error) {
      console.error('Error resuming games:', error);
    }
  };

  // Utility functions
  const formatTimeToSpielzeit = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const roundedMinutes = Math.floor(minutes / 10) * 10;
    return `${hours.toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')}`;
  };

  const formatDateToSpielDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const timeStringToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const getGameProgress = (game: LiveGame): {
    progress: number;
    timeDisplay: string;
    isLastMinute: boolean;
    shouldAutoEnd: boolean;
    shouldAutoHalftime: boolean;
  } => {
    if (!game.startTime || game.liveStatus !== 'running') {
      return {
        progress: 0,
        timeDisplay: '00:00',
        isLastMinute: false,
        shouldAutoEnd: false,
        shouldAutoHalftime: false
      };
    }

    const spielzeit = game.spielzeit;
    let elapsed: number;
    let totalGameTime: number;

    if (game.zweiHalbzeiten) {
      const halfTime = spielzeit / 2;
      
      if (game.isSecondHalf && game.halbzeitStartTime) {
        // Second half
        elapsed = Math.floor((Date.now() - game.halbzeitStartTime) / 1000) / 60; // minutes
        totalGameTime = halfTime;
        const progress = 50 + Math.min(50, (elapsed / halfTime) * 50);
        
        return {
          progress,
          timeDisplay: `2. HZ: ${Math.floor(elapsed)}/${Math.floor(halfTime)} min`,
          isLastMinute: elapsed >= halfTime - 1,
          shouldAutoEnd: elapsed >= halfTime,
          shouldAutoHalftime: false
        };
      } else {
        // First half
        elapsed = Math.floor((Date.now() - game.startTime) / 1000) / 60; // minutes
        totalGameTime = halfTime;
        const progress = Math.min(50, (elapsed / halfTime) * 50);
        
        return {
          progress,
          timeDisplay: `1. HZ: ${Math.floor(elapsed)}/${Math.floor(halfTime)} min`,
          isLastMinute: elapsed >= halfTime - 1,
          shouldAutoEnd: false,
          shouldAutoHalftime: elapsed >= halfTime
        };
      }
    } else {
      // Single period
      elapsed = Math.floor((Date.now() - game.startTime) / 1000) / 60; // minutes
      totalGameTime = spielzeit;
      const progress = Math.min(100, (elapsed / totalGameTime) * 100);
      
      return {
        progress,
        timeDisplay: `${Math.floor(elapsed)}/${Math.floor(totalGameTime)} min`,
        isLastMinute: elapsed >= totalGameTime - 1,
        shouldAutoEnd: elapsed >= totalGameTime,
        shouldAutoHalftime: false
      };
    }
  };

  const getProgressColor = (progress: number, isLastMinute: boolean, status: string): string => {
    if (status === 'halftime') return 'bg-yellow-500';
    if (status === 'paused') return 'bg-orange-500';
    if (isLastMinute) return 'bg-red-500 animate-pulse';
    if (progress > 75) return 'bg-orange-500';
    if (progress > 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStatusBadge = (game: LiveGame) => {
    switch (game.liveStatus) {
      case 'ready':
        return <Badge variant="secondary">Bereit</Badge>;
      case 'running':
        return <Badge className="bg-green-600">Läuft</Badge>;
      case 'paused':
        return <Badge variant="outline" className="border-orange-500 text-orange-600">Pausiert</Badge>;
      case 'halftime':
        return <Badge className="bg-yellow-600">Halbzeit</Badge>;
      case 'finished':
        return <Badge variant="outline">Beendet</Badge>;
      default:
        return <Badge variant="secondary">Unbekannt</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-8 text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300 animate-spin" />
          <p className="text-gray-600">Lade Live-Spiele...</p>
        </CardContent>
      </Card>
    );
  }

  const runningGames = currentSlotGames.filter(game => game.liveStatus === 'running');
  const readyGames = currentSlotGames.filter(game => game.liveStatus === 'ready');
  const halftimeGames = currentSlotGames.filter(game => game.liveStatus === 'halftime');
  const pausedGames = currentSlotGames.filter(game => game.liveStatus === 'paused');

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      {/* Clock Header */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <Clock className="h-6 w-6 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-blue-800">Live Turnier Dashboard</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="ml-auto"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
          <div className="text-4xl font-mono font-bold text-blue-900 mb-2">
            {currentTime.toLocaleTimeString('de-DE', { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            })}
          </div>
          <p className="text-blue-700">
            {currentTime.toLocaleDateString('de-DE', { 
              weekday: 'long', 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric' 
            })}
          </p>
        </CardContent>
      </Card>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Zeitslot {currentTimeSlot} Uhr
            <Badge variant="outline" className="ml-2">
              {currentSlotGames.length} Spiele
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            {(readyGames.length > 0 || halftimeGames.length > 0) && (
              <Button onClick={startAllGames} className="bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4 mr-2" />
                Alle Starten ({readyGames.length + halftimeGames.length})
              </Button>
            )}
            
            {runningGames.length > 0 && (
              <Button onClick={pauseAllGames} variant="outline">
                <Pause className="h-4 w-4 mr-2" />
                Alle Pausieren ({runningGames.length})
              </Button>
            )}
            
            {pausedGames.length > 0 && (
              <Button onClick={resumeAllGames} className="bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4 mr-2" />
                Alle Fortsetzen ({pausedGames.length})
              </Button>
            )}

            <Button onClick={loadGames} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Aktualisieren
            </Button>
          </div>

          {/* Status Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{runningGames.length}</div>
              <div className="text-sm text-gray-600">Laufend</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{halftimeGames.length}</div>
              <div className="text-sm text-gray-600">Halbzeit</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{readyGames.length}</div>
              <div className="text-sm text-gray-600">Bereit</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{pausedGames.length}</div>
              <div className="text-sm text-gray-600">Pausiert</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Games */}
      <Card>
        <CardHeader>
          <CardTitle>Aktuelle Spiele - {currentTimeSlot} Uhr</CardTitle>
        </CardHeader>
        <CardContent>
          {currentSlotGames.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Keine Spiele für diesen Zeitslot
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentSlotGames.map(game => {
                const { progress, timeDisplay, isLastMinute } = getGameProgress(game);
                return (
                  <Card key={game.id} className="border-2">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="font-semibold">{game.feld}</span>
                        </div>
                        {getStatusBadge(game)}
                      </div>
                      <Badge variant="outline" className="w-fit text-xs">
                        {game.kategorie}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* Teams */}
                        <div className="bg-slate-50 rounded-lg p-3">
                          <div className="text-center">
                            <div className="font-medium">{game.team1}</div>
                            <div className="text-xs text-gray-500 my-1">vs</div>
                            <div className="font-medium">{game.team2}</div>
                          </div>
                        </div>

                        {/* Game Progress */}
                        {game.liveStatus === 'running' && (
                          <div className="space-y-2">
                            <div className="text-center">
                              <div className={`font-mono text-sm ${isLastMinute ? 'text-red-600 font-bold animate-pulse' : 'text-blue-600'}`}>
                                {timeDisplay}
                                {isLastMinute && <span className="ml-2">⚠️ LETZTE MINUTE</span>}
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-1000 ${getProgressColor(progress, isLastMinute, game.liveStatus)}`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Halftime Display */}
                        {game.liveStatus === 'halftime' && (
                          <div className="text-center bg-yellow-100 rounded-lg p-2">
                            <div className="text-yellow-800 font-semibold">
                              ⏸️ HALBZEITPAUSE
                            </div>
                            <div className="text-xs text-yellow-700 mt-1">
                              Wartet auf nächsten Spielstart
                            </div>
                          </div>
                        )}

                        {/* Ready Display */}
                        {game.liveStatus === 'ready' && (
                          <div className="text-center bg-blue-100 rounded-lg p-2">
                            <div className="text-blue-800 font-semibold">
                              ⏳ BEREIT ZUM START
                            </div>
                            <div className="text-xs text-blue-700 mt-1">
                              Spielzeit: {game.spielzeit} min {game.zweiHalbzeiten ? '(2 Halbzeiten)' : '(1 Spiel)'}
                            </div>
                          </div>
                        )}

                        {/* Paused Display */}
                        {game.liveStatus === 'paused' && (
                          <div className="text-center bg-orange-100 rounded-lg p-2">
                            <div className="text-orange-800 font-semibold">
                              ⏸️ PAUSIERT
                            </div>
                            <div className="text-xs text-orange-700 mt-1">
                              Spielzeit: {timeDisplay}
                            </div>
                          </div>
                        )}

                        {/* Finished Display */}
                        {game.liveStatus === 'finished' && (
                          <div className="text-center bg-gray-100 rounded-lg p-2">
                            <div className="text-gray-800 font-semibold">
                              🏁 BEENDET
                            </div>
                          </div>
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

      {/* Next Games (for announcements) */}
      {nextTimeSlot && nextSlotGames.length > 0 && (
        <Card className="border-dashed border-2 border-blue-300 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Nächste Spiele - {nextTimeSlot} Uhr
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                Für Durchsagen
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {nextSlotGames.map(game => (
                <Card key={game.id} className="border border-blue-200 bg-white/80">
                  <CardContent className="p-3">
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                        <MapPin className="h-3 w-3" />
                        <span className="font-semibold">{game.feld}</span>
                      </div>
                      <div className="text-xs font-medium text-blue-700">
                        {game.kategorie}
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{game.team1}</div>
                        <div className="text-xs text-gray-500">vs</div>
                        <div className="text-sm font-medium">{game.team2}</div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {game.spielzeit} min {game.zweiHalbzeiten ? '(2 HZ)' : '(1 Spiel)'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Global Alerts */}
      {(() => {
        const lastMinuteGames = currentSlotGames.filter(game => {
          if (game.liveStatus !== 'running') return false;
          const { isLastMinute } = getGameProgress(game);
          return isLastMinute;
        });

        const halftimeReadyGames = currentSlotGames.filter(game => game.liveStatus === 'halftime');
        
        return (lastMinuteGames.length > 0 || halftimeReadyGames.length > 0) && (
          <Card className="border-2 border-red-300 bg-red-50">
            <CardContent className="p-4">
              {lastMinuteGames.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 text-red-800 font-bold text-lg animate-pulse">
                    ⚠️ ACHTUNG: {lastMinuteGames.length} Spiel(e) in letzter Minute!
                  </div>
                  <div className="text-sm text-red-700 mt-1">
                    Felder: {lastMinuteGames.map(g => g.feld).join(', ')}
                  </div>
                </div>
              )}
              
              {halftimeReadyGames.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-yellow-800 font-bold text-lg">
                    🏃‍♂️ {halftimeReadyGames.length} Spiel(e) in Halbzeitpause!
                  </div>
                  <div className="text-sm text-yellow-700 mt-1">
                    Felder: {halftimeReadyGames.map(g => g.feld).join(', ')} - Bereit für 2. Halbzeit
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border border-gray-300 bg-gray-50">
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-gray-600">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div>Current Slot: {currentTimeSlot}</div>
                <div>Next Slot: {nextTimeSlot}</div>
                <div>Current Games: {currentSlotGames.length}</div>
                <div>Next Games: {nextSlotGames.length}</div>
              </div>
              <div>
                <div>Field Settings: {feldEinstellungen.length}</div>
                <div>Running: {runningGames.length}</div>
                <div>Ready: {readyGames.length}</div>
                <div>Halftime: {halftimeGames.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}