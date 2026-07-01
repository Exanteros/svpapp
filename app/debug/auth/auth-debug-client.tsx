'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function AuthDebugClient() {
  const [apiKeyStatus, setApiKeyStatus] = useState<{
    localStorage: boolean;
    cookie: boolean;
    value?: string;
  }>({ localStorage: false, cookie: false });
  
  const [sessionStatus, setSessionStatus] = useState<{
    exists: boolean;
    value?: string;
  }>({ exists: false });
  
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Status prüfen
  useEffect(() => {
    checkAuthStatus();
  }, []);
  
  function checkAuthStatus() {
    // LocalStorage prüfen
    const localStorageKey = localStorage.getItem('svp-admin-key');
    
    // Cookie prüfen
    const cookies = document.cookie.split(';').map(cookie => cookie.trim());
    const apiKeyCookie = cookies.find(cookie => cookie.startsWith('svp-admin-key='));
    const apiKeyFromCookie = apiKeyCookie ? apiKeyCookie.split('=')[1] : null;
    
    // Session Token prüfen
    const sessionToken = localStorage.getItem('svp-session-token');
    
    setApiKeyStatus({
      localStorage: !!localStorageKey,
      cookie: !!apiKeyFromCookie,
      value: localStorageKey || apiKeyFromCookie || undefined,
    });
    
    setSessionStatus({
      exists: !!sessionToken,
      value: sessionToken?.substring(0, 8) + '...' || undefined,
    });
  }
  
  // Alle Auth-Daten löschen
  function clearAllAuth() {
    localStorage.removeItem('svp-admin-key');
    localStorage.removeItem('svp-session-token');
    sessionStorage.removeItem('svp-admin-key');
    sessionStorage.removeItem('svp-session-token');
    
    document.cookie = 'svp-admin-key=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;';
    document.cookie = 'svp-session-token=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;';
    
    // Status aktualisieren
    checkAuthStatus();
  }
  
  // Server-Debug-Info abrufen
  async function fetchDebugInfo() {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/auth');
      const data = await response.json();
      setDebugInfo(data);
    } catch (error) {
      console.error('Fehler beim Abrufen der Debug-Informationen:', error);
    }
    setLoading(false);
  }
  
  // API-Test durchführen
  async function testApiAccess() {
    setLoading(true);
    try {
      const response = await fetch('/api/helfer', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      alert(`API-Zugriff Status: ${response.status === 200 ? 'Erfolgreich' : 'Fehlgeschlagen'}`);
      console.log('API-Antwort:', data);
    } catch (error) {
      console.error('Fehler beim API-Test:', error);
      alert('API-Zugriff fehlgeschlagen: ' + (error as Error).message);
    }
    setLoading(false);
  }
  
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-normal">Authentifizierungs-Diagnose</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Entwicklungswerkzeug zur Diagnose lokaler Authentifizierungsprobleme.
        </p>
      </div>
      
      <Alert className="mb-6">
        <AlertTitle>Nur Entwicklungsmodus</AlertTitle>
        <AlertDescription>
          Diese Seite ist in Produktion nicht erreichbar.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">API-Key Status</h2>
          <ul className="mb-5 space-y-2 text-sm">
            <li>LocalStorage: {apiKeyStatus.localStorage ? 'vorhanden' : 'nicht gesetzt'}</li>
            <li>Cookie: {apiKeyStatus.cookie ? 'vorhanden' : 'nicht gesetzt'}</li>
            <li>Wert: {apiKeyStatus.value ? apiKeyStatus.value.substring(0, 8) + '...' : 'Nicht gesetzt'}</li>
          </ul>
          
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Session Status</h2>
          <ul className="mb-5 space-y-2 text-sm">
            <li>Session Token: {sessionStatus.exists ? 'vorhanden' : 'nicht gesetzt'}</li>
            {sessionStatus.exists && <li>Wert: {sessionStatus.value}</li>}
          </ul>
          
          <div className="flex flex-wrap gap-2">
            <Button onClick={checkAuthStatus} variant="secondary">Status aktualisieren</Button>
            <Button onClick={clearAllAuth} variant="destructive">Alles löschen</Button>
          </div>
        </Card>
        
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">API-Tests</h2>
          <div className="mb-5 grid gap-2">
            <Button 
              onClick={fetchDebugInfo} 
              disabled={loading}
              className="w-full"
            >
              Server-Debug-Info abrufen
            </Button>
            
            <Button 
              onClick={testApiAccess} 
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              API-Zugriff testen
            </Button>
          </div>
          
          {debugInfo && (
            <div className="mt-4">
              <h3 className="text-sm font-medium">Server Debug Info</h3>
              <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-muted p-3 text-xs">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
