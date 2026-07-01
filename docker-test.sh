#!/bin/bash

# Quick Docker build and test script

set -e

echo "🔧 Testing Docker build..."

# Build the image
docker build -t svpapp:test .

echo "✅ Build successful!"

echo "🧪 Running quick test..."

# Run a quick test container
TEST_CONTAINER=$(docker run -d -p 3001:3000 svpapp:test)

# Wait a few seconds for startup
sleep 10

# Test if the application responds
if curl -f http://localhost:3001 >/dev/null 2>&1; then
    echo "✅ Application is responding correctly!"
else
    echo "❌ Application test failed!"
    docker logs $TEST_CONTAINER
    docker stop $TEST_CONTAINER
    docker rm $TEST_CONTAINER
    exit 1
fi

# Cleanup
docker stop $TEST_CONTAINER
docker rm $TEST_CONTAINER

echo "🎉 All tests passed! Ready for production."
echo ""
echo "To start the production container, run:"
echo "  ./docker-run.sh"
echo ""
echo "Or use docker-compose:"
echo "  docker-compose up -d"
