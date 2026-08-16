#!/usr/bin/env python3
"""Download and examine the exact file content"""
import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

sftp = client.open_sftp()

# Download sidebar file
sftp.get("/home/ubuntu/blivoai-demo/src/components/chat/department-chat-sidebar.tsx", "/tmp/sidebar_download.tsx")
with open("/tmp/sidebar_download.tsx", "rb") as f:
    raw = f.read()

# Check line 41 bytes
lines_raw = raw.split(b"\n")
if len(lines_raw) >= 41:
    line41 = lines_raw[40]
    print(f"Line 41 raw bytes (first 70): {line41[:70].hex()}")
    print(f"Line 41 decoded: {line41.decode('utf-8', errors='replace')}")
    
    # Check specifically if `[` (0x5b) is at the expected position
    has_bracket = False
    for i, b in enumerate(line41):
        if b == 0x5b:  # '['
            print(f"  Found '[' (0x5b) at position {i}: context = {line41[max(0,i-3):i+4].decode('utf-8', errors='replace')}")
            has_bracket = True
    if not has_bracket:
        print("  NO '[' (0x5b) found in line 41!")

# Download LLM file
sftp.get("/home/ubuntu/blivoai-demo/src/lib/llm-service.ts", "/tmp/llm_download.ts")
with open("/tmp/llm_download.ts", "rb") as f:
    raw2 = f.read()

lines2_raw = raw2.split(b"\n")
if len(lines2_raw) >= 180:
    line180 = lines2_raw[179]
    print(f"\nLine 180 raw bytes (first 60): {line180[:60].hex()}")
    print(f"Line 180 decoded: {line180.decode('utf-8', errors='replace')}")
    
    has_tier_bracket = False
    for i, b in enumerate(line180):
        if line180[i:i+5] == b"tier]" and i > 0:
            print(f"  Found 'tier]' at position {i}")
            print(f"  Context before: {line180[max(0,i-15):i+6].decode('utf-8', errors='replace')}")
            has_tier_bracket = True
    if not has_tier_bracket:
        print("  NO 'tier]' found in line 180!")

sftp.close()
client.close()
