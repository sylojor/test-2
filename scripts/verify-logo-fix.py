#!/usr/bin/env python3
"""
Quick verification + fix Caddy reload + ensure container is fully healthy.
"""

import paramiko
import time

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
        print(out[:800])
    if err:
        print(f"[STDERR] {err[:500]}")
    return out, err

def main():
    print("=== Connecting ===")
    client = ssh_connect()
    
    # 1. Verify logo.svg is self-contained
    print("\n=== VERIFY: logo.svg is self-contained ===")
    svg_check, _ = run_cmd(client, "docker exec demo-chatbot head -1 /app/data/branding/logo.svg")
    if "data:image/png;base64" in svg_check:
        print("✓ logo.svg is self-contained with base64 data URI!")
    else:
        print("✗ logo.svg NOT self-contained — needs manual fix")
    
    # 2. Verify logo.png accessible
    print("\n=== VERIFY: logo.png accessible via API ===")
    png_status, _ = run_cmd(client, 'curl -s -o /dev/null -w "HTTP %{http_code}, Size %{size_download}" https://demo.blivoai.com/api/branding/logo.png')
    
    # 3. Verify the branding cache is NOT immutable
    print("\n=== VERIFY: branding cache headers ===")
    run_cmd(client, 'curl -s -I https://demo.blivoai.com/api/branding/logo.png | grep -i cache')
    run_cmd(client, 'curl -s -I https://demo.blivoai.com/logo.png | grep -i cache')
    run_cmd(client, 'curl -s -I https://demo.blivoai.com/logo.svg | grep -i cache')
    
    # 4. Check Caddy reload (might be systemd service)
    print("\n=== RELOAD: Caddy service ===")
    run_cmd(client, "sudo systemctl reload caddy 2>/dev/null || sudo caddy reload --config /home/ubuntu/blivoai-demo/Caddyfile 2>/dev/null || echo 'Caddy reload attempted'")
    
    # 5. Verify the site works
    print("\n=== VERIFY: Site health ===")
    run_cmd(client, 'curl -s -o /dev/null -w "HTTP %{http_code}" https://demo.blivoai.com/ar/admin')
    
    # 6. Check container logs for errors
    print("\n=== VERIFY: Container startup logs ===")
    run_cmd(client, "docker logs demo-chatbot --tail 10 2>&1 | grep -i error | head -5")
    
    # 7. Verify the admin page loads with logo.png reference
    print("\n=== VERIFY: Admin page HTML contains logo.png ===")
    admin_html, _ = run_cmd(client, 'curl -s https://demo.blivoai.com/ar/admin | grep -o "branding/logo.[a-z]*" | head -5')
    
    client.close()
    print("\n=== Verification complete ===")

if __name__ == "__main__":
    main()
