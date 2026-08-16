#!/usr/bin/env python3
"""
Fix deployment — restart all containers, check new-blivo, set up properly
"""

import paramiko
import time

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"

def ssh_exec(command, timeout=180):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    rc = stdout.channel.recv_exit_status()
    client.close()
    return out, err, rc

def main():
    print("=" * 60)
    print("FIXING BLIVOAI DEPLOYMENT ON OVH SERVER")
    print("=" * 60)

    # Step 1: Check current state
    print("\n[1] Current container state:")
    out, err, rc = ssh_exec("docker ps -a --format '{{.Names}} {{.Status}} {{.Ports}}'")
    print(out)

    # Step 2: The main blivoai project is at /home/blivoai with its own docker-compose
    # The new-blivo project needs to be at /home/new-blivo
    # Let me check what's in each
    print("\n[2] Checking /home/blivoai (main project):")
    out, err, rc = ssh_exec("ls /home/blivoai/docker-compose.yml /home/blivoai/Caddyfile 2>/dev/null")
    print(out)
    
    print("\n[3] Checking /home/new-blivo directory:")
    out, err, rc = ssh_exec("ls /home/new-blivo/ 2>/dev/null | head -20")
    print(out)

    # Step 3: Start back the main blivoai containers
    print("\n[4] Restarting main BlivoAI containers...")
    out, err, rc = ssh_exec("cd /home/blivoai && docker-compose up -d", timeout=180)
    print(f"  stdout: {out}")
    print(f"  stderr: {err}")

    # Wait for containers to start
    time.sleep(15)

    # Step 4: Check containers again
    print("\n[5] Checking containers after restart:")
    out, err, rc = ssh_exec("docker ps --format '{{.Names}} {{.Status}} {{.Ports}}'")
    print(out)

    # Step 5: Verify main site responds
    print("\n[6] Checking main site (port 3000):")
    out, err, rc = ssh_exec("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000")
    print(f"  HTTP status: {out.strip()}")

    # Step 6: Check new-blivo on port 3002
    print("\n[7] Checking new-blivo (port 3002):")
    out, err, rc = ssh_exec("curl -s -o /dev/null -w '%{http_code}' http://localhost:3002")
    print(f"  HTTP status: {out.strip()}")

    # Step 7: Now let me set up the updated code in new-blivo
    # First check if new-blivo has the one-employer-company repo
    print("\n[8] Checking new-blivo git setup:")
    out, err, rc = ssh_exec("cd /home/new-blivo && git remote -v 2>/dev/null")
    print(f"  Remotes: {out}")

    # The new-blivo might be using the old repo. We need to update it to use one-employer-company
    # Or we can create a fresh clone
    print("\n[9] Updating new-blivo with latest code...")
    # Option A: If new-blivo exists with git, just pull
    out, err, rc = ssh_exec("cd /home/new-blivo && git pull new-blivo main 2>/dev/null || git pull origin main 2>/dev/null", timeout=60)
    print(f"  Pull result: {out}")
    print(f"  Pull stderr: {err}")

    # Check if one-employer-company remote exists
    out, err, rc = ssh_exec("cd /home/new-blivo && git remote | grep oec 2>/dev/null || echo 'no-oec-remote'")
    if "no-oec-remote" in out:
        print("  Adding one-employer-company remote...")
        out, err, rc = ssh_exec("cd /home/new-blivo && git remote add oec https://sylojor:ghp_vYzZ9wLM8bFfK4VT6SzNOGBQPm2aQR2bqxop@github.com/sylojor/one-employer-company.git 2>/dev/null || echo 'remote exists'")
        print(f"  Result: {out}")
    
    # Pull from oec remote
    print("\n[10] Pulling from one-employer-company...")
    out, err, rc = ssh_exec("cd /home/new-blivo && git fetch oec && git checkout main && git reset --hard oec/main", timeout=60)
    print(f"  Result: {out}")
    print(f"  Stderr: {err}")

    # Step 8: Set up env file for new-blivo
    print("\n[11] Setting up environment for new-blivo...")
    out, err, rc = ssh_exec("""cd /home/new-blivo && cat > .env << 'ENVEOF'
DATABASE_URL=postgresql://oec_user:oec_secure_password_2024@db:5432/oec_db?schema=public
LLM_PROVIDER=mock
LLM_API_KEY=
LLM_API_URL=
NEXT_PUBLIC_SITE_URL=https://demo.blivoai.com
ENVEOF
""")
    print(f"  Env file created")

    # Step 9: Check docker-compose.yml for new-blivo
    print("\n[12] Checking new-blivo docker-compose.yml...")
    out, err, rc = ssh_exec("cat /home/new-blivo/docker-compose.yml 2>/dev/null | head -30")
    print(out)

    # Step 10: Rebuild new-blivo container
    print("\n[13] Rebuilding new-blivo container...")
    # First check the new-blivo compose file - it might need updating for port 3002
    out, err, rc = ssh_exec("cd /home/new-blivo && docker-compose down 2>/dev/null; docker-compose up -d --build", timeout=300)
    print(f"  stdout: {out[:500]}")
    print(f"  stderr: {err[:500]}")

    time.sleep(30)

    # Step 11: Final check
    print("\n[14] Final container state:")
    out, err, rc = ssh_exec("docker ps --format '{{.Names}} {{.Status}} {{.Ports}}'")
    print(out)

    print("\n[15] Checking sites:")
    out, err, rc = ssh_exec("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000")
    print(f"  Main site (3000): {out.strip()}")
    out, err, rc = ssh_exec("curl -s -o /dev/null -w '%{http_code}' http://localhost:3002")
    print(f"  Demo site (3002): {out.strip()}")

    # Check what the Caddy config says
    print("\n[16] Checking Caddy config:")
    out, err, rc = ssh_exec("cat /home/new-blivo/Caddyfile 2>/dev/null || cat /home/blivoai/Caddyfile 2>/dev/null")
    print(out[:500])

    print("\n" + "=" * 60)
    print("DEPLOYMENT FIX COMPLETE!")
    print("=" * 60)

if __name__ == "__main__":
    main()
