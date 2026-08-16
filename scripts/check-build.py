#!/usr/bin/env python3
import paramiko

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)

# Check if docker build is still running
stdin, stdout, stderr = ssh.exec_command("ps aux | grep 'docker compose build' | grep -v grep", timeout=10)
out = stdout.read().decode()
print(f"Docker build process: {out.strip() if out.strip() else 'NOT RUNNING'}")

# Check build log
stdin, stdout, stderr = ssh.exec_command("tail -5 /tmp/docker-build.log 2>/dev/null || echo 'No build log'", timeout=10)
out = stdout.read().decode()
print(f"Build log last 5 lines:\n{out}")

ssh.close()
