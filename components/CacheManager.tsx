'use client';

import { useState } from 'react';
import { PWAUtils } from '@/lib/pwa-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Trash2, Download } from 'lucide-react';

export default function CacheManager() {
  const [isClearing, setIsClearing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [message, setMessage] = useState<string>('');

  const handleClearCache = async () => {
    setIsClearing(true);
    setMessage('');
    
    try {
      await PWAUtils.clearCache();
      setMessage('✅ Cache erfolgreich geleert');
    } catch (error) {
      setMessage('❌ Fehler beim Leeren des Caches');
    } finally {
      setIsClearing(false);
    }
  };

  const handleUpdateServiceWorker = async () => {
    setIsUpdating(true);
    setMessage('');
    
    try {
      const success = await PWAUtils.updateServiceWorker();
      if (success) {
        setMessage('✅ Service Worker aktualisiert');
      } else {
        setMessage('⚠️ Service Worker Aktualisierung fehlgeschlagen');
      }
    } catch (error) {
      setMessage('❌ Fehler beim Aktualisieren des Service Workers');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleForceReload = async () => {
    setIsReloading(true);
    setMessage('🔄 Cache wird geleert und Seite neu geladen...');
    
    try {
      await PWAUtils.forceReload();
    } catch (error) {
      setMessage('❌ Fehler beim Force Reload');
      setIsReloading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Cache Management
        </CardTitle>
        <CardDescription>
          Verwalte den PWA Cache und Service Worker für Aktualisierungen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <div className={`p-3 rounded-lg border ${
            message.startsWith('✅') ? 'bg-green-50 border-green-200 text-green-800' :
            message.startsWith('⚠️') ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
            message.startsWith('🔄') ? 'bg-blue-50 border-blue-200 text-blue-800' :
            'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {message}
            </div>
          </div>
        )}

        <div className="grid gap-3">
          <Button 
            onClick={handleClearCache}
            disabled={isClearing}
            variant="outline"
            className="w-full justify-start"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isClearing ? 'Cache wird geleert...' : 'Cache leeren'}
          </Button>

          <Button 
            onClick={handleUpdateServiceWorker}
            disabled={isUpdating}
            variant="outline"
            className="w-full justify-start"
          >
            <Download className="h-4 w-4 mr-2" />
            {isUpdating ? 'Service Worker wird aktualisiert...' : 'Service Worker aktualisieren'}
          </Button>

          <Button 
            onClick={handleForceReload}
            disabled={isReloading}
            variant="destructive"
            className="w-full justify-start"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {isReloading ? 'Wird neu geladen...' : 'Force Reload (Cache + Neuladen)'}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>Cache leeren:</strong> Entfernt alle gecachten Daten</p>
          <p><strong>Service Worker aktualisieren:</strong> Lädt den Service Worker neu</p>
          <p><strong>Force Reload:</strong> Leert Cache, aktualisiert SW und lädt die Seite neu</p>
        </div>
      </CardContent>
    </Card>
  );
}
