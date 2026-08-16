#!/usr/bin/env python3
"""Deploy: rebuild and verify"""
import paramiko
import time

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

# Build
print("Building...")
stdin, stdout, stderr = client.exec_command(
    "cd ~/blivoai-demo && docker compose build --no-cache app",
    timeout=600
)
for line in stdout:
    l = line.strip()
    if l and ('Compiled' in l or 'Error' in l or 'DONE' in l or 'exit' in l.lower()):
        print(l)

exit_code = stdout.channel.recv_exit_status()
print(f"Build exit code: {exit_code}")

if exit_code != 0:
    err = stderr.read().decode()[:3000]
    print("STDERR:", err)
    client.close()
    exit(1)

# Start
print("\nStarting...")
stdin, stdout, stderr = client.exec_command(
    "cd ~/blivoai-demo && docker compose up -d --force-recreate app",
    timeout=120
)
print(stdout.read().decode()[:200])

# Verify
time.sleep(15)
stdin, stdout, stderr = client.exec_command(
    "curl -sL -o /dev/null -w '%{http_code}' http://localhost:3001/ar/ && echo '' && curl -sL -o /dev/null -w '%{http_code}' http://localhost:3001/en/"
)
print("HTTP:", stdout.read().decode())

client.close()
print("Done!")
