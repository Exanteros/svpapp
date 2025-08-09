#!/bin/bash

echo "🚀 Setting up Email Tunnel for sv-puschendorf.de"
echo "=================================================="

# Check if ngrok is installed
if command -v ngrok &> /dev/null; then
    echo "✅ ngrok found"
    TUNNEL_CMD="ngrok http 3000"
elif command -v serveo &> /dev/null; then
    echo "✅ serveo found" 
    TUNNEL_CMD="ssh -R 80:localhost:3000 serveo.net"
else
    echo "❌ No tunnel service found. Installing ngrok..."
    
    # Install ngrok on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install ngrok
            TUNNEL_CMD="ngrok http 3000"
        else
            echo "Please install Homebrew first: https://brew.sh"
            exit 1
        fi
    else
        echo "Please install ngrok manually: https://ngrok.com/download"
        exit 1
    fi
fi

echo ""
echo "🔧 Next.js Server should be running on http://localhost:3000"
echo "📧 Email webhook endpoint: /api/email/receive"
echo ""
echo "Starting tunnel..."
echo "Command: $TUNNEL_CMD"
echo ""

# Start tunnel
$TUNNEL_CMD
