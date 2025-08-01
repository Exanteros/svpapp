#!/bin/bash

# 🚀 SVP App SUPER Deployment Script
# Komplettes Setup und Deployment für 1vCore 1GB RAM Server
# Author: GitHub Copilot
# Date: $(date)

set -e

# Farben für bessere Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Funktionen
print_header() {
    echo ""
    echo -e "${PURPLE}================================${NC}"
    echo -e "${WHITE}🚀 SVP APP SUPER DEPLOYMENT 🚀${NC}"
    echo -e "${PURPLE}================================${NC}"
    echo -e "${CYAN}Handball Tournament Management${NC}"
    echo -e "${CYAN}Optimiert für 1vCore 1GB RAM${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_system() {
    print_step "📊 System-Check wird durchgeführt..."
    
    # RAM Check
    MEMORY=$(free -m | grep '^Mem:' | awk '{print $2}')
    AVAILABLE=$(free -m | grep '^Mem:' | awk '{print $7}')
    
    echo "💾 RAM: ${MEMORY}MB total, ${AVAILABLE}MB verfügbar"
    
    if [ $MEMORY -lt 900 ]; then
        print_warning "Nur ${MEMORY}MB RAM verfügbar. Swap wird empfohlen!"
    else
        print_success "RAM-Check erfolgreich"
    fi
    
    # Swap Check
    SWAP=$(free -m | grep '^Swap:' | awk '{print $2}')
    if [ $SWAP -eq 0 ]; then
        print_warning "Kein Swap aktiviert! Für 1GB RAM Server empfohlen."
        echo "💡 Swap erstellen: sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile"
    else
        print_success "Swap aktiv: ${SWAP}MB"
    fi
    
    # Disk Space Check
    DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ $DISK_USAGE -gt 85 ]; then
        print_warning "Festplatte zu ${DISK_USAGE}% voll!"
    else
        print_success "Festplatte: ${DISK_USAGE}% belegt"
    fi
    
    # CPU Check
    CPU_CORES=$(nproc)
    print_success "CPU Kerne: ${CPU_CORES}"
    
    # Load Average
    LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    echo "📈 Load Average: ${LOAD}"
    
    echo ""
}

install_dependencies() {
    print_step "📦 Abhängigkeiten werden installiert..."
    
    # Node.js Check
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js: $NODE_VERSION"
    else
        print_error "Node.js nicht gefunden!"
        exit 1
    fi
    
    # NPM Check
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "NPM: $NPM_VERSION"
    else
        print_error "NPM nicht gefunden!"
        exit 1
    fi
    
    # PM2 Installation Check
    if ! command -v pm2 &> /dev/null; then
        print_warning "PM2 nicht gefunden. Installation..."
        npm install -g pm2
    fi
    
    # Dependencies installieren
    print_step "📥 NPM Dependencies werden installiert..."
    export NODE_OPTIONS="--max-old-space-size=512"
    npm ci --only=production --prefer-offline --silent
    print_success "Dependencies installiert"
}

optimize_environment() {
    print_step "⚙️  Environment wird optimiert..."
    
    # Memory-optimized environment
    export NODE_OPTIONS="--max-old-space-size=512 --gc-interval=100 --gc-global"
    export NEXT_TELEMETRY_DISABLED=1
    export UV_THREADPOOL_SIZE=2
    
    # Produktions-Environment setzen
    if [ ! -f .env.production ]; then
        print_warning ".env.production nicht gefunden - wird erstellt..."
        cat > .env.production << EOF
NODE_ENV=production
NODE_OPTIONS="--max-old-space-size=512 --gc-interval=100"
NEXT_TELEMETRY_DISABLED=1
UV_THREADPOOL_SIZE=2
DB_POOL_SIZE=3
ENABLE_SMTP_SERVER=false
MAX_REQUESTS_PER_MINUTE=60
EOF
    fi
    
    print_success "Environment optimiert"
}

build_application() {
    print_step "🏗️  Anwendung wird gebaut..."
    
    # Memory Check vor Build
    AVAILABLE_BEFORE=$(free -m | grep '^Mem:' | awk '{print $7}')
    if [ $AVAILABLE_BEFORE -lt 300 ]; then
        print_warning "Wenig RAM verfügbar (${AVAILABLE_BEFORE}MB). Build könnte fehlschlagen."
        echo "💡 Andere Prozesse beenden oder Swap aktivieren"
    fi
    
    # Build mit Memory Limits
    print_step "🔨 Build startet (das kann einige Minuten dauern)..."
    NODE_OPTIONS="--max-old-space-size=700 --gc-interval=50" npm run build:prod
    
    if [ $? -eq 0 ]; then
        print_success "Build erfolgreich abgeschlossen"
    else
        print_error "Build fehlgeschlagen!"
        exit 1
    fi
}

cleanup_files() {
    print_step "🧹 Aufräumen..."
    
    # Cache und temporäre Dateien löschen
    rm -rf .next/cache/webpack 2>/dev/null || true
    rm -rf node_modules/.cache 2>/dev/null || true
    rm -rf .npm 2>/dev/null || true
    npm cache clean --force --silent
    
    # Log-Rotation
    if [ -d "/var/log/pm2" ]; then
        find /var/log/pm2 -name "*.log" -size +10M -delete 2>/dev/null || true
    fi
    
    print_success "Aufräumen abgeschlossen"
}

setup_pm2() {
    print_step "🔄 PM2 Setup..."
    
    # PM2 stoppen falls läuft
    pm2 delete svpapp-prod 2>/dev/null || true
    
    # PM2 Konfiguration prüfen
    if [ ! -f ecosystem.prod.config.js ]; then
        print_error "ecosystem.prod.config.js nicht gefunden!"
        exit 1
    fi
    
    # PM2 starten
    pm2 start ecosystem.prod.config.js --env production
    pm2 save
    
    # PM2 Startup einrichten
    pm2 startup | grep -E "sudo.*pm2" | bash 2>/dev/null || true
    
    print_success "PM2 erfolgreich eingerichtet"
}

setup_systemd() {
    print_step "🛠️  Systemd Service Setup (optional)..."
    
    if [ -f svpapp.service ] && [ "$(id -u)" = "0" ]; then
        cp svpapp.service /etc/systemd/system/
        systemctl daemon-reload
        systemctl enable svpapp
        print_success "Systemd Service eingerichtet"
    else
        print_warning "Systemd Setup übersprungen (Root-Rechte oder Service-Datei fehlt)"
    fi
}

final_checks() {
    print_step "🔍 Finale Checks..."
    
    # Memory Check nach Deployment
    sleep 5
    MEMORY_AFTER=$(free -m | grep '^Mem:' | awk '{print $3}')
    AVAILABLE_AFTER=$(free -m | grep '^Mem:' | awk '{print $7}')
    
    echo "💾 RAM nach Deployment: ${MEMORY_AFTER}MB verwendet, ${AVAILABLE_AFTER}MB verfügbar"
    
    # PM2 Status
    echo ""
    print_step "📊 PM2 Status:"
    pm2 status
    
    # Prozess Check
    echo ""
    print_step "🏃 Prozess Check:"
    ps aux | grep -E "(node|npm)" | grep -v grep | head -5
    
    # Port Check
    echo ""
    if netstat -tuln | grep -q ":3000"; then
        print_success "Port 3000 ist aktiv"
    else
        print_warning "Port 3000 nicht erreichbar"
    fi
    
    # Health Check
    echo ""
    print_step "🏥 Health Check..."
    sleep 10
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|301\|302"; then
        print_success "Anwendung antwortet erfolgreich"
    else
        print_warning "Anwendung antwortet nicht (das ist normal bei ersten Start)"
    fi
}

print_summary() {
    echo ""
    echo -e "${PURPLE}================================${NC}"
    echo -e "${WHITE}📊 DEPLOYMENT ZUSAMMENFASSUNG${NC}"
    echo -e "${PURPLE}================================${NC}"
    
    # System Info
    MEMORY_TOTAL=$(free -m | grep '^Mem:' | awk '{print $2}')
    MEMORY_USED=$(free -m | grep '^Mem:' | awk '{print $3}')
    MEMORY_AVAILABLE=$(free -m | grep '^Mem:' | awk '{print $7}')
    SWAP_TOTAL=$(free -m | grep '^Swap:' | awk '{print $2}')
    
    echo -e "${CYAN}System Status:${NC}"
    echo "  💾 RAM: ${MEMORY_USED}MB / ${MEMORY_TOTAL}MB (${MEMORY_AVAILABLE}MB verfügbar)"
    echo "  🔄 Swap: ${SWAP_TOTAL}MB"
    echo "  🌐 Port: 3000"
    echo "  📁 Working Dir: $(pwd)"
    
    echo ""
    echo -e "${CYAN}Wichtige Commands:${NC}"
    echo "  📊 Status prüfen:          pm2 status"
    echo "  📜 Logs anzeigen:          pm2 logs svpapp-prod"
    echo "  🔄 Neustart:               pm2 restart svpapp-prod"
    echo "  📈 Performance Monitor:    ./scripts/monitor-performance.sh"
    echo "  🛠️  App-Logs:              pm2 logs --lines 50"
    
    echo ""
    echo -e "${CYAN}URLs:${NC}"
    echo "  🌐 Anwendung:              http://localhost:3000"
    echo "  👥 Team-Anmeldung:         http://localhost:3000/anmeldung"
    echo "  🤝 Helfer-Anmeldung:       http://localhost:3000/helfer"
    echo "  ⚙️  Admin:                 http://localhost:3000/admin"
    
    echo ""
    echo -e "${GREEN}✅ DEPLOYMENT ERFOLGREICH ABGESCHLOSSEN! ✅${NC}"
    echo -e "${YELLOW}💡 Tipp: Überwachen Sie die Memory-Nutzung regelmäßig mit 'free -h'${NC}"
    echo ""
}

# Main Execution
main() {
    print_header
    
    # Checks
    check_system
    
    # Installation
    install_dependencies
    optimize_environment
    
    # Build
    build_application
    cleanup_files
    
    # Deployment
    setup_pm2
    setup_systemd
    
    # Finale Checks
    final_checks
    
    # Summary
    print_summary
}

# Error Handler
trap 'echo -e "${RED}❌ Deployment fehlgeschlagen in Zeile $LINENO${NC}"; exit 1' ERR

# Script ausführen
main "$@"
