#!/usr/bin/env python3
"""Fix: Add employee-detail to DashboardTab type"""

import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)
sftp = client.open_sftp()

with sftp.open("/home/ubuntu/blivoai-demo/src/types/index.ts", "r") as f:
    content = f.read().decode()

# The issue: the previous replacement didn't match because the actual file
# has different ordering. Let's find and fix it precisely.
old_tab = '''export type DashboardTab = 
  | "chatbot"
  | "overview"
  | "departments"
  | "employees"
  | "talk"
  | "projects"
  | "chat"
  | "department-chat"
  | "meetings"
  | "hr"
  | "work-orders"
  | "monitor"
  | "decisions"
  | "requests"
  | "token-budget"
  | "settings"'''

new_tab = '''export type DashboardTab = 
  | "chatbot"
  | "overview"
  | "departments"
  | "employees"
  | "employee-detail"
  | "talk"
  | "projects"
  | "chat"
  | "department-chat"
  | "meetings"
  | "hr"
  | "work-orders"
  | "monitor"
  | "decisions"
  | "requests"
  | "token-budget"
  | "settings"'''

content = content.replace(old_tab, new_tab)

with sftp.open("/home/ubuntu/blivoai-demo/src/types/index.ts", "w") as f:
    f.write(content.encode())

# Verify
print("Verifying employee-detail in DashboardTab...")
if '"employee-detail"' in content:
    print("  ✓ employee-detail found in DashboardTab")
else:
    print("  ✗ employee-detail NOT found")

sftp.close()
client.close()
