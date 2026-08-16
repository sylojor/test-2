#!/usr/bin/env python3
"""Fix Caddy to proxy to demo-chatbot:3001."""
import paramiko

SERVER = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, username=USER, password=PASS, timeout=30)
print("Connected!")

def run(cmd, timeout=15):
    print(f">> {cmd[:150]}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    combined = (out + err).strip()
    if combined:
        for line in combined.split(chr(10))[-15:]:
            print(f"  {line}")
    return combined

# 1. Find the Caddyfile on the host
print("=== Find Caddyfile ===")
run("find /home/ubuntu -name 'Caddyfile' 2>/dev/null")
run("docker inspect blivo-caddy --format='{{json .Mounts}}' 2>/dev/null | python3 -m json.tool 2>/dev/null | head -30")

# 2. Fix the Caddyfile
# Update the proxy target from app:3000 to demo-chatbot:3001
print("\n=== Fix Caddyfile ===")

# Option A: Direct sed on the mounted file
run("find / -name 'Caddyfile' -not -path '/proc/*' -not -path '/sys/*' 2>/dev/null")

# Option B: sed inside the container
run("docker exec blivo-caddy sed -i 's/reverse_proxy app:3000/reverse_proxy demo-chatbot:3001/' /etc/caddy/Caddyfile")

# Verify
run("docker exec blivo-caddy grep 'reverse_proxy' /etc/caddy/Caddyfile")

# 3. Reload Caddy
print("\n=== Reload Caddy ===")
run("docker exec blivo-caddy caddy reload --config /etc/caddy/Caddyfile 2>&1")

# 4. Test
import time
time.sleep(3)
print("\n=== Test ===")
run("curl -skL -o /dev/null -w 'HTTP:%{http_code}' https://blivoai.com/en")

ssh.close()
print("\n=== Done ===")
