// ============================================
// الصفحة الرئيسية — BlivoAI
// 
// التدفق الكامل:
// Landing Page → تسجيل حساب / تسجيل دخول → تسجيل شركة → Dashboard
// 
// SECURITY FIX:
// - Auth is now handled via HttpOnly cookies only
// - No JWT token stored in localStorage (was insecure)
// - Session restore uses /api/auth/me (reads HttpOnly cookie)
// - localStorage stores only non-sensitive UI state (company name, etc.)
//
// MOBILE FIX: شاشة عقدة على الموبايل — بدون مساحات زائدة
// ============================================

"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useDashboardStore } from "@/stores/dashboard-store"
import { LandingPage } from "@/components/landing/landing-page"
import { SignUpPage } from "@/components/auth/sign-up-page"
import { LoginPage } from "@/components/auth/login-page"
import { Sidebar } from "@/components/dashboard/sidebar"
import { MainContent } from "@/components/dashboard/main-content"
import { SetupWizard } from "@/components/dashboard/setup-wizard"
import { CreateEmployeeDialog } from "@/components/employees/create-employee-dialog"
import { EmployeeSetupDialog } from "@/components/employees/employee-setup-dialog"
import { ThemeToggle } from "@/components/theme-toggle"
import type { ICompany, IEmployee, IDepartment, IProject, Tone, Dialect, DashboardTab } from "@/types"
import { t } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n-config"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Menu, LogOut, LayoutDashboard, Users, MessagesSquare, Mic, Settings } from "lucide-react"
import { UpgradeDialog } from "@/components/upgrade-dialog"
import type { SubscriptionPlan } from "@/types"
import Link from "next/link"

// --- مراحل التطبيق ---
type AppPhase = 
  | "landing"
  | "signup"
  | "login"
  | "company-setup"
  | "dashboard"

// SECURITY: No `token` field — auth is via HttpOnly cookie only
interface AppState {
  phase: AppPhase
  userId: string | null
  userName: string | null
  userRole: string | null // OWNER | ADMIN | VIEWER
  company: ICompany | null
  employees: IEmployee[]
  departments: IDepartment[]
  projects: IProject[]
  pendingDecisions: number
}

export default function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: langStr } = use(params)
  const lang = langStr as Locale
  
  const { activeTab, setActiveTab, setSelectedEmployee, setSelectedDepartment, setSelectedProject, setSelectedEmployeeDetail } = useDashboardStore()
  const router = useRouter()
  
  // --- تبديل اللغة بدون إعادة تحميل الصفحة ---
  const handleLanguageChange = () => {
    const newLang = lang === "ar" ? "en" : "ar"
    // استبدال الرابط بدون فقدان حالة الصفحة
    router.replace(`/${newLang}`, { scroll: false })
  }
  
  const [appState, setAppState] = useState<AppState>({
    phase: "landing",
    userId: null,
    userName: null,
    userRole: null,
    company: null,
    employees: [],
    departments: [],
    projects: [],
    pendingDecisions: 0,
  })

  // Only OWNER can pay/upgrade subscription
  const isOwner = appState.userRole === "OWNER"

  const [showCreateEmployee, setShowCreateEmployee] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [upgradeCurrentPlan, setUpgradeCurrentPlan] = useState<SubscriptionPlan>("FREE_TRIAL")
  const [showCreateDepartment, setShowCreateDepartment] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)
  const [setupEmployee, setSetupEmployee] = useState<{
    employee: IEmployee
    questions: string[]
    suggestedCapabilities: string[]
  } | null>(null)

  // --- SECURITY: Restore session via /api/auth/me (HttpOnly cookie) ---
  // No localStorage token — the JWT is read from the HttpOnly cookie server-side
  useEffect(() => {
    async function restoreSession() {
      try {
        const res = await fetch("/api/auth/me")
        if (res.ok) {
          const data = await res.json()
          if (data.authenticated && data.user && data.company) {
            setAppState({
              phase: "dashboard",
              userId: data.user.id,
              userName: data.user.name,
              userRole: data.user.role,
              company: data.company,
              employees: data.employees || [],
              departments: data.departments || [],
              projects: [],
              pendingDecisions: 0,
            })
          } else if (data.authenticated && data.user && !data.company) {
            // User exists but no company — go to company setup
            setAppState({
              phase: "company-setup",
              userId: data.user.id,
              userName: data.user.name,
              userRole: data.user.role,
              company: null,
              employees: [],
              departments: [],
              projects: [],
              pendingDecisions: 0,
            })
          }
          // If not authenticated, stay on landing page
        }
      } catch {
        // Network error — stay on landing page
      }
    }
    restoreSession()
  }, [])

  // --- حفظ الجلسة (localStorage stores only non-sensitive UI data, NOT the token) ---
  const saveSession = (state: AppState) => {
    if (state.userId && state.company) {
      localStorage.setItem("blivoai_session", JSON.stringify({
        userId: state.userId,
        userName: state.userName,
        userRole: state.userRole,
        company: state.company,
        employees: state.employees,
        departments: state.departments,
        projects: state.projects,
        // SECURITY: No token stored here — HttpOnly cookie handles auth
      }))
    }
  }

  // --- تسجيل الخروج ---
  const handleLogout = async () => {
    // Clear the HttpOnly cookie via server
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // Ignore — cookie will be cleared client-side anyway
    }
    // Clear localStorage UI cache
    localStorage.removeItem("blivoai_session")
    setAppState({
      phase: "landing",
      userId: null,
      userName: null,
      userRole: null,
      company: null,
      employees: [],
      departments: [],
      projects: [],
      pendingDecisions: 0,
    })
  }

  // ============================================
  // المرحلة 1: Landing → SignUp/Login
  // ============================================
  const handleGetStarted = () => {
    setAppState(prev => ({ ...prev, phase: "signup" }))
  }

  // ============================================
  // المرحلة 2a: SignUp → Company Setup
  // ============================================
  const handleSignUp = async (data: { name: string; email: string; password: string }) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        const result = await res.json()
        setAppState(prev => ({
          ...prev,
          phase: "company-setup",
          userId: result.user.id,
          userName: data.name,
          userRole: result.user.role || "OWNER",
        }))
        toast.success(t("toast.signupSuccess", lang).replace("{name}", data.name))
      } else {
        toast.error(t("toast.signupFailed", lang))
      }
    } catch {
      toast.error(t("toast.connectionError", lang))
    }
  }

  // ============================================
  // المرحلة 2b: Login → Dashboard
  // ============================================
  const handleLogin = async (data: { email: string; password: string }) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        const result = await res.json()
        const newState: AppState = {
          phase: "dashboard",
          userId: result.user.id,
          userName: result.user.name,
          userRole: result.user.role,
          company: result.company || null,
          employees: result.employees || [],
          departments: result.departments || [],
          projects: [],
          pendingDecisions: 0,
        }
        setAppState(newState)

        // لو ما عنده شركة → يروح لإنشاء شركة
        if (!result.company) {
          newState.phase = "company-setup"
          setAppState(newState)
          toast.info(t("toast.companySetupHint", lang))
        } else {
          saveSession(newState)
          toast.success(t("toast.loginSuccess", lang).replace("{name}", result.user.name))
        }
      } else {
        toast.error(t("toast.loginFailed", lang))
      }
    } catch {
      toast.error(t("toast.connectionError", lang))
    }
  }

  // ============================================
  // المرحلة 3: Company Setup → Dashboard
  // ============================================
  const handleCreateCompany = async (data: {
    name: string
    description: string
    industry: string
    dialect: Dialect
    tone: Tone
  }) => {
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          ownerId: appState.userId,
          dialect: lang, // language from URL
        }),
      })

      if (res.ok) {
        const result = await res.json()
        const newState: AppState = {
          ...appState,
          phase: "dashboard",
          company: result.company,
        }
        setAppState(newState)
        saveSession(newState)
        toast.success(t("toast.companyCreated", lang).replace("{name}", data.name))
      } else {
        toast.error(t("toast.companyCreatedFailed", lang))
      }
    } catch {
      toast.error(t("toast.connectionError", lang))
    }
  }

  // ============================================
  // إنشاء موظف
  // ============================================
  const handleCreateEmployee = async (name: string, role: string, roleDescription?: string, departmentId?: string, specialization?: string) => {
    if (!appState.company) return

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          role,
          roleDescription,
          companyId: appState.company.id,
          departmentId,
          specialization,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setAppState(prev => ({
          ...prev,
          employees: [data.employee, ...prev.employees],
        }))
        setSetupEmployee({
          employee: data.employee,
          questions: data.setupQuestions,
          suggestedCapabilities: data.suggestedCapabilities || [],
        })
        toast.success(t("toast.employeeCreated", lang).replace("{name}", name).replace("{role}", specialization || role))
        setShowCreateEmployee(false)
      } else {
        const data = await res.json()
        // Check if employee limit reached — show upgrade dialog
        if (res.status === 403 && data.code === "EMPLOYEE_LIMIT_REACHED") {
          setUpgradeCurrentPlan(data.currentPlan || appState.company?.subscription || "FREE_TRIAL")
          setShowUpgradeDialog(true)
          setShowCreateEmployee(false)
        } else {
          toast.error(t("toast.employeeCreatedFailed", lang))
        }
      }
    } catch {
      toast.error(t("toast.connectionError", lang))
    }
  }

  // Handle upgrade success
  const handleUpgradeSuccess = (newPlan: SubscriptionPlan) => {
    setAppState(prev => ({
      ...prev,
      company: prev.company ? { ...prev.company, subscription: newPlan } : null,
    }))
  }

  // ============================================
  // إعداد موظف
  // ============================================
  const handleSetupEmployee = async (
    employeeId: string,
    answers: Record<string, string>,
    approvalMode: string,
    acceptedCapabilities?: string[],
  ) => {
    try {
      const res = await fetch("/api/employees/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, answers, approvalMode, acceptedCapabilities }),
      })

      if (res.ok) {
        setAppState(prev => ({
          ...prev,
          employees: prev.employees.map(emp =>
            emp.id === employeeId
              ? { ...emp, status: "ACTIVE" as const, approvalMode: approvalMode as IEmployee["approvalMode"] }
              : emp
          ),
        }))
        setSetupEmployee(null)
        toast.success(t("toast.employeeSetupSuccess", lang))
      } else {
        toast.error(t("toast.employeeSetupFailed", lang))
      }
    } catch {
      toast.error(t("toast.connectionError", lang))
    }
  }

  // ============================================
  // إنشاء قسم
  // ============================================
  const handleCreateDepartment = async (data: { name: string; description?: string; color?: string }) => {
    if (!appState.company) return

    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, companyId: appState.company.id }),
      })

      if (res.ok) {
        const result = await res.json()
        setAppState(prev => ({
          ...prev,
          departments: [...prev.departments, result.department],
        }))
        setShowCreateDepartment(false)
        toast.success(t("toast.departmentCreated", lang).replace("{name}", data.name))
      } else {
        toast.error(t("toast.departmentCreatedFailed", lang))
      }
    } catch {
      toast.error(t("toast.connectionError", lang))
    }
  }

  // ============================================
  // إنشاء مشروع
  // ============================================
  const handleCreateProject = async (data: { name: string; description?: string; departmentId?: string }) => {
    if (!appState.company) return

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, companyId: appState.company.id }),
      })

      if (res.ok) {
        const result = await res.json()
        setAppState(prev => ({
          ...prev,
          projects: [result.project, ...prev.projects],
        }))
        setShowCreateProject(false)
        toast.success(t("toast.projectCreated", lang).replace("{name}", data.name))
      } else {
        toast.error(t("toast.projectCreatedFailed", lang))
      }
    } catch {
      toast.error(t("toast.connectionError", lang))
    }
  }

  const handleDeleteDepartment = async (departmentId: string) => {
    try {
      const res = await fetch(`/api/departments/${departmentId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setAppState(prev => ({
          ...prev,
          departments: prev.departments.filter(d => d.id !== departmentId),
          employees: prev.employees.map(emp =>
            emp.departmentId === departmentId ? { ...emp, departmentId: undefined } : emp
          ),
        }))
        toast.success(t("toast.departmentDeleted", lang))
      } else {
        toast.error(t("toast.departmentDeleteFailed", lang))
      }
    } catch {
      toast.error(t("toast.connectionError", lang))
    }
  }

  // ============================================
  // تحديث قسم الموظف
  // ============================================
  const handleUpdateEmployeeDepartment = async (employeeId: string, departmentId: string | null) => {
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId }),
      })

      if (res.ok) {
        setAppState(prev => ({
          ...prev,
          employees: prev.employees.map(emp =>
            emp.id === employeeId ? { ...emp, departmentId: departmentId || undefined } : emp
          ),
        }))
        toast.success(t("toast.employeeMoved", lang))
      } else {
        toast.error(t("toast.employeeMoveFailed", lang))
      }
    } catch {
      toast.error(t("toast.connectionError", lang))
    }
  }

  // ============================================
  // الرد على طلب موظف
  // ============================================
  const handleRespondToRequest = async (requestId: string, approved: boolean, response?: string) => {
    try {
      const res = await fetch(`/api/employee-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: approved ? "APPROVED" : "REJECTED",
          response,
          respondedBy: appState.userId,
        }),
      })

      if (res.ok) {
        toast.success(approved ? t("toast.requestResponded", lang) : t("toast.requestRejected", lang))
      }
    } catch {
      toast.error(t("toast.requestRespondFailed", lang))
    }
  }

  // ============================================
  // محادثة مع موظف
  // ============================================
  const handleChatWithEmployee = (employeeId: string) => {
    setSelectedEmployee(employeeId)
    setActiveTab("chat" as DashboardTab)
  }

  // ============================================
  // عرض تفاصيل الموظف
  // ============================================
  const handleEmployeeDetail = (employeeId: string) => {
    setSelectedEmployeeDetail(employeeId)
    setActiveTab("employee-detail" as DashboardTab)
  }

  // ============================================
  // العرض حسب المرحلة
  // ============================================

  // المرحلة 1: Landing Page
  if (appState.phase === "landing") {
    return (
      <LandingPage 
        onGetStarted={handleGetStarted} 
        onLogin={() => setAppState(prev => ({ ...prev, phase: "login" }))}
      />
    )
  }

  // المرحلة 2a: تسجيل حساب
  if (appState.phase === "signup") {
    return (
      <SignUpPage
        onSignUp={handleSignUp}
        onBack={() => setAppState(prev => ({ ...prev, phase: "landing" }))}
        onGoToLogin={() => setAppState(prev => ({ ...prev, phase: "login" }))}
      />
    )
  }

  // المرحلة 2b: تسجيل دخول
  if (appState.phase === "login") {
    return (
      <LoginPage
        onLogin={handleLogin}
        onBack={() => setAppState(prev => ({ ...prev, phase: "landing" }))}
        onGoToSignUp={() => setAppState(prev => ({ ...prev, phase: "signup" }))}
      />
    )
  }

  // المرحلة 3: تسجيل شركة
  if (appState.phase === "company-setup") {
    return (
      <SetupWizard
        onSubmit={handleCreateCompany}
        onBack={() => setAppState(prev => ({ ...prev, phase: "login" }))}
      />
    )
  }

  // المرحلة 4: Dashboard
  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground flex flex-row" dir="ltr">
      <Sidebar
        company={appState.company}
        employees={appState.employees}
        departments={appState.departments}
        projects={appState.projects}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab as DashboardTab)
          setSelectedEmployee(null)
        }}
        onEmployeeSelect={(id) => {
          setSelectedEmployee(id)
          setActiveTab("chat" as DashboardTab)
        }}
        onEmployeeDetail={(id) => {
          setSelectedEmployeeDetail(id)
          setActiveTab("employee-detail" as DashboardTab)
        }}
        onDepartmentSelect={(id) => {
          setSelectedDepartment(id)
          setActiveTab("department-chat" as DashboardTab)
        }}
        onProjectSelect={(id) => {
          setSelectedProject(id)
          setActiveTab("projects" as DashboardTab)
        }}
        onCreateEmployee={() => setShowCreateEmployee(true)}
        onCreateDepartment={() => setShowCreateDepartment(true)}
        onCreateProject={() => setShowCreateProject(true)}
        mobileOpen={sidebarMobileOpen}
        onMobileOpenChange={setSidebarMobileOpen}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
        {/* شريط علوي — desktop فقط */}
        <div className="hidden md:flex h-12 bg-card/80 border-b border-border items-center justify-between px-3 sm:px-4 backdrop-blur-sm">
          {/* Left: company info */}
          <div className="flex items-center gap-2 min-w-0">
            <img src="/api/branding/logo.png" alt="BlivoAI Logo" className="w-7 h-7 rounded-md hidden sm:block" />
            <span className="text-muted-foreground text-sm truncate">
              {appState.company?.name}
            </span>
            {appState.company && (
              <span className="text-muted-foreground/60 text-xs hidden sm:inline">
                ({appState.employees.filter(e => e.status === "ACTIVE").length} {t("sidebar.activeEmployees", lang)})
              </span>
            )}
          </div>
          {/* Quick-nav icons — desktop only */}
          <div className="flex items-center gap-1">
            {([
              { id: "overview", Icon: LayoutDashboard, label: t("sidebar.overview", lang) },
              { id: "employees", Icon: Users, label: t("sidebar.employees", lang) },
              { id: "department-chat", Icon: MessagesSquare, label: t("sidebar.departmentChat", lang) },
              { id: "talk", Icon: Mic, label: t("sidebar.talk", lang) },
              { id: "settings", Icon: Settings, label: t("sidebar.settings", lang) },
            ] as { id: DashboardTab; Icon: React.ComponentType<{ className?: string }>; label: string }[]).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id)
                  setSelectedEmployee(null)
                }}
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                  activeTab === item.id
                    ? "bg-emerald-100/50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                title={item.label}
                aria-label={item.label}
              >
                <item.Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          {/* Right: theme + lang + logout */}
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-muted-foreground text-xs hidden sm:inline">{appState.userName}</span>
            <ThemeToggle />
            <button
              onClick={handleLanguageChange}
              className="text-muted-foreground hover:text-foreground text-xs px-1.5 py-1 rounded-lg hover:bg-muted transition-all min-h-[44px] min-w-[44px] flex items-center justify-center font-medium"
            >
              {lang === "ar" ? "EN" : "ع"}
            </button>
            <Button
              variant="outline" 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs min-h-[44px] flex items-center gap-1 px-2 border-border"
              aria-label={t("sidebar.logout", lang)}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t("sidebar.logout", lang)}</span>
            </Button>
          </div>
        </div>

        {/* شريط عائم — mobile فقط: همبرغر + لوغو + ثيم + لغة + خروج */}
        <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-2 py-1.5 bg-card/95 border-b border-border backdrop-blur-sm">
          {/* يسار: همبرغر + لوغو + اسم الشركة */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSidebarMobileOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-muted transition-colors"
              aria-label="Open sidebar menu"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <img src="/api/branding/logo.png" alt="BlivoAI Logo" className="w-6 h-6 rounded-md" />
            <span className="text-foreground text-sm font-medium truncate max-w-[100px]">
              {appState.company?.name}
            </span>
          </div>
          {/* يمين: ثيم + لغة + خروج */}
          <div className="flex items-center gap-0.5">
            <ThemeToggle />
            <button
              onClick={handleLanguageChange}
              className="text-muted-foreground hover:text-foreground text-xs px-1.5 py-1 rounded-lg hover:bg-muted transition-all min-h-[36px] min-w-[36px] flex items-center justify-center font-medium"
            >
              {lang === "ar" ? "EN" : "ع"}
            </button>
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive text-xs px-1.5 py-1 rounded-lg hover:bg-destructive/10 transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label={t("sidebar.logout", lang)}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <MainContent
          company={appState.company}
          employees={appState.employees}
          departments={appState.departments}
          projects={appState.projects}
          userId={appState.userId || ""}
          userName={appState.userName || t("chat.manager", lang)}
          isOwner={isOwner}
          onReviewDecision={async (decisionId, approved, note) => {
            try {
              const res = await fetch(`/api/decisions/${decisionId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  approved,
                  reviewNote: note,
                  reviewerId: appState.userId,
                }),
              })
              if (res.ok) {
                toast.success(approved ? t("toast.decisionApproved", lang) : t("toast.decisionRejected", lang))
              }
            } catch {
              toast.error(t("toast.decisionReviewFailed", lang))
            }
          }}
          onRespondToRequest={handleRespondToRequest}
          onCreateDepartment={handleCreateDepartment}
          onCreateProject={handleCreateProject}
          onUpdateEmployeeDepartment={handleUpdateEmployeeDepartment}
          onDeleteDepartment={handleDeleteDepartment}
          onChatWithEmployee={handleChatWithEmployee}
          onDeleteEmployee={(employeeId) => {
            // API call already done by EmployeesPanel — just remove from local state
            setAppState(prev => ({
              ...prev,
              employees: prev.employees.filter(e => e.id !== employeeId),
            }))
          }}
          onReplaceEmployee={(employeeId) => {
            // Navigate to employees tab — user can delete old one then create new
            setActiveTab("employees" as DashboardTab)
          }}
        />
      </div>



      <CreateEmployeeDialog
        open={showCreateEmployee}
        onOpenChange={setShowCreateEmployee}
        onSubmit={handleCreateEmployee}
        departments={appState.departments}
        employees={appState.employees}
      />

      <EmployeeSetupDialog
        open={!!setupEmployee}
        onOpenChange={(open) => { if (!open) setSetupEmployee(null) }}
        employee={setupEmployee?.employee ?? null}
        questions={setupEmployee?.questions ?? []}
        suggestedCapabilities={setupEmployee?.suggestedCapabilities || []}
        onSubmit={handleSetupEmployee}
      />

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        currentPlan={upgradeCurrentPlan}
        companyId={appState.company?.id || ""}
        isOwner={isOwner}
        onUpgradeSuccess={handleUpgradeSuccess}
      />
    </div>
  )
}