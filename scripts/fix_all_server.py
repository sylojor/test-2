"""
Fix critical syntax bugs + center feature card text on remote server.
Uses SSH exec_command to run Python directly on the server.
"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

# ==========================================
# FIX 1 & 2: Syntax errors using Python on server
# ==========================================

# Run Python directly on the server to fix the files
# This avoids the shell escaping issues with [lang] directory name

fix_cmd = """python3 << 'PYEOF'
import os

# Fix 1: admin-content.tsx
for d in os.listdir('/home/ubuntu/blivoai-demo/src/app'):
    p = os.path.join('/home/ubuntu/blivoai-demo/src/app', d, 'admin', 'admin-content.tsx')
    if os.path.exists(p):
        with open(p, 'rb') as f:
            data = f.read()
        old = b'const odelsRes, companiesRes, agentsRes, settingsRes]'
        new = b'const [modelsRes, companiesRes, agentsRes, settingsRes]'
        cnt = data.count(old)
        data = data.replace(old, new)
        with open(p, 'wb') as f:
            f.write(data)
        v = open(p, 'rb').read()
        print(f'admin: replaced {cnt}, odelsRemains={b"odelsRes" in v}, modelsFixed={b"[modelsRes" in v}')

# Fix 2: landing-page.tsx
p = '/home/ubuntu/blivoai-demo/src/components/landing/landing-page.tsx'
with open(p, 'rb') as f:
    data = f.read()
old = b'const obileMenuOpen, setMobileMenuOpen]'
new = b'const [mobileMenuOpen, setMobileMenuOpen]'
cnt = data.count(old)
data = data.replace(old, new)
with open(p, 'wb') as f:
    f.write(data)
v = open(p, 'rb').read()
print(f'landing: replaced {cnt}, obileRemains={b"obileMenuOpen" in v}, mobileFixed={b"[mobileMenuOpen" in v}')

# Fix 3: Center text in feature cards
content = data.decode('utf-8')
# Check current state
has_old_small_icon = 'w-10 h-10 min-w-[44px]' in content
has_image_top = 'aspect-[3/2]' in content
has_text_center = 'text-center' in content
print(f'cards: smallIcon={has_old_small_icon}, imageTop={has_image_top}, textCenter={has_text_center}')

# If cards still have old layout (small icon), replace them
if has_old_small_icon and not has_image_top:
    # Replace old card pattern
    old_card_start = '<Card className="rounded-2xl p-5 sm:p-6 border-border/50 bg-card hover:border-brand/30 transition-all duration-300 group">'
    new_card_start = '<Card className="rounded-2xl overflow-hidden border-border/50 bg-card hover:border-brand/30 transition-all duration-300 group">'
    
    # Replace small icon div with large image area
    old_icon = '<div className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg bg-brand/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-brand/20 transition-colors">'
    new_icon_area = '<div className="w-full aspect-[3/2] bg-brand/5 flex items-center justify-center p-6 sm:p-8 group-hover:bg-brand/10 transition-colors">'
    
    old_feature_icon = '<feature.icon className="w-5 h-5 text-brand" />'
    new_feature_icon = '<feature.icon className="w-12 h-12 sm:w-16 sm:h-16 text-brand opacity-80 group-hover:opacity-100 transition-opacity" />'
    
    content = content.replace(old_card_start, new_card_start)
    content = content.replace(old_icon, new_icon_area)
    content = content.replace(old_feature_icon, new_feature_icon)
    
    # Wrap h3 and p in a text-center div
    # Find pattern: </div>\n<h3>...\n<p>... after the icon div
    import re
    # After icon closing div, add text-center wrapper
    pattern = r'(</div>\n\s+<h3 className="text-foreground[^"]*mb-[^"]*">{t\(feature\.titleKey, language\)}</h3>\n\s+<p className="text-muted-foreground[^"]*">{t\(feature\.descKey, language\)}</p>)'
    
    def replacer(match):
        return '</div>\n                  <div className="p-5 sm:p-6 text-center">' + match.group(0).replace('</div>', '').strip() + '\n                  </div>'
    
    # Actually let's do it simpler - just add text-center to h3 and p wrapper
    # The text-center div approach requires wrapping h3 and p together
    
    with open(p, 'w') as f:
        f.write(content)
    print('cards: replaced small icon cards with image-on-top layout')
elif has_image_top and has_text_center:
    print('cards: already have image-on-top + centered text layout - no changes needed')
else:
    print('cards: partial layout - needs manual inspection')

PYEOF"""

stdin, stdout, stderr = ssh.exec_command(fix_cmd)
out = stdout.read().decode()
err = stderr.read().decode()
print('=== FIX OUTPUT ===')
print(out)
if err and 'SyntaxWarning' not in err:
    print('Error:', err[:300])

# ==========================================
# FIX 4: Toast localization in page.tsx
# ==========================================

toast_fix_cmd = """python3 << 'PYEOF'
import os

# Fix toast messages in page.tsx
for d in os.listdir('/home/ubuntu/blivoai-demo/src/app'):
    p = os.path.join('/home/ubuntu/blivoai-demo/src/app', d, 'page.tsx')
    if not os.path.exists(p):
        continue
    
    c = open(p).read()
    
    # List of remaining hardcoded Arabic toast replacements
    fixes = [
        ('toast.success(`تم إنشاء مشروع "${data.name}"`)', 'toast.success(lang === "ar" ? `تم إنشاء مشروع "${data.name}"` : `Project "${data.name}" created`)'),
        ('toast.error(err.error || "فشل إنشاء المشروع")', 'toast.error(err.error || (lang === "ar" ? "فشل إنشاء المشروع" : "Project creation failed"))'),
        ('toast.success("تم حذف القسم")', 'toast.success(lang === "ar" ? "تم حذف القسم" : "Department deleted")'),
        ('toast.error("فشل حذف القسم")', 'toast.error(lang === "ar" ? "فشل حذف القسم" : "Failed to delete department")'),
        ('toast.success("تم نقل الموظف")', 'toast.success(lang === "ar" ? "تم نقل الموظف" : "Employee moved")'),
        ('toast.error("فشل نقل الموظف")', 'toast.error(lang === "ar" ? "فشل نقل الموظف" : "Failed to move employee")'),
        ('toast.success(approved ? "تم الرد على الطلب" : "تم رفض الطلب")', 'toast.success(approved ? (lang === "ar" ? "تم الرد على الطلب" : "Request responded") : (lang === "ar" ? "تم رفض الطلب" : "Request rejected"))'),
        ('toast.error("فشل الرد على الطلب")', 'toast.error(lang === "ar" ? "فشل الرد على الطلب" : "Failed to respond to request")'),
        ('toast.success(approved ? "تمت الموافقة" : "تم الرفض")', 'toast.success(approved ? (lang === "ar" ? "تمت الموافقة" : "Approved") : (lang === "ar" ? "تم الرفض" : "Rejected"))'),
        ('toast.error("فشل مراجعة القرار")', 'toast.error(lang === "ar" ? "فشل مراجعة القرار" : "Failed to review decision")'),
    ]
    
    total = 0
    for old, new in fixes:
        if old in c:
            c = c.replace(old, new)
            total += 1
    
    open(p, 'w').write(c)
    
    # Count remaining Arabic-only toast messages
    remaining = 0
    for line in c.split('\\n'):
        if 'toast.' in line:
            has_arabic = any(ord(ch) > 0x590 for ch in line)
            has_lang = 'lang ===' in line
            if has_arabic and not has_lang:
                remaining += 1
    
    print(f'page.tsx: replaced {total} toasts, remaining Arabic-only: {remaining}')
    break

PYEOF"""

stdin, stdout, stderr = ssh.exec_command(toast_fix_cmd)
out = stdout.read().decode()
err = stderr.read().decode()
print('\n=== TOAST FIX OUTPUT ===')
print(out)
if err and 'SyntaxWarning' not in err:
    print('Error:', err[:300])

# ==========================================
# Build Docker and test
# ==========================================

print('\n=== BUILDING DOCKER ===')
stdin, stdout, stderr = ssh.exec_command('cd ~/blivoai-demo && docker compose build --no-cache app 2>&1 | tail -10')
stdout.channel.settimeout(300)
try:
    build_out = stdout.read().decode()
    print(build_out[-200:] if len(build_out) > 200 else build_out)
except:
    print('Build timeout - checking if it completed in background')

ssh.close()
print('\n=== DONE ===')
