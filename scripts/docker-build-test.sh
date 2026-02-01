#!/bin/bash
# Build and test Docker image for Possumbly using BuildKit

set -e

echo "=== Building Possumbly Docker image with BuildKit ==="

# Use buildx with BuildKit
docker buildx build --load -t possumbly:latest .

echo ""
echo "=== Image built successfully ==="
docker images possumbly:latest

echo ""
echo "=== Testing image structure ==="
# Check the image has the right user
echo "Checking non-root user..."
docker run --rm possumbly:latest whoami | grep -q nodejs && echo "✓ Non-root user (nodejs) configured" || echo "✗ Non-root user check failed"

# Check entrypoint exists
echo "Checking entrypoint..."
docker run --rm --entrypoint cat possumbly:latest /entrypoint.sh > /dev/null && echo "✓ Entrypoint script present" || echo "✗ Entrypoint missing"

# Check node_modules exist
echo "Checking dependencies..."
docker run --rm --entrypoint ls possumbly:latest /app/node_modules > /dev/null && echo "✓ Node modules installed" || echo "✗ Node modules missing"

# Check dist exists
echo "Checking build artifacts..."
docker run --rm --entrypoint ls possumbly:latest /app/packages/server/dist > /dev/null && echo "✓ Server build present" || echo "✗ Server build missing"
docker run --rm --entrypoint ls possumbly:latest /app/packages/web/dist > /dev/null && echo "✓ Web build present" || echo "✗ Web build missing"

echo ""
echo "=== Quick start test (will fail without OAuth, but tests startup) ==="
echo "Testing container startup..."

# Create temp env file for testing
TEMP_ENV=$(mktemp)
cat > "$TEMP_ENV" << 'EOF'
SESSION_SECRET=test-secret-for-docker-build-only
PUBLIC_URL=http://localhost:3000
NODE_ENV=production
EOF

# Try to start and capture any immediate errors
timeout 10s docker run --rm --env-file "$TEMP_ENV" possumbly:latest 2>&1 | head -20 || true
rm -f "$TEMP_ENV"

echo ""
echo "=== Build and test complete ==="
echo ""
echo "To run in production, use docker-compose:"
echo "  1. Copy .env.example to .env and configure"
echo "  2. Run: docker-compose up -d"
echo ""
echo "For Unraid deployment, see UNRAID.md"
