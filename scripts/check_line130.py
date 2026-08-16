#!/usr/bin/env python3
"""Check line 130 for the }, [messages] pattern."""
import paramiko

HOST = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"
REMOTE_PATH = "/home/ubuntu/blivoai-demo/src/components/chat/department-chat-panel.tsx"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

sftp = ssh.open_sftp()
with sftp.open(REMOTE_PATH, 'r') as f:
    content = f.read().decode('utf-8')

lines = content.split('\n')

# Print lines 128-132
for i in range(127, 133):
    print(f"Line {i+1}: {lines[i]}")
    if 'essages' in lines[i] and '}' in lines[i]:
        for j, ch in enumerate(lines[i]):
            if ch in ['[', 'm', 'e', '}']:
                print(f"  char[{j}] = '{ch}' (ord={ord(ch)})")

sftp.close()
ssh.close()
