#!/bin/bash

# Einfacher Cloudflare HTTP-Tunnel Test

echo "☁️ Cloudflare HTTP-Tunnel Test"
echo "=============================="

# Prüfe Next.js
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Next.js läuft nicht auf Port 3000"
    echo "Starte zuerst: npm run dev"
    exit 1
fi

echo "✅ Next.js läuft"
echo ""
echo "🚀 Starte Cloudflare Tunnel..."
echo "⏳ URL erscheint in wenigen Sekunden..."
echo ""

# Starte Tunnel
cloudflared tunnel --url http://localhost:3000
