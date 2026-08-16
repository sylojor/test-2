#!/usr/bin/env python3
"""Fix Caddy config to proxy to correct container."""
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
        for line in combined.split(chr(10))[-20:]:
            print(f"  {line}")
    return combined

print("=== Full Caddy config ===")
run("docker exec blivo-caddy cat /etc/caddy/Caddyfile")

print("\n=== Docker network check ===")
run("docker network ls")
run("docker inspect demo-chatbot --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null")
run("docker inspect blivo-caddy --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null")

print("\n=== Caddy logs ===")
run("docker logs blivo-caddy --tail 10 2>&1")

ssh.close()