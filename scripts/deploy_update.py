#!/usr/bin/env python3
"""
Deploy updated BlivoAI to OVH server (demo.blivoai.com)
- Pull latest code from GitHub on the server
- Rebuild Docker containers
- Verify deployment
"""

import paramiko
import os
import time
import sys

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"

def ssh_exec(command, timeout=120):
    """Execute command on OVH server via SSH"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
        stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        exit_code = stdout.channel.recv_exit_status()
        client.close()
        return out, err, exit_code
    except Exception as e:
        print(f"  SSH Error: {e}")
        return "", str(e), -1

def main():
    print("=" * 60)
    print("DEPLOYING BLIVOAI UPDATE TO OVH SERVER")
    print("=" * 60)
    
    # Step 1: Check what's currently running
    print("\n[1] Checking current deployment...")
    out, err, rc = ssh_exec("docker ps --format '{{.Names}} {{.Status}} {{.Ports}}'")
    print(f"  Current containers:\n{out}")
    
    # Step 2: Find the project directory on the server
    print("\n[2] Finding project directory...")
    out, err, rc = ssh_exec("find /home -maxdepth 2 -name 'docker-compose.yml' -o -name 'package.json' 2>/dev/null | head -20")
    print(f"  Found files:\n{out}")
    
    # Step 3: Check which directory has the BlivoAI project
    print("\n[3] Checking project directories...")
    for dir_path in ["/home/new-blivo", "/home/ubuntu/new-blivo", "/home/blivoai", "/home/ubuntu/blivoai"]:
        out, err, rc = ssh_exec(f"ls -la {dir_path}/.git 2>/dev/null && echo 'FOUND_GIT' || echo 'NO_GIT'")
        if "FOUND_GIT" in out:
            print(f"  Git repo found at: {dir_path}")
            
            # Step 4: Pull latest code
            print(f"\n[4] Pulling latest code from {dir_path}...")
            out, err, rc = ssh_exec(f"cd {dir_path} && git remote -v")
            print(f"  Remotes:\n{out}")
            
            # Check current branch and commit
            out, err, rc = ssh_exec(f"cd {dir_path} && git branch && git log --oneline -3")
            print(f"  Branch & recent commits:\n{out}")
            
            # Pull latest
            print(f"\n[5] Git pull from origin...")
            out, err, rc = ssh_exec(f"cd {dir_path} && git pull origin main", timeout=60)
            print(f"  Pull result: {out}")
            if err and "error" in err.lower():
                print(f"  Pull errors: {err}")
            
            # Step 5: Rebuild Docker
            print(f"\n[6] Rebuilding Docker containers...")
            out, err, rc = ssh_exec(f"cd {dir_path} && docker-compose down && docker-compose up -d --build", timeout=300)
            print(f"  Docker rebuild:\n{out}")
            if err:
                print(f"  Docker stderr:\n{err}")
            
            # Step 6: Check deployment
            print(f"\n[7] Checking new deployment...")
            time.sleep(10)  # Wait for containers to start
            out, err, rc = ssh_exec("docker ps --format '{{.Names}} {{.Status}} {{.Ports}}'")
            print(f"  Running containers:\n{out}")
            
            # Step 7: Verify site responds
            print(f"\n[8] Verifying site response...")
            out, err, rc = ssh_exec("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null || curl -s -o /dev/null -w '%{http_code}' http://localhost:3001 2>/dev/null")
            print(f"  HTTP status: {out.strip()}")
            
            print("\n" + "=" * 60)
            print("DEPLOYMENT COMPLETE!")
            print("=" * 60)
            return
    
    # If no git repo found, try to clone fresh
    print("\n  No git repo found. Setting up fresh clone...")
    out, err, rc = ssh_exec("mkdir -p /home/new-blivo && cd /home/new-blivo && git clone https://github.com/sylojor/one-employer-company.git .", timeout=60)
    print(f"  Clone result: {out}")
    
    # Set env vars
    print("\n  Setting up environment...")
    out, err, rc = ssh_exec(f"cd /home/new-blivo && echo 'DATABASE_URL=postgresql://oec_user:oec_secure_password_2024@db:5432/oec_db?schema=public' > .env && echo 'LLM_PROVIDER=mock' >> .env && echo 'NEXT_PUBLIC_SITE_URL=https://demo.blivoai.com' >> .env")
    
    # Build docker
    print("\n  Building Docker...")
    out, err, rc = ssh_exec(f"cd /home/new-blivo && docker-compose up -d --build", timeout=300)
    print(f"  Result: {out}")
    
    print("\n" + "=" * 60)
    print("DEPLOYMENT COMPLETE!")
    print("=" * 60)

if __name__ == "__main__":
    main()
