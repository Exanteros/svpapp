'use client';

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, MapPin, Trophy, CheckCircle, Pause, AlertTriangle, RefreshCw, Play } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

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

interface SpielplanData {
  samstag: { datum: string; zeit: string; spiele: Spiel[] };
  sonntag: { datum: string; zeit: string; spiele: Spiel[] };
  availableFields: string[];
}

async function getSpielplan(): Promise<SpielplanData> {
  try {
    const response = await fetch('/api/spielplan/get', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch spielplan: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.samstag || !data.sonntag) {
      throw new Error('Invalid spielplan data structure');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching spielplan:', error);
    throw error;
  }
}

function getGameStatus(spiel: Spiel): 'geplant' | 'laufend' | 'halbzeit' | 'abgeschlossen' {
  const now = new Date();
  const spielZeit = new Date(`${spiel.datum}T${spiel.zeit}:00`);
  
  // Status basierend auf Datenbank-Status (vom Live Dashboard gesetzt)
  if (spiel.status === 'laufend') return 'laufend';
  if (spiel.status === 'halbzeit') return 'halbzeit';
  if (spiel.status === 'beendet') return 'abgeschlossen';
  
  // Automatische Status-Bestimmung basierend auf Zeit
  if (now < spielZeit) {
    return 'geplant';
  } else {
    // Wenn die Zeit vorbei ist, aber kein expliziter Status gesetzt wurde
    return 'abgeschlossen';
  }
}

function getStatusBadge(spiel: Spiel) {
  const status = getGameStatus(spiel);
  
  switch (status) {
    case 'laufend':
      return (
        <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full animate-pulse inline-flex items-center">
          <Play className="w-3 h-3 mr-1" />
          Läuft
        </span>
      );
    case 'halbzeit':
      return (
        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full inline-flex items-center">
          <Pause className="w-3 h-3 mr-1" />
          Halbzeit
        </span>
      );
    case 'abgeschlossen':
      return (
        <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded-full inline-flex items-center">
          <CheckCircle className="w-3 h-3 mr-1" />
          Beendet
        </span>
      );
    case 'geplant':
    default:
      return (
        <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full inline-flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          Geplant
        </span>
      );
  }
}

function formatTime(timeString: string): string {
  return timeString;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function getWeekdayName(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    weekday: 'long'
  });
}

function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export default function SpielplanPage() {
  const [spielplanData, setSpielplanData] = useState<SpielplanData | null>(null);
  const [selectedField, setSelectedField] = useState<string>('alle');
  const [activeTab, setActiveTab] = useState<'samstag' | 'sonntag'>('samstag');
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Timer für aktuelle Zeit
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Lade Spielplan
  useEffect(() => {
    loadSpielplan();
    // Aktualisiere alle 30 Sekunden
    const interval = setInterval(loadSpielplan, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSpielplan = async () => {
    try {
      const data = await getSpielplan();
      setSpielplanData(data);
    } catch (error) {
      console.error('Fehler beim Laden des Spielplans:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center max-w-md w-full mx-4">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="w-12 h-12 bg-orange-500 rounded-full animate-spin"></div>
            <div className="absolute top-1.5 left-1.5 w-9 h-9 bg-white rounded-full opacity-30"></div>
          </div>
          <p className="text-gray-600">Lade Spielplan...</p>
        </div>
      </div>
    );
  }

  if (!spielplanData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-md w-full mx-4">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
          </div>
          <p className="text-red-700 mb-4">Fehler beim Laden des Spielplans</p>
          <Button onClick={loadSpielplan} className="bg-orange-500 hover:bg-orange-600 text-white">
            <RefreshCw className="h-4 w-4 mr-2" />
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  // Filtere Spiele nach ausgewähltem Feld
  const filterSpiele = (spiele: Spiel[]) => {
    if (selectedField === 'alle') return spiele;
    return spiele.filter(spiel => spiel.feld === selectedField);
  };

  const currentDaySpiele = activeTab === 'samstag' ? spielplanData.samstag : spielplanData.sonntag;
  const filteredSpiele = filterSpiele(currentDaySpiele.spiele);

  // Gruppiere Spiele nach Zeitslots
  const groupedByTime = filteredSpiele.reduce((acc, spiel) => {
    if (!acc[spiel.zeit]) {
      acc[spiel.zeit] = [];
    }
    acc[spiel.zeit].push(spiel);
    return acc;
  }, {} as Record<string, Spiel[]>);

  const timeSlots = Object.keys(groupedByTime).sort();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-orange-600 hover:bg-orange-50">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Zurück</span>
                  <span className="sm:hidden">Home</span>
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                {/* Handball Ball Icon */}
                <div className="relative w-8 h-8">
                  <div className="w-8 h-8 bg-orange-500 rounded-full"></div>
                  <div className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full opacity-30"></div>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Spielplan</h1>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Aktualisiert: {currentTime.toLocaleTimeString('de-DE')}
                  </p>
                </div>
              </div>
            </div>
            <Button 
              onClick={loadSpielplan} 
              variant="outline" 
              size="sm" 
              className="border-gray-300 text-gray-600 hover:bg-gray-50 w-full sm:w-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Aktualisieren
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-6">

      {/* Filter */}
      <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <label className="text-sm font-medium text-gray-900">Feld filtern:</label>
          </div>
          <Select value={selectedField} onValueChange={setSelectedField}>
            <SelectTrigger className="w-full sm:w-48 border-gray-200 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Felder</SelectItem>
              {spielplanData.availableFields.map(field => (
                <SelectItem key={field} value={field}>{field}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-sm text-gray-600 bg-white px-3 py-2 rounded-md border border-gray-200 w-full sm:w-auto text-center sm:text-left">
            {filteredSpiele.length} Spiel(e) angezeigt
          </div>
        </div>
      </div>

      {/* Tabs für Tage */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'samstag' | 'sonntag')}>
        <TabsList className="grid w-full grid-cols-2 bg-gray-50 p-1 rounded-lg">
          <TabsTrigger 
            value="samstag" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm text-gray-600 font-medium"
          >
            <Calendar className="h-4 w-4" />
            {getWeekdayName(spielplanData.samstag.datum)} ({formatDateShort(spielplanData.samstag.datum)})
          </TabsTrigger>
          <TabsTrigger 
            value="sonntag" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm text-gray-600 font-medium"
          >
            <Calendar className="h-4 w-4" />
            {getWeekdayName(spielplanData.sonntag.datum)} ({formatDateShort(spielplanData.sonntag.datum)})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6 mt-6">
          {timeSlots.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 bg-orange-500 rounded-full"></div>
                  <div className="absolute top-2 left-2 w-6 h-6 bg-white rounded-full opacity-30"></div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Keine Spiele gefunden
              </h3>
              <p className="text-gray-600">
                {selectedField === 'alle' 
                  ? 'Für diesen Tag sind keine Spiele geplant.'
                  : `Für ${selectedField} sind keine Spiele geplant.`
                }
              </p>
            </div>
          ) : (
            timeSlots.map(zeitSlot => {
              const spieleInSlot = groupedByTime[zeitSlot];
              const laufendeSpiele = spieleInSlot.filter(s => getGameStatus(s) === 'laufend').length;
              const halbzeitSpiele = spieleInSlot.filter(s => getGameStatus(s) === 'halbzeit').length;
              
              return (
                <div key={zeitSlot} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="border-b border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {formatTime(zeitSlot)} Uhr
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {laufendeSpiele > 0 && (
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                            {laufendeSpiele} läuft
                          </span>
                        )}
                        {halbzeitSpiele > 0 && (
                          <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                            {halbzeitSpiele} Halbzeit
                          </span>
                        )}
                        <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded-full">
                          {spieleInSlot.length} Spiel(e)
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-100">
                          <TableHead className="w-24 text-gray-600">Status</TableHead>
                          <TableHead className="w-24 text-gray-600">Feld</TableHead>
                          <TableHead className="text-gray-600">Teams</TableHead>
                          <TableHead className="w-32 text-gray-600">Kategorie</TableHead>
                          <TableHead className="w-24 text-center text-gray-600">Ergebnis</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {spieleInSlot.map((spiel) => (
                          <TableRow key={spiel.id} className="border-gray-100 hover:bg-orange-50">
                            <TableCell className="py-4">
                              {getStatusBadge(spiel)}
                            </TableCell>
                            <TableCell className="font-medium">
                              <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                                <MapPin className="w-3 h-3 mr-1 inline" />
                                {spiel.feld}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-900">{spiel.team1}</span>
                                <span className="text-gray-400">vs</span>
                                <span className="text-gray-900">{spiel.team2}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded-full">
                                {spiel.kategorie}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {spiel.ergebnis ? (
                                <span className="font-mono font-semibold text-gray-900">
                                  {spiel.ergebnis}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
