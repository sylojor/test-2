#!/usr/bin/env python3
"""SSH helper script for remote server operations"""

import paramiko
import sys
import time

HOST = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"
PORT = 22

def ssh_connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=15)
        return client
    except Exception as e:
        print(f"SSH connection failed: {e}")
        sys.exit(1)

def run_cmd(client, cmd, timeout=120):
    print(f"\n>>> Running: {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    exit_code = stdout.channel.recv_exit_status()
    if out:
        print(out[-3000:] if len(out) > 3000 else out)
    if err:
        print(f"[stderr] {err[-2000:]}" if len(err) > 2000 else f"[stderr] {err}")
    print(f"Exit code: {exit_code}")
    return out, err, exit_code

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ssh-helper.py <command>")
        sys.exit(1)
    
    cmd = sys.argv[1]
    client = ssh_connect()
    run_cmd(client, cmd, timeout=300)
    client.close()
