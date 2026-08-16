#!/usr/bin/env python3
"""
Deploy smart employee: push code, update API key, rebuild.
"""

import paramiko
import subprocess
import time
import os

SERVER = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641" 
NEW_KEY = "tgp_v1_KXUEDfm7ZsHPYEpLOdtrlydb7IAKpNaBvvB8IWNaai0"
GITHUB_TOKEN = "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"
REPO = "sylojor/new-blivo"

def run(cmd, cwd=None):
    """Run local command."""
    print(f"  [LOCAL] {cmd[:120]}")
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd or "/home/z/my-project/new-blivo")
    if r.stdout.strip(): print(f"  [OUT] {r.stdout.strip()[-300:]}")
    if r.stderr.strip(): print(f"  [ERR] {r.stderr.strip()[-300:]}")
    return r

def ssh_exec(ssh, cmd, timeout=60):
    """Execute SSH command."""
    print(f"  [SSH] {cmd[:120]}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out.strip(): print(f"  [OUT] {out.strip()[-500:]}")
    if err.strip(): print(f"  [ERR] {err.strip()[-300:]}")
    return out + err

def main():
    # Step 1: Git push
    print("\n" + "="*50)
    print("STEP 1: Git commit and push")
    print("="*50)
    run("git add -A")
    run('git commit -m "feat: smart employee - chain-of-thought, zero mistakes, server management"')
    run(f"git push https://{GITHUB_TOKEN}@github.com/{REPO}.git main")
    
    # Step 2: SSH
    print("\n" + "="*50)
    print("STEP 2: SSH to server")
    print("="*50)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SERVER, username=USER, password=PASS, timeout=30)
    print("  Connected!")
    
    # Step 3: Update API key in docker-compose
    print("\n" + "="*50)
    print("STEP 3: Update Together AI API key")
    print("="*50)
    
    # Check current state
    ssh_exec(ssh, "grep -E 'LLM_API_KEY|LLM_PROVIDER|TOGETHER' /home/ubuntu/new-blivo/docker-compose.prod.yml")
    
    # Update the key - try multiple sed patterns
    ssh_exec(ssh, f"""cd /home/ubuntu/new-blivo && \
      # Remove old key lines and add new ones
      sed -i '/^.*LLM_API_KEY=/d' docker-compose.prod.yml && \
      sed -i '/^.*TOGETHER_AI_API_KEY=/d' docker-compose.prod.yml && \
      sed -i '/^.*LLM_PROVIDER=/d' docker-compose.prod.yml && \
      # Find the app service environment section and add keys
      sed -i '/environment:/a \
      - LLM_PROVIDER=together\n      - LLM_API_KEY={NEW_KEY}' docker-compose.prod.yml
    """)
    
    # Verify
    print("  Verifying changes:")
    ssh_exec(ssh, "grep -E 'LLM_API_KEY|LLM_PROVIDER' /home/ubuntu/new-blivo/docker-compose.prod.yml")
    
    # Step 4: Pull code
    print("\n" + "="*50)
    print("STEP 4: Pull latest code")
    print("="*50)
    ssh_exec(ssh, f"cd /home/ubuntu/new-blivo && git pull https://{GITHUB_TOKEN}@github.com/{REPO}.git main 2>&1", timeout=120)
    
    # Step 5: Rebuild and restart
    print("\n" + "="*50)
    print("STEP 5: Rebuild and restart Docker")
    print("="*50)
    ssh_exec(ssh, """cd /home/ubuntu/new-blivo && \
      docker compose -f docker-compose.prod.yml build --no-cache app 2>&1 | tail -5
    """, timeout=600)
    
    ssh_exec(ssh, """cd /home/ubuntu/new-blivo && \
      docker compose -f docker-compose.prod.yml up -d app 2>&1
    """, timeout=120)
    
    # Step 6: Verify
    print("\n" + "="*50)
    print("STEP 6: Verify deployment")
    print("="*50)
    time.sleep(5)
    
    # Check container status
    ssh_exec(ssh, "docker ps --filter name=blivo --format '{{.Names}} {{.Status}}'")
    
    # Check site
    http_code = ssh_exec(ssh, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000")
    print(f"  HTTP Status: {http_code.strip()}")
    
    ssh.close()
    print("\n" + "="*50)
    print("DEPLOYMENT COMPLETE!")
    print("="*50)

if __name__ == "__main__":
    main()
