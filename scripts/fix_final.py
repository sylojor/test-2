import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

# Find exact file paths first
stdin, stdout, stderr = ssh.exec_command('find /home/ubuntu/blivoai-demo/src/app -name admin-content.tsx -type f')
admin_path = stdout.read().decode().strip()
print('admin path:', admin_path)

stdin, stdout, stderr = ssh.exec_command('find /home/ubuntu/blivoai-demo/src -name landing-page.tsx -type f')
landing_path = stdout.read().decode().strip()
print('landing path:', landing_path)

# Write a fix script to the server using SFTP and then execute it
sftp = ssh.open_sftp()

fix_script = """import os

# Fix 1: admin-content.tsx - "const odelsRes" -> "const [modelsRes"
p = os.path.join("/home/ubuntu/blivoai-demo/src/app", os.listdir("/home/ubuntu/blivoai-demo/src/app")[0], "admin", "admin-content.tsx")
with open(p, "rb") as f:
    data = f.read()
old = b"const odelsRes, companiesRes, agentsRes, settingsRes]"
new = b"const [modelsRes, companiesRes, agentsRes, settingsRes]"
count = data.count(old)
data = data.replace(old, new)
with open(p, "wb") as f:
    f.write(data)
v = open(p).read()
print("admin: replacements =", count)
print("admin: odelsRes present =", "odelsRes" in v)
print("admin: [modelsRes present =", "[modelsRes" in v)

# Fix 2: landing-page.tsx - "const obileMenuOpen" -> "const [mobileMenuOpen"
p = "/home/ubuntu/blivoai-demo/src/components/landing/landing-page.tsx"
with open(p, "rb") as f:
    data = f.read()
old = b"const obileMenuOpen, setMobileMenuOpen]"
new = b"const [mobileMenuOpen, setMobileMenuOpen]"
count = data.count(old)
data = data.replace(old, new)
with open(p, "wb") as f:
    f.write(data)
v = open(p).read()
print("landing: replacements =", count)
print("landing: obileMenuOpen present =", "obileMenuOpen" in v)
print("landing: [mobileMenuOpen present =", "[mobileMenuOpen" in v)
"""

with sftp.open('/tmp/fix_final.py', 'w') as f:
    f.write(fix_script)
sftp.close()

# Execute the fix script
stdin, stdout, stderr = ssh.exec_command('python3 /tmp/fix_final.py')
out = stdout.read().decode()
err = stderr.read().decode()
print('Fix output:', out)
if err:
    print('Fix error:', err[:300])

# ==========================================
# Now fix toast localization in page.tsx
# ==========================================

# Find page.tsx path
stdin, stdout, stderr = ssh.exec_command('find /home/ubuntu/blivoai-demo/src/app -name page.tsx -path "*/lang*" -type f')
page_paths = stdout.read().decode().strip().split('\n')
print('page paths:', page_paths)

# Write toast fix script
toast_fix = """import os

# Fix toast messages in page.tsx - make bilingual
lang_dir = os.listdir("/home/ubuntu/blivoai-demo/src/app")[0]
p = os.path.join("/home/ubuntu/blivoai-demo/src/app", lang_dir, "page.tsx")
c = open(p).read()

replacements = [
    # Signup
    ("toast.success(\\`\\u0623\\u0647\\u064b\\u064b ${data.name}! \\u0633\\u062c\\u064b \\u0634\\u0631\\u0643\\u062a\\u0643 \\u0644\\u062a\\u0628\\u062f\\u0623\\`)", "toast.success(lang === \\\"ar\\\" ? \\`\\u0623\\u0647\\u064b\\u064b ${data.name}! \\u0633\\u062c\\u064b \\u0634\\u0631\\u0643\\u062a\\u0643 \\u0644\\u062a\\u0628\\u062f\\u0623\\` : \\`Welcome ${data.name}! Register your company to start\\`)"),
]

# Actually let's just use a simpler approach - find all Arabic toast lines
# and wrap them with lang conditionals
import re

lines = c.split("\\n")
new_lines = []
changes = 0
for line in lines:
    if "toast." in line:
        # Check if it has Arabic but no lang conditional
        has_arabic = any(ord(ch) > 0x590 for ch in line)
        has_lang_cond = "lang ==" in line or "lang===" in line
        
        if has_arabic and not has_lang_cond:
            # This line needs to be made bilingual
            # Common patterns:
            # toast.success("Arabic text") -> toast.success(lang === "ar" ? "Arabic text" : "English text")
            # toast.error("Arabic text") -> toast.error(lang === "ar" ? "Arabic text" : "English text")
            # toast.success(`Arabic template ${var}`) -> toast.success(lang === "ar" ? `Arabic template ${var}` : `English template ${var}`)
            # toast.error(err.error || "Arabic text") -> toast.error(err.error || (lang === "ar" ? "Arabic text" : "English text"))
            
            # Skip for now - we'll handle the remaining ones individually
            new_lines.append(line)
        else:
            new_lines.append(line)
    else:
        new_lines.append(line)

print("Remaining Arabic-only toast lines:", changes)
"""

# Let me instead write a comprehensive page.tsx fix script
# that handles all the remaining toast messages
page_fix = """import os

# Fix page.tsx toast messages
lang_dir = os.listdir("/home/ubuntu/blivoai-demo/src/app")[0]
p = os.path.join("/home/ubuntu/blivoai-demo/src/app", lang_dir, "page.tsx")
c = open(p).read()

# Simple replacements for remaining hardcoded Arabic toasts
r = [
    ("toast.success(\\`\\u062a\\u0645 \\u0625\\u0646\\u0634\\u0627\\u0621 \\u0645\\u0634\\u0631\\u0648\\u0639 \\\"${data.name}\\\"\\`)", "toast.success(lang === \\\"ar\\\" ? \\`\\u062a\\u0645 \\u0625\\u0646\\u0634\\u0627\\u0621 \\u0645\\u0634\\u0631\\u0648\\u0639 \\\"${data.name}\\\"\\` : \\`Project \\\"${data.name}\\\" created\\`)"),
    ("toast.error(err.error || \\\"\\u0641\\u0634\\u0644 \\u0625\\u0646\\u0634\\u0627\\u0621 \\u0627\\u0644\\u0645\\u0634\\u0631\\u0648\\u0639\\\")", "toast.error(err.error || (lang === \\\"ar\\\" ? \\\"\\u0641\\u0634\\u0644 \\u0625\\u0646\\u0634\\u0627\\u0621 \\u0627\\u0644\\u0645\\u0634\\u0631\\u0648\\u0639\\\" : \\\"Project creation failed\\\"))"),
    ("toast.success(\\\"\\u062a\\u0645 \\u062d\\u062f\\u0641 \\u0627\\u0644\\u0642\\u0633\\u0645\\\")", "toast.success(lang === \\\"ar\\\" ? \\\"\\u062a\\u0645 \\u062d\\u062f\\u0641 \\u0627\\u0644\\u0642\\u0633\\u0645\\\" : \\\"Department deleted\\\")"),
    ("toast.error(\\\"\\u0641\\u0634\\u0644 \\u062d\\u062f\\u0641 \\u0627\\u0644\\u0642\\u0633\\u0645\\\")", "toast.error(lang === \\\"ar\\\" ? \\\"\\u0641\\u0634\\u0644 \\u062d\\u062f\\u0641 \\u0627\\u0644\\u0642\\u0633\\u0645\\\" : \\\"Failed to delete department\\\")"),
    ("toast.success(\\\"\\u062a\\u0645 \\u0646\\u0642\\u0644 \\u0627\\u0644\\u0645\\u0648\\u0637\\u0641\\\")", "toast.success(lang === \\\"ar\\\" ? \\\"\\u062a\\u0645 \\u0646\\u0642\\u0644 \\u0627\\u0644\\u0645\\u0648\\u0637\\u0641\\\" : \\\"Employee moved\\\")"),
    ("toast.error(\\\"\\u0641\\u0634\\u0644 \\u0646\\u0642\\u0644 \\u0627\\u0644\\u0645\\u0648\\u0637\\u0641\\\")", "toast.error(lang === \\\"ar\\\" ? \\\"\\u0641\\u0634\\u0644 \\u0646\\u0642\\u0644 \\u0627\\u0644\\u0645\\u0648\\u0637\\u0641\\\" : \\\"Failed to move employee\\\")"),
    ("toast.success(approved ? \\\"\\u062a\\u0645 \\u0627\\u0644\\u0631\\u062f \\u0639\\u0644\\u0649 \\u0627\\u0644\\u0637\\u0644\\u0628\\\" : \\\"\\u062a\\u0645 \\u0631\\u0641\\u0636 \\u0627\\u0644\\u0637\\u0644\\u0628\\\")", "toast.success(approved ? (lang === \\\"ar\\\" ? \\\"\\u062a\\u0645 \\u0627\\u0644\\u0631\\u062f \\u0639\\u0644\\u0649 \\u0627\\u0644\\u0637\\u0644\\u0628\\\" : \\\"Request responded\\\") : (lang === \\\"ar\\\" ? \\\"\\u062a\\u0645 \\u0631\\u0641\\u0636 \\u0627\\u0644\\u0637\\u0644\\u0628\\\" : \\\"Request rejected\\\"))"),
    ("toast.error(\\\"\\u0641\\u0634\\u0644 \\u0627\\u0644\\u0631\\u062f \\u0639\\u0644\\u0649 \\u0627\\u0644\\u0637\\u0644\\u0628\\\")", "toast.error(lang === \\\"ar\\\" ? \\\"\\u0641\\u0634\\u0644 \\u0627\\u0644\\u0631\\u062f \\u0639\\u0644\\u0649 \\u0627\\u0644\\u0637\\u0644\\u0628\\\" : \\\"Failed to respond to request\\\")"),
    ("toast.success(approved ? \\\"\\u062a\\u0645\\u062a \\u0627\\u0644\\u0645\\u0648\\u0627\\u0641\\u0642\\u0629\\\" : \\\"\\u062a\\u0645 \\u0627\\u0644\\u0631\\u0641\\u0636\\\")", "toast.success(approved ? (lang === \\\"ar\\\" ? \\\"\\u062a\\u0645\\u062a \\u0627\\u0644\\u0645\\u0648\\u0627\\u0641\\u0642\\u0629\\\" : \\\"Approved\\\") : (lang === \\\"ar\\\" ? \\\"\\u062a\\u0645 \\u0627\\u0644\\u0631\\u0641\\u0636\\\" : \\\"Rejected\\\"))"),
    ("toast.error(\\\"\\u0641\\u0634\\u064b \\u0645\\u0631\\u0627\\u062c\\u0639\\u0629 \\u0627\\u0644\\u0642\\u0631\\u0627\\u0631\\\")", "toast.error(lang === \\\"ar\\\" ? \\\"\\u0641\\u0634\\u064b \\u0645\\u0631\\u0627\\u062c\\u0639\\u0629 \\u0627\\u0644\\u0642\\u0631\\u0627\\u0631\\\" : \\\"Failed to review decision\\\")"),
]

count = 0
for old, new in r:
    if old in c:
        c = c.replace(old, new)
        count += 1

open(p, "w").write(c)
print("page.tsx: replaced", count, "remaining toast messages")
"""

# Write and execute toast fix
with sftp.open('/tmp/fix_toast.py', 'w') as f:
    f.write(page_fix)

# Execute toast fix
stdin, stdout, stderr = ssh.exec_command('python3 /tmp/fix_toast.py')
out = stdout.read().decode()
print('Toast fix:', out)

ssh.close()
print("Done!")
