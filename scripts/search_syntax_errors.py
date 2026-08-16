#!/usr/bin/env python3
"""Search for exact syntax error patterns in department-chat-panel.tsx."""
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
for i, line in enumerate(lines):
    # Search for lines with "essages" (missing [ before it)
    if 'essages' in line and 'messages' not in line.replace('essages', 'messages'):
        print(f"Line {i+1}: {repr(line)}")
    if 'essages' in line:
        print(f"Line {i+1} (full): {line}")
    # Also search for any useState calls with wrong syntax
    if 'useState' in line and '[' not in line:
        print(f"Line {i+1} (bad useState): {repr(line)}")

# Also search near the useState line
for i, line in enumerate(lines):
    if 'useState<ChatMessage' in line:
        # Print surrounding lines
        for j in range(max(0, i-1), min(len(lines), i+3)):
            print(f"  Near line {j+1}: {lines[j]}")

sftp.close()
ssh.close()
