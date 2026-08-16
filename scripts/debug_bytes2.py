#!/usr/bin/env python3
"""Fix syntax errors by direct byte-level replacement in the file."""
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

print(f"Original file size: {len(raw_bytes)} bytes")

# Let's print the exact bytes around line 67 area to find the syntax error
# We know offset 2140 has 'essages' preceded by [m
# So the actual bytes at that spot are: ...const [messages...
# But the REPL output showed the string as having "const essages" without [m
# This means the [ and m are invisible/weird bytes

# Let's print bytes around offset 2130-2170 with full hex
section = raw_bytes[2130:2170]
print(f"Bytes 2130-2170:")
print(f"  repr: {repr(section)}")
print(f"  hex:  {section.hex()}")

# Let's also look at the "const " area specifically
# Find "const " in the bytes
const_offsets = []
pos = 0
while True:
    idx = raw_bytes.find(b'const ', pos)
    if idx < 0:
        break
    const_offsets.append(idx)
    pos = idx + 6

print(f"'const ' found at offsets: {const_offsets}")

# For each 'const ' near the useState line, print the next 50 bytes
for offset in const_offsets:
    chunk = raw_bytes[offset:offset+60]
    # Check if this contains 'useState'
    if b'setState' in chunk or b'essages' in chunk:
        print(f"\nOffset {offset}: hex={chunk.hex()}")
        print(f"  repr: {repr(chunk)}")

# Now let's specifically find and fix the broken patterns
# Pattern 1: We need to find where "const" is followed by something broken before "essages"
# The broken pattern should be: const (missing '[') messages, setMessages]
# But we see [m before essages, meaning it might already be "const [messages"
# Let me decode the whole file and check the actual string

content = raw_bytes.decode('utf-8')
lines = content.split('\n')

# Find the exact problematic lines
for i, line in enumerate(lines):
    stripped = line.strip()
    if 'essages' in stripped and 'const' in stripped:
        # Print the exact characters
        print(f"\nLine {i+1}: length={len(line)}")
        print(f"  Text: {line}")
        for j, ch in enumerate(line):
            if ch in ['[', 'm', 'e']:
                print(f"  char[{j}] = '{ch}' (ord={ord(ch)})")
        break

sftp.close()
ssh.close()
