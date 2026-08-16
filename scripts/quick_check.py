#!/usr/bin/env python3
"""Quick status check."""
import paramiko

SERVER = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, username=USER, password=PASS, timeout=30)

def run(cmd, timeout=15):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    combined = (out + err).strip()
    if combined:
        for line in combined.split(chr(10))[-8:]:
            print(f"  {line}")
    return combined

print("=== Build process ===")
run("pgrep -fa 'build_app\|docker compose build' 2>/dev/null | head -3")

print("\n=== Build log tail ===")
run("tail -5 /tmp/build3.log 2>/dev/null")

print("\n=== Docker containers ===")
run("docker ps --format 'table {{.Names}}\t{{.Status}}' | grep blivo")

print("\n=== Site check ===")
run("curl -s -o /dev/null -w 'HTTP:%{http_code}' http://localhost:3000")

print("\n=== Container env ===")
run("docker exec blivo-app printenv LLM_API_KEY 2>/dev/null | head -c 30")
run("docker exec blivo-app printenv LLM_PROVIDER 2>/dev/null")

ssh.close()