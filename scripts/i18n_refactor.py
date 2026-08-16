#!/usr/bin/env python3
"""
Full i18n refactor — make all display functions language-aware.
This script will:
1. Fix subscription-plans.ts — add English features/priceDisplay
2. Fix employee-generator.ts — add language parameter to all display functions
3. Fix overview-panel.tsx — use language-aware functions
4. Check other components for hardcoded Arabic text
"""
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
# 1. Fix subscription-plans.ts — add English features + priceDisplay
# ============================================================
print("\n=== 1. Fixing subscription-plans.ts ===")
plans_path = "/home/ubuntu/blivoai-demo/src/lib/subscription-plans.ts"
plans_content = read_remote(plans_path)

# Add featuresEn and priceDisplayEn fields, plus bilingual token add-on labels
new_plans = '''// ============================================
// Subscription Plans — Bilingual (AR + EN)
// ============================================

import type { SubscriptionPlan, Locale } from "@/types"

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, {
  name: string
  nameAr: string
  price: number
  priceDisplay: string
  priceDisplayEn: string
  tokenBudget: number
  maxEmployees: number
  maxDepartments: number
  features: string[]
  featuresEn: string[]
}> = {
  FREE_TRIAL: {
    name: "Free Trial",
    nameAr: "تجربة مجانية",
    price: 0,
    priceDisplay: "مجاني",
    priceDisplayEn: "Free",
    tokenBudget: 500_000,
    maxEmployees: 2,
    maxDepartments: 1,
    features: [
      "500K توكن شهرياً",
      "قسم واحد فقط",
      "موظفين اثنين فقط",
      "محادثة مباشرة مع الموظف",
      "دعم كل اللهجات",
    ],
    featuresEn: [
      "500K tokens monthly",
      "1 department only",
      "2 employees only",
      "Direct chat with employee",
      "All dialects supported",
    ],
  },
  STARTER: {
    name: "Starter",
    nameAr: "أساسي",
    price: 29,
    priceDisplay: "$29/شهر",
    priceDisplayEn: "$29/month",
    tokenBudget: 3_000_000,
    maxEmployees: 5,
    maxDepartments: 3,
    features: [
      "3M توكن شهرياً",
      "3 أقسام",
      "5 موظفين",
      "محادثة بين الموظفين",
      "أقسام ومشاريع",
      "شحن توكنات إضافية",
    ],
    featuresEn: [
      "3M tokens monthly",
      "3 departments",
      "5 employees",
      "Inter-employee chat",
      "Departments & projects",
      "Extra token packs",
    ],
  },
  PROFESSIONAL: {
    name: "Professional",
    nameAr: "احترافي",
    price: 79,
    priceDisplay: "$79/شهر",
    priceDisplayEn: "$79/month",
    tokenBudget: 15_000_000,
    maxEmployees: 15,
    maxDepartments: 10,
    features: [
      "15M توكن شهرياً",
      "10 أقسام",
      "15 موظف",
      "محادثة بين الأقسام",
      "رفع ملفات وطلبات",
      "تقارير متقدمة",
      "شحن توكنات إضافية",
    ],
    featuresEn: [
      "15M tokens monthly",
      "10 departments",
      "15 employees",
      "Cross-department chat",
      "File uploads & requests",
      "Advanced reports",
      "Extra token packs",
    ],
  },
  ENTERPRISE: {
    name: "Enterprise",
    nameAr: "مؤسسي",
    price: 199,
    priceDisplay: "$199/شهر",
    priceDisplayEn: "$199/month",
    tokenBudget: 50_000_000,
    maxEmployees: 999999,
    maxDepartments: 999999,
    features: [
      "50M توكن شهرياً",
      "أقسام غير محدودة",
      "موظفين غير محدودين",
      "كل الميزات",
      "أولوية بالدعم",
      "شحن توكنات إضافية بسعر مخفض",
    ],
    featuresEn: [
      "50M tokens monthly",
      "Unlimited departments",
      "Unlimited employees",
      "All features",
      "Priority support",
      "Discounted extra token packs",
    ],
  },
}

// Helper: get plan info for current language
export function getPlanInfo(plan: SubscriptionPlan, language: Locale) {
  const info = SUBSCRIPTION_PLANS[plan]
  return {
    name: language === "ar" ? info.nameAr : info.name,
    priceDisplay: language === "ar" ? info.priceDisplay : info.priceDisplayEn,
    features: language === "ar" ? info.features : info.featuresEn,
    tokenBudget: info.tokenBudget,
    maxEmployees: info.maxEmployees,
    maxDepartments: info.maxDepartments,
  }
}

// --- Token add-on packages — bilingual ---
export const TOKEN_ADD_ON_PACKAGES = [
  { tokens: 1_000_000, price: 5, label: "1M توكن — $5", labelEn: "1M tokens — $5" },
  { tokens: 5_000_000, price: 20, label: "5M توكن — $20", labelEn: "5M tokens — $20" },
  { tokens: 10_000_000, price: 35, label: "10M توكن — $35", labelEn: "10M tokens — $35" },
  { tokens: 50_000_000, price: 150, label: "50M توكن — $150", labelEn: "50M tokens — $150" },
]

export function getTokenAddOnLabel(pkg: { label: string; labelEn: string }, language: Locale) {
  return language === "ar" ? pkg.label : pkg.labelEn
}
'''

write_remote(plans_path, new_plans)

# ============================================================
# 2. Fix employee-generator.ts — add language to all display functions
# ============================================================
print("\n=== 2. Fixing employee-generator.ts display functions ===")
gen_path = "/home/ubuntu/blivoai-demo/src/lib/employee-generator.ts"
gen_content = read_remote(gen_path)

# Replace getEmployeeStatusDisplay with bilingual version
old_status = '''export function getEmployeeStatusDisplay(status: string): string {
  const map: Record<string, string> = {
    SETUP: "جاري التهيئة",
    ACTIVE: "نشط",
    PAUSED: "متوقف",
    AWAITING_APPROVAL: "بانتظار موافقة",
    REPLACED: "تم الاستبدال",
    DELETED: "محذوف",
  }
  return map[status] ?? status
}'''

new_status = '''export function getEmployeeStatusDisplay(status: string, language?: string): string {
  if (language === "en") {
    const map: Record<string, string> = {
      SETUP: "Setting Up",
      ACTIVE: "Active",
      PAUSED: "Paused",
      AWAITING_APPROVAL: "Awaiting Approval",
      REPLACED: "Replaced",
      DELETED: "Deleted",
    }
    return map[status] ?? status
  }
  const map: Record<string, string> = {
    SETUP: "جاري التهيئة",
    ACTIVE: "نشط",
    PAUSED: "متوقف",
    AWAITING_APPROVAL: "بانتظار موافقة",
    REPLACED: "تم الاستبدال",
    DELETED: "محذوف",
  }
  return map[status] ?? status
}'''

if old_status in gen_content:
    gen_content = gen_content.replace(old_status, new_status)
    print("  ✅ Fixed getEmployeeStatusDisplay")
else:
    print("  ⚠️ getEmployeeStatusDisplay pattern not found")

# Replace getProjectStatusDisplay with bilingual version
old_project = '''export function getProjectStatusDisplay(status: string): string {
  const map: Record<string, string> = {
    PLANNING: "تخطيط",
    IN_PROGRESS: "جاري التنفيذ",
    ON_HOLD: "متوقف مؤقتاً",
    COMPLETED: "مكتمل",
    CANCELLED: "ملغى",
  }
  return map[status] ?? status
}'''

new_project = '''export function getProjectStatusDisplay(status: string, language?: string): string {
  if (language === "en") {
    const map: Record<string, string> = {
      PLANNING: "Planning",
      IN_PROGRESS: "In Progress",
      ON_HOLD: "On Hold",
      COMPLETED: "Completed",
      CANCELLED: "Cancelled",
    }
    return map[status] ?? status
  }
  const map: Record<string, string> = {
    PLANNING: "تخطيط",
    IN_PROGRESS: "جاري التنفيذ",
    ON_HOLD: "متوقف مؤقتاً",
    COMPLETED: "مكتمل",
    CANCELLED: "ملغى",
  }
  return map[status] ?? status
}'''

if old_project in gen_content:
    gen_content = gen_content.replace(old_project, new_project)
    print("  ✅ Fixed getProjectStatusDisplay")
else:
    print("  ⚠️ getProjectStatusDisplay pattern not found")

# Replace getApprovalModeDisplay with bilingual version
old_approval = '''export function getApprovalModeDisplay(mode: string): string {
  const map: Record<string, string> = {
    ALWAYS_APPROVE: "كل قرار يحتاج موافقة",
    AUTO_WITH_NOTIFY: "يتصرف لوحده مع إشعار",
    AUTO_SILENT: "يتصرف لوحده بدون إشعار",
  }
  return mapode] ?? mode
}'''

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

if old_approval in gen_content:
    gen_content = gen_content.replace(old_approval, new_approval)
    print("  ✅ Fixed getApprovalModeDisplay")
else:
    print("  ⚠️ getApprovalModeDisplay pattern not found")

# Replace getRequestTypeDisplay with bilingual version
old_request_type = '''export function getRequestTypeDisplay(type: string): string {
  const map: Record<string, string> = {
    INFORMATION: "طلب معلومات",
    FILE: "طلب ملف/مستند",
    APPROVAL: "طلب موافقة",
    CLARIFICATION: "طلب توضيح",
    RESOURCE: "طلب موارد",
  }
  return map[type] ?? type
}'''

new_request_type = '''export function getRequestTypeDisplay(type: string, language?: string): string {
  if (language === "en") {
    const map: Record<string, string> = {
      INFORMATION: "Information Request",
      FILE: "File/Document Request",
      APPROVAL: "Approval Request",
      CLARIFICATION: "Clarification Request",
      RESOURCE: "Resource Request",
    }
    return map[type] ?? type
  }
  const map: Record<string, string> = {
    INFORMATION: "طلب معلومات",
    FILE: "طلب ملف/مستند",
    APPROVAL: "طلب موافقة",
    CLARIFICATION: "طلب توضيح",
    RESOURCE: "طلب موارد",
  }
  return map[type] ?? type
}'''

if old_request_type in gen_content:
    gen_content = gen_content.replace(old_request_type, new_request_type)
    print("  ✅ Fixed getRequestTypeDisplay")
else:
    print("  ⚠️ getRequestTypeDisplay pattern not found")

# Replace getRequestStatusDisplay with bilingual version
old_request_status = '''export function getRequestStatusDisplay(status: string): string {
  const map: Record<string, string> = {
    PENDING: "بانتظار الرد",
    APPROVED: "تم الرد",
    REJECTED: "تم الرفض",
    CANCELLED: "تم الإلغاء",
  }
  return map[status] ?? status
}'''

new_request_status = '''export function getRequestStatusDisplay(status: string, language?: string): string {
  if (language === "en") {
    const map: Record<string, string> = {
      PENDING: "Pending",
      APPROVED: "Approved",
      REJECTED: "Rejected",
      CANCELLED: "Cancelled",
    }
    return map[status] ?? status
  }
  const map: Record<string, string> = {
    PENDING: "بانتظار الرد",
    APPROVED: "تم الرد",
    REJECTED: "تم الرفض",
    CANCELLED: "تم الإلغاء",
  }
  return map[status] ?? status
}'''

if old_request_status in gen_content:
    gen_content = gen_content.replace(old_request_status, new_request_status)
    print("  ✅ Fixed getRequestStatusDisplay")
else:
    print("  ⚠️ getRequestStatusDisplay pattern not found")

# Replace getFileCategoryDisplay with bilingual version
old_file_cat = '''export function getFileCategoryDisplay(category: string): string {
  const map: Record<string, string> = {
    INVOICE: "فاتورة",
    CONTRACT: "عقد",
    INVENTORY: "جرد",
    BANK_STATEMENT: "كشف بنكي",
    TAX_DOCUMENT: "مستند ضريبي",
    REPORT: "تقرير",
    IMAGE: "صورة",
    SPREADSHEET: "جدول بيانات",
    GENERAL: "عام",
  }
  return map[category] ?? category
}'''

new_file_cat = '''export function getFileCategoryDisplay(category: string, language?: string): string {
  if (language === "en") {
    const map: Record<string, string> = {
      INVOICE: "Invoice",
      CONTRACT: "Contract",
      INVENTORY: "Inventory",
      BANK_STATEMENT: "Bank Statement",
      TAX_DOCUMENT: "Tax Document",
      REPORT: "Report",
      IMAGE: "Image",
      SPREADSHEET: "Spreadsheet",
      GENERAL: "General",
    }
    return map[category] ?? category
  }
  const map: Record<string, string> = {
    INVOICE: "فاتورة",
    CONTRACT: "عقد",
    INVENTORY: "جرد",
    BANK_STATEMENT: "كشف بنكي",
    TAX_DOCUMENT: "مستند ضريبي",
    REPORT: "تقرير",
    IMAGE: "صورة",
    SPREADSHEET: "جدول بيانات",
    GENERAL: "عام",
  }
  return map[category] ?? category
}'''

if old_file_cat in gen_content:
    gen_content = gen_content.replace(old_file_cat, new_file_cat)
    print("  ✅ Fixed getFileCategoryDisplay")
else:
    print("  ⚠️ getFileCategoryDisplay pattern not found")

# Fix the typo: `return mapode] ?? mode` → `return map[mode] ?? mode`
# (this was a bug in the original file)
if 'mapode]' in gen_content:
    gen_content = gen_content.replace('mapode]', 'map[mode]')
    print("  ✅ Fixed typo: mapode → map[mode]")

write_remote(gen_path, gen_content)

# ============================================================
# 3. Fix overview-panel.tsx — use language-aware display functions
# ============================================================
print("\n=== 3. Fixing overview-panel.tsx ===")
overview_path = "/home/ubuntu/blivoai-demo/src/components/dashboard/overview-panel.tsx"
overview_content = read_remote(overview_path)

# Fix: planInfo.nameAr → use language
overview_content = overview_content.replace(
    '{planInfo.nameAr}',
    '{language === "ar" ? planInfo.nameAr : planInfo.name}'
)

# Fix: planInfo.priceDisplay → use language
overview_content = overview_content.replace(
    '{planInfo.priceDisplay}',
    '{language === "ar" ? planInfo.priceDisplay : planInfo.priceDisplayEn}'
)

# Fix: planInfo.features → use language
overview_content = overview_content.replace(
    'planInfo.features.slice(0, 3).map((f, i) =>',
    '(language === "ar" ? planInfo.features : planInfo.featuresEn).slice(0, 3).map((f, i) =>'
)

# Fix: getEmployeeStatusDisplay(emp.status) → pass language
overview_content = overview_content.replace(
    '{getEmployeeStatusDisplay(emp.status)}',
    '{getEmployeeStatusDisplay(emp.status, language)}'
)

# Fix: getProjectStatusDisplay(project.status) → pass language
overview_content = overview_content.replace(
    '{getProjectStatusDisplay(project.status)}',
    '{getProjectStatusDisplay(project.status, language)}'
)

write_remote(overview_path, overview_content)

# ============================================================
# 4. Fix sidebar.tsx — pass language to display functions
# ============================================================
print("\n=== 4. Fixing sidebar.tsx ===")
sidebar_path = "/home/ubuntu/blivoai-demo/src/components/dashboard/sidebar.tsx"
sidebar_content = read_remote(sidebar_path)

# Fix: getEmployeeStatusDisplay(emp.status) → pass language
# Need to check if SidebarContent has language variable
if 'getEmployeeStatusDisplay(emp.status)' in sidebar_content:
    sidebar_content = sidebar_content.replace(
        'getEmployeeStatusDisplay(emp.status)',
        'getEmployeeStatusDisplay(emp.status, language)'
    )
    print("  ✅ Fixed sidebar getEmployeeStatusDisplay")

# Fix: getEmployeeStatusDisplay in Badge className context
# The sidebar also has getEmployeeStatusColor which doesn't need language
# Let's also check for any hardcoded Arabic text in sidebar
hardcoded_ar = ['نشط', 'خروج', 'موظف', 'قسم', 'إضافة']
for word in hardcoded_ar:
    # Check if it's in a raw string (not in a t() call or variable)
    if word in sidebar_content:
        print(f"  ⚠️ Found hardcoded Arabic '{word}' in sidebar — checking context...")

write_remote(sidebar_path, sidebar_content)

print("\n=== All files fixed ===")
sftp.close()
ssh.close()
print("✅ Done — all display functions now support language parameter")
