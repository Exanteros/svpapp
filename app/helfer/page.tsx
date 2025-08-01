'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Heart, Calendar, Mail } from "lucide-react";
import Link from "next/link";

interface HelferPosition {
  id: string;
  titel: string;
  beschreibung: string;
  datum: string;
  startzeit: string;
  endzeit: string;
  anzahlBenötigt: number;
  kategorie: 'getraenke' | 'kaffee_kuchen' | 'grill' | 'waffeln_suess' | 'aufbau' | 'sonstiges';
  aktuelleAnmeldungen: number;
}

// Memoized category data to reduce memory allocation
const KATEGORIEN = [
  {
    id: 'getraenke',
    name: 'Getränke-Stand',
    icon: '🥤',
    beschreibung: 'Getränkeverkauf und -ausgabe',
    farbe: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  {
    id: 'kaffee_kuchen',
    name: 'Kaffee & Kuchen',
    icon: '☕',
    beschreibung: 'Kaffeestand und Kuchenverkauf',
    farbe: 'bg-orange-50 text-orange-700 border-orange-200'
  },
  {
    id: 'grill',
    name: 'Grill-Station',
    icon: '🍖',
    beschreibung: 'Grillstand und warme Speisen',
    farbe: 'bg-red-50 text-red-700 border-red-200'
  },
  {
    id: 'waffeln_suess',
    name: 'Waffeln & Süßes',
    icon: '🧇',
    beschreibung: 'Waffelstand und süße Leckereien',
    farbe: 'bg-yellow-50 text-yellow-700 border-yellow-200'
  },
  {
    id: 'aufbau',
    name: 'Auf- & Abbau',
    icon: '🔧',
    beschreibung: 'Unterstützung beim Turnieraufbau',
    farbe: 'bg-green-50 text-green-700 border-green-200'
  },
  {
    id: 'sonstiges',
    name: 'Sonstiges',
    icon: '📋',
    beschreibung: 'Weitere Hilfstätigkeiten',
    farbe: 'bg-gray-50 text-gray-700 border-gray-200'
  }
] as const;

export default function HelferAnmeldungMainPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<HelferPosition[]>([]);
  const [loading, setLoading] = useState(true);

  const kategorien: HelferKategorie[] = [
    {
      id: 'getraenke',
      name: 'Getränke-Stand',
      icon: '🥤',
      beschreibung: 'Getränkeverkauf und -ausgabe',
      farbe: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      id: 'kaffee_kuchen',
      name: 'Kaffee & Kuchen',
      icon: '☕',
      beschreibung: 'Kaffeestand und Kuchenverk auf',
      farbe: 'bg-orange-50 text-orange-700 border-orange-200'
    },
    {
      id: 'grill',
      name: 'Grill-Station',
      icon: '🍖',
      beschreibung: 'Grillstand und warme Speisen',
      farbe: 'bg-red-50 text-red-700 border-red-200'
    },
    {
      id: 'waffeln_suess',
      name: 'Waffeln & Süßes',
      icon: '🧇',
      beschreibung: 'Waffelstand und süße Leckereien',
      farbe: 'bg-yellow-50 text-yellow-700 border-yellow-200'
    },
    {
      id: 'aufbau',
      name: 'Auf- & Abbau',
      icon: '🔧',
      beschreibung: 'Unterstützung beim Turnieraufbau',
      farbe: 'bg-green-50 text-green-700 border-green-200'
    },
    {
      id: 'sonstiges',
      name: 'Sonstiges',
      icon: '📋',
      beschreibung: 'Weitere Hilfstätigkeiten',
      farbe: 'bg-gray-50 text-gray-700 border-gray-200'
    }
  ];

  useEffect(() => {
    loadHelferPositions();
  }, []);

  const loadHelferPositions = async () => {
    try {
      setLoading(true);
      // Hier würde normalerweise ein API-Call gemacht werden
      // Für jetzt verwenden wir Beispieldaten
      const beispielPositionen: HelferPosition[] = [
        {
          id: '1',
          titel: 'Getränkeverkauf',
          beschreibung: 'Verkauf von Getränken am Hauptstand',
          datum: '2025-07-05',
          startzeit: '13:00',
          endzeit: '17:00',
          anzahlBenötigt: 3,
          kategorie: 'getraenke',
          aktuelleAnmeldungen: 1
        },
        {
          id: '2',
          titel: 'Kaffeestand',
          beschreibung: 'Kaffee- und Kuchenverkauf',
          datum: '2025-07-05',
          startzeit: '14:00',
          endzeit: '16:00',
          anzahlBenötigt: 2,
          kategorie: 'kaffee_kuchen',
          aktuelleAnmeldungen: 0
        },
        {
          id: '3',
          titel: 'Turnieraufbau',
          beschreibung: 'Aufbau der Spielfelder und Stände',
          datum: '2025-07-05',
          startzeit: '09:00',
          endzeit: '12:00',
          anzahlBenötigt: 5,
          kategorie: 'aufbau',
          aktuelleAnmeldungen: 2
        }
      ];
      setPositions(beispielPositionen);
    } catch (error) {
      console.error('Fehler beim Laden der Helfer-Positionen:', error);
      setError('Fehler beim Laden der Helfer-Positionen');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Bitte geben Sie Ihre E-Mail-Adresse ein');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/helfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        setShowSuccess(true);
        setEmail("");
      } else {
        setError(result.error || 'Fehler beim Versenden der E-Mail');
      }
    } catch (error) {
      console.error('Fehler beim Versenden:', error);
      setError('Fehler beim Versenden der E-Mail. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(`${dateString}T12:00:00`);
    const weekday = date.toLocaleDateString('de-DE', { weekday: 'long' });
    const formattedDate = date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${formattedDate}`;
  };

  const getKategorieInfo = (kategorie: string) => {
    return kategorien.find(k => k.id === kategorie) || kategorien[kategorien.length - 1];
  };

  const getTotalHelferBenötigt = () => {
    return positions.reduce((total, pos) => total + pos.anzahlBenötigt, 0);
  };

  const getTotalHelferAngemeldet = () => {
    return positions.reduce((total, pos) => total + pos.aktuelleAnmeldungen, 0);
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5" />
                Zurück
              </Link>
              <div className="flex items-center gap-3">
                {/* Handball Ball Icon */}
                <div className="relative w-8 h-8">
                  <div className="w-8 h-8 bg-orange-500 rounded-full"></div>
                  <div className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full"></div>
                  <div className="absolute top-2 left-2 w-4 h-4 bg-orange-500 rounded-full"></div>
                </div>
                <h1 className="text-xl font-bold text-gray-900">Helfer-Anmeldung</h1>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="mb-8">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                  <Heart className="h-8 w-8 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Vielen Dank!</h2>
              <p className="text-gray-600 mb-6">
                Wir haben Ihnen einen personalisierten Anmelde-Link per E-Mail gesendet. 
                Bitte überprüfen Sie Ihr Postfach und folgen Sie dem Link, um sich für 
                Ihre gewünschten Helfer-Positionen anzumelden.
              </p>
              <div className="flex items-center justify-center gap-2 text-orange-600 mb-6">
                <Mail className="h-5 w-5" />
                <span className="text-sm font-medium">E-Mail versendet an: {email}</span>
              </div>
            </div>
            <Button 
              onClick={() => {
                setShowSuccess(false);
                setEmail("");
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Weitere E-Mail senden
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
              Zurück
            </Link>
            <div className="flex items-center gap-3">
              {/* Handball Ball Icon */}
              <div className="relative w-8 h-8">
                <div className="w-8 h-8 bg-orange-500 rounded-full"></div>
                <div className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full"></div>
                <div className="absolute top-2 left-2 w-4 h-4 bg-orange-500 rounded-full"></div>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Helfer-Anmeldung</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Sektion */}
          <div className="text-center mb-12">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
                <Users className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Werden Sie Helfer beim Rasenturnier 2025!
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Unterstützen Sie unser Rasenturnier als freiwilliger Helfer! 
              Wählen Sie eine Position aus und melden Sie sich an.
            </p>
          </div>

          {/* Turnierinfo */}
          <Card className="mb-8 bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-500" />
                Turniertermine
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-2">Samstag, 5. Juli 2025</h4>
                  <p className="text-orange-800 text-sm mb-2">13:00 - 17:00 Uhr</p>
                  <ul className="text-orange-700 text-sm space-y-1">
                    <li>• Mini-Kategorien (3, 2, 1)</li>
                    <li>• E-Jugend (weiblich, gemischt, männlich)</li>
                  </ul>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-2">Sonntag, 6. Juli 2025</h4>
                  <p className="text-orange-800 text-sm mb-2">10:00 - 17:00 Uhr</p>
                  <ul className="text-orange-700 text-sm space-y-1">
                    <li>• D-Jugend, C-Jugend</li>
                    <li>• B-Jugend, A-Jugend</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Helfer-Statistik */}
          {!loading && (
            <Card className="mb-8 bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-500" />
                  Helfer-Bedarf
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-2xl font-bold text-orange-600">{getTotalHelferBenötigt()}</div>
                    <div className="text-sm text-orange-700">Helfer benötigt</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{getTotalHelferAngemeldet()}</div>
                    <div className="text-sm text-green-700">Bereits angemeldet</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-gray-600">{getTotalHelferBenötigt() - getTotalHelferAngemeldet()}</div>
                    <div className="text-sm text-gray-700">Noch gesucht</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Helfer-Kategorien */}
          <Card className="mb-8 bg-white border border-gray-200">
            <CardHeader>
              <CardTitle>Helfer-Bereiche</CardTitle>
              <CardDescription>Verschiedene Einsatzbereiche beim Turnier</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {kategorien.map((kategorie) => (
                  <div
                    key={kategorie.id}
                    className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${kategorie.farbe}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{kategorie.icon}</span>
                      <h4 className="font-semibold">{kategorie.name}</h4>
                    </div>
                    <p className="text-sm opacity-80">{kategorie.beschreibung}</p>
                    {positions.filter(p => p.kategorie === kategorie.id).length > 0 && (
                      <div className="mt-3 pt-2 border-t border-current border-opacity-20">
                        <div className="text-xs opacity-90">
                          {positions.filter(p => p.kategorie === kategorie.id).length} Position(en) verfügbar
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Anmeldeformular */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-orange-500" />
                Anmelde-Link anfordern
              </CardTitle>
              <CardDescription>
                Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen personalisierten 
                Link zum Anmelden für Ihre gewünschten Helfer-Positionen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">E-Mail-Adresse *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ihre.email@domain.de"
                    className="mt-1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Sie erhalten einen personalisierten Link, über den Sie sich für 
                    verschiedene Helfer-Positionen anmelden können.
                  </p>
                </div>

                <div className="flex justify-center pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Wird gesendet...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Anmelde-Link anfordern
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Warum helfen */}
          <Card className="mt-8 bg-orange-50 border border-orange-200">
            <CardContent className="p-6">
              <div className="text-center">
                <Heart className="h-8 w-8 text-orange-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-orange-900 mb-3">
                  Warum als Helfer unterstützen?
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-orange-800">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-orange-600" />
                    <span>Teil der Turnier-Gemeinschaft werden</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-orange-600" />
                    <span>Den Handball-Nachwuchs fördern</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-orange-600" />
                    <span>Neue Kontakte knüpfen</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
