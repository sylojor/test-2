import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

# Write fix script to server via SFTP
sftp = ssh.open_sftp()

fix_script = """import glob

# Fix 1: admin-content.tsx syntax error
files = glob.glob("/home/ubuntu/blivoai-demo/src/app/*/admin/admin-content.tsx")
for p in files:
    c = open(p).read()
    c = c.replace("const odelsRes, companiesRes, agentsRes, settingsRes]", "const [modelsRes, companiesRes, agentsRes, settingsRes]")
    open(p, "w").write(c)
    v = open(p).read()
    print("admin: odelsRemains =", "odelsRes" in v)
    print("admin: modelsResFixed =", "[modelsRes" in v)

# Fix 2: landing-page.tsx syntax error
p = "/home/ubuntu/blivoai-demo/src/components/landing/landing-page.tsx"
c = open(p).read()
c = c.replace("const obileMenuOpen, setMobileMenuOpen]", "const [mobileMenuOpen, setMobileMenuOpen]")
open(p, "w").write(c)
v = open(p).read()
print("landing: obileMenuRemains =", "obileMenuOpen" in v)
print("landing: mobileMenuFixed =", "[mobileMenuOpen" in v)

# Fix 3: feature card layout - replace small icon cards with image-on-top + centered text
p = "/home/ubuntu/blivoai-demo/src/components/landing/landing-page.tsx"
c = open(p).read()

import re
# Pattern for old card with small icon
old = r'<Card className="rounded-2xl p-5 sm:p-6 border-border/50 bg-card hover:border-brand/30 transition-all duration-300 group">\\n                  <div className="w-10 h-10 min-w-\\[44px\\] min-h-\\[44px\\] rounded-lg bg-brand/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-brand/20 transition-colors">\\n                    <feature.icon className="w-5 h-5 text-brand" />\\n                  </div>\\n                  <h3 className="text-foreground font-semibold text-base sm:text-lg mb-1\\.5 sm:mb-2">{t\\(feature\\.titleKey, language\\)}</h3>\\n                  <p className="text-muted-foreground text-sm leading-relaxed">{t\\(feature\\.descKey, language\\)}</p>\\n                </Card>'

# Instead of complex regex, use simple line-by-line approach
# Find lines with the old card pattern and rebuild
lines = c.split("\\n")
new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    # Detect start of old-style card
    if 'rounded-2xl p-5 sm:p-6 border-border/50 bg-card hover:border-brand/30' in line and 'group">' in line and 'overflow-hidden' not in line:
        # This is an old card - rebuild it
        # Find the icon div, h3, and p lines
        icon_div_idx = i + 1
        h3_idx = None
        p_idx = None
        close_idx = None
        
        for j in range(i+1, min(i+10, len(lines))):
            if '<feature.icon' in lines[j] and 'w-5 h-5' in lines[j]:
                h3_idx = j + 1  # h3 comes after icon closing div
            if 'feature.titleKey' in lines[j]:
                h3_idx = j
            if 'feature.descKey' in lines[j]:
                p_idx = j
            if '</Card>' in lines[j]:
                close_idx = j
        
        # Build new card
        indent = "                  "
        new_lines.append(indent + '<Card className="rounded-2xl overflow-hidden border-border/50 bg-card hover:border-brand/30 transition-all duration-300 group">')
        new_lines.append(indent + '  <div className="w-full aspect-[3/2] bg-brand/5 flex items-center justify-center p-6 sm:p-8 group-hover:bg-brand/10 transition-colors">')
        new_lines.append(indent + '    <feature.icon className="w-12 h-12 sm:w-16 sm:h-16 text-brand opacity-80 group-hover:opacity-100 transition-opacity" />')
        new_lines.append(indent + '  </div>')
        new_lines.append(indent + '  <div className="p-5 sm:p-6 text-center">')
        new_lines.append(indent + '    <h3 className="text-foreground font-semibold text-base sm:text-lg mb-1.5 sm:mb-2">{t(feature.titleKey, language)}</h3>')
        new_lines.append(indent + '    <p className="text-muted-foreground text-sm leading-relaxed">{t(feature.descKey, language)}</p>')
        new_lines.append(indent + '  </div>')
        new_lines.append(indent + '</Card>')
        
        # Skip old lines until </Card>
        i = close_idx + 1
        continue
    else:
        new_lines.append(line)
        i += 1

c = "\\n".join(new_lines)
open(p, "w").write(c)
v = open(p).read()
print("cards: has w-10 h-10 =", "w-10 h-10" in v)
print("cards: has aspect-[3/2] =", "aspect-[3/2]" in v)
print("cards: has text-center =", "text-center" in v)
"""

with sftp.open('/tmp/fix_all.py', 'w') as f:
    f.write(fix_script)
sftp.close()

# Run the fix script
stdin, stdout, stderr = ssh.exec_command('python3 /tmp/fix_all.py')
out = stdout.read().decode()
err = stderr.read().decode()
print(out)
if err:
    print('Error:', err[:300])

ssh.close()
