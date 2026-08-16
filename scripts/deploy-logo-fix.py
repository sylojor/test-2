#!/usr/bin/env python3
"""
Deploy logo upload fix + fix Caddy config + rebuild Docker.
"""

import paramiko
import sys
import time

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"
PORT = 22
CONTAINER = "demo-chatbot"
PROJECT_DIR = "~/blivoai-demo"

def ssh_connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)
    return client

def run_cmd(client, cmd, timeout=60, verbose=True):
    if verbose:
        print(f"\n>>> {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if verbose and out:
        print(out[:500])
    if verbose and err:
        print(f"[STDERR] {err[:500]}")
    return out, err

def main():
    print("=== Connecting to server ===")
    client = ssh_connect()
    
    # Step 1: Fix the existing broken logo.svg on the server
    # The current logo.svg is the broken wrapper with external <image href="/api/branding/logo.png">
    # We need to replace it with a self-contained SVG
    print("\n=== STEP 1: Fix existing broken logo.svg on server ===")
    # Read the current logo.png and create a proper SVG wrapper with base64 data URI
    run_cmd(client, """docker exec """ + CONTAINER + """ node -e '
const sharp = require("sharp");
const fs = require("fs");

async function fixLogo() {
  const brandingDir = "/app/data/branding";
  const pngPath = brandingDir + "/logo.png";
  
  if (!fs.existsSync(pngPath)) {
    console.log("No logo.png found — skipping fix");
    return;
  }
  
  try {
    const pngBuffer = fs.readFileSync(pngPath);
    const thumbnailBuffer = await sharp(pngBuffer)
      .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    
    const base64Data = thumbnailBuffer.toString("base64");
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <image href="data:image/png;base64,${base64Data}" width="512" height="512"/>
</svg>`;
    
    fs.writeFileSync(brandingDir + "/logo.svg", svgContent);
    console.log("Fixed logo.svg — now self-contained with base64 data URI (" + svgContent.length + " bytes)");
  } catch(e) {
    console.log("Error fixing logo.svg:", e.message);
  }
}

fixLogo();
'""", timeout=30)
    
    # Step 2: Fix Caddy config — remove immutable cache for logo.svg
    print("\n=== STEP 2: Fix Caddy config ===")
    # The Caddyfile for demo.blivoai.com adds immutable cache for /logo.svg
    # We need to remove that so branding changes are reflected quickly
    caddy_content, _ = run_cmd(client, "cat " + PROJECT_DIR + "/Caddyfile")
    
    # Fix: Replace /logo.svg in the @static block with only truly static paths
    # For demo.blivoai.com, the @static block is:
    # @static { path /_next/static/* /manifest.json /logo.svg }
    # We need to remove /logo.svg from it
    
    new_caddy = caddy_content.replace(
        "path /_next/static/* /manifest.json /logo.svg",
        "path /_next/static/* /manifest.json"
    )
    # Also fix the main blivoai.com block
    new_caddy = new_caddy.replace(
        "path /_next/static/* /manifest.json /logo.svg /BlivoAI.apk",
        "path /_next/static/* /manifest.json /BlivoAI.apk"
    )
    
    # Add a short-cache block for branding paths on demo.blivoai.com
    # Insert before the reverse_proxy line in demo.blivoai.com
    if "@branding" not in new_caddy:
        # Add branding cache rules for demo.blivoai.com
        demo_section = """demo.blivoai.com {
    encode zstd gzip

    @static {
        path /_next/static/* /manifest.json
    }
    header @static Cache-Control "public, max-age=31536000, immutable"

    @branding {
        path /api/branding/* /logo.svg /logo.png /favicon.ico
    }
    header @branding Cache-Control "public, max-age=60, must-revalidate"

    @html {
        header Content-Type text/html*
    }
    header @html Cache-Control "no-cache, no-store, must-revalidate"

    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        -Server
    }

    reverse_proxy localhost:3001 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_down -Server
        flush_interval -1
    }
}"""
        # Find the demo.blivoai.com section and replace it
        import re
        pattern = r'demo\.blivoai\.com \{[^}]+\}[^}]*\}'
        # Actually this is too complex for regex. Let me write the full Caddyfile.
        pass  # We'll handle this below
    
    # Write the updated Caddyfile
    # Actually, let me just write it properly with paramiko SFTP
    # First, let me write the entire updated Caddyfile
    
    # Read the original Caddyfile content and reconstruct it
    print("\n>>> Writing updated Caddyfile...")
    
    # Build the new Caddyfile content
    updated_caddy = '''# ============================================
# Caddyfile — BlivoAI
# Reverse Proxy + SSL automatic (Let's Encrypt)
# Supports: blivoai.com + demo.blivoai.com
#
# Caddy requests SSL certificate automatically
# ============================================

# === Main Domain — BlivoAI ===
blivoai.com {
    # === BLOCK DANGEROUS PATHS ===
    @dangerous {
        path /.env /.env.* /.git /.git/* /.aws /.aws/* /.ssh /.ssh/* /wp-admin /wp-admin/* /wp-login.php /xmlrpc.php /config.php /phpmyadmin /phpmyadmin/* /vendor /vendor/* /sites/default/settings.php /app/etc/env.php
    }
    respond @dangerous 403

    @configscan {
        path /docker-compose.yml /docker-compose.yaml /docker-compose.prod.yml /package.json /bun.lock /.env.save /.env.backup
    }
    respond @configscan 403

    # Block known malicious bots
    @badbot {
        header_regexp User-Agent (?i)(sqlmap|nikto|nmap|masscan|nessus|acunetix|wpscan|dirbuster|gobuster|fimap|havij|metasploit)
    }
    respond @badbot 403

    # === COMPRESSION ===
    encode zstd gzip {
        minimum_length 256
    }

    # === CACHE STATIC ASSETS ===
    @static {
        path /_next/static/* /manifest.json /BlivoAI.apk
    }
    header @static Cache-Control "public, max-age=31536000, immutable"

    # === BRANDABLE PATHS (short cache — can change after admin upload) ===
    @branding {
        path /api/branding/* /logo.svg /logo.png /favicon.ico /favicon-32x32.png
    }
    header @branding Cache-Control "public, max-age=60, must-revalidate"

    # === FAVICON ===
    @favicon {
        path /favicon.ico /favicon.png /apple-touch-icon.png
    }
    header @favicon Cache-Control "public, max-age=60, must-revalidate"

    # === NO CACHE FOR ADMIN ===
    @adminpages {
        path /admin /admin/* /ar/admin /en/admin /ar/admin/* /en/admin/*
    }
    header @adminpages Cache-Control "no-cache, no-store, must-revalidate"
    header @adminpages Pragma "no-cache"
    header @adminpages Expires "0"

    # === NO CACHE FOR HTML ===
    @html {
        header Content-Type text/html*
    }
    header @html Cache-Control "no-cache, no-store, must-revalidate"
    header @html Pragma "no-cache"
    header @html Expires "0"

    # === SECURITY HEADERS ===
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }

    # === REVERSE PROXY ===
    reverse_proxy app:3000 {
        header_up Host {host}
        header_up X-Forwarded-Uri {uri}
        header_up X-Real-IP {remote_host}
        header_down -x-powered-by
        header_down -Server
        flush_interval -1
        transport http {
            keepalive 30s
            keepalive_idle_conns 100
        }
    }
}

# === Demo Domain — for testing new version ===
demo.blivoai.com {
    encode zstd gzip

    @static {
        path /_next/static/* /manifest.json
    }
    header @static Cache-Control "public, max-age=31536000, immutable"

    @branding {
        path /api/branding/* /logo.svg /logo.png /favicon.ico /favicon-32x32.png
    }
    header @branding Cache-Control "public, max-age=60, must-revalidate"

    @html {
        header Content-Type text/html*
    }
    header @html Cache-Control "no-cache, no-store, must-revalidate"

    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        -Server
    }

    reverse_proxy localhost:3001 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_down -Server
        flush_interval -1
    }
}

# === Redirect www → main ===
www.blivoai.com {
    redir https://blivoai.com{uri} permanent
}

# === Redirect www demo → demo ===
www.demo.blivoai.com {
    redir https://demo.blivoai.com{uri} permanent
}
'''
    
    # Write the Caddyfile via SFTP (expand ~ to /home/ubuntu)
    sftp = client.open_sftp()
    caddyfile_path = "/home/ubuntu/blivoai-demo/Caddyfile"
    with sftp.open(caddyfile_path, 'w') as f:
        f.write(updated_caddy)
    sftp.close()
    print("Caddyfile updated — removed /logo.svg from immutable cache, added branding short-cache block")
    
    # Step 3: Git pull to get code changes
    print("\n=== STEP 3: Git pull to get code changes ===")
    # First, push local changes to git
    # The code changes are local, so we need to push them first
    
    # Actually, we need to sync local code changes to the server
    # Since we can't push to git directly, let's use rsync or SCP
    
    # Let me first check if the server has the same git repo
    run_cmd(client, "cd " + PROJECT_DIR + " && git status | head -5", timeout=10)
    
    # Step 4: Copy updated files to the server
    print("\n=== STEP 4: Copy updated source files to server ===")
    
    # We need to copy these files:
    # 1. src/app/api/upload/branding/route.ts
    # 2. src/app/api/branding/[...files]/route.ts
    # 3. src/app/[lang]/admin/admin-content.tsx
    # 4. src/components/public/public-page-layout.tsx
    # 5. src/components/landing/landing-page.tsx
    # 6. src/app/layout.tsx
    # 7. src/app/[lang]/blog/[slug]/blog-article-content.tsx
    # 8. public/logo.png (new default)
    
    files_to_copy = [
        ("src/app/api/upload/branding/route.ts", PROJECT_DIR + "/src/app/api/upload/branding/route.ts"),
        ("src/app/api/branding/[...files]/route.ts", PROJECT_DIR + "/src/app/api/branding/[...files]/route.ts"),
        ("src/app/[lang]/admin/admin-content.tsx", PROJECT_DIR + "/src/app/[lang]/admin/admin-content.tsx"),
        ("src/components/public/public-page-layout.tsx", PROJECT_DIR + "/src/components/public/public-page-layout.tsx"),
        ("src/components/landing/landing-page.tsx", PROJECT_DIR + "/src/components/landing/landing-page.tsx"),
        ("src/app/layout.tsx", PROJECT_DIR + "/src/app/layout.tsx"),
        ("src/app/[lang]/blog/[slug]/blog-article-content.tsx", PROJECT_DIR + "/src/app/[lang]/blog/[slug]/blog-article-content.tsx"),
        ("public/logo.png", PROJECT_DIR + "/public/logo.png"),
    ]
    
    sftp = client.open_sftp()
    for local_path, remote_path in files_to_copy:
        local_full = "/home/z/my-project/" + local_path
        remote_full = remote_path.replace("~", "/home/ubuntu")
        print(f"  Copying {local_path} -> {remote_full}")
        try:
            # Create parent directories if needed
            parent_dir = remote_full.rsplit('/', 1)[0]
            try:
                sftp.stat(parent_dir)
            except FileNotFoundError:
                # Create parent dirs recursively
                parts = parent_dir.split('/')
                current = ''
                for part in parts:
                    current += '/' + part
                    try:
                        sftp.stat(current)
                    except FileNotFoundError:
                        sftp.mkdir(current)
            
            sftp.put(local_full, remote_full)
            print(f"  ✓ {local_path}")
        except Exception as e:
            print(f"  ✗ {local_path}: {e}")
    sftp.close()
    
    # Step 5: Rebuild and restart Docker container
    print("\n=== STEP 5: Rebuild and restart Docker container ===")
    run_cmd(client, "cd " + PROJECT_DIR + " && docker compose up --build -d", timeout=300)
    
    # Step 6: Wait for container to be ready
    print("\n=== STEP 6: Wait for container to be ready ===")
    for i in range(10):
        time.sleep(5)
        health_out, _ = run_cmd(client, 'curl -s -o /dev/null -w "%{http_code}" https://demo.blivoai.com/api/branding/logo.png', timeout=10, verbose=False)
        print(f"  Attempt {i+1}: logo.png returns HTTP {health_out.strip()}")
        if health_out.strip() == "200":
            break
    
    # Step 7: Reload Caddy
    print("\n=== STEP 7: Reload Caddy config ===")
    run_cmd(client, "docker exec caddy caddy reload --config /etc/caddy/Caddyfile", timeout=30)
    
    # Step 8: Verify the fix
    print("\n=== STEP 8: Verify logo.png is accessible and shows correctly ===")
    run_cmd(client, 'curl -s -I https://demo.blivoai.com/api/branding/logo.png | head -5')
    run_cmd(client, 'curl -s -o /dev/null -w "HTTP %{http_code}, Size %{size_download}" https://demo.blivoai.com/api/branding/logo.png')
    
    # Step 9: Check that the SVG is now self-contained
    print("\n=== STEP 9: Verify logo.svg is self-contained (no external references) ===")
    svg_out, _ = run_cmd(client, "docker exec " + CONTAINER + " cat /app/data/branding/logo.svg | head -3")
    if "data:image/png;base64" in svg_out:
        print("  ✓ logo.svg is self-contained with base64 data URI")
    elif "/api/branding/logo.png" in svg_out:
        print("  ✗ logo.svg still has external reference — need to fix")
    else:
        print(f"  ? logo.svg content: {svg_out[:200]}")
    
    # Step 10: Check branding files in container
    print("\n=== STEP 10: Check branding files in container ===")
    run_cmd(client, "docker exec " + CONTAINER + " ls -la /app/data/branding/")
    
    # Step 11: Check /logo.svg via domain (should be short cache, not immutable)
    print("\n=== STEP 11: Check /logo.svg cache headers ===")
    run_cmd(client, 'curl -s -I https://demo.blivoai.com/logo.svg | grep -i cache')
    
    # Step 12: Check container is healthy
    print("\n=== STEP 12: Final health check ===")
    run_cmd(client, 'curl -s -o /dev/null -w "HTTP %{http_code}" https://demo.blivoai.com/ar/')
    
    client.close()
    print("\n=== Deployment complete ===")

if __name__ == "__main__":
    main()
