#!/usr/bin/env python3
"""Test connectivity and fix."""
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

# Test from Caddy container
print("=== Connectivity test from Caddy ===")
run("docker exec blivo-caddy wget -qO- --timeout=5 http://172.23.0.2:3001/en 2>&1 | head -5")
run("docker exec blivo-caddy curl -s -o /dev/null -w 'HTTP:%{http_code}' http://demo-chatbot:3001/en 2>&1")

# Test from host
print("\n=== From host ===")
run("curl -s -o /dev/null -w 'HTTP:%{http_code}' http://localhost:3001/en")

# Check if app is listening
print("\n=== App listening check ===")
run("docker exec demo-chatbot ss -tlnp 2>/dev/null || docker exec demo-chatbot netstat -tlnp 2>/dev/null")

# Check Caddy error in detail
print("\n=== Caddy latest error ===")
run("docker logs blivo-caddy --tail 5 2>&1")

ssh.close()