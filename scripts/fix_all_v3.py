"""Fix syntax bugs with explicit flush+fsync approach."""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')
sftp = ssh.open_sftp()

# ==========================================
# FIX 1: admin-content.tsx
# ==========================================

fix_admin = """import os
p = "/home/ubuntu/blivoai-demo/src/app/[lang]/admin/admin-content.tsx"
with open(p) as f:
    content = f.read()
lines = content.split("\\n")
print("BEFORE line694:", lines[693].strip()[:80])
content = content.replace("const odelsRes, companiesRes, agentsRes, settingsRes]", "const [modelsRes, companiesRes, agentsRes, settingsRes]")
with open(p, "w") as f:
    f.write(content)
    f.flush()
    os.fsync(f.fileno())
with open(p) as f:
    verify = f.read()
verify_lines = verify.split("\\n")
print("AFTER line694:", verify_lines[693].strip()[:80])
print("FIX_SUCCESS:", "const [modelsRes" in verify_lines[693])
"""

with sftp.open('/tmp/fix_admin_v3.py', 'w') as f:
    f.write(fix_admin)

# ==========================================
# FIX 2: landing-page.tsx
# ==========================================

fix_landing = """import os
p = "/home/ubuntu/blivoai-demo/src/components/landing/landing-page.tsx"
with open(p) as f:
    content = f.read()
lines = content.split("\\n")
print("BEFORE line109:", lines[108].strip()[:80])
content = content.replace("const obileMenuOpen, setMobileMenuOpen]", "const [mobileMenuOpen, setMobileMenuOpen]")
with open(p, "w") as f:
    f.write(content)
    f.flush()
    os.fsync(f.fileno())
with open(p) as f:
    verify = f.read()
verify_lines = verify.split("\\n")
print("AFTER line109:", verify_lines[108].strip()[:80])
print("FIX_SUCCESS:", "const [mobileMenuOpen" in verify_lines[108])
"""

with sftp.open('/tmp/fix_landing_v3.py', 'w') as f:
    f.write(fix_landing)

# ==========================================
# FIX 3: Feature cards - ensure text-center
# ==========================================

fix_cards = """import os
p = "/home/ubuntu/blivoai-demo/src/components/landing/landing-page.tsx"
c = open(p).read()
# Replace small icon div with large image area
c = c.replace('<div className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg bg-brand/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-brand/20 transition-colors">', '<div className="w-full aspect-[3/2] bg-brand/5 flex items-center justify-center p-6 sm:p-8 group-hover:bg-brand/10 transition-colors">')
c = c.replace('<feature.icon className="w-5 h-5 text-brand" />', '<feature.icon className="w-12 h-12 sm:w-16 sm:h-16 text-brand opacity-80 group-hover:opacity-100 transition-opacity" />')
c = c.replace('<Card className="rounded-2xl p-5 sm:p-6 border-border/50 bg-card hover:border-brand/30 transition-all duration-300 group">', '<Card className="rounded-2xl overflow-hidden border-border/50 bg-card hover:border-brand/30 transition-all duration-300 group">')
# Add text-center div wrapper around h3+p after image div close
import re
# Pattern: closing image div + h3 + p + closing Card
pat = '(</div>\\n)(\\s+)(<h3 className="text-foreground[^"]*">{t\\(feature\\.titleKey, language\\)}</h3>\\n)(\\s+)(<p className="text-muted-foreground[^"]*">{t\\(feature\\.descKey, language\\)}</p>\\n)(\\s+</Card>)'
def repl(m):
    return m.group(1) + m.group(2) + '<div className="p-5 sm:p-6 text-center">\\n' + m.group(3) + m.group(4) + m.group(5) + '\\n                  </div>\\n                </Card>'
cnt = len(re.findall(pat, c))
c = re.sub(pat, repl, c)
with open(p, "w") as f:
    f.write(c)
    f.flush()
    os.fsync(f.fileno())
v = open(p).read()
print("cards: replaced=", cnt, "aspect=", "aspect-[3/2]" in v, "textCenter=", "text-center" in v, "overflowHidden=", "overflow-hidden" in v)
"""

with sftp.open('/tmp/fix_cards_v3.py', 'w') as f:
    f.write(fix_cards)

# ==========================================
# FIX 4: Toast localization
# ==========================================

fix_toast = """import os
d = [x for x in os.listdir("/home/ubuntu/blivoai-demo/src/app") if os.path.exists(os.path.join("/home/ubuntu/blivoai-demo/src/app", x, "page.tsx"))][0]
p = os.path.join("/home/ubuntu/blivoai-demo/src/app", d, "page.tsx")
c = open(p).read()
fixes = [
    ('toast.success(\u0060\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0645\u0634\u0631\u0648\u0639 "${data.name}"\u0060)', 'toast.success(lang === "ar" ? \u0060\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0645\u0634\u0631\u0648\u0639 "${data.name}"\u0060 : \u0060Project "${data.name}" created\u0060)'),
    ('toast.error(err.error || "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0634\u0631\u0648\u0639")', 'toast.error(err.error || (lang === "ar" ? "\u0641\u0634\u064b \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0634\u0631\u0648\u0639" : "Project creation failed"))'),
    ('toast.success("\u062a\u0645 \u062d\u062f\u0641 \u0627\u0644\u0642\u0633\u0645")', 'toast.success(lang === "ar" ? "\u062a\u0645 \u062d\u062f\u0641 \u0627\u0644\u0642\u0633\u0645" : "Department deleted")'),
    ('toast.error("\u0641\u0634\u064b \u062d\u062f\u0641 \u0627\u0644\u0642\u0633\u0645")', 'toast.error(lang === "ar" ? "\u0641\u0634\u064b \u062d\u062f\u0641 \u0627\u0644\u0642\u0633\u0645" : "Failed to delete department")'),
    ('toast.success("\u062a\u0645 \u0646\u0642\u0644 \u0627\u0644\u0645\u0648\u0637\u0641")', 'toast.success(lang === "ar" ? "\u062a\u0645 \u0646\u0642\u0644 \u0627\u0644\u0645\u0648\u0637\u0641" : "Employee moved")'),
    ('toast.error("\u0641\u0634\u064b \u0646\u0642\u0644 \u0627\u0644\u0645\u0648\u0637\u0641")', 'toast.error(lang === "ar" ? "\u0641\u0634\u064b \u0646\u0642\u0644 \u0627\u0644\u0645\u0648\u0637\u0641" : "Failed to move employee")'),
    ('toast.success(approved ? "\u062a\u0645 \u0627\u0644\u0631\u062f \u0639\u0644\u0649 \u0627\u0644\u0637\u0644\u0628" : "\u062a\u0645 \u0631\u0641\u0636 \u0627\u0644\u0637\u0644\u0628")', 'toast.success(approved ? (lang === "ar" ? "\u062a\u0645 \u0627\u0644\u0631\u062f \u0639\u0644\u0649 \u0627\u0644\u0637\u0644\u0628" : "Request responded") : (lang === "ar" ? "\u062a\u0645 \u0631\u0641\u0636 \u0627\u0644\u0637\u0644\u0628" : "Request rejected"))'),
    ('toast.error("\u0641\u0634\u064b \u0627\u0644\u0631\u062d \u0639\u0644\u0649 \u0627\u0644\u0637\u0644\u0628")', 'toast.error(lang === "ar" ? "\u0641\u0634\u064b \u0627\u0644\u0631\u062f \u0639\u0644\u0649 \u0627\u0644\u0637\u0644\u0628" : "Failed to respond")'),
    ('toast.success(approved ? "\u062a\u0645\u062a \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629" : "\u062a\u0645 \u0627\u0644\u0631\u0641\u0636")', 'toast.success(approved ? (lang === "ar" ? "\u062a\u0645\u062a \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629" : "Approved") : (lang === "ar" ? "\u062a\u0645 \u0627\u0644\u0631\u0641\u0636" : "Rejected"))'),
    ('toast.error("\u0641\u0634\u064b \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0642\u0631\u0627\u0631")', 'toast.error(lang === "ar" ? "\u0641\u0634\u064b \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0642\u0631\u0627\u0631" : "Failed to review")'),
]
total = 0
for old, new in fixes:
    if old in c:
        c = c.replace(old, new)
        total += 1
with open(p, "w") as f:
    f.write(c)
    f.flush()
    os.fsync(f.fileno())
print(f"toast: fixed={total}")
"""

with sftp.open('/tmp/fix_toast_v3.py', 'w') as f:
    f.write(fix_toast)

sftp.close()

# Execute all fix scripts
def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    return stdout.read().decode(), stderr.read().decode()

print("=== FIX 1: Admin syntax ===")
out, err = run('python3 /tmp/fix_admin_v3.py')
print(out)
if err: print("E:", err[:100])

print("\n=== FIX 2: Landing syntax ===")
out, err = run('python3 /tmp/fix_landing_v3.py')
print(out)
if err: print("E:", err[:100])

print("\n=== FIX 3: Cards layout ===")
out, err = run('python3 /tmp/fix_cards_v3.py')
print(out)
if err: print("E:", err[:100])

print("\n=== FIX 4: Toast localization ===")
out, err = run('python3 /tmp/fix_toast_v3.py')
print(out)
if err: print("E:", err[:100])

# Final verify by reading specific lines
print("\n=== FINAL VERIFICATION ===")
sftp = ssh.open_sftp()

with sftp.open('/home/ubuntu/blivoai-demo/src/app/[lang]/admin/admin-content.tsx', 'r') as f:
    admin_lines = f.read().decode('utf-8').split('\n')
print(f"Admin line 694: {admin_lines[693].strip()[:80]}")

with sftp.open('/home/ubuntu/blivoai-demo/src/components/landing/landing-page.tsx', 'r') as f:
    landing_lines = f.read().decode('utf-8').split('\n')
print(f"Landing line 109: {landing_lines[108].strip()[:80]}")

sftp.close()

# Rebuild Docker
print("\n=== REBUILDING ===")
run('cd ~/blivoai-demo && nohup docker compose build --no-cache app > /tmp/rebuild2.log 2>&1 &')

ssh.close()
print("Fix scripts executed, Docker rebuilding in background")
