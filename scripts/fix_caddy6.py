#!/usr/bin/env python3
"""Read full Caddyfile, fix it, and restart Caddy container."""
import paramiko
import time

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
        for line in combined.split(chr(10))[-20:]:
            print(f"  {line}")
    return combined

# 1. Read full Caddyfile from host
print("=== Full Caddyfile ===")
result = run("cat /home/ubuntu/new-blivo/Caddyfile")
print(f"\nFULL FILE ({len(result)} chars):")
print(result)

# 2. Fix ALL occurrences of port 3000 to 3001, and app to demo-chatbot
print("\n=== Fixing ===")
run("sed -i 's/app:3000/demo-chatbot:3001/g' /home/ubuntu/new-blivo/Caddyfile")
run("sed -i 's/localhost:3000/demo-chatbot:3001/g' /home/ubuntu/new-blivo/Caddyfile")

# Verify
print("\n=== After fix ===")
run("cat /home/ubuntu/new-blivo/Caddyfile")

# 3. Restart Caddy container to pick up changes
print("\n=== Restart Caddy ===")
run("docker restart blivo-caddy 2>&1")

time.sleep(5)

# 4. Test
print("\n=== Test ===")
run("curl -skL -o /dev/null -w 'HTTP:%{http_code}' https://blivoai.com/en")

ssh.close()
print("\nDone.")
