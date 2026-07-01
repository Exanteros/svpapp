# Authentifizierungssystem für SV Puschendorf Turnier-App

## Übersicht

Dieses System implementiert eine sichere Authentifizierung basierend auf dem Next.js App Router und modernen Best Practices.

## Features

- **Session-basierte Authentifizierung** mit JWT-Tokens
- **Sichere Cookie-Speicherung** (httpOnly, secure in Produktion)
- **Middleware-basierter Route-Schutz**
- **Data Access Layer (DAL)** für zentrale Autorisierung
- **Automatische Session-Verlängerung**
- **CSRF-Schutz** durch SameSite Cookies

## Admin-Anmeldedaten konfigurieren

Die Admin-Credentials müssen in der `.env.local` Datei gesetzt werden:

```env
ADMIN_EMAIL=ihre-email@domain.de
ADMIN_PASSWORD=IhrSicheresPasswort123!
```

⚠️ **Sicherheitshinweis**: Verwenden Sie niemals Standard-Passwörter in Produktionsumgebungen!

## Einrichtung

1. **Umgebungsvariablen kopieren**:
   ```bash
   cp .env.local.example .env.local
   ```

2. **Anmeldedaten anpassen** (optional):
   ```bash
   # In .env.local
   ADMIN_EMAIL=ihre-email@domain.de
   ADMIN_PASSWORD=ihr-sicheres-passwort
   SESSION_SECRET=ihr-geheimer-schlüssel
   ```

3. **Anwendung starten**:
   ```bash
   npm run dev
   ```

## Verwendung

### Login
1. Gehen Sie zu `/admin/login`
2. Geben Sie die Anmeldedaten ein:
   - Format: `email:passwort`
   - Beispiel: `ihre-email@domain.de:IhrSicheresPasswort123!`

### Geschützte Routen
- `/admin/*` - Alle Admin-Seiten sind automatisch geschützt
- Nicht authentifizierte Benutzer werden zu `/admin/login` weitergeleitet

### API-Routen schützen

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/dal';

export async function GET(request: NextRequest) {
  // Authentifizierung prüfen
  const authResult = await verifyApiAuth(request);
  
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  // Geschützte Logik hier...
  return NextResponse.json({ data: "Geschützte Daten" });
}
```

### Server Components schützen

```typescript
import { verifySession } from '@/lib/dal';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const { isAuth } = await verifySession();
  
  if (!isAuth) {
    redirect('/admin/login');
  }

  return <div>Geschützter Inhalt</div>;
}
```

## Sicherheitsfeatures

### 1. Sichere Sessions
- JWT-Tokens mit HS256 Verschlüsselung
- HttpOnly Cookies (nicht über JavaScript zugänglich)
- Secure Flag in Produktion (nur HTTPS)
- SameSite=Lax für CSRF-Schutz

### 2. Middleware-Schutz
- Automatische Weiterleitung bei fehlendem Login
- Optimistic Checks für bessere Performance
- Schutz aller Admin-Routen

### 3. Data Access Layer
- Zentrale Autorisierungslogik
- Konsistente Authentifizierung
- Einfache Integration in API-Routen

## API-Endpunkte

### Login
```
POST /api/auth/login
{
  "email": "ihre-email@domain.de",
  "password": "IhrSicheresPasswort123!"
}
```

### Logout
```
POST /api/auth/logout
```

### Geschützte Beispiel-Route
```
GET /api/protected-example
```

## Deployment

### Umgebungsvariablen in Produktion

```bash
ADMIN_EMAIL=admin@ihre-domain.de
ADMIN_PASSWORD=sehr-sicheres-passwort-123!
SESSION_SECRET=sehr-langer-zufälliger-string
NEXT_PUBLIC_APP_URL=https://ihre-domain.de
```

### Sicherheitsempfehlungen

1. **Starke Passwörter verwenden**
2. **SESSION_SECRET regelmäßig ändern**
3. **HTTPS in Produktion aktivieren**
4. **Regelmäßige Security-Updates**

## Fehlerbehebung

### Session-Probleme
- Cookies löschen im Browser
- `.env.local` Datei prüfen
- Server neu starten

### Authentifizierung fehlgeschlagen
- Anmeldedaten in `.env.local` prüfen
- Session-Token im Browser-Debugger überprüfen

## Code-Struktur

```
lib/
├── session.ts      # JWT Session Management
├── dal.ts          # Data Access Layer
└── auth.ts         # Legacy (nicht mehr verwendet)

app/api/auth/
├── login/route.ts  # Login Endpoint
└── logout/route.ts # Logout Endpoint

middleware.ts       # Route Protection

app/admin/login/    # Login-Seite
```

## Migration von altem System

Das alte API-Key basierte System wurde ersetzt. Falls Sie das alte System verwenden:

1. Entfernen Sie alle Referenzen zu `lib/api-client.ts`
2. Verwenden Sie die neuen Session-basierten APIs
3. Aktualisieren Sie Ihre Admin-Komponenten

## Support

Bei Problemen oder Fragen wenden Sie sich an den Entwickler.
