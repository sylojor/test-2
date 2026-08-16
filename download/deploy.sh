#!/bin/bash
# Deploy script for demo.blivoai.com
# Run this on the server (141.95.55.5) as root:
#   ssh root@141.95.55.5
#   cd /opt/blivoai && git pull origin main && docker compose up -d --build --no-deps app
# 
# Or copy this script and run:
#   scp deploy.sh root@141.95.55.5:/tmp/deploy.sh
#   ssh root@141.95.55.5 'bash /tmp/deploy.sh'

echo "=== Deploying BlivoAI Demo ==="
cd /opt/blivoai

echo "[1] Pulling latest code..."
git pull origin main

echo "[2] Creating uploads directory..."
mkdir -p public/uploads/blog

echo "[3] Rebuilding Docker container..."
docker compose up -d --build --no-deps app

echo "[4] Waiting for container..."
sleep 15

echo "[5] Checking status..."
docker ps --filter name=demo --format "{{.Names}} {{.Status}}"

echo "=== Deployment complete! ==="
