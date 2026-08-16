"use client"

// ============================================
// BlivoAI Admin Panel — Apple-like Design
// Clean, minimal, calm. CSS variable-based theme.
// 7 functional tabs: Overview, Analytics, Content,
// Models, Companies, Agents, System
// ============================================

import { useState, useEffect, useCallback, use, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useLocale } from "@/hooks/use-locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  Building2, DollarSign, Bot, Cpu, BarChart3, FileText, Settings2,
  Globe, Users, Activity, Loader2, ArrowLeft, Languages, Save, Plus,
  Trash2, Download, RefreshCw, Shield, Monitor, Database, Zap,
  ChevronDown, Search, Code, Link2, Eye, EyeOff, TrendingUp, LayoutGrid,
  Edit3, Copy, Check, CheckCircle2, X, Info, AlertTriangle, LogOut, BookOpen, Star, ScrollText,
  KeyRound, CreditCard, Package
} from "lucide-react"
import { BlogAdminContent } from "./blog/blog-admin-content"
import { SecurityAdmin } from "./security/security-admin-content"
import { PlatformLogs } from "./logs/logs-admin-content"
import { PlansTab } from "./plans/plans-tab"
import Image from "next/image"

// ============================================
// Types
// ============================================

interface LLMModelType {
  id: string
  name: string
  provider: string
  modelId: string
  tier: string
  baseUrl?: string | null
  apiKeyValue?: string | null
  capabilities?: string | null
  priceInput: number
  priceOutput: number
  maxTokens: number
  maxContext: number
  isActive: boolean
  isDefault: boolean
  priority: number
  totalCalls: number
  totalTokensIn: number
  totalTokensOut: number
  totalCost: number
  lastUsedAt?: string | null
  createdAt: string
}

interface CompanyType {
  id: string
  name: string
  industry?: string | null
  dialect: string
  tone: string
  subscription: string
  tokenBudgetMonthly: number
  tokenUsedMonthly: number
  tokenAddOnsPurchased: number
  owner: { id: string; name: string; email: string }
  _count: { employees: number; departments: number; projects: number; workOrders: number }
  createdAt: string
}

interface AgentStatsType {
  total: number
  completed: number
  failed: number
  active: number
  totalTokensIn: number
  totalTokensOut: number
  totalCost: number
  successRate: number
}

interface AgentSessionType {
  id: string
  taskType: string
  taskTitle: string
  status: string
  attempt: number
  maxAttempts: number
  employee: { id: string; name: string; role: string }
  llmModel: { id: string; name: string; provider: string; modelId: string } | null
  totalCost: number
  createdAt: string
}

interface ContentItem {
  itemKey: string
  valueEn: string
  valueAr: string
  icon?: string | null
  isActive: boolean
}

interface HeadTagType {
  id: string
  name: string
  tagType: string
  content: string
  position: string
  isActive: boolean
}

type AdminTab = "overview" | "analytics" | "content" | "blog" | "models" | "plans" | "companies" | "users" | "agents" | "system" | "security" | "logs"

// ============================================
// i18n labels (bilingual)
// ============================================

const LABELS = {
  overview: { en: "Overview", ar: "نظرة عامة" },
  analytics: { en: "Analytics", ar: "التحليلات" },
  content: { en: "Content", ar: "المحتوى" },
  blog: { en: "Blog", ar: "المدونة" },
  models: { en: "Models", ar: "الموديلات" },
  plans: { en: "Plans", ar: "الخطط" },
  companies: { en: "Companies", ar: "الشركات" },
  users: { en: "Users", ar: "المستخدمين" },
  agents: { en: "Agents", ar: "الوكلاء" },
  system: { en: "System", ar: "النظام" },
  security: { en: "Security", ar: "الحماية" },
  logs: { en: "Logs", ar: "السجلات" },
  adminPanel: { en: "Admin Panel", ar: "لوحة التحكم" },
  backToSite: { en: "Back to Site", ar: "العودة للموقع" },
  companiesCount: { en: "Companies", ar: "الشركات" },
  monthlyRevenue: { en: "Monthly Revenue", ar: "الإيرادات الشهرية" },
  activeModels: { en: "Active Models", ar: "الموديلات النشطة" },
  agentsLabel: { en: "Agents", ar: "الوكلاء" },
  subscriptionBreakdown: { en: "Subscription Breakdown", ar: "تفصيل الاشتراكات" },
  agentCost: { en: "Agent Cost", ar: "تكلفة الوكلاء" },
  totalSessions: { en: "Total Sessions", ar: "إجمالي الجلسات" },
  totalCost: { en: "Total Cost", ar: "التكلفة الإجمالية" },
  successRate: { en: "Success Rate", ar: "معدل النجاح" },
  calls: { en: "calls", ar: "استدعاء" },
  fromSubscriptions: { en: "from subscriptions", ar: "من الاشتراكات" },
  employees: { en: "employees", ar: "موظف" },
  freeTrial: { en: "Free Trial", ar: "تجربة مجانية" },
  starter: { en: "Starter", ar: "أساسي" },
  professional: { en: "Professional", ar: "احترافي" },
  enterprise: { en: "Enterprise", ar: "مؤسسي" },
  addModel: { en: "Add Model", ar: "إضافة موديل" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  modelName: { en: "Model Name", ar: "اسم الموديل" },
  provider: { en: "Provider", ar: "المزود" },
  modelId: { en: "Model ID", ar: "معرف الموديل" },
  tier: { en: "Tier", ar: "المستوى" },
  apiUrl: { en: "API URL (optional)", ar: "رابط API (اختياري)" },
  apiKeyField: { en: "API Key (optional)", ar: "API Key (اختياري)" },
  priceInput: { en: "Input Price ($/M tokens)", ar: "سعر الإدخال ($/M tokens)" },
  priceOutput: { en: "Output Price ($/M tokens)", ar: "سعر الإخراج ($/M tokens)" },
  active: { en: "Active", ar: "نشط" },
  default: { en: "Default", ar: "افتراضي" },
  light: { en: "Light (simple tasks)", ar: "خفيف (مهام بسيطة)" },
  medium: { en: "Medium (chat)", ar: "متوسط (محادثات)" },
  heavy: { en: "Heavy (complex)", ar: "ثقيل (معقد)" },
  delete: { en: "Delete", ar: "حذف" },
  noModels: { en: "No models yet. Add your first model.", ar: "لا موديلات. أضف أول موديل." },
  updateSubscription: { en: "Change Plan", ar: "تغيير الخطة" },
  totalVisitors: { en: "Total Visitors", ar: "إجمالي الزوار" },
  today: { en: "Today", ar: "اليوم" },
  thisWeek: { en: "This Week", ar: "هذا الأسبوع" },
  thisMonth: { en: "This Month", ar: "هذا الشهر" },
  uniqueVisitors: { en: "Unique Visitors", ar: "زوار فريدين" },
  returning: { en: "Returning", ar: "عودة" },
  newLabel: { en: "New", ar: "جديد" },
  byLanguage: { en: "By Language", ar: "حسب اللغة" },
  topPages: { en: "Top Pages", ar: "أكثر الصفحات زيارة" },
  topReferrers: { en: "Top Referrers", ar: "أكثر المراجعين" },
  seoStatus: { en: "SEO Status", ar: "حالة SEO" },
  headTags: { en: "Head Tags", ar: "علامات الرأس" },
  footerTags: { en: "Footer Tags", ar: "علامات الذيل" },
  addTag: { en: "Add Tag", ar: "إضافة علامة" },
  tagName: { en: "Tag Name", ar: "اسم العلامة" },
  tagType: { en: "Tag Type", ar: "نوع العلامة" },
  tagContent: { en: "Tag Content (HTML)", ar: "محتوى العلامة (HTML)" },
  position: { en: "Position", ar: "الموقع" },
  head: { en: "Head", ar: "الرأس" },
  footer: { en: "Footer", ar: "الذيل" },
  indexedPages: { en: "Indexed Pages", ar: "الصفحات المفهرسة" },
  sitemap: { en: "Sitemap", ar: "خريطة الموقع" },
  robotsTxt: { en: "robots.txt", ar: "robots.txt" },
  googleIndexed: { en: "Google Indexed", ar: "مفهرس في Google" },
  contentManagement: { en: "Content Management", ar: "إدارة المحتوى" },
  loadDefaults: { en: "Load Defaults", ar: "تحميل الافتراضي" },
  save: { en: "Save", ar: "حفظ" },
  translate: { en: "Translate", ar: "ترجمة" },
  translateAll: { en: "Translate All", ar: "ترجمة الكل" },
  english: { en: "English", ar: "الإنجليزية" },
  arabic: { en: "Arabic", ar: "العربية" },
  sectionEmpty: { en: "This section is empty. Click 'Load Defaults' to import content.", ar: "هذا القسم فارغ. اضغط 'تحميل الافتراضي' لاستيراد المحتوى." },
  addItem: { en: "Add Item", ar: "إضافة عنصر" },
  editContent: { en: "Edit website content. Write English, auto-translate to Arabic.", ar: "تعديل محتوى الموقع. اكتب بالإنجليزية، وترجمة تلقائية للعربية." },
  llmSettings: { en: "LLM Provider Settings", ar: "إعدادات مزود LLM" },
  databaseStats: { en: "Database Stats", ar: "إحصائيات قاعدة البيانات" },
  systemInfo: { en: "System Info", ar: "معلومات النظام" },
  rebuild: { en: "Rebuild & Maintenance", ar: "إعادة البناء والصيانة" },
  fullRebuild: { en: "Full Rebuild", ar: "إعادة بناء كاملة" },
  prismaPush: { en: "Prisma DB Push", ar: "تحديث قاعدة البيانات" },
  prismaGenerate: { en: "Prisma Generate", ar: "توليد Prisma Client" },
  dbReset: { en: "Reset Database", ar: "حذف البيانات" },
  execute: { en: "Execute", ar: "تنفيذ" },
  running: { en: "Running...", ar: "جاري..." },
  dbUsers: { en: "Users", ar: "المستخدمين" },
  dbConversations: { en: "Conversations", ar: "محادثات" },
  dbMessages: { en: "Messages", ar: "رسائل" },
  tokensUsed: { en: "Tokens Used", ar: "التوكنات المستخدمة" },
  docker: { en: "Docker", ar: "Docker" },
  nodeEnv: { en: "Node Env", ar: "بيئة Node" },
  uptime: { en: "Uptime", ar: "وقت التشغيل" },
  memory: { en: "Memory", ar: "الذاكرة" },
  envEditor: { en: "Environment Variables", ar: "متغيرات البيئة" },
  activeNow: { en: "Active Now", ar: "نشط الآن" },
  completed: { en: "Completed", ar: "مكتمل" },
  failed: { en: "Failed", ar: "فشل" },
  recentSessions: { en: "Recent Agent Sessions", ar: "جلسات الوكلاء الأخيرة" },
  refresh: { en: "Refresh", ar: "تحديث" },
  noSessions: { en: "No agent sessions yet.", ar: "لا جلسات وكلاء." },
  attempt: { en: "Attempt", ar: "محاولة" },
  capabilities: { en: "Capabilities", ar: "القدرات" },
  noCompanies: { en: "No companies registered yet.", ar: "لا شركات مسجلة." },
  departments: { en: "departments", ar: "أقسام" },
  projects: { en: "projects", ar: "مشاريع" },
  workOrders: { en: "work orders", ar: "طلبات عمل" },
  tokens: { en: "tokens", ar: "توكنات" },
  perMonth: { en: "/month", ar: "/شهر" },
  writeEnglishFirst: { en: "Write English text first", ar: "اكتب النص بالإنجليزية أولاً" },
  warningReset: { en: "Warning! This will delete ALL data!", ar: "تحذير! هذا سيحذف كل البيانات!" },
  yes: { en: "Yes", ar: "نعم" },
  seconds: { en: "seconds", ar: "ثواني" },
  minutes: { en: "minutes", ar: "دقائق" },
  hours: { en: "hours", ar: "ساعات" },
}

function t(key: keyof typeof LABELS, lang: "ar" | "en"): string {
  return LABELS[key]?.[lang] || LABELS[key]?.en || key
}

// ============================================
// Main Component
// ============================================

export function AdminContent({ params }: { params: Promise<{ lang: string }> }) {
  use(params)
  const locale = useLocale()
  const lang = locale as "ar" | "en"
  const dir = "ltr" // Layout always LTR — text direction handled per-element
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    // حفظ التبويب النشط في localStorage
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("blivoai_admin_tab")
        if (saved) return saved as AdminTab
      } catch {}
    }
    return "plans"
  })

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // حفظ التبويب عند تغييره
  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab)
    setMobileMenuOpen(false)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("blivoai_admin_tab", tab)
      } catch {}
    }
  }

  // ============================================
  // Auth Guard — verify admin access before rendering
  // If unauthorized: show login form (NOT redirect to home)
  // ============================================
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "unauthorized">("loading")
  const [authUser, setAuthUser] = useState<{ name: string; email: string; role: string } | null>(null)
  const [loginEmail, setLoginEmail] = useState("admin@blivoai.com")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me")
        if (res.status === 401 || res.status === 403) {
          setAuthState("unauthorized")
          return
        }
        if (res.ok) {
          const data = await res.json()
          if (data.authenticated && data.user && data.user.role === "OWNER") {
            setAuthUser({
              name: data.user.name || "Admin",
              email: data.user.email || "",
              role: data.user.role || "OWNER",
            })
            setAuthState("authenticated")
          } else {
            setAuthState("unauthorized")
          }
        } else {
          setAuthState("unauthorized")
        }
      } catch {
        setAuthState("unauthorized")
      }
    }
    checkAuth()
  }, [])

  // Handle admin login directly on this page
  const handleAdminLogin = async () => {
    setLoginError("")
    setLoginLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        // Login successful — re-check auth
        const meRes = await fetch("/api/auth/me")
        if (meRes.ok) {
          const meData = await meRes.json()
          if (meData.authenticated && meData.user) {
            setAuthUser({
              name: meData.user.name || "Admin",
              email: meData.user.email || "",
              role: meData.user.role || "OWNER",
            })
            setAuthState("authenticated")
          }
        }
      } else {
        // Always use lang-aware error — never trust API error text (it may be in wrong language)
        const isAr = lang === "ar"
        if (res.status === 401) {
          setLoginError(isAr ? "الإيميل أو كلمة السر غلط" : "Invalid email or password")
        } else if (res.status === 429) {
          setLoginError(isAr ? "محاولات كثيرة — حاول بعد قليل" : "Too many attempts — try again later")
        } else {
          setLoginError(isAr ? "فشل تسجيل الدخول" : "Login failed")
        }
      }
    } catch {
      setLoginError(lang === "ar" ? "خطأ في الاتصال" : "Connection error")
    } finally {
      setLoginLoading(false)
    }
  }

  // Show loading state while checking auth
  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center" dir={dir}>
        <div className="text-center space-y-4">
          <img src="/logo-v2.png" alt="BlivoAI" className="w-12 h-12 mx-auto animate-pulse" />
          <p className="text-muted-foreground text-sm">{lang === "ar" ? "جاري التحقق من الصلاحيات..." : "Verifying access..."}</p>
          <Loader2 className="w-5 h-5 text-brand animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  // If unauthorized — show login form (NOT redirect)
  if (authState === "unauthorized") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center" dir={dir}>
        <Card className="w-full max-w-md border-border/50">
          <CardHeader className="text-center pb-2">
            <img src="/logo-v2.png" alt="BlivoAI" className="w-14 h-14 mx-auto mb-3" />
            <CardTitle className="text-xl">{lang === "ar" ? "لوحة التحكم" : "Admin Panel"}</CardTitle>
            <p className="text-muted-foreground text-sm mt-1">{lang === "ar" ? "سجّل دخولك كمشرف للوصول" : "Login as admin to access"}</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {loginError && (
              <div className="bg-red-500/10 text-red-500 text-sm px-3 py-2 rounded-lg">{loginError}</div>
            )}
            <div className="space-y-2">
              <Label>{lang === "ar" ? "البريد الإلكتروني" : "Email"}</Label>
              <Input
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="admin@blivoai.com"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>{lang === "ar" ? "كلمة السر" : "Password"}</Label>
              <Input
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder={lang === "ar" ? "أدخل كلمة السر" : "Enter password"}
                className="h-11"
              />
            </div>
            <Button
              onClick={handleAdminLogin}
              disabled={loginLoading || !loginPassword}
              className="w-full h-11 bg-brand hover:bg-brand-dark text-white"
            >
              {loginLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (lang === "ar" ? "تسجيل الدخول" : "Login")}
            </Button>
            <Link href={`/${lang}`} className="text-muted-foreground hover:text-foreground text-sm text-center block mt-2">
              {lang === "ar" ? "رجوع للموقع" : "Back to site"}
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const TAB_CONFIG: { id: AdminTab; icon: React.ReactNode }[] = [
    { id: "plans", icon: <CreditCard className="w-4 h-4" /> },
    { id: "overview", icon: <LayoutGrid className="w-4 h-4" /> },
    { id: "analytics", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "content", icon: <FileText className="w-4 h-4" /> },
    { id: "blog", icon: <BookOpen className="w-4 h-4" /> },
    { id: "models", icon: <Cpu className="w-4 h-4" /> },
    { id: "companies", icon: <Building2 className="w-4 h-4" /> },
    { id: "users", icon: <Users className="w-4 h-4" /> },
    { id: "agents", icon: <Zap className="w-4 h-4" /> },
    { id: "system", icon: <Settings2 className="w-4 h-4" /> },
    { id: "security", icon: <Shield className="w-4 h-4" /> },
    { id: "logs", icon: <ScrollText className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-v2.png" alt="BlivoAI" width={36} height={36} className="rounded-lg" />
            <div>
              <h1 className="text-base font-semibold tracking-tight">
                <span className="text-brand">BlivoAI</span>{" "}
                <span className="text-muted-foreground">{t("adminPanel", lang)}</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-brand/30 text-brand text-xs">
              <Shield className="w-3 h-3 mr-1" />Platform Owner
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = `/${lang}`}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              {t("backToSite", lang)}
            </Button>
          </div>
        </div>

        {/* Tab Navigation — Desktop: horizontal tabs / Mobile: dropdown */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Desktop horizontal tabs */}
          <nav className="hidden sm:flex gap-0.5 -mb-px overflow-x-auto scrollbar-apple">
            {TAB_CONFIG.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
                  activeTab === tab.id
                    ? "text-brand border-brand"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
                }`}
              >
                {tab.icon}
                {t(tab.id, lang)}
              </button>
            ))}
          </nav>

          {/* Mobile dropdown tab selector */}
          <div className="sm:hidden relative">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium border-b-2 border-brand text-brand"
            >
              <span className="flex items-center gap-1.5">
                {TAB_CONFIG.find(tb => tb.id === activeTab)?.icon}
                {t(activeTab, lang)}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${mobileMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {mobileMenuOpen && (
              <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border rounded-b-lg shadow-lg overflow-hidden">
                {TAB_CONFIG.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      handleTabChange(tab.id)
                      setMobileMenuOpen(false)
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-brand/10 text-brand"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    {tab.icon}
                    {t(tab.id, lang)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === "plans" && <PlansTab lang={lang} />}
        {activeTab === "overview" && <OverviewTab lang={lang} onNavigate={handleTabChange} />}
        {activeTab === "analytics" && <AnalyticsTab lang={lang} />}
        {activeTab === "content" && <ContentTab lang={lang} />}
        {activeTab === "blog" && <BlogAdminContent params={params} />}
        {activeTab === "models" && <ModelsTab lang={lang} />}
        {activeTab === "companies" && <CompaniesTab lang={lang} />}
        {activeTab === "users" && <UsersTab lang={lang} />}
        {activeTab === "agents" && <AgentsTab lang={lang} />}
        {activeTab === "system" && <SystemTab lang={lang} />}
        {activeTab === "security" && <SecurityAdmin lang={lang} />}
        {activeTab === "logs" && <PlatformLogs lang={lang} />}

      </main>
    </div>
  )
}

// ============================================
// Shared Components
// ============================================

function StatCard({ title, value, sub, icon, accent }: {
  title: string; value: string | number; sub?: string; icon?: React.ReactNode; accent?: string
}) {
  const accentColors: Record<string, string> = {
    brand: "text-brand",
    green: "text-emerald-600 dark:text-emerald-400",
    blue: "text-sky-600 dark:text-sky-400",
    purple: "text-violet-600 dark:text-violet-400",
    orange: "text-orange-600 dark:text-orange-400",
    red: "text-red-600 dark:text-red-400",
    amber: "text-amber-600 dark:text-amber-400",
  }

  return (
    <Card className="bg-card border-border hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className={`text-2xl font-bold tracking-tight ${accentColors[accent || "brand"] || accentColors.brand}`}>
              {value}
            </p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          {icon && <div className={`${accentColors[accent || "brand"] || accentColors.brand} opacity-60`}>{icon}</div>}
        </div>
      </CardContent>
    </Card>
  )
}

function SectionTitle({ children, lang }: { children: React.ReactNode; lang: "ar" | "en" }) {
  return (
    <h2 className="text-lg font-semibold tracking-tight text-foreground mb-4" dir={lang === "ar" ? "rtl" : "ltr"}>
      {children}
    </h2>
  )
}

function EmptyState({ message, lang }: { message: string; lang: "ar" | "en" }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="py-12 text-center" dir={lang === "ar" ? "rtl" : "ltr"}>
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-brand" />
    </div>
  )
}

// ============================================
// 1. Overview Tab
// ============================================

// ============================================
// Blog Tab — manage blog posts (links to full blog admin)
// ============================================

function BlogTab({ lang }: { lang: "ar" | "en" }) {
  const [posts, setPosts] = useState<{ id: string; slug: string; titleAr: string; titleEn: string; status: string; views: number; featured: boolean; createdAt: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPosts() {
      try {
        const res = await fetch("/api/blog?admin=true&limit=50")
        if (res.ok) {
          const data = await res.json()
          setPosts(data.posts || [])
        }
      } catch { /* silent */ }
      finally { setLoading(false) }
    }
    loadPosts()
  }, [])

  const statusColors: Record<string, string> = {
    PUBLISHED: "bg-green-500/10 text-green-600",
    DRAFT: "bg-yellow-500/10 text-yellow-600",
    REVIEW: "bg-blue-500/10 text-blue-600",
    ARCHIVED: "bg-gray-500/10 text-gray-600",
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{lang === "ar" ? "إدارة المدونة" : "Blog Management"}</h2>
          <p className="text-muted-foreground text-sm">{lang === "ar" ? "إنشاء وتعديل وحذف المقالات" : "Create, edit, and delete articles"}</p>
        </div>
        <Link href={`/${lang}/admin/blog`}>
          <Button className="bg-brand hover:bg-brand-dark text-white">
            <Plus className="w-4 h-4 mr-1.5" />
            {lang === "ar" ? "إدارة المدونة الكاملة" : "Full Blog Manager"}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-brand">{posts.filter(p => p.status === "PUBLISHED").length}</p>
            <p className="text-muted-foreground text-xs">{lang === "ar" ? "منشورة" : "Published"}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{posts.filter(p => p.status === "DRAFT").length}</p>
            <p className="text-muted-foreground text-xs">{lang === "ar" ? "مسودات" : "Drafts"}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{posts.reduce((sum, p) => sum + p.views, 0)}</p>
            <p className="text-muted-foreground text-xs">{lang === "ar" ? "إجمالي المشاهدات" : "Total Views"}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-brand">{posts.filter(p => p.featured).length}</p>
            <p className="text-muted-foreground text-xs">{lang === "ar" ? "مقالات مميزة" : "Featured"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Posts list */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
      ) : posts.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-8 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">{lang === "ar" ? "لا مقالات بعد" : "No articles yet"}</p>
            <Link href={`/${lang}/admin/blog`}>
              <Button variant="outline" className="mt-4">{lang === "ar" ? "إنشاء أول مقال" : "Create first article"}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {posts.slice(0, 10).map(post => (
            <Card key={post.id} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={statusColors[post.status] || "bg-gray-500/10 text-gray-600"}>
                    {post.status}
                  </Badge>
                  <div>
                    <p className="font-medium text-sm">{lang === "ar" ? post.titleAr : post.titleEn}</p>
                    <p className="text-muted-foreground text-xs">{post.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {post.featured && <Star className="w-4 h-4 text-brand" />}
                  <span className="text-muted-foreground text-xs flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {post.views}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
          {posts.length > 10 && (
            <div className="text-center pt-2">
              <Link href={`/${lang}/admin/blog`}>
                <Button variant="outline">{lang === "ar" ? `عرض كل ${posts.length} مقال` : `View all ${posts.length} articles`}</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// Overview Tab
// ============================================

function OverviewTab({ lang, onNavigate }: { lang: "ar" | "en"; onNavigate: (tab: AdminTab) => void }) {
  const [stats, setStats] = useState<{
    models: { total: number; active: number; totalCalls: number; totalCost: number }
    companies: { total: number; totalEmployees: number; totalMonthlyRevenue: number; byPlan: Record<string, number> }
    agents: AgentStatsType | null
    db: Record<string, number>
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(async () => {
    try {
      const [modelsRes, companiesRes, agentsRes, settingsRes] = await Promise.all([
        fetch("/api/admin/models"),
        fetch("/api/admin/companies"),
        fetch("/api/admin/agents"),
        fetch("/api/admin/settings"),
      ])

      const modelsData = modelsRes.ok ? await modelsRes.json() : { stats: { total: 0, active: 0, totalCalls: 0, totalCost: 0 } }
      const companiesData = companiesRes.ok ? await companiesRes.json() : { stats: { total: 0, totalEmployees: 0, totalMonthlyRevenue: 0, byPlan: {} } }
      const agentsData = agentsRes.ok ? await agentsRes.json() : { stats: null }
      const settingsData = settingsRes.ok ? await settingsRes.json() : { database: {} }

      setStats({
        models: modelsData.stats ?? { total: 0, active: 0, totalCalls: 0, totalCost: 0 },
        companies: companiesData.stats ?? { total: 0, totalEmployees: 0, totalMonthlyRevenue: 0, byPlan: {} },
        agents: agentsData.stats ?? null,
        db: settingsData.database ?? {},
      })
    } catch (error) {
      console.error("Failed to load stats:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  if (loading) return <LoadingSpinner />
  if (!stats) return <EmptyState message="Failed to load data" lang={lang} />

  const planLabels: Record<string, { label: string; price: string; color: string }> = {
    FREE_TRIAL: { label: t("freeTrial", lang), price: "$0", color: "bg-muted text-muted-foreground" },
    STARTER: { label: t("starter", lang), price: "$29", color: "bg-brand/10 text-brand" },
    PROFESSIONAL: { label: t("professional", lang), price: "$79", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" },
    ENTERPRISE: { label: t("enterprise", lang), price: "$199", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t("companiesCount", lang)}
          value={stats.companies.total}
          sub={`${stats.companies.totalEmployees} ${t("employees", lang)}`}
          icon={<Building2 className="w-5 h-5" />}
          accent="blue"
        />
        <StatCard
          title={t("monthlyRevenue", lang)}
          value={`$${stats.companies.totalMonthlyRevenue}`}
          sub={t("fromSubscriptions", lang)}
          icon={<DollarSign className="w-5 h-5" />}
          accent="green"
        />
        <StatCard
          title={t("activeModels", lang)}
          value={stats.models.active}
          sub={`${stats.models.totalCalls} ${t("calls", lang)}`}
          icon={<Cpu className="w-5 h-5" />}
          accent="purple"
        />
        <StatCard
          title={t("agentsLabel", lang)}
          value={stats.agents?.active ?? 0}
          sub={`${stats.agents?.successRate ?? 0}% ${t("successRate", lang)}`}
          icon={<Bot className="w-5 h-5" />}
          accent="brand"
        />
      </div>

      {/* Subscription Breakdown + Plans Quick Access */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">{t("subscriptionBreakdown", lang)}</CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-brand/30 text-brand hover:bg-brand/10"
            onClick={() => onNavigate("plans")}
          >
            <CreditCard className="w-3.5 h-3.5 mr-1" />
            {lang === "ar" ? "إدارة الخطط" : "Manage Plans"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(planLabels).map(([plan, info]) => (
              <div key={plan} className="text-center p-3 rounded-xl bg-muted/50 border border-border cursor-pointer hover:border-brand/30 transition-colors" onClick={() => onNavigate("plans")}>
                <p className="text-2xl font-bold text-foreground">{stats.companies.byPlan[plan] ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{info.label}</p>
                <Badge className={`mt-1.5 text-[10px] ${info.color}`}>{info.price}{t("perMonth", lang)}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plans Management — Direct Access */}
      <Card className="bg-card border-brand/20 border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-brand" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">
                {lang === "ar" ? "إدارة الخطط والأسعار" : "Plans & Pricing Management"}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === "ar" ? "تحكم بأسعار ومزايا كل خطة — التعديلات تنطبق تلقائياً على الشركات المشتركة" : "Control prices and features for each plan — changes auto-apply to subscribed companies"}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(planLabels).map(([plan, info]) => (
              <div
                key={plan}
                className="p-3 rounded-xl bg-muted/50 border border-border cursor-pointer hover:border-brand/40 hover:bg-brand/5 transition-all"
                onClick={() => onNavigate("plans")}
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge className={`text-[10px] ${info.color}`}>{info.label}</Badge>
                  <span className="text-sm font-bold text-brand">{info.price}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.companies.byPlan[plan] ?? 0} {lang === "ar" ? "مشترك" : "subscribers"}
                </p>
              </div>
            ))}
          </div>
          <Button
            className="w-full mt-4 bg-brand hover:bg-brand-dark text-white h-10"
            onClick={() => onNavigate("plans")}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            {lang === "ar" ? "تعديل الأسعار والمزايا" : "Edit Prices & Features"}
          </Button>
        </CardContent>
      </Card>

      {/* Agent Cost */}
      {stats.agents && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{t("agentCost", lang)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-xl bg-muted/50 border border-border">
                <p className="text-xl font-bold text-foreground">{stats.agents.total}</p>
                <p className="text-xs text-muted-foreground">{t("totalSessions", lang)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/50 border border-border">
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">${stats.agents.totalCost.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{t("totalCost", lang)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/50 border border-border">
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.agents.successRate}%</p>
                <p className="text-xs text-muted-foreground">{t("successRate", lang)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================
// 2. Analytics Tab
// ============================================

function AnalyticsTab({ lang }: { lang: "ar" | "en" }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAddTag, setShowAddTag] = useState(false)
  const [newTag, setNewTag] = useState({ name: "", tagType: "meta", content: "", position: "head" })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/analytics")
      if (res.ok) {
        const d = await res.json()
        setData(d)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function addTag() {
    try {
      const res = await fetch("/api/admin/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTag),
      })
      const d = await res.json()
      if (d.success) {
        toast.success(lang === "ar" ? "تمت الإضافة" : "Tag added")
        setShowAddTag(false)
        setNewTag({ name: "", tagType: "meta", content: "", position: "head" })
        loadData()
      } else {
        toast.error(d.error || "Failed")
      }
    } catch { toast.error("Network error") }
  }

  async function deleteTag(id: string) {
    if (!confirm(lang === "ar" ? "متأكد من الحذف؟" : "Delete this tag?")) return
    try {
      await fetch(`/api/admin/analytics?id=${id}`, { method: "DELETE" })
      toast.success(lang === "ar" ? "تم الحذف" : "Deleted")
      loadData()
    } catch { toast.error("Failed") }
  }

  if (loading) return <LoadingSpinner />
  if (!data) return <EmptyState message="Failed to load analytics" lang={lang} />

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Visitor Stats */}
      <SectionTitle lang={lang}>
        <Globe className="w-5 h-5 inline mr-2" />
        {lang === "ar" ? "إحصائيات الزوار" : "Visitor Statistics"}
      </SectionTitle>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title={t("totalVisitors", lang)} value={data.visitors.total} icon={<Eye className="w-5 h-5" />} accent="brand" />
        <StatCard title={t("today", lang)} value={data.visitors.today} accent="blue" />
        <StatCard title={t("thisWeek", lang)} value={data.visitors.week} accent="purple" />
        <StatCard title={t("thisMonth", lang)} value={data.visitors.month} accent="green" />
      </div>

      {/* Unique & Returning */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title={t("uniqueVisitors", lang)} value={data.uniqueVisitors.total} accent="brand" />
        <StatCard title={t("returning", lang)} value={data.returningVisitors} accent="orange" />
        <StatCard title={t("newLabel", lang)} value={data.newVisitors} accent="blue" />
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium">{t("byLanguage", lang)}</p>
            <div className="flex gap-3 mt-2">
              <Badge variant="outline" className="border-brand/30">AR: {data.byLanguage.ar}</Badge>
              <Badge variant="outline" className="border-brand/30">EN: {data.byLanguage.en}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bounce Rate */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Bounce Rate" value={`${data.sessions.bounceRate}%`} icon={<Activity className="w-5 h-5" />} accent="amber" />
        <StatCard title="Page Views" value={data.sessions.pageViews} accent="blue" />
      </div>

      {/* Top Pages */}
      {data.topPages && data.topPages.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{t("topPages", lang)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-apple">
              {data.topPages.map((p: { path: string; views: number }) => (
                <div key={p.path} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                  <span className="text-foreground truncate">{p.path}</span>
                  <Badge variant="outline" className="text-xs">{p.views}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Referrers */}
      {data.topReferrers && data.topReferrers.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{t("topReferrers", lang)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-apple">
              {data.topReferrers.map((r: { source: string; visitors: number }) => (
                <div key={r.source} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                  <span className="text-foreground">{r.source}</span>
                  <Badge variant="outline" className="text-xs">{r.visitors}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEO Status */}
      <SectionTitle lang={lang}>
        <Search className="w-5 h-5 inline mr-2" />
        {t("seoStatus", lang)}
      </SectionTitle>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">{t("sitemap", lang)}</p>
            <p className={`text-lg font-bold mt-1 ${data.searchEngine.sitemapSubmitted ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {data.searchEngine.sitemapSubmitted ? (lang === "ar" ? "موجود ✓" : "Active ✓") : (lang === "ar" ? "غير موجود" : "Missing")}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">{t("robotsTxt", lang)}</p>
            <p className={`text-lg font-bold mt-1 ${data.searchEngine.robotsTxt ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {data.searchEngine.robotsTxt ? (lang === "ar" ? "موجود ✓" : "Active ✓") : (lang === "ar" ? "غير موجود" : "Missing")}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">{t("indexedPages", lang)}</p>
            <p className="text-lg font-bold text-foreground mt-1">{data.searchEngine.indexedPages}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">{t("googleIndexed", lang)}</p>
            <p className={`text-lg font-bold mt-1 ${data.searchEngine.googleIndexed ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
              {data.searchEngine.googleIndexed ? (lang === "ar" ? "نعم ✓" : "Yes ✓") : (lang === "ar" ? "لا" : "No")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Head Tags Management */}
      <SectionTitle lang={lang}>
        <Code className="w-5 h-5 inline mr-2" />
        {t("headTags", lang)} & {t("footerTags", lang)}
      </SectionTitle>

      <div className="flex gap-2 mb-4">
        <Button onClick={() => setShowAddTag(!showAddTag)} variant="outline" size="sm" className="border-brand/30 text-brand hover:bg-brand/10">
          <Plus className="w-4 h-4 mr-1" />{t("addTag", lang)}
        </Button>
        <Button onClick={loadData} variant="ghost" size="sm" className="text-muted-foreground">
          <RefreshCw className="w-4 h-4 mr-1" />{t("refresh", lang)}
        </Button>
      </div>

      {showAddTag && (
        <Card className="bg-card border-brand/20 mb-4">
          <CardContent className="p-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">{t("tagName", lang)}</Label>
                <Input value={newTag.name} onChange={e => setNewTag(p => ({ ...p, name: e.target.value }))} placeholder="Google Analytics" className="bg-muted/30 border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("tagType", lang)}</Label>
                <Select value={newTag.tagType} onValueChange={v => setNewTag(p => ({ ...p, tagType: v }))}>
                  <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="script">script</SelectItem>
                    <SelectItem value="meta">meta</SelectItem>
                    <SelectItem value="link">link</SelectItem>
                    <SelectItem value="style">style</SelectItem>
                    <SelectItem value="base">base</SelectItem>
                    <SelectItem value="noscript">noscript</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("position", lang)}</Label>
                <Select value={newTag.position} onValueChange={v => setNewTag(p => ({ ...p, position: v }))}>
                  <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="head">{t("head", lang)}</SelectItem>
                    <SelectItem value="footer">{t("footer", lang)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("tagContent", lang)}</Label>
              <Textarea
                value={newTag.content}
                onChange={e => setNewTag(p => ({ ...p, content: e.target.value }))}
                placeholder="<script src='...'></script>"
                rows={3}
                className="bg-muted/30 border-border font-mono text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={addTag} size="sm" className="bg-brand hover:bg-brand-dark text-brand-foreground">
                <Save className="w-4 h-4 mr-1" />{t("save", lang)}
              </Button>
              <Button onClick={() => setShowAddTag(false)} variant="ghost" size="sm">{t("cancel", lang)}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Tags */}
      {data.headTags?.length > 0 && (
        <Card className="bg-card border-border mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{t("headTags", lang)} ({data.headTags.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-apple">
              {data.headTags.map((tag: HeadTagType) => (
                <div key={tag.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{tag.name}</span>
                      <Badge variant="outline" className="text-[10px]">{tag.tagType}</Badge>
                      <Badge className="text-[10px] bg-brand/10 text-brand">{t("head", lang)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate font-mono">{tag.content.slice(0, 80)}</p>
                  </div>
                  <Button onClick={() => deleteTag(tag.id)} variant="ghost" size="sm" className="text-red-500 hover:text-red-400 hover:bg-red-500/10 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.footerTags?.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{t("footerTags", lang)} ({data.footerTags.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-apple">
              {data.footerTags.map((tag: HeadTagType) => (
                <div key={tag.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{tag.name}</span>
                      <Badge variant="outline" className="text-[10px]">{tag.tagType}</Badge>
                      <Badge className="text-[10px] bg-orange-500/10 text-orange-600 dark:text-orange-400">{t("footer", lang)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate font-mono">{tag.content.slice(0, 80)}</p>
                  </div>
                  <Button onClick={() => deleteTag(tag.id)} variant="ghost" size="sm" className="text-red-500 hover:text-red-400 hover:bg-red-500/10 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================
// 3. Content Tab
// ============================================

const CONTENT_SECTIONS = [
  { id: "hero", label: "Hero" },
  { id: "features", label: "Features" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
  { id: "about", label: "About" },
  { id: "footer", label: "Footer" },
  { id: "download", label: "Download" },
  { id: "api_docs", label: "API Docs" },
  { id: "privacy", label: "Privacy" },
  { id: "terms", label: "Terms" },
]

function ContentTab({ lang }: { lang: "ar" | "en" }) {
  const [activeSection, setActiveSection] = useState("hero")
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingDefaults, setLoadingDefaults] = useState(false)
  const [translating, setTranslating] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const resp = await fetch(`/api/admin/content?section=${activeSection}`)
      const data = await resp.json()
      const items: ContentItem[] = []
      if (data.content) {
        for (const [key, val] of Object.entries(data.content as Record<string, any>)) {
          items.push({ itemKey: key, valueEn: val.en || "", valueAr: val.ar || "", icon: val.icon, isActive: val.isActive ?? true })
        }
      }
      items.sort((a, b) => a.itemKey.localeCompare(b.itemKey))
      setContent(items)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [activeSection])

  useEffect(() => { load() }, [load])

  const updateItem = (key: string, field: "valueEn" | "valueAr" | "icon", value: string) => {
    setContent(prev => prev.map(item => item.itemKey === key ? { ...item, [field]: value } : item))
  }

  const addItem = () => {
    const num = content.filter(i => i.itemKey.startsWith("item_")).length + 1
    setContent(prev => [...prev,
      { itemKey: `item_${num}_title`, valueEn: "", valueAr: "", isActive: true },
      { itemKey: `item_${num}_desc`, valueEn: "", valueAr: "", isActive: true },
    ])
  }

  const removeItem = (keyPrefix: string) => {
    setContent(prev => prev.filter(item => !item.itemKey.startsWith(keyPrefix)))
  }

  const translateItem = async (key: string) => {
    const item = content.find(i => i.itemKey === key)
    if (!item || !item.valueEn) {
      toast.error(t("writeEnglishFirst", lang))
      return
    }
    setTranslating(key)
    try {
      const resp = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: item.valueEn }),
      })
      const data = await resp.json()
      if (data.success) {
        updateItem(key, "valueAr", data.translated)
        toast.success(lang === "ar" ? "تمت الترجمة!" : "Translated!")
      } else {
        toast.error(data.error || "Failed")
      }
    } catch { toast.error("Network error") }
    setTranslating(null)
  }

  const translateAll = async () => {
    setSaving(true)
    for (const item of content) {
      if (item.valueEn && !item.valueAr) await translateItem(item.itemKey)
    }
    setSaving(false)
    toast.success(lang === "ar" ? "تمت ترجمة الكل!" : "All translated!")
  }

  const loadDefaults = async () => {
    setLoadingDefaults(true)
    try {
      const resp = await fetch("/api/admin/load-defaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: activeSection }),
      })
      const data = await resp.json()
      if (data.success) {
        toast.success(lang === "ar" ? `تم تحميل ${data.count} عناصر` : `Loaded ${data.count} items`)
        load()
      } else {
        toast.error(data.error || "Failed")
      }
    } catch { toast.error("Network error") }
    setLoadingDefaults(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      const resp = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: activeSection,
          items: content.map((item, i) => ({
            itemKey: item.itemKey, valueEn: item.valueEn, valueAr: item.valueAr,
            icon: item.icon || null, sortOrder: i, isActive: item.isActive,
          })),
        }),
      })
      const data = await resp.json()
      if (data.success) {
        toast.success(lang === "ar" ? "تم الحفظ!" : "Saved!")
        load()
      } else {
        toast.error("Failed")
      }
    } catch { toast.error("Network error") }
    setSaving(false)
  }

  // Group items by prefix (item_1, item_2, etc.)
  const groupedItems: { prefix: string; items: ContentItem[] }[] = []
  const staticItems: ContentItem[] = []
  for (const item of content) {
    const match = item.itemKey.match(/^(item_\d+)_/)
    if (match) {
      const prefix = match[1]
      let group = groupedItems.find(g => g.prefix === prefix)
      if (!group) { group = { prefix, items: [] }; groupedItems.push(group) }
      group.items.push(item)
    } else staticItems.push(item)
  }

  const currentSectionDynamic = activeSection === "hero" || activeSection === "features" || activeSection === "faq"

  return (
    <div className="space-y-6 animate-fade-in-up" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <SectionTitle lang={lang}>{t("contentManagement", lang)}</SectionTitle>
          <p className="text-xs text-muted-foreground">{t("editContent", lang)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {content.length === 0 && (
            <Button onClick={loadDefaults} variant="outline" size="sm" disabled={loadingDefaults} className="border-brand/30 text-brand hover:bg-brand/10">
              {loadingDefaults ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
              {t("loadDefaults", lang)}
            </Button>
          )}
          <Button onClick={translateAll} variant="outline" size="sm" disabled={saving || content.length === 0} className="border-brand/30 text-brand hover:bg-brand/10">
            <Languages className="w-4 h-4 mr-1" />{t("translateAll", lang)}
          </Button>
          <Button onClick={save} size="sm" disabled={saving || content.length === 0} className="bg-brand hover:bg-brand-dark text-brand-foreground">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            {t("save", lang)}
          </Button>
        </div>
      </div>

      {/* Empty state banner */}
      {content.length === 0 && !loading && (
        <div className="p-4 rounded-xl bg-brand/5 border border-brand/20 text-brand text-sm">
          <Info className="w-4 h-4 inline mr-1.5" />
          {t("sectionEmpty", lang)}
        </div>
      )}

      {/* Section selector */}
      <div className="flex flex-wrap gap-1.5">
        {CONTENT_SECTIONS.map(s => (
          <Button
            key={s.id}
            variant={activeSection === s.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSection(s.id)}
            className={activeSection === s.id ? "bg-brand hover:bg-brand-dark text-brand-foreground" : "border-border text-muted-foreground hover:text-foreground hover:border-brand/30"}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : content.length === 0 ? (
        <EmptyState message={lang === "ar" ? "لا محتوى في قاعدة البيانات لهذا القسم" : "No content in database for this section"} lang={lang} />
      ) : (
        <div className="space-y-4">
          {/* Static items */}
          {staticItems.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">{lang === "ar" ? "محتوى القسم" : "Section Content"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {staticItems.map(item => (
                  <div key={item.itemKey} className="space-y-2">
                    <Label className="text-xs font-mono text-muted-foreground">{item.itemKey}</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">{t("english", lang)}</Label>
                        <Textarea value={item.valueEn} onChange={e => updateItem(item.itemKey, "valueEn", e.target.value)} placeholder="English..." rows={2} className="bg-muted/30 border-border" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs text-muted-foreground">{t("arabic", lang)}</Label>
                          <Button size="sm" variant="ghost" onClick={() => translateItem(item.itemKey)} disabled={translating === item.itemKey || !item.valueEn} className="h-5 px-2 text-xs text-brand">
                            {translating === item.itemKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                            {t("translate", lang)}
                          </Button>
                        </div>
                        <Textarea value={item.valueAr} onChange={e => updateItem(item.itemKey, "valueAr", e.target.value)} placeholder="Arabic..." rows={2} dir="rtl" className="bg-muted/30 border-border" />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Grouped items */}
          {groupedItems.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">
                    {lang === "ar" ? "عناصر" : "Items"} ({groupedItems.length})
                  </CardTitle>
                  <Button onClick={addItem} size="sm" variant="outline" className="border-brand/30 text-brand hover:bg-brand/10">
                    <Plus className="w-4 h-4 mr-1" />{t("addItem", lang)}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {groupedItems.map(group => (
                  <div key={group.prefix} className="p-3 rounded-xl bg-muted/30 border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs font-mono">{group.prefix}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => removeItem(group.prefix)} className="text-red-500 hover:bg-red-500/10 h-6 px-2">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {group.items.map(item => (
                      <div key={item.itemKey} className="space-y-2">
                        <Label className="text-xs font-mono text-muted-foreground">{item.itemKey}</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">{t("english", lang)}</Label>
                            <Textarea value={item.valueEn} onChange={e => updateItem(item.itemKey, "valueEn", e.target.value)} placeholder="English..." rows={2} className="bg-muted/30 border-border" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Label className="text-xs text-muted-foreground">{t("arabic", lang)}</Label>
                              <Button size="sm" variant="ghost" onClick={() => translateItem(item.itemKey)} disabled={translating === item.itemKey || !item.valueEn} className="h-5 px-2 text-xs text-brand">
                                {translating === item.itemKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                                {t("translate", lang)}
                              </Button>
                            </div>
                            <Textarea value={item.valueAr} onChange={e => updateItem(item.itemKey, "valueAr", e.target.value)} placeholder="Arabic..." rows={2} dir="rtl" className="bg-muted/30 border-border" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Add item prompt for dynamic sections */}
          {currentSectionDynamic && groupedItems.length === 0 && staticItems.length > 0 && (
            <Card className="bg-card border-border">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">{lang === "ar" ? "لا عناصر ديناميكية." : "No dynamic items yet."}</p>
                <Button onClick={addItem} size="sm" className="bg-brand hover:bg-brand-dark text-brand-foreground">
                  <Plus className="w-4 h-4 mr-1" />{t("addItem", lang)}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// 4. Models Tab
// ============================================

function ModelsTab({ lang }: { lang: "ar" | "en" }) {
  const [models, setModels] = useState<LLMModelType[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newModel, setNewModel] = useState({
    name: "", provider: "together", modelId: "", tier: "MEDIUM",
    baseUrl: "", apiKeyValue: "", priceInput: 0, priceOutput: 0,
    maxTokens: 4096, isActive: true, isDefault: false, priority: 5,
    capabilities: [] as string[],
  })

  const loadModels = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/models")
      if (res.ok) {
        const data = await res.json()
        setModels(data.models || [])
      }
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadModels() }, [loadModels])

  async function addModel() {
    try {
      const res = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newModel),
      })
      const data = await res.json()
      if (data.model) {
        toast.success(lang === "ar" ? "تم إضافة الموديل" : "Model added")
        setShowAdd(false)
        setNewModel({
          name: "", provider: "together", modelId: "", tier: "MEDIUM",
          baseUrl: "", apiKeyValue: "", priceInput: 0, priceOutput: 0,
          maxTokens: 4096, isActive: true, isDefault: false, priority: 5,
          capabilities: [],
        })
        loadModels()
      } else { toast.error(data.error || "Failed") }
    } catch { toast.error("Error") }
  }

  async function toggleModel(id: string, isActive: boolean) {
    try {
      await fetch("/api/admin/models", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive }),
      })
      loadModels()
    } catch {}
  }

  async function deleteModel(id: string) {
    if (!confirm(lang === "ar" ? "متأكد من حذف الموديل؟" : "Delete this model?")) return
    try {
      await fetch(`/api/admin/models?id=${id}`, { method: "DELETE" })
      toast.success(lang === "ar" ? "تم الحذف" : "Deleted")
      loadModels()
    } catch {}
  }

  const TIER_LABELS: Record<string, string> = {
    LIGHT: t("light", lang),
    MEDIUM: t("medium", lang),
    HEAVY: t("heavy", lang),
  }

  const TIER_COLORS: Record<string, string> = {
    LIGHT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    MEDIUM: "bg-brand/10 text-brand",
    HEAVY: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }

  const CAPABILITY_OPTIONS = ["CHAT", "CODE", "ANALYSIS", "GENERATION", "SUMMARIZATION", "TRANSLATION"]

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in-up" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <SectionTitle lang={lang}>{lang === "ar" ? "موديلات LLM" : "LLM Models"}</SectionTitle>
        <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="bg-brand hover:bg-brand-dark text-brand-foreground">
          {showAdd ? t("cancel", lang) : `+ ${t("addModel", lang)}`}
        </Button>
      </div>

      {/* Add Model Form */}
      {showAdd && (
        <Card className="bg-card border-brand/20">
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">{t("modelName", lang)}</Label>
                <Input value={newModel.name} onChange={e => setNewModel(p => ({ ...p, name: e.target.value }))} placeholder="Grok-3" className="bg-muted/30 border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("provider", lang)}</Label>
                <Select value={newModel.provider} onValueChange={v => setNewModel(p => ({ ...p, provider: v }))}>
                  <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="together">Together AI</SelectItem>
                    <SelectItem value="groq">Groq</SelectItem>
                    <SelectItem value="grok">Grok (xAI)</SelectItem>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                    <SelectItem value="local">Local Server</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("modelId", lang)}</Label>
                <Input value={newModel.modelId} onChange={e => setNewModel(p => ({ ...p, modelId: e.target.value }))} placeholder="meta-llama/Meta-Llama-3.1-70B" className="bg-muted/30 border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("tier", lang)}</Label>
                <Select value={newModel.tier} onValueChange={v => setNewModel(p => ({ ...p, tier: v }))}>
                  <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LIGHT">{t("light", lang)}</SelectItem>
                    <SelectItem value="MEDIUM">{t("medium", lang)}</SelectItem>
                    <SelectItem value="HEAVY">{t("heavy", lang)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("apiUrl", lang)}</Label>
                <Input value={newModel.baseUrl} onChange={e => setNewModel(p => ({ ...p, baseUrl: e.target.value }))} placeholder="https://api.example.com/v1" className="bg-muted/30 border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("apiKeyField", lang)}</Label>
                <Input value={newModel.apiKeyValue} onChange={e => setNewModel(p => ({ ...p, apiKeyValue: e.target.value }))} type="password" placeholder="sk-xxxxx" className="bg-muted/30 border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("priceInput", lang)}</Label>
                <Input value={newModel.priceInput} onChange={e => setNewModel(p => ({ ...p, priceInput: parseFloat(e.target.value) || 0 }))} type="number" step="0.01" className="bg-muted/30 border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("priceOutput", lang)}</Label>
                <Input value={newModel.priceOutput} onChange={e => setNewModel(p => ({ ...p, priceOutput: parseFloat(e.target.value) || 0 }))} type="number" step="0.01" className="bg-muted/30 border-border" />
              </div>
            </div>
            {/* Capabilities */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">{t("capabilities", lang)}</Label>
              <div className="flex flex-wrap gap-2">
                {CAPABILITY_OPTIONS.map(cap => (
                  <button
                    key={cap}
                    onClick={() => setNewModel(p => ({
                      ...p,
                      capabilities: p.capabilities.includes(cap)
                        ? p.capabilities.filter(c => c !== cap)
                        : [...p.capabilities, cap]
                    }))}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      newModel.capabilities.includes(cap)
                        ? "bg-brand text-brand-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {cap}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={newModel.isActive} onCheckedChange={v => setNewModel(p => ({ ...p, isActive: v }))} />
                <Label className="text-xs text-muted-foreground">{t("active", lang)}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newModel.isDefault} onCheckedChange={v => setNewModel(p => ({ ...p, isDefault: v }))} />
                <Label className="text-xs text-muted-foreground">{t("default", lang)}</Label>
              </div>
            </div>
            <Button onClick={addModel} size="sm" className="bg-brand hover:bg-brand-dark text-brand-foreground">{t("addModel", lang)}</Button>
          </CardContent>
        </Card>
      )}

      {/* Models List */}
      {models.length === 0 ? (
        <EmptyState message={t("noModels", lang)} lang={lang} />
      ) : (
        <div className="space-y-2">
          {models.map(model => (
            <Card key={model.id} className={`bg-card border-border transition-opacity ${!model.isActive ? "opacity-50" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-medium text-foreground">{model.name}</h3>
                      <Badge variant="outline" className="text-[10px]">{model.provider}</Badge>
                      <Badge className={`text-[10px] ${TIER_COLORS[model.tier] || ""}`}>
                        {TIER_LABELS[model.tier] ?? model.tier}
                      </Badge>
                      {model.isDefault && <Badge className="text-[10px] bg-brand/10 text-brand">{t("default", lang)}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">{model.modelId}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{model.totalCalls} {t("calls", lang)}</span>
                      <span>${model.totalCost.toFixed(2)}</span>
                      <span>${model.priceInput}/${model.priceOutput} /M tkns</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={model.isActive} onCheckedChange={() => toggleModel(model.id, model.isActive)} />
                    <Button onClick={() => deleteModel(model.id)} variant="ghost" size="sm" className="text-red-500 hover:text-red-400 hover:bg-red-500/10 text-xs">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// 5. Plans Tab — Moved to ./plans/plans-tab.tsx
// ============================================

// PlansTab is now imported from ./plans/plans-tab.tsx

// ============================================
// 6. Companies Tab
// ============================================

function CompaniesTab({ lang }: { lang: "ar" | "en" }) {
  const [companies, setCompanies] = useState<CompanyType[]>([])
  const [stats, setStats] = useState<{ total: number; totalEmployees: number; totalMonthlyRevenue: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgradingId, setUpgradingId] = useState<string | null>(null)
  const [availablePlans, setAvailablePlans] = useState<{ planKey: string; name: string; nameAr: string; price: number; tokenBudget: number; maxEmployees: number; maxDepartments: number }[]>([])

  const loadCompanies = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/companies")
      if (res.ok) {
        const data = await res.json()
        setCompanies(data.companies || [])
        setStats(data.stats)
      }
    } catch {} finally { setLoading(false) }
  }, [])

  const loadPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/plans")
      if (res.ok) {
        const data = await res.json()
        setAvailablePlans((data.plans || []).map((p: Record<string, any>) => ({
          planKey: p.planKey,
          name: p.name,
          nameAr: p.nameAr,
          price: p.price,
          tokenBudget: p.tokenBudget,
          maxEmployees: p.maxEmployees,
          maxDepartments: p.maxDepartments,
        })))
      }
    } catch {}
  }, [])

  useEffect(() => { loadCompanies(); loadPlans() }, [loadCompanies, loadPlans])

  async function updateSubscription(companyId: string, newPlanKey: string) {
    const company = companies.find(c => c.id === companyId)
    const oldPlan = availablePlans.find(p => p.planKey === company?.subscription)
    const newPlan = availablePlans.find(p => p.planKey === newPlanKey)
    if (!company || !newPlan) return

    const isUpgrade = newPlan.price > (oldPlan?.price ?? 0)
    const confirmMsg = lang === "ar"
      ? `هل تريد ${isUpgrade ? "ترقية" : "تغيير"} اشتراك "${company.name}" من "${oldPlan ? (lang === "ar" ? oldPlan.nameAr : oldPlan.name) : company.subscription}" إلى "${lang === "ar" ? newPlan.nameAr : newPlan.name}"؟`
      : `${isUpgrade ? "Upgrade" : "Change"} "${company.name}" from "${oldPlan?.name || company.subscription}" to "${newPlan.name}"?`

    if (!confirm(confirmMsg)) return

    setUpgradingId(companyId)
    try {
      const res = await fetch("/api/admin/companies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: companyId,
          action: "update_subscription",
          data: {
            subscription: newPlanKey,
            tokenBudgetMonthly: newPlan.tokenBudget,
            maxEmployees: newPlan.maxEmployees,
            maxDepartments: newPlan.maxDepartments,
          },
        }),
      })
      if (res.ok) {
        toast.success(lang === "ar"
          ? `تم ${isUpgrade ? "ترقية" : "تغيير"} الاشتراك إلى ${lang === "ar" ? newPlan.nameAr : newPlan.name}`
          : `Subscription ${isUpgrade ? "upgraded" : "changed"} to ${newPlan.name}`)
        loadCompanies()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || (lang === "ar" ? "فشل التحديث" : "Update failed"))
      }
    } catch {
      toast.error(lang === "ar" ? "خطأ في الاتصال" : "Connection error")
    } finally { setUpgradingId(null) }
  }

  const PLAN_LABELS: Record<string, string> = {
    FREE_TRIAL: t("freeTrial", lang),
    STARTER: t("starter", lang),
    PROFESSIONAL: t("professional", lang),
    ENTERPRISE: t("enterprise", lang),
    ...Object.fromEntries(availablePlans.map(p => [p.planKey, lang === "ar" ? p.nameAr : p.name])),
  }

  const PLAN_COLORS: Record<string, string> = {
    FREE_TRIAL: "bg-muted text-muted-foreground",
    STARTER: "bg-brand/10 text-brand",
    PROFESSIONAL: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    ENTERPRISE: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  }

  // الخطط مرتبة حسب السعر
  const sortedPlans = [...availablePlans].sort((a, b) => a.price - b.price)

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in-up" dir={lang === "ar" ? "rtl" : "ltr"}>
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard title={t("companiesCount", lang)} value={stats.total} icon={<Building2 className="w-5 h-5" />} accent="blue" />
          <StatCard title={t("employees", lang)} value={stats.totalEmployees} icon={<Users className="w-5 h-5" />} accent="green" />
          <StatCard title={t("monthlyRevenue", lang)} value={`$${stats.totalMonthlyRevenue}`} icon={<DollarSign className="w-5 h-5" />} accent="brand" />
        </div>
      )}

      {companies.length === 0 ? (
        <EmptyState message={t("noCompanies", lang)} lang={lang} />
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-apple">
          {companies.map(company => {
            const currentPlan = availablePlans.find(p => p.planKey === company.subscription)
            const tokenUsagePercent = company.tokenBudgetMonthly > 0
              ? Math.round((company.tokenUsedMonthly / company.tokenBudgetMonthly) * 100)
              : 0
            const isUpgrading = upgradingId === company.id

            return (
              <Card key={company.id} className="bg-card border-border hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  {/* الصف الأول: اسم الشركة + الخطة الحالية */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-brand" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-foreground truncate">{company.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{company.owner.email}</p>
                      </div>
                    </div>
                    <Badge className={`text-[10px] shrink-0 ${PLAN_COLORS[company.subscription] ?? "bg-brand/10 text-brand"}`}>
                      {PLAN_LABELS[company.subscription] ?? company.subscription}
                    </Badge>
                  </div>

                  {/* الصف الثاني: إحصائيات */}
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{company._count.employees} {t("employees", lang)}</span>
                    <span>{company._count.departments} {t("departments", lang)}</span>
                    <span>{company._count.projects} {t("projects", lang)}</span>
                  </div>

                  {/* الصف الثالث: استهلاك التوكنات */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{lang === "ar" ? "استهلاك التوكنات" : "Token Usage"}</span>
                      <span className="text-muted-foreground">{company.tokenUsedMonthly.toLocaleString()} / {company.tokenBudgetMonthly.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${tokenUsagePercent > 90 ? "bg-red-500" : tokenUsagePercent > 70 ? "bg-amber-500" : "bg-brand"}`}
                        style={{ width: `${Math.min(tokenUsagePercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* الصف الرابع: الخطة الحالية + ترقية */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        {lang === "ar" ? "الخطة الحالية:" : "Current Plan:"}{" "}
                        <span className="font-medium text-foreground">
                          {currentPlan ? (lang === "ar" ? currentPlan.nameAr : currentPlan.name) : (PLAN_LABELS[company.subscription] ?? company.subscription)}
                        </span>
                        {currentPlan && (
                          <span className="text-muted-foreground">
                            {" "}&mdash; {currentPlan.price === 0 ? (lang === "ar" ? "مجاني" : "Free") : `$${currentPlan.price}/${lang === "ar" ? "شهر" : "mo"}`}
                          </span>
                        )}
                      </div>
                      <Select value={company.subscription} onValueChange={v => updateSubscription(company.id, v)} disabled={isUpgrading}>
                        <SelectTrigger className={`w-40 bg-muted/30 border-border text-xs ${isUpgrading ? "opacity-50" : ""}`}>
                          {isUpgrading ? (
                            <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />{lang === "ar" ? "جاري التحديث..." : "Updating..."}</span>
                          ) : (
                            <SelectValue placeholder={lang === "ar" ? "ترقية / تغيير" : "Upgrade / Change"} />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {sortedPlans.map(p => {
                            const isCurrent = p.planKey === company.subscription
                            const isUpgrade = p.price > (currentPlan?.price ?? 0)
                            const isDowngrade = p.price < (currentPlan?.price ?? 0)
                            return (
                              <SelectItem key={p.planKey} value={p.planKey} disabled={isCurrent}>
                                <span className="flex items-center gap-1.5">
                                  <span>{lang === "ar" ? p.nameAr : p.name}</span>
                                  <span className="text-muted-foreground">(${p.price === 0 ? (lang === "ar" ? "مجاني" : "Free") : `$${p.price}`})</span>
                                  {isCurrent && <Badge variant="outline" className="text-[9px] px-1 py-0">{lang === "ar" ? "حالي" : "Current"}</Badge>}
                                  {!isCurrent && isUpgrade && <Badge className="text-[9px] px-1 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{lang === "ar" ? "ترقية" : "Upgrade"}</Badge>}
                                  {!isCurrent && isDowngrade && <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-600 border-amber-300">{lang === "ar" ? "تخفيض" : "Downgrade"}</Badge>}
                                </span>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================
// 6. Agents Tab
// ============================================

function AgentsTab({ lang }: { lang: "ar" | "en" }) {
  const [stats, setStats] = useState<AgentStatsType | null>(null)
  const [sessions, setSessions] = useState<AgentSessionType[]>([])
  const [modelPerformance, setModelPerformance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/agents")
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
        setSessions(data.recentSessions || [])
        setModelPerformance(data.modelPerformance || [])
      }
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const STATUS_CONFIG: Record<string, { label: { en: string; ar: string }; color: string }> = {
    SPAWNING: { label: { en: "Spawning", ar: "جاري التشغيل" }, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    RUNNING: { label: { en: "Running", ar: "يعمل" }, color: "bg-brand/10 text-brand" },
    REVIEWING: { label: { en: "Reviewing", ar: "قيد المراجعة" }, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
    REVISION: { label: { en: "Revision", ar: "إعادة" }, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    COMPLETED: { label: { en: "Completed", ar: "مكتمل" }, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    FAILED: { label: { en: "Failed", ar: "فشل" }, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    CANCELLED: { label: { en: "Cancelled", ar: "ملغى" }, color: "bg-muted text-muted-foreground" },
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in-up" dir={lang === "ar" ? "rtl" : "ltr"}>
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title={t("activeNow", lang)} value={stats.active} icon={<Zap className="w-5 h-5" />} accent="brand" />
          <StatCard title={t("completed", lang)} value={stats.completed} accent="green" />
          <StatCard title={t("failed", lang)} value={stats.failed} accent="red" />
          <StatCard title={t("successRate", lang)} value={`${stats.successRate}%`} accent="purple" />
        </div>
      )}

      {/* Model Performance */}
      {modelPerformance.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{lang === "ar" ? "أداء الموديلات" : "Model Performance"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-apple">
              {modelPerformance.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-foreground font-medium truncate">{m.name}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{m.provider}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span>{m.totalCalls} calls</span>
                    <span>${m.totalCost.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{t("recentSessions", lang)}</CardTitle>
            <Button onClick={loadData} variant="ghost" size="sm" className="text-muted-foreground text-xs">
              <RefreshCw className="w-4 h-4 mr-1" />{t("refresh", lang)}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">{t("noSessions", lang)}</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-apple">
              {sessions.map(session => (
                <div key={session.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">{session.taskTitle}</span>
                      <Badge className={`text-[10px] ${STATUS_CONFIG[session.status]?.color ?? ""}`}>
                        {STATUS_CONFIG[session.status]?.label[lang] ?? session.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span>{session.employee.name} ({session.employee.role})</span>
                      <span>{t("attempt", lang)} {session.attempt}/{session.maxAttempts}</span>
                      {session.llmModel && <span>{session.llmModel.name}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">${session.totalCost.toFixed(4)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// 7b. Users Tab
// ============================================

function UsersTab({ lang }: { lang: "ar" | "en" }) {
  const isAr = lang === "ar"
  const [users, setUsers] = useState<Array<{
    id: string; email: string; name: string; role: string;
    companyId: string | null; createdAt: string;
    company: { id: string; name: string; subscription: string } | null;
    ownedCompany: { id: string; name: string; subscription: string } | null;
  }>>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/users?lang=${lang}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [lang])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleDelete = async (id: string) => {
    setDeleting(id)
    setMessage(null)
    try {
      const res = await fetch(`/api/users?id=${id}&lang=${lang}`, { method: "DELETE" })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: "success", text: data.message || (isAr ? "تم الحذف" : "Deleted") })
        setConfirmDelete(null)
        fetchUsers()
      } else {
        setMessage({ type: "error", text: data.error || (isAr ? "خطأ" : "Error") })
      }
    } catch {
      setMessage({ type: "error", text: isAr ? "خطأ في الاتصال" : "Connection error" })
    }
    setDeleting(null)
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const roleColor = (r: string) => {
    if (r === "OWNER") return "bg-purple-100 text-purple-700 dark:bg-purple-600/20 dark:text-purple-400"
    if (r === "ADMIN") return "bg-blue-100 text-blue-700 dark:bg-blue-600/20 dark:text-blue-400"
    return "bg-gray-100 text-gray-600 dark:bg-gray-600/20 dark:text-gray-400"
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-brand" />
          {isAr ? "إدارة المستخدمين" : "User Management"}
        </h2>
        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title={isAr ? "مستخدمين" : "Users"} value={users.length} icon={<Users className="w-5 h-5" />} />
        <StatCard title={isAr ? "مالكين" : "Owners"} value={users.filter(u => u.role === "OWNER").length} icon={<Shield className="w-5 h-5" />} accent="purple" />
        <StatCard title={isAr ? "لديهم شركة" : "Has Company"} value={users.filter(u => u.companyId || u.ownedCompany).length} icon={<Building2 className="w-5 h-5" />} accent="blue" />
        <StatCard title={isAr ? "بدون شركة" : "No Company"} value={users.filter(u => !u.companyId && !u.ownedCompany).length} icon={<AlertTriangle className="w-5 h-5" />} accent="orange" />
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          message.type === "success"
            ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30 text-emerald-600 dark:text-emerald-400"
            : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 text-red-600 dark:text-red-400"
        }`}>
          {message.type === "success" ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-muted-foreground" />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={isAr ? "ابحث بالاسم أو الإيميل..." : "Search by name or email..."}
          className="w-full h-11 pr-10 pl-4 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
        />
      </div>

      {/* Users Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{isAr ? "لا يوجد مستخدمين" : "No users"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-start p-3">{isAr ? "المستخدم" : "User"}</th>
                    <th className="text-start p-3 hidden sm:table-cell">{isAr ? "الإيميل" : "Email"}</th>
                    <th className="text-start p-3">{isAr ? "الدور" : "Role"}</th>
                    <th className="text-start p-3 hidden md:table-cell">{isAr ? "الشركة" : "Company"}</th>
                    <th className="text-start p-3 hidden lg:table-cell">{isAr ? "الخطة" : "Plan"}</th>
                    <th className="text-start p-3 hidden lg:table-cell">{isAr ? "التاريخ" : "Date"}</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(user => {
                    const co = user.ownedCompany || user.company
                    const confirming = confirmDelete === user.id
                    return (
                      <tr key={user.id} className={`border-b border-border/50 transition-colors ${confirming ? "bg-red-50/50 dark:bg-red-900/10" : "hover:bg-muted/50"}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3F4A69] to-brand flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate max-w-[120px]">{user.name}</p>
                              <p className="text-xs text-muted-foreground sm:hidden truncate max-w-[120px]">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 hidden sm:table-cell">
                          <span className="text-muted-foreground truncate block max-w-[180px]">{user.email}</span>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary" className={`text-[10px] ${roleColor(user.role)}`}>{user.role}</Badge>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          {co ? <span className="truncate block max-w-[150px]">{co.name}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          {co ? <span className="text-xs font-medium text-brand">{co.subscription}</span> : null}
                        </td>
                        <td className="p-3 hidden lg:table-cell text-muted-foreground text-xs">
                          {new Date(user.createdAt).toLocaleDateString(isAr ? "ar-EG" : "en-US", { month: "short", day: "numeric" })}
                        </td>
                        <td className="p-3">
                          {confirming ? (
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="destructive" className="h-7 text-[10px] px-2" onClick={() => handleDelete(user.id)} disabled={deleting === user.id}>
                                {deleting === user.id ? "..." : (isAr ? "تأكيد" : "OK")}
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={() => setConfirmDelete(null)}>
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setConfirmDelete(user.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// 8. System Tab
// ============================================

function SystemTab({ lang }: { lang: "ar" | "en" }) {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [llmForm, setLlmForm] = useState({
    provider: "", apiKey: "", apiUrl: "", modelLight: "", modelMedium: "", modelHeavy: "",
  })
  const [savingLlm, setSavingLlm] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  // API Keys management
  const [envKeys, setEnvKeys] = useState<Record<string, {
    label: string; labelAr: string; category: string;
    description: string; descriptionAr: string;
    isSet: boolean; maskedValue: string; canWriteToEnv: boolean;
  }> | null>(null)
  const [envKeyEditing, setEnvKeyEditing] = useState<string | null>(null)
  const [envKeyNewValue, setEnvKeyNewValue] = useState("")
  const [envKeyShowValue, setEnvKeyShowValue] = useState<string | null>(null)
  const [envKeySaving, setEnvKeySaving] = useState<string | null>(null)

  const loadEnvKeys = useCallback(async () => {
    try {
      const cookieHeader = document.cookie
      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map(c => {
          const [key, ...v] = c.split("=")
          return [key, v.join("=")]
        })
      )
      const token = cookies.oec_token || ""

      const res = await fetch("/api/admin/env-keys", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setEnvKeys(data.keys)
      }
    } catch {} 
  }, [])

  async function saveEnvKey(keyName: string, value: string) {
    setEnvKeySaving(keyName)
    try {
      const cookieHeader = document.cookie
      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map(c => {
          const [key, ...v] = c.split("=")
          return [key, v.join("=")]
        })
      )
      const token = cookies.oec_token || ""

      const res = await fetch("/api/admin/env-keys", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ key: keyName, value }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(
          lang === "ar"
            ? `تم حفظ ${keyName} في ملف البيئة بشكل دائم!`
            : `${keyName} saved permanently to .env file!`
        )
        setEnvKeyEditing(null)
        setEnvKeyNewValue("")
        await loadEnvKeys()
      } else {
        toast.error(data.error || "Failed")
      }
    } catch { toast.error("Network error") }
    setEnvKeySaving(null)
  }

  async function deleteEnvKey(keyName: string) {
    if (!confirm(
      lang === "ar"
        ? `متأكد من حذف ${keyName} من ملف البيئة؟`
        : `Remove ${keyName} from .env file?`
    )) return
    try {
      const cookieHeader = document.cookie
      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map(c => {
          const [key, ...v] = c.split("=")
          return [key, v.join("=")]
        })
      )
      const token = cookies.oec_token || ""

      const res = await fetch(`/api/admin/env-keys?key=${keyName}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      if (data.success) {
        toast.success(
          lang === "ar"
            ? `تم حذف ${keyName} من ملف البيئة`
            : `${keyName} removed from .env file`
        )
        await loadEnvKeys()
      } else {
        toast.error(data.error || "Failed")
      }
    } catch { toast.error("Network error") }
  }

  const loadSettings = useCallback(async () => {
    try {
      // Get token for auth
      const cookieHeader = document.cookie
      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map(c => {
          const [key, ...v] = c.split("=")
          return [key, v.join("=")]
        })
      )
      const token = cookies.oec_token || ""

      const res = await fetch("/api/admin/settings", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        // SECURITY: Use envStatus (boolean indicators) instead of env (raw values)
        setLlmForm({
          provider: data.llm?.provider || "",
          apiKey: "", // Don't populate actual key
          apiUrl: "", // Don't populate actual URL
          modelLight: "",
          modelMedium: "",
          modelHeavy: "",
        })
      }
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadSettings(); loadEnvKeys() }, [loadSettings, loadEnvKeys])

  async function saveLlm() {
    setSavingLlm(true)
    try {
      const cookieHeader = document.cookie
      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map(c => {
          const [key, ...v] = c.split("=")
          return [key, v.join("=")]
        })
      )
      const token = cookies.oec_token || ""

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(llmForm),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(lang === "ar" ? "تم حفظ الإعدادات!" : "Settings saved!")
        loadSettings()
      } else {
        toast.error(data.error || "Failed")
      }
    } catch { toast.error("Network error") }
    setSavingLlm(false)
  }

  function formatUptime(seconds: number): string {
    if (seconds < 60) return `${seconds} ${t("seconds", lang)}`
    if (seconds < 3600) return `${Math.floor(seconds / 60)} ${t("minutes", lang)}`
    return `${Math.floor(seconds / 3600)} ${t("hours", lang)}`
  }

  if (loading) return <LoadingSpinner />
  if (!settings) return <EmptyState message="Failed to load settings" lang={lang} />

  return (
    <div className="space-y-6 animate-fade-in-up" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Branding — Logo & Favicon */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Image src="/logo-v2.png" alt="BlivoAI" width={20} height={20} className="rounded-md" />
            {lang === "ar" ? "البراندينج — اللوجو والفايفكون" : "Branding — Logo & Favicon"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Logo */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border text-center">
              <p className="text-xs text-muted-foreground mb-3">{lang === "ar" ? "اللوجو الحالي" : "Current Logo"}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-v2.png" alt="BlivoAI Logo" className="w-16 h-16 rounded-xl mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">Logo — BlivoAI</p>
              <div className="mt-3">
                <Input ref={logoInputRef} type="file" accept=".svg,.png,.jpg,.webp" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const formData = new FormData()
                  formData.append("file", file)
                  formData.append("type", "logo")
                  try {
                    // Get auth token from cookie
                    const cookieHeader = document.cookie
                    const cookies = Object.fromEntries(cookieHeader.split("; ").map(c => { const [key, ...v] = c.split("="); return [key, v.join("=")] }))
                    const authToken = cookies.oec_token || ""
                    const res = await fetch("/api/upload/branding", { method: "POST", body: formData, headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} })
                    if (res.ok) {
                      const data = await res.json()
                      toast.success(lang === "ar" ? "تم تحديث اللوجو!" : "Logo updated!")
                      // Force refresh with cache bypass to show the new logo
                      window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now()
                    } else {
                      const errData = await res.json().catch(() => ({}))
                      toast.error(lang === "ar" ? `فشل تحديث اللوجو: ${errData.error || res.status}` : `Failed to update logo: ${errData.error || res.status}`)
                    }
                  } catch { toast.error(lang === "ar" ? "خطأ في الاتصال" : "Upload error") }
                }} />
                <Button variant="outline" size="sm" className="w-full" onClick={() => logoInputRef.current?.click()}>
                  <Plus className="w-3 h-3 mr-1" />
                  {lang === "ar" ? "رفع لوجو جديد" : "Upload new logo"}
                </Button>
              </div>
            </div>
            {/* Favicon */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border text-center">
              <p className="text-xs text-muted-foreground mb-3">{lang === "ar" ? "الفايفكون الحالي" : "Current Favicon"}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon-v2.ico" alt="BlivoAI Favicon" className="w-10 h-10 rounded-md mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">Favicon — BlivoAI</p>
              <div className="mt-3">
                <Input ref={faviconInputRef} type="file" accept=".ico,.png,.svg,.webp" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const formData = new FormData()
                  formData.append("file", file)
                  formData.append("type", "favicon")
                  try {
                    // Get auth token from cookie
                    const cookieHeader2 = document.cookie
                    const cookies2 = Object.fromEntries(cookieHeader2.split("; ").map(c => { const [key, ...v] = c.split("="); return [key, v.join("=")] }))
                    const authToken2 = cookies2.oec_token || ""
                    const res = await fetch("/api/upload/branding", { method: "POST", body: formData, headers: authToken2 ? { Authorization: `Bearer ${authToken2}` } : {} })
                    if (res.ok) {
                      const data = await res.json()
                      toast.success(lang === "ar" ? "تم تحديث الفايفكون!" : "Favicon updated!")
                      // Force refresh with cache bypass
                      window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now()
                    } else {
                      const errData2 = await res.json().catch(() => ({}))
                      toast.error(lang === "ar" ? `فشل تحديث الفايفكون: ${errData2.error || res.status}` : `Failed to update favicon: ${errData2.error || res.status}`)
                    }
                  } catch { toast.error(lang === "ar" ? "خطأ في الاتصال" : "Upload error") }
                }} />
                <Button variant="outline" size="sm" className="w-full" onClick={() => faviconInputRef.current?.click()}>
                  <Plus className="w-3 h-3 mr-1" />
                  {lang === "ar" ? "رفع فايفكون جديد" : "Upload new favicon"}
                </Button>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground text-xs text-center">
            {lang === "ar" ? "رفع اللوجو والفايفكون من هنا — بيتم حفظهم تلقائياً" : "Upload logo and favicon here — they are saved automatically"}
          </p>
        </CardContent>
      </Card>

      {/* LLM Provider Settings */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Cpu className="w-4 h-4 text-brand" />
            {t("llmSettings", lang)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">{t("provider", lang)}</Label>
              <Select value={llmForm.provider} onValueChange={v => setLlmForm(p => ({ ...p, provider: v }))}>
                <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mock">Mock (free, no AI)</SelectItem>
                  <SelectItem value="groq">Groq (fast, free tier)</SelectItem>
                  <SelectItem value="together">Together AI</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                  <SelectItem value="grok">Grok (xAI)</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("apiKeyField", lang)}</Label>
              <Input value={llmForm.apiKey} onChange={e => setLlmForm(p => ({ ...p, apiKey: e.target.value }))} type="password" placeholder={settings.llm?.apiKeyMasked || "sk-xxxx"} className="bg-muted/30 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("apiUrl", lang)}</Label>
              <Input value={llmForm.apiUrl} onChange={e => setLlmForm(p => ({ ...p, apiUrl: e.target.value }))} placeholder="https://api.groq.com/openai/v1" className="bg-muted/30 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Model Light</Label>
              <Input value={llmForm.modelLight} onChange={e => setLlmForm(p => ({ ...p, modelLight: e.target.value }))} placeholder="llama-3.1-8b" className="bg-muted/30 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Model Medium</Label>
              <Input value={llmForm.modelMedium} onChange={e => setLlmForm(p => ({ ...p, modelMedium: e.target.value }))} placeholder="llama-3.1-70b" className="bg-muted/30 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Model Heavy</Label>
              <Input value={llmForm.modelHeavy} onChange={e => setLlmForm(p => ({ ...p, modelHeavy: e.target.value }))} placeholder="deepseek-v3" className="bg-muted/30 border-border" />
            </div>
          </div>
          <Button onClick={saveLlm} size="sm" disabled={savingLlm} className="bg-brand hover:bg-brand-dark text-brand-foreground">
            {savingLlm ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            {t("save", lang)}
          </Button>
        </CardContent>
      </Card>

      {/* Dodo Payment Gateway — Prominent Card */}
      <Card className="bg-card border-border ring-1 ring-emerald-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-500" />
            {lang === "ar" ? "بوابة الدفع — Dodo Payments" : "Payment Gateway — Dodo Payments"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!envKeys ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Payment keys from env-keys */}
              {(() => {
                const paymentKeys = Object.entries(envKeys).filter(([_, info]) => info.category === "payment")
                if (paymentKeys.length === 0) return null
                return paymentKeys.map(([keyName, keyInfo]) => (
                  <div key={keyName} className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full ${keyInfo.isSet ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`} />
                        <span className="text-sm font-semibold text-foreground truncate">
                          {lang === "ar" ? keyInfo.labelAr : keyInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {keyInfo.isSet && (
                          <Badge variant="outline" className="text-xs font-mono border-emerald-600/30 text-emerald-600 dark:text-emerald-400">
                            {keyInfo.maskedValue}
                          </Badge>
                        )}
                        {!keyInfo.isSet && (
                          <Badge variant="outline" className="text-xs border-red-600/30 text-red-600 dark:text-red-400 animate-pulse">
                            {lang === "ar" ? "غير مضبوط ✗" : "Not set ✗"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {lang === "ar" ? keyInfo.descriptionAr : keyInfo.description}
                    </p>
                    {envKeyEditing === keyName ? (
                      <div className="space-y-2 pt-1">
                        <div className="relative">
                          <Input
                            type={envKeyShowValue === keyName ? "text" : "password"}
                            value={envKeyNewValue}
                            onChange={e => setEnvKeyNewValue(e.target.value)}
                            placeholder={lang === "ar" ? "أدخل القيمة الجديدة..." : "Enter new value..."}
                            className="bg-muted/50 border-border font-mono text-sm pr-10"
                            dir="ltr"
                          />
                          <button
                            type="button"
                            onClick={() => setEnvKeyShowValue(envKeyShowValue === keyName ? null : keyName)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {envKeyShowValue === keyName ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => saveEnvKey(keyName, envKeyNewValue)}
                            size="sm"
                            disabled={!envKeyNewValue || envKeySaving === keyName}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {envKeySaving === keyName ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                            {lang === "ar" ? "حفظ بشكل دائم" : "Save permanently"}
                          </Button>
                          <Button
                            onClick={() => { setEnvKeyEditing(null); setEnvKeyNewValue("") }}
                            variant="ghost"
                            size="sm"
                          >
                            {lang === "ar" ? "إلغاء" : "Cancel"}
                          </Button>
                        </div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          {lang === "ar"
                            ? "✓ الحفظ هنا يكتب في ملف .env بشكل دائم — التغيير يتفعل مباشرة!"
                            : "✓ Saving here writes to .env permanently — activates immediately!"
                          }
                        </p>
                      </div>
                    ) : (
                      <div className="flex gap-2 pt-1">
                        <Button
                          onClick={() => { setEnvKeyEditing(keyName); setEnvKeyNewValue(""); setEnvKeyShowValue(null) }}
                          size="sm"
                          className={keyInfo.isSet
                            ? "bg-muted hover:bg-muted/80 text-foreground border border-border"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          }
                        >
                          {keyInfo.isSet
                            ? (lang === "ar" ? "تحديث" : "Update")
                            : (lang === "ar" ? "إضافة المفتاح" : "Add Key")
                          }
                        </Button>
                        {keyInfo.isSet && (
                          <Button
                            onClick={() => deleteEnvKey(keyName)}
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            {lang === "ar" ? "حذف" : "Remove"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              })()}

              {/* Payment status summary */}
              {(() => {
                const dodoApiKey = envKeys["DODO_API_KEY"]
                const dodoWebhook = envKeys["DODO_WEBHOOK_SECRET"]
                const dodoBaseUrl = envKeys["DODO_API_BASE_URL"]
                const isConfigured = dodoApiKey?.isSet && dodoBaseUrl?.isSet
                return (
                  <div className={`p-4 rounded-xl ${isConfigured ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-red-500/5 border border-red-500/20"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {isConfigured
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        : <X className="w-5 h-5 text-red-500" />
                      }
                      <span className={`text-sm font-semibold ${isConfigured ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {isConfigured
                          ? (lang === "ar" ? "بوابة الدفع مفعّلة ومشتغلة ✓" : "Payment gateway is active & working ✓")
                          : (lang === "ar" ? "بوابة الدفع غير مفعّلة — الاشتراكات لا يمكن ترقيتها ✗" : "Payment gateway not configured — subscriptions cannot be upgraded ✗")
                        }
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isConfigured
                        ? (lang === "ar"
                          ? "المشتركين يقدرون يرقّوا اشتراكاتهم ويدفعوا عبر Dodo Payments تلقائياً."
                          : "Subscribers can upgrade their plans and pay via Dodo Payments automatically.")
                        : (lang === "ar"
                          ? "أضف مفتاح Dodo API Key ورابط API Base URL أعلاه عشان تفعّل الدفع. بدونها، المشتركين لا يقدرون يدفعوا ويرقّوا."
                          : "Add Dodo API Key and API Base URL above to enable payments. Without them, subscribers cannot pay or upgrade.")
                      }
                    </p>
                  </div>
                )
              })()}
            </>
          )}
        </CardContent>
      </Card>

      {/* API Keys — Platform Owner Only */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-brand" />
            {lang === "ar" ? "مفاتيح API — صاحب المنصة فقط" : "API Keys — Platform Owner Only"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!envKeys ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Group keys by category */}
              {(["llm", "payment", "platform"] as const).map(category => {
                const categoryKeys = Object.entries(envKeys).filter(([_, info]) => info.category === category)
                if (categoryKeys.length === 0) return null

                const categoryLabel = category === "llm"
                  ? (lang === "ar" ? "🤖 مفاتيح LLM (الذكاء الاصطناعي)" : "🤖 LLM Keys (AI)")
                  : category === "payment"
                  ? (lang === "ar" ? "💳 مفاتيح الدفع" : "💳 Payment Keys")
                  : (lang === "ar" ? "🌐 مفاتيح المنصة" : "🌐 Platform Keys")

                return (
                  <div key={category} className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{categoryLabel}</p>
                    {categoryKeys.map(([keyName, keyInfo]) => (
                      <div key={keyName} className="p-3 rounded-xl bg-muted/30 border border-border space-y-2">
                        {/* Key header: name + status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full ${keyInfo.isSet ? "bg-emerald-500" : "bg-red-500"}`} />
                            <span className="text-sm font-medium text-foreground truncate">
                              {lang === "ar" ? keyInfo.labelAr : keyInfo.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {keyInfo.isSet && (
                              <Badge variant="outline" className="text-xs font-mono border-emerald-600/30 text-emerald-600 dark:text-emerald-400">
                                {keyInfo.maskedValue}
                              </Badge>
                            )}
                            {!keyInfo.isSet && (
                              <Badge variant="outline" className="text-xs border-red-600/30 text-red-600 dark:text-red-400">
                                {lang === "ar" ? "غير مضبوط" : "Not set"}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {/* Description */}
                        <p className="text-xs text-muted-foreground">
                          {lang === "ar" ? keyInfo.descriptionAr : keyInfo.description}
                        </p>
                        {/* Current masked value or edit mode */}
                        {envKeyEditing === keyName ? (
                          <div className="space-y-2 pt-1">
                            <div className="relative">
                              <Input
                                type={envKeyShowValue === keyName ? "text" : "password"}
                                value={envKeyNewValue}
                                onChange={e => setEnvKeyNewValue(e.target.value)}
                                placeholder={lang === "ar" ? "أدخل القيمة الجديدة..." : "Enter new value..."}
                                className="bg-muted/50 border-border font-mono text-sm pr-10"
                                dir="ltr"
                              />
                              <button
                                type="button"
                                onClick={() => setEnvKeyShowValue(envKeyShowValue === keyName ? null : keyName)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {envKeyShowValue === keyName ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => saveEnvKey(keyName, envKeyNewValue)}
                                size="sm"
                                disabled={!envKeyNewValue || envKeySaving === keyName}
                                className="bg-brand hover:bg-brand-dark text-brand-foreground"
                              >
                                {envKeySaving === keyName ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                                {lang === "ar" ? "حفظ بشكل دائم" : "Save permanently"}
                              </Button>
                              <Button
                                onClick={() => { setEnvKeyEditing(null); setEnvKeyNewValue("") }}
                                variant="ghost"
                                size="sm"
                              >
                                {lang === "ar" ? "إلغاء" : "Cancel"}
                              </Button>
                            </div>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                              {lang === "ar"
                                ? "✓ الحفظ هنا يكتب في ملف .env بشكل دائم — التغيير يتفعل مباشرة!"
                                : "✓ Saving here writes to .env file permanently — change activates immediately!"
                              }
                            </p>
                          </div>
                        ) : (
                          <div className="flex gap-2 pt-1">
                            <Button
                              onClick={() => { setEnvKeyEditing(keyName); setEnvKeyNewValue(""); setEnvKeyShowValue(null) }}
                              variant="outline"
                              size="sm"
                              className="border-brand/30 text-brand hover:bg-brand/10"
                            >
                              {keyInfo.isSet
                                ? (lang === "ar" ? "تحديث" : "Update")
                                : (lang === "ar" ? "إضافة" : "Add")
                              }
                            </Button>
                            {keyInfo.isSet && (
                              <Button
                                onClick={() => deleteEnvKey(keyName)}
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                {lang === "ar" ? "حذف" : "Remove"}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })}

              {/* Info banner */}
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  {lang === "ar"
                    ? "المفاتيح المحفوظة هنا تُكتب في ملف .env بشكل دائم وتتفعل فوراً — ما تحتاج إعادة تشغيل!"
                    : "Keys saved here are written to .env file permanently and activate immediately — no restart needed!"
                  }
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Database Stats */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Database className="w-4 h-4 text-brand" />
            {t("databaseStats", lang)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t("dbUsers", lang), value: settings.database?.userCount ?? 0 },
              { label: t("companiesCount", lang), value: settings.database?.companyCount ?? 0 },
              { label: t("dbConversations", lang), value: settings.database?.conversationCount ?? 0 },
              { label: t("dbMessages", lang), value: settings.database?.messageCount ?? 0 },
              { label: t("employees", lang), value: settings.database?.employeeCount ?? 0 },
              { label: t("departments", lang), value: settings.database?.departmentCount ?? 0 },
              { label: t("projects", lang), value: settings.database?.projectCount ?? 0 },
              { label: t("tokensUsed", lang), value: (settings.database?.totalTokensUsed ?? 0).toLocaleString() },
            ].map(item => (
              <div key={item.label} className="p-3 rounded-xl bg-muted/30 border border-border text-center">
                <p className="text-lg font-bold text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
          {settings.database?.totalCost && (
            <div className="mt-3 p-3 rounded-xl bg-brand/5 border border-brand/20 text-center">
              <p className="text-lg font-bold text-brand">${(settings.database.totalCost as number).toFixed(2)}</p>
              <p className="text-xs text-brand/80">{lang === "ar" ? "إجمالي التكلفة" : "Total Cost"}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Info */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Monitor className="w-4 h-4 text-brand" />
            {t("systemInfo", lang)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: t("docker", lang), value: settings.system?.isDocker ? (lang === "ar" ? "نعم ✓" : "Yes ✓") : (lang === "ar" ? "لا" : "No") },
              { label: t("nodeEnv", lang), value: settings.system?.nodeEnv || "development" },
              { label: t("uptime", lang), value: formatUptime(settings.system?.uptime ?? 0) },
              { label: t("memory", lang), value: `${settings.system?.memoryUsage ?? 0} MB` },
              { label: "Platform", value: settings.system?.platform || "linux" },
              { label: "LLM", value: settings.llm?.provider || "mock" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-xs font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Status (replaces dangerous .env display and rebuild) */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand" />
            {lang === "ar" ? "حالة الأمان" : "Security Status"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "JWT Secret", value: settings.envStatus?.JWT_SECRET_SET ? (lang === "ar" ? "مضبوط ✓" : "Set ✓") : (lang === "ar" ? "غير مضبوط ✗" : "Not set ✗"), accent: settings.envStatus?.JWT_SECRET_SET },
              { label: "LLM API Key", value: settings.envStatus?.LLM_API_KEY_SET ? (lang === "ar" ? "مضبوط ✓" : "Set ✓") : (lang === "ar" ? "غير مضبوط ✗" : "Not set ✗"), accent: settings.envStatus?.LLM_API_KEY_SET },
              { label: "Database URL", value: settings.envStatus?.DATABASE_URL_SET ? (lang === "ar" ? "مضبوط ✓" : "Set ✓") : (lang === "ar" ? "غير مضبوط ✗" : "Not set ✗"), accent: settings.envStatus?.DATABASE_URL_SET },
              { label: "LLM Provider", value: settings.envStatus?.LLM_PROVIDER_SET ? (lang === "ar" ? "مضبوط ✓" : "Set ✓") : (lang === "ar" ? "غير مضبوط ✗" : "Not set ✗"), accent: settings.envStatus?.LLM_PROVIDER_SET },
              { label: "LLM API URL", value: settings.envStatus?.LLM_API_URL_SET ? (lang === "ar" ? "مضبوط ✓" : "Set ✓") : (lang === "ar" ? "غير مضبوط ✗" : "Not set ✗"), accent: settings.envStatus?.LLM_API_URL_SET },
              { label: "LLM Model Light", value: settings.envStatus?.LLM_MODEL_LIGHT_SET ? (lang === "ar" ? "مضبوط ✓" : "Set ✓") : (lang === "ar" ? "غير مضبوط ✗" : "Not set ✗"), accent: settings.envStatus?.LLM_MODEL_LIGHT_SET },
              { label: "LLM Model Medium", value: settings.envStatus?.LLM_MODEL_MEDIUM_SET ? (lang === "ar" ? "مضبوط ✓" : "Set ✓") : (lang === "ar" ? "غير مضبوط ✗" : "Not set ✗"), accent: settings.envStatus?.LLM_MODEL_MEDIUM_SET },
              { label: "LLM Model Heavy", value: settings.envStatus?.LLM_MODEL_HEAVY_SET ? (lang === "ar" ? "مضبوط ✓" : "Set ✓") : (lang === "ar" ? "غير مضبوط ✗" : "Not set ✗"), accent: settings.envStatus?.LLM_MODEL_HEAVY_SET },
              { label: lang === "ar" ? "مفتاح Dodo API" : "Dodo API Key", value: settings.envStatus?.DODO_API_KEY_SET ? (lang === "ar" ? "مضبوط ✓" : "Set ✓") : (lang === "ar" ? "غير مضبوط ✗" : "Not set ✗"), accent: settings.envStatus?.DODO_API_KEY_SET },
              { label: lang === "ar" ? "سر Dodo Webhook" : "Dodo Webhook", value: settings.envStatus?.DODO_WEBHOOK_SECRET_SET ? (lang === "ar" ? "مضبوط ✓" : "Set ✓") : (lang === "ar" ? "اختياري" : "Optional"), accent: settings.envStatus?.DODO_WEBHOOK_SECRET_SET },
              { label: lang === "ar" ? "رابط الموقع" : "Site Base URL", value: settings.envStatus?.NEXT_PUBLIC_BASE_URL_SET ? (lang === "ar" ? "مضبوط ✓" : "Set ✓") : (lang === "ar" ? "غير مضبوط ✗" : "Not set ✗"), accent: settings.envStatus?.NEXT_PUBLIC_BASE_URL_SET },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className={`text-xs font-medium ${item.accent ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              {lang === "ar" 
                ? "مفاتيح API المحفوظة عبر سكشن 'API Keys' أعلاه تُكتب في ملف .env بشكل دائم وتتفعل فوراً. بطاقة LLM Settings القديمة تنطبق فقط على الجلسة الحالية."
                : "API Keys saved via the 'API Keys' section above are written to .env permanently and activate immediately. The legacy LLM Settings card only applies to the current session."
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
