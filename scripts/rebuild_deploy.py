#!/usr/bin/env python3
"""Rebuild and redeploy the Docker container on the remote server."""
import paramiko
import time

HOST = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

print("Building Docker container (this takes ~5-10 minutes)...")

# Run build + deploy
stdin, stdout, stderr = ssh.exec_command(
    "cd ~/blivoai-demo && docker compose build app && docker compose up -d",
    timeout=600  # 10 minute timeout
)

# Stream output
while True:
    line = stdout.readline()
    if not line:
        break
    line = line.strip()
    if line:
        print(line)

err_output = stderr.read().decode('utf-8')
if err_output:
    print(f"STDERR: {err_output[-500:]}")

exit_code = stdout.channel.recv_exit_status()
print(f"\nExit code: {exit_code}")

if exit_code == 0:
    print("✅ Deployment successful!")
else:
    print("❌ Deployment failed!")

ssh.close()
