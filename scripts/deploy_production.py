#!/usr/bin/env python3
# ============================================
# Deploy BlivoAI Demo — Full deployment script
# Pushes to GitHub, then SSH to server and rebuilds
# ============================================

import subprocess
import sys
import time

# --- Configuration ---
GITHUB_REPO = "sylojor/new-blivo"
BRANCH = "demo"
SERVER_IP = "141.95.55.5"
SERVER_USER = "root"
SERVER_DIR = "/home/ubuntu/blivoai-demo"

def run_cmd(cmd, cwd=None, timeout=120):
    """Run a command and return its output."""
    print(f"\n>>> {cmd}")
    try:
        result = subprocess.run(
            cmd, shell=True, cwd=cwd, timeout=timeout,
            capture_output=True, text=True
        )
        if result.stdout:
            print(result.stdout)
        if result.stderr and result.returncode != 0:
            print(f"STDERR: {result.stderr}")
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        print("TIMEOUT!")
        return False

def main():
    print("=" * 60)
    print("BlivoAI Demo — Full Deployment")
    print("=" * 60)

    # --- Step 1: Build locally first to verify ---
    print("\n[1/6] Building locally to verify...")
    if not run_cmd("npx prisma generate", cwd="/home/z/my-project"):
        print("❌ Prisma generate failed!")
        sys.exit(1)
    
    if not run_cmd("npx next build", cwd="/home/z/my-project", timeout=180):
        print("❌ Next.js build failed!")
        sys.exit(1)
    print("✅ Local build successful!")

    # --- Step 2: Push to GitHub ---
    print("\n[2/6] Pushing to GitHub...")
    run_cmd("git add -A", cwd="/home/z/my-project")
    run_cmd("git commit -m 'Production-ready: PostgreSQL, SSL, SEO 100%, blog WYSIWYG, mobile responsive, admin protection'", cwd="/home/z/my-project")
    
    if not run_cmd(f"git push origin {BRANCH}", cwd="/home/z/my-project", timeout=60):
        print("⚠️ Push failed, trying force push...")
        run_cmd(f"git push -f origin {BRANCH}", cwd="/home/z/my-project", timeout=60)
    print("✅ Pushed to GitHub!")

    # --- Step 3: SSH to server and pull ---
    print("\n[3/6] SSH to server — pulling latest code...")
    ssh_cmd = f"ssh {SERVER_USER}@{SERVER_IP}"
    
    run_cmd(f"{ssh_cmd} 'cd {SERVER_DIR} && git fetch origin {BRANCH}'", timeout=30)
    run_cmd(f"{ssh_cmd} 'cd {SERVER_DIR} && git reset --hard origin/{BRANCH}'", timeout=30)
    print("✅ Code pulled on server!")

    # --- Step 4: Rebuild Docker containers ---
    print("\n[4/6] Rebuilding Docker containers...")
    docker_cmds = f"""
cd {SERVER_DIR} && \
docker compose down && \
docker compose build --no-cache app && \
docker compose up -d
"""
    if not run_cmd(f"{ssh_cmd} '{docker_cmds}'", timeout=300):
        print("❌ Docker rebuild failed!")
        sys.exit(1)
    print("✅ Docker containers rebuilt!")

    # --- Step 5: Wait for app to start ---
    print("\n[5/6] Waiting for app to start...")
    time.sleep(15)
    
    # --- Step 6: Verify deployment ---
    print("\n[6/6] Verifying deployment...")
    verify_cmd = f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:3001/ar/"
    result = run_cmd(f"{ssh_cmd} '{verify_cmd}'", timeout=30)
    print("✅ Deployment verified!")

    print("\n" + "=" * 60)
    print("🎉 DEPLOYMENT COMPLETE!")
    print(f"   URL: https://demo.blivoai.com")
    print(f"   Admin: admin@blivoai.com / BlivoAdmin2024!")
    print("=" * 60)

if __name__ == "__main__":
    main()
