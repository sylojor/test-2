#!/usr/bin/env python3
"""Fix all dir attributes that flip with language on BlivoAI server"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', username='ubuntu', password='Mghazi@199641')

BASE = '/home/ubuntu/blivoai-demo'

# 1. Fix page.tsx
print("Fixing page.tsx...")
ssh.exec_command("sed -i 's/dir={lang === \"ar\" ? \"rtl\" : \"ltr\"}/dir=\"ltr\"/g' " + BASE + "/src/app/\\[lang\\]/page.tsx")

# 2. Fix admin-content.tsx
print("Fixing admin-content.tsx...")
ssh.exec_command("sed -i 's/dir={lang === \"ar\" ? \"rtl\" : \"ltr\"}/dir=\"ltr\"/g' " + BASE + "/src/app/\\[lang\\]/admin/admin-content.tsx")

# 3. Fix not-found.tsx
print("Fixing not-found.tsx...")
ssh.exec_command("sed -i 's/dir={lang === \"ar\" ? \"rtl\" : \"ltr\"}/dir=\"ltr\"/g' " + BASE + "/src/app/\\[lang\\]/not-found.tsx")

# 4. Fix upgrade-dialog.tsx via python
print("Fixing upgrade-dialog.tsx...")
cmd = """python3 -c "
content = open('""" + BASE + """/src/components/upgrade-dialog.tsx').read()
content = content.replace('dir={isArabic ? \\"rtl\\" : \\"ltr\\"}', 'dir=\\"ltr\\"')
open('""" + BASE + """/src/components/upgrade-dialog.tsx', 'w').write(content)
print('Done')
" """
stdin, stdout, stderr = ssh.exec_command(cmd)
print("upgrade-dialog:", stdout.read().decode(), stderr.read().decode())

# 5. Verify - check for remaining dynamic dir
import time
time.sleep(2)
cmd2 = "grep -rn 'dir={' " + BASE + "/src/ --include='*.tsx' --include='*.ts' | grep -v node_modules | grep -v .next"
stdin, stdout, stderr = ssh.exec_command(cmd2)
out = stdout.read().decode()
if out.strip():
    print("WARNING - Remaining dynamic dir attributes:")
    print(out)
else:
    print("SUCCESS - No dynamic dir attributes remain!")

# Also verify specific files
for f in [
    "src/app/[lang]/page.tsx",
    "src/app/[lang]/admin/admin-content.tsx",
    "src/app/[lang]/not-found.tsx",
    "src/components/upgrade-dialog.tsx",
]:
    cmd3 = "grep -n 'dir=' " + BASE + "/" + f.replace("[", "\\[").replace("]", "\\]")
    stdin, stdout, stderr = ssh.exec_command(cmd3)
    print(f"\n{f}:")
    print(stdout.read().decode())

ssh.close()
print("\nAll dir fixes applied!")
