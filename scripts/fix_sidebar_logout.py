#!/usr/bin/env python3
"""Fix Sidebar component: add onLogout to destructuring."""
import paramiko

HOST = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"
REMOTE_PATH = "/home/ubuntu/blivoai-demo/src/components/dashboard/sidebar.tsx"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

sftp = ssh.open_sftp()
with sftp.open(REMOTE_PATH, 'r') as f:
    content = f.read().decode('utf-8')

print(f"Original file size: {len(content)} bytes")

# Fix: Add onLogout to the Sidebar component destructuring
# Current:  onEmployeeDetail,
#           mobileOpen,
#           onMobileOpenChange,
# }: SidebarProps)
# Should be: onEmployeeDetail,
#            onLogout,
#            mobileOpen,
#            onMobileOpenChange,
# }: SidebarProps)

old_pattern = "  onEmployeeDetail,\n  mobileOpen,\n  onMobileOpenChange,\n}: SidebarProps)"
new_pattern = "  onEmployeeDetail,\n  onLogout,\n  mobileOpen,\n  onMobileOpenChange,\n}: SidebarProps)"

if old_pattern in content:
    content = content.replace(old_pattern, new_pattern, 1)
    print("✅ Added onLogout to Sidebar destructuring")
else:
    print("❌ Pattern not found, trying alternative...")
    # Try to find the destructuring more broadly
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'onEmployeeDetail,' in line and i+2 < len(lines) and 'mobileOpen,' in lines[i+1]:
            # Insert onLogout between onEmployeeDetail and mobileOpen
            lines.insert(i+1, '  onLogout,')
            content = '\n'.join(lines)
            print("✅ Inserted onLogout line")
            break

# Verify the fix
if 'onLogout,' in content and 'onLogout={onLogout}' in content:
    print("✅ Fix verified: onLogout is destructured AND passed to SidebarContent")
else:
    print("⚠️ Checking fix status...")
    # Count occurrences
    destructured = content.count('  onLogout,')
    passed = content.count('onLogout={onLogout}')
    print(f"  Destructured: {destructured}, Passed: {passed}")

print(f"Fixed file size: {len(content)} bytes")

with sftp.open(REMOTE_PATH, 'w') as f:
    f.write(content.encode('utf-8'))

print("✅ File uploaded successfully")

sftp.close()
ssh.close()
