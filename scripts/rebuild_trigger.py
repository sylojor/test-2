#!/usr/bin/env python3
"""Trigger Docker rebuild and check status."""
import paramiko
import time

SERVER = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, username=USER, password=PASS, timeout=30)
print("Connected!")

def run(cmd, timeout=30):
    print(f"\n>> {cmd[:150]}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    combined = (out + err).strip()
    if combined:
        for line in combined.split(chr(10))[-15:]:
            print(f"   {line}")
    return combined

# 1. Check service names
print("\n=== Check services ===")
run("cd /home/ubuntu/new-blivo && head -30 docker-compose.yml")

# 2. Check what's running
print("\n=== Current containers ===")
run("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")

# 3. Trigger rebuild with service name from compose
print("\n=== Trigger rebuild ===")
# Get the app service name from compose
run("""cd /home/ubuntu/new-blivo && 
SERVICE=$(grep -m1 '^[^ ]*:' docker-compose.yml | head -1 | cut -d: -f1 | tr -d ' ')
echo "Service: $SERVICE"
nohup sh -c 'docker compose build --no-cache $SERVICE > /tmp/build.log 2>&1 && docker compose up -d $SERVICE >> /tmp/build.log 2>&1 && echo BUILD_COMPLETE >> /tmp/build.log' > /dev/null 2>&1 &
echo TRIGGERED
""")

# 4. Quick status check
print("\n=== Status after 15s ===")
time.sleep(15)
run("tail -5 /tmp/build.log 2>/dev/null")

ssh.close()
print("\n=== Rebuild triggered in background ===")