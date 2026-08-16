#!/usr/bin/env python3
import paramiko
import sys

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"
PROJECT_PATH = "/home/ubuntu/blivoai-demo"

def ssh_cmd(ssh, cmd, timeout=60):
    print(f">>> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    code = stdout.channel.recv_exit_status()
    if out: print(out[:2000])
    return code, out, err

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)

# Git pull
ssh_cmd(ssh, f"cd {PROJECT_PATH} && git fetch origin && git reset --hard origin/main")

# Verify new settings-panel has NO LLM references
out = ssh_cmd(ssh, f"cd {PROJECT_PATH} && grep -c 'LLMProvider' src/components/dashboard/settings-panel.tsx")[1]
print(f"LLMProvider references in settings-panel: {out.strip()} (should be 0)")

# Build Docker (this is the slow part)
print("Starting Docker rebuild...")
ssh_cmd(ssh, f"cd {PROJECT_PATH} && nohup docker compose build --no-cache app > /tmp/docker-build.log 2>&1 &", timeout=10)
print("Docker build started in background. It takes ~5 min.")
print("Check progress: ssh ubuntu@141.95.55.5 'cat /tmp/docker-build.log | tail -5'")

ssh.close()
print("After build completes, run manually:")
print("  ssh ubuntu@141.95.55.5")
print("  cd /home/ubuntu/blivoai-demo && docker compose up -d app")
