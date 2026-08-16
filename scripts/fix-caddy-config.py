#!/usr/bin/env python3
"""
Fix Caddy config to only include demo.blivoai.com (the original server config only had demo).
"""

import paramiko

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"
PORT = 22

def ssh_connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)
    return client

def run_cmd(client, cmd, timeout=30):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out:
        print(out[:600])
    if err:
        print(f"[STDERR] {err[:500]}")
    return out, err

def main():
    print("=== Connecting ===")
    client = ssh_connect()
    
    # Check the original Caddyfile format (before my update)
    print("\n=== Check current /etc/caddy/Caddyfile ===")
    current_caddy, _ = run_cmd(client, "cat /etc/caddy/Caddyfile")
    
    # The original Caddyfile only had demo.blivoai.com section
    # My update added blivoai.com too, which references app:3000 (Docker service)
    # but app:3000 only works inside Docker network, not from the host Caddy
    
    # Write the correct Caddyfile — only demo.blivoai.com + www redirects
    correct_caddy = '''# ============================================
# Caddyfile - BlivoAI Demo Server
# Only demo.blivoai.com (this server)
# ============================================

demo.blivoai.com {
    # Block dangerous paths
    @dangerous path /.env /.env.* /.git /.git/* /.ssh /.ssh/* /wp-admin /wp-admin/* /wp-login.php /xmlrpc.php /config.php /phpmyadmin /phpmyadmin/* /vendor /vendor/*
    respond @dangerous 403

    @configscan path /docker-compose.yml /docker-compose.yaml /package.json /bun.lock /.env.save /.env.backup
    respond @configscan 403

    @badbot header_regexp User-Agent (?i)(sqlmap|nikto|nmap|masscan|nessus|acunetix|wpscan|dirbuster|gobuster|fimap|havij|metasploit)
    respond @badbot 403

    encode zstd gzip {
        minimum_length 256
    }

    # Truly static assets — long immutable cache
    @static path /_next/static/* /manifest.json /BlivoAI.apk
    header @static Cache-Control "public, max-age=31536000, immutable"

    # Branding files — short cache because they can change after admin upload
    @branding path /api/branding/* /logo.svg /logo.png /favicon.ico /favicon-32x32.png
    header @branding Cache-Control "public, max-age=60, must-revalidate"

    # No cache for admin pages
    @adminpages path /admin /admin/* /ar/admin /en/admin /ar/admin/* /en/admin/*
    header @adminpages Cache-Control "no-cache, no-store, must-revalidate"

    # No cache for HTML
    @html header Content-Type text/html*
    header @html Cache-Control "no-cache, no-store, must-revalidate"

    # Security headers
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        -Server
    }

    reverse_proxy localhost:3001 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_down -Server
        flush_interval -1
    }
}

www.demo.blivoai.com {
    redir https://demo.blivoai.com{uri} permanent
}
'''
    
    # Write the corrected Caddyfile — need sudo to write to /etc/caddy/
    # Write to temp location first, then sudo cp to /etc/caddy/
    sftp = client.open_sftp()
    with sftp.open("/tmp/caddyfile-new", 'w') as f:
        f.write(correct_caddy)
    with sftp.open("/home/ubuntu/blivoai-demo/Caddyfile", 'w') as f:
        f.write(correct_caddy)
    sftp.close()
    print("Caddyfile written to temp + project dir")
    
    # Copy to /etc/caddy/ with sudo
    run_cmd(client, "sudo cp /tmp/caddyfile-new /etc/caddy/Caddyfile")
    
    # Reload Caddy
    print("\n=== Reload Caddy ===")
    run_cmd(client, "sudo systemctl reload caddy")
    
    # Verify
    print("\n=== Verify Caddy is running ===")
    run_cmd(client, "systemctl status caddy | head -5")
    
    # Check cache headers
    print("\n=== Verify branding cache headers ===")
    run_cmd(client, 'curl -s -I https://demo.blivoai.com/api/branding/logo.png | grep -i cache')
    run_cmd(client, 'curl -s -I https://demo.blivoai.com/logo.svg | grep -i cache')
    
    # Final health check
    print("\n=== Final health check ===")
    run_cmd(client, 'curl -s -o /dev/null -w "HTTP %{http_code}" https://demo.blivoai.com/ar/')
    run_cmd(client, 'curl -s -o /dev/null -w "HTTP %{http_code}" https://demo.blivoai.com/ar/admin')
    run_cmd(client, 'curl -s -o /dev/null -w "HTTP %{http_code}" https://demo.blivoai.com/api/branding/logo.png')
    
    client.close()
    print("\n=== Done ===")

if __name__ == "__main__":
    main()
