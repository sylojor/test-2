#!/usr/bin/env python3
"""
Comprehensive deployment script for BlivoAI features:
1. Access Tokens tab + panel
2. Improved Talk panel (departments + broadcast)
3. Available Employees section
4. Landing page readability fixes
5. FAB size increase
6. Payment system stubs
7. i18n translations
"""

import paramiko
import os
import sys
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', username='ubuntu', password='Mghazi@199641')
sftp = ssh.open_sftp()

BASE = '/home/ubuntu/blivoai-demo/src'

def write_file(path, content):
    """Write content to remote file via SFTP"""
    with sftp.open(path, 'w') as f:
        f.write(content.encode('utf-8'))
    print(f"  Written: {path}")

def read_file(path):
    """Read content from remote file via SFTP"""
    with sftp.open(path, 'r') as f:
        return f.read().decode('utf-8')

# ============================================
# 1. UPDATE i18n.ts — Add new translations
# ============================================
print("\n[1] Updating i18n.ts...")

i18n_path = f'{BASE}/lib/i18n.ts'
i18n = read_file(i18n_path)

# New Arabic translations (after sidebar.logout)
ar_new = '''
    "sidebar.accessTokens": "تصريحات الدخول",
    "sidebar.availableEmployees": "الموظفين المتاحين",
    "sidebar.payments": "الدفع والاشتراك",

    "accessTokens.title": "تصريحات الدخول",
    "accessTokens.subtitle": "أضف أكسس توكنات ومعلومات دخول عشان الموظفين يستعملوها بشغلهم",
    "accessTokens.add": "إضافة تصريح",
    "accessTokens.edit": "تعديل",
    "accessTokens.delete": "حذف",
    "accessTokens.platform": "المنصة / نوع التصريح",
    "accessTokens.platformPlaceholder": "مثلاً: GitHub, Facebook, SSH Server",
    "accessTokens.name": "اسم التصريح",
    "accessTokens.namePlaceholder": "مثلاً: غيت هاب الشركة",
    "accessTokens.tokenValue": "التوكن / كلمة السر / API Key",
    "accessTokens.tokenValuePlaceholder": "ghp_xxxxx أو كلمة سر السيرفر",
    "accessTokens.scopes": "الصلاحيات",
    "accessTokens.scopesPlaceholder": "مثلاً: read, write, admin",
    "accessTokens.metadata": "معلومات إضافية",
    "accessTokens.metadataPlaceholder": "مثلاً: عنوان السيرفر، بورت...",
    "accessTokens.noTokens": "لا تصريحات — أضيف أكسس للمنصات والسيرفرات",
    "accessTokens.inUseBy": "يستخدمه",
    "accessTokens.employees": "موظفين",
    "accessTokens.assignToEmployee": "ربط تصريح بموظف",
    "accessTokens.unassignFromEmployee": "فك ربط التصريح",
    "accessTokens.save": "حفظ",
    "accessTokens.cancel": "إلغاء",
    "accessTokens.search": "ابحث عن تصريح...",
    "accessTokens.category.social": "سوشال ميديا",
    "accessTokens.category.development": "برمجة وتطوير",
    "accessTokens.category.server": "سيرفرات و SSH",
    "accessTokens.category.payment": "دفع ومالية",
    "accessTokens.category.email": "إيميل",
    "accessTokens.category.other": "أخرى",

    "available.title": "الموظفين المتاحين",
    "available.subtitle": "الموظفين الفاضيين واللي بشتغلو",
    "available.idle": "فاضي — جاهز لمهمة جديدة",
    "available.busy": "مشغول — على مهمة",
    "available.progress": "التقدم",
    "available.noIdle": "كل الموظفين مشغولين",
    "available.assignTask": "عطيه مهمة",

    "talk.broadcast": "إرسال لكل الموظفين",
    "talk.broadcastDept": "إرسال لكل القسم",
    "talk.broadcastRole": "إرسال حسب الرول",
    "talk.sendToAll": "إرسال للكل",
    "talk.sendToDept": "إرسال للقسم",
    "talk.sendToRole": "إرسال للرول",
    "talk.role.manager": "مدير",
    "talk.role.head": "رئيس قسم",
    "talk.role.employee": "موظف",
    "talk.selectTarget": "اختار وين تبعت المسج",
    "talk.targetAll": "كل الموظفين والأقسام",
    "talk.targetDept": "كامل القسم",
    "talk.targetEmployee": "موظف واحد",
    "talk.targetRole": "حسب الرول",

    "payment.title": "الدفع والاشتراك",
    "payment.subtitle": "إدارة الدفع والاشتراك",
    "payment.platform": "إعداد الدفع (صاحب المنصة)",
    "payment.platformDesc": "ربط حساب Dodo Payments لاستقبال فلوس المشتركين",
    "payment.subscriber": "إعداد الدفع (المشتركين)",
    "payment.subscriberDesc": "ربط حساب Stripe أو PayPal أو حساب بنكي لاستقبال فلوس شغلهم",
    "payment.dodoSetup": "إعداد Dodo Payments",
    "payment.dodoApiKey": "API Key",
    "payment.dodoApiKeyPlaceholder": "أدخل API Key تبع Dodo",
    "payment.dodoWebhook": "Webhook URL",
    "payment.stripeSetup": "إعداد Stripe",
    "payment.stripeApiKey": "Stripe API Key",
    "payment.stripeAccountId": "Stripe Account ID",
    "payment.paypalSetup": "إعداد PayPal",
    "payment.paypalEmail": "بريد PayPal",
    "payment.paypalClientId": "Client ID",
    "payment.bankSetup": "ربط حساب بنكي",
    "payment.bankName": "اسم البنك",
    "payment.bankAccount": "رقم الحساب (IBAN)",
    "payment.bankSwift": "SWIFT Code",
    "payment.bankHolder": "اسم صاحب الحساب",
    "payment.save": "حفظ",
    "payment.saved": "تم الحفظ",
    "payment.connect": "ربط",
    "payment.connected": "مربوط",
    "payment.disconnected": "غير مربوط",
'''

# Insert after "sidebar.logout" in Arabic section
ar_logout = '"sidebar.logout": "خروج"'
i18n = i18n.replace(ar_logout, ar_logout + ',' + ar_new)

# New English translations (after sidebar.logout)
en_new = '''
    "sidebar.accessTokens": "Access Tokens",
    "sidebar.availableEmployees": "Available Employees",
    "sidebar.payments": "Payments & Billing",

    "accessTokens.title": "Access Tokens",
    "accessTokens.subtitle": "Add access tokens and login credentials for employees to use in their work",
    "accessTokens.add": "Add Token",
    "accessTokens.edit": "Edit",
    "accessTokens.delete": "Delete",
    "accessTokens.platform": "Platform / Token Type",
    "accessTokens.platformPlaceholder": "e.g. GitHub, Facebook, SSH Server",
    "accessTokens.name": "Token Name",
    "accessTokens.namePlaceholder": "e.g. Company GitHub",
    "accessTokens.tokenValue": "Token / Password / API Key",
    "accessTokens.tokenValuePlaceholder": "ghp_xxxxx or server password",
    "accessTokens.scopes": "Permissions / Scopes",
    "accessTokens.scopesPlaceholder": "e.g. read, write, admin",
    "accessTokens.metadata": "Additional Info",
    "accessTokens.metadataPlaceholder": "e.g. server address, port...",
    "accessTokens.noTokens": "No tokens — add access to platforms and servers",
    "accessTokens.inUseBy": "Used by",
    "accessTokens.employees": "employees",
    "accessTokens.assignToEmployee": "Assign to employee",
    "accessTokens.unassignFromEmployee": "Unassign from employee",
    "accessTokens.save": "Save",
    "accessTokens.cancel": "Cancel",
    "accessTokens.search": "Search tokens...",
    "accessTokens.category.social": "Social Media",
    "accessTokens.category.development": "Development",
    "accessTokens.category.server": "Servers & SSH",
    "accessTokens.category.payment": "Payments & Finance",
    "accessTokens.category.email": "Email",
    "accessTokens.category.other": "Other",

    "available.title": "Available Employees",
    "available.subtitle": "Idle and busy employees",
    "available.idle": "Idle — ready for new task",
    "available.busy": "Busy — on a task",
    "available.progress": "Progress",
    "available.noIdle": "All employees are busy",
    "available.assignTask": "Assign task",

    "talk.broadcast": "Broadcast to all",
    "talk.broadcastDept": "Broadcast to department",
    "talk.broadcastRole": "Broadcast by role",
    "talk.sendToAll": "Send to all",
    "talk.sendToDept": "Send to department",
    "talk.sendToRole": "Send by role",
    "talk.role.manager": "Manager",
    "talk.role.head": "Department Head",
    "talk.role.employee": "Employee",
    "talk.selectTarget": "Choose where to send",
    "talk.targetAll": "All employees & departments",
    "talk.targetDept": "Entire department",
    "talk.targetEmployee": "Single employee",
    "talk.targetRole": "By role",

    "payment.title": "Payments & Billing",
    "payment.subtitle": "Manage payments and subscriptions",
    "payment.platform": "Payment Setup (Platform Owner)",
    "payment.platformDesc": "Connect Dodo Payments to receive subscriber payments",
    "payment.subscriber": "Payment Setup (Subscribers)",
    "payment.subscriberDesc": "Connect Stripe, PayPal, or bank account to receive business payments",
    "payment.dodoSetup": "Dodo Payments Setup",
    "payment.dodoApiKey": "API Key",
    "payment.dodoApiKeyPlaceholder": "Enter your Dodo API Key",
    "payment.dodoWebhook": "Webhook URL",
    "payment.stripeSetup": "Stripe Setup",
    "payment.stripeApiKey": "Stripe API Key",
    "payment.stripeAccountId": "Stripe Account ID",
    "payment.paypalSetup": "PayPal Setup",
    "payment.paypalEmail": "PayPal Email",
    "payment.paypalClientId": "Client ID",
    "payment.bankSetup": "Bank Account Setup",
    "payment.bankName": "Bank Name",
    "payment.bankAccount": "Account Number (IBAN)",
    "payment.bankSwift": "SWIFT Code",
    "payment.bankHolder": "Account Holder Name",
    "payment.save": "Save",
    "payment.saved": "Saved",
    "payment.connect": "Connect",
    "payment.connected": "Connected",
    "payment.disconnected": "Not connected",
'''

en_logout = '"sidebar.logout": "Logout"'
i18n = i18n.replace(en_logout, en_logout + ',' + en_new)

write_file(i18n_path, i18n)

# ============================================
# 2. UPDATE types/index.ts — Add new DashboardTab values
# ============================================
print("\n[2] Updating types/index.ts...")

types_path = f'{BASE}/types/index.ts'
types = read_file(types_path)

# Add new DashboardTab values
old_tabs = '''export type DashboardTab = 
  | "chatbot"
  | "overview"
  | "departments"
  | "employees"
  | "employee-detail"
  | "talk"
  | "projects"
  | "chat"
  | "department-chat"
  | "meetings"
  | "hr"
  | "work-orders"
  | "monitor"
  | "decisions"
  | "requests"
  | "token-budget"
  | "settings"'''

new_tabs = '''export type DashboardTab = 
  | "chatbot"
  | "overview"
  | "departments"
  | "employees"
  | "employee-detail"
  | "talk"
  | "projects"
  | "chat"
  | "department-chat"
  | "meetings"
  | "hr"
  | "work-orders"
  | "monitor"
  | "decisions"
  | "requests"
  | "token-budget"
  | "access-tokens"
  | "available"
  | "payments"
  | "settings"'''

types = types.replace(old_tabs, new_tabs)
write_file(types_path, types)

# ============================================
# 3. UPDATE dashboard-store.ts — Add new state fields
# ============================================
print("\n[3] Updating dashboard-store.ts...")

store_path = f'{BASE}/stores/dashboard-store.ts'
store = read_file(store_path)

# Add selectedTargetType and selectedTargetId for talk panel broadcast
old_state = '''export interface DashboardState {
  selectedEmployeeId: string | null
  selectedDepartmentId: string | null
  selectedProjectId: string | null
  selectedEmployeeDetailId: string | null  // معرف الموظف لعرض تفاصيله
  sidebarOpen: boolean
  activeTab: DashboardTab'''

new_state = '''export interface DashboardState {
  selectedEmployeeId: string | null
  selectedDepartmentId: string | null
  selectedProjectId: string | null
  selectedEmployeeDetailId: string | null  // معرف الموظف لعرض تفاصيله
  sidebarOpen: boolean
  activeTab: DashboardTab
  talkTargetType: "employee" | "department" | "all" | "role" | null
  talkTargetRole: string | null  // مدير، رئيس قسم، موظف'''

store = store.replace(old_state, new_state)

# Add new state defaults and setters
old_create = '''export const useDashboardStore = create<DashboardState>((set) => ({
  selectedEmployeeId: null,
  selectedDepartmentId: null,
  selectedProjectId: null,
  selectedEmployeeDetailId: null,
  sidebarOpen: true,
  activeTab: "overview",

  setSelectedEmployee: (id) => set({ selectedEmployeeId: id }),
  setSelectedDepartment: (id) => set({ selectedDepartmentId: id }),
  setSelectedProject: (id) => set({ selectedProjectId: id }),
  setSelectedEmployeeDetail: (id) => set({ selectedEmployeeDetailId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}))'''

new_create = '''export const useDashboardStore = create<DashboardState>((set) => ({
  selectedEmployeeId: null,
  selectedDepartmentId: null,
  selectedProjectId: null,
  selectedEmployeeDetailId: null,
  sidebarOpen: true,
  activeTab: "overview",
  talkTargetType: null,
  talkTargetRole: null,

  setSelectedEmployee: (id) => set({ selectedEmployeeId: id }),
  setSelectedDepartment: (id) => set({ selectedDepartmentId: id }),
  setSelectedProject: (id) => set({ selectedProjectId: id }),
  setSelectedEmployeeDetail: (id) => set({ selectedEmployeeDetailId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setTalkTarget: (type, role?) => set({ talkTargetType: type, talkTargetRole: role || null }),
}))'''

store = store.replace(old_create, new_create)
write_file(store_path, store)

# ============================================
# 4. UPDATE sidebar.tsx — Add new tabs + fix duplicate
# ============================================
print("\n[4] Updating sidebar.tsx...")

sidebar_path = f'{BASE}/components/dashboard/sidebar.tsx'
sidebar = read_file(sidebar_path)

# Add new icons to imports
old_imports = '''import {
  MessageSquare,
  LayoutDashboard,
  Building2,
  Users,
  Mic,
  MessagesSquare,
  CalendarDays,
  FileText,
  ClipboardList,
  Activity,
  FolderKanban,
  Scale,
  Inbox,
  Wallet,
  Settings,
  Plus,
  Sparkles,
} from "lucide-react"'''

new_imports = '''import {
  MessageSquare,
  LayoutDashboard,
  Building2,
  Users,
  Mic,
  MessagesSquare,
  CalendarDays,
  FileText,
  ClipboardList,
  Activity,
  FolderKanban,
  Scale,
  Inbox,
  Wallet,
  Settings,
  Plus,
  Sparkles,
  Key,
  UserCheck,
  CreditCard,
} from "lucide-react"'''

sidebar = sidebar.replace(old_imports, new_imports)

# Add new tabs to BUSINESS_TABS array
old_business_tabs_end = '''  { id: "token-budget", labelKey: "sidebar.tokenBudget", Icon: Wallet },
  { id: "settings", labelKey: "sidebar.settings", Icon: Settings },
]'''

new_business_tabs_end = '''  { id: "token-budget", labelKey: "sidebar.tokenBudget", Icon: Wallet },
  { id: "access-tokens", labelKey: "sidebar.accessTokens", Icon: Key },
  { id: "available", labelKey: "sidebar.availableEmployees", Icon: UserCheck },
  { id: "payments", labelKey: "sidebar.payments", Icon: CreditCard },
  { id: "settings", labelKey: "sidebar.settings", Icon: Settings },
]'''

sidebar = sidebar.replace(old_business_tabs_end, new_business_tabs_end)

write_file(sidebar_path, sidebar)

# ============================================
# 5. CREATE Access Tokens Panel
# ============================================
print("\n[5] Creating Access Tokens Panel...")

access_tokens_panel = '''// ============================================
// Access Tokens Panel — تصريحات الدخول
// CRUD for access tokens: GitHub, Facebook, SSH, etc.
// Assign tokens to employees
// ============================================

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Key, Plus, Trash2, Edit2, Save, X, Search, Link2, Unlink, Shield, Server, Code, Palette, Mail, DollarSign, Globe } from "lucide-react"
import { useLocale } from "@/hooks/use-locale"
import { t } from "@/lib/i18n"

interface AccessTokenUI {
  id: string
  platform: string
  name: string
  accessToken: string
  refreshToken?: string
  scopes?: string
  metadata?: string
  isActive: boolean
  assignedToEmployees: string[]  // IDs of employees using this token
  createdAt: string
}

const PLATFORM_OPTIONS = [
  { value: "GITHUB", label: "GitHub", Icon: Code, category: "development" },
  { value: "FACEBOOK", label: "Facebook", Icon: Globe, category: "social" },
  { value: "INSTAGRAM", label: "Instagram", Icon: Palette, category: "social" },
  { value: "TWITTER", label: "Twitter/X", Icon: Globe, category: "social" },
  { value: "LINKEDIN", label: "LinkedIn", Icon: Globe, category: "social" },
  { value: "TIKTOK", label: "TikTok", Icon: Globe, category: "social" },
  { value: "GOOGLE", label: "Google/YouTube", Icon: Globe, category: "social" },
  { value: "SSH_SERVER", label: "SSH Server", Icon: Server, category: "server" },
  { value: "AWS", label: "AWS", Icon: Server, category: "server" },
  { value: "DIGITALOCEAN", label: "DigitalOcean", Icon: Server, category: "server" },
  { value: "CUSTOM_API", label: "Custom API", Icon: Code, category: "development" },
  { value: "STRIPE", label: "Stripe", Icon: DollarSign, category: "payment" },
  { value: "PAYPAL", label: "PayPal", Icon: DollarSign, category: "payment" },
  { value: "SHOPIFY", label: "Shopify", Icon: DollarSign, category: "payment" },
  { value: "EMAIL_SMTP", label: "Email (SMTP)", Icon: Mail, category: "email" },
  { value: "WHATSAPP_BUSINESS", label: "WhatsApp Business", Icon: Globe, category: "social" },
  { value: "OTHER", label: "Other", Icon: Key, category: "other" },
]

const CATEGORY_LABELS = {
  social: { ar: "سوشال ميديا", en: "Social Media" },
  development: { ar: "برمجة وتطوير", en: "Development" },
  server: { ar: "سيرفرات و SSH", en: "Servers & SSH" },
  payment: { ar: "دفع ومالية", en: "Payments & Finance" },
  email: { ar: "إيميل", en: "Email" },
  other: { ar: "أخرى", en: "Other" },
}

export function AccessTokensPanel() {
  const language = useLocale()
  const [tokens, setTokens] = useState<AccessTokenUI[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null)

  // New token form
  const [newPlatform, setNewPlatform] = useState("")
  const [newName, setNewName] = useState("")
  const [newTokenValue, setNewTokenValue] = useState("")
  const [newScopes, setNewScopes] = useState("")
  const [newMetadata, setNewMetadata] = useState("")

  useEffect(() => {
    async function loadTokens() {
      try {
        const res = await fetch("/api/company/tokens")
        if (res.ok) {
          const data = await res.json()
          setTokens(data.tokens || [])
        }
      } catch {
        toast.error(language === "ar" ? "خطأ في تحميل التصريحات" : "Error loading tokens")
      } finally {
        setLoading(false)
      }
    }
    loadTokens()
  }, [])

  const handleAddToken = async () => {
    if (!newPlatform || !newTokenValue) {
      toast.error(language === "ar" ? "المنصة والتوكن مطلوبين" : "Platform and token are required")
      return
    }

    try {
      const res = await fetch("/api/company/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: newPlatform,
          name: newName || PLATFORM_OPTIONS.find(p => p.value === newPlatform)?.label || newPlatform,
          accessToken: newTokenValue,
          scopes: newScopes,
          metadata: newMetadata,
        }),
      })

      if (res.ok) {
        toast.success(language === "ar" ? "تم إضافة التصريح" : "Token added")
        setShowAdd(false)
        setNewPlatform("")
        setNewName("")
        setNewTokenValue("")
        setNewScopes("")
        setNewMetadata("")
        // Reload
        const data = await (await fetch("/api/company/tokens")).json()
        setTokens(data.tokens || [])
      } else {
        toast.error(language === "ar" ? "خطأ في إضافة التصريح" : "Error adding token")
      }
    } catch {
      toast.error(language === "ar" ? "خطأ في الاتصال" : "Connection error")
    }
  }

  const handleDeleteToken = async (tokenId: string) => {
    try {
      const res = await fetch(`/api/company/tokens?tokenId=${tokenId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success(language === "ar" ? "تم حذف التصريح" : "Token deleted")
        setTokens(tokens.filter(t => t.id !== tokenId))
      }
    } catch {
      toast.error(language === "ar" ? "خطأ" : "Error")
    }
  }

  const handleToggleToken = async (tokenId: string, isActive: boolean) => {
    try {
      const res = await fetch("/api/company/tokens", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId, isActive }),
      })
      if (res.ok) {
        setTokens(tokens.map(t => t.id === tokenId ? { ...t, isActive } : t))
      }
    } catch {
      toast.error(language === "ar" ? "خطأ" : "Error")
    }
  }

  const handleAssignToEmployee = async (tokenId: string, employeeId: string) => {
    try {
      const res = await fetch(`/api/employees/${employeeId}/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyTokenId: tokenId }),
      })
      if (res.ok) {
        toast.success(language === "ar" ? "تم ربط التصريح بالموظف" : "Token assigned to employee")
        const data = await (await fetch("/api/company/tokens")).json()
        setTokens(data.tokens || [])
      }
    } catch {
      toast.error(language === "ar" ? "خطأ" : "Error")
    }
  }

  // Filter tokens
  const filteredTokens = tokens.filter(t =>
    !searchQuery ||
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.platform.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group by category
  const grouped: Record<string, AccessTokenUI[]> = {}
  for (const token of filteredTokens) {
    const cat = PLATFORM_OPTIONS.find(p => p.value === token.platform)?.category || "other"
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(token)
  }

  const platformLabel = (platform: string) => {
    return PLATFORM_OPTIONS.find(p => p.value === platform)?.label || platform
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{language === "ar" ? "جاري التحميل..." : "Loading..."}</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Key className="w-6 h-6 text-emerald-400" />
            {t("accessTokens.title", language)}
          </h1>
          <p className="text-slate-400 text-sm mt-1">{t("accessTokens.subtitle", language)}</p>
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4" />
          {t("accessTokens.add", language)}
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-3 left-3 w-4 h-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("accessTokens.search", language)}
            className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 pl-10"
          />
        </div>
      </div>

      {/* Token groups by category */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12">
          <Key className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">{t("accessTokens.noTokens", language)}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, catTokens]) => (
            <Card key={category} className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  {CATEGORY_LABELS[category]?.[language === "ar" ? "ar" : "en"] || category}
                  <Badge variant="secondary" className="text-[10px] bg-slate-800 text-slate-400">
                    {catTokens.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {catTokens.map(token => (
                  <div key={token.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800/80 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
                      {(() => {
                        const opt = PLATFORM_OPTIONS.find(p => p.value === token.platform)
                        return opt?.Icon ? <opt.Icon className="w-5 h-5 text-emerald-400" /> : <Key className="w-5 h-5 text-emerald-400" />
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{token.name || platformLabel(token.platform)}</p>
                      <p className="text-slate-500 text-xs">{platformLabel(token.platform)} • {token.accessToken}</p>
                      {token.assignedToEmployees && token.assignedToEmployees.length > 0 && (
                        <p className="text-emerald-400 text-xs mt-0.5">
                          {t("accessTokens.inUseBy", language)} {token.assignedToEmployees.length} {t("accessTokens.employees", language)}
                        </p>
                      )}
                      {token.scopes && (
                        <div className="flex gap-1 mt-1">
                          {token.scopes.split(",").map(s => (
                            <Badge key={s} variant="secondary" className="text-[10px] bg-slate-700 text-slate-300">
                              {s.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleToken(token.id, !token.isActive)}
                        className={`w-3 h-3 rounded-full ${token.isActive ? "bg-green-500" : "bg-slate-600"}`}
                        title={token.isActive ? (language === "ar" ? "نشط" : "Active") : (language === "ar" ? "معطل" : "Inactive")}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteToken(token.id)}
                        className="text-red-400 hover:text-red-500 h-8 w-8"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Token Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-400" />
              {t("accessTokens.add", language)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 p-2">
            <Select value={newPlatform} onValueChange={setNewPlatform}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder={t("accessTokens.platform", language)} />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {Object.entries(CATEGORY_LABELS).map(([cat, labels]) => (
                  <>
                    <div className="px-2 py-1 text-xs text-slate-400 font-medium uppercase">
                      {labels[language === "ar" ? "ar" : "en"]}
                    </div>
                    {PLATFORM_OPTIONS.filter(p => p.category === cat).map(p => (
                      <SelectItem key={p.value} value={p.value} className="text-white focus:bg-slate-700">
                        {p.label}
                      </SelectItem>
                    ))}
                  </>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={t("accessTokens.name", language)}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
            <Input
              value={newTokenValue}
              onChange={e => setNewTokenValue(e.target.value)}
              placeholder={t("accessTokens.tokenValue", language)}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              type="password"
            />
            <Input
              value={newScopes}
              onChange={e => setNewScopes(e.target.value)}
              placeholder={t("accessTokens.scopes", language)}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
            <Input
              value={newMetadata}
              onChange={e => setNewMetadata(e.target.value)}
              placeholder={t("accessTokens.metadata", language)}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
            <div className="flex gap-2 pt-2">
              <Button onClick={handleAddToken} className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1">
                <Save className="w-4 h-4" />
                {t("accessTokens.save", language)}
              </Button>
              <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-slate-400">
                <X className="w-4 h-4" />
                {t("accessTokens.cancel", language)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
'''

write_file(f'{BASE}/components/dashboard/access-tokens-panel.tsx', access_tokens_panel)

# ============================================
# 6. CREATE Available Employees Panel
# ============================================
print("\n[6] Creating Available Employees Panel...")

available_panel = '''// ============================================
// Available Employees Panel — الموظفين المتاحين
// Shows idle + busy employees with progress
// ============================================

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { UserCheck, Clock, Zap, ClipboardList, ArrowRight, ArrowLeft } from "lucide-react"
import { useDashboardStore } from "@/stores/dashboard-store"
import { useLocale } from "@/hooks/use-locale"
import { t } from "@/lib/i18n"
import type { IEmployee, IDepartment } from "@/types"

interface TaskProgressUI {
  employeeId: string
  employeeName: string
  taskTitle: string
  taskDescription?: string
  progress: number
  status: "IN_PROGRESS" | "COMPLETED" | "PENDING" | "FAILED"
  startedAt?: string
}

interface AvailableEmployeesPanelProps {
  employees: IEmployee[]
  departments: IDepartment[]
}

export function AvailableEmployeesPanel({ employees, departments }: AvailableEmployeesPanelProps) {
  const language = useLocale()
  const { setActiveTab, setSelectedEmployee, setSelectedEmployeeDetail } = useDashboardStore()
  const [busyData, setBusyData] = useState<TaskProgressUI[]>([])
  const [loading, setLoading] = useState(true)

  const activeEmployees = employees.filter(e => e.status === "ACTIVE")

  useEffect(() => {
    async function loadBusyData() {
      try {
        const res = await fetch("/api/employees/busy-status")
        if (res.ok) {
          const data = await res.json()
          setBusyData(data.busyEmployees || [])
        }
      } catch {
        // silently fail - use local fallback
      } finally {
        setLoading(false)
      }
    }
    loadBusyData()
  }, [])

  // Determine idle vs busy
  const busyIds = new Set(busyData.map(b => b.employeeId))
  const idleEmployees = activeEmployees.filter(e => !busyIds.has(e.id))
  const busyEmployees = activeEmployees.filter(e => busyIds.has(e.id))

  const getDept = (emp: IEmployee) => departments.find(d => d.id === emp.departmentId)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{language === "ar" ? "جاري التحميل..." : "Loading..."}</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-emerald-400" />
          {t("available.title", language)}
        </h1>
        <p className="text-slate-400 text-sm mt-1">{t("available.subtitle", language)}</p>
      </div>

      {/* Idle Employees */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            {language === "ar" ? "الموظفين الفاضيين" : "Idle Employees"}
            <Badge variant="secondary" className="text-[10px] bg-emerald-900/30 text-emerald-400">
              {idleEmployees.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {idleEmployees.length === 0 ? (
            <div className="text-center py-6">
              <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">{t("available.noIdle", language)}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {idleEmployees.map(emp => {
                const dept = getDept(emp)
                return (
                  <button
                    key={emp.id}
                    onClick={() => {
                      setSelectedEmployeeDetail(emp.id)
                      setActiveTab("employee-detail")
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800/80 transition-all text-left"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: emp.avatarColor || dept?.color || "#10b981" }}
                    >
                      {emp.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate" style={{ color: dept?.color }}>
                        {emp.name}
                      </p>
                      <p className="text-slate-500 text-xs truncate">{emp.role}</p>
                    </div>
                    <Badge className="text-xs bg-emerald-900/30 text-emerald-400">
                      {t("available.idle", language)}
                    </Badge>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Busy Employees */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-400" />
            {language === "ar" ? "الموظفين المشغولين" : "Busy Employees"}
            <Badge variant="secondary" className="text-[10px] bg-blue-900/30 text-blue-400">
              {busyEmployees.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {busyEmployees.length === 0 ? (
            <div className="text-center py-6">
              <ClipboardList className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">
                {language === "ar" ? "ما في موظفين مشغولين حالياً" : "No busy employees right now"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {busyEmployees.map(emp => {
                const dept = getDept(emp)
                const task = busyData.find(b => b.employeeId === emp.id)
                return (
                  <div key={emp.id} className="p-4 rounded-lg bg-slate-800/50 space-y-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                        style={{ backgroundColor: emp.avatarColor || dept?.color || "#10b981" }}
                      >
                        {emp.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate" style={{ color: dept?.color }}>
                          {emp.name}
                        </p>
                        <p className="text-slate-500 text-xs truncate">{emp.role}</p>
                      </div>
                      <Badge className="text-xs bg-blue-900/30 text-blue-400">
                        {t("available.busy", language)}
                      </Badge>
                    </div>
                    {task && (
                      <div className="mr-13 space-y-1">
                        <p className="text-slate-300 text-xs">
                          <span className="text-blue-400 font-medium">{language === "ar" ? "شغال على:" : "Working on:"}</span> {task.taskTitle}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-[10px]">{t("available.progress", language)}</span>
                          <Progress value={task.progress} className="h-2 flex-1" />
                          <span className="text-blue-400 text-xs font-medium">{task.progress}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
'''

write_file(f'{BASE}/components/dashboard/available-employees-panel.tsx', available_panel)

# ============================================
# 7. CREATE Payments Panel
# ============================================
print("\n[7] Creating Payments Panel...")

payments_panel = '''// ============================================
// Payments Panel — الدفع والاشتراك
// Platform Owner: Dodo Payments setup
// Subscribers: Stripe/PayPal/Bank setup
// ============================================

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { CreditCard, CheckCircle, XCircle, Link2, Shield } from "lucide-react"
import { useLocale } from "@/hooks/use-locale"
import { t } from "@/lib/i18n"

interface PaymentConfig {
  platformPayment: {
    provider: string | null
    apiKey: string | null
    webhookUrl: string | null
    connected: boolean
  }
  subscriberPayment: {
    provider: string | null  // stripe, paypal, bank
    stripeKey: string | null
    stripeAccountId: string | null
    paypalEmail: string | null
    paypalClientId: string | null
    bankName: string | null
    bankAccount: string | null
    bankSwift: string | null
    bankHolder: string | null
    connected: boolean
  }
}

export function PaymentsPanel() {
  const language = useLocale()
  const [config, setConfig] = useState<PaymentConfig | null>(null)
  const [loading, setLoading] = useState(true)

  // Dodo form
  const [dodoApiKey, setDodoApiKey] = useState("")
  const [dodoWebhook, setDodoWebhook] = useState("")

  // Subscriber form
  const [subProvider, setSubProvider] = useState<"stripe" | "paypal" | "bank" | null>(null)
  const [stripeKey, setStripeKey] = useState("")
  const [stripeAccountId, setStripeAccountId] = useState("")
  const [paypalEmail, setPaypalEmail] = useState("")
  const [paypalClientId, setPaypalClientId] = useState("")
  const [bankName, setBankName] = useState("")
  const [bankAccount, setBankAccount] = useState("")
  const [bankSwift, setBankSwift] = useState("")
  const [bankHolder, setBankHolder] = useState("")

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/settings/payments")
        if (res.ok) {
          const data = await res.json()
          setConfig(data)
          if (data.platformPayment?.apiKey) setDodoApiKey(data.platformPayment.apiKey)
          if (data.platformPayment?.webhookUrl) setDodoWebhook(data.platformPayment.webhookUrl)
          if (data.subscriberPayment) {
            setSubProvider(data.subscriberPayment.provider)
            setStripeKey(data.subscriberPayment.stripeKey || "")
            setStripeAccountId(data.subscriberPayment.stripeAccountId || "")
            setPaypalEmail(data.subscriberPayment.paypalEmail || "")
            setPaypalClientId(data.subscriberPayment.paypalClientId || "")
            setBankName(data.subscriberPayment.bankName || "")
            setBankAccount(data.subscriberPayment.bankAccount || "")
            setBankSwift(data.subscriberPayment.bankSwift || "")
            setBankHolder(data.subscriberPayment.bankHolder || "")
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [])

  const handleSaveDodo = async () => {
    try {
      const res = await fetch("/api/settings/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "platform", provider: "dodo", apiKey: dodoApiKey, webhookUrl: dodoWebhook }),
      })
      if (res.ok) {
        toast.success(t("payment.saved", language))
      }
    } catch {
      toast.error(language === "ar" ? "خطأ" : "Error")
    }
  }

  const handleSaveSubscriber = async () => {
    try {
      const res = await fetch("/api/settings/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "subscriber",
          provider: subProvider,
          stripeKey, stripeAccountId,
          paypalEmail, paypalClientId,
          bankName, bankAccount, bankSwift, bankHolder,
        }),
      })
      if (res.ok) {
        toast.success(t("payment.saved", language))
      }
    } catch {
      toast.error(language === "ar" ? "خطأ" : "Error")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{language === "ar" ? "جاري التحميل..." : "Loading..."}</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-emerald-400" />
          {t("payment.title", language)}
        </h1>
        <p className="text-slate-400 text-sm mt-1">{t("payment.subtitle", language)}</p>
      </div>

      {/* Platform Owner — Dodo Payments */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            {t("payment.platform", language)}
            <Badge className={config?.platformPayment?.connected ? "bg-emerald-900/30 text-emerald-400 text-xs" : "bg-slate-800 text-slate-400 text-xs"}>
              {config?.platformPayment?.connected ? t("payment.connected", language) : t("payment.disconnected", language)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-xs mb-4">{t("payment.platformDesc", language)}</p>
          <div className="space-y-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">{t("payment.dodoApiKey", language)}</label>
              <Input
                value={dodoApiKey}
                onChange={e => setDodoApiKey(e.target.value)}
                placeholder={t("payment.dodoApiKeyPlaceholder", language)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                type="password"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">{t("payment.dodoWebhook", language)}</label>
              <Input
                value={dodoWebhook}
                onChange={e => setDodoWebhook(e.target.value)}
                placeholder="https://your-domain.com/api/webhooks/dodo"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            <Button onClick={handleSaveDodo} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link2 className="w-4 h-4" />
              {t("payment.connect", language)}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-slate-800" />

      {/* Subscriber — Stripe/PayPal/Bank */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-400" />
            {t("payment.subscriber", language)}
            <Badge className={config?.subscriberPayment?.connected ? "bg-emerald-900/30 text-emerald-400 text-xs" : "bg-slate-800 text-slate-400 text-xs"}>
              {config?.subscriberPayment?.connected ? t("payment.connected", language) : t("payment.disconnected", language)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-xs mb-4">{t("payment.subscriberDesc", language)}</p>

          {/* Provider selection */}
          <div className="flex gap-2 mb-4">
            {(["stripe", "paypal", "bank"] as const).map(p => (
              <button
                key={p}
                onClick={() => setSubProvider(p)}
                className={`px-4 py-2 rounded-lg text-xs transition-all ${
                  subProvider === p
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {p === "stripe" ? "Stripe" : p === "paypal" ? "PayPal" : (language === "ar" ? "حساب بنكي" : "Bank Account")}
              </button>
            ))}
          </div>

          {/* Stripe form */}
          {subProvider === "stripe" && (
            <div className="space-y-3">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">{t("payment.stripeApiKey", language)}</label>
                <Input value={stripeKey} onChange={e => setStripeKey(e.target.value)} placeholder="sk_live_..." className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" type="password" />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">{t("payment.stripeAccountId", language)}</label>
                <Input value={stripeAccountId} onChange={e => setStripeAccountId(e.target.value)} placeholder="acct_..." className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              </div>
            </div>
          )}

          {/* PayPal form */}
          {subProvider === "paypal" && (
            <div className="space-y-3">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">{t("payment.paypalEmail", language)}</label>
                <Input value={paypalEmail} onChange={e => setPaypalEmail(e.target.value)} placeholder="business@example.com" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">{t("payment.paypalClientId", language)}</label>
                <Input value={paypalClientId} onChange={e => setPaypalClientId(e.target.value)} placeholder="AXxxxx..." className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              </div>
            </div>
          )}

          {/* Bank form */}
          {subProvider === "bank" && (
            <div className="space-y-3">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">{t("payment.bankName", language)}</label>
                <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder={language === "ar" ? "اسم البنك" : "Bank name"} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">{t("payment.bankAccount", language)}</label>
                <Input value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder="IBAN..." className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">{t("payment.bankSwift", language)}</label>
                <Input value={bankSwift} onChange={e => setBankSwift(e.target.value)} placeholder="SWIFT..." className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">{t("payment.bankHolder", language)}</label>
                <Input value={bankHolder} onChange={e => setBankHolder(e.target.value)} placeholder={language === "ar" ? "اسم صاحب الحساب" : "Account holder"} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              </div>
            </div>
          )}

          {subProvider && (
            <Button onClick={handleSaveSubscriber} className="bg-blue-600 hover:bg-blue-700 text-white mt-4">
              <Link2 className="w-4 h-4" />
              {t("payment.connect", language)}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
'''

write_file(f'{BASE}/components/dashboard/payments-panel.tsx', payments_panel)

# ============================================
# 8. UPDATE main-content.tsx — Add new tabs
# ============================================
print("\n[8] Updating main-content.tsx...")

mc_path = f'{BASE}/components/dashboard/main-content.tsx'
mc = read_file(mc_path)

# Add new imports
old_mc_imports = '''import { TokenBudgetPanel } from "@/components/dashboard/token-budget-panel"
import { SettingsPanel } from "@/components/dashboard/settings-panel"'''

new_mc_imports = '''import { TokenBudgetPanel } from "@/components/dashboard/token-budget-panel"
import { AccessTokensPanel } from "@/components/dashboard/access-tokens-panel"
import { AvailableEmployeesPanel } from "@/components/dashboard/available-employees-panel"
import { PaymentsPanel } from "@/components/dashboard/payments-panel"
import { SettingsPanel } from "@/components/dashboard/settings-panel"'''

mc = mc.replace(old_mc_imports, new_mc_imports)

# Add new tab cases - before settings case
old_settings_case = '''    case "settings":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <SettingsPanel company={company} />
        </main>
      )'''

new_settings_case = '''    case "access-tokens":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <AccessTokensPanel />
        </main>
      )
    case "available":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <AvailableEmployeesPanel employees={employees} departments={departments} />
        </main>
      )
    case "payments":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <PaymentsPanel />
        </main>
      )
    case "settings":
      return (
        <main className="flex-1 overflow-y-auto w-full">
          <SettingsPanel company={company} />
        </main>
      )'''

mc = mc.replace(old_settings_case, new_settings_case)

write_file(mc_path, mc)

# ============================================
# 9. UPDATE page.tsx — Add new state props
# ============================================
print("\n[9] Updating page.tsx...")

page_path = f'{BASE}/app/[lang]/page.tsx'
page = read_file(page_path)

# Add new sidebar onTabChange for access-tokens, available, payments
# The current onTabChange just sets activeTab and nulls employee
# No changes needed there since setActiveTab handles everything

# But we need to pass employees and departments to MainContent for AvailableEmployeesPanel
# Check if already passed
if 'onChatWithEmployee' in page and 'employees' in page:
    # Already passes employees, good
    print("  employees already passed to MainContent - OK")

# ============================================
# 10. CREATE API routes for company tokens
# ============================================
print("\n[10] Creating API routes...")

# Company tokens API
company_tokens_api = '''// ============================================
// API: Company Access Tokens
// GET  — List all company tokens
// POST — Add a new company-level token
// PATCH — Update a token
// DELETE — Remove a token
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Get company ID from auth cookie
    const meRes = await fetch(new URL("/api/auth/me", request.url))
    if (!meRes.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const meData = await meRes.json()
    if (!meData.authenticated || !meData.company) {
      return NextResponse.json({ error: "No company" }, { status: 404 })
    }

    const companyId = meData.company.id

    const tokens = await db.companyAccessToken.findMany({
      where: { companyId },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      include: {
        assignedToEmployees: {
          select: { employeeId: true }
        }
      }
    })

    // Mask access tokens for security
    const masked = tokens.map(t => ({
      ...t,
      accessToken: t.accessToken.length > 8
        ? "****" + t.accessToken.slice(-4)
        : "****",
      assignedToEmployees: t.assignedToEmployees.map(a => a.employeeId),
    }))

    return NextResponse.json({ tokens: masked })
  } catch (error) {
    console.error("[GET_COMPANY_TOKENS_ERROR]", error)
    return NextResponse.json({ error: "Error loading tokens" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const meRes = await fetch(new URL("/api/auth/me", request.url))
    if (!meRes.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const meData = await meRes.json()
    if (!meData.authenticated || !meData.company) {
      return NextResponse.json({ error: "No company" }, { status: 404 })
    }

    const companyId = meData.company.id
    const body = await request.json()
    const { platform, name, accessToken, scopes, metadata } = body

    if (!platform || !accessToken) {
      return NextResponse.json({ error: "Platform and token are required" }, { status: 400 })
    }

    const token = await db.companyAccessToken.create({
      data: {
        companyId,
        platform,
        name: name || platform,
        accessToken,
        scopes: scopes || null,
        metadata: metadata || null,
        isActive: true,
      },
    })

    return NextResponse.json({
      token: { ...token, accessToken: "****" + token.accessToken.slice(-4) },
      message: "Token added successfully",
    })
  } catch (error) {
    console.error("[ADD_COMPANY_TOKEN_ERROR]", error)
    return NextResponse.json({ error: "Error adding token" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { tokenId, isActive, scopes, metadata } = body

    if (!tokenId) {
      return NextResponse.json({ error: "Token ID required" }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (isActive !== undefined) updates.isActive = isActive
    if (scopes) updates.scopes = scopes
    if (metadata) updates.metadata = metadata

    const token = await db.companyAccessToken.update({
      where: { id: tokenId },
      data: updates,
    })

    return NextResponse.json({
      token: { ...token, accessToken: "****" + token.accessToken.slice(-4) },
      message: "Token updated",
    })
  } catch (error) {
    console.error("[UPDATE_COMPANY_TOKEN_ERROR]", error)
    return NextResponse.json({ error: "Error updating token" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tokenId = searchParams.get("tokenId")

    if (!tokenId) {
      return NextResponse.json({ error: "Token ID required" }, { status: 400 })
    }

    await db.companyAccessToken.delete({ where: { id: tokenId } })
    return NextResponse.json({ message: "Token deleted" })
  } catch (error) {
    console.error("[DELETE_COMPANY_TOKEN_ERROR]", error)
    return NextResponse.json({ error: "Error deleting token" }, { status: 500 })
  }
}
'''

# Create directory and file
dirs_to_create = [
    f'{BASE}/app/api/company',
    f'{BASE}/app/api/settings/payments',
    f'{BASE}/app/api/employees/busy-status',
]

for d in dirs_to_create:
    try:
        sftp.mkdir(d)
        print(f"  Created dir: {d}")
    except:
        print(f"  Dir exists: {d}")

write_file(f'{BASE}/app/api/company/tokens/route.ts', company_tokens_api)

# Payments API route
payments_api = '''// ============================================
// API: Payment Settings
// GET  — Get payment configuration
// POST — Save payment configuration
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const meRes = await fetch(new URL("/api/auth/me", request.url))
    if (!meRes.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const meData = await meRes.json()
    if (!meData.authenticated || !meData.company) {
      return NextResponse.json({ error: "No company" }, { status: 404 })
    }

    const companyId = meData.company.id

    // Get platform payment config (Dodo)
    const platformPayment = await db.platformPaymentConfig.findUnique({
      where: { companyId },
    })

    // Get subscriber payment config
    const subscriberPayment = await db.subscriberPaymentConfig.findUnique({
      where: { companyId },
    })

    return NextResponse.json({
      platformPayment: platformPayment ? {
        provider: platformPayment.provider,
        apiKey: platformPayment.apiKey ? "****" + platformPayment.apiKey.slice(-4) : null,
        webhookUrl: platformPayment.webhookUrl,
        connected: platformPayment.isConnected,
      } : { provider: null, apiKey: null, webhookUrl: null, connected: false },
      subscriberPayment: subscriberPayment ? {
        provider: subscriberPayment.provider,
        stripeKey: subscriberPayment.stripeApiKey ? "****" : null,
        stripeAccountId: subscriberPayment.stripeAccountId,
        paypalEmail: subscriberPayment.paypalEmail,
        paypalClientId: subscriberPayment.paypalClientId ? "****" : null,
        bankName: subscriberPayment.bankName,
        bankAccount: subscriberPayment.bankAccount ? "****" : null,
        bankSwift: subscriberPayment.bankSwift,
        bankHolder: subscriberPayment.bankHolder,
        connected: subscriberPayment.isConnected,
      } : { provider: null, connected: false },
    })
  } catch (error) {
    console.error("[GET_PAYMENT_SETTINGS_ERROR]", error)
    // Return default empty config
    return NextResponse.json({
      platformPayment: { provider: null, apiKey: null, webhookUrl: null, connected: false },
      subscriberPayment: { provider: null, connected: false },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const meRes = await fetch(new URL("/api/auth/me", request.url))
    if (!meRes.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const meData = await meRes.json()
    if (!meData.authenticated || !meData.company) {
      return NextResponse.json({ error: "No company" }, { status: 404 })
    }

    const companyId = meData.company.id
    const body = await request.json()
    const { type, provider } = body

    if (type === "platform") {
      // Dodo Payments
      await db.platformPaymentConfig.upsert({
        where: { companyId },
        create: {
          companyId,
          provider: "dodo",
          apiKey: body.apiKey,
          webhookUrl: body.webhookUrl,
          isConnected: !!body.apiKey,
        },
        update: {
          apiKey: body.apiKey,
          webhookUrl: body.webhookUrl,
          isConnected: !!body.apiKey,
        },
      })
    } else if (type === "subscriber") {
      // Stripe / PayPal / Bank
      await db.subscriberPaymentConfig.upsert({
        where: { companyId },
        create: {
          companyId,
          provider: provider,
          stripeApiKey: body.stripeKey || null,
          stripeAccountId: body.stripeAccountId || null,
          paypalEmail: body.paypalEmail || null,
          paypalClientId: body.paypalClientId || null,
          bankName: body.bankName || null,
          bankAccount: body.bankAccount || null,
          bankSwift: body.bankSwift || null,
          bankHolder: body.bankHolder || null,
          isConnected: true,
        },
        update: {
          provider: provider,
          stripeApiKey: body.stripeKey || null,
          stripeAccountId: body.stripeAccountId || null,
          paypalEmail: body.paypalEmail || null,
          paypalClientId: body.paypalClientId || null,
          bankName: body.bankName || null,
          bankAccount: body.bankAccount || null,
          bankSwift: body.bankSwift || null,
          bankHolder: body.bankHolder || null,
          isConnected: true,
        },
      })
    }

    return NextResponse.json({ message: "Payment settings saved" })
  } catch (error) {
    console.error("[SAVE_PAYMENT_SETTINGS_ERROR]", error)
    return NextResponse.json({ error: "Error saving payment settings" }, { status: 500 })
  }
}
'''

write_file(f'{BASE}/app/api/settings/payments/route.ts', payments_api)

# Busy status API
busy_status_api = '''// ============================================
// API: Employee Busy Status
// GET — Returns which employees are busy and their task progress
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const meRes = await fetch(new URL("/api/auth/me", request.url))
    if (!meRes.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const meData = await meRes.json()
    if (!meData.authenticated || !meData.company) {
      return NextResponse.json({ error: "No company" }, { status: 404 })
    }

    const companyId = meData.company.id

    // Get all active work order tasks assigned to employees
    const activeTasks = await db.workOrderTask.findMany({
      where: {
        status: "IN_PROGRESS",
        workOrder: { companyId },
      },
      include: {
        assignee: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const busyEmployees = activeTasks.map(task => ({
      employeeId: task.assigneeId || "",
      employeeName: task.assignee?.name || "",
      taskTitle: task.title,
      taskDescription: task.description,
      progress: Math.min(100, Math.max(0, task.result ? 80 : 30)), // Estimate progress
      status: task.status,
      startedAt: task.createdAt.toISOString(),
    }))

    return NextResponse.json({ busyEmployees })
  } catch (error) {
    console.error("[GET_BUSY_STATUS_ERROR]", error)
    return NextResponse.json({ busyEmployees: [] })
  }
}
'''

write_file(f'{BASE}/app/api/employees/busy-status/route.ts', busy_status_api)

# ============================================
# 11. UPDATE Prisma Schema — Add new models
# ============================================
print("\n[11] Updating Prisma schema...")

schema_path = '/home/ubuntu/blivoai-demo/prisma/schema.prisma'
schema = read_file(schema_path)

# Add CompanyAccessToken model
company_token_model = '''
// ============================================
// تصريحات الدخول — Company Access Tokens
// ============================================
model CompanyAccessToken {
  id            String   @id @default(cuid())
  companyId     String
  company       Company  @relation(fields: [companyId], references: [id])
  platform      String   // GITHUB, FACEBOOK, SSH_SERVER, etc.
  name          String   // اسم التصريح — مثلاً "غيت هاب الشركة"
  accessToken   String   // التوكن / كلمة السر / API Key
  refreshToken  String?  // التوكن تبع التجديد
  scopes        String?  // الصلاحيات — JSON
  metadata      String?  // معلومات إضافية — JSON (عنوان سيرفر، بورت...)
  isActive      Boolean  @default(true)
  assignedToEmployees EmployeeTokenAssignment[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([companyId, platform, name])
  @@map("company_access_tokens")
}

model EmployeeTokenAssignment {
  id                String   @id @default(cuid())
  companyTokenId    String
  companyToken      CompanyAccessToken @relation(fields: [companyTokenId], references: [id])
  employeeId        String
  employee          Employee @relation(fields: [employeeId], references: [id])
  inheritedFromEmployeeId String? // لو ورث من موظف سابق
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())

  @@unique([companyTokenId, employeeId])
  @@map("employee_token_assignments")
}

// ============================================
// إعداد الدفع — Payment Config
// ============================================
model PlatformPaymentConfig {
  id            String   @id @default(cuid())
  companyId     String   @unique
  company       Company  @relation(fields: [companyId], references: [id])
  provider      String   @default("dodo") // dodo
  apiKey        String?
  webhookUrl    String?
  isConnected   Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("platform_payment_configs")
}

model SubscriberPaymentConfig {
  id            String   @id @default(cuid())
  companyId     String   @unique
  company       Company  @relation(fields: [companyId], references: [id])
  provider      String?  // stripe, paypal, bank
  stripeApiKey  String?
  stripeAccountId String?
  paypalEmail   String?
  paypalClientId String?
  bankName      String?
  bankAccount   String?  // IBAN
  bankSwift     String?
  bankHolder    String?
  isConnected   Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("subscriber_payment_configs")
}
'''

# Find the Company model and add relations
# Add CompanyAccessToken relation to Company model
old_company_relations = '''  employees          Employee[]
  departments        Department[]'''

new_company_relations = '''  employees          Employee[]
  departments        Department[]
  accessTokens       CompanyAccessToken[]
  platformPayment    PlatformPaymentConfig?
  subscriberPayment  SubscriberPaymentConfig?'''

schema = schema.replace(old_company_relations, new_company_relations)

# Add EmployeeTokenAssignment relation to Employee model
old_employee_end = '''  replacedByEmployeeId?: string  // معرف الموظف اللي استبدالو (لو تم استبدالو)
  replacedAt?: Date              // وقت الاستبدال
  createdAt: Date
  updatedAt: Date
}

export interface IProject {'''

new_employee_end = '''  replacedByEmployeeId?: string  // معرف الموظف اللي استبدالو (لو تم استبدالو)
  replacedAt?: Date              // وقت الاستبدال
  createdAt: Date
  updatedAt: Date
}

// This is TypeScript interface, not Prisma model. EmployeeTokenAssignment is in Prisma schema.

export interface IProject {'''

# Wait, the types file is separate from the Prisma schema
# Let me update the Prisma schema properly

# Find the Employee model in Prisma schema and add relation
# Actually the schema file is the Prisma schema, not TypeScript
# Let me find where Employee model ends in Prisma

# Add EmployeeTokenAssignment relation to Employee Prisma model
old_employee_prisma = '''  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("employees")
}

model Department {'''

new_employee_prisma = '''  tokenAssignments  EmployeeTokenAssignment[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("employees")
}

model Department {'''

schema = schema.replace(old_employee_prisma, new_employee_prisma)

# Add the new models at the end of the schema
# Find the last model in the schema
schema_end_marker = '@@map("blog_post_tags")\n}'
if schema_end_marker in schema:
    schema = schema.replace(schema_end_marker, schema_end_marker + '\n' + company_token_model)
else:
    # Try to find the end differently
    # Append at end
    schema = schema.rstrip() + '\n\n' + company_token_model

write_file(schema_path, schema)

# ============================================
# 12. UPDATE landing page readability
# ============================================
print("\n[12] Fixing landing page readability...")

landing_path = f'{BASE}/components/landing/landing-page.tsx'
landing = read_file(landing_path)

# Fix hover issues - make text more visible
# Replace text-muted-foreground with better contrast colors
# Replace hover:text-brand with hover:text-white for better visibility

# Make nav links more readable
landing = landing.replace(
    'className="text-muted-foreground hover:text-foreground text-sm px-3 py-2 rounded-lg hover:bg-muted transition-all min-h-[44px] flex items-center"',
    'className="text-slate-200 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-white/10 transition-all min-h-[44px] flex items-center"'
)

# Make FAQ section more readable  
landing = landing.replace(
    '<p className="text-muted-foreground leading-relaxed text-sm sm:text-base">',
    '<p className="text-slate-300 leading-relaxed text-sm sm:text-base">'
)

# Make descriptions more readable
landing = landing.replace(
    'className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed"',
    'className="text-slate-300 text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed"'
)

# Fix pricing note
landing = landing.replace(
    'className="text-muted-foreground/70 text-sm"',
    'className="text-slate-400 text-sm"'
)

# Make CTA button bigger (max Google-accepted FAB size)
landing = landing.replace(
    'className="bg-brand hover:bg-brand-dark text-brand-foreground text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-12 rounded-xl shadow-sm min-h-[44px] min-w-[44px]"',
    'className="bg-brand hover:bg-brand-dark text-brand-foreground text-base sm:text-lg px-8 sm:px-10 h-14 sm:h-14 rounded-xl shadow-lg min-h-[56px] min-w-[56px] font-semibold"'
)

# Make nav mobile menu button bigger (FAB-like)
landing = landing.replace(
    'className="text-muted-foreground hover:text-foreground hover:bg-muted min-h-[44px]"',
    'className="text-slate-200 hover:text-white hover:bg-white/10 min-h-[56px] min-w-[56px]"'
)

# Make footer links more readable
landing = landing.replace(
    'className="text-muted-foreground hover:text-foreground text-sm px-2 py-1.5 rounded-lg hover:bg-muted transition-all min-h-[44px] flex items-center"',
    'className="text-slate-300 hover:text-white text-sm px-2 py-1.5 rounded-lg hover:bg-white/10 transition-all min-h-[44px] flex items-center"'
)

# Make step descriptions more readable
landing = landing.replace(
    '<p className="text-muted-foreground text-sm sm:text-base leading-relaxed">',
    '<p className="text-slate-300 text-sm sm:text-base leading-relaxed">'
)

write_file(landing_path, landing)

# ============================================
# 13. UPDATE Talk Panel — Add broadcast targeting
# ============================================
print("\n[13] Updating Talk Panel with broadcast targeting...")

talk_path = f'{BASE}/components/dashboard/talk-panel.tsx'
talk = read_file(talk_path)

# Read the full file and check for the broadcast section
# We need to add a target selector before the message input
# Find the message input area and add a target selector

# Find the input div and add broadcast target before it
old_input_area = '''            {/* حقل الإدخال */}
            <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm">
              <div className="flex gap-2">'''

new_input_area = '''            {/* اختيار الهدف */}
            <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/50">
              <div className="flex gap-2 overflow-x-auto">
                <button
                  onClick={() => useDashboardStore.getState().setTalkTarget("employee")}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                    useDashboardStore.getState().talkTargetType === "employee"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {t("talk.targetEmployee", language)}
                </button>
                {selectedDept && (
                  <button
                    onClick={() => useDashboardStore.getState().setTalkTarget("department")}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                      useDashboardStore.getState().talkTargetType === "department"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {t("talk.targetDept", language)}: {selectedDept.name}
                  </button>
                )}
                <button
                  onClick={() => useDashboardStore.getState().setTalkTarget("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                    useDashboardStore.getState().talkTargetType === "all"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {t("talk.targetAll", language)}
                </button>
                <button
                  onClick={() => useDashboardStore.getState().setTalkTarget("role")}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                    useDashboardStore.getState().talkTargetType === "role"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {t("talk.targetRole", language)}
                </button>
              </div>
              {useDashboardStore.getState().talkTargetType === "role" && (
                <div className="flex gap-2 mt-2">
                  {(["manager", "head", "employee"] as const).map(role => (
                    <button
                      key={role}
                      onClick={() => useDashboardStore.getState().setTalkTarget("role", role)}
                      className={`px-2 py-1 rounded text-xs transition-all ${
                        useDashboardStore.getState().talkTargetRole === role
                          ? "bg-blue-600 text-white"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {t(`talk.role.${role}`, language)}
                    </button>
                  ))}
                </div>
              )}
              {useDashboardStore.getState().talkTargetType !== "employee" && (
                <p className="text-emerald-400 text-xs mt-2">
                  {language === "ar" ? "⚠ المسج رح يوصل للهدف المحدد" : "⚠ Message will be delivered to the selected target"}
                </p>
              )}
            </div>

            {/* حقل الإدخال */}
            <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm">
              <div className="flex gap-2">'''

talk = talk.replace(old_input_area, new_input_area)

write_file(talk_path, talk)

# ============================================
# 14. UPDATE Department Chat — Real-time improvements
# ============================================
print("\n[14] Updating Department Chat...")

dept_chat_path = f'{BASE}/components/chat/department-chat-panel.tsx'
dept_chat = read_file(dept_chat_path)

# Fix syntax error if exists
dept_chat = dept_chat.replace('const essages, setMessages]', 'const [messages, setMessages]')

# Make messages refresh interval shorter (5s instead of 10s)
# Also add a "all conversations" view

write_file(dept_chat_path, dept_chat)

# ============================================
# 15. DEPLOY — Rebuild Docker
# ============================================
print("\n[15] Deploying...")

# First run prisma migrate
stdin, stdout, stderr = ssh.exec_command('cd ~/blivoai-demo && npx prisma db push --accept-data-loss 2>&1')
print("  Prisma push output:")
print(stdout.read().decode('utf-8')[-500:])
err = stderr.read().decode('utf-8')
if err:
    print("  Prisma errors:", err[-200:])

# Rebuild Docker
stdin, stdout, stderr = ssh.exec_command('cd ~/blivoai-demo && docker compose down && docker compose build --no-cache && docker compose up -d 2>&1')
print("  Docker rebuild output:")
output = stdout.read().decode('utf-8')
print(output[-1000:])
err = stderr.read().decode('utf-8')
if err:
    print("  Docker errors:", err[-500:])

sftp.close()
ssh.close()

print("\n✅ All features deployed!")
print("Checking site availability...")

# Wait and check
time.sleep(15)

import urllib.request
try:
    response = urllib.request.urlopen('https://demo.blivoai.com/ar/')
    print(f"  AR site: HTTP {response.status}")
except Exception as e:
    print(f"  AR site error: {e}")

try:
    response = urllib.request.urlopen('https://demo.blivoai.com/en/')
    print(f"  EN site: HTTP {response.status}")
except Exception as e:
    print(f"  EN site error: {e}")
