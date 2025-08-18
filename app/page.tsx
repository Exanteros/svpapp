'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Trophy, Users, Settings, UserPlus, Menu, X, Heart } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import CookieBanner from "@/components/CookieBanner";
import { useCookieConsent } from "@/hooks/use-cookie-consent";

interface TurnierEinstellungen {
  turnierStartDatum: string;
  turnierEndDatum: string;
  samstagStartzeit: string;
  samstagEndzeit: string;
  sonntagStartzeit: string;
  sonntagEndzeit: string;
}

function getWeekdayName(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    weekday: 'long'
  });
}

function formatDateLong(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function formatTimeDisplay(startzeit: string, endzeit: string): string {
  return `${startzeit} - ${endzeit} Uhr`;
}

export default function HomePage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [turnierEinstellungen, setTurnierEinstellungen] = useState<TurnierEinstellungen>({
    turnierStartDatum: '2025-07-05',
    turnierEndDatum: '2025-07-06', 
    samstagStartzeit: '13:00',
    samstagEndzeit: '17:00',
    sonntagStartzeit: '10:00',
    sonntagEndzeit: '17:00'
  });

  // Cookie-Consent Hook
  const { hasConsent, functionalAllowed, setCookie, setStorage } = useCookieConsent();

  // Body Click Handler für Mobile Menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileMenuOpen && !(event.target as Element).closest('header')) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      document.body.style.overflow = 'hidden'; // Verhindert Scrollen im Hintergrund
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    async function loadTurnierEinstellungen() {
      try {
        const response = await fetch('/api/public/turnier-einstellungen');
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setTurnierEinstellungen(data);
            
            // Funktionale Cookies: Turnier-Einstellungen für bessere Performance cachen
            if (functionalAllowed) {
              setStorage('svp_turnier_cache', JSON.stringify({
                data,
                timestamp: new Date().toISOString(),
                ttl: 1000 * 60 * 60 // 1 Stunde
              }), 'functional');
            }
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden der Turnier-Einstellungen:', error);
      }
    }
    
    // Prüfen ob gecachte Daten verwendet werden können (nur wenn funktionale Cookies erlaubt)
    if (functionalAllowed) {
      try {
        const cached = localStorage.getItem('svp_turnier_cache');
        if (cached) {
          const { data, timestamp, ttl } = JSON.parse(cached);
          const age = new Date().getTime() - new Date(timestamp).getTime();
          
          if (age < ttl) {
            setTurnierEinstellungen(data);
            return; // Verwende Cache, lade nicht neu
          }
        }
      } catch (error) {
        console.error('Fehler beim Lesen des Turnier-Cache:', error);
      }
    }
    
    loadTurnierEinstellungen();
  }, [functionalAllowed, setStorage]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
            {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              {/* Handball Ball Icon */}
              <div className="relative w-8 h-8">
                <div className="w-8 h-8 bg-orange-500 rounded-full"></div>
                <div className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full opacity-30"></div>
              </div>
              <h1 className="text-xl font-bold text-gray-900">SV Puschendorf</h1>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/spielplan" className="text-gray-700 hover:text-orange-600 font-medium transition-colors">
                Spielplan
              </Link>
              <Link href="/ergebnisse" className="text-gray-700 hover:text-orange-600 font-medium transition-colors">
                Ergebnisse
              </Link>
              <Link href="/anmeldung">
                <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2">
                  Anmeldung
                </Button>
              </Link>
              <Link href="/admin" className="text-gray-600 hover:text-orange-600 transition-colors" title="Admin">
                <Settings className="h-6 w-6" />
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-orange-600 hover:bg-gray-100 transition-colors"
              aria-label="Menü öffnen"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
            <nav className="container mx-auto px-4 py-4 space-y-3">
              <Link 
                href="/spielplan" 
                className="block py-3 px-4 text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5" />
                  Spielplan
                </div>
              </Link>
              <Link 
                href="/ergebnisse" 
                className="block py-3 px-4 text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5" />
                  Ergebnisse
                </div>
              </Link>
              <Link 
                href="/anmeldung" 
                className="block"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg">
                  <div className="flex items-center gap-3 justify-center">
                    <UserPlus className="h-5 w-5" />
                    Anmeldung
                  </div>
                </Button>
              </Link>
              <Link 
                href="/admin" 
                className="block py-3 px-4 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5" />
                  Admin
                </div>
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
            {/* Hero Section */}
            {/* Hero Section */}
      <section className="bg-gradient-to-b from-orange-50 to-white py-12 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-6 sm:mb-8">
              {/* Large Handball Ball Icon */}
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24">
                <div className="w-full h-full bg-orange-500 rounded-full"></div>
                <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 lg:top-3 lg:left-3 w-12 h-12 sm:w-15 sm:h-15 lg:w-18 lg:h-18 bg-white rounded-full opacity-30"></div>
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
              Handball-Turnier 2025
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 sm:mb-12 px-4 max-w-3xl mx-auto">
              Willkommen zum großen Handball-Turnier des SV Puschendorf. 
              Melde dein Team an und erlebe spannende Spiele in verschiedenen Kategorien.
            </p>
          
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8 sm:mb-12 px-4">
              <Link href="/anmeldung" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white px-6 sm:px-8 py-3 text-base sm:text-lg font-medium">
                  Team anmelden
                </Button>
              </Link>
              <Link href="/spielplan" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto border-gray-300 text-gray-700 px-6 sm:px-8 py-3 text-base sm:text-lg font-medium hover:bg-gray-50">
                  Spielplan ansehen
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tournament Schedule */}
      <section className="bg-gray-50 py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12 text-gray-900">Turnierplan</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              
              {/* Day 1 */}
              <div className="bg-white rounded-lg p-6 sm:p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-3 h-3 bg-orange-500 rounded-full flex-shrink-0"></div>
                  <h4 className="text-lg sm:text-xl font-bold text-gray-900 break-words">
                    {formatDateLong(turnierEinstellungen.turnierStartDatum)}
                  </h4>
                </div>
                <div className="mb-4 sm:mb-6">
                  <div className="text-base sm:text-lg font-medium text-orange-600 mb-2 break-words">
                    {formatTimeDisplay(turnierEinstellungen.samstagStartzeit, turnierEinstellungen.samstagEndzeit)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-gray-700">
                    <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0 mt-2"></div>
                    <span className="text-sm sm:text-base">Mini-Kategorien (3, 2, 1)</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-700">
                    <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0 mt-2"></div>
                    <span className="text-sm sm:text-base">E-Jugend (weiblich, gemischt, männlich)</span>
                  </div>
                </div>
              </div>

              {/* Day 2 */}
              <div className="bg-white rounded-lg p-6 sm:p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-3 h-3 bg-orange-500 rounded-full flex-shrink-0"></div>
                  <h4 className="text-lg sm:text-xl font-bold text-gray-900 break-words">
                    {formatDateLong(turnierEinstellungen.turnierEndDatum)}
                  </h4>
                </div>
                <div className="mb-4 sm:mb-6">
                  <div className="text-base sm:text-lg font-medium text-orange-600 mb-2 break-words">
                    {formatTimeDisplay(turnierEinstellungen.sonntagStartzeit, '14:00')} & {formatTimeDisplay('13:00', turnierEinstellungen.sonntagEndzeit)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-gray-700">
                    <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0 mt-2"></div>
                    <span className="text-sm sm:text-base">D-Jugend (weiblich, männlich)</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-700">
                    <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0 mt-2"></div>
                    <span className="text-sm sm:text-base">C-Jugend (weiblich, männlich)</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-700">
                    <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0 mt-2"></div>
                    <span className="text-sm sm:text-base">B-Jugend (weiblich, männlich)</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-700">
                    <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0 mt-2"></div>
                    <span className="text-sm sm:text-base">A-Jugend (weiblich, männlich)</span>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto text-center">
            <h3 className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-12 text-gray-900">Schnellzugriff</h3>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 max-w-4xl mx-auto">
              
              <Link href="/spielplan" className="group bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:-translate-y-1 w-full sm:w-60 flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-lg flex items-center justify-center mb-3 sm:mb-4 mx-auto group-hover:bg-orange-100 transition-colors">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Spielplan</h4>
                <p className="text-xs sm:text-sm text-gray-600">Aktuelle Spiele und Zeiten</p>
              </Link>

              <Link href="/ergebnisse" className="group bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:-translate-y-1 w-full sm:w-60 flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-lg flex items-center justify-center mb-3 sm:mb-4 mx-auto group-hover:bg-orange-100 transition-colors">
                  <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Ergebnisse</h4>
                <p className="text-xs sm:text-sm text-gray-600">Live-Ergebnisse verfolgen</p>
              </Link>

              <Link href="/anmeldung" className="group bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:-translate-y-1 w-full sm:w-60 flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-lg flex items-center justify-center mb-3 sm:mb-4 mx-auto group-hover:bg-orange-100 transition-colors">
                  <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Anmeldung</h4>
                <p className="text-xs sm:text-sm text-gray-600">Team anmelden</p>
              </Link>
              
            </div>
          </div>
        </div>
      </section>

      {/* Sponsors Section */}
      <section className="bg-gray-50 py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto text-center">
            <h3 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-900">Unsere Sponsoren</h3>
            <p className="text-lg text-gray-600 mb-8 sm:mb-12 max-w-3xl mx-auto">
              Wir danken unseren treuen Sponsoren für ihre Unterstützung. Ohne sie wäre dieses Turnier nicht möglich.
            </p>
            
            {/* Sponsor Logos Placeholder */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-12">
              {/* Placeholder for sponsor logos */}
              <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-100 flex items-center justify-center h-20 sm:h-24">
                <span className="text-gray-400 text-sm sm:text-base font-medium">Sponsor Logo</span>
              </div>
              <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-100 flex items-center justify-center h-20 sm:h-24">
                <span className="text-gray-400 text-sm sm:text-base font-medium">Sponsor Logo</span>
              </div>
              <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-100 flex items-center justify-center h-20 sm:h-24">
                <span className="text-gray-400 text-sm sm:text-base font-medium">Sponsor Logo</span>
              </div>
              <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-100 flex items-center justify-center h-20 sm:h-24">
                <span className="text-gray-400 text-sm sm:text-base font-medium">Sponsor Logo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            
            {/* Organization Info */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                {/* Handball Ball Icon */}
                <div className="relative w-8 h-8">
                  <div className="w-8 h-8 bg-orange-500 rounded-full"></div>
                  <div className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full opacity-30"></div>
                </div>
                <span className="font-bold text-lg">SV Puschendorf</span>
              </div>
              <p className="text-gray-300 text-sm mb-4">
                Ein Angebot der <strong>Contimore UG</strong><br />
                in Kooperation mit der Handballabteilung des
                <strong> Sportverein Puschendorf 1949 e.V.</strong>
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Navigation</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/spielplan" className="text-gray-300 hover:text-orange-400 transition-colors">
                    Spielplan
                  </Link>
                </li>
                <li>
                  <Link href="/ergebnisse" className="text-gray-300 hover:text-orange-400 transition-colors">
                    Ergebnisse
                  </Link>
                </li>
                <li>
                  <Link href="/anmeldung" className="text-gray-300 hover:text-orange-400 transition-colors">
                    Anmeldung
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-white mb-4">Kontakt</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  <span className="block">E-Mail:</span>
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      const email = 'die.goetzelmaenner' + '@' + 'gmail.com';
                      window.location.href = 'mailto:' + email;
                    }}
                    className="text-orange-400 hover:text-orange-300 transition-colors cursor-pointer"
                  >
                    die.goetzelmaenner [at] gmail [dot] com
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Documents */}
            <div>
              <h4 className="font-semibold text-white mb-4">Rechtliches</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/impressum" className="text-gray-300 hover:text-orange-400 transition-colors">
                    Impressum
                  </Link>
                </li>
                <li>
                  <Link href="/datenschutz" className="text-gray-300 hover:text-orange-400 transition-colors">
                    Datenschutzerklärung
                  </Link>
                </li>
                <li>
                  <Link href="/agb" className="text-gray-300 hover:text-orange-400 transition-colors">
                    AGB
                  </Link>
                </li>
                <li>
                  <Link href="/widerrufsrecht" className="text-gray-300 hover:text-orange-400 transition-colors">
                    Widerrufsrecht
                  </Link>
                </li>
                <li>
                  <Link href="/cookie-richtlinie" className="text-gray-300 hover:text-orange-400 transition-colors">
                    Cookie-Richtlinie
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-700 pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-gray-400 text-sm text-center sm:text-left">
                © 2025 Contimore UG (haftungsbeschränkt) & Sportverein Puschendorf 1949 e.V. Alle Rechte vorbehalten.
              </p>
              <div className="flex items-center gap-4 text-sm">
                <Link href="/impressum" className="text-gray-400 hover:text-orange-400 transition-colors">
                  Impressum
                </Link>
                <span className="text-gray-600">|</span>
                <Link href="/datenschutz" className="text-gray-400 hover:text-orange-400 transition-colors">
                  Datenschutz
                </Link>
                <span className="text-gray-600">|</span>
                <Link href="/agb" className="text-gray-400 hover:text-orange-400 transition-colors">
                  AGB
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Cookie Banner */}
      <CookieBanner 
        onAcceptAll={() => {
          console.log('Alle Cookies akzeptiert - funktionale Features aktiviert');
          // Hier könnten weitere funktionale Features aktiviert werden
        }}
        onRejectOptional={() => {
          console.log('Nur notwendige Cookies akzeptiert');
          // Cache und andere funktionale Daten löschen
          localStorage.removeItem('svp_turnier_cache');
        }}
        onSettings={(consent) => {
          console.log('Cookie-Einstellungen gespeichert:', consent);
          if (!consent.functional) {
            // Funktionale Daten löschen wenn abgewählt
            localStorage.removeItem('svp_turnier_cache');
          }
        }}
      />
    </div>
  );
}
