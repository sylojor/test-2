#!/usr/bin/env python3
"""Quick SSH commands to fix deployment step by step"""
import paramiko, sys, time

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"

def ssh_exec(cmd, timeout=60):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=15)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    rc = stdout.channel.recv_exit_status()
    client.close()
    return out.strip(), err.strip(), rc

# Step 1: Check what's running
print("[1] Current containers:")
out, err, rc = ssh_exec("docker ps -a --format '{{.Names}} {{.Status}}'")
print(out)

# Step 2: Start main blivoai containers back up
print("\n[2] Restarting main BlivoAI...")
out, err, rc = ssh_exec("cd /home/blivoai && docker-compose up -d", timeout=60)
print(f"  Result: {out[:200]}")
if err: print(f"  Err: {err[:200]}")
