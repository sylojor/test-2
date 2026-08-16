#!/usr/bin/env python3
"""Deploy: rebuild Docker container"""
import paramiko
import time

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

# Step 1: Push prisma schema changes inside container
print("Pushing Prisma schema changes...")
stdin, stdout, stderr = client.exec_command(
    "docker exec demo-chatbot sh -c 'DATABASE_URL=postgresql://blivoai:BlvPg_eZdU18PPULDS4YsemB1CquWN@db:5432/blivoai?schema=public npx prisma db push --accept-data-loss'",
    timeout=60
)
out = stdout.read().decode()
print(out[:500])

# Step 2: Build
print("\nBuilding...")
stdin, stdout, stderr = client.exec_command(
    "cd ~/blivoai-demo && docker compose build --no-cache app",
    timeout=600
)
for line in stdout:
    l = line.strip()
    if l and ('Compiled' in l or 'error' in l.lower() or 'Error' in l or 'DONE' in l.split()[-1] if l.split() else False):
        print(l)

exit_code = stdout.channel.recv_exit_status()
print(f"Build exit code: {exit_code}")

if exit_code != 0:
    err = stderr.read().decode()[:2000]
    print("STDERR:", err)
    client.close()
    exit(1)

# Step 3: Start
print("\nStarting...")
stdin, stdout, stderr = client.exec_command(
    "cd ~/blivoai-demo && docker compose up -d --force-recreate app",
    timeout=120
)
print(stdout.read().decode()[:200])

# Step 4: Verify
time.sleep(15)
stdin, stdout, stderr = client.exec_command(
    "curl -sL -o /dev/null -w '%{http_code}' http://localhost:3001/ar/ && echo '' && curl -sL -o /dev/null -w '%{http_code}' http://localhost:3001/en/"
)
print("HTTP status:", stdout.read().decode())

client.close()
print("Deploy done!")
