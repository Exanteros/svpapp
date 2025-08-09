#!/bin/bash

# Docker build and run script for SVP App

set -e

echo "🏗️  Building SVP App Docker image..."

# Build the Docker image
docker build -t svpapp:latest .

echo "✅ Build completed successfully!"

echo "🚀 Starting SVP App container..."

# Stop and remove existing container if it exists
docker stop svpapp 2>/dev/null || true
docker rm svpapp 2>/dev/null || true

# Create data directories if they don't exist
mkdir -p ./data
mkdir -p ./sessions

# Run the container
docker run -d \
  --name svpapp \
  --expose 3000 \
  -v "$(pwd)/data:/app/data" \
  -v "$(pwd)/sessions:/app/sessions" \
  --restart unless-stopped \
  svpapp:latest

echo "✅ Container started successfully!"
echo "🌐 Application is available internally on port 3000"
echo "🔗 Configure your reverse proxy to forward to container port 3000"
echo ""
echo "📋 Useful commands:"
echo "   View logs:    docker logs -f svpapp"
echo "   Stop app:     docker stop svpapp"
echo "   Restart app:  docker restart svpapp"
echo "   Remove app:   docker rm -f svpapp"
