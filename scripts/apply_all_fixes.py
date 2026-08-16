"""
Apply all fixes on remote server using SSH exec_command.
Each fix is a separate SSH command to avoid shell escaping issues.
"""
import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    return stdout.read().decode(), stderr.read().decode()

# ==========================================
# FIX 1: admin-content.tsx syntax error
# ==========================================
print("=== FIX 1: admin syntax ===")
# Write a Python fix script file on the server using SFTP
sftp = ssh.open_sftp()

fix1 = """import os
os.chdir("/home/ubuntu/blivoai-demo")
d = [x for x in os.listdir("src/app") if os.path.exists(os.path.join("src/app", x, "admin", "admin-content.tsx"))][0]
p = os.path.join("src/app", d, "admin", "admin-content.tsx")
c = open(p).read()
c = c.replace("const odelsRes, companiesRes, agentsRes, settingsRes]", "const [modelsRes, companiesRes, agentsRes, settingsRes]")
open(p, "w").write(c)
v = open(p).read()
print("admin: odelsRes=", "odelsRes" in v, "[modelsRes=", "[modelsRes" in v)
"""

with sftp.open('/tmp/fix1.py', 'w') as f:
    f.write(fix1)
sftp.close()

out, err = run('python3 /tmp/fix1.py')
print(out)
if err: print("Err:", err[:100])

# ==========================================
# FIX 2: landing-page.tsx syntax error
# ==========================================
print("\n=== FIX 2: landing syntax ===")
sftp = ssh.open_sftp()

fix2 = """import os
os.chdir("/home/ubuntu/blivoai-demo")
p = "src/components/landing/landing-page.tsx"
c = open(p).read()
c = c.replace("const obileMenuOpen, setMobileMenuOpen]", "const [mobileMenuOpen, setMobileMenuOpen]")
open(p, "w").write(c)
v = open(p).read()
print("landing: obileMenuOpen=", "obileMenuOpen" in v, "[mobileMenuOpen=", "[mobileMenuOpen" in v)
"""

with sftp.open('/tmp/fix2.py', 'w') as f:
    f.write(fix2)
sftp.close()

out, err = run('python3 /tmp/fix2.py')
print(out)
if err: print("Err:", err[:100])

# ==========================================
# FIX 3: Feature cards - image on top + centered text
# ==========================================
print("\n=== FIX 3: feature cards ===")
sftp = ssh.open_sftp()

fix3 = """import os
os.chdir("/home/ubuntu/blivoai-demo")
p = "src/components/landing/landing-page.tsx"
c = open(p).read()

# Replace small icon div with large image area
c = c.replace(
    '<div className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg bg-brand/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-brand/20 transition-colors">',
    '<div className="w-full aspect-[3/2] bg-brand/5 flex items-center justify-center p-6 sm:p-8 group-hover:bg-brand/10 transition-colors">'
)
# Replace small icon size with large icon
c = c.replace(
    '<feature.icon className="w-5 h-5 text-brand" />',
    '<feature.icon className="w-12 h-12 sm:w-16 sm:h-16 text-brand opacity-80 group-hover:opacity-100 transition-opacity" />'
)
# Add overflow-hidden to Card
c = c.replace(
    '<Card className="rounded-2xl p-5 sm:p-6 border-border/50 bg-card hover:border-brand/30 transition-all duration-300 group">',
    '<Card className="rounded-2xl overflow-hidden border-border/50 bg-card hover:border-brand/30 transition-all duration-300 group">'
)

# Now wrap h3+p in text-center div after image div close
lines = c.split("\\n")
new_lines = []
i = 0
changed = 0
while i < len(lines):
    line = lines[i]
    # Check if this line is </div> closing the image area
    if line.strip() == "</div>" and i > 0 and "aspect-[3/2]" in lines[i-1]:
        # Find h3, p, and Card close in next few lines
        h3_idx = p_idx = card_idx = None
        for j in range(i+1, min(i+6, len(lines))):
            if "feature.titleKey" in lines[j]: h3_idx = j
            if "feature.descKey" in lines[j]: p_idx = j
            if "</Card>" in lines[j]: card_idx = j
        
        if h3_idx and p_idx and card_idx:
            indent = "                  "
            new_lines.append(lines[i])  # Keep </div> for image area
            new_lines.append(indent + '<div className="p-5 sm:p-6 text-center">')
            new_lines.append(lines[h3_idx])
            new_lines.append(lines[p_idx])
            new_lines.append(indent + "</div>")
            new_lines.append(lines[card_idx])  # </Card>
            changed += 1
            i = card_idx + 1
            continue
        else:
            new_lines.append(line)
            i += 1
            continue
    
    # Check for unwrapped h3+p combo (old style without text-center wrapper)
    if "feature.titleKey" in line and "feature.descKey" not in line:
        # This is an h3 line - check if next line is p with descKey
        if i+1 < len(lines) and "feature.descKey" in lines[i+1]:
            # Check if already wrapped in text-center
            if "text-center" not in line and i > 0 and "text-center" not in lines[i-1]:
                indent = "                  "
                new_lines.append(indent + '<div className="p-5 sm:p-6 text-center">')
                new_lines.append(line)
                new_lines.append(lines[i+1])
                new_lines.append(indent + "</div>")
                changed += 1
                i += 2
                continue
    
    new_lines.append(line)
    i += 1

c = "\\n".join(new_lines)
open(p, "w").write(c)
v = open(p).read()
print("cards: changed=", changed, "aspect=", "aspect-[3/2]" in v, "textCenter=", "text-center" in v, "overflowHidden=", "overflow-hidden" in v)
"""

with sftp.open('/tmp/fix3.py', 'w') as f:
    f.write(fix3)
sftp.close()

out, err = run('python3 /tmp/fix3.py')
print(out)
if err: print("Err:", err[:100])

# ==========================================
# FIX 4: Toast localization
# ==========================================
print("\n=== FIX 4: toast localization ===")
sftp = ssh.open_sftp()

fix4 = """import os
os.chdir("/home/ubuntu/blivoai-demo")
d = [x for x in os.listdir("src/app") if os.path.exists(os.path.join("src/app", x, "page.tsx"))][0]
p = os.path.join("src/app", d, "page.tsx")
c = open(p).read()

fixes = [
    ('toast.success(\`\\u062a\\u0645 \\u0625\\u0646\\u0634\\u0627\\u0621 \\u0645\\u0634\\u0631\\u0648\\u0639 "${data.name}"\`)', 'toast.success(lang === "ar" ? \`\\u062a\\u0645 \\u0625\\u0646\\u0634\\u0627\\u0621 \\u0645\\u0634\\u0631\\u0648\\u0639 "${data.name}"\` : \`Project "${data.name}" created\`)'),
    ('toast.error(err.error || "\\u0641\\u0634\\u0644 \\u0625\\u0646\\u0634\\u0627\\u0621 \\u0627\\u0644\\u0645\\u0634\\u0631\\u0648\\u0639")', 'toast.error(err.error || (lang === "ar" ? "\\u0641\\u0634\\u064b \\u0625\\u0646\\u0634\\u0627\\u0621 \\u0627\\u0644\\u0645\\u0634\\u0631\\u0648\\u0639" : "Project creation failed"))'),
    ('toast.success("\\u062a\\u0645 \\u062d\\u062f\\u0641 \\u0627\\u0644\\u0642\\u0633\\u0645")', 'toast.success(lang === "ar" ? "\\u062a\\u0645 \\u062d\\u062f\\u0641 \\u0627\\u0644\\u0642\\u0633\\u0645" : "Department deleted")'),
    ('toast.error("\\u0641\\u0634\\u064b \\u062d\\u062f\\u0641 \\u0627\\u0644\\u0642\\u0633\\u0645")', 'toast.error(lang === "ar" ? "\\u0641\\u0634\\u064b \\u062d\\u062f\\u0641 \\u0627\\u0644\\u0642\\u0633\\u0645" : "Failed to delete department")'),
    ('toast.success("\\u062a\\u0645 \\u0646\\u0642\\u0644 \\u0627\\u0644\\u0645\\u0648\\u0637\\u0641")', 'toast.success(lang === "ar" ? "\\u062a\\u0645 \\u0646\\u0642\\u0644 \\u0627\\u0644\\u0645\\u0648\\u0637\\u0641" : "Employee moved")'),
    ('toast.error("\\u0641\\u0634\\u064b \\u0646\\u0642\\u0644 \\u0627\\u0644\\u0645\\u0648\\u0637\\u0641")', 'toast.error(lang === "ar" ? "\\u0641\\u0634\\u064b \\u0646\\u0642\\u0644 \\u0627\\u0644\\u0645\\u0648\\u0637\\u0641" : "Failed to move employee")'),
    ('toast.success(approved ? "\\u062a\\u0645 \\u0627\\u0644\\u0631\\u062f \\u0639\\u0644\\u0649 \\u0627\\u0644\\u0637\\u0644\\u0628" : "\\u062a\\u0645 \\u0631\\u0641\\u0636 \\u0627\\u0644\\u0637\\u0644\\u0628")', 'toast.success(approved ? (lang === "ar" ? "\\u062a\\u0645 \\u0627\\u0644\\u0631\\u062f \\u0639\\u0644\\u0649 \\u0627\\u0644\\u0637\\u0644\\u0628" : "Request responded") : (lang === "ar" ? "\\u062a\\u0645 \\u0631\\u0641\\u0636 \\u0627\\u0644\\u0637\\u0644\\u0628" : "Request rejected"))'),
    ('toast.error("\\u0641\\u0634\\u064b \\u0627\\u0644\\u0631\\u062f \\u0639\\u0644\\u0649 \\u0627\\u0644\\u0637\\u0644\\u0628")', 'toast.error(lang === "ar" ? "\\u0641\\u0634\\u064b \\u0627\\u0644\\u0631\\u062f \\u0639\\u0644\\u0649 \\u0627\\u0644\\u0637\\u0644\\u0628" : "Failed to respond to request")'),
    ('toast.success(approved ? "\\u062a\\u0645\\u062a \\u0627\\u0644\\u0645\\u0648\\u0627\\u0641\\u0642\\u0629" : "\\u062a\\u0645 \\u0627\\u0644\\u0631\\u0641\\u0636")', 'toast.success(approved ? (lang === "ar" ? "\\u062a\\u0645\\u062a \\u0627\\u0644\\u0645\\u0648\\u0627\\u0641\\u0642\\u0629" : "Approved") : (lang === "ar" ? "\\u062a\\u0645 \\u0627\\u0644\\u0631\\u0641\\u0636" : "Rejected"))'),
    ('toast.error("\\u0641\\u0634\\u064b \\u0645\\u0631\\u0627\\u062c\\u0639\\u0629 \\u0627\\u0644\\u0642\\u0631\\u0627\\u0631")', 'toast.error(lang === "ar" ? "\\u0641\\u0634\\u064b \\u0645\\u0631\\u0627\\u062c\\u0639\\u0629 \\u0627\\u0644\\u0642\\u0631\\u0627\\u0631" : "Failed to review decision")'),
]

total = 0
for old, new in fixes:
    if old in c:
        c = c.replace(old, new)
        total += 1

open(p, "w").write(c)

# Count remaining Arabic-only
rem = 0
for line in c.split("\\n"):
    if "toast." in line:
        has_ar = any(ord(ch) > 0x590 for ch in line)
        has_lang = "lang ===" in line
        if has_ar and not has_lang:
            rem += 1
print(f"page: fixed={total}, remaining={rem}")
"""

with sftp.open('/tmp/fix4.py', 'w') as f:
    f.write(fix4)
sftp.close()

out, err = run('python3 /tmp/fix4.py')
print(out)
if err: print("Err:", err[:100])

# ==========================================
# REBUILD Docker
# ==========================================
print("\n=== Rebuilding Docker ===")
run('cd ~/blivoai-demo && docker compose build --no-cache app > /tmp/rebuild.log 2>&1 &')

# Wait for build
for i in range(60):
    time.sleep(10)
    out, err = run('ps aux | grep "docker compose build" | grep -v grep | wc -l')
    if out.strip() == '0':
        break

# Check build result
out, err = run('tail -5 /tmp/rebuild.log')
print("Build:", out)

# Restart
run('cd ~/blivoai-demo && docker compose up -d --force-recreate app')
time.sleep(15)

# Test
out, _ = run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/en')
print("EN site:", out)
out, _ = run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ar')
print("AR site:", out)
out, _ = run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/en/admin')
print("EN admin:", out)
out, _ = run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ar/admin')
print("AR admin:", out)

# Check for server-side errors
out, _ = run('docker logs demo-chatbot --tail=20 2>&1 | grep -iE "Error|ReferenceError|TypeError" | head -5')
print("Errors:", out if out.strip() else "None")

ssh.close()
print("\n=== ALL DONE ===")
