#!/usr/bin/env python3
"""Deploy BlivoAI to demo server — Phase 2: Build + Caddy + SSL"""

import paramiko
import sys
import time

SERVER = '141.95.55.5'
USER = 'ubuntu'
PASS = 'Mghazi@199641'
SERVER_DIR = '/home/ubuntu/blivoai-demo'

def run_cmd(ssh, cmd, timeout=300):
    print(f"\n>>> {cmd[:200]}...")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out: print(out[:5000])
    if err and 'Warning' not in err: print(f"ERR: {err[:3000]}")
    return stdout.channel.recv_exit_status()

def write_file_via_ssh(ssh, path, content):
    """Write file content via SSH heredoc"""
    # Use base64 to avoid escaping issues
    import base64
    b64 = base64.b64encode(content.encode()).decode()
    cmd = f'echo "{b64}" | base64 -d > {path}'
    return run_cmd(ssh, cmd)

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SERVER, username=USER, password=PASS, timeout=20, banner_timeout=30)
    print("Connected!")

    # === 1. Write Caddyfile ===
    print("\n[1] Writing Caddyfile...")
    caddy_content = """# ============================================
# Caddyfile - BlivoAI Demo
# Reverse Proxy + Automatic SSL (Let's Encrypt)
# ============================================

demo.blivoai.com {
    @dangerous path /.env /.env.* /.git /.git/* /.ssh /.ssh/* /wp-admin /wp-admin/* /wp-login.php /xmlrpc.php /phpmyadmin /phpmyadmin/* /vendor /vendor/*
    respond @dangerous 403

    @configscan path /docker-compose.yml /docker-compose.yaml /package.json /bun.lock /.env.save /.env.backup
    respond @configscan 403

    @badbot header_regexp User-Agent (?i)(sqlmap|nikto|nmap|masscan|nessus|acunetix|wpscan|dirbuster|gobuster|fimap|havij|metasploit)
    respond @badbot 403

    encode zstd gzip {
        minimum_length 256
    }

    @static path /_next/static/* /manifest.json /logo.svg /favicon.ico /favicon.png /apple-touch-icon.png
    header @static Cache-Control "public, max-age=31536000, immutable"

    @adminpages path /ar/admin /en/admin /ar/admin/* /en/admin/*
    header @adminpages Cache-Control "no-cache, no-store, must-revalidate"
    header @adminpages Pragma "no-cache"

    @html header Content-Type text/html*
    header @html Cache-Control "no-cache, no-store, must-revalidate"

    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }

    reverse_proxy localhost:3001 {
        header_up Host {host}
        header_up X-Forwarded-Proto {scheme}
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
    write_file_via_ssh(ssh, f'{SERVER_DIR}/Caddyfile', caddy_content)
    print("Caddyfile written!")

    # === 2. Docker compose down + rebuild ===
    print("\n[2] Docker compose down...")
    run_cmd(ssh, f"cd {SERVER_DIR} && docker compose down", timeout=60)

    print("\n[3] Docker compose build...")
    run_cmd(ssh, f"cd {SERVER_DIR} && docker compose build --no-cache app", timeout=600)

    # === 4. Start containers ===
    print("\n[4] Starting containers...")
    run_cmd(ssh, f"cd {SERVER_DIR} && docker compose up -d", timeout=120)

    print("Waiting 25s for app startup...")
    time.sleep(25)

    # === 5. Verify app is running ===
    print("\n[5] Verifying app...")
    run_cmd(ssh, "docker ps", timeout=10)
    run_cmd(ssh, "curl -sL -o /dev/null -w '%{http_code}' http://localhost:3001/ar/", timeout=15)
    run_cmd(ssh, "docker logs demo-chatbot --tail 15 2>&1", timeout=15)

    # === 6. Install Caddy as system service for SSL ===
    print("\n[6] Setting up Caddy + SSL...")
    
    # Check if Caddy binary exists
    run_cmd(ssh, "which caddy || echo 'NOT_INSTALLED'")
    
    # Install Caddy as system package
    print("Installing Caddy as system service...")
    run_cmd(ssh, "sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl", timeout=60)
    run_cmd(ssh, "curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg", timeout=30)
    run_cmd(ssh, "curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list", timeout=30)
    run_cmd(ssh, "sudo apt update", timeout=60)
    run_cmd(ssh, "sudo apt install -y caddy", timeout=60)

    # === 7. Configure Caddy ===
    print("\n[7] Configuring Caddy with SSL...")
    run_cmd(ssh, f"sudo cp {SERVER_DIR}/Caddyfile /etc/caddy/Caddyfile")
    run_cmd(ssh, "sudo chown root:root /etc/caddy/Caddyfile")
    run_cmd(ssh, "sudo caddy validate --config /etc/caddy/Caddyfile", timeout=15)
    run_cmd(ssh, "sudo systemctl enable caddy", timeout=15)
    run_cmd(ssh, "sudo systemctl restart caddy", timeout=30)

    time.sleep(15)

    # === 8. Final verification ===
    print("\n[8] Final verification...")
    run_cmd(ssh, "sudo systemctl status caddy | head -20", timeout=10)
    run_cmd(ssh, "curl -sk -o /dev/null -w '%{http_code}' https://demo.blivoai.com", timeout=15)
    run_cmd(ssh, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/ar/", timeout=10)

    ssh.close()
    print("\n" + "=" * 60)
    print("DEPLOYMENT COMPLETE!")
    print(f"URL: https://demo.blivoai.com")
    print(f"Admin: admin@blivoai.com / BlivoAdmin2024!")
    print("=" * 60)

if __name__ == "__main__":
    main()
