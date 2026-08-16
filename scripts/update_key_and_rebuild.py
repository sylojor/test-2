#!/usr/bin/env python3
"""SSH to server: update API key and rebuild Docker."""

import paramiko
import time

SERVER = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"
NEW_KEY = "tgp_v1_KXUEDfm7ZsHPYEpLOdtrlydb7IAKpNaBvvB8IWNaai0"
GITHUB_TOKEN = "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"
REPO = "sylojor/new-blivo"

def ssh_cmd(ssh, cmd, timeout=60):
    print(f"  >> {cmd[:150]}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    combined = out + err
    for line in (out + err).strip().split('\n')[-10:]:
        print(f"     {line}")
    return combined

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, username=USER, password=PASS, timeout=30)
print("Connected to server!")

# 1. Check current docker-compose env vars
print("\n=== Current LLM config ===")
ssh_cmd(ssh, "grep -E 'LLM_|TOGETHER' /home/ubuntu/new-blivo/docker-compose.prod.yml")

# 2. Update API key using Python (more reliable than sed)
print("\n=== Updating API key ===")
ssh_cmd(ssh, f"""python3 -c "
import re
path = '/home/ubuntu/new-blivo/docker-compose.prod.yml'
with open(path, 'r') as f:
    content = f.read()

# Remove old LLM keys
content = re.sub(r'\n.*LLM_API_KEY=.*', '', content)
content = re.sub(r'\n.*TOGETHER_AI_API_KEY=.*', '', content)
content = re.sub(r'\n.*LLM_PROVIDER=.*', '', content)

# Find environment section of app service and add keys
# Look for the first 'environment:' after 'app:' or 'web:' service
if '- LLM_API_KEY=' not in content:
    # Find environment: section and add after it
    content = content.replace(
        'environment:',
        'environment:\n      - LLM_PROVIDER=together\n      - LLM_API_KEY={NEW_KEY}'
    )
else:
    # Replace existing
    content = re.sub(r'LLM_API_KEY=.*', f'LLM_API_KEY={NEW_KEY}', content)
    content = re.sub(r'LLM_PROVIDER=.*', 'LLM_PROVIDER=together', content)

with open(path, 'w') as f:
    f.write(content)
print('Done updating docker-compose.prod.yml')
"
""", timeout=30)

# 3. Verify
print("\n=== Verify updated config ===")
ssh_cmd(ssh, "grep -E 'LLM_|TOGETHER' /home/ubuntu/new-blivo/docker-compose.prod.yml")

# 4. Pull latest code
print("\n=== Pulling latest code ===")
ssh_cmd(ssh, f"cd /home/ubuntu/new-blivo && git pull https://{GITHUB_TOKEN}@github.com/{REPO}.git main 2>&1", timeout=120)

# 5. Rebuild in background
print("\n=== Starting Docker rebuild (background) ===")
ssh_cmd(ssh, """cd /home/ubuntu/new-blivo && \
nohup bash -c 'docker compose -f docker-compose.prod.yml build --no-cache app > /tmp/build.log 2>&1 && docker compose -f docker-compose.prod.yml up -d app >> /tmp/build.log 2>&1' & \
echo "Build started: PID=$!""" )

print("\nBuild started in background. Waiting 120s...")
time.sleep(120)

# 6. Check build progress
print("\n=== Build progress ===")
ssh_cmd(ssh, "tail -20 /tmp/build.log 2>/dev/null")

# Check if still building
out = ssh_cmd(ssh, "ps aux | grep 'docker compose' | grep -v grep | wc -l")
if '0' in out.strip():
    print("\nBuild completed!")
else:
    print("\nStill building... waiting 120s more...")
    time.sleep(120)
    ssh_cmd(ssh, "tail -20 /tmp/build.log 2>/dev/null")

# 7. Final verification
print("\n=== Final verification ===")
ssh_cmd(ssh, "docker ps --filter name=blivo --format 'table {{.Names}}\t{{.Status}}' 2>/dev/null")
ssh_cmd(ssh, "curl -s -o /dev/null -w 'HTTP_CODE:%{{http_code}}' http://localhost:3000 2>/dev/null")

ssh.close()
print("\n=== DONE ===")
