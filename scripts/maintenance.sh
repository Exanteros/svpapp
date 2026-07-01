#!/bin/bash

# 🛠️ SVP App Maintenance Script
# Wartung und Optimierung

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}🛠️  SVP App Maintenance${NC}"
    echo -e "${BLUE}======================${NC}"
}

clean_logs() {
    echo -e "${BLUE}📜 Log-Cleanup...${NC}"
    
    # PM2 Logs rotieren
    pm2 flush
    
    # Alte Logs löschen (älter als 7 Tage)
    find /var/log -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    # Next.js Cache leeren
    rm -rf .next/cache/* 2>/dev/null || true
    
    echo -e "${GREEN}✅ Logs bereinigt${NC}"
}

clean_cache() {
    echo -e "${BLUE}🧹 Cache-Cleanup...${NC}"
    
    # NPM Cache
    npm cache clean --force
    
    # System Cache (falls Root)
    if [ "$EUID" -eq 0 ]; then
        sync && echo 3 > /proc/sys/vm/drop_caches
    fi
    
    echo -e "${GREEN}✅ Cache bereinigt${NC}"
}

optimize_database() {
    echo -e "${BLUE}🗄️  Database Optimization...${NC}"
    
    # SQLite VACUUM (falls möglich)
    if [ -f "database.sqlite" ]; then
        sqlite3 database.sqlite "VACUUM;"
        sqlite3 database.sqlite "ANALYZE;"
        echo -e "${GREEN}✅ Database optimiert${NC}"
    else
        echo -e "${YELLOW}⚠️  Database nicht gefunden${NC}"
    fi
}

check_memory() {
    echo -e "${BLUE}💾 Memory Check...${NC}"
    
    MEMORY_USED=$(free -m | grep '^Mem:' | awk '{print $3}')
    MEMORY_TOTAL=$(free -m | grep '^Mem:' | awk '{print $2}')
    MEMORY_PERCENT=$((MEMORY_USED * 100 / MEMORY_TOTAL))
    
    if [ $MEMORY_PERCENT -gt 80 ]; then
        echo -e "${RED}⚠️  Memory-Nutzung hoch: ${MEMORY_PERCENT}%${NC}"
        echo "💡 PM2 Restart empfohlen"
        
        read -p "PM2 neustarten? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            pm2 restart svpapp-prod
        fi
    else
        echo -e "${GREEN}✅ Memory OK: ${MEMORY_PERCENT}%${NC}"
    fi
}

restart_services() {
    echo -e "${BLUE}🔄 Service Restart...${NC}"
    
    # Graceful restart
    pm2 reload svpapp-prod
    
    echo -e "${GREEN}✅ Services restarted${NC}"
}

backup_data() {
    echo -e "${BLUE}💾 Backup erstellen...${NC}"
    
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p $BACKUP_DIR
    
    # Database Backup
    if [ -f "database.sqlite" ]; then
        cp database.sqlite $BACKUP_DIR/
    fi
    
    # Config Backup
    cp .env.production $BACKUP_DIR/ 2>/dev/null || true
    cp ecosystem.prod.config.js $BACKUP_DIR/ 2>/dev/null || true
    
    echo -e "${GREEN}✅ Backup erstellt: $BACKUP_DIR${NC}"
}

show_status() {
    echo -e "${BLUE}📊 System Status${NC}"
    echo "=================="
    
    # Memory
    free -h
    echo ""
    
    # Disk
    df -h | grep -E "(/$|/var)"
    echo ""
    
    # PM2
    pm2 status
    echo ""
    
    # Load
    uptime
}

# Menu
case "${1:-menu}" in
    "clean")
        print_header
        clean_logs
        clean_cache
        ;;
    "db")
        print_header
        optimize_database
        ;;
    "memory")
        print_header
        check_memory
        ;;
    "restart")
        print_header
        restart_services
        ;;
    "backup")
        print_header
        backup_data
        ;;
    "status")
        print_header
        show_status
        ;;
    "all")
        print_header
        backup_data
        clean_logs
        clean_cache
        optimize_database
        check_memory
        restart_services
        show_status
        ;;
    *)
        print_header
        echo "🎯 Verfügbare Optionen:"
        echo "  ./maintenance.sh clean    - Logs & Cache bereinigen"
        echo "  ./maintenance.sh db       - Database optimieren"
        echo "  ./maintenance.sh memory   - Memory prüfen"
        echo "  ./maintenance.sh restart  - Services neustarten"
        echo "  ./maintenance.sh backup   - Backup erstellen"
        echo "  ./maintenance.sh status   - Status anzeigen"
        echo "  ./maintenance.sh all      - Alles ausführen"
        ;;
esac
