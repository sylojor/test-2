#!/bin/bash
cd /home/z/my-project
export PORT=3000
export HOSTNAME=0.0.0.0
export NODE_ENV=production

while true; do
  echo "Starting server at $(date)"
  node .next/standalone/server.js
  EXIT_CODE=$?
  echo "Server exited with code $EXIT_CODE at $(date)"
  sleep 2
done
