'use client';

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, MapPin, Trophy, Play, CheckCircle, Pause, AlertTriangle, RefreshCw } from "lucide-react";
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
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-8 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300 animate-spin" />
            <p className="text-gray-600">Lade Spielplan...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!spielplanData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-red-700">Fehler beim Laden des Spielplans</p>
            <Button onClick={loadSpielplan} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Erneut versuchen
            </Button>
          </CardContent>
        </Card>
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
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="h-8 w-8 text-blue-600" />
              Spielplan
            </h1>
            <p className="text-slate-600 mt-1">
              Aktuelle Zeit: {currentTime.toLocaleTimeString('de-DE')}
            </p>
          </div>
        </div>
        <Button onClick={loadSpielplan} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Aktualisieren
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-slate-700">Feld filtern:</label>
            <Select value={selectedField} onValueChange={setSelectedField}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Felder</SelectItem>
                {spielplanData.availableFields.map(field => (
                  <SelectItem key={field} value={field}>{field}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-slate-600">
              {filteredSpiele.length} Spiel(e) angezeigt
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs für Tage */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'samstag' | 'sonntag')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="samstag" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {getWeekdayName(spielplanData.samstag.datum)} ({formatDateShort(spielplanData.samstag.datum)})
          </TabsTrigger>
          <TabsTrigger value="sonntag" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {getWeekdayName(spielplanData.sonntag.datum)} ({formatDateShort(spielplanData.sonntag.datum)})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6 mt-6">
          {timeSlots.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Keine Spiele gefunden
                </h3>
                <p className="text-gray-500">
                  {selectedField === 'alle' 
                    ? 'Für diesen Tag sind keine Spiele geplant.'
                    : `Für ${selectedField} sind keine Spiele geplant.`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            timeSlots.map(zeitSlot => {
              const spieleInSlot = groupedByTime[zeitSlot];
              const laufendeSpiele = spieleInSlot.filter(s => getGameStatus(s) === 'laufend').length;
              const halbzeitSpiele = spieleInSlot.filter(s => getGameStatus(s) === 'halbzeit').length;
              
              return (
                <Card key={zeitSlot} className="border-slate-200">
                  <CardHeader className="pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        {formatTime(zeitSlot)} Uhr
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {laufendeSpiele > 0 && (
                          <Badge variant="default" className="bg-green-500 text-white">
                            {laufendeSpiele} läuft
                          </Badge>
                        )}
                        {halbzeitSpiele > 0 && (
                          <Badge variant="default" className="bg-yellow-500 text-white">
                            {halbzeitSpiele} Halbzeit
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-slate-600">
                          {spieleInSlot.length} Spiel(e)
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-100">
                          <TableHead className="w-24 text-slate-600">Status</TableHead>
                          <TableHead className="w-24 text-slate-600">Feld</TableHead>
                          <TableHead className="text-slate-600">Teams</TableHead>
                          <TableHead className="w-32 text-slate-600">Kategorie</TableHead>
                          <TableHead className="w-24 text-center text-slate-600">Ergebnis</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {spieleInSlot.map((spiel) => (
                          <TableRow key={spiel.id} className="border-slate-100 hover:bg-slate-50">
                            <TableCell className="py-4">
                              {getStatusBadge(spiel)}
                            </TableCell>
                            <TableCell className="font-medium">
                              <Badge variant="outline" className="border-blue-300 text-blue-700">
                                <MapPin className="w-3 h-3 mr-1" />
                                {spiel.feld}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-900">{spiel.team1}</span>
                                <span className="text-slate-400">vs</span>
                                <span className="text-slate-900">{spiel.team2}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                                {spiel.kategorie}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {spiel.ergebnis ? (
                                <span className="font-mono font-semibold text-slate-900">
                                  {spiel.ergebnis}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Live Dashboard Link */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Live Dashboard
          </h3>
          <p className="text-green-700 mb-4">
            Spiele live starten und verwalten
          </p>
          <Link href="/backend">
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              <Play className="h-4 w-4 mr-2" />
              Zum Live Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
