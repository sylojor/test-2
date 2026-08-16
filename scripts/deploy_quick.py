#!/usr/bin/env python3
"""Quick deploy: Pull code + rebuild on demo server"""

import paramiko

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"
DEMO_PATH = "/home/ubuntu/blivoai-demo"

def run_cmd(client, cmd, timeout=120):
    print(f"\n>>> {cmd[:80]}...")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out: print(out[:500])
    if err: print(f"stderr: {err[:500]}")
    return out, err

def deploy():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    
    # Step 1: Pull latest code
    run_cmd(client, f"cd {DEMO_PATH} && git fetch origin && git reset --hard origin/demo")
    
    # Step 2: Stop containers
    run_cmd(client, f"cd {DEMO_PATH} && docker-compose down", timeout=60)
    
    # Step 3: Prisma generate + build
    print("\n>>> Building Docker image... (this takes a few minutes)")
    run_cmd(client, f"cd {DEMO_PATH} && docker-compose build --no-cache app", timeout=300)
    
    # Step 4: Start containers
    run_cmd(client, f"cd {DEMO_PATH} && docker-compose up -d", timeout=120)
    
    # Step 5: Wait and check
    import time
    time.sleep(15)
    run_cmd(client, f"cd {DEMO_PATH} && docker-compose ps")
    run_cmd(client, f"cd {DEMO_PATH} && docker-compose logs app --tail=20")
    
    client.close()
    print("\n✅ Deploy complete!")

if __name__ == "__main__":
    deploy()
