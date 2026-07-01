# 🚀 SVP App Deployment Scripts

Optimierte Scripts für 1vCore 1GB RAM Server Deployment.

## 📋 Script Übersicht

### 🌟 **super-deploy.sh** - Das Haupt-Deployment Script
```bash
./scripts/super-deploy.sh
```
**Was macht es:**
- ✅ Kompletter System-Check (RAM, Swap, Disk)
- ✅ Dependencies installieren
- ✅ Environment optimieren  
- ✅ Memory-optimierter Build
- ✅ PM2 Setup und Start
- ✅ Systemd Service (optional)
- ✅ Health Checks
- ✅ Vollständige Zusammenfassung

---

### ⚡ **quick-setup.sh** - Server Ersteinrichtung
```bash
sudo ./scripts/quick-setup.sh
```
**Was macht es:**
- 🔧 System Updates
- 📦 Node.js Installation
- 🔄 PM2 Installation  
- 💾 Swap erstellen (1GB)
- 🔥 Firewall konfigurieren
- ⚙️ System optimieren

---

### 🛠️ **maintenance.sh** - Wartung & Optimierung
```bash
./scripts/maintenance.sh [option]
```
**Optionen:**
- `clean` - Logs & Cache bereinigen
- `db` - Database optimieren
- `memory` - Memory prüfen & ggf. restart
- `restart` - Services neustarten
- `backup` - Backup erstellen
- `status` - System Status anzeigen
- `all` - Alles ausführen

---

### 📊 **monitor-performance.sh** - Performance Monitoring
```bash
./scripts/monitor-performance.sh
```
**Was zeigt es:**
- 💾 Memory Usage
- 🏃 Running Processes
- 💿 Disk Usage
- 📈 System Load
- 🌐 Network Connections
- 🔄 PM2 Status

---

## 🎯 Deployment Workflow

### Erste Installation:
```bash
# 1. Server vorbereiten
sudo ./scripts/quick-setup.sh

# 2. Nach Neustart: Projekt deployen
./scripts/super-deploy.sh
```

### Regelmäßige Updates:
```bash
# Code aktualisieren
git pull

# Neu deployen
./scripts/super-deploy.sh
```

### Wartung:
```bash
# Wöchentlich ausführen
./scripts/maintenance.sh all

# Bei Problemen
./scripts/monitor-performance.sh
```

---

## 💡 Wichtige Hinweise

### Memory Management
- **RAM Limit**: 512MB für Node.js
- **PM2 Restart**: Bei 700MB Usage
- **Swap**: 1GB empfohlen

### Performance Tipps
- Monitoring alle 6h: `./scripts/monitor-performance.sh`
- Maintenance wöchentlich: `./scripts/maintenance.sh all`
- Bei hoher Load: `./scripts/maintenance.sh restart`

### Troubleshooting
```bash
# App läuft nicht
pm2 status
pm2 logs svpapp-prod

# Hohe Memory Usage
./scripts/maintenance.sh memory

# Performance Probleme
./scripts/monitor-performance.sh
```

---

## 🔧 Anpassungen

### Server mit mehr RAM (2GB+):
```bash
# In .env.production ändern:
NODE_OPTIONS="--max-old-space-size=1024 --gc-interval=100"

# In ecosystem.prod.config.js ändern:
max_memory_restart: '1500M'
```

### Erweiterte Logs:
```bash
# PM2 Logs mit Zeitstempel
pm2 logs --timestamp

# System Logs
journalctl -u svpapp -f
```

---

## 📞 Support

Bei Problemen:
1. `./scripts/monitor-performance.sh` ausführen
2. `pm2 logs svpapp-prod` prüfen
3. `free -h` für Memory Check
4. Bei weiterhin Problemen: `./scripts/maintenance.sh all`

---

**🎉 Happy Deploying! Ihr SVP Handball Turnier läuft optimal! 🏐**
