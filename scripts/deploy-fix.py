#!/usr/bin/env python3
"""Deploy latest code to OVH server and rebuild Docker"""
import paramiko
import time

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"
REMOTE_DIR = "/home/ubuntu/blivoai-demo"

def ssh_exec(command, timeout=300):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=15)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

def main():
    print("=" * 60)
    print("DEPLOYING FIX: Collapsible chat sidebar + mobile back buttons")
    print("=" * 60)

    # 1. Pull latest code
    print("\n[1] Pulling latest code...")
    out, err = ssh_exec(f"cd {REMOTE_DIR} && git fetch origin && git reset --hard origin/main", timeout=60)
    print(f"Result: {out.strip()}")
    if err.strip():
        print(f"Errors: {err.strip()[:200]}")

    # 2. Verify chatbot-panel.tsx has ArrowLeft
    print("\n[2] Verifying chatbot-panel changes...")
    out, err = ssh_exec(f"grep 'ArrowLeft' {REMOTE_DIR}/src/components/dashboard/chatbot-panel.tsx")
    print(f"ArrowLeft found: {out.strip()[:100]}")

    out, err = ssh_exec(f"grep 'desktopSidebarOpen' {REMOTE_DIR}/src/components/dashboard/chatbot-panel.tsx | head -2")
    print(f"desktopSidebarOpen found: {out.strip()[:100]}")

    # 3. Rebuild Docker without cache
    print("\n[3] Rebuilding Docker (no cache)... This takes 3-5 minutes...")
    out, err = ssh_exec(f"cd {REMOTE_DIR} && docker compose build --no-cache app 2>&1", timeout=600)
    # Show key lines
    for line in out.split('\n'):
        if any(kw in line for kw in ['Step', 'Successfully', 'Built', 'DONE', 'Error']):
            print(f"  {line}")
    if 'Error' in err:
        print(f"Build errors: {err[:500]}")

    # 4. Restart container
    print("\n[4] Restarting container...")
    out, err = ssh_exec(f"cd {REMOTE_DIR} && docker compose up -d --force-recreate app 2>&1", timeout=120)
    print(f"Result: {out.strip()}")

    # 5. Wait and verify
    print("\n[5] Waiting 30s and verifying...")
    time.sleep(30)

    out, err = ssh_exec("docker ps --filter 'name=demo' --format '{{.Names}} {{.Status}}'")
    print(f"Containers: {out.strip()}")

    out, err = ssh_exec("curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/ar")
    print(f"localhost:3001/ar HTTP: {out.strip()}")

    out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://demo.blivoai.com")
    print(f"demo.blivoai.com HTTP: {out.strip()}")

    print("\n" + "=" * 60)
    print("DEPLOY COMPLETE!")
    print("Visit https://demo.blivoai.com to see the fixes")
    print("=" * 60)

if __name__ == "__main__":
    main()
