#!/usr/bin/env python3
"""Force rebuild without cache"""

import paramiko
import time

HOST = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=22, username=USER, password=PASS, timeout=15)

def r(cmd, t=600):
    print(f">>> {cmd[:80]}")
    i,o,e = client.exec_command(cmd, timeout=t)
    o.channel.settimeout(t)
    try: out = o.read().decode('utf-8','replace')
    except: out = "(timeout)"
    try: err = e.read().decode('utf-8','replace')
    except: err = ""
    if out: print(out[-1000:])
    if err: print(f"[e] {err[-300:]}")
    return out

# Step 1: Pull latest
print("=== Pull latest ===")
r("cd ~/blivoai-demo && git fetch origin && git reset --hard origin/main", 30)

# Step 2: Force rebuild (background with nohup)
print("\n=== Force rebuild (no cache) in background ===")
r("cd ~/blivoai-demo && nohup docker compose build --no-cache app > /tmp/rebuild.log 2>&1 &", 10)

# Step 3: Wait for build completion
print("Waiting for rebuild...")
for i in range(40):  # up to 10 minutes
    time.sleep(15)
    pid = r("ps aux | grep 'docker compose build' | grep -v grep | wc -l", 5).strip()
    log = r("tail -3 /tmp/rebuild.log", 5)
    print(f"[{i*15}s] PID count: {pid}, Log: {log[:200]}")
    if pid == "0" or pid == "":
        print("Build process completed!")
        break

# Step 4: Start the container
print("\n=== Start container ===")
r("cd ~/blivoai-demo && docker compose up -d app", 60)
time.sleep(15)

# Step 5: Setup branding
r("docker exec demo-chatbot mkdir -p /app/data/branding", 10)
r("docker exec demo-chatbot sh -c 'cp /app/public/logo.svg /app/data/branding/ && cp /app/public/favicon.ico /app/data/branding/'", 10)

# Step 6: Check
print("\n=== Health checks ===")
r("docker ps --format '{{.Names}} {{.Status}}'", 10)
r("curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/", 10)
r("curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/branding/logo.svg", 10)

# Step 7: Verify the new code is in the container (check if proxy.ts has the branding route)
print("\n=== Verify new code ===")
r("docker exec demo-chatbot sh -c 'cat /app/src/proxy.ts 2>/dev/null || echo no src dir; ls /app/.next/standalone/server.js 2>/dev/null || echo standalone'", 10)
r("docker exec demo-chatbot sh -c 'curl -s http://localhost:3001/api/branding/logo.svg | head -5'", 10)

client.close()
print("\nDone!")
