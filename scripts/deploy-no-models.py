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

# Step 1: Git pull
code, out, err = ssh_cmd(ssh, f"cd {PROJECT_PATH} && git pull origin main", timeout=60)

# Step 2: Verify settings panel has no LLM
ssh_cmd(ssh, f"cd {PROJECT_PATH} && grep -c 'LLMProvider' src/components/dashboard/settings-panel.tsx || echo '0'")

# Step 3: Rebuild Docker
print("\n=== Rebuilding Docker (takes ~5 min) ===")
code, out, err = ssh_cmd(ssh, f"cd {PROJECT_PATH} && docker compose build --no-cache app 2>&1 | tail -5", timeout=600)

if code != 0:
    print("✗ Build may have issues, trying full build...")
    code, out, err = ssh_cmd(ssh, f"cd {PROJECT_PATH} && docker compose build --no-cache app", timeout=600)

# Step 4: Restart
ssh_cmd(ssh, f"cd {PROJECT_PATH} && docker compose up -d app", timeout=60)

# Step 5: Wait and verify
print("Waiting 20 seconds...")
time.sleep(20)

ssh_cmd(ssh, "docker ps --filter 'name=demo-chatbot' --format '{{.Names}} {{.Status}}'")
ssh_cmd(ssh, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/ar")

ssh.close()
print("\n=== Deployment Complete! ===")
