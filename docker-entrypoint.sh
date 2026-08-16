#!/bin/sh
set -e

echo "BlivoAI — Starting..."

# --- 1. Generate Prisma Client ---
echo "Generating Prisma Client..."
node /app/node_modules/prisma/build/index.js generate || {
  echo "Prisma generate failed, trying db push directly..."
}

# --- 2. Apply pending migrations (safe — no data loss) ---
echo "Applying database migrations..."
node /app/node_modules/prisma/build/index.js migrate deploy 2>/dev/null || {
  echo "Warning: migrate deploy failed — database may need initial setup"
  echo "If this is a fresh install, run: npx prisma migrate deploy --schema /app/prisma/schema.prisma"
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
CRON_SECRET=${CRON_SECRET:?CRON_SECRET must be set}
echo "Starting invoice reminder cron (every hour)..."
while true; do
  sleep 3600
  wget -qO- "http://localhost:${PORT:-3000}/api/cron/invoice-reminders?secret=$CRON_SECRET" > /dev/null 2>&1 || true
done &

wait
