'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Settings, Info } from "lucide-react";
import Link from "next/link";
import { CookieManager, CookieConsent } from "@/lib/cookie-manager";

interface CookieBannerProps {
  onAcceptAll?: () => void;
  onRejectOptional?: () => void;
  onSettings?: (consent: CookieConsent) => void;
}

export default function CookieBanner({ onAcceptAll, onRejectOptional, onSettings }: CookieBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [functionalCookies, setFunctionalCookies] = useState(false);

  useEffect(() => {
    // Prüfen ob Cookie-Einwilligung bereits gegeben wurde
    const consent = CookieManager.getConsent();
    if (!consent) {
      // Banner nach kurzer Verzögerung anzeigen
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    } else {
      // Wenn bereits Einwilligung vorliegt, funktionale Cookies-Status setzen
      setFunctionalCookies(consent.functional);
    }
  }, []);

  const handleAcceptAll = () => {
    // Alle Cookies akzeptieren
    CookieManager.setConsent(true, true);
    setIsVisible(false);
    onAcceptAll?.();
    
    // Demonstriere das Setzen funktionaler Cookies
    CookieManager.setCookie('svp_user_preferences', 'demo_value', 30, 'functional');
    CookieManager.setLocalStorage('svp_ui_preferences', JSON.stringify({
      theme: 'light',
      language: 'de'
    }), 'functional');
  };

  const handleRejectOptional = () => {
    // Nur notwendige Cookies akzeptieren
    CookieManager.setConsent(true, false);
    setIsVisible(false);
    onRejectOptional?.();
  };

  const handleSaveSettings = () => {
    // Cookie-Einstellungen speichern
    CookieManager.setConsent(true, functionalCookies);
    const consent = CookieManager.getConsent();
    setIsVisible(false);
    setShowSettings(false);
    
    if (consent) {
      onSettings?.(consent);
    }
    
    // Demonstriere funktionale Cookies falls aktiviert
    if (functionalCookies) {
      CookieManager.setCookie('svp_user_preferences', 'custom_value', 30, 'functional');
      CookieManager.setLocalStorage('svp_ui_preferences', JSON.stringify({
        theme: 'light',
        language: 'de',
        customSettings: true
      }), 'functional');
    }
  };

  const handleShowSettings = () => {
    setShowSettings(true);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
      <div className="bg-card text-card-foreground max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border shadow-xs">
        {!showSettings ? (
          // Haupt-Cookie-Banner
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Cookie-Einstellungen</h3>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-muted-foreground mb-4">
                Wir verwenden Cookies, um Ihnen die bestmögliche Nutzung unserer Turnier-Website zu ermöglichen. 
                Einige Cookies sind technisch notwendig, andere helfen uns, die Website zu verbessern.
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                <strong>Keine Sorge:</strong> Wir verwenden keine Tracking- oder Werbe-Cookies. 
                Ihre Privatsphäre ist uns wichtig.
              </p>
              <div className="rounded-lg border bg-muted/40 p-4">
                <h4 className="font-medium text-foreground mb-2">Was wir verwenden:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ <strong>Notwendige Cookies:</strong> Für Anmeldungen und Sicherheit</li>
                  <li>✓ <strong>Funktionale Cookies:</strong> Für bessere Bedienbarkeit (optional)</li>
                  <li>✗ <strong>Tracking-Cookies:</strong> Verwenden wir nicht</li>
                  <li>✗ <strong>Werbe-Cookies:</strong> Verwenden wir nicht</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleAcceptAll}
                className="flex-1"
              >
                Alle akzeptieren
              </Button>
              <Button
                onClick={handleRejectOptional}
                variant="outline"
                className="flex-1"
              >
                Nur notwendige
              </Button>
              <Button
                onClick={handleShowSettings}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Einstellungen
              </Button>
            </div>

            <div className="mt-4 text-center">
              <Link 
                href="/cookie-richtlinie"
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                Mehr Informationen in unserer Cookie-Richtlinie
              </Link>
            </div>
          </div>
        ) : (
          // Detaillierte Einstellungen
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Cookie-Einstellungen anpassen</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Notwendige Cookies */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-foreground">Notwendige Cookies</h4>
                  <span className="rounded bg-secondary px-2 py-1 text-sm text-secondary-foreground">
                    Immer aktiv
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Diese Cookies sind für das Funktionieren der Website erforderlich und können 
                  nicht deaktiviert werden. Sie ermöglichen grundlegende Funktionen wie 
                  Anmeldungen und Sicherheit.
                </p>
                <details className="text-sm text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">
                    Details anzeigen
                  </summary>
                  <ul className="mt-2 space-y-1 ml-4">
                    <li>• Session-Management für Anmeldungen</li>
                    <li>• CSRF-Schutz gegen Angriffe</li>
                    <li>• Cookie-Einstellungen speichern</li>
                  </ul>
                </details>
              </div>

              {/* Funktionale Cookies */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-foreground">Funktionale Cookies</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={functionalCookies}
                      onChange={(e) => setFunctionalCookies(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:bg-background after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/20"></div>
                  </label>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Diese Cookies verbessern die Benutzerfreundlichkeit, indem sie Ihre 
                  Einstellungen speichern und die Navigation erleichtern.
                </p>
                <details className="text-sm text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">
                    Details anzeigen
                  </summary>
                  <ul className="mt-2 space-y-1 ml-4">
                    <li>• Zwischenspeicherung von Formulardaten</li>
                    <li>• Bevorzugte Sprach-Einstellungen</li>
                    <li>• Design-Präferenzen (Hell/Dunkel-Modus)</li>
                  </ul>
                </details>
              </div>

              {/* Datenschutz-Hinweis */}
              <div className="rounded-lg border bg-muted/40 p-4">
                <h4 className="font-medium text-foreground mb-2">Ihr Datenschutz ist uns wichtig</h4>
                <p className="text-sm text-muted-foreground">
                  Wir verwenden keine Tracking-, Analyse- oder Werbe-Cookies. Alle Daten 
                  bleiben lokal und werden nicht an Dritte weitergegeben.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button
                onClick={handleSaveSettings}
                className="flex-1"
              >
                Einstellungen speichern
              </Button>
              <Button
                onClick={() => setShowSettings(false)}
                variant="outline"
                className="border"
              >
                Zurück
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
