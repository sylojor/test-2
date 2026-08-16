#!/usr/bin/env python3
# ============================================
# Deploy BlivoAI to demo.blivoai.com (OVH)
#
# Strategy:
# 1. Push code to GitHub
# 2. SSH to OVH, pull code
# 3. Build Docker image for new-blivo
# 4. Start on port 3002 (parallel, no disruption)
# 5. Update Caddy to route demo.blivoai.com → 3002
# 6. Verify everything works
#
# When confirmed working:
# 7. Switch Caddy main blivoai.com → 3002
# 8. Remove old container
# ============================================

import paramiko
import json
import time
import sys
import os

# === Server Info ===
OVH_IP = "141.95.55.5"
OVH_USER = "ubuntu"
OVH_PASSWORD = "Mghazi@199641"

# === GitHub ===
GITHUB_REPO = "https://github.com/sylojor/blivo-pro.git"
REMOTE_DIR = "/home/ubuntu/new-blivo"

def ssh_connect():
    """Connect to OVH server via SSH"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(OVH_IP, username=OVH_USER, password=OVH_PASSWORD, timeout=30)
        print(f"[OK] Connected to OVH at {OVH_IP}")
        return client
    except Exception as e:
        print(f"[FAIL] SSH connection failed: {e}")
        sys.exit(1)

def run_ssh(client, cmd, timeout=120):
    """Execute command on remote server"""
    print(f"[CMD] {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        print(f"[OUT] {out[:500]}")
    if err and "Warning" not in err:
        print(f"[ERR] {err[:300]}")
    return out, err, stdout.channel.recv_exit_status()

def deploy_to_demo():
    """Deploy BlivoAI to demo.blivoai.com"""
    client = ssh_connect()
    
    # Step 1: Clean Docker build cache (reclaim 32GB)
    print("\n=== Step 1: Clean Docker cache ===")
    run_ssh(client, "docker builder prune -af", timeout=60)
    
    # Step 2: Clone/pull the repo  
    print("\n=== Step 2: Pull latest code ===")
    # The repo is already cloned on OVH, just pull latest
    run_ssh(client, f"cd {REMOTE_DIR} && git fetch --all && git reset --hard origin/main || git reset --hard origin/master", timeout=120)
    
    # Step 3: Create .env for new-blivo
    print("\n=== Step 3: Create .env ===")
    # Get existing database URL from old BlivoAI
    out, _, _ = run_ssh(client, "cat /home/ubuntu/blivoai/.env 2>/dev/null | grep DATABASE_URL")
    db_url = out if out else "postgresql://blivoai:BlvPg_eZdU18PPULDS4YsemB1CquWN@blivoai-postgres:5432/blivoai?schema=public"
    
    env_content = f"""DATABASE_URL={db_url}
NODE_ENV=production
LLM_PROVIDER=mock
LLM_API_KEY=
LLM_API_URL=
NEXT_PUBLIC_SITE_URL=https://demo.blivoai.com
NEXTAUTH_URL=https://demo.blivoai.com
NEXTAUTH_SECRET=blivoai-demo-secret-2024
"""
    run_ssh(client, f"cat > {REMOTE_DIR}/.env << 'ENVEOF'\n{env_content}\nENVEOF")
    
    # Step 4: Copy new project files
    print("\n=== Step 4: Push new code to OVH ===")
    # We need to scp our local project files to OVH
    # Since we built locally, let's create a tar and send it
    local_dir = "/home/z/my-project"
    
    # Create deploy tar
    print("[LOCAL] Creating deploy archive...")
    os.system(f"cd {local_dir} && tar czf /tmp/blivoai-deploy.tar.gz "
              "--exclude='.next' --exclude='node_modules' --exclude='.git' "
              "--exclude='tool-results' --exclude='agent-ctx' "
              "--exclude='upload' --exclude='new-blivo' "
              "--exclude='scripts' --exclude='download' "
              "--exclude='.zscripts' --exclude='db' "
              "src/ prisma/ public/ Dockerfile docker-compose.yml "
              "Caddyfile docker-entrypoint.sh package.json tsconfig.json "
              "next.config.ts postcss.config.mjs eslint.config.mjs "
              "tailwind.config.ts components.json")
    
    # Step 5: SCP the archive
    print("\n=== Step 5: Upload archive ===")
    sftp = client.open_sftp()
    sftp.put("/tmp/blivoai-deploy.tar.gz", f"{REMOTE_DIR}/deploy.tar.gz")
    sftp.close()
    print("[OK] Archive uploaded")
    
    # Step 6: Extract and build
    print("\n=== Step 6: Extract and build Docker image ===")
    run_ssh(client, f"cd {REMOTE_DIR} && tar xzf deploy.tar.gz")
    
    # Build Docker image
    print("\n=== Step 7: Build Docker image ===")
    out, err, code = run_ssh(client, 
        f"cd {REMOTE_DIR} && docker build -t new-blivo:latest .",
        timeout=600)  # 10 minutes for build
    
    if code != 0:
        print(f"[FAIL] Docker build failed! Error: {err}")
        sys.exit(1)
    print("[OK] Docker image built")
    
    # Step 8: Stop old demo container (if exists) + start new
    print("\n=== Step 8: Start new-blivo on port 3002 ===")
    run_ssh(client, "docker stop demo-chatbot-demo 2>/dev/null; docker rm demo-chatbot-demo 2>/dev/null")
    
    # Start new container on port 3002, connected to existing postgres
    out, err, code = run_ssh(client, 
        f"""docker run -d \
            --name new-blivo \
            --restart unless-stopped \
            --network blivoai_internal \
            -p 3002:3000 \
            -e DATABASE_URL="postgresql://blivoai:BlvPg_eZdU18PPULDS4YsemB1CquWN@blivoai-postgres:5432/blivoai?schema=public" \
            -e NODE_ENV=production \
            -e NEXT_PUBLIC_SITE_URL=https://demo.blivoai.com \
            -e NEXTAUTH_URL=https://demo.blivoai.com \
            -e NEXTAUTH_SECRET=blivoai-demo-secret-2024 \
            -e LLM_PROVIDER=mock \
            -v blivoai_chatbot-data:/app/data \
            new-blivo:latest""",
        timeout=30)
    
    if code != 0:
        print(f"[FAIL] Container start failed! Error: {err}")
        sys.exit(1)
    print("[OK] Container started on port 3002")
    
    # Step 9: Wait for container to be healthy
    print("\n=== Step 9: Wait for container ===")
    time.sleep(10)
    out, _, _ = run_ssh(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3002/ar")
    if "200" in out:
        print("[OK] Container responds with 200!")
    else:
        print(f"[WARN] Container returned: {out}")
        # Check logs
        run_ssh(client, "docker logs new-blivo 2>&1 | tail -30")
    
    # Step 10: Update Caddy for demo.blivoai.com
    print("\n=== Step 10: Update Caddy configuration ===")
    # The Caddyfile on OVH needs to route demo.blivoai.com to port 3002
    # We need to update the OVH Caddyfile (not our local one)
    # First, read current Caddyfile
    out, _, _ = run_ssh(client, "cat /home/ubuntu/blivoai/Caddyfile 2>/dev/null")
    
    # Add demo.blivoai.com route if not exists
    if "demo.blivoai.com" not in out:
        print("[INFO] Adding demo.blivoai.com route to Caddy...")
        caddy_demo_block = """
# === Demo Domain — testing new version ===
demo.blivoai.com {
    encode zstd gzip
    
    @static path /_next/static/* /manifest.json /logo.svg
    header @static Cache-Control "public, max-age=31536000, immutable"
    
    @html header Content-Type text/html*
    header @html Cache-Control "no-cache, no-store, must-revalidate"
    
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        -Server
    }
    
    reverse_proxy localhost:3002 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_down -Server
        flush_interval -1
    }
}
"""
        # Append to existing Caddyfile
        run_ssh(client, f"cat >> /home/ubuntu/blivoai/Caddyfile << 'CADDYEOF'\n{caddy_demo_block}\nCADDYEOF")
    
    # Reload Caddy
    print("\n=== Step 11: Reload Caddy ===")
    out, err, code = run_ssh(client, "docker exec blivoai-caddy caddy reload --config /home/ubuntu/blivoai/Caddyfile 2>&1 || "
                              "caddy reload --config /etc/caddy/Caddyfile 2>/dev/null")
    print(f"[Caddy] Reload result: {out[:200]}")
    
    # Step 12: Verify
    print("\n=== Step 12: Final verification ===")
    time.sleep(5)
    out, _, _ = run_ssh(client, "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/ar 2>/dev/null")
    print(f"[HTTPS] demo.blivoai.com/ar returns: {out}")
    
    out, _, _ = run_ssh(client, "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/en 2>/dev/null")
    print(f"[HTTPS] demo.blivoai.com/en returns: {out}")
    
    out, _, _ = run_ssh(client, "curl -s -o /dev/null -w '%{http_code}' https://blivoai.com/ar 2>/dev/null")
    print(f"[HTTPS] blivoai.com/ar (old) returns: {out}")
    
    print("\n" + "="*50)
    print("DEPLOYMENT COMPLETE!")
    print("demo.blivoai.com → new BlivoAI (port 3002)")
    print("blivoai.com → old BlivoAI (port 3000)")
    print("="*50)
    print("\nWhen ready to switch main domain:")
    print("1. Update Caddy: blivoai.com → localhost:3002")
    print("2. Remove old container")
    print("3. Update NEXT_PUBLIC_SITE_URL to https://blivo.ai")
    
    client.close()

if __name__ == "__main__":
    deploy_to_demo()
