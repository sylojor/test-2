#!/bin/bash
# ============================================
# Cron Job: Auto-deploy watcher for BlivoAI Demo
# Run this every 1 minute on the HOST server via cron:
#   * * * * * $HOME/blivoai-demo/auto-deploy-watcher.sh >> /var/log/blivoai-deploy.log 2>&1
#
# This script monitors a signal file written by the Next.js app
# inside the Docker container's shared volume (/app/data).
# When the signal file is detected, it triggers a full rebuild.
# ============================================

PROJECT_DIR="$HOME/blivoai-demo"
SIGNAL_FILE="" # Will be determined based on Docker volume path
DEPLOY_SCRIPT="$PROJECT_DIR/deploy.sh"

# Find the signal file - it's in the demo-chatbot-data Docker volume
# The volume is mounted at /app/data inside the container
# On the host, we need to find where Docker stores this volume

# Try to find the Docker volume mount point
VOLUME_PATH=$(docker volume inspect demo-chatbot-data --format '{{.Mountpoint}}' 2>/dev/null)

if [ -z "$VOLUME_PATH" ]; then
  # Alternative: check common Docker volume locations
  for path in "/var/lib/docker/volumes/demo-chatbot-data/_data" \
              "/mnt/docker/volumes/demo-chatbot-data/_data"; do
    if [ -d "$path" ]; then
      VOLUME_PATH="$path"
      break
    fi
  done
fi

if [ -z "$VOLUME_PATH" ]; then
  echo "ERROR: Cannot find Docker volume mount point for demo-chatbot-data"
  echo "       Make sure the volume exists and Docker is running"
  exit 1
fi

SIGNAL_FILE="$VOLUME_PATH/rebuild-requested.signal"
STATUS_FILE="$VOLUME_PATH/rebuild-status.json"

# Check if signal file exists
if [ ! -f "$SIGNAL_FILE" ]; then
  # No rebuild requested, exit silently
  exit 0
fi

echo "========================================"
echo "$(date) — Rebuild signal detected!"
echo "========================================"

# Read signal info
SIGNAL_INFO=$(cat "$SIGNAL_FILE")
echo "Signal info: $SIGNAL_INFO"

# Update status file to indicate rebuild is starting
cat > "$STATUS_FILE" << EOF
{"status":"rebuilding","timestamp":$(date +%s)000,"message":"جاري إعادة البناء..."}
EOF

# Remove signal file before rebuild (to prevent double-trigger)
rm -f "$SIGNAL_FILE"

# Run the deploy script
echo "Running deploy script..."
if [ -f "$DEPLOY_SCRIPT" ]; then
  bash "$DEPLOY_SCRIPT"
  DEPLOY_EXIT=$?
else
  echo "Deploy script not found at $DEPLOY_SCRIPT"
  echo "Running manual deployment..."
  
  cd "$PROJECT_DIR"
  git fetch origin
  git reset --hard origin/main
  docker compose up -d --build --force-recreate app
  DEPLOY_EXIT=$?
fi

# Update status file based on result
if [ $DEPLOY_EXIT -eq 0 ]; then
  cat > "$STATUS_FILE" << EOF
{"status":"completed","timestamp":$(date +%s)000,"message":"تم إعادة البناء بنجاح!"}
EOF
  echo "✓ Deployment completed successfully!"
else
  cat > "$STATUS_FILE" << EOF
{"status":"failed","timestamp":$(date +%s)000,"message":"فشل إعادة البناء — تحقق من السجلات"}
EOF
  echo "✗ Deployment failed! Check logs: docker compose logs app"
fi

echo "========================================"
