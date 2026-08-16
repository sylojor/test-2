#!/bin/bash
# ============================================
# Deploy Script — BlivoAI Demo Server
# Run this on the HOST machine (141.95.55.5)
# Usage: ./deploy.sh
# ============================================

set -e

echo "🚀 BlivoAI — Starting deployment..."
echo "===================================="

# --- 1. Navigate to project directory ---
PROJECT_DIR="$HOME/blivoai-demo"
if [ ! -d "$PROJECT_DIR" ]; then
  echo "❌ Project directory not found at $PROJECT_DIR"
  echo "   Creating it and cloning from GitHub..."
  mkdir -p "$PROJECT_DIR"
  git clone https://github.com/sylojor/new-blivo.git "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"

# --- 2. Pull latest code from GitHub ---
echo ""
echo "[1/5] Pulling latest code from GitHub..."
git fetch origin
git reset --hard origin/main
echo "✓ Code updated!"

# --- 3. Create required directories ---
echo ""
echo "[2/5] Creating required directories..."
mkdir -p public/uploads/blog
mkdir -p public/uploads/branding
mkdir -p data
mkdir -p uploads
echo "✓ Directories created!"

# --- 4. Rebuild Docker containers ---
echo ""
echo "[3/5] Rebuilding Docker containers..."
docker compose up -d --build --force-recreate app
echo "✓ Containers rebuilt!"

# --- 5. Wait for container to be healthy ---
echo ""
echo "[4/5] Waiting for application to start..."
sleep 15

# Check container status
APP_STATUS=$(docker ps --filter "name=demo-chatbot" --format "{{.Status}}")
echo "  Container status: $APP_STATUS"

# --- 6. Verify deployment ---
echo ""
echo "[5/5] Verifying deployment..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ar)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ]; then
  echo "✓ Application is running (HTTP $HTTP_CODE)"
else
  echo "⚠ Application may not be ready yet (HTTP $HTTP_CODE)"
  echo "  Try: docker compose logs app"
fi

# Verify admin API
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/admin/rebuild)
echo "  Admin API status: $ADMIN_STATUS"

echo ""
echo "===================================="
echo "🚀 Deployment complete!"
echo ""
echo "To check logs: docker compose logs -f app"
echo "To restart: docker compose restart app"
echo "To stop: docker compose down"
