#!/bin/bash

# Cloudflare Tunnel Setup für SVP Email System
# Tunnelt HTTP (3000) und SMTP (2525) über Cloudflare

echo "☁️ Cloudflare Tunnel Setup für SVP App"
echo "======================================"

# Prüfe ob cloudflared installiert ist
if ! command -v cloudflared &> /dev/null; then
    echo "📦 Installiere cloudflared..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install cloudflared
    else
        echo "❌ Bitte installiere cloudflared manuell"
        echo "https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
        exit 1
    fi
fi

# Prüfe Services
echo "🔍 Prüfe Services..."

if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Next.js App läuft nicht auf Port 3000"
    echo "Starte zuerst: npm run dev"
    exit 1
fi

echo "✅ HTTP Service (3000) läuft"

# SMTP Check ist optional da er integriert sein sollte
if nc -z localhost 2525 2>/dev/null; then
    echo "✅ SMTP Service (2525) läuft"
    SMTP_AVAILABLE=true
else
    echo "⚠️ SMTP Service (2525) nicht erreichbar - nur HTTP-Tunnel"
    SMTP_AVAILABLE=false
fi

echo ""
echo "=== TUNNEL KONFIGURATION ==="
echo "1. HTTP + SMTP Tunnel (getrennte URLs)"
echo "2. Nur HTTP Tunnel (für Webhook-Tests)"
echo "3. HTTP mit SMTP-Bridge (alles über HTTP)"
echo ""

read -p "Wähle eine Option (1-3): " choice

case $choice in
    1)
        if [ "$SMTP_AVAILABLE" = true ]; then
            echo "🚀 Starte Cloudflare Tunnel für HTTP + SMTP..."
            
            # HTTP Tunnel in Background
            echo "🌐 Starte HTTP Tunnel (Port 3000)..."
            cloudflared tunnel --url http://localhost:3000 > /tmp/cf-http.log 2>&1 &
            HTTP_PID=$!
            
            echo "⏳ Warte auf HTTP Tunnel URL..."
            sleep 5
            
            # Zeige HTTP URL mit verbesserter Erkennung
            HTTP_URL=""
            for i in {1..10}; do
                if [ -f /tmp/cf-http.log ]; then
                    HTTP_URL=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' /tmp/cf-http.log | head -1)
                    if [ ! -z "$HTTP_URL" ]; then
                        break
                    fi
                fi
                sleep 1
                echo "  Versuche $i/10..."
            done
            
            if [ ! -z "$HTTP_URL" ]; then
                echo "✅ HTTP Tunnel: $HTTP_URL"
                echo "📧 Webhook: $HTTP_URL/api/email/receive"
                echo "🖥️  Admin: $HTTP_URL/admin"
            else
                echo "⚠️  HTTP URL nicht erkannt - prüfe /tmp/cf-http.log"
                echo "📄 Log-Inhalt:"
                cat /tmp/cf-http.log | head -10
            fi
            
            # SMTP Tunnel in Background  
            echo ""
            echo "📧 Starte SMTP Tunnel (Port 2525)..."
            cloudflared tunnel --url tcp://localhost:2525 > /tmp/cf-smtp.log 2>&1 &
            SMTP_PID=$!
            
            echo "⏳ Warte auf SMTP Tunnel URL..."
            sleep 5
            
            # Zeige SMTP URL mit verbesserter Erkennung
            SMTP_URL=""
            for i in {1..10}; do
                if [ -f /tmp/cf-smtp.log ]; then
                    SMTP_URL=$(grep -o '[a-zA-Z0-9-]*\.trycloudflare\.com:[0-9]*' /tmp/cf-smtp.log | head -1)
                    if [ ! -z "$SMTP_URL" ]; then
                        break
                    fi
                fi
                sleep 1
                echo "  Versuche $i/10..."
            done
            
            if [ ! -z "$SMTP_URL" ]; then
                echo "✅ SMTP Tunnel: $SMTP_URL"
                echo "📝 MX Record: $SMTP_URL"
            else
                echo "⚠️  SMTP URL nicht erkannt - prüfe /tmp/cf-smtp.log"
                echo "📄 Log-Inhalt:"
                cat /tmp/cf-smtp.log | head -10
            fi
            
            echo ""
            echo "🎉 Beide Tunnel aktiv!"
            echo "Drücke Ctrl+C zum Beenden"
            
            # Cleanup function
            cleanup() {
                echo ""
                echo "🛑 Stoppe Tunnel..."
                kill $HTTP_PID $SMTP_PID 2>/dev/null
                rm -f /tmp/cf-http.log /tmp/cf-smtp.log
                exit 0
            }
            
            trap cleanup INT TERM
            wait
        else
            echo "❌ SMTP Service nicht verfügbar"
            exit 1
        fi
        ;;
        
    2)
        echo "🚀 Starte Cloudflare HTTP Tunnel..."
        echo "💡 Für Email-Tests verwende HTTP Webhook"
        echo ""
        
        cloudflared tunnel --url http://localhost:3000
        ;;
        
    3)
        echo "🚀 Starte HTTP Tunnel mit SMTP-Bridge..."
        echo "💡 SMTP-Emails werden über HTTP-Bridge geleitet"
        echo ""
        
        # Nur HTTP Tunnel
        cloudflared tunnel --url http://localhost:3000 &
        PID=$!
        
        echo ""
        echo "📧 SMTP-Bridge verfügbar unter: [URL]/api/email/smtp-bridge"
        echo "Drücke Ctrl+C zum Beenden"
        
        trap "kill $PID 2>/dev/null; exit" INT TERM
        wait $PID
        ;;
        
    *)
        echo "❌ Ungültige Auswahl!"
        exit 1
        ;;
esac
