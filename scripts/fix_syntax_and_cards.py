"""
Fix syntax errors + feature card layout + toast localization on the server.
Uses paramiko SSH to execute Python commands on the remote server.
"""

import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

# ==========================================
# STEP 1: Fix syntax errors using Python on server
# ==========================================

fix_code = '''
import glob
import os

# Fix admin-content.tsx - "const odelsRes" -> "const [modelsRes"
admin_files = glob.glob("/home/ubuntu/blivoai-demo/src/app/*/admin/admin-content.tsx")
for path in admin_files:
    with open(path, "r") as f:
        content = f.read()
    old = "const odelsRes, companiesRes, agentsRes, settingsRes] = await Promise.all(["
    new = "const [modelsRes, companiesRes, agentsRes, settingsRes] = await Promise.all(["
    if old in content:
        content = content.replace(old, new)
        with open(path, "w") as f:
            f.write(content)
        print("FIXED admin: replaced odelsRes -> [modelsRes")
    else:
        print("SKIPPED admin: pattern not found or already fixed")

# Verify
with open(path, "r") as f:
    content = f.read()
print("VERIFY admin: has odelsRes =", "odelsRes" in content)
print("VERIFY admin: has [modelsRes =", "[modelsRes" in content)

# Fix landing-page.tsx - "const obileMenuOpen" -> "const [mobileMenuOpen"
landing_path = "/home/ubuntu/blivoai-demo/src/components/landing/landing-page.tsx"
with open(landing_path, "r") as f:
    content = f.read()

old = "const obileMenuOpen, setMobileMenuOpen] = useState(false)"
new = "const [mobileMenuOpen, setMobileMenuOpen] = useState(false)"
if old in content:
    content = content.replace(old, new)
    with open(landing_path, "w") as f:
        f.write(content)
    print("FIXED landing: replaced obileMenuOpen -> [mobileMenuOpen")
else:
    print("SKIPPED landing: pattern not found or already fixed")

# Verify
with open(landing_path, "r") as f:
    content = f.read()
print("VERIFY landing: has obileMenuOpen =", "obileMenuOpen" in content)
print("VERIFY landing: has [mobileMenuOpen =", "[mobileMenuOpen" in content)
'''

stdin, stdout, stderr = ssh.exec_command(f'python3 << \'EOF\'\n{fix_code}\nEOF')
out = stdout.read().decode()
err = stderr.read().decode()
print("=== FIX 1 & 2: Syntax Errors ===")
print(out)
if err:
    print("Error:", err[:200])

# ==========================================
# STEP 2: Fix feature card layout using Python on server
# ==========================================

card_fix_code = '''
landing_path = "/home/ubuntu/blivoai-demo/src/components/landing/landing-page.tsx"
with open(landing_path, "r") as f:
    content = f.read()

# Replace small icon card with image-on-top + centered text card
old_card = """<Card className="rounded-2xl p-5 sm:p-6 border-border/50 bg-card hover:border-brand/30 transition-all duration-300 group">
                  <div className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg bg-brand/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-brand/20 transition-colors">
                    <feature.icon className="w-5 h-5 text-brand" />
                  </div>
                  <h3 className="text-foreground font-semibold text-base sm:text-lg mb-1.5 sm:mb-2">{t(feature.titleKey, language)}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{t(feature.descKey, language)}</p>
                </Card>"""

new_card = """<Card className="rounded-2xl overflow-hidden border-border/50 bg-card hover:border-brand/30 transition-all duration-300 group">
                  <div className="w-full aspect-[3/2] bg-brand/5 flex items-center justify-center p-6 sm:p-8 group-hover:bg-brand/10 transition-colors">
                    <feature.icon className="w-12 h-12 sm:w-16 sm:h-16 text-brand opacity-80 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-5 sm:p-6 text-center">
                    <h3 className="text-foreground font-semibold text-base sm:text-lg mb-1.5 sm:mb-2">{t(feature.titleKey, language)}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{t(feature.descKey, language)}</p>
                  </div>
                </Card>"""

count = content.count(old_card)
content = content.replace(old_card, new_card)

with open(landing_path, "w") as f:
    f.write(content)
print(f"FIXED landing: replaced {count} feature card(s) with image-on-top + centered text layout")

# Verify
with open(landing_path, "r") as f:
    content = f.read()
print("VERIFY landing: has old card =", old_card[:30] in content)
print("VERIFY landing: has aspect-[3/2] =", "aspect-[3/2]" in content)
print("VERIFY landing: has text-center =", "text-center" in content)
'''

stdin, stdout, stderr = ssh.exec_command(f'python3 << \'EOF\'\n{card_fix_code}\nEOF')
out = stdout.read().decode()
err = stderr.read().decode()
print("\n=== FIX 3: Feature Card Layout ===")
print(out)
if err:
    print("Error:", err[:200])

# ==========================================
# STEP 3: Fix toast localization in page.tsx
# ==========================================

toast_fix_code = '''
import glob

# Fix page.tsx toast messages - make bilingual
page_files = glob.glob("/home/ubuntu/blivoai-demo/src/app/*/page.tsx")
for path in page_files:
    with open(path, "r") as f:
        content = f.read()

    # Check if lang variable exists in the file
    has_lang = "lang" in content
    print(f"File: {path}, has lang variable: {has_lang}")

    replacements = [
        # Signup
        ("toast.success(`أهلاً ${data.name}! سجّل شركتك لتبدأ`)",
         "toast.success(lang === \\\"ar\\\" ? `أهلاً ${data.name}! سجّل شركتك لتبدأ` : `Welcome ${data.name}! Register your company to start`)"),
        ("toast.error(err.error || \\\"فشل التسجيل\\\")",
         "toast.error(err.error || (lang === \\\"ar\\\" ? \\\"فشل التسجيل\\\" : \\\"Signup failed\\\"))"),
        ("toast.error(\\\"حدث خطأ بالاتصال\\\")",
         "toast.error(lang === \\\"ar\\\" ? \\\"حدث خطأ بالاتصال\\\" : \\\"Connection error occurred\\\")"),

        # Login
        ("toast.info(\\\"سجّل شركتك لتبدأ\\\")",
         "toast.info(lang === \\\"ar\\\" ? \\\"سجّل شركتك لتبدأ\\\" : \\\"Register your company to start\\\")"),
        ("toast.success(`أهلاً ${result.user.name}!`)",
         "toast.success(lang === \\\"ar\\\" ? `أهلاً ${result.user.name}!` : `Welcome ${result.user.name}!`)"),
        ("toast.error(err.error || \\\"فشل تسجيل الدخول\\\")",
         "toast.error(err.error || (lang === \\\"ar\\\" ? \\\"فشل تسجيل الدخول\\\" : \\\"Login failed\\\"))"),

        # Company
        ("toast.success(`تم إنشاء شركة \\\"${data.name}\\\"! وظّف أول موظف`)",
         "toast.success(lang === \\\"ar\\\" ? `تم إنشاء شركة \\\"${data.name}\\\"! وظّف أول موظف` : `Company \\\"${data.name}\\\" created! Hire your first employee`)"),
        ("toast.error(err.error || \\\"فشل إنشاء الشركة\\\")",
         "toast.error(err.error || (lang === \\\"ar\\\" ? \\\"فشل إنشاء الشركة\\\" : \\\"Company creation failed\\\"))"),

        # Employee
        ("toast.success(`تم توليد \\\"${name}\\\" (${specialization || role}) — جاري التهيئة...`)",
         "toast.success(lang === \\\"ar\\\" ? `تم توليد \\\"${name}\\\" (${specialization || role}) — جاري التهيئة...` : `\\\"${name}\\\" (${specialization || role}) generated — Initializing...`)"),
        ("toast.error(err.error || \\\"فشل إنشاء الموظف\\\")",
         "toast.error(err.error || (lang === \\\"ar\\\" ? \\\"فشل إنشاء الموظف\\\" : \\\"Employee creation failed\\\"))"),
        ("toast.success(\\\"الموظف جاهز للعمل!\\\")",
         "toast.success(lang === \\\"ar\\\" ? \\\"الموظف جاهز للعمل!\\\" : \\\"Employee is ready to work!\\\")"),
        ("toast.error(err.error || \\\"فشل إعداد الموظف\\\")",
         "toast.error(err.error || (lang === \\\"ar\\\" ? \\\"فشل إعداد الموظف\\\" : \\\"Employee setup failed\\\"))"),

        # Department
        ("toast.success(`تم إنشاء قسم \\\"${data.name}\\\"`)",
         "toast.success(lang === \\\"ar\\\" ? `تم إنشاء قسم \\\"${data.name}\\\"` : `Department \\\"${data.name}\\\" created`)"),
        ("toast.error(err.error || \\\"فشل إنشاء القسم\\\")",
         "toast.error(err.error || (lang === \\\"ar\\\" ? \\\"فشل إنشاء القسم\\\" : \\\"Department creation failed\\\"))"),

        # Project
        ("toast.success(`تم إنشاء مشروع \\\"${data.name}\\\"`)",
         "toast.success(lang === \\\"ar\\\" ? `تم إنشاء مشروع \\\"${data.name}\\\"` : `Project \\\"${data.name}\\\" created`)"),
        ("toast.error(err.error || \\\"فشل إنشاء المشروع\\\")",
         "toast.error(err.error || (lang === \\\"ar\\\" ? \\\"فشل إنشاء المشروع\\\" : \\\"Project creation failed\\\"))"),

        # Delete department
        ("toast.success(\\\"تم حذف القسم\\\")",
         "toast.success(lang === \\\"ar\\\" ? \\\"تم حذف القسم\\\" : \\\"Department deleted\\\")"),
        ("toast.error(\\\"فشل حذف القسم\\\")",
         "toast.error(lang === \\\"ar\\\" ? \\\"فشل حذف القسم\\\" : \\\"Failed to delete department\\\")"),

        # Move employee
        ("toast.success(\\\"تم نقل الموظف\\\")",
         "toast.success(lang === \\\"ar\\\" ? \\\"تم نقل الموظف\\\" : \\\"Employee moved\\\")"),
        ("toast.error(\\\"فشل نقل الموظف\\\")",
         "toast.error(lang === \\\"ar\\\" ? \\\"فشل نقل الموظف\\\" : \\\"Failed to move employee\\\")"),

        # Approval
        ("toast.success(approved ? \\\"تم الرد على الطلب\\\" : \\\"تم رفض الطلب\\\")",
         "toast.success(approved ? (lang === \\\"ar\\\" ? \\\"تم الرد على الطلب\\\" : \\\"Request responded\\\") : (lang === \\\"ar\\\" ? \\\"تم رفض الطلب\\\" : \\\"Request rejected\\\"))"),
        ("toast.error(\\\"فشل الرد على الطلب\\\")",
         "toast.error(lang === \\\"ar\\\" ? \\\"فشل الرد على الطلب\\\" : \\\"Failed to respond to request\\\")"),

        # Review
        ("toast.success(approved ? \\\"تمت الموافقة\\\" : \\\"تم الرفض\\\")",
         "toast.success(approved ? (lang === \\\"ar\\\" ? \\\"تمت الموافقة\\\" : \\\"Approved\\\") : (lang === \\\"ar\\\" ? \\\"تم الرفض\\\" : \\\"Rejected\\\"))"),
        ("toast.error(\\\"فشل مراجعة القرار\\\")",
         "toast.error(lang === \\\"ar\\\" ? \\\"فشل مراجعة القرار\\\" : \\\"Failed to review decision\\\")"),
    ]

    total_replaced = 0
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
            total_replaced += 1

    with open(path, "w") as f:
        f.write(content)
    print(f"FIXED page: replaced {total_replaced} toast messages with bilingual versions")

    # Count remaining Arabic-only toast messages
    import re
    remaining = 0
    for line in content.split("\\n"):
        if "toast." in line:
            # Check if it has Arabic chars but no lang conditional
            has_arabic = any(ord(c) > 1500 for c in line)
            has_lang_cond = "lang ===" in line
            if has_arabic and not has_lang_cond:
                remaining += 1
    print(f"REMAINING Arabic-only toast messages: {remaining}")
'''

stdin, stdout, stderr = ssh.exec_command(f'python3 << \'EOF\'\n{toast_fix_code}\nEOF')
out = stdout.read().decode()
err = stderr.read().decode()
print("\n=== FIX 4: Toast Localization ===")
print(out)
if err:
    print("Error:", err[:200])

ssh.close()
print("\n=== ALL FIXES APPLIED ===")
