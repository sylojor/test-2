#!/usr/bin/env python3
"""Final comprehensive verification."""
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
        for line in combined.split(chr(10))[-10:]:
            print(f"  {line}")
    return combined

print("\n=== 1. All Containers ===")
run("docker ps --format 'table {{.Names}}\t{{.Status}}'")

print("\n=== 2. LLM Config in Container ===")
run("docker exec demo-chatbot printenv LLM_API_KEY | head -c 30")
run("docker exec demo-chatbot printenv LLM_PROVIDER")

print("\n=== 3. Site Tests ===")
run("curl -skL -o /dev/null -w 'Main: HTTP:%{http_code}' https://blivoai.com/")
run("curl -skL -o /dev/null -w 'EN: HTTP:%{http_code}' https://blivoai.com/en")
run("curl -skL -o /dev/null -w 'AR: HTTP:%{http_code}' https://blivoai.com/ar")

print("\n=== 4. API Endpoint Test ===")
run("curl -skL -o /dev/null -w 'Conversations API: HTTP:%{http_code}' https://blivoai.com/api/conversations")

print("\n=== 5. New Code Check ===")
run("docker exec demo-chatbot grep -c 'CHAIN-OF-THOUGHT' /app/src/app/api/conversations/route.ts 2>/dev/null || echo 'source not in container'")

print("\n=== 6. App Logs ===")
run("docker logs demo-chatbot --tail 3 2>&1")

ssh.close()
print("\n=== ALL CHECKS COMPLETE ===")