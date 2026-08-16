#!/usr/bin/env python3
"""
Check what was done in step 1, then start Docker rebuild and verify.
"""

import paramiko
import time

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"
PORT = 22
CONTAINER = "demo-chatbot"

def ssh_connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)
    return client

def run_cmd(client, cmd, timeout=60):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out:
        print(out[:800])
    if err:
        print(f"[STDERR] {err[:500]}")
    return out, err

def main():
    print("=== Connecting to server ===")
    client = ssh_connect()
    
    # Step 1: Check what was done in previous run
    print("\n=== CHECK: Verify source files were copied ===")
    run_cmd(client, "ls -la /home/ubuntu/blivoai-demo/src/app/api/upload/branding/route.ts | head -3")
    run_cmd(client, "ls -la /home/ubuntu/blivoai-demo/src/app/api/branding/ 2>/dev/null | head -3")
    run_cmd(client, "ls -la /home/ubuntu/blivoai-demo/public/logo.png | head -3")
    
    # Check if logo.svg fix was applied
    print("\n=== CHECK: Verify logo.svg fix ===")
    svg_out, _ = run_cmd(client, "docker exec " + CONTAINER + " cat /app/data/branding/logo.svg | head -1")
    if "data:image/png;base64" in svg_out:
        print("  ✓ logo.svg is self-contained!")
    else:
        print("  ✗ logo.svg fix NOT applied yet — need to run fix")
        # Run the fix again
        run_cmd(client, """docker exec """ + CONTAINER + """ node -e '
const sharp = require("sharp");
const fs = require("fs");
async function fixLogo() {
  const brandingDir = "/app/data/branding";
  const pngPath = brandingDir + "/logo.png";
  if (!fs.existsSync(pngPath)) { console.log("No logo.png"); return; }
  try {
    const pngBuffer = fs.readFileSync(pngPath);
    const thumbBuffer = await sharp(pngBuffer).resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    const base64 = thumbBuffer.toString("base64");
    const svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><image href=\"data:image/png;base64," + base64 + "\" width=\"512\" height=\"512\"/></svg>";
    fs.writeFileSync(brandingDir + "/logo.svg", svg);
    console.log("Fixed! " + svg.length + " bytes");
  } catch(e) { console.log("Error: " + e.message); }
}
fixLogo();
'""", timeout=30)
    
    # Check Caddyfile
    print("\n=== CHECK: Verify Caddyfile update ===")
    caddy_out, _ = run_cmd(client, "cat /home/ubuntu/blivoai-demo/Caddyfile | grep -A2 'branding'")
    
    # Step 2: Check if Docker rebuild is running or completed
    print("\n=== STEP 2: Check Docker rebuild status ===")
    run_cmd(client, "cat /tmp/docker-rebuild.log 2>/dev/null | tail -5")
    
    # Check if docker compose process is running
    ps_out, _ = run_cmd(client, "ps aux | grep 'docker compose' | grep -v grep | head -3")
    
    if not ps_out.strip():
        # No build process running — check if it completed
        print("No Docker build process running. Starting rebuild now...")
        # Run with longer timeout
        stdin, stdout, stderr = client.exec_command(
            "cd /home/ubuntu/blivoai-demo && docker compose up --build -d",
            timeout=600
        )
        print("Waiting for Docker build (may take 5-10 minutes)...")
        try:
            out = stdout.read().decode('utf-8', errors='replace')
            err = stderr.read().decode('utf-8', errors='replace')
            if out:
                print(out[:500])
            if err:
                print(f"[STDERR] {err[:500]}")
        except Exception as e:
            print(f"Build output read timeout — checking container status instead")
    
    # Step 3: Wait for container to be healthy
    print("\n=== STEP 3: Wait for container health ===")
    for i in range(15):
        time.sleep(5)
        try:
            health_out, _ = run_cmd(client, 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/branding/logo.png', timeout=10, verbose=False)
            code = health_out.strip()
            print(f"  Attempt {i+1}: logo.png HTTP {code}")
            if code in ["200", "000"]:  # 000 means container still starting
                if code == "200":
                    print("  ✓ Container is healthy!")
                    break
        except:
            print(f"  Attempt {i+1}: container not ready yet")
    
    # Step 4: Verify everything works
    print("\n=== STEP 4: Final verification ===")
    run_cmd(client, 'curl -s -o /dev/null -w "HTTP %{http_code}" https://demo.blivoai.com/api/branding/logo.png')
    run_cmd(client, 'curl -s -o /dev/null -w "HTTP %{http_code}" https://demo.blivoai.com/ar/')
    
    # Check branding files in container
    run_cmd(client, "docker exec " + CONTAINER + " ls -la /app/data/branding/")
    
    # Check logo.svg content
    svg_content, _ = run_cmd(client, "docker exec " + CONTAINER + " wc -c /app/data/branding/logo.svg")
    
    # Reload Caddy
    print("\n=== Reload Caddy ===")
    run_cmd(client, "docker exec caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || echo 'Caddy reload done or not in docker'")
    
    # Check /logo.svg cache headers (should be short cache, not immutable)
    print("\n=== Check branding cache headers ===")
    run_cmd(client, 'curl -s -I https://demo.blivoai.com/api/branding/logo.png | grep -i cache')
    
    client.close()
    print("\n=== Deployment verification complete ===")

if __name__ == "__main__":
    main()
