'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, 
  Heart, 
  Users, 
  CheckCircle, 
  Clock,
  ArrowLeft,
  Send
} from "lucide-react";

interface HelferBedarf {
  id: string;
  titel: string;
  beschreibung: string;
  datum: string;
  startzeit: string;
  endzeit: string;
  anzahlBenötigt: number;
  kategorie: 'getraenke' | 'kaffee_kuchen' | 'grill' | 'waffeln_suess' | 'aufbau' | 'sonstiges';
  aktiv: boolean;
  created_at: string;
}

interface HelferAnmeldung {
  name: string;
  email: string;
  telefon: string;
  bemerkung: string;
  helferBedarfId: string;
  kuchenspende?: string;
}

export default function HelferAnmeldungPage({ params }: { params: Promise<{ token: string }> }) {
  const [helferBedarf, setHelferBedarf] = useState<HelferBedarf[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [anmeldung, setAnmeldung] = useState<HelferAnmeldung>({
    name: '',
    email: '',
    telefon: '',
    bemerkung: '',
    helferBedarfId: '',
    kuchenspende: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>('');
  const [selectedBedarf, setSelectedBedarf] = useState<HelferBedarf | null>(null);
  const [bedarfAnmeldungen, setBedarfAnmeldungen] = useState<any[]>([]);
  const [showAnmeldungen, setShowAnmeldungen] = useState(false);
  const [alleAnmeldungen, setAlleAnmeldungen] = useState<any[]>([]);

  useEffect(() => {
    const initToken = async () => {
      const resolvedParams = await params;
      setToken(resolvedParams.token);
    };
    initToken();
  }, [params]);

  useEffect(() => {
    if (token) {
      // Add a small delay to ensure the component is fully mounted
      const timeoutId = setTimeout(() => {
        loadHelferBedarf();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [token]);

  const loadHelferBedarf = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      const response = await fetch(`/api/helfer/public/${token}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Ungültiger oder abgelaufener Link');
        } else {
          setError('Fehler beim Laden der Helfer-Positionen');
        }
        return;
      }
      
      const data = await response.json();
      setHelferBedarf(data.bedarf || []);
      
      // Lade alle Anmeldungen für alle Bedarfe
      await loadAlleAnmeldungen(data.bedarf || []);
    } catch (error) {
      console.error('Fehler beim Laden der Helfer-Daten:', error);
      setError('Fehler beim Laden der Daten. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const loadAlleAnmeldungen = async (bedarfe: HelferBedarf[]) => {
    try {
      const anmeldungenPromises = bedarfe.map(async (bedarf) => {
        const response = await fetch(`/api/helfer/public/${token}?bedarf=${bedarf.id}`);
        if (response.ok) {
          const data = await response.json();
          return {
            bedarfId: bedarf.id,
            anmeldungen: data.anmeldungen || []
          };
        }
        return { bedarfId: bedarf.id, anmeldungen: [] };
      });
      
      const alleAnmeldungenData = await Promise.all(anmeldungenPromises);
      const flattened = alleAnmeldungenData.reduce((acc: any[], curr) => {
        return [...acc, ...curr.anmeldungen.map((anm: any) => ({ ...anm, bedarfId: curr.bedarfId }))];
      }, []);
      
      setAlleAnmeldungen(flattened);
    } catch (error) {
      console.error('Fehler beim Laden aller Anmeldungen:', error);
    }
  };

  const submitAnmeldung = async () => {
    if (!anmeldung.name || !anmeldung.email || !anmeldung.helferBedarfId) {
      setError('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const response = await fetch(`/api/helfer/public/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(anmeldung),
      });
      
      if (!response.ok) {
        throw new Error('Fehler bei der Anmeldung');
      }
      
      setShowSuccess(true);
      setAnmeldung({
        name: '',
        email: '',
        telefon: '',
        bemerkung: '',
        helferBedarfId: '',
        kuchenspende: ''
      });
    } catch (error) {
      console.error('Fehler bei der Anmeldung:', error);
      setError('Fehler bei der Anmeldung. Bitte versuchen Sie es erneut.');
    } finally {
      setSubmitting(false);
    }
  };

  const generatePublicTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const isTimeInPublicRange = (time: string, startTime: string, endTime: string) => {
    const timeValue = parseInt(time.replace(':', ''));
    const startValue = parseInt(startTime.replace(':', ''));
    const endValue = parseInt(endTime.replace(':', ''));
    return timeValue >= startValue && timeValue < endValue;
  };

  const loadAnmeldungenForBedarf = async (bedarfId: string) => {
    try {
      const response = await fetch(`/api/helfer/public/${token}?bedarf=${bedarfId}`);
      if (response.ok) {
        const data = await response.json();
        setBedarfAnmeldungen(data.anmeldungen || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Anmeldungen:', error);
    }
  };

  const handleBedarfClick = async (bedarf: HelferBedarf) => {
    if (selectedBedarf?.id === bedarf.id && showAnmeldungen) {
      // Wenn bereits ausgewählt, schließe die Anzeige
      setShowAnmeldungen(false);
      setSelectedBedarf(null);
    } else {
      // Lade Anmeldungen für diese Position
      setSelectedBedarf(bedarf);
      await loadAnmeldungenForBedarf(bedarf.id);
      setShowAnmeldungen(true);
    }
    // Setze auch die Auswahl für das Anmeldeformular
    setAnmeldung(prev => ({ ...prev, helferBedarfId: bedarf.id }));
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(`${dateString}T12:00:00`);
      const weekday = date.toLocaleDateString('de-DE', { weekday: 'long' });
      const formattedDate = date.toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${formattedDate}`;
    } catch (error) {
      return 'Ungültiges Datum';
    }
  };

  const getCategoryIcon = (kategorie: string) => {
    switch (kategorie) {
      case 'getraenke': return '🥤';
      case 'kaffee_kuchen': return '☕';
      case 'grill': return '🍖';
      case 'waffeln_suess': return '🧇';
      case 'aufbau': return '🔧';
      default: return '📋';
    }
  };

  const getCategoryColor = (kategorie: string) => {
    switch (kategorie) {
      case 'getraenke': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'kaffee_kuchen': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'grill': return 'bg-red-100 text-red-600 border-red-200';
      case 'waffeln_suess': return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      case 'aufbau': return 'bg-green-100 text-green-600 border-green-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getAngemeldeteHelferForBedarf = (bedarfId: string) => {
    return alleAnmeldungen.filter(anmeldung => 
      anmeldung.helferBedarfId === bedarfId || anmeldung.bedarfId === bedarfId
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="p-6 bg-white rounded-xl shadow-lg mb-6 border border-gray-200">
            <div className="relative w-8 h-8 mx-auto">
              <div className="w-8 h-8 bg-orange-500 rounded-full animate-pulse"></div>
              <div className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full"></div>
              <div className="absolute top-2 left-2 w-4 h-4 bg-orange-500 rounded-full"></div>
            </div>
          </div>
          <p className="text-lg text-gray-700 mb-2 font-medium">Helfer-Positionen werden geladen...</p>
          <p className="text-sm text-gray-500">Einen Moment bitte</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="p-6 bg-white rounded-xl shadow-lg mb-6 border border-gray-200">
            <div className="relative w-12 h-12 mx-auto mb-4">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 bg-white rounded-full"></div>
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Fehler</h1>
            <p className="text-gray-600">{error}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              setError(null);
              loadHelferBedarf();
            }}
            className="border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="p-8 bg-white rounded-xl shadow-lg mb-6 border border-gray-200">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-6" />
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Vielen Dank!</h1>
            <p className="text-gray-600 mb-6">
              Ihre Helfer-Anmeldung wurde erfolgreich übermittelt. 
              Sie erhalten in Kürze eine Bestätigung per E-Mail.
            </p>
            <div className="flex items-center justify-center gap-2 text-orange-600 mb-6">
              <Heart className="h-5 w-5" />
              <span className="text-sm font-medium">Wir freuen uns auf Ihre Unterstützung!</span>
            </div>
          </div>
          <Button 
            onClick={() => {
              setShowSuccess(false);
              setAnmeldung({
                name: '',
                email: '',
                telefon: '',
                bemerkung: '',
                helferBedarfId: '',
                kuchenspende: ''
              });
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            Weitere Anmeldung
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative w-8 h-8">
                <div className="w-8 h-8 bg-orange-500 rounded-full"></div>
                <div className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full"></div>
                <div className="absolute top-2 left-2 w-4 h-4 bg-orange-500 rounded-full"></div>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Helfer-Anmeldung</h1>
            </div>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Unterstützen Sie unser Rasenturnier als freiwilliger Helfer! 
              Wählen Sie eine Position aus und melden Sie sich an.
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {helferBedarf.length === 0 ? (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-6">
                <Users className="h-12 w-12 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Keine Helfer-Positionen verfügbar</h2>
              <p className="text-gray-600">
                Aktuell sind keine Helfer-Positionen zur Anmeldung verfügbar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Helfer-Zeitplan Tabelle */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-6 border-b border-gray-100">
                <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-500" />
                  Helfer-Zeitplan
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Übersicht aller Helfer-Einsätze - klicken Sie auf eine Position, um sich anzumelden
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {/* Zeitplan-Tabelle */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 p-3 text-left font-semibold text-gray-700">
                          Zeit
                        </th>
                        {[...new Set(helferBedarf.map(b => b.datum))].sort().map(datum => (
                          <th key={datum} className="border border-gray-300 p-3 text-center font-semibold text-gray-700 min-w-[200px]">
                            {formatDate(datum)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {generatePublicTimeSlots().map(zeitslot => (
                        <tr key={zeitslot} className="hover:bg-gray-50">
                          <td className="border border-gray-300 p-3 font-medium text-gray-600 bg-gray-50">
                            {zeitslot}
                          </td>
                          {[...new Set(helferBedarf.map(b => b.datum))].sort().map(datum => (
                            <td 
                              key={`${datum}-${zeitslot}`} 
                              className="border border-gray-300 p-2 min-h-[80px] relative"
                            >
                              {helferBedarf
                                .filter(bedarf => 
                                  bedarf.datum === datum && 
                                  bedarf.aktiv &&
                                  isTimeInPublicRange(zeitslot, bedarf.startzeit, bedarf.endzeit)
                                )
                                .map(bedarf => (
                                  <div
                                    key={bedarf.id}
                                    onClick={() => handleBedarfClick(bedarf)}
                                    className={`
                                      mb-1 p-3 rounded-lg cursor-pointer border-l-4 shadow-sm transition-all duration-200
                                      ${anmeldung.helferBedarfId === bedarf.id 
                                        ? 'ring-2 ring-orange-400 bg-orange-50 border-orange-400' 
                                        : 'hover:shadow-md border-l-4'
                                      }
                                      ${bedarf.kategorie === 'getraenke' ? 'bg-blue-50 border-blue-400 text-blue-800 hover:bg-blue-100' :
                                        bedarf.kategorie === 'kaffee_kuchen' ? 'bg-orange-50 border-orange-400 text-orange-800 hover:bg-orange-100' :
                                        bedarf.kategorie === 'grill' ? 'bg-red-50 border-red-400 text-red-800 hover:bg-red-100' :
                                        bedarf.kategorie === 'waffeln_suess' ? 'bg-yellow-50 border-yellow-400 text-yellow-800 hover:bg-yellow-100' :
                                        bedarf.kategorie === 'aufbau' ? 'bg-green-50 border-green-400 text-green-800 hover:bg-green-100' :
                                        'bg-gray-50 border-gray-400 text-gray-800 hover:bg-gray-100'}
                                    `}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-semibold text-sm">
                                        {bedarf.kategorie === 'getraenke' && '🥤'} 
                                        {bedarf.kategorie === 'kaffee_kuchen' && '☕'} 
                                        {bedarf.kategorie === 'grill' && '🍖'} 
                                        {bedarf.kategorie === 'waffeln_suess' && '🧇'} 
                                        {bedarf.kategorie === 'aufbau' && '🔧'} 
                                        {bedarf.kategorie === 'sonstiges' && '📋'} 
                                        {bedarf.titel}
                                      </span>
                                      <Badge 
                                        variant="outline" 
                                        className="text-xs"
                                      >
                                        {bedarf.kategorie}
                                      </Badge>
                                    </div>
                                    <p className="text-xs opacity-75 mb-2">{bedarf.beschreibung}</p>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {bedarf.startzeit} - {bedarf.endzeit}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {bedarf.anzahlBenötigt} benötigt
                                      </span>
                                    </div>
                                    {/* Angemeldete Helfer anzeigen */}
                                    {getAngemeldeteHelferForBedarf(bedarf.id).length > 0 && (
                                      <div className="mt-2 pt-2 border-t border-opacity-20 border-current">
                                        <div className="text-xs opacity-90">
                                          <strong>Bereits angemeldet:</strong>
                                        </div>
                                        <div className="text-xs opacity-80 mt-1">
                                          {getAngemeldeteHelferForBedarf(bedarf.id)
                                            .map(helper => helper.name.split(' ').pop()) // Nur Nachname
                                            .slice(0, 3) // Maximal 3 Namen anzeigen
                                            .join(', ')}
                                          {getAngemeldeteHelferForBedarf(bedarf.id).length > 3 && 
                                            ` und ${getAngemeldeteHelferForBedarf(bedarf.id).length - 3} weitere`
                                          }
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))
                              }
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Legende */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-3">Kategorien:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🥤</span>
                      <span className="text-sm text-slate-600">Getränke</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">☕</span>
                      <span className="text-sm text-slate-600">Kaffee & Kuchen</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">�</span>
                      <span className="text-sm text-slate-600">Grill</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🧇</span>
                      <span className="text-sm text-slate-600">Waffeln & Süß</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔧</span>
                      <span className="text-sm text-gray-600">Aufbau</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📋</span>
                      <span className="text-sm text-gray-600">Sonstiges</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Angemeldete Helfer für ausgewählte Position */}
            {showAnmeldungen && selectedBedarf && (
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="pb-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        selectedBedarf.kategorie === 'getraenke' ? 'bg-blue-100 text-blue-600' :
                        selectedBedarf.kategorie === 'kaffee_kuchen' ? 'bg-orange-100 text-orange-600' :
                        selectedBedarf.kategorie === 'grill' ? 'bg-red-100 text-red-600' :
                        selectedBedarf.kategorie === 'waffeln_suess' ? 'bg-yellow-100 text-yellow-600' :
                        selectedBedarf.kategorie === 'aufbau' ? 'bg-green-100 text-green-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {selectedBedarf.kategorie === 'getraenke' && '🥤'}
                        {selectedBedarf.kategorie === 'kaffee_kuchen' && '☕'}
                        {selectedBedarf.kategorie === 'grill' && '🍖'}
                        {selectedBedarf.kategorie === 'waffeln_suess' && '🧇'}
                        {selectedBedarf.kategorie === 'aufbau' && '🔧'}
                        {selectedBedarf.kategorie === 'sonstiges' && '📋'}
                      </div>
                      <div>
                        <CardTitle className="text-xl text-gray-800">
                          Anmeldungen für "{selectedBedarf.titel}"
                        </CardTitle>
                        <CardDescription className="text-gray-600">
                          {formatDate(selectedBedarf.datum)} | {selectedBedarf.startzeit} - {selectedBedarf.endzeit}
                        </CardDescription>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAnmeldungen(false)}
                      size="sm"
                    >
                      ×
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <Users className="h-5 w-5 text-slate-600" />
                        <div>
                          <p className="font-medium text-slate-800">
                            {bedarfAnmeldungen.length} von {selectedBedarf.anzahlBenötigt} Plätzen belegt
                          </p>
                          <p className="text-sm text-slate-600">
                            {selectedBedarf.anzahlBenötigt - bedarfAnmeldungen.length > 0 
                              ? `Noch ${selectedBedarf.anzahlBenötigt - bedarfAnmeldungen.length} Helfer benötigt`
                              : 'Alle Plätze sind belegt'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                          <span className="text-lg font-bold text-slate-600">
                            {Math.round((bedarfAnmeldungen.length / selectedBedarf.anzahlBenötigt) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {bedarfAnmeldungen.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="p-4 bg-slate-100 rounded-full w-fit mx-auto mb-4">
                          <Users className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="text-slate-600 mb-2">Noch keine Anmeldungen</p>
                        <p className="text-sm text-slate-500">
                          Seien Sie der/die Erste und melden Sie sich jetzt an!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <h4 className="font-medium text-slate-800 mb-3">Angemeldete Helfer:</h4>
                        {bedarfAnmeldungen.map((anmeldung, index) => (
                          <div key={anmeldung.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-emerald-700">
                                {index + 1}
                              </span>
                            </div>
                            <div className="flex-1">
                              {/* Nur Nachname anzeigen, Vorname verschwommen */}
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-800">
                                  {anmeldung.name.split(' ').pop()} {/* Nur Nachname */}
                                </p>
                                <span className="text-xs text-slate-400 px-2 py-1 bg-slate-200 rounded">
                                  {anmeldung.name.split(' ').slice(0, -1).map(() => '•••').join(' ')} {/* Verschwommter Vorname */}
                                </span>
                              </div>
                              {/* E-Mail verschwommen */}
                              <p className="text-sm text-slate-400">
                                {'•••@' + anmeldung.email.split('@')[1]} {/* Verschwommte E-Mail */}
                              </p>
                              {anmeldung.telefon && (
                                <p className="text-sm text-slate-500">{anmeldung.telefon}</p>
                              )}
                              {anmeldung.bemerkung && (
                                <p className="text-sm text-slate-500 italic mt-1">"{anmeldung.bemerkung}"</p>
                              )}
                            </div>
                            <Badge 
                              variant={anmeldung.status === 'bestätigt' ? 'default' : 'secondary'}
                              className={
                                anmeldung.status === 'bestätigt' 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : anmeldung.status === 'abgesagt'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-blue-100 text-blue-700'
                              }
                            >
                              {anmeldung.status === 'angemeldet' && 'Angemeldet'}
                              {anmeldung.status === 'bestätigt' && 'Bestätigt'}
                              {anmeldung.status === 'abgesagt' && 'Abgesagt'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Anmeldeformular */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-6 border-b border-gray-100">
                <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
                  <Send className="h-5 w-5 text-orange-500" />
                  Anmeldung
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Geben Sie Ihre Kontaktdaten ein und melden Sie sich als Helfer an
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name" className="text-gray-700 font-medium text-sm">
                      Name *
                    </Label>
                    <Input
                      id="name"
                      value={anmeldung.name}
                      onChange={(e) => setAnmeldung(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ihr vollständiger Name"
                      className="mt-1 bg-white border-gray-300 text-gray-700 focus:border-orange-400 focus:ring-orange-400/20"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-gray-700 font-medium text-sm">
                      E-Mail *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={anmeldung.email}
                      onChange={(e) => setAnmeldung(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="ihre.email@domain.de"
                      className="mt-1 bg-white border-gray-300 text-gray-700 focus:border-orange-400 focus:ring-orange-400/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="telefon" className="text-gray-700 font-medium text-sm">
                    Telefon (optional)
                  </Label>
                  <Input
                    id="telefon"
                    type="tel"
                    value={anmeldung.telefon}
                    onChange={(e) => setAnmeldung(prev => ({ ...prev, telefon: e.target.value }))}
                    placeholder="Ihre Telefonnummer"
                    className="mt-1 bg-white border-gray-300 text-gray-700 focus:border-orange-400 focus:ring-orange-400/20"
                  />
                </div>

                <div>
                  <Label htmlFor="kuchenspende" className="text-gray-700 font-medium text-sm">
                    Kuchenspende (optional)
                  </Label>
                  <Input
                    id="kuchenspende"
                    value={anmeldung.kuchenspende || ''}
                    onChange={(e) => setAnmeldung(prev => ({ ...prev, kuchenspende: e.target.value }))}
                    placeholder="z.B. Apfelkuchen, Streuselkuchen, Muffins..."
                    className="mt-1 bg-white border-gray-300 text-gray-700 focus:border-orange-400 focus:ring-orange-400/20"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Falls Sie einen Kuchen mitbringen möchten, geben Sie hier an, welchen Kuchen Sie mitbringen.
                  </p>
                </div>

                <div>
                  <Label htmlFor="bemerkung" className="text-gray-700 font-medium text-sm">
                    Bemerkung (optional)
                  </Label>
                  <Textarea
                    id="bemerkung"
                    value={anmeldung.bemerkung}
                    onChange={(e) => setAnmeldung(prev => ({ ...prev, bemerkung: e.target.value }))}
                    placeholder="Besondere Hinweise oder Fragen..."
                    className="mt-1 bg-white border-gray-300 text-gray-700 focus:border-orange-400 focus:ring-orange-400/20"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={submitAnmeldung}
                    disabled={submitting || !anmeldung.name || !anmeldung.email || !anmeldung.helferBedarfId}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-8 py-2 transition-all duration-200"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Anmeldung wird gesendet...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Jetzt anmelden
                      </span>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
