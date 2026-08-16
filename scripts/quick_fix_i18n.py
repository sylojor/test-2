#!/usr/bin/env python3
"""Quick fix: getApprovalModeDisplay + sidebar hardcoded text."""
import paramiko

HOST = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

sftp = ssh.open_sftp()

def read_remote(path):
    with sftp.open(path, 'r') as f:
        return f.read().decode('utf-8')

def write_remote(path, content):
    with sftp.open(path, 'w') as f:
        f.write(content.encode('utf-8'))

# 1. Fix getApprovalModeDisplay
gen_path = "/home/ubuntu/blivoai-demo/src/lib/employee-generator.ts"
gen_content = read_remote(gen_path)

idx = gen_content.find('export function getApprovalModeDisplay')
if idx >= 0:
    end = gen_content.find('\n}', idx) + 2
    old = gen_content[idx:end]
    new = '''export function getApprovalModeDisplay(mode: string, language?: string): string {
  if (language === "en") {
    const map: Record<string, string> = {
      ALWAYS_APPROVE: "All decisions need approval",
      AUTO_WITH_NOTIFY: "Auto-act with notification",
      AUTO_SILENT: "Auto-act silently",
    }
    return map[mode] ?? mode
  }
  const map: Record<string, string> = {
    ALWAYS_APPROVE: "كل قرار يحتاج موافقة",
    AUTO_WITH_NOTIFY: "يتصرف لوحده مع إشعار",
    AUTO_SILENT: "يتصرف لوحده بدون إشعار",
  }
  return map[mode] ?? mode
}'''
    gen_content = gen_content.replace(old, new)
    write_remote(gen_path, gen_content)
    print("✅ Fixed getApprovalModeDisplay")

# 2. Fix sidebar hardcoded Arabic
sidebar_path = "/home/ubuntu/blivoai-demo/src/components/dashboard/sidebar.tsx"
sidebar_content = read_remote(sidebar_path)

sidebar_content = sidebar_content.replace(
    'language === "ar" ? "خروج" : "Logout"',
    't("sidebar.logout", language)'
)

write_remote(sidebar_path, sidebar_content)
print("✅ Fixed sidebar hardcoded text")

sftp.close()
ssh.close()
