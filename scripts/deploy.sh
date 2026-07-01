#!/bin/bash

# SVP App Deployment Script
# Usage: ./scripts/deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
APP_DIR="/var/www/svpapp"
BACKUP_DIR="/var/backups/svpapp"
LOG_FILE="/var/log/svpapp/deploy.log"

echo "🚀 Starting deployment for environment: $ENVIRONMENT"
echo "$(date): Starting deployment" >> $LOG_FILE

# Create necessary directories
sudo mkdir -p /var/log/svpapp
sudo mkdir -p $BACKUP_DIR
sudo chown -R $USER:$USER /var/log/svpapp
sudo chown -R $USER:$USER $BACKUP_DIR

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" | tee -a $LOG_FILE
}

# Function to handle errors
handle_error() {
    log "❌ Error occurred during deployment: $1"
    log "🔄 Rolling back to previous version..."
    
    if [ -f "$BACKUP_DIR/database_pre_deploy.sqlite" ]; then
        cp "$BACKUP_DIR/database_pre_deploy.sqlite" "$APP_DIR/database.sqlite"
        log "📊 Database rolled back"
    fi
    
    if pm2 list | grep -q svpapp; then
        pm2 restart svpapp
        log "🔄 Application restarted"
    fi
    
    exit 1
}

# Set error handler
trap 'handle_error "Deployment failed"' ERR

log "📋 Pre-deployment checks..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    log "❌ PM2 is not installed. Installing..."
    npm install -g pm2
fi

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    log "❌ App directory does not exist: $APP_DIR"
    exit 1
fi

cd $APP_DIR

log "💾 Creating backup..."
# Backup current database
if [ -f "database.sqlite" ]; then
    cp database.sqlite "$BACKUP_DIR/database_pre_deploy.sqlite"
    log "✅ Database backup created"
fi

# Backup current code
if [ -d ".git" ]; then
    CURRENT_COMMIT=$(git rev-parse HEAD)
    echo $CURRENT_COMMIT > "$BACKUP_DIR/previous_commit.txt"
    log "✅ Current commit saved: $CURRENT_COMMIT"
fi

log "📥 Pulling latest code..."
git fetch origin
git reset --hard origin/main

log "📦 Installing dependencies..."
npm ci --production --silent

log "🏗️ Building application..."
npm run build

log "🔧 Running database migrations..."
if [ -f "migrate-db.mjs" ]; then
    node migrate-db.mjs
    log "✅ Database migrations completed"
fi

log "🔄 Restarting application..."
if pm2 list | grep -q svpapp; then
    pm2 reload svpapp --env $ENVIRONMENT
    log "✅ Application reloaded"
else
    pm2 start ecosystem.config.js --env $ENVIRONMENT
    log "✅ Application started"
fi

# Wait for application to start
sleep 5

log "🏥 Running health check..."
HEALTH_CHECK_URL="http://127.0.0.1:3000/api/health"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_CHECK_URL || echo "000")

if [ "$HEALTH_RESPONSE" = "200" ]; then
    log "✅ Health check passed"
else
    handle_error "Health check failed with status: $HEALTH_RESPONSE"
fi

log "🧹 Cleaning up old backups..."
find $BACKUP_DIR -name "database_*.sqlite" -mtime +7 -delete
find $BACKUP_DIR -name "*.log" -mtime +30 -delete

log "✅ Deployment completed successfully!"
log "📊 Application status:"
pm2 status svpapp

# Send notification (optional)
if command -v mail &> /dev/null; then
    echo "SVP App deployment completed successfully at $(date)" | mail -s "Deployment Success" admin@sv-puschendorf.de
fi

echo "🎉 Deployment finished! Check logs: tail -f $LOG_FILE"
