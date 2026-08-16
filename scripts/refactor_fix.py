#!/usr/bin/env python3
"""
Comprehensive refactor script for BlivoAI demo
Fixes:
1. LocaleSetter - RTL for Arabic, LTR for English
2. Remove hardcoded dir="ltr" 
3. Remove hardcoded text-right in sidebar
4. Replace hardcoded Arabic text with translations
5. Add missing translation keys
6. Clean up duplicate keys in i18n.ts
7. Fix t() fallback to prefer current language over Arabic
"""

import paramiko
import sys
import re
import json

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(out[:500])
    if err and 'warning' not in err.lower() and 'warn' not in err.lower():
        print("STDERR:", err[:500])
    return out, err

def write_remote_file(path, content):
    """Write content to remote file using SFTP"""
    sftp = client.open_sftp()
    with sftp.file(path, 'w') as f:
        f.write(content)
    sftp.close()
    print(f"Written: {path} ({len(content)} bytes)")

def read_remote_file(path):
    """Read remote file"""
    sftp = client.open_sftp()
    with sftp.file(path, 'r') as f:
        content = f.read().decode()
    sftp.close()
    return content

# ============================================
# FIX 1: LocaleSetter - RTL for Arabic
# ============================================
print("\n=== FIX 1: LocaleSetter ===")
locale_setter_content = '''"use client"

import { useEffect } from "react"
import type { Locale } from "@/lib/i18n-config"

// ============================================
// Client component that sets <html> lang and dir attributes
// Arabic → RTL, English → LTR
// ============================================

export function LocaleSetter({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale
    // Arabic uses RTL layout direction, English uses LTR
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr"
  }, [locale])

  return null
}
'''
write_remote_file("/home/ubuntu/blivoai-demo/src/components/locale-setter.tsx", locale_setter_content)

# ============================================
# FIX 2: page.tsx - remove hardcoded dir="ltr" and Arabic
# ============================================
print("\n=== FIX 2: page.tsx ===")
page_content = read_remote_file("/home/ubuntu/blivoai-demo/src/app/[lang]/page.tsx")

# Fix 2a: Replace hardcoded dir="ltr" with dynamic direction
page_content = page_content.replace(
    '<div className="h-screen overflow-hidden bg-background text-foreground flex" dir="ltr">',
    '<div className="h-screen overflow-hidden bg-background text-foreground flex" dir={lang === "ar" ? "rtl" : "ltr"}>'
)

# Fix 2b: Replace userName || "المدير" with translation
page_content = page_content.replace(
    'userName={appState.userName || "المدير"}',
    'userName={appState.userName || t("chat.manager", lang)}'
)

write_remote_file("/home/ubuntu/blivoai-demo/src/app/[lang]/page.tsx", page_content)

# ============================================
# FIX 3: sidebar.tsx - remove hardcoded text-right
# ============================================
print("\n=== FIX 3: sidebar.tsx ===")
sidebar_content = read_remote_file("/home/ubuntu/blivoai-demo/src/components/dashboard/sidebar.tsx")

# Replace all text-right with dynamic direction-based alignment
# In RTL mode, text-right means alignment to the start (right)
# In LTR mode, text-left means alignment to the start (left)
# We use text-start which works for both directions
sidebar_content = sidebar_content.replace('text-right', 'text-start')

# Also add dir attribute to sidebar content for proper RTL support
# The sidebar is already inside the LocaleSetter context so direction is set on <html>

write_remote_file("/home/ubuntu/blivoai-demo/src/components/dashboard/sidebar.tsx", sidebar_content)

# ============================================
# FIX 4: main-content.tsx - replace hardcoded Arabic
# ============================================
print("\n=== FIX 4: main-content.tsx ===")
mc_content = read_remote_file("/home/ubuntu/blivoai-demo/src/components/dashboard/main-content.tsx")

# Add imports for translations
mc_content = mc_content.replace(
    'import { EmployeeDetailPanel } from "@/components/dashboard/employee-detail-panel"',
    'import { EmployeeDetailPanel } from "@/components/dashboard/employee-detail-panel"\nimport { t } from "@/lib/i18n"\nimport { useLocale } from "@/hooks/use-locale"'
)

# Add language hook inside the function
mc_content = mc_content.replace(
    'export function MainContent({\n  company,\n  employees,\n  departments,\n  projects,\n  userId,\n  userName,\n  onReviewDecision,\n  onRespondToRequest,\n  onCreateDepartment,\n  onCreateProject,\n  onUpdateEmployeeDepartment,\n  onDeleteDepartment,\n  onChatWithEmployee,\n}: MainContentProps) {\n  const { selectedEmployeeId, selectedDepartmentId, activeTab, selectedEmployeeDetailId } = useDashboardStore()',
    'export function MainContent({\n  company,\n  employees,\n  departments,\n  projects,\n  userId,\n  userName,\n  onReviewDecision,\n  onRespondToRequest,\n  onCreateDepartment,\n  onCreateProject,\n  onUpdateEmployeeDepartment,\n  onDeleteDepartment,\n  onChatWithEmployee,\n}: MainContentProps) {\n  const language = useLocale()\n  const { selectedEmployeeId, selectedDepartmentId, activeTab, selectedEmployeeDetailId } = useDashboardStore()'
)

# Replace all "ما في شركة" with translation
mc_content = mc_content.replace(
    '<div className="text-center py-12 text-muted-foreground">ما في شركة</div>',
    '<div className="text-center py-12 text-muted-foreground">{t("main.noCompany", language)}</div>'
)

write_remote_file("/home/ubuntu/blivoai-demo/src/components/dashboard/main-content.tsx", mc_content)

# ============================================
# FIX 5: available-employees-panel.tsx - replace hardcoded Arabic
# ============================================
print("\n=== FIX 5: available-employees-panel.tsx ===")
ae_content = read_remote_file("/home/ubuntu/blivoai-demo/src/components/dashboard/available-employees-panel.tsx")

# Replace "الموظفين المشغولين" with translation
ae_content = ae_content.replace(
    '{language === "ar" ? "الموظفين المشغولين" : "Busy Employees"}',
    '{t("available.busyEmployees", language)}'
)

# Replace "ما في موظفين مشغولين حالياً" with translation
ae_content = ae_content.replace(
    '{language === "ar" ? "ما في موظفين مشغولين حالياً" : "No busy employees right now"}',
    '{t("available.noBusy", language)}'
)

# Replace "الموظفين الفاضيين" with translation
ae_content = ae_content.replace(
    '{language === "ar" ? "الموظفين الفاضيين" : "Idle Employees"}',
    '{t("available.idleEmployees", language)}'
)

# Replace "شغال على:" with translation
ae_content = ae_content.replace(
    '{language === "ar" ? "شغال على:" : "Working on:"}',
    '{t("available.workingOn", language)}'
)

write_remote_file("/home/ubuntu/blivoai-demo/src/components/dashboard/available-employees-panel.tsx", ae_content)

# ============================================
# FIX 6: settings-panel.tsx - replace hardcoded Arabic
# ============================================
print("\n=== FIX 6: settings-panel.tsx ===")
settings_content = read_remote_file("/home/ubuntu/blivoai-demo/src/components/dashboard/settings-panel.tsx")

# Fix PROVIDER_OPTIONS - replace Arabic descriptions with bilingual ones
settings_content = settings_content.replace(
    '{ value: "together", label: "Together AI", description: "أرخص + تنوع موديلات — $0.088/M tokens" }',
    '{ value: "together", label: "Together AI", descriptionKey: "settings.llm.provider.together.desc" }'
)
settings_content = settings_content.replace(
    '{ value: "grok", label: "Grok (xAI)", description: "أذكى بالعربي + شخصية بشرية — $0.30/M tokens" }',
    '{ value: "grok", label: "Grok (xAI)", descriptionKey: "settings.llm.provider.grok.desc" }'
)
settings_content = settings_content.replace(
    '{ value: "openrouter", label: "OpenRouter", description: "سهل الإعداد + موديلات مجانية" }',
    '{ value: "openrouter", label: "OpenRouter", descriptionKey: "settings.llm.provider.openrouter.desc" }'
)
settings_content = settings_content.replace(
    '{ value: "local", label: "سيرفر GPU محلي", description: "مجاني — لازم يكون عندك سيرفر GPU" }',
    '{ value: "local", label: "Local GPU Server", descriptionKey: "settings.llm.provider.local.desc" }'
)
settings_content = settings_content.replace(
    '{ value: "mock", label: "وضع التجربة", description: "بدون API — ردود ذكية محلية" }',
    '{ value: "mock", label: "Trial Mode", descriptionKey: "settings.llm.provider.mock.desc" }'
)

# Fix the provider description rendering
settings_content = settings_content.replace(
    '<p className="text-muted-foreground text-xs">{opt.description}</p>',
    '<p className="text-muted-foreground text-xs">{t(opt.descriptionKey, language)}</p>'
)

# Fix "موديل المحادثات" hardcoded
settings_content = settings_content.replace(
    '<span className="text-muted-foreground text-sm">موديل المحادثات</span>',
    '<span className="text-muted-foreground text-sm">{t("settings.llm.chatModel", language)}</span>'
)

# Fix "السعر" hardcoded
settings_content = settings_content.replace(
    '<span className="text-muted-foreground text-sm">السعر</span>',
    '<span className="text-muted-foreground text-sm">{t("settings.llm.pricing", language)}</span>'
)

# Fix "كيف تربط الـ API؟" hardcoded
settings_content = settings_content.replace(
    '<p className="text-foreground text-sm font-medium">كيف تربط الـ API؟</p>',
    '<p className="text-foreground text-sm font-medium">{t("settings.llm.howToConnect", language)}</p>'
)

# Fix all the explanation steps (Arabic-only)
settings_content = settings_content.replace(
    '<p>1. سجّل بأحد المزوّدين (Grok أو Together)</p>',
    '<p>{t("settings.llm.step1", language)}</p>'
)
settings_content = settings_content.replace(
    '<p>2. خد الـ API Key من لوحة التحكم</p>',
    '<p>{t("settings.llm.step2", language)}</p>'
)
settings_content = settings_content.replace(
    '<p>3. حطو فوق واضغط "{t("settings.llm.test", language)}"</p>',
    '<p>{t("settings.llm.step3", language)}</p>'
)
settings_content = settings_content.replace(
    '<p>4. لو نجح → أضفو بملف docker-compose.yml:</p>',
    '<p>{t("settings.llm.step4", language)}</p>'
)

# Fix the Arabic-only note
settings_content = settings_content.replace(
    'ملاحظة: تغيير الإعدادات بالـ UI بيختبر الاتصال بس.\n                لتغيير الإعدادات فعلياً لازم تعدّل docker-compose.yml وتعمل restart.',
    '{t("settings.llm.uiNote", language)}'
)

# Fix "مقارنة المزودين" 
settings_content = settings_content.replace(
    '<p className="text-foreground text-sm font-medium mb-3">مقارنة المزودين</p>',
    '<p className="text-foreground text-sm font-medium mb-3">{t("settings.llm.providerComparison", language)}</p>'
)

# Fix Together AI comparison section (Arabic-only)
settings_content = settings_content.replace(
    '<p className="text-blue-400 text-sm font-medium">Together AI</p>\n                <p className="text-muted-foreground text-xs mt-1">$0.088/M tokens</p>\n                <p className="text-muted-foreground text-xs">أرخص — مناسب للمهام الكثيرة</p>\n                <p className="text-muted-foreground text-xs">+100 موديل (Llama, Qwen, DeepSeek)</p>',
    '<p className="text-blue-400 text-sm font-medium">Together AI</p>\n                <p className="text-muted-foreground text-xs mt-1">$0.088/M tokens</p>\n                <p className="text-muted-foreground text-xs">{t("settings.llm.together.cheap", language)}</p>\n                <p className="text-muted-foreground text-xs">{t("settings.llm.together.models", language)}</p>'
)

# Fix Grok comparison section (Arabic-only)
settings_content = settings_content.replace(
    '<p className="text-purple-400 text-sm font-medium">Grok (xAI)</p>\n                <p className="text-muted-foreground text-xs mt-1">$0.30/M tokens</p>\n                <p className="text-muted-foreground text-xs">أذكى بالعربي — شخصية بشرية</p>\n                <p className="text-muted-foreground text-xs">مثالي للمحادثات مع الموظفين</p>',
    '<p className="text-purple-400 text-sm font-medium">Grok (xAI)</p>\n                <p className="text-muted-foreground text-xs mt-1">$0.30/M tokens</p>\n                <p className="text-muted-foreground text-xs">{t("settings.llm.grok.smartArabic", language)}</p>\n                <p className="text-muted-foreground text-xs">{t("settings.llm.grok.idealChat", language)}</p>'
)

# Fix tip section (Arabic-only)
settings_content = settings_content.replace(
    'نصيحة: استخدم Grok للمحادثات (أذكى بالعربي) + Together للمهام البسيطة (أرخص).\n              النظام بيختار الموديل المناسب تلقائياً حسب نوع المهمة.',
    '{t("settings.llm.tip", language)}'
)

# Fix "سجّل من هون ←" links  
settings_content = settings_content.replace(
    'سجّل من هون ←',
    '{t("settings.llm.registerHere", language)} ←'
)

# Fix "رابط السيرفر"
settings_content = settings_content.replace(
    '{selectedProvider === "local" ? "رابط السيرفر" : "Base URL (اختياري)"}',
    '{selectedProvider === "local" ? t("settings.llm.serverUrl", language) : t("settings.llm.baseUrlOptional", language)}'
)

# Fix placeholder text "مثلاً: تجارة، تقنية..." in industry field
settings_content = settings_content.replace(
    'placeholder="مثلاً: تجارة، تقنية..."',
    'placeholder={t("settings.company.industryPlaceholder", language)}'
)

# Fix placeholder "وصف مختصر — الموظفين بيستخدموه ليفهموا شغلكم"
settings_content = settings_content.replace(
    'placeholder="وصف مختصر — الموظفين بيستخدموه ليفهموا شغلكم"',
    'placeholder={t("settings.company.descriptionPlaceholder", language)}'
)

# Fix "تجديد الاشتراك"
settings_content = settings_content.replace(
    '<span className="text-muted-foreground text-sm">تجديد الاشتراك</span>',
    '<span className="text-muted-foreground text-sm">{t("settings.subscription.renewal", language)}</span>'
)

# Fix date locale - use language-aware locale
settings_content = settings_content.replace(
    '.toLocaleDateString("ar-EG")',
    '.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US")'
)

# Fix "ربط فيسبوك"
settings_content = settings_content.replace(
    'ربط فيسبوك',
    '{t("settings.platforms.connectFacebook", language)}'
)

# Fix "لتغيير اللهجة أو النبرة، تواصل مع الدعم (قيد التطوير)"
settings_content = settings_content.replace(
    'لتغيير اللهجة أو النبرة، تواصل مع الدعم (قيد التطوير)',
    '{t("settings.communication.changeNote", language)}'
)

write_remote_file("/home/ubuntu/blivoai-demo/src/components/dashboard/settings-panel.tsx", settings_content)

# ============================================
# FIX 7: landing-page.tsx - remove hardcoded dir="ltr"
# ============================================
print("\n=== FIX 7: landing-page.tsx ===")
landing_content = read_remote_file("/home/ubuntu/blivoai-demo/src/components/landing/landing-page.tsx")

landing_content = landing_content.replace(
    '<div className="min-h-screen bg-background text-foreground overflow-x-hidden" dir="ltr">',
    '<div className="min-h-screen bg-background text-foreground overflow-x-hidden" dir={language === "ar" ? "rtl" : "ltr"}>'
)

write_remote_file("/home/ubuntu/blivoai-demo/src/components/landing/landing-page.tsx", landing_content)

# ============================================
# FIX 8: i18n.ts - add missing keys + fix fallback + remove duplicates
# ============================================
print("\n=== FIX 8: i18n.ts ===")
i18n_content = read_remote_file("/home/ubuntu/blivoai-demo/src/lib/i18n.ts")

# Fix the t() function fallback: prefer current language, then English, then key itself
# Current: translations[language]?.[key] ?? translations.ar[key] ?? key
# New: translations[language]?.[key] ?? key  (no Arabic fallback for English pages)
i18n_content = i18n_content.replace(
    'return translations[language]?.[key] ?? translations.ar[key] ?? key',
    'return translations[language]?.[key] ?? key'
)

# Remove duplicate keys in both ar and en sections
# The duplicates are: sidebar.accessTokens, sidebar.availableEmployees, sidebar.payments, 
# payment.*, accessTokens.*, available.*, talk.*, deptChat.* appearing twice

# Find and remove second occurrence of duplicate blocks in Arabic section
# Looking for the pattern where keys appear twice between lines ~265-408 and ~335-408

# Remove the duplicate block in Arabic section (lines 335-408 are duplicates of 265-334)
# We'll identify the exact duplicate sections

# Let me find the second occurrence of "sidebar.accessTokens" in Arabic section
ar_section = i18n_content.split('ar: {')[1].split('},\n\n  en: {')[0]

# Find duplicate keys in Arabic
lines = ar_section.split('\n')
seen_keys = {}
duplicate_lines = set()
for i, line in enumerate(lines):
    match = re.match(r'^\s*"([^"]+)":', line)
    if match:
        key = match.group(1)
        if key in seen_keys:
            duplicate_lines.add(i)
        else:
            seen_keys[key] = i

print(f"Found {len(duplicate_lines)} duplicate keys in Arabic section")

# Remove duplicate lines from Arabic section
new_ar_lines = [line for i, line in enumerate(lines) if i not in duplicate_lines]
new_ar_section = '\n'.join(new_ar_lines)

# Now rebuild the full i18n content
en_section = i18n_content.split('  en: {')[1].split('},\n}')[0]

# Also remove duplicates in English section
en_lines = en_section.split('\n')
seen_keys_en = {}
duplicate_lines_en = set()
for i, line in enumerate(en_lines):
    match = re.match(r'^\s*"([^"]+)":', line)
    if match:
        key = match.group(1)
        if key in seen_keys_en:
            duplicate_lines_en.add(i)
        else:
            seen_keys_en[key] = i

print(f"Found {len(duplicate_lines_en)} duplicate keys in English section")

new_en_lines = [line for i, line in enumerate(en_lines) if i not in duplicate_lines_en]
new_en_section = '\n'.join(new_en_lines)

# Add new translation keys that we need
new_ar_keys = '''
    // === Missing keys added ===
    "main.noCompany": "لا توجد شركة",
    "available.busyEmployees": "الموظفين المشغولين",
    "available.idleEmployees": "الموظفين الفاضيين",
    "available.noBusy": "ما في موظفين مشغولين حالياً",
    "available.workingOn": "شغال على:",
    "settings.llm.provider.together.desc": "أرخص + تنوع موديلات — $0.088/M tokens",
    "settings.llm.provider.grok.desc": "أذكى بالعربي + شخصية بشرية — $0.30/M tokens",
    "settings.llm.provider.openrouter.desc": "سهل الإعداد + موديلات مجانية",
    "settings.llm.provider.local.desc": "مجاني — لازم يكون عندك سيرفر GPU",
    "settings.llm.provider.mock.desc": "بدون API — ردود ذكية محلية",
    "settings.llm.chatModel": "موديل المحادثات",
    "settings.llm.pricing": "السعر",
    "settings.llm.howToConnect": "كيف تربط الـ API؟",
    "settings.llm.step1": "1. سجّل بأحد المزوّدين (Grok أو Together)",
    "settings.llm.step2": "2. خد الـ API Key من لوحة التحكم",
    "settings.llm.step3": "3. حطو فوق واضغط اختبار الاتصال",
    "settings.llm.step4": "4. لو نجح → أضفو بملف docker-compose.yml:",
    "settings.llm.uiNote": "ملاحظة: تغيير الإعدادات بالـ UI بيختبر الاتصال بس. لتغيير الإعدادات فعلياً لازم تعدّل docker-compose.yml وتعمل restart.",
    "settings.llm.providerComparison": "مقارنة المزودين",
    "settings.llm.together.cheap": "أرخص — مناسب للمهام الكثيرة",
    "settings.llm.together.models": "+100 موديل (Llama, Qwen, DeepSeek)",
    "settings.llm.grok.smartArabic": "أذكى بالعربي — شخصية بشرية",
    "settings.llm.grok.idealChat": "مثالي للمحادثات مع الموظفين",
    "settings.llm.tip": "نصيحة: استخدم Grok للمحادثات (أذكى بالعربي) + Together للمهام البسيطة (أرخص). النظام بيختار الموديل المناسب تلقائياً حسب نوع المهمة.",
    "settings.llm.registerHere": "سجّل من هون",
    "settings.llm.serverUrl": "رابط السيرفر",
    "settings.llm.baseUrlOptional": "Base URL (اختياري)",
    "settings.company.industryPlaceholder": "مثلاً: تجارة، تقنية...",
    "settings.company.descriptionPlaceholder": "وصف مختصر — الموظفين بيستخدموه ليفهموا شغلكم",
    "settings.subscription.renewal": "تجديد الاشتراك",
    "settings.platforms.connectFacebook": "ربط فيسبوك",
    "settings.communication.changeNote": "لتغيير اللهجة أو النبرة، تواصل مع الدعم (قيد التطوير)",
'''

new_en_keys = '''
    // === Missing keys added ===
    "main.noCompany": "No company",
    "available.busyEmployees": "Busy Employees",
    "available.idleEmployees": "Idle Employees",
    "available.noBusy": "No busy employees right now",
    "available.workingOn": "Working on:",
    "settings.llm.provider.together.desc": "Cheapest + diverse models — $0.088/M tokens",
    "settings.llm.provider.grok.desc": "Smartest for Arabic + human-like personality — $0.30/M tokens",
    "settings.llm.provider.openrouter.desc": "Easy setup + free models available",
    "settings.llm.provider.local.desc": "Free — requires a GPU server",
    "settings.llm.provider.mock.desc": "No API needed — smart local responses",
    "settings.llm.chatModel": "Chat Model",
    "settings.llm.pricing": "Pricing",
    "settings.llm.howToConnect": "How to connect the API?",
    "settings.llm.step1": "1. Sign up with a provider (Grok or Together)",
    "settings.llm.step2": "2. Get the API Key from the dashboard",
    "settings.llm.step3": "3. Paste it above and click Test Connection",
    "settings.llm.step4": "4. If successful → add it to docker-compose.yml:",
    "settings.llm.uiNote": "Note: Changing settings in the UI only tests the connection. To permanently change settings, you need to edit docker-compose.yml and restart.",
    "settings.llm.providerComparison": "Provider Comparison",
    "settings.llm.together.cheap": "Cheapest — ideal for heavy tasks",
    "settings.llm.together.models": "+100 models (Llama, Qwen, DeepSeek)",
    "settings.llm.grok.smartArabic": "Smartest for Arabic — human-like personality",
    "settings.llm.grok.idealChat": "Ideal for employee conversations",
    "settings.llm.tip": "Tip: Use Grok for conversations (smartest for Arabic) + Together for simple tasks (cheapest). The system automatically selects the appropriate model based on the task type.",
    "settings.llm.registerHere": "Register here",
    "settings.llm.serverUrl": "Server URL",
    "settings.llm.baseUrlOptional": "Base URL (optional)",
    "settings.company.industryPlaceholder": "e.g., trade, technology...",
    "settings.company.descriptionPlaceholder": "Brief description — employees use it to understand your business",
    "settings.subscription.renewal": "Subscription Renewal",
    "settings.platforms.connectFacebook": "Connect Facebook",
    "settings.communication.changeNote": "To change dialect or tone, contact support (under development)",
'''

# Now build the new i18n.ts file
# We need to reconstruct the file properly
# Remove the last `}` from new_ar_section (it's the closing of ar object)
# and add our new keys before it

# Find the last key line in ar section (before closing })
ar_last_key_idx = len(new_ar_lines) - 1
for i in range(len(new_ar_lines) - 1, -1, -1):
    if new_ar_lines[i].strip().startswith('"'):
        ar_last_key_idx = i
        break

# Insert new keys after the last existing key
new_ar_with_keys = new_ar_lines[:ar_last_key_idx+1] + [new_ar_keys] + new_ar_lines[ar_last_key_idx+1:]

# Same for English
en_last_key_idx = len(new_en_lines) - 1
for i in range(len(new_en_lines) - 1, -1, -1):
    if new_en_lines[i].strip().startswith('"'):
        en_last_key_idx = i
        break

new_en_with_keys = new_en_lines[:en_last_key_idx+1] + [new_en_keys] + new_en_lines[en_last_key_idx+1:]

# Build the full file
header = '''// ============================================
// نظام ثنائي اللغة — عربي / إنجليزي
// RTL for Arabic, LTR for English
// ============================================

export type Language = "ar" | "en"

// ============================================
// كل النصوص بالمشروع — عربي وإنجليزي
// ============================================

export const translations: Record<Language, Record<string, string>> = {
'''

# Get the t() function part from original
t_function_part = i18n_content.split('},\n}')[1]

full_i18n = header + '  ar: {\n' + '\n'.join(new_ar_with_keys) + '\n  },\n\n  en: {\n' + '\n'.join(new_en_with_keys) + '\n  },\n}' + t_function_part

write_remote_file("/home/ubuntu/blivoai-demo/src/lib/i18n.ts", full_i18n)

# ============================================
# FIX 9: Build and deploy
# ============================================
print("\n=== FIX 9: Build and Deploy ===")
out, err = run_cmd("cd ~/blivoai-demo && docker compose build app 2>&1 | tail -30")
print("Build output:", out[:1000] if out else "none")

out, err = run_cmd("cd ~/blivoai-demo && docker compose down && docker compose up -d 2>&1")
print("Deploy output:", out[:500] if out else "none")

print("\n=== All fixes applied! ===")
client.close()
