// ============================================
// Sidebar — BlivoAI
// Two-section layout: Chat + Business
// Theme-aware: supports Light + Dark mode
// Mobile: hidden by default, shown as Sheet/drawer
// Desktop: always visible, fixed w-72
// ============================================

"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { ICompany, IEmployee, IDepartment, IProject, DashboardTab } from "@/types"
import { getEmployeeStatusColor, getEmployeeStatusDisplay } from "@/lib/employee-generator"
import { t } from "@/lib/i18n"
import { useLocale } from "@/hooks/use-locale"
import { ThemeToggle } from "@/components/theme-toggle"

import {
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
  CreditCard,
  Settings,
  Plus,
  Sparkles,
  Key,
} from "lucide-react"

interface SidebarProps {
  company: ICompany | null
  employees: IEmployee[]
  departments: IDepartment[]
  projects: IProject[]
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  onEmployeeSelect: (id: string) => void
  onDepartmentSelect: (id: string) => void
  onProjectSelect: (id: string) => void
  onCreateEmployee: () => void
  onCreateDepartment: () => void
  onCreateProject: () => void
  /** Mobile only: controls Sheet open state */
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}

const CHAT_TABS: { id: DashboardTab; labelKey: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "chatbot", labelKey: "sidebar.chatbot", Icon: MessageSquare },
]

const BUSINESS_TABS: { id: DashboardTab; labelKey: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", labelKey: "sidebar.overview", Icon: LayoutDashboard },
  { id: "departments", labelKey: "sidebar.departments", Icon: Building2 },
  { id: "employees", labelKey: "sidebar.employees", Icon: Users },
  { id: "talk", labelKey: "sidebar.talk", Icon: Mic },
  { id: "department-chat", labelKey: "sidebar.departmentChat", Icon: MessagesSquare },
  { id: "meetings", labelKey: "sidebar.meetings", Icon: CalendarDays },
  { id: "hr", labelKey: "sidebar.hr", Icon: FileText },
  { id: "work-orders", labelKey: "sidebar.workOrders", Icon: ClipboardList },
  { id: "monitor", labelKey: "sidebar.monitor", Icon: Activity },
  { id: "projects", labelKey: "sidebar.projects", Icon: FolderKanban },
  { id: "decisions", labelKey: "sidebar.decisions", Icon: Scale },
  { id: "requests", labelKey: "sidebar.requests", Icon: Inbox },
  { id: "token-budget", labelKey: "sidebar.tokenBudget", Icon: Wallet },
  { id: "billing", labelKey: "sidebar.billing", Icon: CreditCard },
  { id: "invoices", labelKey: "sidebar.invoices", Icon: FileText },
  { id: "api-keys", labelKey: "sidebar.apiKeys", Icon: Key },
  { id: "settings", labelKey: "sidebar.settings", Icon: Settings },
]

function SidebarContent({
  company,
  employees,
  departments,
  projects,
  activeTab,
  onTabChange,
  onEmployeeSelect,
  onDepartmentSelect,
  onProjectSelect,
  onCreateEmployee,
  onCreateDepartment,
  onCreateProject,
  onMobileClose,
}: SidebarProps & { onMobileClose?: () => void }) {
  const language = useLocale()
  const activeEmployees = employees.filter(e => e.status === "ACTIVE")

  // Helper: call onTabChange and also close mobile Sheet if applicable
  const handleTabChange = (tab: DashboardTab) => {
    onTabChange(tab)
    onMobileClose?.()
  }
  const handleEmployeeSelect = (id: string) => {
    onEmployeeSelect(id)
    onMobileClose?.()
  }
  const handleDepartmentSelect = (id: string) => {
    onDepartmentSelect(id)
    onMobileClose?.()
  }
  const handleProjectSelect = (id: string) => {
    onProjectSelect(id)
    onMobileClose?.()
  }

  // Token budget status
  const tokenBudgetMonthly = company?.tokenBudgetMonthly ?? 0
  const tokenUsedMonthly = company?.tokenUsedMonthly ?? 0
  const tokenPercent = tokenBudgetMonthly > 0
    ? (tokenUsedMonthly / tokenBudgetMonthly) * 100
    : 0
  const tokenAlertColor = tokenPercent >= 100 ? "text-red-500" : tokenPercent >= 80 ? "text-yellow-500" : "text-emerald-500"

  return (
    <>
      {/* === Header === */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3F4A69] to-emerald-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-foreground font-semibold text-sm truncate">
              {company?.name ?? t("app.title", language)}
            </h2>
            <p className="text-muted-foreground text-xs">
              {activeEmployees.length} {t("sidebar.activeEmployees", language)}
              {departments.length > 0 && ` • ${departments.length} ${t("sidebar.departments", language)}`}
            </p>
          </div>
        </div>
      </div>

      {/* === Language Toggle === */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => {
              onMobileClose?.()
              // الحفاظ على hash عند تبديل اللغة
              const currentHash = window.location.hash || ""
              window.history.replaceState(null, "", `/ar${currentHash}`)
              window.dispatchEvent(new PopStateEvent("popstate"))
            }}
            className={`flex-1 text-xs py-2 rounded-md transition-all text-center min-h-[44px] flex items-center justify-center ${
              language === "ar"
                ? "bg-gradient-to-r from-[#3F4A69] to-emerald-500 text-white font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            عربي
          </button>
          <button
            onClick={() => {
              onMobileClose?.()
              // الحفاظ على hash عند تبديل اللغة
              const currentHash = window.location.hash || ""
              window.history.replaceState(null, "", `/en${currentHash}`)
              window.dispatchEvent(new PopStateEvent("popstate"))
            }}
            className={`flex-1 text-xs py-2 rounded-md transition-all text-center min-h-[44px] flex items-center justify-center ${
              language === "en"
                ? "bg-gradient-to-r from-[#3F4A69] to-emerald-500 text-white font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* === Tabs === */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 scrollbar-custom">
        {/* Chat Section */}
        <div className="mb-2">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              {t("sidebar.section.chat", language)}
            </span>
          </div>
          {CHAT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all min-h-[44px] ${
                activeTab === tab.id
                  ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <tab.Icon className="w-4 h-4" />
              <span className="flex-1 text-right">{t(tab.labelKey, language)}</span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-border my-2" />

        {/* Business Section */}
        <div>
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <Building2 className="w-3.5 h-3.5 text-[#5C6A8A]" />
            <span className="text-xs font-medium text-[#5C6A8A] uppercase tracking-wider">
              {t("sidebar.section.business", language)}
            </span>
          </div>
          {BUSINESS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all min-h-[44px] ${
                activeTab === tab.id
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <tab.Icon className="w-4 h-4" />
              <span className="flex-1 text-right">{t(tab.labelKey, language)}</span>
              {/* Token status indicator */}
              {tab.id === "token-budget" && company && (
                <span className={`text-xs ${tokenAlertColor}`}>●</span>
              )}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-border my-2" />

        {/* === Departments === */}
        {departments.length > 0 && (
          <div className="pb-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {t("sidebar.departmentsLabel", language)}
              </span>
              <Button
                size="sm"
                onClick={onCreateDepartment}
                className="min-h-[44px] min-w-[44px] text-xs bg-muted hover:bg-muted/80 text-muted-foreground px-3 border border-border"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="space-y-1">
              {departments.map((dept) => {
                const deptEmployees = employees.filter(e => e.departmentId === dept.id && e.status !== "DELETED")
                return (
                  <button
                    key={dept.id}
                    onClick={() => handleDepartmentSelect(dept.id)}
                    className="w-full text-right p-2.5 rounded-lg bg-muted/30 hover:bg-muted/60 transition-all group min-h-[44px]"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: dept.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-xs font-medium truncate">{dept.name}</p>
                        <p className="text-muted-foreground text-[10px]">{deptEmployees.length} {t("sidebar.employee", language)}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* === Active Projects === */}
        {projects.filter(p => p.status === "IN_PROGRESS" || p.status === "PLANNING").length > 0 && (
          <div className="pb-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {t("sidebar.projectsLabel", language)}
              </span>
              <Button
                size="sm"
                onClick={onCreateProject}
                className="min-h-[44px] min-w-[44px] text-xs bg-muted hover:bg-muted/80 text-muted-foreground px-3 border border-border"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="space-y-1">
              {projects
                .filter(p => p.status === "IN_PROGRESS" || p.status === "PLANNING")
                .slice(0, 5)
                .map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectSelect(project.id)}
                    className="w-full text-right p-2.5 rounded-lg bg-muted/30 hover:bg-muted/60 transition-all min-h-[44px]"
                  >
                    <p className="text-foreground text-xs font-medium truncate">{project.name}</p>
                    <p className="text-muted-foreground text-[10px]">
                      {project.status === "IN_PROGRESS" ? t("sidebar.inProgress", language) : t("sidebar.planning", language)}
                    </p>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* === Employees === */}
        <div className="pb-2">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {t("sidebar.employeesLabel", language)}
            </span>
            <Button
              size="sm"
              onClick={onCreateEmployee}
              className="min-h-[44px] text-xs bg-gradient-to-r from-[#3F4A69] to-emerald-600 hover:from-[#3F4A69] hover:to-emerald-500 text-white px-3"
            >
              {t("sidebar.newEmployee", language)}
            </Button>
          </div>

          {employees.length === 0 ? (
            <div className="text-center py-6 px-4">
              <p className="text-muted-foreground text-sm">{t("sidebar.noEmployees", language)}</p>
              <p className="text-muted-foreground/60 text-xs mt-1">{t("sidebar.addFirst", language)}</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-custom">
              {employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => handleEmployeeSelect(emp.id)}
                  className="w-full text-right p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-all group min-h-[44px]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: emp.avatarColor || "#10b981" }}
                    >
                      {emp.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-medium truncate">{emp.name}</p>
                      <p className="text-muted-foreground text-xs truncate">{emp.role}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0.5 ${getEmployeeStatusColor(emp.status)}`}
                    >
                      {getEmployeeStatusDisplay(emp.status)}
                    </Badge>
                  </div>
                  {emp.departmentId && departments.find(d => d.id === emp.departmentId) && (
                    <div className="flex items-center gap-1 mt-1.5 mr-11">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: departments.find(d => d.id === emp.departmentId)?.color }}
                      />
                      <span className="text-muted-foreground text-[10px]">
                        {departments.find(d => d.id === emp.departmentId)?.name}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* === Footer === */}
      <div className="p-3 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => {
              onMobileClose?.()
              // تبديل اللغة بدون إعادة تحميل — مع الحفاظ على hash
              const newLang = language === "ar" ? "en" : "ar"
              const currentHash = window.location.hash || ""
              window.history.replaceState(null, "", `/${newLang}${currentHash}`)
              window.dispatchEvent(new PopStateEvent("popstate"))
            }}
            className="text-muted-foreground hover:text-foreground text-xs transition-colors min-h-[44px] flex items-center px-2"
          >
            {language === "ar" ? "EN" : "ع"}
          </button>
        </div>
        <p className="text-muted-foreground text-[10px]">
          BlivoAI v1.0
        </p>
      </div>
    </>
  )
}

export function Sidebar({
  company,
  employees,
  departments,
  projects,
  activeTab,
  onTabChange,
  onEmployeeSelect,
  onDepartmentSelect,
  onProjectSelect,
  onCreateEmployee,
  onCreateDepartment,
  onCreateProject,
  mobileOpen,
  onMobileOpenChange,
}: SidebarProps) {
  const language = useLocale()
  const isRTL = language === "ar"

  // Mobile close handler
  const handleMobileClose = () => {
    onMobileOpenChange?.(false)
  }

  return (
    <>
      {/* === Desktop sidebar — always visible on md+ only === */}
      <aside className="hidden md:flex w-72 bg-card border-r border-border flex-col h-screen overflow-hidden">
        <SidebarContent
          company={company}
          employees={employees}
          departments={departments}
          projects={projects}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onEmployeeSelect={onEmployeeSelect}
          onDepartmentSelect={onDepartmentSelect}
          onProjectSelect={onProjectSelect}
          onCreateEmployee={onCreateEmployee}
          onCreateDepartment={onCreateDepartment}
          onCreateProject={onCreateProject}
        />
      </aside>

      {/* === Mobile sidebar — Sheet drawer === */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side={isRTL ? "right" : "left"}
          className="w-[280px] sm:w-[320px] bg-card p-0 border-border overflow-hidden"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-full">
            <SidebarContent
              company={company}
              employees={employees}
              departments={departments}
              projects={projects}
              activeTab={activeTab}
              onTabChange={onTabChange}
              onEmployeeSelect={onEmployeeSelect}
              onDepartmentSelect={onDepartmentSelect}
              onProjectSelect={onProjectSelect}
              onCreateEmployee={onCreateEmployee}
              onCreateDepartment={onCreateDepartment}
              onCreateProject={onCreateProject}
              onMobileClose={handleMobileClose}
              mobileOpen={mobileOpen}
              onMobileOpenChange={onMobileOpenChange}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
