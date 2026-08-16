#!/usr/bin/env python3
"""Check hex bytes and fix using direct byte manipulation"""
import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

sftp = client.open_sftp()

# ============= Fix department-chat-sidebar.tsx =============
remote_path = "/home/ubuntu/blivoai-demo/src/components/chat/department-chat-sidebar.tsx"
local_temp = "/tmp/sidebar_fix.tsx"

sftp.get(remote_path, local_temp)
with open(local_temp, "rb") as f:
    raw = f.read()

# Print hex around 'essages'
idx = raw.find(b'essages')
print(f"'essages' found at byte position {idx} in file")
if idx >= 0:
    # Show 5 bytes before and 5 after
    snippet = raw[idx-5:idx+20]
    print(f"Context bytes: {snippet.hex()}")
    print(f"Context text: {snippet.decode('utf-8', errors='replace')}")

# The problem: the `[` before messages might be a different character
# Let's check what byte is at idx-1 (the char before 'essages')
if idx >= 0:
    char_before = raw[idx-1]
    print(f"Byte before 'essages': 0x{char_before:02x} = '{chr(char_before) if char_before < 128 else '?'}'")
    # Check if it's 0x5b (ASCII '[') or something else
    if char_before != 0x5b:
        print(f"NOT a regular '[' bracket! It's 0x{char_before:02x}")
    else:
        print(f"It IS a regular '[' bracket (0x5b)")

# Also check line 232
idx2 = raw.find(b'essages]\n')  # looking for 'essages]' pattern near line end
# Actually, let's search for all 'essages' occurrences
pos = 0
count = 0
while True:
    pos = raw.find(b'essages', pos)
    if pos == -1:
        break
    count += 1
    before = raw[pos-2:pos+2] if pos >= 2 else raw[:pos+2]
    print(f"  Occurrence {count} at byte {pos}: context = {before.hex()} = '{before.decode('utf-8', errors='replace')}'")
    pos += 1

# Now fix it: replace 'essages, setMessages]' with '[messages, setMessages]'
# But the issue might be a non-standard '[' character
# Let's just replace the entire phrase byte by byte

# First approach: if the '[' before messages is NOT 0x5b, we need to replace it
# The current pattern is: <some_byte>essages, setMessages] 
# We want: [messages, setMessages]

# Let's find and replace
old_bytes = None  # We'll find the exact bytes to replace

# Find "essages, setMessages]" 
search1 = b"essages, setMessages]"
pos1 = raw.find(search1)
if pos1 >= 0:
    # Include the byte before 'essages' 
    old_bytes = raw[pos1-1:pos1+len(search1)]
    new_bytes = b"[messages, setMessages]"
    raw = raw.replace(old_bytes, new_bytes)
    print(f"Fixed useState: replaced '{old_bytes.decode('utf-8', errors='replace')}' with '[messages, setMessages]'")

# Find "essages])"
search2 = b"essages])"
pos2 = raw.find(search2)
if pos2 >= 0:
    old_bytes2 = raw[pos2-1:pos2+len(search2)]
    new_bytes2 = b"[messages])"
    raw = raw.replace(old_bytes2, new_bytes2)
    print(f"Fixed useEffect: replaced '{old_bytes2.decode('utf-8', errors='replace')}' with '[messages])'")

with open(local_temp, "wb") as f:
    f.write(raw)
sftp.put(local_temp, remote_path)
print("Uploaded fixed department-chat-sidebar.tsx")

# ============= Fix llm-service.ts =============
remote_path2 = "/home/ubuntu/blivoai-demo/src/lib/llm-service.ts"
local_temp2 = "/tmp/llm_fix.ts"

sftp.get(remote_path2, local_temp2)
with open(local_temp2, "rb") as f:
    raw2 = f.read()

# Find and fix "models.tier]" 
search3 = b"models.tier]"
pos3 = raw2.find(search3)
if pos3 >= 0:
    old_bytes3 = raw2[pos3:pos3+len(search3)]
    new_bytes3 = b"models[m.tier]"
    raw2 = raw2.replace(old_bytes3, new_bytes3)
    print(f"Fixed LLM: replaced '{old_bytes3.decode('utf-8', errors='replace')}' with 'models[m.tier]'")
else:
    print("'models.tier]' not found in LLM service!")

with open(local_temp2, "wb") as f:
    f.write(raw2)
sftp.put(local_temp2, remote_path2)
print("Uploaded fixed llm-service.ts")

sftp.close()

# Verify
stdin, stdout, stderr = client.exec_command("sed -n '41p' ~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx")
print(f"\nVerify sidebar line 41: {stdout.read().decode().strip()}")

stdin, stdout, stderr = client.exec_command("sed -n '232p' ~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx")
print(f"Verify sidebar line 232: {stdout.read().decode().strip()}")

stdin, stdout, stderr = client.exec_command("sed -n '180p' ~/blivoai-demo/src/lib/llm-service.ts")
print(f"Verify LLM line 180: {stdout.read().decode().strip()}")

import os
os.unlink(local_temp)
os.unlink(local_temp2)

client.close()
print("\nAll fixes applied!")
