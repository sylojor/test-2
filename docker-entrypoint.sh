#!/bin/sh
set -e

echo "BlivoAI — Starting..."

# --- 1. Generate Prisma Client ---
echo "Generating Prisma Client..."
node /app/node_modules/prisma/build/index.js generate || {
  echo "Prisma generate failed, trying db push directly..."
}

# --- 2. Sync database schema ---
echo "Syncing database schema..."
node /app/node_modules/prisma/build/index.js db push --accept-data-loss 2>/dev/null || {
  echo "Warning: db push failed — database may already be set up"
}

# --- 3. Seed admin user ---
echo "Creating admin user..."
node /app/node_modules/prisma/build/index.js db seed 2>/dev/null || {
  echo "Warning: seed failed — admin may already exist"
}

# --- 4. Create data directories ---
mkdir -p /app/data /app/data/uploads /app/data/branding /app/uploads /app/public/uploads

# --- 5. Start server ---
echo "Ready! Starting production server..."
exec node server.js &

# --- 6. Start invoice reminder cron (every hour) ---
CRON_SECRET=${CRON_SECRET:-blivoai-cron-2024}
echo "Starting invoice reminder cron (every hour)..."
while true; do
  sleep 3600
  wget -qO- "http://localhost:${PORT:-3000}/api/cron/invoice-reminders?secret=$CRON_SECRET" > /dev/null 2>&1 || true
done &

wait
