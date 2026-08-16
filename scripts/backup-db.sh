#!/bin/bash
# ============================================
# BlivoAI Database Backup Script
# ============================================
# Usage: ./scripts/backup-db.sh [backup_dir]
# Default backup dir: ./backups
#
# Run BEFORE any deployment.
# ============================================

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/blivoai_${TIMESTAMP}.sql.gz"
COMPOSE_PROJECT=$(docker compose ps --format '{{.Project}}' 2>/dev/null | head -1)

# Determine container name
if docker ps --format '{{.Names}}' | grep -q 'blivo-postgres'; then
    DB_CONTAINER='blivo-postgres'
elif docker ps --format '{{.Names}}' | grep -q 'postgres'; then
    DB_CONTAINER=$(docker ps --format '{{.Names}}' | grep postgres | head -1)
else
    echo "ERROR: No running PostgreSQL container found." >&2
    exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "Backing up ${DB_CONTAINER} to ${BACKUP_FILE}..."
docker exec "$DB_CONTAINER" pg_dump -U blivoai blivoai | gzip > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "Backup complete: ${BACKUP_FILE} (${SIZE})"
echo "To restore: gunzip -c ${BACKUP_FILE} | docker exec -i ${DB_CONTAINER} psql -U blivoai blivoai"