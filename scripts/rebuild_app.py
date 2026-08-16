#!/usr/bin/env python3
"""Trigger correct app rebuild."""
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
    print(f">> {cmd[:150]}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    combined = (out + err).strip()
    if combined:
        for line in combined.split(chr(10))[-10:]:
            print(f"   {line}")
    return combined

# 1. Upload a build script
sftp = ssh.open_sftp()
build_script = """#!/bin/bash
cd /home/ubuntu/new-blivo
docker compose build --no-cache app > /tmp/build3.log 2>&1
if [ $? -eq 0 ]; then
  docker compose up -d app >> /tmp/build3.log 2>&1
  echo BUILD_COMPLETE >> /tmp/build3.log
else
  echo BUILD_FAILED >> /tmp/build3.log
fi
"""
with sftp.open('/tmp/build_app.sh', 'w') as f:
    f.write(build_script)
sftp.close()
run("chmod +x /tmp/build_app.sh")

# 2. Run it in background via at or screen
run("nohup /tmp/build_app.sh > /dev/null 2>&1 & disown; echo STARTED")

# 3. Check after 20s
print("\nWaiting 20s...")
time.sleep(20)
run("tail -3 /tmp/build3.log 2>/dev/null")

ssh.close()
print("\nBuild triggered.")
