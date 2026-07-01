'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 sm:p-5">
      <div className="pointer-events-auto w-full max-w-xl overflow-hidden rounded-[8px] border border-zinc-200/80 bg-white/95 text-zinc-950 shadow-[0_18px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl">
        {!showSettings ? (
          <div className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-[#d9dec8] bg-[#f6f7f1]">
                <ShieldCheck className="size-4 text-[#5e6d35]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold leading-5 text-zinc-950">Cookies</h3>
                    <p className="mt-1 text-xs leading-5 text-zinc-600">
                      Wir nutzen notwendige Cookies für Sicherheit und optional funktionale Cookies für eine bessere Bedienung.
                      Kein Tracking, keine Werbung.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsVisible(false)}
                    aria-label="Cookie-Banner schließen"
                    className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a9868]/35"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-zinc-600">
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1">Notwendig aktiv</span>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1">Funktional optional</span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Button
                onClick={handleAcceptAll}
                size="sm"
                className="h-9 bg-[#5e6d35] text-white hover:bg-[#4f5d2f]"
              >
                Alle akzeptieren
              </Button>
              <Button
                onClick={handleRejectOptional}
                variant="outline"
                size="sm"
                className="h-9 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              >
                Nur notwendige
              </Button>
              <Button
                onClick={handleShowSettings}
                variant="outline"
                size="sm"
                className="h-9 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              >
                <SlidersHorizontal className="size-4" />
                Einstellungen
              </Button>
            </div>

            <div className="mt-3 text-center sm:text-left">
              <Link 
                href="/cookie-richtlinie"
                className="text-xs text-zinc-500 underline-offset-4 transition hover:text-zinc-800 hover:underline"
              >
                Cookie-Richtlinie
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  aria-label="Zurück"
                  className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a9868]/35"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <div>
                  <h3 className="text-sm font-semibold leading-5 text-zinc-950">Cookie-Einstellungen</h3>
                  <p className="mt-0.5 text-xs text-zinc-500">Nur funktionale Cookies sind optional.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVisible(false)}
                aria-label="Cookie-Banner schließen"
                className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a9868]/35"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid gap-2">
              <div className="rounded-[8px] border border-zinc-200 bg-zinc-50/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-medium text-zinc-950">Notwendige Cookies</h4>
                    <p className="mt-1 text-xs leading-5 text-zinc-600">Login, Sicherheit und gespeicherte Einwilligung.</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#d9dec8] bg-white px-2.5 py-1 text-[11px] font-medium text-[#5e6d35]">
                    Aktiv
                  </span>
                </div>
              </div>

              <div className="rounded-[8px] border border-zinc-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-medium text-zinc-950">Funktionale Cookies</h4>
                    <p className="mt-1 text-xs leading-5 text-zinc-600">Merken Bedien- und UI-Einstellungen lokal.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={functionalCookies}
                      onChange={(e) => setFunctionalCookies(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-zinc-200 transition after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-200 after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-[#5e6d35] peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#8a9868]/20"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
              <Button
                onClick={handleSaveSettings}
                size="sm"
                className="h-9 bg-[#5e6d35] text-white hover:bg-[#4f5d2f]"
              >
                Einstellungen speichern
              </Button>
              <Button
                onClick={() => setShowSettings(false)}
                variant="outline"
                size="sm"
                className="h-9 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
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
