#!/usr/bin/env python3
"""Deploy updated blog editor code to demo.blivoai.com server"""

import paramiko
import time
import sys

HOST = "141.95.55.5"
USER = "root"
KEY_PATH = None  # Will use ssh-agent or default keys

def deploy():
    print(f"[1] Connecting to {HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, username=USER, timeout=30)
    except Exception as e:
        print(f"  Connection failed: {e}")
        sys.exit(1)
    print("  Connected!")

    # Pull latest code from GitHub
    print("[2] Pulling latest code from GitHub...")
    stdin, stdout, stderr = ssh.exec_command("cd /opt/blivoai && git fetch origin && git reset --hard origin/main", timeout=60)
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(f"  Output: {out[:200]}")
    if err and "error" in err.lower():
        print(f"  Error: {err[:200]}")

    # Ensure uploads directory exists
    print("[3] Creating uploads directory...")
    ssh.exec_command("mkdir -p /opt/blivoai/public/uploads/blog", timeout=10)
    time.sleep(2)

    # Rebuild Docker container
    print("[4] Rebuilding Docker container...")
    stdin, stdout, stderr = ssh.exec_command("cd /opt/blivoai && docker compose up -d --build --no-deps blivoai-app", timeout=300)
    # Read output in chunks to avoid timeout
    out_lines = []
    while True:
        line = stdout.readline()
        if not line:
            break
        out_lines.append(line.strip())
        if len(out_lines) % 10 == 0:
            print(f"  ... {len(out_lines)} lines read")
    
    out = "\n".join(out_lines[-20:])
    err = stderr.read().decode()[-500:]
    print(f"  Build output (last 20 lines): {out}")
    if err:
        print(f"  Build stderr (last 500): {err}")

    # Wait for container to be healthy
    print("[5] Waiting for container to start...")
    time.sleep(10)
    stdin, stdout, stderr = ssh.exec_command("docker ps --filter 'name=blivoai' --format '{{.Names}} {{.Status}}'", timeout=10)
    out = stdout.read().decode()
    print(f"  Container status: {out}")

    # Verify the blog upload API is available
    print("[6] Verifying deployment...")
    stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/ar/admin", timeout=15)
    out = stdout.read().decode()
    print(f"  Admin page status: {out}")

    stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/favicon.ico", timeout=15)
    out = stdout.read().decode()
    print(f"  Favicon status: {out}")

    stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/logo.svg", timeout=15)
    out = stdout.read().decode()
    print(f"  Logo status: {out}")

    ssh.close()
    print("\n[✓] Deployment complete!")

if __name__ == "__main__":
    deploy()
