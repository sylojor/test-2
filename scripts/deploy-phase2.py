#!/usr/bin/env python3
import paramiko
import sys
import time

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"
PROJECT_PATH = "/home/ubuntu/blivoai-demo"

def ssh_cmd(ssh, cmd, timeout=300):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    code = stdout.channel.recv_exit_status()
    if out: print(f"OUT:\n{out[:3000]}")
    if err: print(f"ERR:\n{err[:2000]}")
    return code, out, err

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
print(f"✓ Connected to {HOST}")

# Rebuild Docker with no cache
print("\n=== Rebuilding Docker Container (this takes ~5 min) ===")
code, out, err = ssh_cmd(ssh, f"cd {PROJECT_PATH} && docker compose build --no-cache app 2>&1", timeout=600)

if code != 0:
    print("✗ Docker build failed!")
    sys.exit(1)

print("\n=== Docker Build Successful! ===")

# Restart container
code, out, err = ssh_cmd(ssh, f"cd {PROJECT_PATH} && docker compose up -d app 2>&1", timeout=60)

# Wait for startup
print("Waiting 20 seconds for startup...")
time.sleep(20)

# Check container status
ssh_cmd(ssh, "docker ps --filter 'name=demo-chatbot' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")

# Test webhook endpoint
ssh_cmd(ssh, "curl -s http://localhost:3001/api/payments/webhook")

# Test site health
code, out, err = ssh_cmd(ssh, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/ar")
print(f"\n✓ Site health: HTTP {out}")

ssh.close()
print("\n=== Deployment Complete! ===")
