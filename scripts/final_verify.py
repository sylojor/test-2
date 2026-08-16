#!/usr/bin/env python3
"""Final verification of deployment."""
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
        for line in combined.split(chr(10))[-10:]:
            print(f"  {line}")
    return combined

print("=== 1. Container Status ===")
run("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")

print("\n=== 2. API Key Verification ===")
run("docker exec demo-chatbot printenv LLM_API_KEY | wc -c")
run("docker exec demo-chatbot printenv LLM_PROVIDER")

print("\n=== 3. App Health ===")
run("curl -sL -o /dev/null -w 'HTTP:%{http_code}' -H 'Host: blivoai.com' http://localhost:3001/en")

print("\n=== 4. Caddy Proxy Check ===")
run("curl -skL -o /dev/null -w 'HTTP:%{http_code}' https://blivoai.com/en 2>&1")

print("\n=== 5. App Logs (last 10) ===")
run("docker logs demo-chatbot --tail 10 2>&1")

print("\n=== 6. Check if new code is deployed ===")
run("docker exec demo-chatbot grep -c 'CHAIN-OF-THOUGHT' /app/.next/server/app/api/conversations/route.js 2>/dev/null || echo 'checking...'")

ssh.close()
print("\n=== VERIFICATION COMPLETE ===")
