'use client';

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, MapPin, Trophy, Filter, Play, CheckCircle, Pause, AlertCircle, RefreshCw, Save, Settings, Users } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DraggableSpiel } from "@/components/DraggableSpiel";

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
  liveTime?: string; // Live Spielzeit vom Dashboard
  spielzeit?: number; // Maximale Spielzeit in Minuten
}

async function getSpielplan(): Promise<{ 
  samstag: { datum: string; zeit: string; spiele: Spiel[] }; 
  sonntag: { datum: string; zeit: string; spiele: Spiel[] };
  availableFields: string[];
  liveData?: { [spielId: string]: { liveTime: string; status: string; delay?: number; progress?: number } };
}> {
  try {
    const response = await fetch('/api/spielplan/get', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch spielplan: ${response.status}`);
    }
    const spielplanData = await response.json();
    
    // Validate that we got real data
    if (!spielplanData || !spielplanData.samstag || !spielplanData.sonntag) {
      throw new Error('Invalid spielplan data structure');
    }
    
    // Hole Live-Daten vom Dashboard
    let liveData: any = {};
    try {
      const liveResponse = await fetch('/api/spielplan/live', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (liveResponse.ok) {
        const liveDataResult = await liveResponse.json();
        
        // Hole auch Live-Timer Daten
        const timerResponse = await fetch('/api/spielplan/live-timer', {
          cache: 'no-store'
        });
        let timerData: { [key: string]: any } = {};
        if (timerResponse.ok) {
          const timerResult = await timerResponse.json();
          timerData = timerResult.timers || {};
        }
        
        // Merge beide Datenquellen
        const mergedLiveData: { [key: string]: any } = {};
        const allSpiele = [...spielplanData.samstag.spiele, ...spielplanData.sonntag.spiele];
        
        allSpiele.forEach((spiel: Spiel) => {
          const spielTimer = timerData[spiel.id];
          const spielStatus = liveDataResult.spiele?.find((s: any) => s.id === spiel.id);
          
          mergedLiveData[spiel.id] = {
            liveTime: spielTimer?.liveTime || spiel.liveTime,
            status: spielStatus?.status || spiel.status,
            delay: calculateDelay(spiel),
            progress: spielTimer?.progress || 0
          };
        });
        
        liveData = mergedLiveData;
      }
    } catch (error) {
      console.warn('Could not fetch live data:', error);
      // Continue without live data
    }
    
    return { ...spielplanData, liveData };
  } catch (error) {
    console.error('Error fetching spielplan:', error);
    
    // Instead of returning fallback data, re-throw the error
    // The calling function will handle preserving existing data
    throw error;
  }
}

// Berechne Verspätung für ein Spiel
function calculateDelay(spiel: Spiel): number {
  const now = new Date();
  const scheduledTime = new Date(`${spiel.datum}T${spiel.zeit}:00`);
  
  if (spiel.status === 'ready' && now > scheduledTime) {
    return Math.floor((now.getTime() - scheduledTime.getTime()) / (1000 * 60));
  }
  return 0;
}

// Zeitindikator-Komponente für den aktuellen Zeitpunkt als Overlay
function TimeIndicator({ currentTime }: { currentTime: string }) {
  return (
    <div className="fixed top-4 right-4 md:top-20 md:right-4 z-50 bg-red-500 text-white px-3 py-2 md:px-4 md:py-2 rounded-full shadow-lg flex items-center gap-2">
      <Clock className="w-3 h-3 md:w-4 md:h-4" />
      <span className="font-mono font-semibold text-sm md:text-base">{currentTime}</span>
    </div>
  );
}

// Prüfe ob ein Spiel gerade zwischen zwei Zeitpunkten liegt (für Zeitlinie)
function shouldShowTimeIndicator(currentSpiel: Spiel, nextSpiel: Spiel | undefined, currentTime: Date): boolean {
  const currentSpielTime = new Date(`${currentSpiel.datum}T${currentSpiel.zeit}:00`);
  const nextSpielTime = nextSpiel ? new Date(`${nextSpiel.datum}T${nextSpiel.zeit}:00`) : null;
  
  // Zeige nur eine dünne Linie zwischen Spielen, ohne "Nächstes Spiel" Text
  if (nextSpielTime) {
    return currentTime > currentSpielTime && currentTime < nextSpielTime;
  }
  return false;
}

// Verbesserte Live-Status Prüfung - nur Dashboard-gestartete Spiele sind wirklich live
function isGameLive(spiel: Spiel, liveData?: { [spielId: string]: { liveTime: string; status: string; delay?: number; progress?: number } }): boolean {
  const spielLiveData = liveData?.[spiel.id];
  // Nur Spiele sind live, die im Dashboard aktiv als 'running' markiert sind
  // NICHT mehr: spiel.status === 'laufend' (das wäre nur Datenbank-Status)
  // Prüfe sowohl Timer-Status als auch Datenbank-Status für bessere Erkennung
  return (spielLiveData?.status === 'running') || 
         (spiel.status === 'laufend' && spielLiveData !== undefined && spielLiveData.liveTime !== undefined);
}

function getStatusBadge(spiel: Spiel, spielplanData?: { liveData?: { [spielId: string]: { liveTime: string; status: string; delay?: number; progress?: number } } }) {
  const now = new Date();
  const [stunden, minuten] = spiel.zeit.split(':').map(Number);
  const spielZeit = new Date(`${spiel.datum}T${spiel.zeit}:00`);
  const spielEnde = new Date(spielZeit.getTime() + (90 * 60 * 1000)); // 90 Minuten später

  // Automatische Status-Bestimmung basierend auf Zeit und Live-Daten
  const liveDataForSpiel = spielplanData?.liveData?.[spiel.id];
  const delay = liveDataForSpiel?.delay || 0;
  const progress = liveDataForSpiel?.progress || 0;
  const spielStatus = liveDataForSpiel?.status || spiel.status;
  const liveTime = liveDataForSpiel?.liveTime || spiel.liveTime;
  const isHalftime = liveTime?.includes('Pause');
  
  // Nur Dashboard-gesteuerte Live-Spiele zeigen als live an
  if (spielStatus === 'running' || (spiel.status === 'laufend' && liveDataForSpiel !== undefined)) {
    if (isHalftime) {
      return (
        <div className="flex flex-col items-center gap-1">
          <Badge variant="default" className="bg-orange-100 text-orange-600">
            <Pause className="w-3 h-3 mr-1" />
            Halbzeit
          </Badge>
          {liveTime && (
            <span className="text-xs text-orange-600 font-mono font-semibold">
              {liveTime}
            </span>
          )}
        </div>
      );
    } else {
      return (
        <div className="flex flex-col items-center gap-1">
          <Badge variant="default" className="bg-red-500 text-white animate-pulse">Live</Badge>
          {liveTime && (
            <span className="text-xs font-mono text-red-600 font-semibold">
              {liveTime}
            </span>
          )}
        </div>
      );
    }
  }
  
  if (spiel.status === 'beendet') {
    return (
      <div className="flex flex-col items-center gap-1">
        <Badge variant="outline" className="border-gray-400 text-gray-600">Vorbei</Badge>
        {spiel.spielzeit && (
          <span className="text-xs text-gray-500">
            {spiel.spielzeit} Min
          </span>
        )}
      </div>
    );
  }

  // Prüfe auf 'halftime' Status vom Dashboard
  if (spielStatus === 'halftime') {
    return (
      <div className="flex flex-col items-center gap-1">
        <Badge variant="default" className="bg-orange-100 text-orange-600">
          <Pause className="w-3 h-3 mr-1" />
          Halbzeit
        </Badge>
        {liveTime && (
          <span className="text-xs text-orange-600 font-mono font-semibold">
            {liveTime}
          </span>
        )}
      </div>
    );
  }
  
  if (spielStatus === 'ready') {
    return (
      <div className="flex flex-col items-center gap-1">
        <Badge variant="secondary" className={delay > 0 ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}>
          {delay > 0 ? (
            <>
              <AlertCircle className="w-3 h-3 mr-1" />
              Verspätet +{delay}min
            </>
          ) : (
            <>
              <Clock className="w-3 h-3 mr-1" />
              Bereit
            </>
          )}
        </Badge>
        {spiel.spielzeit && (
          <span className="text-xs text-blue-600">
            {spiel.spielzeit} Min
          </span>
        )}
      </div>
    );
  }
  
  if (spielStatus === 'finished' || spielStatus === 'beendet') {
    return (
      <div className="flex flex-col items-center gap-1">
        <Badge variant="outline" className="border-gray-400 text-gray-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Beendet
        </Badge>
        {spiel.spielzeit && (
          <span className="text-xs text-gray-500">
            {spiel.spielzeit} Min
          </span>
        )}
      </div>
    );
  }

  // Automatische Status-Bestimmung basierend auf Zeit
  if (now < spielZeit) {
    return (
      <div className="flex flex-col items-center gap-1">
        <Badge variant="secondary" className="bg-gray-100 text-gray-600">
          <Clock className="w-3 h-3 mr-1" />
          {delay > 0 ? `Geplant (+${delay}min)` : 'Geplant'}
        </Badge>
        {spiel.spielzeit && (
          <span className="text-xs text-gray-600">
            {spiel.spielzeit} Min
          </span>
        )}
      </div>
    );
  } else if (now >= spielZeit && now <= spielEnde) {
    return (
      <div className="flex flex-col items-center gap-1">
        <Badge variant="default" className="bg-red-500 text-white animate-pulse">
          <Play className="w-3 h-3 mr-1" />
          Live
        </Badge>
        {spiel.liveTime && (
          <span className="text-xs font-mono text-red-600 font-semibold">
            {spiel.liveTime}
          </span>
        )}
      </div>
    );
  } else {
    return (
      <div className="flex flex-col items-center gap-1">
        <Badge variant="outline" className="border-gray-400 text-gray-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Vorbei
        </Badge>
        {spiel.spielzeit && (
          <span className="text-xs text-gray-500">
            {spiel.spielzeit} Min
          </span>
        )}
      </div>
    );
  }
}

function getWeekdayName(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    weekday: 'long'
  });
}

export default function SpielplanPage() {
  const [spielplanData, setSpielplanData] = useState<{
    samstag: { datum: string; zeit: string; spiele: Spiel[] };
    sonntag: { datum: string; zeit: string; spiele: Spiel[] };
    availableFields: string[];
    liveData?: { [spielId: string]: { liveTime: string; status: string; delay?: number; progress?: number } };
  } | null>(null);
  
  const [selectedField, setSelectedField] = useState<string>('alle');
  const [activeTab, setActiveTab] = useState<'samstag' | 'sonntag'>('samstag');

  // Drag & Drop Sensors - optimiert für mobile Geräte
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300, // Längere Verzögerung für bessere mobile UX
        tolerance: 8, // Größere Toleranz für Fingerbewegungen
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Drag & Drop Handler
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const currentSpiele = activeTab === 'samstag' 
        ? filteredSamstag 
        : filteredSonntag;
      
      const oldIndex = currentSpiele.findIndex(spiel => spiel.id === active.id);
      const newIndex = currentSpiele.findIndex(spiel => spiel.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(currentSpiele, oldIndex, newIndex);
        
        // Update spielplanData
        setSpielplanData(prev => {
          if (!prev) return prev;
          
          const updatedData = { ...prev };
          if (activeTab === 'samstag') {
            updatedData.samstag.spiele = updateSpielOrder(updatedData.samstag.spiele, newOrder);
          } else {
            updatedData.sonntag.spiele = updateSpielOrder(updatedData.sonntag.spiele, newOrder);
          }
          
          return updatedData;
        });
      }
    }
  }

  // Hilfsfunktion zum Update der Spielreihenfolge
  function updateSpielOrder(allSpiele: Spiel[], reorderedFiltered: Spiel[]): Spiel[] {
    if (selectedField === 'alle') {
      return reorderedFiltered;
    }
    
    // Wenn gefiltert, nur die Zeiten der gefilterten Spiele updaten
    const updatedSpiele = [...allSpiele];
    const timeSlots = reorderedFiltered.map(s => s.zeit).sort();
    
    reorderedFiltered.forEach((spiel, index) => {
      const originalIndex = updatedSpiele.findIndex(s => s.id === spiel.id);
      if (originalIndex !== -1) {
        updatedSpiele[originalIndex] = {
          ...spiel,
          zeit: timeSlots[index]
        };
      }
    });
    
    return updatedSpiele;
  }

  // Zeit ändern Handler - entfernt da nicht mehr benötigt für einfachen Spielplan

  // Daten laden (aus useEffect extrahiert)
  async function loadData() {
    try {
      const data = await getSpielplan();
      
      // Live data mit game data mergen
      if (data.liveData) {
        const allSpiele = [...data.samstag.spiele, ...data.sonntag.spiele];
        
        // Update Samstag games
        data.samstag.spiele = data.samstag.spiele.map(spiel => ({
          ...spiel,
          liveTime: data.liveData?.[spiel.id]?.liveTime,
          status: data.liveData?.[spiel.id]?.status || spiel.status,
          delay: data.liveData?.[spiel.id]?.delay || 0,
          progress: data.liveData?.[spiel.id]?.progress || 0
        }));
        
        // Update Sonntag games
        data.sonntag.spiele = data.sonntag.spiele.map(spiel => ({
          ...spiel,
          liveTime: data.liveData?.[spiel.id]?.liveTime,
          status: data.liveData?.[spiel.id]?.status || spiel.status,
          delay: data.liveData?.[spiel.id]?.delay || 0,
          progress: data.liveData?.[spiel.id]?.progress || 0
        }));
      }
      
      setSpielplanData(data);
    } catch (error) {
      console.error('Error loading spielplan data:', error);
    }
  }

  // Auto-refresh when tabbing back into the page (similar to Live Dashboard)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible again (user tabbed back in)
        console.log('Spielplan: Page became visible, refreshing data...');
        // Use the same function as the main useEffect
        loadDataWithNotifications();
      }
    };

    const handleFocus = () => {
      // Window gained focus
      console.log('Spielplan: Window gained focus, refreshing data...');
      // Use the same function as the main useEffect
      loadDataWithNotifications();
    };

    // Define the function here so it can be used by event handlers
    async function loadDataWithNotifications() {
      try {
        const data = await getSpielplan();
        
        // Only update if we got real data (not fallback data)
        if (data && data.samstag && data.samstag.spiele && data.samstag.spiele.length > 0) {
          // Preserve existing live data if no new live data available
          const currentData = spielplanData;
          
          // Merge live data with game data
          if (data.liveData) {
            // Update Samstag games with smart merging
            data.samstag.spiele = data.samstag.spiele.map(spiel => {
              const existingSpiel = currentData?.samstag?.spiele?.find(s => s.id === spiel.id);
              const newLiveData = data.liveData?.[spiel.id];
              const existingLiveTime = existingSpiel?.liveTime;
              
              return {
                ...spiel,
                // Only update liveTime if we have new data or if existing data is undefined
                liveTime: newLiveData?.liveTime || (existingLiveTime && existingLiveTime !== 'undefined' ? existingLiveTime : undefined),
                status: newLiveData?.status || spiel.status,
                delay: newLiveData?.delay || 0,
                progress: newLiveData?.progress || 0
              };
            });
            
            // Update Sonntag games with smart merging
            data.sonntag.spiele = data.sonntag.spiele.map(spiel => {
              const existingSpiel = currentData?.sonntag?.spiele?.find(s => s.id === spiel.id);
              const newLiveData = data.liveData?.[spiel.id];
              const existingLiveTime = existingSpiel?.liveTime;
              
              return {
                ...spiel,
                // Only update liveTime if we have new data or if existing data is undefined
                liveTime: newLiveData?.liveTime || (existingLiveTime && existingLiveTime !== 'undefined' ? existingLiveTime : undefined),
                status: newLiveData?.status || spiel.status,
                delay: newLiveData?.delay || 0,
                progress: newLiveData?.progress || 0
              };
            });
          } else if (currentData) {
            // If no live data available, preserve existing live times
            data.samstag.spiele = data.samstag.spiele.map(spiel => {
              const existingSpiel = currentData.samstag?.spiele?.find(s => s.id === spiel.id);
              return {
                ...spiel,
                liveTime: existingSpiel?.liveTime,
                status: existingSpiel?.status || spiel.status
              };
            });
            
            data.sonntag.spiele = data.sonntag.spiele.map(spiel => {
              const existingSpiel = currentData.sonntag?.spiele?.find(s => s.id === spiel.id);
              return {
                ...spiel,
                liveTime: existingSpiel?.liveTime,
                status: existingSpiel?.status || spiel.status
              };
            });
          }
          
          setSpielplanData(data);
          console.log('Spielplan data updated successfully with', data.samstag.spiele.length + data.sonntag.spiele.length, 'games');
        } else {
          // If we get fallback data, don't overwrite existing good data
          console.warn('Received fallback data, keeping existing data');
          
          // Only update live data if we have existing spielplan data
          if (spielplanData && data && data.liveData) {
            setSpielplanData(prev => {
              if (!prev) return prev;
              
              const updatedData = { ...prev };
              
              // Update live data for existing games
              if (updatedData.samstag && updatedData.samstag.spiele) {
                updatedData.samstag.spiele = updatedData.samstag.spiele.map(spiel => ({
                  ...spiel,
                  liveTime: data.liveData?.[spiel.id]?.liveTime || spiel.liveTime,
                  status: data.liveData?.[spiel.id]?.status || spiel.status,
                  delay: data.liveData?.[spiel.id]?.delay || 0,
                  progress: data.liveData?.[spiel.id]?.progress || 0
                }));
              }
              
              if (updatedData.sonntag && updatedData.sonntag.spiele) {
                updatedData.sonntag.spiele = updatedData.sonntag.spiele.map(spiel => ({
                  ...spiel,
                  liveTime: data.liveData?.[spiel.id]?.liveTime || spiel.liveTime,
                  status: data.liveData?.[spiel.id]?.status || spiel.status,
                  delay: data.liveData?.[spiel.id]?.delay || 0,
                  progress: data.liveData?.[spiel.id]?.progress || 0
                }));
              }
              
              updatedData.liveData = data.liveData;
              return updatedData;
            });
          }
        }
      } catch (error) {
        console.error('Error loading spielplan data:', error);
        // Don't update state on error to preserve existing data
      }
    }

    // Initial data load
    async function initialLoad() {
      try {
        await loadDataWithNotifications();
      } catch (error) {
        console.error('Error during initial load:', error);
        // Could show user notification here
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    // Load data initially
    initialLoad();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  if (!spielplanData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Lade Spielplan...</p>
        </div>
      </div>
    );
  }

  // Filtere Spiele basierend auf dem ausgewählten Feld
  const filterSpieleByField = (spiele: Spiel[]) => {
    if (selectedField === 'alle') return spiele;
    return spiele.filter(spiel => spiel.feld === selectedField);
  };

  const filteredSamstag = filterSpieleByField(spielplanData.samstag.spiele);
  const filteredSonntag = filterSpieleByField(spielplanData.sonntag.spiele);

  const currentTime = new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Uhrzeit Overlay */}
      <TimeIndicator currentTime={currentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-green-600 hover:text-green-700">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Spielplan
              </h1>
              <p className="text-gray-600 mt-1 text-sm md:text-base">
                Live-Übersicht aller Spiele
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            {/* Live-Status-Anzeige */}
            {spielplanData.liveData && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-red-700">
                  {Object.values(spielplanData.liveData).filter(data => data.status === 'running').length} Live
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-600" />
              <Select value={selectedField} onValueChange={setSelectedField}>
                <SelectTrigger className="w-[140px] sm:w-[180px]">
                  <SelectValue placeholder="Feld wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Felder</SelectItem>
                  {spielplanData.availableFields.map((field) => (
                    <SelectItem key={field} value={field}>
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Live-Dashboard Kopplung - Übersicht aktueller Spiele */}
        {spielplanData.liveData && Object.values(spielplanData.liveData).some(data => data.status === 'running') && (
          <Card className="border-red-200 bg-red-50 mb-6">
            <CardHeader>
              <CardTitle className="text-red-700 flex items-center gap-2">
                <Play className="w-5 h-5" />
                Aktuell laufende Spiele (Live Dashboard gekoppelt)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {[...spielplanData.samstag.spiele, ...spielplanData.sonntag.spiele]
                  .filter(spiel => isGameLive(spiel, spielplanData.liveData))
                  .map(spiel => {
                    const liveData = spielplanData.liveData?.[spiel.id];
                    return (
                      <div key={spiel.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <div>
                            <div className="font-medium">{spiel.team1} vs {spiel.team2}</div>
                            <div className="text-sm text-gray-600">{spiel.feld} • {spiel.zeit}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          {liveData?.liveTime?.includes('Pause') ? (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-600">
                              <Pause className="w-3 h-3 mr-1" />
                              Halbzeit
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <Play className="w-3 h-3 mr-1" />
                              {liveData?.liveTime || 'Live'}
                            </Badge>
                          )}
                          {liveData?.delay && liveData.delay > 0 && (
                            <div className="text-xs text-orange-600 mt-1">+{liveData.delay}min Verspätung</div>
                          )}
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'samstag' | 'sonntag')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="samstag">{getWeekdayName(spielplanData.samstag.datum)}</TabsTrigger>
            <TabsTrigger value="sonntag">{getWeekdayName(spielplanData.sonntag.datum)}</TabsTrigger>
          </TabsList>

          <TabsContent value="samstag" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <CardTitle>{spielplanData.samstag.datum}</CardTitle>
                </div>
                <CardDescription>{spielplanData.samstag.zeit}</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredSamstag.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    {spielplanData.samstag.spiele.length === 0 ? (
                      <>
                        <p>Noch keine Spiele geplant</p>
                        <p className="text-sm">Der Spielplan wird nach Anmeldeschluss erstellt</p>
                      </>
                    ) : (
                      <>
                        <p>Keine Spiele für {selectedField === 'alle' ? 'alle Felder' : selectedField}</p>
                        <p className="text-sm">Wählen Sie ein anderes Feld aus</p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Desktop Tabelle mit Drag & Drop */}
                    <div className="hidden md:block overflow-x-auto">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[100px]">Zeit</TableHead>
                              {selectedField === 'alle' && <TableHead className="w-[100px]">Feld</TableHead>}
                              <TableHead>Kategorie</TableHead>
                              <TableHead>Team 1</TableHead>
                              <TableHead>Team 2</TableHead>
                              <TableHead className="text-center">Status & Spielzeit</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <SortableContext 
                              items={filteredSamstag.map(s => s.id)} 
                              strategy={verticalListSortingStrategy}
                            >
                              {filteredSamstag.map((spiel, index) => {
                                const currentTime = new Date();
                                const nextSpiel = filteredSamstag[index + 1];
                                const showTimeIndicator = shouldShowTimeIndicator(spiel, nextSpiel, currentTime);
                                
                                return (
                                  <>
                                    <DraggableSpiel
                                      key={spiel.id}
                                      spiel={spiel}
                                      index={index}
                                      selectedField={selectedField}
                                      spielplanData={spielplanData}
                                      isMobile={false}
                                      isAdmin={false}
                                      onTimeChange={() => {}}
                                      getStatusBadge={getStatusBadge}
                                    />
                                    
                                    {/* Dünne Zeitlinie zwischen Spielen */}
                                    {showTimeIndicator && (
                                      <TableRow>
                                        <TableCell colSpan={selectedField === 'alle' ? 6 : 5} className="p-0">
                                          <div className="w-full border-t border-gray-300 border-dashed my-1"></div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </>
                                );
                              })}
                            </SortableContext>
                          </TableBody>
                        </Table>
                      </DndContext>
                    </div>

                    {/* Mobile Card View mit Drag & Drop */}
                    <div className="md:hidden space-y-3">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext 
                          items={filteredSamstag.map(s => s.id)} 
                          strategy={verticalListSortingStrategy}
                        >
                          {filteredSamstag.map((spiel, index) => {
                            const currentTime = new Date();
                            const nextSpiel = filteredSamstag[index + 1];
                            const showTimeIndicator = shouldShowTimeIndicator(spiel, nextSpiel, currentTime);
                            
                            return (
                              <>
                                <DraggableSpiel
                                  key={spiel.id}
                                  spiel={spiel}
                                  index={index}
                                  selectedField={selectedField}
                                  spielplanData={spielplanData}
                                  isMobile={true}
                                  isAdmin={false}
                                  onTimeChange={() => {}}
                                  getStatusBadge={getStatusBadge}
                                />
                                
                                {/* Mobile Zeitlinie */}
                                {showTimeIndicator && (
                                  <div className="w-full border-t border-gray-300 border-dashed my-2"></div>
                                )}
                              </>
                            );
                          })}
                        </SortableContext>
                      </DndContext>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sonntag" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <CardTitle>{spielplanData.sonntag.datum}</CardTitle>
                </div>
                <CardDescription>{spielplanData.sonntag.zeit}</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredSonntag.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    {spielplanData.sonntag.spiele.length === 0 ? (
                      <>
                        <p>Noch keine Spiele geplant</p>
                        <p className="text-sm">Der Spielplan wird nach Anmeldeschluss erstellt</p>
                      </>
                    ) : (
                      <>
                        <p>Keine Spiele für {selectedField === 'alle' ? 'alle Felder' : selectedField}</p>
                        <p className="text-sm">Wählen Sie ein anderes Feld aus</p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Desktop Tabelle mit Drag & Drop */}
                    <div className="hidden md:block overflow-x-auto">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[100px]">Zeit</TableHead>
                              {selectedField === 'alle' && <TableHead className="w-[100px]">Feld</TableHead>}
                              <TableHead>Kategorie</TableHead>
                              <TableHead>Team 1</TableHead>
                              <TableHead>Team 2</TableHead>
                              <TableHead className="text-center">Status & Spielzeit</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <SortableContext 
                              items={filteredSonntag.map(s => s.id)} 
                              strategy={verticalListSortingStrategy}
                            >
                              {filteredSonntag.map((spiel, index) => {
                                const currentTime = new Date();
                                const nextSpiel = filteredSonntag[index + 1];
                                const showTimeIndicator = shouldShowTimeIndicator(spiel, nextSpiel, currentTime);
                                
                                return (
                                  <>
                                    <DraggableSpiel
                                      key={spiel.id}
                                      spiel={spiel}
                                      index={index}
                                      selectedField={selectedField}
                                      spielplanData={spielplanData}
                                      isMobile={false}
                                      isAdmin={false}
                                      onTimeChange={() => {}}
                                      getStatusBadge={getStatusBadge}
                                    />
                                    
                                    {/* Dünne Zeitlinie zwischen Spielen */}
                                    {showTimeIndicator && (
                                      <TableRow>
                                        <TableCell colSpan={selectedField === 'alle' ? 6 : 5} className="p-0">
                                          <div className="w-full border-t border-gray-300 border-dashed my-1"></div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </>
                                );
                              })}
                            </SortableContext>
                          </TableBody>
                        </Table>
                      </DndContext>
                    </div>

                    {/* Mobile Card View mit Drag & Drop */}
                    <div className="md:hidden space-y-3">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext 
                          items={filteredSonntag.map(s => s.id)} 
                          strategy={verticalListSortingStrategy}
                        >
                          {filteredSonntag.map((spiel, index) => {
                            const currentTime = new Date();
                            const nextSpiel = filteredSonntag[index + 1];
                            const showTimeIndicator = shouldShowTimeIndicator(spiel, nextSpiel, currentTime);
                            
                            return (
                              <>
                                <DraggableSpiel
                                  key={spiel.id}
                                  spiel={spiel}
                                  index={index}
                                  selectedField={selectedField}
                                  spielplanData={spielplanData}
                                  isMobile={true}
                                  isAdmin={false}
                                  onTimeChange={() => {}}
                                  getStatusBadge={getStatusBadge}
                                />
                                
                                {/* Mobile Zeitlinie */}
                                {showTimeIndicator && (
                                  <div className="w-full border-t border-gray-300 border-dashed my-2"></div>
                                )}
                              </>
                            );
                          })}
                        </SortableContext>
                      </DndContext>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            🔴 Live-Spielzeiten werden alle 10 Sekunden aktualisiert • 
            {selectedField !== 'alle' && (
              <span className="font-medium"> Gefiltert nach: {selectedField} • </span>
            )}
            Letzte Aktualisierung: {new Date().toLocaleString('de-DE')}
          </p>
          
          {/* Live Games Notification */}
          {spielplanData && (() => {
            const liveGames = [
              ...spielplanData.samstag.spiele.filter(s => s.status === 'laufend'),
              ...spielplanData.sonntag.spiele.filter(s => s.status === 'laufend')
            ];
            
            return liveGames.length > 0 && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-red-700">
                    {liveGames.length} Spiel{liveGames.length === 1 ? '' : 'e'} läuft gerade
                  </span>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                </div>
                <div className="text-xs text-red-600 mt-1">
                  {liveGames.map(game => `${game.feld}: ${game.team1} vs ${game.team2}`).join(' • ')}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
