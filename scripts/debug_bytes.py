#!/usr/bin/env python3
"""Fix syntax errors by rewriting the exact lines."""
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
    raw_bytes = f.read()

# Print the raw bytes around "essages" to see what's happening
idx = raw_bytes.find(b'essages')
if idx >= 0:
    # Print 20 bytes before and after the first occurrence
    start = max(0, idx - 20)
    end = min(len(raw_bytes), idx + 30)
    print(f"Raw bytes around first 'essages': {repr(raw_bytes[start:end])}")
    print(f"Hex: {raw_bytes[start:end].hex()}")

# Try to find the exact byte sequence for "const essages"
# The issue might be that there's a non-standard character before "essages"
idx_const = raw_bytes.find(b'const ')
print(f"Finding 'const ' positions near line 67...")
# Let's find all occurrences and check what's before "essages"
for i in range(len(raw_bytes)):
    if raw_bytes[i:i+7] == b'essages':
        before = raw_bytes[max(0, i-10):i+20]
        print(f"Found 'essages' at byte offset {i}: {repr(before)}")
        # Check the byte right before 'e'
        print(f"  Byte before 'e': {repr(raw_bytes[i-1:i])} hex={raw_bytes[i-1:i].hex()}")
        if i > 0:
            print(f"  2 bytes before: {repr(raw_bytes[i-2:i])} hex={raw_bytes[i-2:i].hex()}")

sftp.close()
ssh.close()
