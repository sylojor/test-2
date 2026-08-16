#!/usr/bin/env python3
"""Fix syntax errors - download files, fix locally, then re-upload"""
import paramiko
import tempfile
import os

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

# Download
sftp.get(remote_path, local_temp)
with open(local_temp, "r", encoding="utf-8") as f:
    content = f.read()

print(f"File length: {len(content)} chars, {len(content.splitlines())} lines")
lines = content.splitlines()
if len(lines) >= 41:
    print(f"Before fix - line 41: {lines[40]}")

# Fix 1: const essages, setMessages] -> const [messages, setMessages]
old1 = "const essages, setMessages]"
new1 = "const [messages, setMessages]"
if old1 in content:
    content = content.replace(old1, new1)
    print(f"Fixed: '{old1}' -> '{new1}'")
else:
    print(f"Pattern '{old1}' not found!")

# Fix 2: }, essages]) -> }, [messages])
old2 = "}, essages])"
new2 = "}, [messages])"
if old2 in content:
    content = content.replace(old2, new2)
    print(f"Fixed: '{old2}' -> '{new2}'")
else:
    print(f"Pattern '{old2}' not found!")

print(f"After fix - 'essages]' count: {content.count('essages]')}")
print(f"After fix - '[messages, setMessages]' count: {content.count('[messages, setMessages]')}")

# Write to temp file and upload
with open(local_temp, "w", encoding="utf-8") as f:
    f.write(content)
sftp.put(local_temp, remote_path)
print("Uploaded fixed department-chat-sidebar.tsx")

# ============= Fix llm-service.ts =============
remote_path2 = "/home/ubuntu/blivoai-demo/src/lib/llm-service.ts"
local_temp2 = "/tmp/llm_fix.ts"

# Download
sftp.get(remote_path2, local_temp2)
with open(local_temp2, "r", encoding="utf-8") as f:
    content2 = f.read()

print(f"\nLLM file length: {len(content2)} chars, {len(content2.splitlines())} lines")

# Fix: result.models.tier] -> result.models[m.tier]
old3 = "result.models.tier]"
new3 = "result.models[m.tier]"
if old3 in content2:
    content2 = content2.replace(old3, new3)
    print(f"Fixed: '{old3}' -> '{new3}'")
else:
    print(f"Pattern '{old3}' not found!")

print(f"After fix - 'result.models[m.tier]' count: {content2.count('result.models[m.tier]')}")

# Write and upload
with open(local_temp2, "w", encoding="utf-8") as f:
    f.write(content2)
sftp.put(local_temp2, remote_path2)
print("Uploaded fixed llm-service.ts")

sftp.close()

# Verify from server
stdin, stdout, stderr = client.exec_command("sed -n '41p' ~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx")
line41 = stdout.read().decode().strip()
print(f"\nFinal verify sidebar line 41: {line41}")

stdin, stdout, stderr = client.exec_command("sed -n '232p' ~/blivoai-demo/src/components/chat/department-chat-sidebar.tsx")
line232 = stdout.read().decode().strip()
print(f"Final verify sidebar line 232: {line232}")

stdin, stdout, stderr = client.exec_command("sed -n '180p' ~/blivoai-demo/src/lib/llm-service.ts")
line180 = stdout.read().decode().strip()
print(f"Final verify LLM line 180: {line180}")

# Clean up temp files
os.unlink(local_temp)
os.unlink(local_temp2)

client.close()
print("\nDone!")
