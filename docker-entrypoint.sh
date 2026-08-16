#!/bin/sh
# Production entrypoint — failures are fatal
set -e

echo "[entrypoint] BlivoAI starting..."

# --- 1. Generate Prisma Client (from pre-copied schema) ---
echo "[entrypoint] Generating Prisma Client..."
node /app/node_modules/prisma/build/index.js generate

# --- 2. Apply database migrations (fatal on failure) ---
echo "[entrypoint] Applying database migrations..."
node /app/node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] Migrations applied successfully."

# --- 3. Create data directories ---
mkdir -p /app/data /app/data/uploads /app/data/branding /app/uploads /app/public/uploads

# --- 4. Start server in background ---
echo "[entrypoint] Starting production server on port ${PORT:-3001}..."
node server.js &
SERVER_PID=$!

# --- 5. Start invoice reminder cron (if CRON_SECRET is set) ---
if [ -n "$CRON_SECRET" ]; then
  echo "[entrypoint] Invoice reminder cron enabled (interval: 60 min)."
  while true; do
    sleep 3600
    wget -qO- "http://localhost:${PORT:-3001}/api/cron/invoice-reminders?secret=$CRON_SECRET" > /dev/null 2>&1 || true
  done &
  CRON_PID=$!
else
  echo "[entrypoint] CRON_SECRET not set — invoice reminder cron disabled."
  CRON_PID=
fi

# --- 6. Wait for server process ---
echo "[entrypoint] Server started (PID $SERVER_PID). Waiting..."
wait $SERVER_PID
EXIT_CODE=$?

echo "[entrypoint] Server exited with code $EXIT_CODE. Container will stop."
exit $EXIT_CODE
