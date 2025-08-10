# 📱 PWA (Progressive Web App) Features

Die SVP Rasenturnier App ist jetzt als Progressive Web App (PWA) verfügbar und bietet eine app-ähnliche Erfahrung direkt im Browser.

## ✨ Features

### 🚀 App-Installation
- **Installierbar**: Kann wie eine native App auf dem Startbildschirm installiert werden
- **Cross-Platform**: Funktioniert auf iOS, Android und Desktop
- **Automatische Prompts**: Zeigt Installationsaufforderungen nach Benutzerinteraktion

### 🔄 Offline-Funktionalität
- **Service Worker**: Cacht wichtige Ressourcen für Offline-Nutzung
- **Intelligentes Caching**: API-Antworten werden gecacht und offline verfügbar gemacht
- **Offline-Seite**: Zeigt eine benutzerfreundliche Offline-Seite bei fehlender Internetverbindung

### 🎨 Native App-Gefühl
- **Standalone-Modus**: Läuft ohne Browser-UI
- **Splash Screens**: Angepasste Ladebildschirme für iOS
- **App-Icons**: Optimierte Icons für verschiedene Geräte und Auflösungen
- **Shortcuts**: Schnellzugriff auf wichtige App-Bereiche

### 📱 Platform-spezifische Features
- **iOS**: Unterstützung für Add to Home Screen
- **Android**: Chrome-Installation mit automatischen Prompts
- **Desktop**: Installation über Browser-Menü oder Adressleiste

## 🛠️ Technische Details

### Dateien
- `public/manifest.json` - PWA-Manifest mit App-Metadaten
- `public/sw.js` - Service Worker für Caching und Offline-Funktionalität
- `components/PWAInstallPrompt.tsx` - React-Komponente für Installation
- `app/offline/page.tsx` - Offline-Fallback-Seite
- `lib/pwa-utils.ts` - Utility-Funktionen für PWA-Features

### Service Worker Features
- **Intelligent Caching**: Cache-First für statische Ressourcen, Network-First für API-Calls
- **Background Sync**: Synchronisation von Daten bei Netzwerkverfügbarkeit
- **Push Notifications**: Vorbereitet für zukünftige Benachrichtigungen
- **Cache Management**: Automatische Bereinigung alter Caches

### Caching-Strategie
1. **Statische Ressourcen**: Cache-First (lange Speicherung)
2. **API-Calls**: Network-First mit Cache-Fallback
3. **Seiten**: Network-First für Aktualität
4. **Offline-Fallback**: Zeigt Offline-Seite bei Netzwerkfehlern

## 📲 Installation

### Automatische Installation
Die App zeigt automatisch eine Installationsaufforderung nach:
- 30 Sekunden Nutzung
- Bei unterstützten Browsern und Geräten
- Wenn die App noch nicht installiert ist

### Manuelle Installation

#### 🍎 iOS (Safari)
1. Öffne die App in Safari
2. Tippe auf das Teilen-Symbol (Quadrat mit Pfeil)
3. Scrolle nach unten und wähle "Zum Home-Bildschirm hinzufügen"
4. Tippe auf "Hinzufügen"

#### 🤖 Android (Chrome)
1. Öffne die App in Chrome
2. Tippe auf das Menü (drei Punkte)
3. Wähle "App installieren" oder "Zum Startbildschirm hinzufügen"
4. Bestätige die Installation

#### 💻 Desktop
1. Öffne die App in Chrome, Edge oder Firefox
2. Klicke auf das Install-Symbol in der Adressleiste
3. Oder nutze das Browser-Menü → "App installieren"

## � Cache Management

### Automatisches Cache-Update
Der Service Worker aktualisiert den Cache automatisch bei neuen Versionen:
- Ändere `CACHE_NAME` in `public/sw.js` (z.B. `'svp-turnier-v1'` → `'svp-turnier-v2'`)
- Der Browser erkennt die Änderung und aktualisiert automatisch

### Manueller Cache-Reload

#### 🛠️ Entwicklung (DevTools)
- **Chrome/Edge:** DevTools → Application → Storage → Clear storage
- **Firefox:** DevTools → Storage → Clear All  
- **Safari:** Develop → Empty Caches

#### �🔧 Programmatisch (Admin)
```tsx
import { PWAUtils } from '@/lib/pwa-utils';
import CacheManager from '@/components/CacheManager';

// Cache leeren
await PWAUtils.clearCache();

// Service Worker aktualisieren  
await PWAUtils.updateServiceWorker();

// Komplett neu laden (Cache + Service Worker + Reload)
await PWAUtils.forceReload();

// Admin-Komponente nutzen
<CacheManager />
```

#### 📱 Benutzer (Browser)
- **Hard Refresh:** Ctrl+F5 (Windows) / Cmd+Shift+R (Mac)
- **Browser-Cache leeren:** Browser-Einstellungen → Daten löschen
- **App neu installieren:** PWA deinstallieren und neu installieren

### Cache-Strategien
1. **Statische Ressourcen**: Cache-First (lange Speicherung)
2. **API-Calls**: Network-First mit Cache-Fallback  
3. **Seiten**: Network-First für Aktualität
4. **Offline-Fallback**: Zeigt Offline-Seite bei Netzwerkfehlern

## 🔧 Entwicklung

### PWA-Komponenten nutzen
```tsx
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import { PWAUtils, useNetworkStatus } from '@/lib/pwa-utils';

function MyComponent() {
  const { isOnline, isOffline } = useNetworkStatus();
  
  const handleInstall = async () => {
    const success = await PWAUtils.addToHomeScreen();
    console.log('Installation:', success ? 'erfolgreich' : 'abgebrochen');
  };
  
  return (
    <div>
      {isOffline && <div>Offline-Modus aktiv</div>}
      <PWAInstallPrompt />
    </div>
  );
}
```

### Service Worker erweitern
Der Service Worker in `public/sw.js` kann erweitert werden für:
- Zusätzliche Caching-Strategien
- Background Sync für Formular-Übermittlungen
- Push Notifications
- Custom Offline-Logik

### Icons erstellen
Nutze das SVG-Template in `public/icons/icon-template.svg` und konvertiere es zu PNG in verschiedenen Größen:
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

## 🧪 Testing

### PWA-Features testen
1. **Installation**: Prüfe Installationsprompts in verschiedenen Browsern
2. **Offline**: Deaktiviere Netzwerk in DevTools und teste Funktionalität
3. **Caching**: Überprüfe Cache-Verhalten in DevTools → Application → Storage
4. **Service Worker**: Monitore SW-Events in DevTools → Application → Service Workers

### Browser-Support
- ✅ Chrome (Desktop/Mobile)
- ✅ Firefox (Desktop/Mobile) 
- ✅ Safari (iOS/macOS)
- ✅ Edge (Desktop/Mobile)
- ✅ Samsung Internet
- ⚠️ Internet Explorer (nicht unterstützt)

## 📊 Metriken

Die PWA-Implementation verbessert:
- **Ladezeiten**: Durch aggressives Caching
- **Engagement**: Durch einfache Installation
- **Retention**: Durch Offline-Verfügbarkeit
- **Performance**: Durch optimierte Ressourcen-Auslieferung

## 🔮 Zukünftige Features

Geplante Erweiterungen:
- **Push Notifications**: Benachrichtigungen für Spielergebnisse
- **Background Sync**: Offline-Formular-Übermittlungen
- **Web Share API**: Teilen von Spielplänen und Ergebnissen
- **Kamera-Integration**: QR-Code-Scanner für Check-ins
- **Location API**: GPS-basierte Features für das Turnier-Gelände
