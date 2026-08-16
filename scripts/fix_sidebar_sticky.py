#!/usr/bin/env python3
"""Fix sidebar to be sticky/fixed - change min-h-screen to h-screen overflow-hidden"""

import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

sftp = client.open_sftp()

# Fix the dashboard page.tsx - change min-h-screen to h-screen overflow-hidden
remote_path = "/home/ubuntu/blivoai-demo/src/app/[lang]/page.tsx"
with sftp.open(remote_path, "r") as f:
    content = f.read().decode()

old_layout = 'className="min-h-screen bg-background text-foreground flex" dir="ltr"'
new_layout = 'className="h-screen overflow-hidden bg-background text-foreground flex" dir="ltr"'
content = content.replace(old_layout, new_layout)

with sftp.open(remote_path, "w") as f:
    f.write(content.encode())

print("page.tsx fixed: sidebar now sticky")

# Also fix the sidebar to use sticky positioning for extra safety
remote_path2 = "/home/ubuntu/blivoai-demo/src/components/dashboard/sidebar.tsx"
with sftp.open(remote_path2, "r") as f:
    content2 = f.read().decode()

# Change sidebar aside from h-screen to sticky h-screen
old_sidebar = 'className="hidden md:flex w-72 glass-dark flex-col h-screen overflow-hidden"'
new_sidebar = 'className="hidden md:flex w-72 glass-dark flex-col sticky top-0 h-screen overflow-hidden"'
content2 = content2.replace(old_sidebar, new_sidebar)

with sftp.open(remote_path2, "w") as f:
    f.write(content2.encode())

print("sidebar.tsx fixed: sidebar now sticky top-0")

# Verify changes
stdin, stdout, stderr = client.exec_command("grep 'h-screen overflow-hidden bg-background' /home/ubuntu/blivoai-demo/src/app/[lang]/page.tsx")
print("page.tsx:", stdout.read().decode().strip())

stdin, stdout, stderr = client.exec_command("grep 'sticky top-0' /home/ubuntu/blivoai-demo/src/components/dashboard/sidebar.tsx")
print("sidebar.tsx:", stdout.read().decode().strip())

sftp.close()
client.close()
