#!/usr/bin/env python3
"""
Deploy smart employee enhancements to production:
1. SSH to server and update Together AI API key in docker-compose
2. Push code to GitHub
3. Rebuild Docker container
"""

import paramiko
import subprocess
import time
import sys

SERVER = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"
NEW_KEY = "tgp_v1_KXUEDfm7ZsHPYEpLOdtrlydb7IAKpNaBvvB8IWNaai0"
GITHUB_TOKEN = "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"
REPO = "sylojor/new-blivo"

def ssh_exec(ssh, cmd, timeout=30):
    """Execute SSH command and return output."""
    print(f"  [SSH] {cmd[:100]}...")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out.strip():
        print(f"  [OUT] {out[:500]}")
    if err.strip():
        print(f"  [ERR] {err[:500]}")
    return out, err

def main():
    # Step 1: Push to GitHub
    print("\n=== Step 1: Pushing to GitHub ===")
    os.chdir("/home/z/my-project/new-blivo")
    
    # Add all changes
    subprocess.run(["git", "add", "-A"], capture_output=True)
    subprocess.run(["git", "commit", "-m", "feat: smart employee - chain-of-thought, zero mistakes, operational capabilities"], capture_output=True)
    
    # Push
    push_cmd = ["git", "push", f"https://{GITHUB_TOKEN}@github.com/{REPO}.git", "main"]
    result = subprocess.run(push_cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        # Try with -f if needed
        print(f"  Push output: {result.stdout[-200:] if result.stdout else ''} {result.stderr[-200:] if result.stderr else ''}")
        push_cmd2 = ["git", "push", "-f", f"https://{GITHUB_TOKEN}@github.com/{REPO}.git", "main"]
        result = subprocess.run(push_cmd2, capture_output=True, text=True, timeout=120)
    print(f"  Push result: {result.returncode}")
    
    # Step 2: SSH to server
    print("\n=== Step 2: Connecting to server ===")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SERVER, username=USER, password=PASS, timeout=30)
    print("  Connected!")
    
    # Step 3: Update docker-compose.prod.yml with new API key
    print("\n=== Step 3: Updating Together AI API key ===")
    
    # First, check current docker-compose
    out, _ = ssh_exec(ssh, "cat /home/ubuntu/new-blivo/docker-compose.prod.yml")
    
    # Update LLM_API_KEY
    ssh_exec(ssh, f"""cd /home/ubuntu/new-blivo && \
      sed -i 's/LLM_API_KEY=.*/LLM_API_KEY={NEW_KEY}/' docker-compose.prod.yml && \
      sed -i 's/TOGETHER_AI_API_KEY=.*/TOGETHER_AI_API_KEY={NEW_KEY}/' docker-compose.prod.yml && \
      grep -E 'LLM_API_KEY|TOGETHER_AI_API_KEY' docker-compose.prod.yml
    """)
    
    # Also ensure LLM_PROVIDER=together is set
    ssh_exec(ssh, """cd /home/ubuntu/new-blivo && \
      grep -q 'LLM_PROVIDER=together' docker-compose.prod.yml || \
      sed -i '/LLM_API_KEY=/a LLM_PROVIDER=together' docker-compose.prod.yml && \
      grep -E 'LLM_PROVIDER|LLM_API_KEY' docker-compose.prod.yml
    """)
    
    # Step 4: Pull latest code
    print("\n=== Step 4: Pulling latest code ===")
    ssh_exec(ssh, f"""cd /home/ubuntu/new-blivo && \
      git pull https://{GITHUB_TOKEN}@github.com/{REPO}.git main 2>&1
    """, timeout=60)
    
    # Step 5: Rebuild Docker container
    print("\n=== Step 5: Rebuilding Docker container ===")
    # Use nohup for background build
    ssh_exec(ssh, """cd /home/ubuntu/new-blivo && \
      nohup bash -c 'docker compose -f docker-compose.prod.yml build --no-cache app 2>&1 | tee /tmp/docker-build.log' > /dev/null 2>&1 & \
      echo $!
    """)
    
    # Wait for build to complete (monitor)
    print("  Waiting for build to complete...")
    time.sleep(10)
    
    for i in range(60):  # Check every 10s for 10 minutes
        out, _ = ssh_exec(ssh, "ps aux | grep 'docker compose' | grep -v grep | wc -l")
        if "0" in out.strip():
            print("  Build process completed!")
            break
        print(f"  Still building... ({i+1}/60)")
        time.sleep(10)
    else:
        print("  Build still running, checking logs...")
    
    # Check build result
    out, err = ssh_exec(ssh, "tail -30 /tmp/docker-build.log 2>/dev/null")
    
    if "Successfully" in out or "successfully" in out or "built" in out:
        print("  Build SUCCESSFUL!")
        
        # Step 6: Restart the service
        print("\n=== Step 6: Restarting service ===")
        ssh_exec(ssh, """cd /home/ubuntu/new-blivo && \
          docker compose -f docker-compose.prod.yml up -d app 2>&1 && \
          docker compose -f docker-compose.prod.yml ps 2>&1
        """, timeout=60)
        
        print("\n=== DEPLOYMENT COMPLETE ===")
    else:
        print(f"  Build may have issues. Check logs on server.")
        print(f"  Last log: {out[-500:]}")
        
        # Try to restart anyway
        print("\n  Attempting restart anyway...")
        ssh_exec(ssh, """cd /home/ubuntu/new-blivo && \
          docker compose -f docker-compose.prod.yml up -d app 2>&1
        """, timeout=60)
    
    # Verify the app is running
    print("\n=== Step 7: Verifying deployment ===")
    time.sleep(5)
    out, _ = ssh_exec(ssh, "curl -s -o /dev/null -w '%{http_code}' https://blivoai.com 2>/dev/null || curl -s -o /dev/null -w '%{http_code}' http://localhost:3000")
    print(f"  Site HTTP status: {out.strip()}")
    
    # Check if the API key is set correctly
    out, _ = ssh_exec(ssh, "docker exec blivo-app printenv LLM_API_KEY 2>/dev/null || echo 'container not found'")
    print(f"  LLM_API_KEY in container: {out.strip()[:20]}..." if out.strip() and 'not found' not in out else f"  Container check: {out.strip()}")
    
    ssh.close()
    print("\n=== DONE ===")

if __name__ == "__main__":
    import os
    main()
