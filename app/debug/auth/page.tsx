'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AuthDebugPage() {
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
  
  // API-Key zurücksetzen
  function resetApiKey() {
    // Standard-API-Key
    const apiKey = 'svp-admin-2025-secure-key';
    
    // In localStorage speichern
    localStorage.setItem('svp-admin-key', apiKey);
    
    // In Cookie speichern (1 Tag gültig)
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 1);
    document.cookie = `svp-admin-key=${apiKey};expires=${expireDate.toUTCString()};path=/;SameSite=Lax`;
    
    // Status aktualisieren
    checkAuthStatus();
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
          'Content-Type': 'application/json',
          'X-API-Key': apiKeyStatus.value || 'svp-admin-2025-secure-key'
        }
      });
      
      const data = await response.json();
      alert(`API-Zugriff Status: ${response.status === 200 ? 'Erfolgreich ✅' : 'Fehlgeschlagen ❌'}`);
      console.log('API-Antwort:', data);
    } catch (error) {
      console.error('Fehler beim API-Test:', error);
      alert('API-Zugriff fehlgeschlagen: ' + (error as Error).message);
    }
    setLoading(false);
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Authentifizierungs-Diagnose</h1>
      
      <Alert className="mb-6">
        <AlertTitle>Entwicklungsmodus</AlertTitle>
        <AlertDescription>
          Diese Seite hilft bei der Diagnose von Authentifizierungsproblemen und sollte nur im Entwicklungsmodus verwendet werden.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">API-Key Status</h2>
          <ul className="mb-4 space-y-2">
            <li>LocalStorage: {apiKeyStatus.localStorage ? '✅' : '❌'}</li>
            <li>Cookie: {apiKeyStatus.cookie ? '✅' : '❌'}</li>
            <li>Wert: {apiKeyStatus.value ? apiKeyStatus.value.substring(0, 8) + '...' : 'Nicht gesetzt'}</li>
          </ul>
          
          <h2 className="text-lg font-semibold mb-2">Session Status</h2>
          <ul className="mb-4">
            <li>Session Token: {sessionStatus.exists ? '✅' : '❌'}</li>
            {sessionStatus.exists && <li>Wert: {sessionStatus.value}</li>}
          </ul>
          
          <div className="space-x-2">
            <Button onClick={resetApiKey} variant="secondary">API-Key zurücksetzen</Button>
            <Button onClick={clearAllAuth} variant="destructive">Alles löschen</Button>
          </div>
        </Card>
        
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">API-Tests</h2>
          <div className="space-y-2 mb-4">
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
              <h3 className="font-medium">Server Debug Info:</h3>
              <pre className="bg-slate-100 p-2 rounded text-sm mt-2 overflow-auto max-h-60">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
