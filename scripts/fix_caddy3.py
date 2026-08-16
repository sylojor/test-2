#!/usr/bin/env python3
"""Fix Caddyfile on host (mounted read-only into container)."""
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
        for line in combined.split(chr(10))[-15:]:
            print(f"  {line}")
    return combined

# Fix on the host file
print("=== Fix Caddyfile on host ===")
run("sed -i 's/reverse_proxy app:3000/reverse_proxy demo-chatbot:3001/' /home/ubuntu/new-blivo/Caddyfile")

# Verify
print("=== Verify ===")
run("grep 'reverse_proxy' /home/ubuntu/new-blivo/Caddyfile")

# Reload Caddy (it reads the mounted file automatically on reload)
print("=== Reload Caddy ===")
run("docker exec blivo-caddy caddy reload --config /etc/caddy/Caddyfile 2>&1")

# Test
print("\n=== Wait and test ===")
time.sleep(3)
run("curl -skL -o /dev/null -w 'HTTP:%{http_code}' https://blivoai.com/en")

# Also test via external
print("\n=== External test ===")
run("curl -skL -o /dev/null -w 'HTTP:%{http_code}' https://blivoai.com/")

ssh.close()
print("\n=== Done ===")
