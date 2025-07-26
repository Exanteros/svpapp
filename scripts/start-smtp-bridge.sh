#!/bin/bash

# SMTP Email Bridge Starter
# Startet den SMTP-Server für Email-Empfang

echo "🚀 SVP Email Bridge Starter"
echo "=========================="

# Prüfe ob Node.js läuft
if ! command -v node &> /dev/null; then
    echo "❌ Node.js nicht gefunden!"
    exit 1
fi

# Prüfe ob Next.js App läuft
if ! curl -s http://localhost:3000/api/email/receive > /dev/null; then
    echo "❌ Next.js App läuft nicht auf http://localhost:3000"
    echo "Starte zuerst: npm run dev"
    exit 1
fi

echo "✅ Next.js App läuft"

# Starte SMTP Bridge
echo "🚀 Starte SMTP-to-HTTP Bridge..."
echo ""

# Optional: Webhook URL anpassen
WEBHOOK_URL=${1:-"http://localhost:3000/api/email/receive"}
SMTP_PORT=${2:-2525}

echo "📡 SMTP Port: $SMTP_PORT"
echo "🔗 Webhook: $WEBHOOK_URL"
echo ""

# Starte Bridge
node scripts/smtp-bridge.js "$WEBHOOK_URL" "$SMTP_PORT"
