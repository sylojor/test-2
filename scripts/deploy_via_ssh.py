#!/usr/bin/env python3
"""Deploy BlivoAI to demo server via SSH + Docker"""

import paramiko
import sys
import time

SERVER_IP = "141.95.55.5"
SERVER_USER = "root"
SERVER_DIR = "/home/ubuntu/blivoai-demo"

def ssh_exec(ssh, cmd, timeout=300):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out: print(out)
    if err: print(f"STDERR: {err}")
    return stdout.channel.recv_exit_status()

def main():
    print("=" * 60)
    print("BlivoAI Demo — Server Deployment")
    print("=" * 60)

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print("\n[1/5] Connecting to server...")
        ssh.connect(SERVER_IP, username=SERVER_USER, timeout=30)
        print("✅ Connected!")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        sys.exit(1)

    # Pull latest code
    print("\n[2/5] Pulling latest code...")
    ssh_exec(ssh, f"cd {SERVER_DIR} && git fetch origin")
    ssh_exec(ssh, f"cd {SERVER_DIR} && git reset --hard origin/main")
    print("✅ Code updated!")

    # Rebuild Docker
    print("\n[3/5] Rebuilding Docker containers...")
    ssh_exec(ssh, f"cd {SERVER_DIR} && docker compose down", timeout=60)
    ssh_exec(ssh, f"cd {SERVER_DIR} && docker compose build --no-cache app", timeout=600)
    ssh_exec(ssh, f"cd {SERVER_DIR} && docker compose up -d", timeout=120)
    print("✅ Docker rebuilt!")

    # Wait for app to start
    print("\n[4/5] Waiting for app to start...")
    time.sleep(15)

    # Verify
    print("\n[5/5] Verifying deployment...")
    status = ssh_exec(ssh, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/ar/", timeout=30)
    print(f"HTTP Status: {status}")
    
    # Check Caddy
    ssh_exec(ssh, "caddy validate --config /etc/caddy/Caddyfile", timeout=10)
    ssh_exec(ssh, "systemctl reload caddy", timeout=10)

    ssh.close()

    print("\n" + "=" * 60)
    print("🎉 DEPLOYMENT COMPLETE!")
    print(f"   URL: https://demo.blivoai.com")
    print(f"   Admin: admin@blivoai.com / BlivoAdmin2024!")
    print(f"   SSL: Auto via Caddy + Let's Encrypt")
    print("=" * 60)

if __name__ == "__main__":
    main()
