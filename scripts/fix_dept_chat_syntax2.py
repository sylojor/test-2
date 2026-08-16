#!/usr/bin/env python3
"""Fix syntax errors in department-chat-panel.tsx - byte level fix."""
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

# Fix line 67 (index 66): const essages, setMessages] → const [messages, setMessages]
line67 = lines[66]
print(f"Before fix line 67: {repr(line67)}")
lines[66] = line67.replace('const essages, setMessages]', 'const [messages, setMessages]')
print(f"After fix line 67: {repr(lines[66])}")

# Fix line 130 (index 129): }, essages] → }, [messages]
line130 = lines[129]
print(f"Before fix line 130: {repr(line130)}")
lines[129] = line130.replace('}, essages]', '}, [messages]')
print(f"After fix line 130: {repr(lines[129])}")

content = '\n'.join(lines)

# Verify no more syntax errors remain
if 'essages' in content:
    remaining = [i+1 for i, l in enumerate(content.split('\n')) if 'essages' in l]
    print(f"⚠️ Still found 'essages' in lines: {remaining}")
else:
    print("✅ No more 'essages' patterns found")

with sftp.open(REMOTE_PATH, 'w') as f:
    f.write(content.encode('utf-8'))

print("✅ File uploaded successfully")

sftp.close()
ssh.close()
