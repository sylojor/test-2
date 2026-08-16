#!/usr/bin/env python3
"""Check remaining hardcoded Arabic and fix getApprovalModeDisplay."""
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
    print(f"  ✅ Written: {path}")

# ============================================================
# 1. Fix getApprovalModeDisplay — search with different pattern
# ============================================================
print("=== Fixing getApprovalModeDisplay ===")
gen_path = "/home/ubuntu/blivoai-demo/src/lib/employee-generator.ts"
gen_content = read_remote(gen_path)

# Search for the function
lines = gen_content.split('\n')
for i, line in enumerate(lines):
    if 'getApprovalModeDisplay' in line:
        print(f"  Line {i+1}: {line.strip()}")

# The original had a typo: mapode] instead of map[mode]
# Let me search for the actual pattern
approval_section_start = gen_content.find('export function getApprovalModeDisplay')
if approval_section_start >= 0:
    # Find the closing brace
    section_end = gen_content.find('\n}', approval_section_start) + 2
    old_approval = gen_content[approval_section_start:section_end]
    print(f"  Found at offset {approval_section_start}")
    print(f"  Current: {repr(old_approval[:200])}")
    
    new_approval = '''export function getApprovalModeDisplay(mode: string, language?: string): string {
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
    
    gen_content = gen_content.replace(old_approval, new_approval)
    write_remote(gen_path, gen_content)
else:
    print("  ❌ getApprovalModeDisplay not found at all")

# ============================================================
# 2. Fix sidebar hardcoded Arabic text
# ============================================================
print("\n=== Fixing sidebar hardcoded Arabic ===")
sidebar_path = "/home/ubuntu/blivoai-demo/src/components/dashboard/sidebar.tsx"
sidebar_content = read_remote(sidebar_path)

# Find the hardcoded Arabic strings and replace with t() calls
# The sidebar has language from useLocale()

# "خروج" → t("sidebar.logout", language)
# But check context — it might already be in a t() call or conditional
lines = sidebar_content.split('\n')
for i, line in enumerate(lines):
    if 'خروج' in line and 't(' not in line:
        print(f"  Line {i+1}: {line.strip()}")
    if 'نشط' in line and 't(' not in line and 'getEmployee' not in line:
        print(f"  Line {i+1}: {line.strip()}")

# Fix: The sidebar footer has hardcoded Arabic text
# "Logout" button with language === "ar" ? "خروج" : "Logout"
# But it uses inline conditional already:
# {language === "ar" ? "خروج" : "Logout"}
# This is OK but should use t() instead
# Let's replace the inline conditionals with t()

# Replace: language === "ar" ? "خروج" : "Logout" → t("sidebar.logout", language)
sidebar_content = sidebar_content.replace(
    'language === "ar" ? "خروج" : "Logout"',
    't("sidebar.logout", language)'
)

# Replace: language === "ar" ? "تسجيل الخروج" : "Logout" (title attribute)
sidebar_content = sidebar_content.replace(
    'language === "ar" ? "تسجيل الخروج" : "Logout"',
    't("sidebar.logout", language)'
)

# Check for more hardcoded Arabic
hardcoded_patterns = [
    ('"موظف"', 't("sidebar.employee", language)'),
    ('"قسم"', 't("sidebar.department", language)'),
]
for old, new in hardcoded_patterns:
    if old in sidebar_content and 't(' not in sidebar_content[sidebar_content.find(old)-20:sidebar_content.find(old)]:
        # Only replace if not already in a t() call
        # Skip for now — these might be in t() already
        pass

write_remote(sidebar_path, sidebar_content)

# ============================================================
# 3. Check ALL other components for hardcoded Arabic on /en
# ============================================================
print("\n=== Scanning all dashboard components for hardcoded Arabic ===")

# List of components to check
components = [
    "employees-panel.tsx",
    "departments-panel.tsx",
    "projects-panel.tsx",
    "talk-panel.tsx",
    "meetings-panel.tsx",
    "hr-panel.tsx",
    "work-orders-panel.tsx",
    "monitor-panel.tsx",
    "decisions-panel.tsx",
    "requests-panel.tsx",
    "token-budget-panel.tsx",
    "access-tokens-panel.tsx",
    "available-employees-panel.tsx",
    "payments-panel.tsx",
    "settings-panel.tsx",
    "chatbot-panel.tsx",
    "employee-detail-panel.tsx",
    "chat-panel.tsx",
    "department-chat-panel.tsx",
]

for comp in components:
    path = f"/home/ubuntu/blivoai-demo/src/components/dashboard/{comp}"
    stdin, stdout, stderr = ssh.exec_command(f"test -f {path} && echo exists || echo missing")
    result = stdout.read().decode('utf-8').strip()
    if result == 'missing':
        # Check in chat folder
        path = f"/home/ubuntu/blivoai-demo/src/components/chat/{comp}"
        stdin, stdout, stderr = ssh.exec_command(f"test -f {path} && echo exists || echo missing")
        result = stdout.read().decode('utf-8').strip()
    
    if result == 'exists':
        content = read_remote(path)
        # Find lines with Arabic text that are NOT in t() calls or comments
        lines = content.split('\n')
        issues = []
        for i, line in enumerate(lines):
            # Skip comments
            if line.strip().startswith('//') or line.strip().startswith('*'):
                continue
            # Check for Arabic characters
            has_arabic = any(ord(c) > 0x600 and ord(c) < 0x700 for c in line)
            if has_arabic:
                # Check if it's in a t() call, i18n variable, or proper conditional
                if 't(' not in line and 'useLocale()' not in line and 'language ===' not in line and 'record<string' not in line.lower():
                    # It might be hardcoded Arabic
                    stripped = line.strip()
                    if len(stripped) < 150:  # Skip very long lines (likely strings in arrays)
                        issues.append(f"  L{i+1}: {stripped[:100]}")
        
        if issues:
            print(f"\n  📁 {comp} ({len(issues)} potential issues):")
            for issue in issues[:5]:  # Show first 5
                print(issue)

sftp.close()
ssh.close()
print("\n✅ Scan complete")
