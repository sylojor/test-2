#!/usr/bin/env python3
"""Debug container issues."""
import paramiko

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

print("=== All containers ===")
run("docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")

print("\n=== App container logs ===")
run("docker logs blivo-app --tail 20 2>&1")

print("\n=== Restart everything ===")
run("cd /home/ubuntu/new-blivo && docker compose up -d 2>&1")

print("\n=== Wait 10s and check ===")
import time
time.sleep(10)

print("=== All containers after restart ===")
run("docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")

print("\n=== Site check ===")
run("curl -s -o /dev/null -w 'HTTP:%{http_code}' http://localhost:3000")

print("\n=== Container env ===")
run("docker exec blivo-app printenv LLM_API_KEY 2>/dev/null | head -c 30")
run("docker exec blivo-app printenv LLM_PROVIDER 2>/dev/null")

ssh.close()