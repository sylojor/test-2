#!/usr/bin/env python3
"""Deploy: rebuild Docker and verify"""
import paramiko
import time

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

# Step 1: Build
print("Building Docker container...")
stdin, stdout, stderr = client.exec_command(
    "cd ~/blivoai-demo && docker compose build --no-cache app",
    timeout=600
)
# Stream output
while True:
    line = stdout.readline()
    if not line:
        break
    print(line.rstrip())
    
err = stderr.read().decode()
if err:
    print("STDERR:", err[:2000])

exit_code = stdout.channel.recv_exit_status()
print(f"Build exit code: {exit_code}")

if exit_code != 0:
    print("BUILD FAILED!")
    client.close()
    exit(1)

# Step 2: Start container
print("\nStarting container...")
stdin, stdout, stderr = client.exec_command(
    "cd ~/blivoai-demo && docker compose up -d --force-recreate app",
    timeout=120
)
out = stdout.read().decode()
err = stderr.read().decode()
print(out)
if err:
    print("STDERR:", err[:500])

# Step 3: Wait and check health
print("\nWaiting for container to start...")
time.sleep(10)

stdin, stdout, stderr = client.exec_command(
    "cd ~/blivoai-demo && docker compose ps app",
    timeout=30
)
out = stdout.read().decode()
print(out)

# Step 4: Check if site responds
print("\nChecking if site responds...")
stdin, stdout, stderr = client.exec_command(
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/",
    timeout=30
)
out = stdout.read().decode()
print(f"HTTP status: {out}")

client.close()
print("\nDeploy complete!")
