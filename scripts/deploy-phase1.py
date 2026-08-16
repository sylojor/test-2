#!/usr/bin/env python3
import paramiko
import sys

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"
PROJECT_PATH = "/home/ubuntu/blivoai-demo"

def ssh_cmd(ssh, cmd, timeout=120):
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

# Step 1: Force pull
ssh_cmd(ssh, f"cd {PROJECT_PATH} && rm -rf 'src/app/[lang]/payment'")
ssh_cmd(ssh, f"cd {PROJECT_PATH} && git fetch origin && git reset --hard origin/main")

# Step 2: Verify new files
ssh_cmd(ssh, f"cd {PROJECT_PATH} && find src/app -name 'page.tsx' -path '*payment*' 2>/dev/null")
ssh_cmd(ssh, f"cd {PROJECT_PATH} && ls src/app/api/payments/webhook/route.ts 2>/dev/null")

# Step 3: Prisma db push
print("\n=== Prisma DB Push ===")
code, out, err = ssh_cmd(ssh, f"cd {PROJECT_PATH} && npx prisma db push --accept-data-loss 2>&1", timeout=120)

ssh.close()
print("\n=== Phase 1 Complete (git pull + prisma) ===")
print("Now need: docker compose build --no-cache app && docker compose up -d app")
