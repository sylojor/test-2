#!/usr/bin/env python3
"""Add emo.blivoai.com to Caddy and reload"""
import paramiko
import time

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"

def ssh_exec(command, timeout=30):
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
    print("ADDING emo.blivoai.com TO CADDY & RELOADING")
    print("=" * 60)

    # 1. Check current system Caddyfile
    print("\n[1] Current system Caddyfile:")
    out, err = ssh_exec("cat /etc/caddy/Caddyfile")
    print(out[:500])

    # 2. Check the project Caddyfile (where demo.blivoai.com is configured)
    print("\n[2] Project Caddyfile has emo.blivoai.com?")
    out, err = ssh_exec("grep 'emo' /home/ubuntu/blivoai-demo/Caddyfile")
    print(out if out.strip() else "No emo.blivoai.com found in project Caddyfile")

    # 3. Check if the system Caddyfile is the one being used
    print("\n[3] Caddy process config path:")
    out, err = ssh_exec("ps aux | grep caddy | grep -v grep")
    print(out.strip())

    # 4. Check DNS for emo.blivoai.com
    print("\n[4] DNS for emo.blivoai.com:")
    out, err = ssh_exec("dig emo.blivoai.com +short 2>/dev/null")
    print(out.strip() if out.strip() else "NO DNS RECORD - needs to be added!")

    # 5. Check demo.blivoai.com DNS (working domain)
    print("\n[5] DNS for demo.blivoai.com (reference):")
    out, err = ssh_exec("dig demo.blivoai.com +short 2>/dev/null")
    print(out.strip())

    # 6. Check blivoai.com DNS
    print("\n[6] DNS for blivoai.com (reference):")
    out, err = ssh_exec("dig blivoai.com +short 2>/dev/null")
    print(out.strip())

    # 7. Verify demo.blivoai.com works
    print("\n[7] demo.blivoai.com check:")
    out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://demo.blivoai.com")
    print(f"HTTP: {out.strip()}")

    # 8. Add emo.blivoai.com to the project Caddyfile
    print("\n[8] Adding emo.blivoai.com to Caddyfile...")

    # Read current Caddyfile
    out, err = ssh_exec("cat /home/ubuntu/blivoai-demo/Caddyfile")
    caddyfile_content = out

    if 'emo.blivoai.com' in caddyfile_content:
        print("emo.blivoai.com already exists in Caddyfile!")
    else:
        # Add emo.blivoai.com block after demo.blivoai.com
        emo_block = """
# === Emo Domain — subscriber dashboard ===
emo.blivoai.com {
    encode zstd gzip

    @static {
        path /_next/static/* /manifest.json /logo.svg
    }
    header @static Cache-Control "public, max-age=31536000, immutable"

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

# === Redirect www emo → emo ===
www.emo.blivoai.com {
    redir https://emo.blivoai.com{uri} permanent
}
"""
        # Insert after demo.blivoai.com block
        new_content = caddyfile_content + emo_block

        # Write back via SSH
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(HOST, username=USER, password=PASSWORD, timeout=15)
        sftp = client.open_sftp()
        with sftp.open('/home/ubuntu/blivoai-demo/Caddyfile', 'w') as f:
            f.write(new_content)
        sftp.close()
        client.close()
        print("Added emo.blivoai.com to project Caddyfile!")

    # 9. Also update the system Caddyfile
    print("\n[9] Checking system Caddyfile...")
    out, err = ssh_exec("cat /etc/caddy/Caddyfile")
    system_caddy = out

    if 'emo.blivoai.com' in system_caddy:
        print("emo.blivoai.com already in system Caddyfile!")
    else:
        # Add emo block to system Caddyfile too
        emo_block = """
# === Emo Domain — subscriber dashboard ===
emo.blivoai.com {
    encode zstd gzip

    @static {
        path /_next/static/* /manifest.json /logo.svg
    }
    header @static Cache-Control "public, max-age=31536000, immutable"

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
"""
        new_system_caddy = system_caddy + emo_block

        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(HOST, username=USER, password=PASSWORD, timeout=15)
        sftp = client.open_sftp()
        with sftp.open('/etc/caddy/Caddyfile', 'w') as f:
            f.write(new_system_caddy)
        sftp.close()
        client.close()
        print("Added emo.blivoai.com to system Caddyfile!")

    # 10. Reload Caddy
    print("\n[10] Reloading Caddy...")
    out, err = ssh_exec("caddy reload --config /etc/caddy/Caddyfile 2>&1")
    print(f"Reload output: {out.strip()}")
    if err.strip():
        print(f"Reload errors: {err.strip()[:300]}")

    # 11. Wait and verify
    print("\n[11] Waiting 10s and checking...")
    time.sleep(10)

    out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://emo.blivoai.com")
    print(f"emo.blivoai.com HTTP: {out.strip()}")

    out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://demo.blivoai.com")
    print(f"demo.blivoai.com HTTP: {out.strip()}")

    out, err = ssh_exec("curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/ar")
    print(f"localhost:3001 HTTP: {out.strip()}")

    print("\n" + "=" * 60)
    print("RESULT:")
    print(f"emo.blivoai.com: {out.strip() if 'emo' in 'emo' else 'check above'}")
    print("=" * 60)

if __name__ == "__main__":
    main()
