'use client';

import { useState, useEffect } from 'react';
import { useCookieConsent } from '@/hooks/use-cookie-consent';
import { Button } from '@/components/ui/button';

export default function CookieDemo() {
  const { hasConsent, functionalAllowed, setCookie, getCookie, setStorage } = useCookieConsent();
  const [demoValue, setDemoValue] = useState('');
  const [storedValue, setStoredValue] = useState<string | null>(null);

  useEffect(() => {
    // Gespeicherten Wert laden wenn funktionale Cookies erlaubt sind
    if (functionalAllowed) {
      const saved = getCookie('demo_preference');
      setStoredValue(saved);
    }
  }, [functionalAllowed, getCookie]);

  const handleSavePreference = () => {
    if (functionalAllowed) {
      const success = setCookie('demo_preference', demoValue, 30, 'functional');
      if (success) {
        setStoredValue(demoValue);
        alert('Einstellung gespeichert!');
      } else {
        alert('Fehler beim Speichern!');
      }
    } else {
      alert('Funktionale Cookies sind nicht aktiviert. Bitte aktivieren Sie diese in den Cookie-Einstellungen.');
    }
  };

  const handleSaveToStorage = () => {
    if (functionalAllowed) {
      const success = setStorage('demo_storage', JSON.stringify({
        value: demoValue,
        timestamp: new Date().toISOString()
      }), 'functional');
      
      if (success) {
        alert('In LocalStorage gespeichert!');
      } else {
        alert('Fehler beim Speichern in LocalStorage!');
      }
    } else {
      alert('Funktionale Cookies sind nicht aktiviert.');
    }
  };

  if (!hasConsent) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg">
        <p>Cookie-Demo wird geladen...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Cookie-System Demo</h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          <strong>Cookie-Status:</strong> {hasConsent ? 'Einwilligung vorhanden' : 'Keine Einwilligung'}
        </p>
        <p className="text-sm text-gray-600 mb-4">
          <strong>Funktionale Cookies:</strong> {functionalAllowed ? '✅ Aktiviert' : '❌ Deaktiviert'}
        </p>
      </div>

      {functionalAllowed && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Demo-Einstellung speichern:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={demoValue}
                onChange={(e) => setDemoValue(e.target.value)}
                placeholder="Wert eingeben..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <Button onClick={handleSavePreference} size="sm">
                Als Cookie speichern
              </Button>
              <Button onClick={handleSaveToStorage} variant="outline" size="sm">
                In Storage speichern
              </Button>
            </div>
          </div>

          {storedValue && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                <strong>Gespeicherter Wert:</strong> {storedValue}
              </p>
            </div>
          )}
        </div>
      )}

      {!functionalAllowed && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm text-amber-800">
            Funktionale Cookies sind deaktiviert. Aktivieren Sie diese in den Cookie-Einstellungen, 
            um Präferenzen zu speichern.
          </p>
        </div>
      )}
    </div>
  );
}
