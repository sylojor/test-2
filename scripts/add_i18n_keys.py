#!/usr/bin/env python3
"""Add missing i18n keys to i18n.ts."""
import paramiko

HOST = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"
REMOTE_PATH = "/home/ubuntu/blivoai-demo/src/lib/i18n.ts"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

sftp = ssh.open_sftp()
with sftp.open(REMOTE_PATH, 'r') as f:
    content = f.read().decode('utf-8')

# Add missing keys to Arabic section
# Find the deptChat.send line in ar section and add new keys after it
ar_additions = '''    "deptChat.hint": "الموظفين بنفس القسم بيقدروا يتحاكوا ويتعاونوا هنا",
    "deptChat.talkWith": "التحدث مع:",'''

content = content.replace(
    '"deptChat.send": "إرسال",',
    '"deptChat.send": "إرسال",' + '\n' + ar_additions,
    1  # Only in first occurrence (ar section)
)

# Add missing keys to English section
en_additions = '''    "deptChat.hint": "Employees in the same department can communicate and collaborate here",
    "deptChat.talkWith": "Talk with:",'''

content = content.replace(
    '"deptChat.send": "Send",',
    '"deptChat.send": "Send",' + '\n' + en_additions,
    1  # Only in English section
)

with sftp.open(REMOTE_PATH, 'w') as f:
    f.write(content.encode('utf-8'))

print("✅ Added missing i18n keys: deptChat.hint, deptChat.talkWith")

# Verify
with sftp.open(REMOTE_PATH, 'r') as f:
    verify = f.read().decode('utf-8')
    
if 'deptChat.hint' in verify:
    count = verify.count('deptChat.hint')
    print(f"✅ deptChat.hint found {count} times (should be 2 — ar + en)")
else:
    print("❌ deptChat.hint NOT found!")

sftp.close()
ssh.close()
