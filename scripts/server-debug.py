#!/usr/bin/env python3
"""Debug emo.blivoai.com deployment on OVH server"""
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
    print("DEBUGGING emo.blivoai.com ON OVH SERVER")
    print("=" * 60)

    # 1. Docker containers
    print("\n[1] Docker containers:")
    out, err = ssh_exec("docker ps -a --format '{{.Names}} {{.Status}} {{.Ports}}'")
    print(out)

    # 2. Caddyfile
    print("\n[2] Caddyfile content:")
    out, err = ssh_exec("cat /home/ubuntu/blivoai-demo/Caddyfile")
    print(out)

    # 3. Check if separate Caddy container exists
    print("\n[3] Caddy containers:")
    out, err = ssh_exec("docker ps -a --filter 'name=caddy' --format '{{.Names}} {{.Status}} {{.Ports}}'")
    print(out)

    # 4. DNS check
    print("\n[4] DNS for emo.blivoai.com:")
    out, err = ssh_exec("dig emo.blivoai.com +short 2>/dev/null || host emo.blivoai.com 2>/dev/null || nslookup emo.blivoai.com 2>/dev/null | grep Address")
    print(out)

    # 5. Local app check
    print("\n[5] Local app check (localhost:3001):")
    out, err = ssh_exec("curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/ar")
    print(f"HTTP code: {out.strip()}")

    # 6. Check all Caddyfiles on server
    print("\n[6] All Caddyfiles:")
    out, err = ssh_exec("find /home/ubuntu -name 'Caddyfile' -type f 2>/dev/null")
    print(out)

    # 7. Check if Caddy is running as standalone
    print("\n[7] Caddy process:")
    out, err = ssh_exec("ps aux | grep caddy | grep -v grep")
    print(out if out.strip() else "No Caddy process found")

    # 8. Check nginx
    print("\n[8] Nginx/Apache check:")
    out, err = ssh_exec("ps aux | grep -E 'nginx|apache|httpd' | grep -v grep")
    print(out if out.strip() else "No nginx/apache found")

    # 9. Check what's listening on ports
    print("\n[9] Ports listening:")
    out, err = ssh_exec("ss -tlnp | grep -E '80|443|3001|3000|3002' 2>/dev/null || netstat -tlnp | grep -E '80|443|3001|3000|3002'")
    print(out)

    # 10. Check docker-compose.yml
    print("\n[10] docker-compose.yml:")
    out, err = ssh_exec("cat /home/ubuntu/blivoai-demo/docker-compose.yml")
    print(out)

    # 11. Check blivoai-data Caddy
    print("\n[11] blivoai-data directory:")
    out, err = ssh_exec("ls -la /home/ubuntu/blivoai-data/ 2>/dev/null | head -20")
    print(out)

    # 12. Check other Caddyfile
    print("\n[12] blivoai-data Caddyfile:")
    out, err = ssh_exec("cat /home/ubuntu/blivoai-data/Caddyfile 2>/dev/null")
    print(out if out.strip() else "No Caddyfile in blivoai-data")

    print("\n" + "=" * 60)
    print("DEBUG COMPLETE")

if __name__ == "__main__":
    main()
