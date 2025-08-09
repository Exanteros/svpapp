# SVP Turnier-App - Sicherheitsdokumentation

## 🔒 API-Sicherheit

Die SVP Turnier-App verfügt über ein umfassendes Sicherheitssystem zum Schutz der Admin-Bereiche und APIs.

### 🛡️ Implementierte Sicherheitsmaßnahmen

#### 1. **API-Key Authentifizierung**
- Alle Admin-Endpunkte erfordern einen gültigen API-Schlüssel
- API-Schlüssel werden über den `X-API-Key` Header oder `Authorization: Bearer` Header übertragen
- Konfiguration über Umgebungsvariablen (`ADMIN_API_KEY`)

#### 2. **Email/Passwort Authentifizierung**
- **Traditionelle Anmeldung** mit E-Mail-Adresse und Passwort
- **Session-basierte Authentifizierung** mit Token-Management
- **Sichere Passwort-Hashing** mit SHA-256 + Salt
- **Admin-Benutzer-Erstellung** für initiales Setup
- **24-Stunden-Sessions** mit automatischem Ablauf

#### 3. **Passkey (WebAuthn) Authentifizierung**
- **Moderne biometrische Authentifizierung** mit TouchID, FaceID, Windows Hello
- **Phishing-resistent** und passwortlos
- **Hardware-Sicherheitsschlüssel** Unterstützung (YubiKey, etc.)
- Automatische Browser-Kompatibilitätsprüfung
- Sichere Challenge-Response-Authentifizierung

#### 4. **Rate Limiting**
- Standardmäßig 60 Anfragen pro Minute pro IP-Adresse
- Konfigurierbar über `MAX_REQUESTS_PER_MINUTE`
- Automatische Sperrung bei Überschreitung

#### 5. **IP-Whitelist (Optional)**
- Optionale Beschränkung auf bestimmte IP-Adressen
- Konfiguration über `ALLOWED_IPS` (komma-separiert)
- Deaktiviert wenn leer

#### 6. **CSRF-Schutz**
- Origin/Referer-Validierung
- Nur Anfragen von der eigenen Domain erlaubt
- Schutz vor Cross-Site Request Forgery

#### 7. **Sichere Response-Headers**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

### 🔧 Setup und Konfiguration

#### 1. **Umgebungsvariablen einrichten**

Kopieren Sie `.env.example` zu `.env.local`:

```bash
cp .env.example .env.local
```

Konfigurieren Sie die Sicherheitseinstellungen:

```env
# Sicherheitskonfiguration
ADMIN_API_KEY=ihr-super-sicherer-admin-api-schlüssel-hier-2025
SESSION_SECRET=ihr-session-secret-schlüssel-hier-2025
NEXT_PUBLIC_APP_URL=https://ihre-domain.de

# Rate Limiting
MAX_REQUESTS_PER_MINUTE=60

# Optional: IP-Whitelist
ALLOWED_IPS=192.168.1.100,10.0.0.50
```

#### 2. **Sicheren API-Schlüssel generieren**

```javascript
// Verwenden Sie die Hilfsfunktion
import { generateSecureToken } from '@/lib/auth';
const secureKey = generateSecureToken();
console.log('Ihr neuer API-Schlüssel:', secureKey);
```

#### 3. **Admin-Zugang einrichten**

1. Navigieren Sie zu `/admin/login`
2. Geben Sie Ihren API-Schlüssel ein
3. Der Schlüssel wird sicher im Browser gespeichert

### Email/Passwort-Setup

#### 1. **Ersten Admin-Benutzer erstellen**
1. Navigieren Sie zu `/admin/login`
2. Wählen Sie den "Email/Passwort"-Tab
3. Geben Sie E-Mail-Adresse und Passwort ein (mindestens 8 Zeichen)
4. Klicken Sie "Admin-Benutzer erstellen"
5. Sie werden automatisch angemeldet

#### 2. **Mit Email/Passwort anmelden**
1. Navigieren Sie zu `/admin/login`
2. Wählen Sie den "Email/Passwort"-Tab
3. Geben Sie Ihre Anmeldedaten ein
4. Klicken Sie "Anmelden"

#### 3. **Session-Management**
- Sessions sind 24 Stunden gültig
- Automatische Verlängerung bei Aktivität
- Sichere Abmeldung über Logout-Button
- Server-seitige Session-Invalidierung

### 🚀 Geschützte Endpunkte

#### Admin-API (`/api/admin`)
- **GET**: Lädt Admin-Daten, Statistiken und Einstellungen
- **POST**: 
  - `update_status`: Status von Anmeldungen ändern
  - `save_settings`: Turnier-Einstellungen speichern

#### Helfer-API (`/api/helfer`)
- **GET**: Lädt Helfer-Bedarf und Anmeldungen
- **POST**:
  - `save_bedarf`: Helfer-Bedarf erstellen/aktualisieren
  - `delete_bedarf`: Helfer-Bedarf löschen
  - `generate_link`: Helfer-Anmeldelink generieren
  - `update_status`: Helfer-Status ändern
  - `update_bedarf`: Helfer-Bedarf verschieben

#### Spielplan-API (`/api/spielplan`)
- **GET**: Öffentlich zugänglich (Spielplan-Anzeige)
- **POST** (geschützt):
  - `generate`: Spielplan automatisch generieren
  - `create`: Einzelnes Spiel erstellen
  - `update`: Spiel aktualisieren oder Ergebnis eintragen
  - `delete`: Spiel löschen

## 🔐 Passkey (WebAuthn) Authentifizierung

### Was sind Passkeys?
Passkeys sind ein moderner, sicherer Authentifizierungsstandard, der traditionelle Passwörter ersetzt:

- **Biometrische Authentifizierung**: TouchID, FaceID, Windows Hello
- **Hardware-Sicherheitsschlüssel**: YubiKey, Titan Security Key
- **Phishing-resistent**: Kann nicht abgefangen oder weitergegeben werden
- **Passwortlos**: Keine Passwörter zu merken oder zu verwalten

### Passkey-Setup

#### 1. **Browser-Kompatibilität**
- Chrome 67+ / Edge 79+
- Firefox 60+
- Safari 14+
- Mobile Browser mit WebAuthn-Unterstützung

#### 2. **Geräte-Voraussetzungen**
- **iOS/macOS**: TouchID oder FaceID aktiviert
- **Windows**: Windows Hello eingerichtet
- **Android**: Fingerabdruck oder PIN-Sperrbildschirm
- **Hardware**: YubiKey oder anderer FIDO2-Sicherheitsschlüssel

#### 3. **Passkey registrieren**
1. Navigieren Sie zu `/admin/login`
2. Wählen Sie den "Passkey"-Tab
3. Geben Sie einen Benutzernamen ein (nur bei der ersten Registrierung)
4. Klicken Sie "Neuen Passkey registrieren"
5. Folgen Sie den Browser-Anweisungen (TouchID, FaceID, etc.)

#### 4. **Mit Passkey anmelden**
1. Navigieren Sie zu `/admin/login`
2. Wählen Sie den "Passkey"-Tab
3. Klicken Sie "Mit Passkey anmelden"
4. Verwenden Sie Ihre biometrische Authentifizierung

### Passkey-Verwaltung

#### **Mehrere Passkeys**
- Sie können mehrere Passkeys für verschiedene Geräte registrieren
- Jeder Passkey funktioniert unabhängig
- Backup-Passkeys für Notfälle empfohlen

#### **Passkey löschen**
Derzeit ist das Löschen von Passkeys über die Admin-API möglich:
```javascript
// Passkey-Informationen abrufen
const passkeys = await fetch('/api/auth/passkey?action=list-passkeys');

// Passkey löschen
await fetch('/api/auth/passkey', {
  method: 'POST',
  body: JSON.stringify({
    action: 'delete',
    credentialId: 'passkey-id-hier'
  })
});
```

### Troubleshooting Passkeys

#### **"Passkey nicht verfügbar"**
- Prüfen Sie Browser-Kompatibilität
- Stellen Sie sicher, dass biometrische Authentifizierung aktiviert ist
- Für HTTPS erforderlich (außer localhost)

#### **"Passkey-Registrierung fehlgeschlagen"**
- Browser-Popup nicht blockiert?
- TouchID/FaceID funktioniert in anderen Apps?
- Hardware-Sicherheitsschlüssel richtig eingesteckt?

#### **"Challenge abgelaufen"**
- Registrierung/Anmeldung zu langsam (>5 Minuten)
- Seite neu laden und erneut versuchen

### 🔐 Sicherheits-Best Practices

#### 1. **Produktions-Setup**
```env
# Verwenden Sie starke, zufällige Schlüssel
ADMIN_API_KEY=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# Setzen Sie die korrekte Domain
NEXT_PUBLIC_APP_URL=https://ihre-produktions-domain.de

# Beschränken Sie IP-Zugriff falls möglich
ALLOWED_IPS=ihre.büro.ip.adresse,ihre.zuhause.ip.adresse
```

#### 2. **Regelmäßige Sicherheitsupdates**
- API-Schlüssel regelmäßig rotieren
- Rate-Limits an Traffic anpassen
- IP-Whitelist aktuell halten

#### 3. **Monitoring**
- Server-Logs auf verdächtige Aktivitäten überwachen
- Rate-Limit-Überschreitungen beobachten
- Fehlgeschlagene Authentifizierungsversuche loggen

#### 4. **Backup-Strategie**
- Regelmäßige Datenbankbackups
- API-Schlüssel sicher verwahren
- Disaster-Recovery-Plan erstellen

### 🚨 Fehlerbehebung

#### **403 Forbidden - "Invalid origin"**
**Problem**: Die Origin-Validierung blockiert lokale Entwicklungsanfragen
**Lösung**: 
- Stellen Sie sicher, dass `.env.local` korrekt konfiguriert ist:
  ```env
  NODE_ENV=development
  NEXT_PUBLIC_APP_URL=http://localhost:3002
  ADMIN_API_KEY=svp-admin-2025-secure-key
  ```
- Für Debug-Informationen fügen Sie hinzu:
  ```env
  AUTH_DEBUG=true
  ```

#### **401 Unauthorized**
- API-Schlüssel überprüfen
- Header-Format kontrollieren (`X-API-Key: ihr-schlüssel`)
- Schlüssel-Rotation erforderlich?

#### **429 Too Many Requests**
- Rate-Limit erreicht
- Warten bis Reset-Zeit
- `MAX_REQUESTS_PER_MINUTE` erhöhen falls nötig

#### **403 Forbidden - IP-Beschränkung**
- IP nicht in Whitelist
- `ALLOWED_IPS` überprüfen oder leeren für Entwicklung

### 📞 Support

Bei Sicherheitsproblemen oder Fragen:
- Kontaktieren Sie den System-Administrator
- Überprüfen Sie die Browser-Konsole auf Fehlermeldungen
- Dokumentieren Sie verdächtige Aktivitäten

### 🔄 API-Client Verwendung

```typescript
import { adminApi, isAuthenticated, authUtils } from '@/lib/api-client';

// Authentifizierung prüfen
if (!isAuthenticated()) {
  router.push('/admin/login');
}

// Sichere API-Aufrufe
try {
  const data = await adminApi.getAdminData();
  // ... Daten verarbeiten
} catch (error) {
  const message = handleApiError(error);
  alert(message);
}

// Logout
authUtils.logout(); // Leitet automatisch zur Login-Seite weiter
```

---

**Wichtiger Hinweis**: Behandeln Sie API-Schlüssel wie Passwörter. Teilen Sie sie niemals öffentlich und speichern Sie sie sicher!
