#!/usr/bin/env python3
"""Check env vars on correct container and fix issues."""
import paramiko
import time

SERVER = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, username=USER, password=PASS, timeout=30)

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

print("=== Container env vars ===")
run("docker exec demo-chatbot printenv LLM_API_KEY 2>/dev/null | head -c 30")
run("docker exec demo-chatbot printenv LLM_PROVIDER 2>/dev/null")
run("docker exec demo-chatbot printenv TOGETHER_API_KEY 2>/dev/null | head -c 30")

print("\n=== Check site via port 3001 ===")
run("curl -s -o /dev/null -w 'HTTP:%{http_code}' http://localhost:3001")

print("\n=== Caddy config ===")
run("docker exec blivo-caddy cat /etc/caddy/Caddyfile 2>/dev/null")

print("\n=== Check site via Caddy (port 80) ===")
run("curl -s -o /dev/null -w 'HTTP:%{http_code}' -H 'Host: blivoai.com' http://localhost:80")

print("\n=== Full docker-compose.yml ===")
run("cat /home/ubuntu/new-blivo/docker-compose.yml")

ssh.close()