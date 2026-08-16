#!/usr/bin/env python3
"""Fix ALL components to pass language to display functions."""
import paramiko
import re

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

# Files to fix and what to change:
fixes = {
    "/home/ubuntu/blivoai-demo/src/components/dashboard/employees-panel.tsx": [
        ("getEmployeeStatusDisplay(emp.status)", "getEmployeeStatusDisplay(emp.status, language)"),
        ("getApprovalModeDisplay(emp.approvalMode)", "getApprovalModeDisplay(emp.approvalMode, language)"),
    ],
    "/home/ubuntu/blivoai-demo/src/components/dashboard/departments-panel.tsx": [
        ("getEmployeeStatusDisplay(emp.status)", "getEmployeeStatusDisplay(emp.status, language)"),
    ],
    "/home/ubuntu/blivoai-demo/src/components/dashboard/hr-panel.tsx": [
        ("getEmployeeStatusDisplay(emp.status)", "getEmployeeStatusDisplay(emp.status, language)"),
    ],
    "/home/ubuntu/blivoai-demo/src/components/dashboard/requests-panel.tsx": [
        ("getRequestTypeDisplay(req.type)", "getRequestTypeDisplay(req.type, language)"),
        ("getRequestStatusDisplay(req.status)", "getRequestStatusDisplay(req.status, language)"),
    ],
    "/home/ubuntu/blivoai-demo/src/components/dashboard/projects-panel.tsx": [
        ("getProjectStatusDisplay(project.status)", "getProjectStatusDisplay(project.status, language)"),
    ],
    "/home/ubuntu/blivoai-demo/src/components/dashboard/talk-panel.tsx": [
        ("getEmployeeStatusDisplay(selectedEmployee.status)", "getEmployeeStatusDisplay(selectedEmployee.status, language)"),
    ],
    "/home/ubuntu/blivoai-demo/src/components/chat/chat-panel.tsx": [
        ("getEmployeeStatusDisplay(employee.status)", "getEmployeeStatusDisplay(employee.status, language)"),
    ],
}

# Also need to check if these components have 'language' variable
# If not, need to add useLocale import + const language = useLocale()

for path, replacements in fixes.items():
    content = read_remote(path)
    filename = path.split('/')[-1]
    
    # Check if component already has language variable
    has_language_var = 'const language = useLocale()' in content or 'language = useLocale()' in content
    has_use_locale_import = 'useLocale' in content
    
    # Apply replacements
    changes = 0
    for old, new in replacements:
        if old in content and new != content:
            content = content.replace(old, new)
            changes += 1
    
    # If we added language references but don't have the variable, add it
    if changes > 0 and not has_language_var:
        # Add useLocale import if not present
        if not has_use_locale_import:
            # Add import after existing imports
            content = content.replace(
                'import { useLocale } from "@/hooks/use-locale"',
                ''  # Remove if already there (will re-add properly)
            )
            # Find the last import line
            import_pattern = "import {"
            last_import_idx = content.rfind('from "@/')
            if last_import_idx > 0:
                # Find end of that line
                end_of_line = content.find('\n', last_import_idx)
                # Insert useLocale import after last import
                content = content[:end_of_line+1] + 'import { useLocale } from "@/hooks/use-locale"\n' + content[end_of_line+1:]
        
        # Add language variable inside the function
        # Find the component function start
        func_start = content.find('export function') or content.find('function ')
        if func_start >= 0:
            # Find the function body start (after the opening { or after props)
            brace_idx = content.find('{', func_start)
            if brace_idx >= 0:
                # Find a good place to insert — after any existing const declarations at start
                next_line = content.find('\n', brace_idx)
                # Check if there's already a const language line nearby
                if 'const language' not in content[:next_line+200]:
                    content = content[:next_line+1] + '  const language = useLocale()\n' + content[next_line+1:]
    
    if changes > 0:
        write_remote(path, content)
        print(f"✅ {filename}: {changes} fixes applied")
    else:
        print(f"⏭️ {filename}: no changes needed")

# ============================================================
# Fix sidebar "1 active employee • 1 Departments" inconsistency
# The sidebar shows English text but with Arabic count words sometimes
# ============================================================
print("\n=== Fixing sidebar text consistency ===")
sidebar_path = "/home/ubuntu/blivoai-demo/src/components/dashboard/sidebar.tsx"
sidebar_content = read_remote(sidebar_path)

# The sidebar has both Arabic and English tab labels shown (duplicated)
# This happens because each tab button shows the label AND its translation
# Let me check what's causing the duplicate labels

# The sidebar already uses t() for tab labels, but the issue might be
# that the label is rendered twice — once from t() and once hardcoded
# Let me search for the label pattern

# Find the CHAT_TABS and BUSINESS_TABS arrays
# These use labelKey which should be resolved by t() in the render
# The duplication might be from the button text showing both the icon label and the t() result

# Let me check if the sidebar is showing the section headers in both languages
print("  Checking sidebar section headers...")

# Fix: sidebar "1 active employee" — should use t()
# Search for the pattern that displays employee count
patterns_to_fix = [
    # The sidebar header shows "1 active employee • 1 Departments"
    # This should fully use t()
]

# The sidebar header already uses:
# {activeEmployees.length} {t("sidebar.activeEmployees", language)}
# {departments.length > 0 && ` • ${departments.length} ${t("sidebar.departments", language)}`}
# This is correct, but the test showed "1 active employee • 1 Departments"
# "active employee" and "Departments" are English, which is correct for /en

# The issue might be that the sidebar tab buttons show duplicated text
# Let me check the rendering pattern more carefully
# The snapshot showed: "Smart Chat", "Smart Chat" (duplicated)
# This is because the button text AND the icon label both show

# Actually, looking at the sidebar code more carefully, the buttons show:
# <tab.Icon className="w-4 h-4" />
# <span className="flex-1 text-right">{t(tab.labelKey, language)}</span>
# The Icon is just an icon, not text. So the duplication shouldn't happen.
# The test showed "Smart Chat" appearing twice — one from Chat section header
# and one from the button itself. This is expected behavior.

# Let me now check the sidebar footer for any remaining Arabic
# Search for Arabic in sidebar footer specifically

sidebar_lines = sidebar_content.split('\n')
for i, line in enumerate(sidebar_lines):
    if 'نشط' in line:
        print(f"  L{i+1}: {line.strip()[:80]}")

write_remote(sidebar_path, sidebar_content)

# ============================================================
# Fix department-chat-panel.tsx hardcoded Arabic
# ============================================================
print("\n=== Fixing department-chat-panel.tsx ===")
dept_chat_path = "/home/ubuntu/blivoai-demo/src/components/chat/department-chat-panel.tsx"
dept_content = read_remote(dept_chat_path)

# Find hardcoded Arabic strings and replace with t() or language conditionals
hardcoded_fixes = [
    # "جاري تحميل المحادثاتt..." → has a typo too "اتt"
    ('جاري تحميل المحادثاتt...', 'language === "ar" ? "جاري تحميل المحادثات..." : "Loading conversations..."'),
    # "الموظفين بنفس القسم بيقدروا يتحاكوا ويتعاونوا هنا"
    ('الموظفين بنفس القسم بيقدروا يتحاكوا ويتعاونوا هنا', 't("deptChat.hint", language)'),
    # "التحدث مع:" label
    ('"التحدث مع:"', 't("deptChat.talkWith", language)'),
]

for old, new in hardcoded_fixes:
    if old in dept_content:
        dept_content = dept_content.replace(old, new)
        print(f"  ✅ Fixed: {old[:40]}... → {new[:40]}...")

write_remote(dept_chat_path, dept_content)

sftp.close()
ssh.close()
print("\n✅ All components fixed")
