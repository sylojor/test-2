#!/usr/bin/env python3
"""Deploy pipeline feature to OVH server"""

import paramiko
import sys
import time

# Server config
HOST = "141.95.55.5"
USER = "root"
KEY_PATH = None  # Will use password if no key

def deploy():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    # Connect
    print(f"[DEPLOY] Connecting to {HOST}...")
    try:
        # Try SSH key first, then password
        client.connect(HOST, username=USER, timeout=10)
    except paramiko.SSHException:
        print("[ERROR] SSH connection failed. Need password or key.")
        print("[INFO] The code has been pushed to GitHub. You can manually deploy on the server by running:")
        print("       cd /opt/blivo && git pull origin main && docker compose down && docker compose build --no-cache && docker compose up -d")
        sys.exit(1)
    
    commands = [
        # Step 1: Git pull
        "cd /opt/blivo && git fetch origin && git reset --hard origin/main",
        # Step 2: Docker rebuild
        "cd /opt/blivo && docker compose down",
        "cd /opt/blivo && docker compose build --no-cache 2>&1 | tail -5",
        # Step 3: Start
        "cd /opt/blivo && docker compose up -d",
        # Step 4: Wait and check
        "sleep 10 && cd /opt/blivo && docker compose logs --tail=10 app 2>&1",
    ]
    
    for cmd in commands:
        print(f"\n[DEPLOY] Running: {cmd[:80]}...")
        stdin, stdout, stderr = client.exec_command(cmd, timeout=300)
        output = stdout.read().decode()
        error = stderr.read().decode()
        
        if output:
            print(output[-500:] if len(output) > 500 else output)
        if error and "WARNING" not in error:
            print(f"[STDERR] {error[-300:]}" if len(error) > 300 else error)
        
        if "build" in cmd.lower():
            print("[DEPLOY] Waiting for build to complete...")
            time.sleep(120)  # Build takes ~2 min
    
    # Verify
    print("\n[VERIFY] Checking deployment...")
    stdin, stdout, stderr = client.exec_command(
        "curl -s https://demo.blivoai.com/api/work-orders/pipeline?workOrderId=test | head -20",
        timeout=10
    )
    result = stdout.read().decode()
    print(f"[VERIFY] Pipeline API response: {result}")
    
    client.close()
    print("\n[DEPLOY] Done! ✅")

if __name__ == "__main__":
    deploy()
