#!/bin/bash
# ============================================
# Deploy Script — One Employer Company
# Contabo VPS (Ubuntu 24.04 + 12GB RAM)
#
# هذا السكربت يجهّز السيرفر كامل:
# 1. Docker + Docker Compose
# 2. PostgreSQL
# 3. Next.js (OEC)
# 4. Caddy (Reverse Proxy + SSL)
# 5. نسخ احتياطي تلقائي
# 6. Firewall
#
# تشغيل:
#   chmod +x deploy.sh && ./deploy.sh
# ============================================

set -e

echo "========================================"
echo "  One Employer Company — Deploy"
echo "========================================"

# --- إعدادات ---
OEC_DIR="/opt/oec"
DB_USER="oec_user"
DB_PASS="oec_secure_password_2024"
DB_NAME="oec_db"
DOMAIN="one-employer.com"
GITHUB_REPO="https://github.com/sylojor/one-employer-company.git"
GITHUB_TOKEN="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"

# --- 1. تحديث النظام ---
echo "[1/8] Updating system..."
apt update && apt upgrade -y

# --- 2. تثبيت Docker ---
echo "[2/8] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "Docker installed!"
else
    echo "Docker already installed."
fi

# --- 3. تثبيت Docker Compose ---
echo "[3/8] Installing Docker Compose..."
if ! command -v docker compose &> /dev/null; then
    apt install -y docker-compose-plugin
    echo "Docker Compose installed!"
else
    echo "Docker Compose already installed."
fi

# --- 4. Firewall ---
echo "[4/8] Setting up firewall..."
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
echo "Firewall configured!"

# --- 5. إنشاء مجلد المشروع ---
echo "[5/8] Cloning project..."
mkdir -p $OEC_DIR
cd $OEC_DIR

# نسخ المشروع من GitHub
git clone "https://sylojor:${GITHUB_TOKEN}@github.com/sylojor/one-employer-company.git" . 2>/dev/null || {
    echo "Already cloned, pulling latest..."
    git pull origin main 2>/dev/null || echo "Pull failed, continuing..."
}

# --- 6. تشغيل Docker Compose ---
echo "[6/8] Starting services..."
cd $OEC_DIR

# تحديث .env للإنتاج
cat > .env.production << EOF
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@db:5432/${DB_NAME}?schema=public
NODE_ENV=production
LLM_PROVIDER=mock
LLM_API_KEY=
LLM_API_URL=
NEXT_PUBLIC_SITE_URL=https://${DOMAIN}
EOF

# تحديث Caddyfile للdomain الحقيقي
# (لو ما عندك domain — Caddy بيشتغل على IP بدون SSL)
cat > Caddyfile << 'CADDYEOF'
# --- لو ما عندك domain — استخدم IP ---
:80 {
    reverse_proxy app:3000 {
        header_up Host {host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Real-IP {remote_host}
    }
    encode gzip
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        -Server
    }
}

# --- لو عندك domain — uncomment هاد ---
# ${DOMAIN} {
#     reverse_proxy app:3000 {
#         header_up Host {host}
#         header_up X-Forwarded-For {remote_host}
#         header_up X-Forwarded-Proto {scheme}
#         header_up X-Real-IP {remote_host}
#     }
#     encode gzip
#     header {
#         X-Content-Type-Options nosniff
#         X-Frame-Options DENY
#         -Server
#     }
#     @static path *.js *.css *.svg *.png *.jpg *.ico *.woff2
#     header @static Cache-Control "public, max-age=31536000, immutable"
# }
#
# www.${DOMAIN} {
#     redir https://${DOMAIN}{uri} permanent
# }
CADDYEOF

# تشغيل!
docker compose up -d --build

echo "Waiting for services to start..."
sleep 30

# --- 7. فحص الخدمات ---
echo "[7/8] Checking services..."
echo "App:      $(docker inspect --format='{{.State.Status}}' oec-app 2>/dev/null || echo 'starting...')"
echo "DB:       $(docker inspect --format='{{.State.Status}}' oec-db 2>/dev/null || echo 'starting...')"
echo "Caddy:    $(docker inspect --format='{{.State.Status}}' oec-caddy 2>/dev/null || echo 'starting...')"

# --- 8. نسخ احتياطي تلقائي ---
echo "[8/8] Setting up automatic backups..."
mkdir -p /opt/backups

cat > /opt/oec/backup.sh << 'BACKUPEOF'
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M)

# PostgreSQL backup
docker exec oec-db pg_dump -U oec_user oec_db > "${BACKUP_DIR}/db_${DATE}.sql"

# Compress
gzip "${BACKUP_DIR}/db_${DATE}.sql"

# Keep last 30 days only
find ${BACKUP_DIR} -name "*.gz" -mtime +30 -delete

echo "Backup done: db_${DATE}.sql.gz"
BACKUPEOF

chmod +x /opt/oec/backup.sh

# Cron job — كل يوم 3AM
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/oec/backup.sh >> /opt/backups/backup.log 2>&1") | crontab -

echo "========================================"
echo "  Deployment Complete!"
echo "========================================"
echo ""
echo "  App:      http://$(hostname -I | awk '{print $1}')"
echo "  Database: PostgreSQL (internal only)"
echo "  Backups:  /opt/backups/ (daily at 3AM)"
echo ""
echo "  Useful commands:"
echo "    docker compose logs -f        # View logs"
echo "    docker compose restart app    # Restart app"
echo "    /opt/oec/backup.sh            # Manual backup"
echo "    docker exec oec-db pg_dump    # Manual DB dump"
echo ""
echo "========================================"
