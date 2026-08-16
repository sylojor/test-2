#!/usr/bin/env python3
"""Deploy BlivoAI to demo server via SSH"""

import paramiko
import time

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"
DEMO_PATH = "/home/ubuntu/blivoai-demo"

def deploy():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    
    commands = [
        # Pull latest code
        f"cd {DEMO_PATH} && git fetch origin && git reset --hard origin/demo",
        # Rebuild Docker
        f"cd {DEMO_PATH} && docker-compose down 2>/dev/null; docker-compose up -d --build",
        # Wait for containers to start
        "sleep 30",
        # Check status
        f"cd {DEMO_PATH} && docker-compose ps",
    ]
    
    for cmd in commands:
        print(f"\n>>> Running: {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd, timeout=300)
        out = stdout.read().decode()
        err = stderr.read().decode()
        if out:
            print(out)
        if err:
            print(f"stderr: {err}")
    
    client.close()
    print("\n✅ Deploy complete!")

if __name__ == "__main__":
    deploy()
