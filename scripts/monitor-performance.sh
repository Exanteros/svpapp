#!/bin/bash

# Performance monitoring script for 1vCore 1GB RAM server
# Run this to monitor your application

echo "🔍 SVP App Performance Monitor"
echo "=============================="

# Memory usage
echo "📊 Memory Usage:"
free -h

echo ""
echo "🏃 Process Information:"
ps aux | grep -E "(node|npm|next)" | grep -v grep

echo ""
echo "💾 Disk Usage:"
df -h | grep -E "(/$|/var)"

echo ""
echo "📈 System Load:"
uptime

echo ""
echo "🌐 Network Connections:"
netstat -tuln | grep -E ":3000|:80|:443"

echo ""
echo "📝 PM2 Status (if running):"
if command -v pm2 &> /dev/null; then
    pm2 status
else
    echo "PM2 not installed"
fi

echo ""
echo "🔥 Top Memory Consuming Processes:"
ps aux --sort=-%mem | head -10

echo ""
echo "💡 Memory Optimization Tips:"
echo "- Keep memory usage below 800MB"
echo "- Monitor PM2 restart frequency"
echo "- Check for memory leaks in logs"
echo "- Ensure swap is enabled for emergency"
