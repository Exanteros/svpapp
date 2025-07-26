#!/bin/bash

# SVP App Setup Script
# Installiert alle Dependencies und bereitet die App für den Start vor

set -e  # Exit bei Fehlern

echo "🚀 SVP App Setup Script gestartet..."
echo "======================================"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funktion für farbigen Output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Prüfe ob Script im richtigen Verzeichnis läuft
if [ ! -f "package.json" ]; then
    print_error "package.json nicht gefunden! Bitte das Script im svpapp Verzeichnis ausführen."
    exit 1
fi

print_status "Prüfe System-Requirements..."

# Prüfe Betriebssystem
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    CYGWIN*)    MACHINE=Cygwin;;
    MINGW*)     MACHINE=MinGw;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

print_status "Betriebssystem erkannt: $MACHINE"

# Installiere Homebrew (nur macOS)
if [[ "$MACHINE" == "Mac" ]]; then
    if ! command -v brew &> /dev/null; then
        print_status "Homebrew wird installiert..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Füge Homebrew zum PATH hinzu
        if [[ -f "/opt/homebrew/bin/brew" ]]; then
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
        print_success "Homebrew installiert!"
    else
        print_success "Homebrew bereits installiert!"
    fi
fi

# Installiere Node.js
if ! command -v node &> /dev/null; then
    print_status "Node.js wird installiert..."
    
    if [[ "$MACHINE" == "Mac" ]]; then
        brew install node
    elif [[ "$MACHINE" == "Linux" ]]; then
        # Für Ubuntu/Debian
        if command -v apt-get &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        # Für CentOS/RHEL/Fedora
        elif command -v yum &> /dev/null; then
            curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
            sudo yum install -y nodejs npm
        fi
    fi
    
    print_success "Node.js installiert!"
else
    NODE_VERSION=$(node --version)
    print_success "Node.js bereits installiert: $NODE_VERSION"
fi

# Prüfe npm
if ! command -v npm &> /dev/null; then
    print_error "npm nicht gefunden! Node.js Installation fehlgeschlagen."
    exit 1
fi

NPM_VERSION=$(npm --version)
print_success "npm verfügbar: v$NPM_VERSION"

# Installiere pnpm (optional, schneller als npm)
if ! command -v pnpm &> /dev/null; then
    print_status "pnpm wird installiert (optional, für bessere Performance)..."
    npm install -g pnpm
    print_success "pnpm installiert!"
fi

# Installiere SQLite3 (falls nicht vorhanden)
if ! command -v sqlite3 &> /dev/null; then
    print_status "SQLite3 wird installiert..."
    
    if [[ "$MACHINE" == "Mac" ]]; then
        brew install sqlite
    elif [[ "$MACHINE" == "Linux" ]]; then
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y sqlite3 libsqlite3-dev
        elif command -v yum &> /dev/null; then
            sudo yum install -y sqlite sqlite-devel
        fi
    fi
    
    print_success "SQLite3 installiert!"
else
    SQLITE_VERSION=$(sqlite3 --version | cut -d' ' -f1)
    print_success "SQLite3 bereits installiert: $SQLITE_VERSION"
fi

print_status "Installiere Node.js Dependencies..."

# Cache leeren (falls vorhanden)
if [ -d "node_modules" ]; then
    print_status "Entferne alte node_modules..."
    rm -rf node_modules
fi

if [ -f "package-lock.json" ]; then
    print_status "Entferne package-lock.json..."
    rm package-lock.json
fi

# Installiere Dependencies
print_status "Installiere npm packages..."
npm install

print_success "Dependencies installiert!"

# Prüfe ob .env.local existiert
if [ ! -f ".env.local" ]; then
    print_status "Erstelle .env.local Datei..."
    cat > .env.local << EOL
# SVP App Environment Variables
# Database
DATABASE_URL="file:./database.sqlite"

# Email Configuration
EMAIL_DOMAIN="email.rasenturnier.sv-puschendorf.de"

# Next.js
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional: SendGrid (falls du es doch verwenden willst)
# SENDGRID_API_KEY="your-sendgrid-api-key"

# Development
NODE_ENV="development"
EOL
    print_success ".env.local erstellt!"
else
    print_warning ".env.local bereits vorhanden - wird nicht überschrieben"
fi

# Prüfe Datenbank
print_status "Prüfe Datenbank..."
if [ ! -f "database.sqlite" ]; then
    print_status "Datenbank wird initialisiert..."
    # Hier könntest du ein DB-Init-Script aufrufen
    touch database.sqlite
    print_success "Datenbank-Datei erstellt!"
else
    print_success "Datenbank bereits vorhanden!"
fi

# Installiere weitere nützliche Tools
print_status "Installiere zusätzliche Tools..."

# ngrok für Tunneling (optional)
if ! command -v ngrok &> /dev/null; then
    print_status "ngrok wird installiert (für Email-Testing)..."
    
    if [[ "$MACHINE" == "Mac" ]]; then
        brew install ngrok/ngrok/ngrok
    elif [[ "$MACHINE" == "Linux" ]]; then
        # Download ngrok
        curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
        echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
        sudo apt update && sudo apt install ngrok
    fi
    
    print_success "ngrok installiert!"
    print_warning "Registriere dich auf https://ngrok.com und führe 'ngrok authtoken YOUR_TOKEN' aus"
else
    print_success "ngrok bereits installiert!"
fi

# Baue das Projekt
print_status "Baue das Projekt..."
npm run build

print_success "Build erfolgreich!"

echo ""
echo "========================================"
echo -e "${GREEN}🎉 Setup komplett!${NC}"
echo "========================================"
echo ""
echo -e "${BLUE}Nächste Schritte:${NC}"
echo "1. Starte die App: ${YELLOW}npm run dev${NC}"
echo "2. Öffne Browser: ${YELLOW}http://localhost:3000${NC}"
echo "3. Für Email-Testing: ${YELLOW}./scripts/start-email-tunnel.sh${NC}"
echo ""
echo -e "${BLUE}Nützliche Befehle:${NC}"
echo "• ${YELLOW}npm run dev${NC}     - Startet Development Server"
echo "• ${YELLOW}npm run build${NC}   - Baut für Production"
echo "• ${YELLOW}npm run start${NC}   - Startet Production Server"
echo "• ${YELLOW}npm run lint${NC}    - Code-Qualitätsprüfung"
echo ""
echo -e "${BLUE}Email-System:${NC}"
echo "• Webhook-Endpoint: ${YELLOW}http://localhost:3000/api/email/receive${NC}"
echo "• Email-Domain: ${YELLOW}email.rasenturnier.sv-puschendorf.de${NC}"
echo "• Team-Mailboxes: ${YELLOW}9 bereits erstellt${NC}"
echo ""
echo -e "${GREEN}Viel Erfolg mit der SVP App! 🚀${NC}"
