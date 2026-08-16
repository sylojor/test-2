#!/usr/bin/env python3
"""Fix syntax errors in department-chat-panel.tsx via SFTP."""
import paramiko
import os

HOST = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"
REMOTE_PATH = "/home/ubuntu/blivoai-demo/src/components/chat/department-chat-panel.tsx"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# Download the file
sftp = ssh.open_sftp()
with sftp.open(REMOTE_PATH, 'r') as f:
    content = f.read().decode('utf-8')

print(f"File size before fix: {len(content)} bytes")

# Fix 1: const essages, setMessages] → const [messages, setMessages]
fix1_old = 'const essages, setMessages]'
fix1_new = 'const [messages, setMessages]'
if fix1_old in content:
    content = content.replace(fix1_old, fix1_new, 1)
    print("✅ Fixed: const [messages, setMessages]")
else:
    print("❌ Fix 1 pattern not found")

# Fix 2: }, essages]) → }, [messages])
fix2_old = '}, essages])'
fix2_new = '}, [messages])'
if fix2_old in content:
    content = content.replace(fix2_old, fix2_new, 1)
    print("✅ Fixed: }, [messages])")
else:
    print("❌ Fix 2 pattern not found")

# Fix 3: toLocaleTimeString("ar" → toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US"
# This avoids the invalid "ar" locale which can throw RangeError
fix3_old = 'toLocaleTimeString("ar"'
fix3_new = 'toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US"'
count = content.count(fix3_old)
if count > 0:
    content = content.replace(fix3_old, fix3_new)
    print(f"✅ Fixed toLocaleTimeString: {count} occurrences")
else:
    print("❌ Fix 3 pattern not found")

print(f"File size after fix: {len(content)} bytes")

# Upload the fixed file
with sftp.open(REMOTE_PATH, 'w') as f:
    f.write(content.encode('utf-8'))

print("✅ File uploaded successfully")

# Verify the fix
sftp.close()
ssh.close()
print("✅ Done - SFTP closed")
