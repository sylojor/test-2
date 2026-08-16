import paramiko
import sys

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

stdin, stdout, stderr = client.exec_command(
    "cd ~/blivoai-demo && docker compose build app 2>&1",
    timeout=600
)
output = stdout.read().decode()

# Show relevant parts
lines = output.split('\n')
# Find the build section
for i, line in enumerate(lines):
    if 'Compiled successfully' in line or 'next build' in line.lower() or 'Build error' in line or 'Error' in line and 'DNS' not in line:
        print(f"Line {i}: {line}")

# Show last 30 lines
print("\n=== LAST 30 LINES ===")
for line in lines[-30:]:
    print(line)

# Start containers
stdin, stdout, stderr = client.exec_command("cd ~/blivoai-demo && docker compose up -d 2>&1")
up_output = stdout.read().decode()
print("\n=== UP OUTPUT ===")
print(up_output)

import time
time.sleep(15)

# Check status
stdin, stdout, stderr = client.exec_command("docker logs demo-chatbot --tail 10")
logs = stdout.read().decode()
print("\n=== APP LOGS ===")
print(logs)

# Test site
stdin, stdout, stderr = client.exec_command(
    """curl -s -m 5 http://localhost:3001/en 2>&1 | head -c 300"""
)
site_test = stdout.read().decode()
print("\n=== SITE TEST ===")
print(site_test[:200])

client.close()
