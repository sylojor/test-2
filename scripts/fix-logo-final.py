#!/usr/bin/env python3
"""
Fix remaining issues: 
1. Verify logo.svg is truly self-contained (check full content)
2. Fix Caddy config properly
3. Reload Caddy correctly
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

def run_cmd(client, cmd, timeout=30):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out:
        print(out[:1000])
    if err:
        print(f"[STDERR] {err[:500]}")
    return out, err

def main():
    print("=== Connecting ===")
    client = ssh_connect()
    
    # 1. Check logo.svg full content — is it the base64 self-contained version?
    print("\n=== CHECK: Full logo.svg content ===")
    svg_size_out, _ = run_cmd(client, "docker exec " + CONTAINER + " wc -c /app/data/branding/logo.svg")
    svg_size = int(svg_size_out.strip().split()[0])
    print(f"logo.svg size: {svg_size} bytes")
    
    if svg_size > 500:
        # Check if it contains base64 data URI
        svg_start, _ = run_cmd(client, "docker exec " + CONTAINER + " head -c 200 /app/data/branding/logo.svg")
        if "data:image/png;base64" in svg_start:
            print("✓ logo.svg IS self-contained with base64 data URI!")
        else:
            print(f"logo.svg start: {svg_start[:200]}")
            # Check if the base64 data is somewhere else in the file
            svg_grep, _ = run_cmd(client, "docker exec " + CONTAINER + " grep -c 'data:image' /app/data/branding/logo.svg")
            if "1" in svg_grep:
                print("✓ logo.svg contains base64 data URI (on a different line)")
            else:
                print("✗ logo.svg does NOT contain base64 data URI")
                # Need to fix manually
    elif svg_size < 200:
        # It's the broken wrapper
        print(f"✗ logo.svg is the broken wrapper ({svg_size} bytes)")
        # Fix it using a proper script
        print("Fixing logo.svg...")
        
        # Create a Node.js script file to avoid quoting issues
        fix_script = '''const sharp = require("sharp");
const fs = require("fs");

async function fixLogo() {
  const brandingDir = "/app/data/branding";
  const pngPath = brandingDir + "/logo.png";
  
  if (!fs.existsSync(pngPath)) {
    console.log("No logo.png found");
    return;
  }
  
  try {
    const pngBuffer = fs.readFileSync(pngPath);
    const thumbBuffer = await sharp(pngBuffer)
      .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    
    const base64Data = thumbBuffer.toString("base64");
    const svgContent = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">',
      '<image href="data:image/png;base64,' + base64Data + '" width="512" height="512"/>',
      '</svg>'
    ].join("\\n");
    
    fs.writeFileSync(brandingDir + "/logo.svg", svgContent);
    console.log("Fixed! " + svgContent.length + " bytes");
  } catch(e) {
    console.log("Error: " + e.message);
  }
}

fixLogo();
'''
        
        # Write script to server, then execute it in the container
        sftp = client.open_sftp()
        with sftp.open("/tmp/fix-logo.js", 'w') as f:
            f.write(fix_script)
        sftp.close()
        
        # Copy script into container and execute
        run_cmd(client, "docker cp /tmp/fix-logo.js " + CONTAINER + ":/tmp/fix-logo.js")
        run_cmd(client, "docker exec " + CONTAINER + " node /tmp/fix-logo.js", timeout=30)
        
        # Verify fix
        svg_size2, _ = run_cmd(client, "docker exec " + CONTAINER + " wc -c /app/data/branding/logo.svg")
        print(f"New logo.svg size: {svg_size2}")
        
        svg_grep2, _ = run_cmd(client, "docker exec " + CONTAINER + " grep -c 'data:image' /app/data/branding/logo.svg")
        if "1" in svg_grep2:
            print("✓ logo.svg is now self-contained!")
    
    # 2. Check how Caddy is running
    print("\n=== CHECK: Caddy process ===")
    run_cmd(client, "ps aux | grep caddy | grep -v grep | head -3")
    run_cmd(client, "systemctl status caddy 2>/dev/null | head -10 || echo 'Caddy not a systemd service'")
    
    # 3. Check which Caddyfile Caddy is actually using
    print("\n=== CHECK: Active Caddy config ===")
    run_cmd(client, "cat /etc/caddy/Caddyfile 2>/dev/null | head -20 || echo '/etc/caddy/Caddyfile not found'")
    
    # 4. Fix the main Caddyfile (the one Caddy actually uses)
    print("\n=== FIX: Update the ACTUAL Caddy config ===")
    
    # Check if there's a Docker Caddy container
    caddy_containers, _ = run_cmd(client, "docker ps | grep caddy | head -3")
    
    if caddy_containers.strip():
        print("Caddy is running in Docker — need to update container config")
        # Get the Caddy container name
        caddy_name = caddy_containers.strip().split()[-1] if caddy_containers.strip() else ""
        if caddy_name:
            print(f"Caddy container: {caddy_name}")
            # Update the Caddyfile in the Caddy container
            run_cmd(client, f"docker exec {caddy_name} cat /etc/caddy/Caddyfile | head -5")
    else:
        # Caddy is running on the host
        # Need to update /etc/caddy/Caddyfile (the actual one used by Caddy)
        print("Caddy is running on host — updating /etc/caddy/Caddyfile")
        
        # First check what the current /etc/caddy/Caddyfile looks like
        main_caddy, _ = run_cmd(client, "cat /etc/caddy/Caddyfile | wc -l")
        
        # Copy our updated Caddyfile to the correct location
        run_cmd(client, "sudo cp /home/ubuntu/blivoai-demo/Caddyfile /etc/caddy/Caddyfile")
        run_cmd(client, "sudo systemctl reload caddy || sudo caddy reload --config /etc/caddy/Caddyfile")
        print("Caddy config updated and reloaded!")
    
    # 5. Verify cache headers after Caddy reload
    print("\n=== VERIFY: Cache headers after Caddy reload ===")
    run_cmd(client, 'curl -s -I https://demo.blivoai.com/api/branding/logo.png | grep -i cache')
    run_cmd(client, 'curl -s -I https://demo.blivoai.com/logo.png | grep -i cache')
    run_cmd(client, 'curl -s -I https://demo.blivoai.com/logo.svg | grep -i cache')
    
    # 6. Final health check
    print("\n=== FINAL: Health checks ===")
    run_cmd(client, 'curl -s -o /dev/null -w "HTTP %{http_code}" https://demo.blivoai.com/ar/')
    run_cmd(client, 'curl -s -o /dev/null -w "HTTP %{http_code}" https://demo.blivoai.com/ar/admin')
    run_cmd(client, 'curl -s -o /dev/null -w "HTTP %{http_code}" https://demo.blivoai.com/api/branding/logo.png')
    
    client.close()
    print("\n=== All fixes applied ===")

if __name__ == "__main__":
    main()
