#!/bin/bash

# Multi-Port Tunnel für SVP Email System
# Tunnelt sowohl HTTP (3000) als auch SMTP (2525) über verschiedene Services

echo "🌐 Multi-Port Tunnel Setup für SVP App"
echo "======================================"

# Prüfe ob Apps laufen
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Next.js App läuft nicht auf Port 3000"
    echo "Starte zuerst: npm run dev"
    exit 1
fi

if ! nc -z localhost 2525; then
    echo "❌ SMTP Server läuft nicht auf Port 2525"
    echo "Der integrierte SMTP-Server sollte automatisch starten"
    exit 1
fi

echo "✅ Beide Services laufen"
echo ""

echo "=== TUNNEL OPTIONEN ==="
echo "1. Cloudflare Tunnel (HTTP + SMTP über subdomain)"
echo "2. LocalTunnel (HTTP) + SSH Port Forward (SMTP)"
echo "3. Serveo (HTTP + SMTP über SSH)"
echo "4. Nur HTTP Tunnel (für Webhook-Tests)"
echo ""

read -p "Wähle eine Option (1-4): " choice

case $choice in
    1)
        # Cloudflare Tunnel
        echo "🚀 Starte Cloudflare Tunnel..."
        echo "✅ Unterstützt mehrere Ports über Subdomains"
        
        # HTTP Tunnel
        echo "🌐 HTTP (Port 3000):"
        cloudflared tunnel --url http://localhost:3000 &
        HTTP_PID=$!
        sleep 3
        
        # SMTP Tunnel über andere Subdomain  
        echo "📧 SMTP (Port 2525):"
        cloudflared tunnel --url tcp://localhost:2525 &
        SMTP_PID=$!
        
        echo ""
        echo "✅ Beide Tunnel gestartet!"
        echo "📝 HTTP: Siehe Terminal-Output für URL"
        echo "📧 SMTP: Siehe Terminal-Output für URL"
        echo ""
        echo "Drücke Ctrl+C zum Beenden"
        
        # Wait und cleanup
        trap "kill $HTTP_PID $SMTP_PID 2>/dev/null; exit" INT TERM
        wait
        ;;
        
    2)
        # LocalTunnel + SSH
        if ! command -v lt &> /dev/null; then
            echo "📦 Installiere LocalTunnel..."
            npm install -g localtunnel
        fi
        
        echo "🚀 LocalTunnel für HTTP + SSH für SMTP..."
        
        # HTTP über LocalTunnel
        lt --port 3000 &
        LT_PID=$!
        
        # SMTP über SSH (benötigt Server)
        echo "📧 SMTP über SSH-Port-Forward:"
        echo "Konfiguriere deinen Server für Port-Forward zu localhost:2525"
        
        trap "kill $LT_PID 2>/dev/null; exit" INT TERM
        wait $LT_PID
        ;;
        
    3)
        # Serveo
        echo "🚀 Serveo SSH Tunnel..."
        
        # HTTP
        ssh -R 80:localhost:3000 serveo.net &
        HTTP_PID=$!
        
        # SMTP (falls Serveo es unterstützt)
        ssh -R 25:localhost:2525 serveo.net &
        SMTP_PID=$!
        
        trap "kill $HTTP_PID $SMTP_PID 2>/dev/null; exit" INT TERM
        wait
        ;;
        
    4)
        # Nur HTTP für Tests
        echo "🚀 Nur HTTP-Tunnel für Webhook-Tests..."
        echo "💡 SMTP-Tests müssen lokal erfolgen"
        
        if command -v cloudflared &> /dev/null; then
            cloudflared tunnel --url http://localhost:3000
        elif command -v lt &> /dev/null; then
            lt --port 3000
        else
            echo "📦 Installiere LocalTunnel..."
            npm install -g localtunnel
            lt --port 3000
        fi
        ;;
        
    *)
        echo "❌ Ungültige Auswahl!"
        exit 1
        ;;
esac
