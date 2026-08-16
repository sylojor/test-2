#!/usr/bin/env python3
"""Get main-content.tsx from server."""
import paramiko

HOST = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

stdin, stdout, stderr = ssh.exec_command("cat ~/blivoai-demo/src/components/dashboard/main-content.tsx")
output = stdout.read().decode('utf-8')
err = stderr.read().decode('utf-8')

print(f"File length: {len(output)} chars")
# Print just the first 100 lines
lines = output.split('\n')
for i, line in enumerate(lines[:100]):
    print(f"{i+1}: {line}")

ssh.close()
