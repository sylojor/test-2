#!/usr/bin/env python3
"""
Step 1: Fix existing broken logo.svg on server + update Caddy config + copy source files.
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
    
    # Step 1: Fix the existing broken logo.svg in the container
    print("\n=== STEP 1: Fix existing broken logo.svg ===")
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
    const svgContent = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><image href=\"data:image/png;base64," + base64Data + "\" width=\"512\" height=\"512\"/></svg>";
    
    fs.writeFileSync(brandingDir + "/logo.svg", svgContent);
    console.log("Fixed logo.svg — now self-contained (" + svgContent.length + " bytes)");
  } catch(e) {
    console.log("Error:", e.message);
  }
}
fixLogo();
'""", timeout=30)
    
    # Step 2: Check if the fix worked
    print("\n=== STEP 2: Verify logo.svg fix ===")
    svg_out, _ = run_cmd(client, "docker exec " + CONTAINER + " cat /app/data/branding/logo.svg | head -1")
    if "data:image/png;base64" in svg_out:
        print("  ✓ logo.svg is now self-contained with base64 data URI")
    elif "/api/branding/logo.png" in svg_out:
        print("  ✗ logo.svg still has external reference!")
    else:
        print(f"  ? logo.svg content: {svg_out[:200]}")
    
    # Step 3: Copy updated source files via SFTP
    print("\n=== STEP 3: Copy source files to server ===")
    
    files_to_copy = [
        "/home/z/my-project/src/app/api/upload/branding/route.ts",
        "/home/z/my-project/src/app/api/branding/[...files]/route.ts",
        "/home/z/my-project/src/app/[lang]/admin/admin-content.tsx",
        "/home/z/my-project/src/components/public/public-page-layout.tsx",
        "/home/z/my-project/src/components/landing/landing-page.tsx",
        "/home/z/my-project/src/app/layout.tsx",
        "/home/z/my-project/src/app/[lang]/blog/[slug]/blog-article-content.tsx",
        "/home/z/my-project/public/logo.png",
    ]
    
    remote_base = "/home/ubuntu/blivoai-demo"
    
    sftp = client.open_sftp()
    for local_path in files_to_copy:
        # Calculate remote path by replacing local base with remote base
        rel_path = local_path.replace("/home/z/my-project/", "")
        remote_path = remote_base + "/" + rel_path
        
        print(f"  Copying {rel_path}")
        try:
            # Create parent directories
            parent_dir = remote_path.rsplit('/', 1)[0]
            try:
                sftp.stat(parent_dir)
            except FileNotFoundError:
                # Create dirs step by step
                parts = parent_dir.split('/')
                current = ''
                for part in parts:
                    current += '/' + part
                    try:
                        sftp.stat(current)
                    except FileNotFoundError:
                        sftp.mkdir(current)
            
            sftp.put(local_path, remote_path)
            print(f"  ✓ {rel_path}")
        except Exception as e:
            print(f"  ✗ {rel_path}: {e}")
    sftp.close()
    
    # Step 4: Update Caddyfile
    print("\n=== STEP 4: Update Caddyfile ===")
    
    updated_caddy = '''# ============================================
# Caddyfile — BlivoAI
# ============================================

blivoai.com {
    @dangerous {
        path /.env /.env.* /.git /.git/* /.aws /.aws/* /.ssh /.ssh/* /wp-admin /wp-admin/* /wp-login.php /xmlrpc.php /config.php /phpmyadmin /phpmyadmin/* /vendor /vendor/* /sites/default/settings.php /app/etc/env.php
    }
    respond @dangerous 403

    @configscan {
        path /docker-compose.yml /docker-compose.yaml /docker-compose.prod.yml /package.json /bun.lock /.env.save /.env.backup
    }
    respond @configscan 403

    @badbot {
        header_regexp User-Agent (?i)(sqlmap|nikto|nmap|masscan|nessus|acunetix|wpscan|dirbuster|gobuster|fimap|havij|metasploit)
    }
    respond @badbot 403

    encode zstd gzip {
        minimum_length 256
    }

    @static {
        path /_next/static/* /manifest.json /BlivoAI.apk
    }
    header @static Cache-Control "public, max-age=31536000, immutable"

    @branding {
        path /api/branding/* /logo.svg /logo.png /favicon.ico /favicon-32x32.png
    }
    header @branding Cache-Control "public, max-age=60, must-revalidate"

    @adminpages {
        path /admin /admin/* /ar/admin /en/admin /ar/admin/* /en/admin/*
    }
    header @adminpages Cache-Control "no-cache, no-store, must-revalidate"
    header @adminpages Pragma "no-cache"
    header @adminpages Expires "0"

    @html {
        header Content-Type text/html*
    }
    header @html Cache-Control "no-cache, no-store, must-revalidate"
    header @html Pragma "no-cache"
    header @html Expires "0"

    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }

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

www.blivoai.com {
    redir https://blivoai.com{uri} permanent
}

www.demo.blivoai.com {
    redir https://demo.blivoai.com{uri} permanent
}
'''
    
    sftp = client.open_sftp()
    with sftp.open("/home/ubuntu/blivoai-demo/Caddyfile", 'w') as f:
        f.write(updated_caddy)
    sftp.close()
    print("Caddyfile updated ✓")
    
    # Step 5: Start Docker rebuild in background
    print("\n=== STEP 5: Start Docker rebuild ===")
    # Use nohup so it continues even if SSH disconnects
    run_cmd(client, "cd /home/ubuntu/blivoai-demo && nohup docker compose up --build -d > /tmp/docker-rebuild.log 2>&1 &")
    print("Docker rebuild started in background. Will check status in next step.")
    
    client.close()
    print("\n=== Step 1 complete: Files copied + Caddy updated + Docker rebuild started ===")

if __name__ == "__main__":
    main()
