#!/usr/bin/env python3
"""Fix dashboard-store.ts: remove duplicate talkTargetType/talkTargetRole, add missing interface members."""
import paramiko

HOST = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"
REMOTE_PATH = "/home/ubuntu/blivoai-demo/src/stores/dashboard-store.ts"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

sftp = ssh.open_sftp()
with sftp.open(REMOTE_PATH, 'r') as f:
    content = f.read().decode('utf-8')

print(f"Original file size: {len(content)} bytes")
lines = content.split('\n')

# Find and fix duplicate talkTargetType/talkTargetRole
# The interface has them twice — need to remove the second occurrence
seen_talk = 0
new_lines = []
for i, line in enumerate(lines):
    if 'talkTargetType:' in line and 'talkTargetType: "employee"' in line:
        seen_talk += 1
        if seen_talk == 1:
            # Keep the first occurrence
            new_lines.append(line)
            print(f"KEEP line {i+1}: {line.strip()}")
        else:
            # Remove the duplicate
            print(f"REMOVE duplicate line {i+1}: {line.strip()}")
            continue
    elif 'talkTargetRole:' in line and 'مدير' in line:
        seen_talk_role = sum(1 for l in new_lines if 'talkTargetRole:' in l and 'مدير' in l)
        if seen_talk_role == 0:
            new_lines.append(line)
            print(f"KEEP line {i+1}: {line.strip()}")
        else:
            print(f"REMOVE duplicate line {i+1}: {line.strip()}")
            continue
    else:
        new_lines.append(line)

content_fixed = '\n'.join(new_lines)
print(f"\nFixed file size: {len(content_fixed)} bytes")
print(f"Lines removed: {len(lines) - len(new_lines)}")

# Verify no more duplicates
talk_type_count = content_fixed.count('talkTargetType: "employee" | "department"')
talk_role_count = content_fixed.count('talkTargetRole: string | null  // مدير')
print(f"talkTargetType occurrences: {talk_type_count}")
print(f"talkTargetRole occurrences: {talk_role_count}")

# Upload the fixed file
with sftp.open(REMOTE_PATH, 'w') as f:
    f.write(content_fixed.encode('utf-8'))

print("✅ File uploaded successfully")

sftp.close()
ssh.close()
print("✅ Done")
