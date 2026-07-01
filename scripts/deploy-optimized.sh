#!/bin/bash

# Optimized deployment script for 1vCore 1GB RAM server

set -e

echo "🚀 SVP App Optimized Deployment"
echo "==============================="

# Check system resources
echo "📊 Checking system resources..."
MEMORY=$(free -m | grep '^Mem:' | awk '{print $2}')
if [ $MEMORY -lt 900 ]; then
    echo "⚠️  Warning: Only ${MEMORY}MB RAM available. Consider adding swap."
fi

# Set memory-optimized environment
export NODE_OPTIONS="--max-old-space-size=512"
export NEXT_TELEMETRY_DISABLED=1

echo "📦 Installing dependencies..."
npm ci --only=production --prefer-offline

echo "🏗️  Building application with memory limits..."
NODE_OPTIONS="--max-old-space-size=700" npm run build:prod

echo "🧹 Cleaning up unnecessary files..."
rm -rf .next/cache/webpack
rm -rf node_modules/.cache
npm cache clean --force

echo "🔄 Restarting PM2 application..."
if command -v pm2 &> /dev/null; then
    pm2 reload ecosystem.prod.config.js --env production
else
    echo "Starting with npm..."
    npm run start:prod &
fi

echo "✅ Deployment completed!"
echo "📊 Final memory check:"
free -h

echo ""
echo "💡 Post-deployment tips:"
echo "- Monitor memory usage: free -h"
echo "- Check PM2 logs: pm2 logs"
echo "- Monitor performance: ./scripts/monitor-performance.sh"
