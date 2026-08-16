#!/usr/bin/env python3
"""Deploy BlivoAI to demo server via SSH + Docker"""

import paramiko
import sys
import time

SERVER = '141.95.55.5'
USER = 'ubuntu'
PASS = 'Mghazi@199641'
SERVER_DIR = '/home/ubuntu/blivoai-demo'

def run_cmd(ssh, cmd, timeout=300):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(out[:5000])
    if err and 'Warning' not in err:
        print(f"ERR: {err[:3000]}")
    return stdout.channel.recv_exit_status()

def main():
    print("=" * 60)
    print("BlivoAI Demo — Server Build & Deploy")
    print("=" * 60)

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        print("\n[1/7] Connecting to server...")
        ssh.connect(SERVER, username=USER, password=PASS, timeout=20, banner_timeout=30)
        print("Connected!")
    except Exception as e:
        print(f"Connection failed: {e}")
        sys.exit(1)

    # Step 2: Clean up old containers
    print("\n[2/7] Cleaning old containers...")
    run_cmd(ssh, "docker stop app-chatbot app-caddy 2>/dev/null; docker rm app-chatbot app-caddy 2>/dev/null; echo 'Old containers removed'")

    # Step 3: Pull latest code
    print("\n[3/7] Pulling latest code from GitHub...")
    run_cmd(ssh, f"cd {SERVER_DIR} && git fetch origin")
    run_cmd(ssh, f"cd {SERVER_DIR} && git checkout main 2>/dev/null || git checkout -b main origin/main")
    run_cmd(ssh, f"cd {SERVER_DIR} && git reset --hard origin/main")
    run_cmd(ssh, f"cd {SERVER_DIR} && git log --oneline -3")

    # Step 4: Fix .env on server
    print("\n[4/7] Fixing .env on server...")
    env_content = """DATABASE_URL=postgresql://blivoai:BlvPg_eZdU18PPULDS4YsemB1CquWN@db:5432/blivoai?schema=public
JWT_SECRET=blivoai-demo-secret-2024-secure-production-key-x7z9
NEXTAUTH_SECRET=blivoai-demo-secret-x7z9
NEXTAUTH_URL=https://demo.blivoai.com
NEXT_PUBLIC_SITE_URL=https://demo.blivoai.com
LLM_PROVIDER=mock
LLM_API_KEY=
LLM_API_URL=
"""
    # Write .env via SFTP
    sftp = ssh.open_sftp()
    with sftp.open(f'{SERVER_DIR}/.env', 'w') as f:
        f.write(env_content)
    sftp.close()
    print(".env updated!")

    # Step 5: Update Caddyfile - demo.blivoai.com → localhost:3001
    print("\n[5/7] Updating Caddy configuration for demo.blivoai.com → port 3001...")
    caddy_content = """# ============================================
# Caddyfile — BlivoAI Demo
# Reverse Proxy + Automatic SSL (Let's Encrypt)
# ============================================

demo.blivoai.com {
    # Block dangerous paths
    @dangerous {
        path /.env /.env.* /.git /.git/* /.ssh /.ssh/* /wp-admin /wp-admin/* /wp-login.php /xmlrpc.php /phpmyadmin /phpmyadmin/* /vendor /vendor/*
    }
    respond @dangerous 403

    @configscan {
        path /docker-compose.yml /docker-compose.yaml /package.json /bun.lock /.env.save /.env.backup
    }
    respond @configscan 403

    # Block malicious bots
    @badbot {
        header_regexp User-Agent (?i)(sqlmap|nikto|nmap|masscan|nessus|acunetix|wpscan|dirbuster|gobuster|fimap|havij|metasploit)
    }
    respond @badbot 403

    # Compression
    encode zstd gzip {
        minimum_length 256
    }

    # Cache static assets
    @static {
        path /_next/static/* /manifest.json /logo.svg /favicon.ico /favicon.png /apple-touch-icon.png
    }
    header @static Cache-Control "public, max-age=31536000, immutable"

    # No cache for admin
    @adminpages {
        path /ar/admin /en/admin /ar/admin/* /en/admin/*
    }
    header @adminpages Cache-Control "no-cache, no-store, must-revalidate"
    header @adminpages Pragma "no-cache"

    # No cache for HTML
    @html {
        header Content-Type text/html*
    }
    header @html Cache-Control "no-cache, no-store, must-revalidate"

    # Security headers
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }

    # Reverse proxy to demo app on port 3001
    reverse_proxy localhost:3001 {
        header_up Host {host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Forwarded-Uri {uri}
        header_up X-Real-IP {remote_host}
        header_down -x-powered-by
        header_down -Server
        flush_interval -1
        transport http {
            keepalive 30s
            keepalive_idle_conns 100
        }
    }
}
"""
    with sftp.open(f'{SERVER_DIR}/Caddyfile', 'w') as f:
        f.write(caddy_content)
    # Also write to /etc/caddy/Caddyfile if possible
    # For now, Caddy runs in Docker so we need to update its config
    print("Caddyfile updated!")

    # Step 6: Stop demo containers and rebuild
    print("\n[6/7] Rebuilding Docker containers...")
    run_cmd(ssh, f"cd {SERVER_DIR} && docker compose down", timeout=120)
    run_cmd(ssh, f"cd {SERVER_DIR} && docker compose build --no-cache app", timeout=600)

    # Step 7: Start containers
    print("\n[7/7] Starting containers...")
    run_cmd(ssh, f"cd {SERVER_DIR} && docker compose up -d", timeout=120)

    # Wait for app to start
    print("Waiting for app to start...")
    time.sleep(20)

    # Verify
    print("\n=== Verification ===")
    run_cmd(ssh, "docker ps", timeout=10)
    run_cmd(ssh, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/ar/", timeout=10)
    run_cmd(ssh, "docker logs demo-chatbot --tail 20 2>&1", timeout=10)

    # Set up Caddy as a standalone service (not in Docker) for SSL
    # Since Caddy was in a separate Docker container, let's install it as a systemd service
    print("\n=== Setting up Caddy for SSL ===")
    
    # Check if Caddy is installed as systemd service
    run_cmd(ssh, "which caddy 2>/dev/null || echo 'caddy not installed as binary'")
    run_cmd(ssh, "apt list --installed 2>/dev/null | grep caddy || echo 'caddy package not installed'")
    
    # If Caddy isn't installed as binary, install it
    run_cmd(ssh, "sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl 2>/dev/null; curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null; curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list 2>/dev/null; sudo apt update 2>/dev/null; sudo apt install caddy 2>/dev/null", timeout=120)

    # Write Caddyfile to /etc/caddy/
    run_cmd(ssh, f"sudo cp {SERVER_DIR}/Caddyfile /etc/caddy/Caddyfile")
    run_cmd(ssh, "sudo systemctl enable caddy")
    run_cmd(ssh, "sudo systemctl restart caddy", timeout=30)
    time.sleep(10)
    run_cmd(ssh, "sudo systemctl status caddy | head -15", timeout=10)
    
    # Final check
    print("\n=== Final HTTPS Check ===")
    run_cmd(ssh, "curl -sk -o /dev/null -w '%{http_code}' https://demo.blivoai.com || echo 'SSL not ready yet'", timeout=15)
    run_cmd(ssh, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/ar/", timeout=15)

    ssh.close()
    print("\n" + "=" * 60)
    print("DEPLOYMENT COMPLETE!")
    print(f"URL: https://demo.blivoai.com")
    print(f"Admin: admin@blivoai.com / BlivoAdmin2024!")
    print("=" * 60)

if __name__ == "__main__":
    main()
