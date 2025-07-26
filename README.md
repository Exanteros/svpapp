# SVP Rasenturnier - Event Management Plattform

Eine moderne Event Management Plattform für das Rasenturnier des SV Puschendorf, entwickelt mit Next.js und TypeScript.

## 🚀 Features

### ✅ Vollständig implementiert:
- **🏠 Moderne Benutzeroberfläche** mit Shadcn/ui Components
- **📝 Team-Anmeldesystem** mit komplexen Formularen und Validierung
- **💰 Automatische Kostenberechnung** (25€ + 20€ ohne Schiri)
- **📧 E-Mail-System** mit automatischen Bestätigungsmails und eindeutigen Adressen
- **📅 Spielplan-Anzeige** mit Live-Updates und responsivem Design
- **🏆 Ergebnisse und Tabellen** mit Echtzeit-Daten
- **⚙️ Admin-Dashboard** für komplette Turnier-Verwaltung
- **🗄️ SQLite-Datenbank** mit better-sqlite3 für optimale Performance
- **🔌 REST API** für alle Funktionen mit Fehlerbehandlung
- **📱 Responsive Design** optimiert für alle Geräte
- **🎯 Intelligenter Spielplan-Generator** mit automatischer Team-Gruppierung

### 🔜 Nächste Features:
- **🤖 AI-Integration** für automatische Antworten
- **📱 PWA-Funktionalität** für mobile Nutzung
- **🎯 KI-Kartenerkennung** für Schiedsrichterkarten
- **👥 Helfer-Management** mit Selbstanmeldung
- **💳 Zahlungsabwicklung** Integration

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **UI**: Shadcn/ui + Tailwind CSS + Lucide Icons
- **Backend**: Next.js API Routes + Node.js
- **Datenbank**: SQLite mit better-sqlite3 (production-ready)
- **E-Mail**: Nodemailer mit Ethereal Email (Entwicklung)
- **Styling**: Tailwind CSS + Geist Font
- **Icons**: Lucide React

## 🚀 Installation & Start

```bash
# Repository klonen
git clone <repository-url>
cd svpapp

# Dependencies installieren
npm install

# Umgebungsvariablen einrichten
cp .env.local.example .env.local
# E-Mail-Konfiguration in .env.local anpassen

# Development Server starten
npm run dev

# Anwendung öffnet sich auf http://localhost:3002
```

## 📧 E-Mail-Konfiguration

Die Anwendung verwendet Ethereal Email für Entwicklung. Für Produktion:

```env
# .env.local
SMTP_HOST=your-smtp-host.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password
ADMIN_EMAIL=admin@sv-puschendorf.de
```

## 🗄️ Datenbank

- **SQLite** mit better-sqlite3 für hohe Performance
- **Automatische Initialisierung** beim ersten Start
- **WAL-Modus** für bessere Concurrency
- **Transaktionen** für Datenintegrität

### Tabellen-Schema:
```sql
-- Anmeldungen
CREATE TABLE anmeldungen (
  id TEXT PRIMARY KEY,
  verein TEXT NOT NULL,
  kontakt TEXT NOT NULL,
  email TEXT NOT NULL,
  mobil TEXT NOT NULL,
  kosten INTEGER NOT NULL,
  status TEXT DEFAULT 'angemeldet',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Teams pro Anmeldung
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  anmeldung_id TEXT NOT NULL,
  kategorie TEXT NOT NULL,
  anzahl INTEGER NOT NULL,
  schiri BOOLEAN NOT NULL,
  spielstaerke TEXT,
  FOREIGN KEY (anmeldung_id) REFERENCES anmeldungen (id)
);

-- Spielplan
CREATE TABLE spiele (
  id TEXT PRIMARY KEY,
  datum TEXT NOT NULL,
  zeit TEXT NOT NULL,
  feld TEXT NOT NULL,
  kategorie TEXT NOT NULL,
  team1 TEXT NOT NULL,
  team2 TEXT NOT NULL,
  status TEXT DEFAULT 'geplant',
  ergebnis TEXT
);
```

## 📋 Turnier-Kategorien

### Samstag, 5. Juli 2025 (13:00 - 17:00 Uhr)
- **Mini-Kategorien**: Mini 3, Mini 2, Mini 1
- **E-Jugend**: weiblich, gemischt, männlich (mit Spielstärke)

### Sonntag, 6. Juli 2025 (10:00 - 17:00 Uhr)
- **D-Jugend**: weiblich, männlich (mit Spielstärke)
- **C-Jugend**: weiblich, männlich (mit Spielstärke)
- **B-Jugend**: weiblich, männlich (mit Spielstärke)
- **A-Jugend**: weiblich, männlich (mit Spielstärke)

## 🚀 Installation & Start

```bash
# Dependencies installieren
npm install

# Development Server starten
npm run dev

# Production Build
npm run build
npm start
```

## 📝 Nutzung

### Für Vereine:
1. **Anmeldung**: Über `/anmeldung` können Teams für verschiedene Kategorien angemeldet werden
2. **Spielplan**: Unter `/spielplan` sind alle Spiele und Zeiten einsehbar
3. **Ergebnisse**: Live-Ergebnisse und Tabellen unter `/ergebnisse`

### Für Administratoren:
1. **Admin-Bereich**: Unter `/admin` können alle Anmeldungen verwaltet werden
2. **Spielplan-Generator**: Automatische Erstellung nach Anmeldeschluss
3. **Einstellungen**: Turnier-Parameter konfigurieren

## 🏗️ Projektstruktur

```
svpapp/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Hauptseite
│   ├── anmeldung/         # Team-Anmeldung
│   ├── spielplan/         # Spielplan-Ansicht
│   ├── ergebnisse/        # Ergebnisse & Tabellen
│   ├── admin/             # Admin-Dashboard
│   └── api/               # Backend API Routes
├── components/            # Shadcn/ui Components
├── lib/                   # Utilities & Database
└── public/               # Statische Assets
```

## 🔧 Konfiguration

### Turnier-Einstellungen:
- **Startgeld**: 25€ pro Team
- **Schiri-Geld**: 20€ zusätzlich ohne Schiedsrichter
- **Felder**: 4 Spielfelder + Beach-Volleyball
- **Anmeldeschluss**: Konfigurierbar im Admin-Bereich

### E-Mail-System:
- **Eindeutige Adressen**: `svp.rasenturnier.[vereinsname]@sv-puschendorf.de`
- **Automatische Bestätigung** nach Anmeldung
- **Bidirektionale Kommunikation** über eindeutige E-Mail-Adressen

## 📊 Datenbank-Schema

### Tabellen:
- **anmeldungen**: Vereinsdaten und Kontaktinformationen
- **teams**: Team-Details pro Kategorie
- **spiele**: Spielplan und Ergebnisse
- **einstellungen**: Turnier-Konfiguration

## 🔐 Admin-Funktionen

- **Anmeldungen verwalten**: Übersicht, Bearbeitung, Status-Updates
- **Spielplan erstellen**: Automatische Generierung mit intelligenter Gruppierung
- **Ergebnisse eingeben**: Live-Updates für alle Benutzer
- **E-Mail-Kommunikation**: Direkte Kommunikation mit Vereinen
- **Turnier-Einstellungen**: Datum, Kosten, Felder konfigurieren

## 🎯 Nächste Schritte

1. **E-Mail-Integration** mit echtem Mail-Service
2. **Spielplan-Generator** mit komplexer Logik
3. **Helfer-Management** System
4. **KI-Kartenerkennung** für Handball-Spielnotizkarten
5. **PWA-Funktionalität** für mobile Nutzung
6. **Backup-System** implementieren

## 📧 Support

Bei Fragen oder Problemen wenden Sie sich an die Turnierleitung des SV Puschendorf.

---

**SV Puschendorf Rasenturnier 2025** - Moderne Event Management Plattform
