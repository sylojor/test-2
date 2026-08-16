#!/usr/bin/env python3
"""Add setTalkTarget to DashboardState interface in dashboard-store.ts."""
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

# Add setTalkTarget to the interface after setActiveTab
old_interface = "  setActiveTab: (tab: DashboardTab) => void\n}"
new_interface = "  setActiveTab: (tab: DashboardTab) => void\n  setTalkTarget: (type: \"employee\" | \"department\" | \"all\" | \"role\" | null, role?: string) => void\n}"

content = content.replace(old_interface, new_interface)

# Verify
with sftp.open(REMOTE_PATH, 'w') as f:
    f.write(content.encode('utf-8'))

print("✅ Added setTalkTarget to interface")
print(f"Final file size: {len(content)} bytes")

sftp.close()
ssh.close()
